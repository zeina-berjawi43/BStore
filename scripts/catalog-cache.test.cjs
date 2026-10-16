const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./catalog-fixture.cjs');

test('complete cards are immediately reusable; requests deduplicate and unchanged items retain identity', async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.catalog.fetchCatalog('A'), f.catalog.fetchCatalog('A')]);
  assert.equal(a, b); assert.equal(f.calls.length, 1);
  assert.equal(f.catalog.peekCurrentCatalog(), a);
  assert.equal(a[0].discountedPrice, 8); assert.equal(a[0].imageFrame.zoom, 1);
  f.advance(60001);
  assert.equal(f.catalog.peekCurrentCatalog(), a);
  const unchanged = await f.catalog.fetchCatalog('A'); assert.equal(unchanged, a);
  f.products([{ ...a[0], discountedPrice: 7 }]);
  const changed = await f.catalog.fetchCatalog('A', true);
  assert.notEqual(changed[0], a[0]); assert.equal(changed[0].discountedPrice, 7);
  f.dispose();
});

test('A/B/C sessions and observed price-class changes invalidate prices; guests receive metadata only', async () => {
  const f = fixture();
  for (const account of ['A', 'B', 'C']) {
    f.switchAccount(account); assert.equal(f.catalog.peekCurrentCatalog().length, 0);
    await f.catalog.fetchCatalog(account);
    f.pricingChanged(); assert.equal(f.catalog.peekCurrentCatalog().length, 0);
    await f.catalog.fetchCatalog(account);
  }
  f.switchAccount(null);
  const guest = await f.catalog.fetchCatalog(null);
  assert.equal(guest[0].price, undefined); assert.equal(guest[0].discountedPrice, undefined);
  assert.equal(guest[0].discount, undefined); assert.equal(guest[0].name, 'Shampoo');
  f.products([{ ...guest[0], availability: false, price: 10, discountedPrice: 8 }]);
  const section = await f.catalog.fetchProductSection('offers', null);
  assert.equal(section[0].availability, false); assert.equal(section[0].price, undefined);
  f.dispose();
});

test('an in-flight previous-session response cannot repopulate catalog or Home section prices', async () => {
  const f = fixture();
  for (const load of [() => f.catalog.fetchCatalog('A', true), () => f.catalog.fetchProductSection('offers', 'A', true)]) {
    const pending = load(); f.switchAccount('B');
    await assert.rejects(pending, /session changed/);
    assert.equal(f.catalog.peekCurrentCatalog().length, 0);
    assert.equal(f.catalog.peekPricedSection('offers', 'A').length, 0);
  }
  f.dispose();
});

test('failed background refresh preserves complete cards and selection; retry recovers', async () => {
  const f = fixture(); f.render(); f.focus(); await f.flush();
  let view = f.render(); view.setSelectedSubCategory('shampoo');
  f.advance(60001); f.fail(true); f.blur(); f.render(); f.focus(); await f.flush();
  view = f.render(); assert.equal(view.filteredProducts[0].discountedPrice, 8);
  assert.equal(view.selectedSubCategory, 'shampoo'); assert.match(view.productsError, /could not/);
  assert.equal(view.loadingProducts, false); assert.equal(view.loadingSubCategories, false);
  f.fail(false); view.retry(); await f.flush(); view = f.render();
  assert.equal(view.productsError, ''); assert.equal(view.selectedSubCategory, 'shampoo'); f.dispose();
});

test('cold network failure stops spinners and exposes retry', async () => {
  const f = fixture(); f.fail(true); f.render(); f.focus(); await f.flush();
  let view = f.render(); assert.equal(view.loadingProducts, false); assert.equal(view.loadingSubCategories, false);
  assert.match(view.productsError, /could not/); f.fail(false); view.retry(); await f.flush();
  assert.equal(f.render().filteredProducts.length, 1); f.dispose();
});

test('rapid department route changes never display the previous department categories', async () => {
  const f = fixture(); f.render('care'); f.focus(); await f.flush();
  assert.equal(f.render('care').subCategories.length, 2); f.blur();
  assert.equal(f.render('other').subCategories.length, 0);
  f.focus(); f.blur(); await f.flush();
  assert.equal(f.render('other').subCategories[0]._id, 'other'); f.dispose();
});

test('category cache has TTL, LRU bound, request deduplication and invalidation guard', async () => {
  const f = fixture(), cache = f.resources.createResourceCache(2, 100, 200);
  let reads = 0, resolve;
  const fetcher = () => { reads++; return new Promise(done => { resolve = done; }); };
  const a = cache.load('a', fetcher), b = cache.load('a', fetcher);
  assert.equal(reads, 1); resolve(['a']); assert.equal(await a, await b);
  await cache.load('b', async () => ['b']); cache.peek('a'); await cache.load('c', async () => ['c']);
  assert.equal(cache.peek('b'), undefined); assert.equal(cache.peek('a')[0], 'a');
  f.advance(201); assert.equal(cache.peek('a'), undefined);
  const stale = cache.load('d', fetcher); cache.clear(); resolve(['d']);
  await assert.rejects(stale, /session changed/); assert.equal(cache.peek('d'), undefined); f.dispose();
});

test('usable price snapshots expire rather than becoming an offline price cache', async () => {
  const f = fixture(); await f.catalog.fetchCatalog('A'); f.advance(300001);
  assert.equal(f.catalog.peekCurrentCatalog().length, 0); f.dispose();
});
