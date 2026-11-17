// DEMO class (screen recording): every amount renders as X$, cart stays usable, orders stop.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { createShoppingState, flush } = require('./shopping-fixture.cjs');
const source = file => fs.readFileSync('src/' + file, 'utf8');
const transpile = code => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
function module(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(transpile(source(file)), { exports, require: name => { if (!(name in dependencies)) throw Error('Unexpected dependency: ' + name); return dependencies[name]; } });
  return exports;
}
function constant(file, name, context) {
  const ast = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let code;
  (function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name && !code) code = node.initializer.getText(ast); ts.forEachChild(node, walk); })(ast);
  assert.ok(code, `${file}:${name}`);
  const exports = {};
  vm.runInNewContext(transpile('exports.fn = ' + code), { exports, __DEV__: false, ...context });
  return exports.fn;
}
// Real (pure) maximum-quantity-per-order helpers for extracted screen code.
const quantityLimit = (() => { const exports = {}; vm.runInNewContext(ts.transpileModule(source('services/quantity-limit.ts'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports }); return exports; })();
function component(file, name, context) {
  const ast = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const slots = []; let cursor = 0;
  const useState = initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], () => {}]; };
  const exports = {};
  vm.runInNewContext(transpile(fn.getText(ast) + '\nexports.fn = ' + name), { exports, React: { createElement: element }, useState, useEffect: () => {}, useCallback: fn => fn,
    useRef: value => { const i = cursor++; return slots[i] ||= { current: value }; }, ...quantityLimit, ...context });
  return props => { cursor = 0; return exports.fn(props); };
}
const nodes = (tree, predicate) => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(child => nodes(child, predicate))
  : [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
const realAmount = /\$\s*\d|\$\$?\{|\d+\.\d{2}/;

test('isDemoMode reads only the backend-issued profile flag of the current session', () => {
  let user = null;
  const demo = module('services/demo-mode.ts', { './tokenStorage': { peekSessionUser: () => user, getSessionSnapshot: () => ({ authenticated: true }) }, './authService': { fetchCurrentUser: async () => {} } });
  assert.equal(demo.DEMO_PRICE, 'X$');
  assert.equal(demo.DEMO_ORDER_MESSAGE, 'Demo Mode — Orders cannot be placed.');
  for (const value of [null, {}, { demoMode: 'true' }, { demoMode: 1 }, { demoMode: false }]) { user = value; assert.equal(demo.isDemoMode(), false); }
  user = { demoMode: true }; assert.equal(demo.isDemoMode(), true);
});

test('DEMO cart responses without prices are accepted; regular carts keep strict price validation', () => {
  const { currentCartPrices } = module('services/cartPricing.ts');
  const items = [{ product: { _id: 'A', name: 'A' }, quantity: 2 }];
  assert.deepEqual(JSON.parse(JSON.stringify(currentCartPrices(items, true))), [{ product: { _id: 'A', name: 'A' }, quantity: 2, price: 0 }]);
  assert.throws(() => currentCartPrices(items), /invalid price/);
  assert.throws(() => currentCartPrices([{ product: { _id: 'A' }, quantity: 0 }], true), /invalid quantity/);
  assert.throws(() => currentCartPrices([{ product: null, quantity: 1 }], true), /no longer available/);
});

test('DEMO account can add, increase, decrease and remove cart items', async () => {
  let cart = [];
  const reply = () => ({ cart: { items: cart }, demoMode: true });
  const state = createShoppingState({ authenticated: () => true, send: async (url, method, body) => {
    if (url === '/cart/add') cart = cart.some(i => i.product._id === body.productId) ? cart.map(i => i.product._id === body.productId ? { ...i, quantity: i.quantity + body.quantity } : i)
      : [...cart, { product: { _id: body.productId, name: body.productId }, quantity: body.quantity }];
    else if (url === '/cart/update') cart = cart.map(i => i.product._id === body.productId ? { ...i, quantity: body.quantity } : i);
    else if (url === '/cart/remove') cart = cart.filter(i => i.product._id !== body.productId);
    return url === '/favorites' ? { favorites: [], demoMode: true } : reply();
  } });
  await state.refresh();
  const product = { _id: 'A', name: 'Almonds', availability: true };
  await state.add(product); await flush();
  assert.equal(state.getSnapshot().cart[0].quantity, 1);
  await state.adjust(product, 1); await flush();
  assert.equal(state.getSnapshot().cart[0].quantity, 2);
  await state.adjust(product, -1); await flush();
  assert.equal(state.getSnapshot().cart[0].quantity, 1);
  await state.remove('A'); await flush();
  assert.equal(state.getSnapshot().cart.length, 0);
  assert.equal(state.getSnapshot().cartError, null);
});

test('every product screen price formatter shows X$ for DEMO and unchanged amounts otherwise', () => {
  for (const file of ['app/category-products.tsx', 'app/department-categories.tsx', 'app/favorites.tsx', 'app/product-details.tsx']) {
    assert.equal(constant(file, 'formatPrice', { isDemoMode: () => true, DEMO_PRICE: 'X$' })(12.5), 'X$', file);
    assert.equal(constant(file, 'formatPrice', { isDemoMode: () => false, DEMO_PRICE: 'X$' })(12.5), '$12.50', file);
  }
});

test('home and search inline prices are all routed through the DEMO placeholder', () => {
  // Every rendered "$…toFixed(2)" in these screens must sit behind an isDemoMode() branch.
  for (const file of ['app/index.tsx', 'app/search.tsx']) {
    const lines = source(file).split('\n');
    lines.forEach((line, i) => {
      if (!/toFixed\(2\)/.test(line)) return;
      const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
      assert.match(window, /isDemoMode\(\) \? DEMO_PRICE/, `${file}:${i + 1} renders an amount without the DEMO branch`);
    });
  }
});

test('DEMO add-to-cart is not blocked by missing prices; regular unpriced products still wait', () => {
  for (const [file, name, extra] of [['app/search.tsx', 'changeProduct', {}], ['app/category-products.tsx', 'addToCart', {}], ['app/index.tsx', 'addToCart', {}]]) {
    for (const demo of [true, false]) {
      const calls = [];
      const shopping = { add: value => { calls.push('add'); return Promise.resolve(value); }, toggle() {}, showAlert: message => calls.push(message) };
      const fn = constant(file, name, { isDemoMode: () => demo, getSessionSnapshot: () => ({ authenticated: true }), shopping, showAlert: message => calls.push(message),
        productFresh: { current: true }, Promise, ...extra });
      try { fn({ _id: 'A', name: 'A' }, 'cart'); } catch { /* handlers needing more screen state are covered by the guard check below */ }
      if (demo) assert.ok(!calls.includes('Please wait for current product prices to load.'), `${file} DEMO blocked`);
    }
    assert.match(source(file), /product\.price === undefined && !isDemoMode\(\)/, file);
  }
});

test('Cart shows X$ for every amount, no minimum/delivery amounts, and keeps Checkout enabled for DEMO', () => {
  const summary = module('services/delivery-pricing.ts').deliverySummary;
  const shopping = { cart: [{ product: { _id: 'A', name: 'Almonds', availability: true, discount: 10 }, quantity: 3, price: 0 }], ready: true, busy: false, minimum: Infinity, deliveryRules: undefined,
    pendingCart: new Set() };
  const render = component('app/cart.tsx', 'Cart', { isDemoMode: () => true, DEMO_PRICE: 'X$', getSessionSnapshot: () => ({ authenticated: true }), useShopping: () => shopping,
    useActionDialog: () => ({ dialog: null }), deliverySummary: summary, cartTotal: items => items.reduce((sum, item) => sum + item.price * item.quantity, 0), useFocusEffect: () => {},
    styles: {}, getImageUrl: () => null, View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', ProductImage: 'ProductImage', Ionicons: 'Icon',
    router: {}, goBackOrHome: () => {}, Keyboard: { addListener: () => ({ remove() {} }) }, MINIMUM_ORDER: 100 });
  const tree = render();
  const texts = nodes(tree, node => node.type === 'Text').map(node => JSON.stringify(node.props.children)).join(' ');
  assert.ok(texts.includes('X$'), texts);
  assert.doesNotMatch(texts, realAmount, texts);
  assert.doesNotMatch(texts, /Infinity|NaN/);
  const checkout = nodes(tree, node => node.type === 'Pressable' && nodes(node, child => child.type === 'Text' && JSON.stringify(child.props.children).includes('Checkout')).length).at(-1);
  assert.equal(checkout.props.disabled, false);
});

test('Checkout place-order shows the Demo Mode message and sends no request for DEMO', async () => {
  const alerts = []; let requests = 0;
  const placeOrder = constant('app/checkout.tsx', 'placeOrder', { isDemoMode: () => true, DEMO_ORDER_MESSAGE: 'Demo Mode — Orders cannot be placed.',
    actionAlert: (...args) => alerts.push(args), fetch: () => { requests++; }, request: () => { requests++; }, getValidAccessToken: () => { requests++; } });
  await placeOrder();
  assert.deepEqual(alerts, [['Demo Mode', 'Demo Mode — Orders cannot be placed.']]);
  assert.equal(requests, 0);
  const money = source('app/checkout.tsx');
  assert.match(money, /const money = \(amount: number\) => demo \? DEMO_PRICE : `\$\$\{amount\.toFixed\(2\)\}`;/);
  assert.match(money, /setCart\(currentCartPrices\(items, data\.demoMode === true\)\)/);
});

// Admin switches DEMO on/off from the panel: the app must notice on its next priced response.
function syncFixture({ authenticated = true, demo = false } = {}) {
  let profile = { demoMode: demo }, refreshes = 0, now = 1000000;
  const exports = {};
  vm.runInNewContext(transpile(source('services/demo-mode.ts')), { exports, Date: { now: () => now },
    require: name => name === './tokenStorage' ? { peekSessionUser: () => profile, getSessionSnapshot: () => ({ authenticated }) }
      : { fetchCurrentUser: async () => { refreshes++; } } });
  return { sync: exports.syncDemoMode, refreshes: () => refreshes, advance: ms => { now += ms; } };
}
test('profile resync runs only when the server and cached DEMO state disagree, once per cooldown', async () => {
  let f = syncFixture({ demo: false });
  f.sync({ products: [] }); f.sync({ cart: null }); f.sync(null); f.sync('x');
  assert.equal(f.refreshes(), 0, 'regular customer, regular responses: no refresh');
  f.sync({ products: [], demoMode: true }); await flush();
  assert.equal(f.refreshes(), 1, 'admin assigned DEMO: refresh profile');
  f.sync({ demoMode: true }); await flush();
  assert.equal(f.refreshes(), 1, 'cooldown prevents request storms');
  f.advance(16000); f.sync({ demoMode: true }); await flush();
  assert.equal(f.refreshes(), 2);
  f = syncFixture({ demo: true });
  f.sync({ demoMode: true }); assert.equal(f.refreshes(), 0);
  f.sync({ products: [{ price: 10 }] }); await flush();
  assert.equal(f.refreshes(), 1, 'admin removed DEMO: refresh profile');
  f = syncFixture({ authenticated: false, demo: false });
  f.sync({ demoMode: true }); assert.equal(f.refreshes(), 0, 'guests never trigger profile reads');
});
test('saving a profile whose DEMO state changed reloads prices, including profiles cached without a pricing scope', async () => {
  const store = new Map(), listeners = [];
  const exports = {};
  vm.runInNewContext(transpile(source('services/tokenStorage.ts')), { exports, JSON, Promise, Set, Error, String, Array,
    require: name => name === '@react-native-async-storage/async-storage' ? { getItem: async k => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, multiRemove: async keys => keys.forEach(k => store.delete(k)) }
      : name === 'expo-secure-store' ? { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, getItemAsync: async k => store.get('secure:' + k) ?? null, setItemAsync: async (k, v) => { store.set('secure:' + k, v); } }
      : { Platform: { OS: 'android' } } });
  exports.onPricingChanged(() => listeners.push('reload'));
  await exports.updateTokens({ accessToken: 'access', refreshToken: 'refresh' }, { id: 'u', firstName: 'Login response, no scope' });
  await exports.saveSessionUser('access', { id: 'u', notificationsEnabled: true });
  assert.equal(listeners.length, 0, 'unchanged regular profile');
  await exports.saveSessionUser('access', { id: 'u', demoMode: true, pricingScope: 'demo-scope' });
  assert.equal(listeners.length, 1, 'DEMO assigned');
  await exports.saveSessionUser('access', { id: 'u', demoMode: true, pricingScope: 'demo-scope' });
  assert.equal(listeners.length, 1, 'still DEMO');
  await exports.saveSessionUser('access', { id: 'u', address: 'Edited (partial profile-edit response)' });
  assert.equal(listeners.length, 1, 'partial profile keeps DEMO');
  assert.equal(JSON.parse(store.get('user')).demoMode, true);
  await exports.saveSessionUser('access', { id: 'u', pricingScope: 'class-b' });
  assert.equal(listeners.length, 2, 'DEMO removed');
});
