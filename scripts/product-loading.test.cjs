const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const product = { _id: 'p', name: 'Product', image: 'p.jpg', imageFrame: { zoom: 2 }, price: 100, discountedPrice: 80, discount: 20, availability: true };
function catalog(disk = new Map()) {
  const calls = [], exports = {}; let changed;
  vm.runInNewContext(ts.transpileModule(source('services/catalogService.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: name => name.includes('async-storage') ? { getItem: async key => disk.get(key) || null, setItem: async (key, value) => disk.set(key, value) }
      : name === './authService' ? { API_URL: 'https://test' } : name === './tokenStorage' ? { onSessionChanged: fn => { changed = fn; } }
      : { request: (url, options) => { const gate = deferred(); calls.push({ url, options, ...gate }); return gate.promise; } },
  });
  return { api: exports, calls, disk, changed: () => changed() };
}
const reply = products => ({ ok: true, json: async () => ({ products }) });
for (const section of ['offers', 'top-selling']) test(`${section}: cold cache renders metadata during refresh; failure never erases cached products`, async () => {
  const first = catalog();
  assert.equal((await first.api.readProductSection(section)).length, 0);
  const job = first.api.fetchProductSection(section, 'A');
  first.calls[0].resolve(reply(section === 'top-selling' ? [{ product }] : [product])); await job;
  const cold = catalog(first.disk);
  const pending = cold.api.fetchProductSection(section, 'B');
  const cached = await cold.api.readProductSection(section);
  assert.equal(cached[0]._id, 'p'); assert.equal(cached[0].imageFrame.zoom, 2);
  for (const key of ['price', 'discountedPrice', 'discount', 'availability']) assert.equal(cached[0][key], undefined);
  cold.calls[0].reject(Error('timeout')); await assert.rejects(pending, /timeout/);
  assert.equal((await cold.api.readProductSection(section))[0]._id, 'p');
});
test('parallel sections deduplicate requests and isolate authenticated snapshots after session changes', async () => {
  const { api, calls, changed } = catalog();
  const top = api.fetchProductSection('top-selling', 'A'), offers = api.fetchProductSection('offers', 'A');
  const duplicate = api.fetchProductSection('offers', 'A');
  assert.equal(calls.length, 2);
  calls[0].resolve(reply([{ product }])); calls[1].resolve(reply([product])); await Promise.all([top, offers, duplicate]);
  await api.fetchProductSection('top-selling', 'A'); await api.fetchProductSection('offers', 'A'); assert.equal(calls.length, 2);
  changed(); const guest = api.fetchProductSection('offers', null); assert.equal(calls[2].options.headers.Authorization, undefined);
  calls[2].resolve(reply([{ _id: 'p', name: 'Product' }])); assert.equal((await guest)[0].price, undefined);
});
test('unexpected empty top sellers and malformed catalogs reject; successful empty offers are confirmed', async () => {
  const { api, calls } = catalog();
  const top = api.fetchProductSection('top-selling', null); calls[0].resolve(reply([])); await assert.rejects(top, /temporarily unavailable/);
  const offers = api.fetchProductSection('offers', null); calls[1].resolve(reply([])); assert.equal((await offers).length, 0);
  const malformed = api.fetchCatalog(null); calls[2].resolve(reply([null])); await assert.rejects(malformed, /product list/);
});
function handler(file, name, context) {
  const text = source('app/' + file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let fn;
  function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) fn = node.initializer.getText(ast); ts.forEachChild(node, walk); } walk(ast);
  assert.ok(fn); const exports = {};
  vm.runInNewContext(ts.transpileModule('exports.fn = ' + fn, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { exports, ...context }); return exports.fn;
}
for (const section of ['Offers', 'TopSelling']) test(`Home ${section} failure preserves displayed products and exits loading without a false empty state`, async () => {
  let errors = 0, loading = true;
  const context = { accessTokenRef: { current: 'A' }, fetchProductSection: async () => { throw Error('offline'); },
    ['set' + (section === 'Offers' ? 'OfferProducts' : 'TopSellingProducts')]: () => assert.fail('must retain displayed data'),
    ['set' + (section === 'Offers' ? 'OffersError' : 'TopError')]: value => { if (value) errors++; },
    ['set' + (section === 'Offers' ? 'OffersLoading' : 'TopLoading')]: value => { loading = value; },
  };
  await handler('index.tsx', 'load' + section, context)('A'); assert.equal(errors, 1); assert.equal(loading, false);
});
test('Product Details timeout keeps cached metadata; first launch has an explicit placeholder and unavailable error', async () => {
  let displayed = null, error = '', loaded = false;
  const gate = deferred();
  const context = { product: null, productId: 'p', productRequest: { current: 0 }, productFresh: { current: false }, getSessionSnapshot: () => ({ revision: 1 }),
    setProduct: value => { displayed = value; }, setProductError: value => { error = value; }, setProductLoaded: value => { loaded = value; },
    readPublicCatalog: async () => [product], AbortController, scheduleTimeout: () => 1, clearTimeout: () => {}, checkLogin: async () => 'A', request: () => gate.promise, API_URL: 'https://test',
  };
  const job = handler('product-details.tsx', 'loadProduct', context)(); await Promise.resolve(); await Promise.resolve();
  assert.equal(displayed._id, 'p'); gate.reject(Error('timeout')); await job;
  assert.equal(displayed._id, 'p'); assert.match(error, /unavailable/); assert.equal(loaded, true); assert.equal(context.productFresh.current, false);
  assert.match(source('app/product-details.tsx'), /Loading product\.\.\./);
  assert.match(source('app/index.tsx'), /topLoading \? 'Loading top selling products/);
  assert.match(source('app/index.tsx'), /offersLoading \? 'Loading offers/);
  assert.match(source('app/category-products.tsx'), /loadingProducts \? 'Loading products\.\.\.' : productsError/);
});
