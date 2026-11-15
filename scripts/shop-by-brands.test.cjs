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
  vm.runInNewContext(output, { exports,
    require: name => name.endsWith('/brand-image-frame') ? load('services/brand-image-frame.ts', () => load('services/image-frame.ts', () => ({}))) : requireMock(name), URL, Date, performance, console });
  return exports;
}

test('Home layout refinements apply exclusively to Web widths of 1024px and above', () => {
  const file = ts.createSourceFile('index.tsx', source('app/index.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['isDesktopWeb', 'brandBleed', 'slideshowHeight', 'slideshowFit'];
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(file))) declarations.push(node.getText(file));
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(declarations.length, names.length);
  const geometry = (os, width) => JSON.parse(vm.runInNewContext(
    declarations.map(value => `const ${value};`).join('\n') + `JSON.stringify({${names.join(',')}})`,
    { Platform: { OS: os }, windowWidth: width }));
  const mobile = { isDesktopWeb: false, brandBleed: 18, slideshowHeight: 218, slideshowFit: 'cover' };
  for (const os of ['android', 'ios']) for (const width of [320, 375, 412, 1024, 1280, 1440, 1920]) {
    assert.deepEqual(geometry(os, width), mobile, `${os} ${width}px retains native geometry`);
  }
  for (const width of [320, 375, 412, 768, 1023]) assert.deepEqual(geometry('web', width), mobile);
  for (const width of [1024, 1280, 1440, 1920]) assert.deepEqual(geometry('web', width), {
    isDesktopWeb: true, brandBleed: 0, slideshowHeight: 360, slideshowFit: 'contain',
  });
});

test('brands Home section: public endpoint, image required, deterministic order, cached for cold start', async () => {
  const disk = new Map(); const urls = [];
  const storage = { getItem: async key => disk.get(key) || null, setItem: async (key, value) => { disk.set(key, value); } };
  const api = load('services/homeSectionsService.ts', name => name.includes('async-storage') ? storage : name === './image-frame' ? load('services/image-frame.ts', () => ({})) : {
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

test('brand geometry: larger responsive circles, static when brands fit, seamless 3-copy loop otherwise', () => {
  const stub = new Proxy({}, { get: () => () => null });
  const carousel = load('components/brand-carousel.tsx', name => name === 'react' ? { memo: f => f, useCallback: f => f, useEffect() {}, useRef: v => ({ current: v }), useState: v => [v, () => {}] } :
    name === 'react-native' ? { ...stub, AppState: { currentState: 'active' }, StyleSheet: { create: s => s, absoluteFill: {} } } : name === 'react/jsx-runtime' ? { jsx: () => null, jsxs: () => null } :
    name === '../services/image-frame' ? { validFrame: () => false } : stub);
  const { wrapOffset } = carousel;
  const metrics = width => ({ ...carousel.brandMetrics(width) });
  // Previously 76px. Phones get about 3 circles; tablets/desktop web are capped.
  assert.deepEqual(metrics(320), { circle: 96, gap: 14, step: 110 });
  assert.deepEqual(metrics(360), { circle: 96, gap: 14, step: 110 });
  assert.deepEqual(metrics(393), { circle: 102, gap: 15, step: 117 });
  assert.deepEqual(metrics(412), { circle: 107, gap: 16, step: 123 });
  assert.deepEqual(metrics(430), { circle: 112, gap: 17, step: 129 });
  assert.deepEqual(metrics(768), { circle: 136, gap: 20, step: 156 });
  assert.deepEqual(metrics(1440), { circle: 136, gap: 20, step: 156 });
  assert.deepEqual(metrics(0), metrics(390), 'unmeasured window falls back to a phone size');
  for (const width of [320, 360, 393, 412, 430, 600, 768, 1024, 1440]) {
    const m = metrics(width);
    assert.ok(m.circle >= 96 && m.circle <= 136 && Number.isInteger(m.circle) && m.gap > 0, String(width));
    // The full-width strip keeps several circles visible on phones.
    if (width <= 430) assert.ok(width / m.step >= 2.5, 'phone shows several brands: ' + width);
  }
  const { step, gap } = metrics(412);
  const brandLoop = (count, viewport) => ({ ...carousel.brandLoop(count, viewport, step, gap) });
  assert.deepEqual(brandLoop(0, 412), { span: 0, loops: false, copies: 1 });
  assert.equal(brandLoop(1, 412).loops, false);
  assert.equal(brandLoop(3, 412).loops, false, 'three brands fit a phone: no duplicates on screen');
  assert.equal(brandLoop(4, 412).loops, true);
  assert.equal(brandLoop(4, 0).loops, false, 'not measured yet');
  const many = brandLoop(10, 412);
  assert.deepEqual(many, { span: 10 * step, loops: true, copies: 3 });
  for (const x of [0, 5, many.span - 1, many.span, 1.5 * many.span, 2 * many.span, 2 * many.span + 7, 3 * many.span]) {
    const wrapped = wrapOffset(x, many.span);
    assert.ok(wrapped >= many.span && wrapped < 2 * many.span, String(x));
    assert.equal(((wrapped - x) % many.span + many.span) % many.span, 0);
  }
  // Middle copy plus a full viewport always fits inside rendered content (no blank edge).
  for (const width of [320, 412, 768, 1440]) for (const count of [2, 5, 40]) {
    const m = metrics(width), viewport = width;
    const loop = carousel.brandLoop(count, viewport, m.step, m.gap);
    if (loop.loops) assert.ok(2 * loop.span + viewport <= 3 * loop.span - m.gap);
  }
});

test('brand circles: image only, accessible name kept, saved framing uses the shared product renderer', async () => {
  const carousel = source('components/brand-carousel.tsx');
  assert.doesNotMatch(carousel, /numberOfLines|styles\.name/, 'visible brand label removed');
  assert.match(carousel, /accessibilityLabel=\{`Shop \$\{brand\.name\}`\}/);
  assert.match(carousel, /<HomeImage uri=\{brand\.image\}/);
  assert.match(carousel, /imageFrame: brand\.imageFrame/);
  assert.match(source('components/home-image.tsx'), /<ProductImage key=\{source\.displayKey\}.*imageFrame=\{source\.imageFrame\}/);
  assert.match(carousel, /borderRadius: size \/ 2/);
  // Framing is read from the API, validated, and absent/invalid keeps the original logo.
  const storage = { getItem: async () => null, setItem: async () => {} };
  const frame = load('services/image-frame.ts', () => ({}));
  const api = load('services/homeSectionsService.ts', name => name.includes('async-storage') ? storage : name === './image-frame' ? frame : {
    request: async () => ({ ok: true, json: async () => ({ brands: [
      { _id: 'a', name: 'A', image: 'https://x/a.png', order: 0, imageFrame: { zoom: 2, x: 0.5, y: -0.5 } },
      { _id: 'b', name: 'B', image: 'https://x/b.png', order: 1, imageFrame: { zoom: 9, x: 0, y: 0 } },
      { _id: 'c', name: 'C', image: 'https://x/c.png', order: 2 },
    ], departments: [{ _id: 'd', name: 'D', image: 'd.png', imageFrame: { zoom: 2, x: 0, y: 0 } }] }) }),
  });
  const items = await api.refreshHomeSection('brands');
  assert.deepEqual({ ...items[0].imageFrame }, { zoom: 2, x: 0.5, y: -0.5 });
  assert.equal(items[1].imageFrame, undefined, 'invalid framing ignored');
  assert.equal(items[2].imageFrame, undefined, 'existing brands keep default presentation');
  assert.equal((await api.refreshHomeSection('departments'))[0].imageFrame, undefined, 'departments unchanged');
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
  assert.match(home, /\{\(homeBrands\.length > 0 \|\| \(brandsLoading && !brandsError\)\) && <View testID="home-brands"/);
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
    /onScrollBeginDrag/, /onMomentumScrollEnd/, /RESUME_AFTER_MS = 2500/,
    /importantForAccessibility=\{hidden \? 'no-hide-descendants' : 'auto'\}/]) {
    assert.match(carousel, pattern);
  }
});

test('Brand skeleton follows the same responsive circles without starting carousel motion', () => {
  const jsx = (type, props) => ({ type, props });
  let width = 320;
  const carousel = load('components/brand-carousel.tsx', name => name === 'react' ? { memo: f => f } :
    name === 'react-native' ? { View: 'View', StyleSheet: { create: s => s }, useWindowDimensions: () => ({ width }) } :
    name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {});
  for (width of [320, 412, 768, 1440]) {
    const skeleton = carousel.BrandCarouselSkeleton();
    const metrics = carousel.brandMetrics(width);
    assert.equal(skeleton.props.accessibilityRole, 'progressbar');
    assert.equal(skeleton.props.pointerEvents, 'none');
    assert.equal(skeleton.props.style[0].overflow, 'hidden');
    assert.equal(skeleton.props.style[1].gap, metrics.gap);
    assert.ok(skeleton.props.children.length >= 3);
    assert.ok(skeleton.props.children.length * metrics.step >= width, 'skeleton fills the full viewport');
    for (const child of skeleton.props.children) {
      assert.equal(child.props.style.width, metrics.circle);
      assert.equal(child.props.style.height, metrics.circle);
      assert.equal(child.props.style.borderRadius, metrics.circle / 2);
    }
  }
});

test('actual Home Brand slot shows a cold skeleton, keeps warm content on failure and hides empty results', () => {
  const file = source('app/index.tsx');
  const ast = ts.createSourceFile('index.tsx', file, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(p =>
      ts.isJsxAttribute(p) && p.name.getText(ast) === 'testID' && p.initializer?.text === 'home-brands')) {
      expression = node.parent.getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(expression);
  const output = ts.transpileModule(`exports.slot = (${expression});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const jsx = (type, props) => ({ type, props });
  const walk = node => !node || typeof node !== 'object' ? [] :
    [node, ...(Array.isArray(node.props?.children) ? node.props.children : [node.props?.children]).flatMap(walk)];
  for (const [items, loading, error, expected] of [
    [[], true, '', 'Skeleton'],
    [[{ id: 'cached' }], false, '', 'Carousel'],
    [[{ id: 'cached' }], false, 'private DNS failure', 'Carousel'],
    [[], false, 'private DNS failure', false],
    [[], false, '', false],
  ]) {
    const exports = {};
    vm.runInNewContext(output, { exports, homeBrands: items, brandsLoading: loading, brandsError: error,
      styles: {}, brandBleed: 18, View: 'View', Text: 'Text', BrandCarousel: 'Carousel', BrandCarouselSkeleton: 'Skeleton', openBrand() {},
      require: () => ({ jsx, jsxs: jsx }) });
    if (!expected) assert.equal(exports.slot, false);
    else assert.ok(walk(exports.slot).some(node => node.type === expected));
    assert.ok(!JSON.stringify(exports.slot).includes('private DNS failure'));
  }
});
