const test = require('node:test');
const assert = require('node:assert/strict');
const { createShoppingState, product, deferred, flush } = require('./shopping-fixture.cjs');
const item = (quantity = 1) => ({ product: product('A'), quantity, price: 10 });

test('the backend null cart is a valid empty cart and permits the first saved add', async () => {
  let server = null, writes = 0;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method, body) => {
    if (url === '/favorites') return { favorites: [] };
    if (method) { writes++; server = { items: [item(body.quantity)] }; }
    return { cart: server, minimumOrderValue: 50 };
  } });
  await state.refresh();
  assert.equal(state.getSnapshot().ready, true);
  assert.equal(state.getSnapshot().cartCount, 0);
  await state.adjust(product('A'), 1);
  assert.equal(writes, 1);
  assert.equal(state.getSnapshot().cartCount, 1);
  await state.synchronizeCart();
});

test('favorites writes do not depend on a failed Cart request', async () => {
  let saved = false;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method) => {
    if (url === '/cart') throw Error('Cart offline');
    if (method) { saved = true; return {}; }
    return { favorites: [] };
  } });
  await assert.rejects(state.refresh(), /Cart offline/);
  await state.favorite(product('A'), true);
  assert.equal(saved, true);
  assert.equal(state.getSnapshot().favorites.length, 1);
});

test('a delayed initial Favorites read cannot erase a newly saved favorite', async () => {
  const read = deferred(); let writes = 0;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method) => {
    if (url === '/cart') return { cart: { items: [] } };
    if (method) { writes++; return {}; }
    return read.promise;
  } });
  const refresh = state.refresh(); await flush();
  const save = state.favorite(product('A'), true); await flush();
  read.resolve({ favorites: [{ product: product('B') }] });
  await Promise.all([save, refresh]);
  assert.deepEqual(Array.from(state.getSnapshot().favorites, p => p._id).sort(), ['A', 'B']);
  assert.equal(writes, 1);
});

test('a failed initial Favorites load retries without reloading an already loaded Cart', async () => {
  let cartReads = 0, favoriteReads = 0;
  const state = createShoppingState({ authenticated: () => true, send: async url => {
    if (url === '/cart') { cartReads++; return { cart: { items: [] } }; }
    if (++favoriteReads === 1) throw Error('Favorites offline');
    return { favorites: [{ product: product('A') }] };
  } });
  await assert.rejects(state.refresh(), /Favorites offline/);
  await state.refresh();
  assert.equal(state.getSnapshot().favoritesReady, true);
  assert.equal(state.getSnapshot().favorites.length, 1);
  assert.equal(cartReads, 1);
  assert.equal(favoriteReads, 2);
});

test('an add before initial Cart hydration increments the saved quantity instead of replacing it', async () => {
  const read = deferred(); let server = 3;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method, body) => {
    if (url === '/favorites') return { favorites: [] };
    if (!method) return read.promise;
    server = url.endsWith('/add') ? server + body.quantity : body.quantity;
    return { cart: { items: [item(server)] } };
  } });
  const refresh = state.refresh(), save = state.adjust(product('A'), 1);
  read.resolve({ cart: { items: [item(3)] } });
  await Promise.all([refresh, save]);
  assert.equal(server, 4);
  assert.equal(state.getSnapshot().cartCount, 4);
});

test('Cart mutations cannot invalidate a Favorites refresh for a different resource', async () => {
  const read = deferred(); let favoriteReads = 0;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method) => {
    if (url === '/favorites') return ++favoriteReads === 1 ? { favorites: [] } : read.promise;
    return { cart: { items: method ? [item()] : [] } };
  } });
  await state.refresh();
  const refresh = state.refresh(true), save = state.adjust(product('A'), 1);
  await save;
  read.resolve({ favorites: [{ product: product('B') }] }); await refresh;
  assert.deepEqual(Array.from(state.getSnapshot().favorites, p => p._id), ['B']);
});

test('Favorites saves proceed while an unrelated Cart read is still pending', async () => {
  const cart = deferred();
  const state = createShoppingState({ authenticated: () => true, send: async url =>
    url === '/cart' ? cart.promise : { favorites: [] } });
  const refresh = state.refresh();
  await state.favorite(product('A'), true);
  assert.equal(state.getSnapshot().favorites.length, 1);
  assert.equal(state.getSnapshot().ready, false);
  cart.resolve({ cart: null }); await refresh;
});

for (const selected of [true, false]) test(`a timed-out but committed favorite ${selected ? 'add' : 'remove'} is confirmed by reading the server`, async () => {
  let saved = !selected, writes = 0;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method) => {
    if (url === '/cart') return { cart: null };
    if (method) { saved = selected; writes++; throw Error('response timed out after commit'); }
    return { favorites: saved ? [{ product: product('A') }] : [] };
  } });
  await state.refresh();
  await state.favorite(product('A'), selected);
  assert.equal(state.getSnapshot().favorites.length, selected ? 1 : 0);
  assert.equal(state.getSnapshot().favoritesError, null);
  assert.equal(writes, 1);
});

test('malformed responses expose retryable load errors instead of inventing an empty list', async () => {
  let valid = false;
  const state = createShoppingState({ authenticated: () => true, send: async url =>
    valid ? url === '/cart' ? { cart: null } : { favorites: [] } : {} });
  await assert.rejects(state.refresh(), /verify/);
  assert.equal(state.getSnapshot().ready, false);
  assert.equal(state.getSnapshot().favoritesReady, false);
  assert.match(state.getSnapshot().cartError, /verify/);
  assert.match(state.getSnapshot().favoritesError, /verify/);
  valid = true; await state.refresh();
  assert.equal(state.getSnapshot().cartError, null);
  assert.equal(state.getSnapshot().favoritesError, null);
  assert.equal(state.getSnapshot().ready, true);
  assert.equal(state.getSnapshot().favoritesReady, true);
});

test('resource retries deduplicate reads and keep existing rows visible', async () => {
  const read = deferred(); let reads = 0;
  const state = createShoppingState({ authenticated: () => true, send: async url => {
    assert.equal(url, '/favorites');
    return ++reads === 1 ? { favorites: [{ product: product('A') }] } : read.promise;
  } });
  await state.refresh(false, 'favorites');
  const first = state.refresh(true, 'favorites'), duplicate = state.refresh(true, 'favorites');
  assert.equal(first, duplicate);
  assert.equal(state.getSnapshot().favorites[0]._id, 'A');
  assert.equal(reads, 2);
  read.resolve({ favorites: [] }); await Promise.all([first, duplicate]);
});

test('uncertain Favorites changes must reconcile before sending a later write', async () => {
  let writes = 0, failReads = false, saved = false;
  const state = createShoppingState({ authenticated: () => true, send: async (_url, method) => {
    if (method) { writes++; saved = true; failReads = true; throw Error('write timed out'); }
    if (failReads) throw Error('read offline');
    return { favorites: saved ? [{ product: product('A') }] : [] };
  } });
  await state.refresh(false, 'favorites');
  await assert.rejects(state.favorite(product('A'), true), /write timed out/);
  await assert.rejects(state.favorite(product('B'), true), /read offline/);
  assert.equal(writes, 1);
  failReads = false; await state.refresh(true, 'favorites');
  assert.equal(state.getSnapshot().favorites[0]._id, 'A');
  assert.equal(state.getSnapshot().favoritesError, null);
});

test('a new app instance and a reset session reload saved Cart and Favorites from the backend', async () => {
  let serverCart = null, saved = false;
  const deps = { authenticated: () => true, send: async (url, method, body) => {
    if (method && url === '/cart/add') serverCart = { items: [item(body.quantity)] };
    if (method && url === '/favorites/add') saved = true;
    return url.startsWith('/cart') ? { cart: serverCart, minimumOrderValue: 50 }
      : { favorites: saved ? [{ product: product('A') }] : [] };
  } };
  const first = createShoppingState(deps);
  await first.refresh(); await first.adjust(product('A'), 1); await first.favorite(product('A'), true);
  const reopened = createShoppingState(deps);
  await reopened.refresh();
  assert.equal(reopened.getSnapshot().cartCount, 1);
  assert.equal(reopened.getSnapshot().favorites.length, 1);
  reopened.reset(); await reopened.refresh();
  assert.equal(reopened.getSnapshot().cartCount, 1);
  assert.equal(reopened.getSnapshot().favorites.length, 1);
});
