const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function execute(code, context = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, console, __DEV__: false, ...context });
  return exports;
}
function handler(file, name, context) {
  const ast = ts.createSourceFile(file, source('app/' + file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let code;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) code = node.initializer.getText(ast);
    ts.forEachChild(node, walk);
  }
  walk(ast); assert.ok(code, name);
  return execute('exports.fn = ' + code, context).fn;
}
function hooks() {
  const slots = []; let cursor = 0; const effects = [];
  const changed = (old, deps) => !old || !deps || deps.some((value, i) => value !== old[i]);
  const react = {
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useMemo: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  return { react, render: fn => { cursor = 0; const result = fn(); effects.splice(0).forEach(run => run()); return result; }, unmount: () => slots.forEach(slot => slot?.cleanup?.()) };
}
function pendingHook() {
  const env = hooks();
  const { useProductPending } = execute(source('hooks/useProductPending.ts'), { require: () => env.react });
  return env.render(useProductPending);
}

test('shared pending hook synchronously blocks A twice and keeps B independent through completion', () => {
  const pending = pendingHook();
  assert.equal(pending.begin('A'), true);
  assert.equal(pending.begin('A'), false);
  assert.equal(pending.begin('B'), true);
  pending.end('A');
  assert.equal(pending.begin('B'), false);
  assert.equal(pending.begin('A'), true);
});

for (const selected of [false, true]) {
  for (const fail of [false, true]) {
    test(`Search favorite ${selected ? 'removal' : 'addition'} updates before token lookup and ${fail ? 'rolls back on failure' : 'stays on success'}`, async () => {
      const token = deferred(), network = deferred(); let ids = new Set(selected ? ['A'] : []); const alerts = [], calls = [];
      const context = {
        pendingRef: { current: new Set() }, setPending: () => {}, epoch: { current: 1 }, favoriteIds: ids,
        setFavoriteIds: update => { ids = update(ids); }, getValidAccessToken: () => token.promise,
        setProductFavorite: (...args) => { calls.push(args); return network.promise; },
        showAlert: (...args) => alerts.push(args), Alert: { alert: (...args) => alerts.push(args) },
        ShoppingError: class ShoppingError extends Error {}, router: { push: () => assert.fail('unexpected navigation') },
        reloadAfterMutation: { current: false },
      };
      const toggle = handler('search.tsx', 'changeProduct', context);
      const operation = toggle({ _id: 'A', name: 'A' }, 'favorite');
      assert.equal(ids.has('A'), !selected);
      assert.equal(calls.length, 0);
      await toggle({ _id: 'A' }, 'favorite');
      token.resolve('token'); await flush();
      assert.equal(calls.length, 1);
      assert.equal(calls[0][1], !selected);
      if (fail) network.reject(Error('offline')); else network.resolve();
      await operation;
      assert.equal(ids.has('A'), fail ? selected : !selected);
      assert.equal(alerts.length, 1);
      assert.equal(context.pendingRef.current.size, 0);
    });
  }
}

test('Home favorite A rollback preserves successful favorite B and alerts on success', async () => {
  let favorites = []; const a = deferred(), b = deferred(), alerts = [];
  const toggle = handler('index.tsx', 'toggleFavorite', {
    favorites, isLoggedIn: true, favoriteBusy: { current: new Set() }, favoriteRevision: { current: 0 }, homeGenerationRef: { current: 1 },
    setFavorites: update => { favorites = update(favorites); }, getAccessToken: async () => 'token',
    Alert: { alert: (...args) => alerts.push(args) }, setProductFavorite: id => id === 'A' ? a.promise : b.promise, showAlert: (...args) => alerts.push(args),
  });
  const first = toggle({ id: 'A' }), second = toggle({ id: 'B' });
  assert.deepEqual(Array.from(favorites, p => p.id), ['A', 'B']);
  b.resolve(); await second; a.reject(Error('offline')); await first;
  assert.deepEqual(Array.from(favorites, p => p.id), ['B']);
  assert.ok(alerts.some(([, title]) => title === 'Added to Favorites'));
});

test('Favorites removes two rows immediately and restores only the failed row', async () => {
  let favorites = [{ id: 'A' }, { id: 'B' }]; const a = deferred(), b = deferred();
  const remove = handler('favorites.tsx', 'removeFavorite', {
    favorites, favoritePending: pendingHook(), loadRevision: { current: 0 },
    setFavorites: update => { favorites = update(favorites); }, getAccessToken: async () => 'token',
    setProductFavorite: id => id === 'A' ? a.promise : b.promise,
    ShoppingError: class ShoppingError extends Error {},
    showAlert: () => {}, Alert: { alert: () => {} },
  });
  const first = remove('A'), second = remove('B');
  assert.equal(favorites.length, 0);
  b.resolve(); await second; a.reject(Error('offline')); await first;
  assert.deepEqual(Array.from(favorites, p => p.id), ['A']);
});

for (const file of ['favorites.tsx', 'category-products.tsx', 'department-categories.tsx']) {
  test(`${file}: parallel cart additions stay on page, reject same-product duplicate, send quantity 1`, async () => {
    const token = deferred(), calls = [], alerts = []; const pending = pendingHook();
    const add = handler(file, 'addToCart', {
      isLoggedIn: true, cartPending: pending, getAccessToken: () => token.promise, getValidAccessToken: () => token.promise,
      API_URL: 'https://example.invalid', request: async (url, options) => { calls.push([url, JSON.parse(options.body)]); return { ok: true, json: async () => ({}) }; },
      loadCart: async () => {}, showAlert: message => alerts.push(message), router: { push: () => assert.fail('navigated'), replace: () => assert.fail('navigated') },
      Alert: { alert: () => assert.fail('error') },
    });
    const a = { id: 'A', _id: 'A', name: 'A' }, b = { id: 'B', _id: 'B', name: 'B' };
    const first = add(a), second = add(b); await add(a);
    assert.equal(pending.locks.current.size, 2);
    token.resolve('token'); await Promise.all([first, second]);
    assert.equal(calls.length, 2); assert.equal(alerts.length, 2);
    assert.ok(calls.every(([url, body]) => url.endsWith('/cart/add') && body.quantity === 1));
    assert.equal(pending.locks.current.size, 0);
  });
}

test('Search A failure still rolls back after focus changes during its request', async () => {
  const network = deferred(), epoch = { current: 1 }; let ids = new Set();
  const toggle = handler('search.tsx', 'changeProduct', {
    pendingRef: { current: new Set() }, setPending: () => {}, epoch, favoriteIds: ids,
    setFavoriteIds: update => { ids = update(ids); }, getValidAccessToken: async () => 'token',
    setProductFavorite: () => network.promise, reloadAfterMutation: { current: false },
  });
  const operation = toggle({ _id: 'A' }, 'favorite'); await flush(); epoch.current++;
  network.reject(Error('offline')); await operation;
  assert.equal(ids.has('A'), false);
});

test('Home cart lock is per product, with success feedback and no navigation', async () => {
  const token = deferred(), calls = [], alerts = [];
  const add = handler('index.tsx', 'addToCart', {
    isLoggedIn: true, cartBusy: { current: new Set() }, getAccessToken: () => token.promise,
    API_URL: 'https://example.invalid', request: async (_url, options) => { calls.push(JSON.parse(options.body)); return { ok: true, json: async () => ({}) }; },
    loadCartCount: async () => {}, showAlert: message => alerts.push(message), router: { push: () => assert.fail('navigated') },
  });
  const first = add({ id: 'A', name: 'A' }), second = add({ id: 'B', name: 'B' });
  await add({ id: 'A' }); token.resolve('token'); await Promise.all([first, second]);
  assert.equal(calls.length, 2); assert.equal(alerts.length, 2);
  assert.ok(calls.every(call => call.quantity === 1));
});

test('Product Details preserves quantity, duplicate prevention and staying on the product', async () => {
  const token = deferred(), calls = []; let pending = false;
  const add = handler('product-details.tsx', 'addToCart', {
    isLoggedIn: true, product: { _id: 'A', name: 'A' }, cartBusyRef: { current: false },
    setAddingToCart: value => { pending = value; }, getValidAccessToken: () => token.promise,
    API_URL: 'https://example.invalid', request: async (_url, options) => { calls.push(JSON.parse(options.body)); return { ok: true, json: async () => ({}) }; },
    showAlert: () => {}, router: { push: () => assert.fail('navigated') },
  });
  const operation = add(); await add(); assert.equal(pending, true);
  token.resolve('token'); await operation;
  assert.equal(calls.length, 1); assert.equal(calls[0].quantity, 1); assert.equal(pending, false);
});

test('Loading still schedules startup completion and cancels its navigation when it loses focus', () => {
  const env = hooks(), timers = new Map(), destinations = []; let next = 0;
  const { default: Loading } = execute(source('app/loading.tsx'), {
    setTimeout: fn => { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id),
    require: name => name === 'react' ? env.react
      : name === 'react/jsx-runtime' ? { jsx: () => null, jsxs: () => null }
      : name === 'expo-router' ? { router: { dismissTo: route => destinations.push(route) }, useFocusEffect: fn => env.react.useEffect(fn, [fn]) }
      : name === 'react-native' ? { StyleSheet: { create: value => value, absoluteFillObject: {} } } : {},
  });
  env.render(Loading); assert.equal(timers.size, 1);
  [...timers.values()][0](); assert.deepEqual(destinations, ['/']);
  env.unmount(); assert.equal(timers.size, 0);
});

test('Top Selling renders old/current/percentage only for offers and Recently Added keeps its offer price', () => {
  const file = source('app/index.tsx');
  const ast = ts.createSourceFile('index.tsx', file, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const pricing = execute(source('services/product-price.ts'));
  const jsx = (type, props) => ({ type, props });
  const flatten = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree)
    : Array.isArray(tree) ? tree.map(flatten).join('') : flatten(tree.props?.children);
  const components = {};
  for (const name of ['TopSellingProductRow', 'RecentProduct']) {
    const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    components[name] = execute(fn.getText(ast) + '\nexports.component = ' + name, {
      require: () => ({ jsx, jsxs: jsx }), useRef: initial => ({ current: initial }), useState: initial => [typeof initial === 'function' ? initial() : initial], useEffect: () => {},
      Animated: { Value: class { interpolate() { return 0; } } }, styles: {}, View: 'View', Text: 'Text', Pressable: 'Pressable', ProductImage: 'ProductImage', Ionicons: 'Icon',
      getFinalPrice: pricing.getFinalPrice,
    }).component;
  }
  const props = { isLoggedIn: true, product: { id: 'A', name: 'A', price: 10, discountedPrice: 8, discount: 20 }, index: 0 };
  const offer = flatten(components.TopSellingProductRow(props));
  assert.ok(offer.includes('$10.00') && offer.includes('$8.00') && offer.includes('20% OFF'));
  for (const discount of [0, undefined]) {
    const normal = flatten(components.TopSellingProductRow({ ...props, product: { ...props.product, discount, discountedPrice: 10 } }));
    assert.ok(normal.includes('$10.00')); assert.ok(!normal.includes('OFF')); assert.ok(!normal.includes('$8.00'));
  }
  assert.ok(flatten(components.RecentProduct(props)).includes('$8.00'));
});

test('back buttons and Android GO_BACK retain original Home key without adding a Loading route', () => {
  const { StackRouter } = require('expo-router/build/react-navigation/routers/StackRouter');
  for (const destination of ['favorites', 'cart', 'settings', 'account']) {
    const options = { routeNames: ['index', 'loading', 'search', destination], routeParamList: {}, routeGetIdList: {} };
    const stack = StackRouter({ initialRouteName: 'index' });
    let state = stack.getInitialState(options); const homeKey = state.routes[0].key;
    state = stack.getStateForAction(state, { type: 'PUSH', payload: { name: destination } }, options);
    const router = { canGoBack: () => state.index > 0, back: () => { state = stack.getStateForAction(state, { type: 'GO_BACK' }, options); }, replace: () => assert.fail('remounted Home') };
    execute(source('services/navigation.ts'), { require: () => ({ router }) }).goBackOrHome();
    assert.equal(state.routes[0].key, homeKey);
    assert.deepEqual(state.routes.map(route => route.name), ['index']);
    assert.match(source('app/' + destination + '.tsx'), /goBackOrHome/);
  }
});

test('deep-link back uses Home fallback; Account removes only its Settings entry', () => {
  let destination;
  const router = { canGoBack: () => false, replace: value => { destination = value; } };
  execute(source('services/navigation.ts'), { require: () => ({ router }) }).goBackOrHome();
  assert.equal(destination, '/');
  assert.doesNotMatch(source('app/account.tsx'), /router.push\('\/settings'\)/);
  assert.match(source('app/index.tsx'), /'\/settings'/);
});

test('shared pricing preserves rounding, backend overrides and Recently Added offer values', () => {
  const { getFinalPrice } = execute(source('services/product-price.ts'));
  assert.equal(getFinalPrice({ price: 10 }), 10);
  assert.equal(getFinalPrice({ price: 10, discount: 0 }), 10);
  assert.equal(getFinalPrice({ price: 10, discount: 20, discountedPrice: 8 }), 8);
  assert.equal(getFinalPrice({ price: 9.99, discount: 15, discountedPrice: 8.49 }), 8.49);
  assert.equal(getFinalPrice({ price: 10, discount: 20, discountedPrice: 7.25 }), 7.25);
  for (const file of ['index.tsx', 'search.tsx', 'favorites.tsx', 'category-products.tsx', 'department-categories.tsx']) assert.match(source('app/' + file), /import \{ getFinalPrice \} from '..\/services\/product-price'/);
});


test('shared native carousel wraps once, resets autoplay, pauses on touch/background and cleans up', () => {
  const env = hooks(), timers = new Map(), scrolls = []; let next = 0, current = 0, appChange;
  env.react.useLayoutEffect = env.react.useEffect;
  const { useOfferCarousel } = execute(source('hooks/useOfferCarousel.ts'), {
    setTimeout: (fn, delay) => { const id = ++next; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    require: name => name === 'react' ? env.react : name === 'expo-router'
      ? { useFocusEffect: fn => env.react.useEffect(fn, [fn]) }
      : { AppState: { currentState: 'active', addEventListener: (_, fn) => { appChange = fn; return { remove() {} }; } } },
  });
  const change = value => { current = value; };
  const render = () => env.render(() => useOfferCarousel(3, 320, change));
  let carousel = render(); carousel.scrollRef.current = { scrollTo: args => scrolls.push(args) };
  const countAuto = () => [...timers.values()].filter(t => t.delay === 3500).length;
  const scroll = x => carousel.handlers.onScroll({ nativeEvent: { contentOffset: { x } } });
  const swipe = x => {
    carousel.handlers.onTouchStart(); carousel.handlers.onScrollBeginDrag();
    assert.equal(countAuto(), 0); scroll(x);
    carousel.handlers.onTouchEnd(); carousel.handlers.onScrollEndDrag();
    carousel.handlers.onMomentumScrollEnd(); carousel.handlers.onMomentumScrollEnd();
    carousel = render();
  };
  assert.equal(countAuto(), 1);
  swipe(640); assert.equal(current, 1); assert.equal(countAuto(), 1);
  swipe(640); assert.equal(current, 2);
  swipe(640); assert.equal(current, 0);
  swipe(0); assert.equal(current, 2);
  swipe(320); assert.equal(current, 2, 'small drag snapped back does not change index');
  carousel.handlers.onTouchStart(); assert.equal(countAuto(), 0);
  carousel.handlers.onTouchEnd(); assert.equal(countAuto(), 1);
  const autoEntry = [...timers].find(([, t]) => t.delay === 3500);
  timers.delete(autoEntry[0]); autoEntry[1].fn();
  assert.deepEqual(JSON.parse(JSON.stringify(scrolls.at(-1))), { x: 640, animated: true });
  scroll(510); carousel.handlers.onTouchStart(); carousel.handlers.onTouchEnd();
  assert.equal(scrolls.at(-1).x, 640, 'tap interrupting autoplay settles instead of stranding the timer');
  scroll(640); carousel.handlers.onMomentumScrollEnd(); carousel = render();
  assert.equal(current, 0); assert.equal(countAuto(), 1);
  appChange('background'); assert.equal(timers.size, 0);
  appChange('active'); assert.equal(countAuto(), 1);
  env.unmount(); assert.equal(timers.size, 0);
});

test('single-item carousel never starts autoplay', () => {
  const env = hooks(); env.react.useLayoutEffect = env.react.useEffect;
  const { useOfferCarousel } = execute(source('hooks/useOfferCarousel.ts'), {
    setTimeout: () => assert.fail('single item must not auto-advance'), clearTimeout() {},
    require: name => name === 'react' ? env.react : name === 'expo-router'
      ? { useFocusEffect: fn => env.react.useEffect(fn, [fn]) }
      : { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
  });
  env.render(() => useOfferCarousel(1, 320, () => {})); env.unmount();
});

test('shared feedback replaces rapid messages, announces them, auto-dismisses, closes early and clears timers on unmount', () => {
  const env = hooks(), timers = new Map(), announcements = []; let next = 0;
  const jsx = (type, props) => ({ type, props });
  class Value { setValue() {} stopAnimation() {} }
  const animation = { start: callback => callback?.({ finished: true }) };
  const { useProductFeedback } = execute(source('components/product-feedback.tsx'), {
    setTimeout: (fn, delay) => { assert.equal(delay, 2200); timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id),
    require: name => name === 'react' ? env.react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
      : name === 'react-native-safe-area-context' ? { useSafeAreaInsets: () => ({ top: 30 }) }
      : name === '@expo/vector-icons' ? { Ionicons: 'Icon' }
      : { Animated: { Value, View: 'Animated', parallel: () => animation, timing: () => animation, spring: () => animation },
          AccessibilityInfo: { announceForAccessibility: value => announcements.push(value) }, Pressable: 'Pressable', View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
  });
  let hook = env.render(useProductFeedback);
  assert.equal(hook.feedback, null);
  hook.showAlert('First'); hook.showAlert('Second', 'Added to Favorites');
  assert.equal(timers.size, 1); assert.equal(announcements.length, 2);
  hook = env.render(useProductFeedback);
  assert.equal(hook.feedback.props.style[1].top, 42);
  assert.ok(JSON.stringify(hook.feedback).includes('Second'));
  assert.ok(!JSON.stringify(hook.feedback).includes('First'));
  const [id, callback] = [...timers][0]; timers.delete(id); callback();
  assert.equal(env.render(useProductFeedback).feedback, null);
  hook.showAlert('Dismiss'); hook = env.render(useProductFeedback);
  const close = hook.feedback.props.children.find(child => child.type === 'Pressable'); close.props.onPress();
  assert.equal(env.render(useProductFeedback).feedback, null); assert.equal(timers.size, 0);
  hook.showAlert('Unmount'); env.unmount(); assert.equal(timers.size, 0);
});

test('framed image uses the same normalized square crop in wide, tall and square customer slots', () => {
  const geometry = execute(source('services/image-frame.ts'));
  for (const dimensions of [[1200, 400], [400, 1200], [600, 600]]) {
    for (const frame of [{ zoom: 1, x: 0, y: 0 }, { zoom: 2.5, x: -1, y: 1 }, { zoom: 4, x: 1, y: -1 }]) {
      const expected = geometry.frameGeometry(...dimensions, 1, 1, frame);
      for (const [width, height] of [[160, 90], [90, 160], [120, 120]]) {
        const side = Math.min(width, height);
        const actual = geometry.frameGeometry(...dimensions, side, side, frame);
        for (const key of ['width', 'height', 'left', 'top']) assert.ok(Math.abs(actual[key] / side - expected[key]) < 1e-9);
      }
    }
  }
  assert.match(source('components/product-image.tsx'), /Math.min\(box.width, box.height\)/);
  assert.match(source('app/product-details.tsx'), /presentation="original"/);
});
