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
    setProductFavorite: id => id === 'A' ? a.promise : b.promise, showAlert: (...args) => alerts.push(args),
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
      require: () => ({ jsx, jsxs: jsx }), useRef: initial => ({ current: initial }), useEffect: () => {},
      Animated: { Value: class { interpolate() { return 0; } } }, styles: {}, View: 'View', Text: 'Text', Pressable: 'Pressable', ProductImage: 'ProductImage', Ionicons: 'Icon',
      getFinalPrice: pricing.getFinalPrice,
    }).component;
  }
  const props = { isLoggedIn: true, product: { id: 'A', name: 'A', price: 10, discount: 20 }, index: 0 };
  const offer = flatten(components.TopSellingProductRow(props));
  assert.ok(offer.includes('$10.00') && offer.includes('$8.00') && offer.includes('20% OFF'));
  for (const discount of [0, undefined]) {
    const normal = flatten(components.TopSellingProductRow({ ...props, product: { ...props.product, discount } }));
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
  assert.equal(getFinalPrice({ price: 10, discount: 20 }), 8);
  assert.equal(getFinalPrice({ price: 9.99, discount: 15 }), 8.49);
  assert.equal(getFinalPrice({ price: 10, discount: 20, discountedPrice: 7.25 }), 7.25);
  for (const file of ['index.tsx', 'search.tsx', 'favorites.tsx', 'category-products.tsx', 'department-categories.tsx']) assert.match(source('app/' + file), /import \{ getFinalPrice \} from '..\/services\/product-price'/);
});

test('Offers supports drag both ways, resets one auto timer, wraps index and cleans up on blur', () => {
  const env = hooks(), timers = new Map(); let nextTimer = 0, index = 0;
  const Animated = {
    Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } stopAnimation() {} },
    timing: (value, config) => ({ start: fn => { value.setValue(config.toValue); fn?.({ finished: true }); } }),
    spring: (value, config) => ({ start: fn => { value.setValue(config.toValue); fn?.({ finished: true }); } }),
    parallel: animations => ({ start: fn => { animations.forEach(animation => animation.start()); fn?.({ finished: true }); } }),
  };
  const { useOfferCarousel } = execute(source('hooks/useOfferCarousel.ts'), {
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
    require: name => name === 'react' ? env.react : name === 'expo-router' ? { useFocusEffect: fn => env.react.useEffect(fn, [fn]) } : { Animated, PanResponder: { create: panHandlers => ({ panHandlers }) } },
  });
  const setIndex = update => { index = update(index); };
  const render = () => env.render(() => useOfferCarousel(3, index, setIndex));
  render(); let carousel = render();
  assert.equal(timers.size, 1);
  assert.equal(carousel.panHandlers.onMoveShouldSetPanResponder(null, { dx: 2, dy: 40 }), false);
  assert.equal(carousel.panHandlers.onMoveShouldSetPanResponder(null, { dx: -60, dy: 2 }), true);
  carousel.panHandlers.onPanResponderGrant(); assert.equal(timers.size, 0);
  carousel.panHandlers.onPanResponderMove(null, { dx: -60 }); assert.equal(carousel.translate.value, -30);
  carousel.panHandlers.onPanResponderRelease(null, { dx: -60, vx: 0 });
  assert.equal(index, 1); carousel = render(); assert.equal(timers.size, 1);
  const tick = [...timers.values()][0]; timers.clear(); tick();
  assert.equal(index, 2); carousel = render(); assert.equal(timers.size, 1);
  carousel.panHandlers.onPanResponderGrant(); carousel.panHandlers.onPanResponderRelease(null, { dx: -60, vx: 0 });
  assert.equal(index, 0); carousel = render();
  carousel.panHandlers.onPanResponderGrant(); carousel.panHandlers.onPanResponderRelease(null, { dx: 60, vx: 0 });
  assert.equal(index, 2); render(); assert.equal(timers.size, 1);
  env.unmount(); assert.equal(timers.size, 0);
});
