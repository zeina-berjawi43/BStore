const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
function load(file, requireMock) {
  const exports = {};
  const output = ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { exports, require: requireMock, URL, Date, performance, console });
  return exports;
}

test('brands Home section: public endpoint, image required, deterministic order, cached for cold start', async () => {
  const disk = new Map(); const urls = [];
  const storage = { getItem: async key => disk.get(key) || null, setItem: async (key, value) => { disk.set(key, value); } };
  const api = load('services/homeSectionsService.ts', name => name.includes('async-storage') ? storage : {
    request: async (url, init) => { urls.push([url, init]); return { ok: true, json: async () => ({ departments: [], slides: [], brands: [
      { _id: 'b2', name: 'Beta', image: 'https://x/b.png', order: 1 },
      { _id: 'a1', name: 'Alpha', image: 'https://x/a.png', order: 1 },
      { _id: 'z0', name: 'Zed', image: 'https://x/z.png', order: 0 },
      { _id: 'noimg', name: 'NoImage', image: '', order: 0 },
    ] }) }; },
  });
  const items = await api.refreshHomeSection('brands');
  assert.match(urls[0][0], /\/brands\/home$/);
  assert.equal(urls[0][1].headers.Authorization, undefined, 'same public request for guests and customers');
  assert.deepEqual(items.map(item => item.id), ['z0', 'a1', 'b2']);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(disk.has('homeSections:v1:brands'));
  // Departments and slides keep their own endpoints.
  await api.refreshHomeSection('departments'); await api.refreshHomeSection('slides');
  assert.deepEqual(urls.slice(1).map(([url]) => url.split('/').pop()), ['departments', 'slideshows']);
});

test('brand loop maths: static when brands fit, seamless 3-copy loop otherwise, wrap is invisible', () => {
  const stub = new Proxy({}, { get: () => () => null });
  const carousel = load('components/brand-carousel.tsx', name => name === 'react' ? { memo: f => f, useCallback: f => f, useEffect() {}, useRef: v => ({ current: v }), useState: v => [v, () => {}] } :
    name === 'react-native' ? { ...stub, AppState: { currentState: 'active' }, StyleSheet: { create: s => s } } : name === 'react/jsx-runtime' ? { jsx: () => null, jsxs: () => null } : stub);
  const { wrapOffset, BRAND_ITEM_WIDTH, BRAND_GAP } = carousel;
  const brandLoop = (count, viewport) => ({ ...carousel.brandLoop(count, viewport) });
  const step = BRAND_ITEM_WIDTH + BRAND_GAP;
  assert.deepEqual(brandLoop(0, 360), { span: 0, loops: false, copies: 1 });
  assert.equal(brandLoop(1, 360).loops, false);
  assert.equal(brandLoop(3, 360).loops, false, 'three brands fit a phone: no duplicates on screen');
  assert.equal(brandLoop(4, 0).loops, false, 'not measured yet');
  const many = brandLoop(10, 360);
  assert.deepEqual(many, { span: 10 * step, loops: true, copies: 3 });
  // Every wrapped offset stays in the middle copy and keeps the same visual phase.
  for (const x of [0, 5, many.span - 1, many.span, 1.5 * many.span, 2 * many.span, 2 * many.span + 7, 3 * many.span]) {
    const wrapped = wrapOffset(x, many.span);
    assert.ok(wrapped >= many.span && wrapped < 2 * many.span, String(x));
    assert.equal(((wrapped - x) % many.span + many.span) % many.span, 0);
  }
  // The middle copy plus a full viewport always fits inside rendered content (no blank edge).
  assert.ok(2 * many.span + 360 <= 3 * many.span - BRAND_GAP);
  // Small/large phones and long lists.
  for (const viewport of [320, 360, 414, 768]) for (const count of [2, 5, 40]) {
    const loop = brandLoop(count, viewport);
    if (loop.loops) assert.ok(loop.span - BRAND_GAP > viewport);
  }
});

test('brand product list reuses the catalog: exact brand match, populated or raw ids, empty id shows nothing', () => {
  const hook = load('hooks/use-catalog-screen.ts', () => new Proxy({}, { get: () => () => () => {} }));
  const products = [
    { _id: '1', name: 'A', brand: { _id: 'b1', name: 'One' }, category: { _id: 'c1' } },
    { _id: '2', name: 'B', brand: 'b1', category: 'c2' },
    { _id: '3', name: 'C', brand: { _id: 'b2', name: 'Two' } },
    { _id: '4', name: 'D' },
  ];
  assert.deepEqual(hook.selectBrandProducts(products, 'b1').map(p => p._id), ['1', '2']);
  assert.deepEqual(hook.selectBrandProducts(products, 'b2').map(p => p._id), ['3']);
  assert.deepEqual(hook.selectBrandProducts(products, ''), []);
  assert.equal(hook.selectBrandProducts(products, undefined), products, 'non-brand screens unchanged');
});

test('Home: Shop by Brands sits immediately before Categories, hidden when empty, opens the brand list', () => {
  const home = source('app/index.tsx');
  const brands = home.indexOf('testID="home-brands"');
  const categories = home.indexOf('testID="home-categories"');
  const slides = home.indexOf('testID="home-slideshow"');
  assert.ok(slides < brands && brands < categories);
  assert.match(home, /\{homeBrands\.length > 0 && <View testID="home-brands"/);
  assert.match(home.slice(brands, categories), /Shop by Brands/);
  assert.match(home, /pathname: '\/brand-products', params: \{ id: brand\.id, name: brand\.name \}/);
  // Brands never gate the startup screen.
  assert.doesNotMatch(home.match(/if \(initialLoading[^\n]*/)[0], /brand/i);
  const routes = source('services/sessionRoutes.ts');
  assert.match(routes.split('privateRoutes')[0], /'brand-products'/, 'public: guests can open brands (no prices)');
  const screen = source('app/brand-products.tsx');
  assert.match(screen, /CategoryProductsScreen key=\{id\} category="ALL" brand=\{\{ id, name \}\}/);
});

test('carousel lifecycle: pauses on touch/drag, resumes after idle, stops off-screen, honours reduced motion, cleans up', () => {
  const carousel = source('components/brand-carousel.tsx');
  for (const pattern of [/isReduceMotionEnabled/, /reduceMotionChanged/, /const motion = loops && !reducedMotion/,
    /useFocusEffect/, /cancelAnimationFrame/, /AppState\.addEventListener/, /visibilitychange/, /onTouchStart: pause/,
    /onScrollBeginDrag/, /onMomentumScrollEnd/, /RESUME_AFTER_MS = 2500/, /contentFit="contain"/, /cachePolicy="memory-disk"/,
    /onError=\{\(\) => setFailed\(true\)\}/, /importantForAccessibility=\{hidden \? 'no-hide-descendants' : 'auto'\}/]) {
    assert.match(carousel, pattern);
  }
});
