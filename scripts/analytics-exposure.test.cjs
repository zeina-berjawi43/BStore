const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, deps, extra = {}) {
  const out = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: out, require: name => { if (!deps[name]) throw Error('Unmocked ' + name); return deps[name]; }, ...extra });
  return out;
}
for (const platform of ['web', 'android']) test(`${platform}: catalog viewability waits for focus and records visible products only`, () => {
  let focus; const calls = [];
  const module = load('hooks/use-product-impressions.ts', { react: { useCallback: fn => fn, useRef: value => ({ current: value }), useLayoutEffect: fn => fn(), useMemo: fn => fn() }, 'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '../services/analytics': { analytics: { track: (...args) => calls.push(args), newId: () => 'view_1234567890123456', priceProperties: () => ({}) } }, '../services/product-price': { getFinalPrice: p => p.price } });
  const hooks = module.useProductImpressions('search'), item = { _id: '507f1f77bcf86cd799439011', price: 9 };
  assert.equal(hooks.viewabilityConfig.minimumViewTime, 600); assert.equal(hooks.viewabilityConfig.itemVisiblePercentThreshold, 50);
  hooks.onViewableItemsChanged({ viewableItems: [{ item, isViewable: true }] }); assert.equal(calls.length, 0);
  const cleanup = focus(); hooks.onViewableItemsChanged({ viewableItems: [{ item, isViewable: true }, { item, isViewable: false }] }); assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'product_impression'); assert.equal(calls[0][1].screen, 'search');
  cleanup(); hooks.onViewableItemsChanged({ viewableItems: [{ item, isViewable: true }] }); assert.equal(calls.length, 1);
});

test('Home viewport sampling is dormant without consent and excludes offscreen/brief exposure', () => {
  let focus, tick, now = 1000, node, allowed = false, rect = [0, 900, 100, 100]; const calls = [];
  const react = { useCallback: fn => fn, useLayoutEffect: fn => fn(), useRef: value => { const ref = { current: value }; if (value === null) node = ref; return ref; }, useSyncExternalStore: () => ({ ready: true, accepted: allowed, config: { enabled: true } }) };
  const module = load('hooks/use-product-exposure.ts', { react, 'expo-router': { useFocusEffect: fn => { focus = fn; } },
    'react-native': { AppState: { currentState: 'active' }, Platform: { OS: 'android' }, Dimensions: { get: () => ({ width: 400, height: 800 }) } },
    '../services/analytics': { analytics: {} }, './use-product-impressions': { recordProductImpression: (...args) => calls.push(args) } },
  { Date: class extends Date { static now() { return now; } }, setInterval: callback => { tick = callback; return 1; }, clearInterval: () => { tick = null; } });
  module.useProductExposure({ id: 'fixture' }, 'index'); focus(); assert.equal(tick, undefined);
  allowed = true; module.useProductExposure({ id: 'fixture' }, 'index'); node.current = { measureInWindow: callback => callback(...rect) }; const cleanup = focus();
  tick(); now += 700; tick(); assert.equal(calls.length, 0);
  rect = [0, 100, 100, 100]; tick(); now += 300; tick(); assert.equal(calls.length, 0); now += 400; tick(); assert.equal(calls.length, 1);
  cleanup(); assert.equal(tick, null);
});

test('focused list observations use committed scopes, ignore refresh re-renders and reset on a real scope change', () => {
  const slots = [], calls = []; let cursor = 0, focus, layouts = [], effects = [], serial = 0;
  const react = {
    useRef: value => slots[cursor++] ||= { current: value },
    useCallback: (fn, deps) => { const index = cursor++; const old = slots[index]; if (old && deps.length === old.deps.length && deps.every((value, i) => value === old.deps[i])) return old.fn; slots[index] = { fn, deps }; return fn; },
    useLayoutEffect: fn => layouts.push(fn), useEffect: fn => effects.push(fn),
  };
  const module = load('hooks/use-analytics-view.ts', { react, 'expo-router': { useFocusEffect: fn => { focus = fn; } }, '../services/analytics': { analytics: { newId: () => `view_${serial++}`, track: (...args) => calls.push(args) } } });
  const render = (categoryId, ready = true, itemCount = 3) => {
    cursor = 0; layouts = []; effects = [];
    module.useAnalyticsView('product_list_viewed', ready, { screen: 'category-products', categoryId, itemCount });
    layouts.forEach(fn => fn()); effects.forEach(fn => fn());
  };
  render('category-A', false); const blur = focus(); assert.equal(calls.length, 0);
  render('category-A'); render('category-A', true, 50); assert.equal(calls.length, 1);
  render('category-B'); assert.equal(calls.length, 2); assert.equal(calls[1][1].categoryId, 'category-B');
  blur(); render('category-C'); assert.equal(calls.length, 2); focus();
  assert.deepEqual(calls.map(value => value[1].categoryId), ['category-A', 'category-B', 'category-C']);
});
