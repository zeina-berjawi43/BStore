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
  // The discount percentage is public catalog metadata (badges before login); prices never are.
  assert.equal(guest[0].discount, 20); assert.equal(guest[0].name, 'Shampoo');
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

test('Details can immediately reuse authorized listing and offer prices, then isolates reassignment and logout', async () => {
  const f = fixture();
  await f.catalog.fetchCatalog('A');
  assert.equal(f.catalog.peekCurrentProduct('p').discountedPrice, 8);
  assert.equal(f.catalog.peekCurrentProduct('unknown'), undefined);
  f.pricingChanged(); assert.equal(f.catalog.peekCurrentProduct('p'), undefined);
  f.products([{ _id: 'p', name: 'Dynamic class offer', price: 112.5, discountedPrice: 90, discount: 20, category: 'shampoo' }]);
  await f.catalog.fetchProductSection('offers', 'Wholesale');
  assert.equal(f.catalog.peekCurrentProduct('p').discountedPrice, 90);
  f.switchAccount(null); assert.equal(f.catalog.peekCurrentProduct('p'), undefined);
  await f.catalog.fetchCatalog(null); assert.equal(f.catalog.peekCurrentProduct('p').price, undefined);
  f.advance(300001); assert.equal(f.catalog.peekCurrentProduct('p'), undefined);
  f.dispose();
});

// Unified Offers replaced the former per-category Offers tabs with exactly three filters.
test('Unified Offers: All | Buy & Get | Special Discounts, deduplicated, local filter switching, refresh reflects admin changes', async () => {
  const BUY_GET = '6afa01170b8dc1a73f68a832';
  const bundle = { _id: 'bundle', name: 'Bundle', price: 15, discountedPrice: 15, discount: 0, image: 'b.jpg', availability: true, category: { _id: 'gifts', name: 'Renamed by admin', department: BUY_GET } };
  const both = { _id: 'both', name: 'Bundle on sale', price: 20, discountedPrice: 18, discount: 10, image: 'c.jpg', availability: true, category: { _id: 'gifts', name: 'Renamed by admin', department: BUY_GET } };
  const sale = { _id: 'sale', name: 'Shampoo', price: 10, discountedPrice: 8, discount: 20, image: 'p.jpg', availability: true, category: { _id: 'shampoo', name: 'Shampoo', department: 'care' } };
  const f = fixture(); f.products([bundle, both, sale, { ...sale }]);
  f.render(undefined, true); f.focus(); await f.flush();
  let view = f.render(undefined, true);
  assert.deepEqual(Array.from(view.subCategories, item => [item._id, item.name]), [['buy-get', 'Buy & Get'], ['special-discounts', 'Special Discounts']]);
  assert.ok(f.calls.some(url => url.endsWith('/products/offers?department=' + BUY_GET)), 'unified offers request');
  assert.ok(!f.calls.some(url => url.includes('/categories')), 'no category list needed for fixed filters');
  assert.equal(view.selectedSubCategory, 'ALL');
  assert.deepEqual(Array.from(view.filteredProducts, p => p._id), ['both', 'bundle', 'sale'], 'All: unique by ID, existing price ordering');
  const requests = f.calls.length;
  view.setSelectedSubCategory('buy-get'); view = f.render(undefined, true);
  assert.deepEqual(Array.from(view.filteredProducts, p => p._id), ['both', 'bundle'], 'Buy & Get needs no discount');
  view.setSelectedSubCategory('special-discounts'); view = f.render(undefined, true);
  assert.deepEqual(Array.from(view.filteredProducts, p => p._id), ['both', 'sale']);
  assert.equal(f.calls.length, requests, 'switching filters makes no request');
  // Admin removes a discount: the next refresh drops it from Special Discounts (still a Buy & Get offer).
  f.products([bundle, { ...both, discount: 0, discountedPrice: 20 }]); view.retry(); await f.flush();
  view = f.render(undefined, true); view = f.render(undefined, true);
  assert.deepEqual(Array.from(view.filteredProducts, p => p._id), [], 'no special discounts left');
  assert.equal(view.selectedSubCategory, 'special-discounts', 'fixed filters keep the selection');
  view.setSelectedSubCategory('ALL'); view = f.render(undefined, true);
  assert.deepEqual(Array.from(view.filteredProducts, p => p._id), ['both', 'bundle']);
  // Empty collections settle with the three filters still available.
  f.products([]); view.retry(); await f.flush();
  view = f.render(undefined, true); view = f.render(undefined, true);
  assert.equal(view.subCategories.length, 2); assert.equal(view.filteredProducts.length, 0); assert.equal(view.loadingProducts, false);
  f.dispose();
});
