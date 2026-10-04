const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = file => fs.readFileSync('src/' + file, 'utf8');
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
function fixture(file, name, context = {}) {
  const text = source(file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, name);
  const slots = []; let cursor = 0;
  const useState = initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fn.getText(ast) + '\nexports.fn = ' + name, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText,
    { exports, React: { createElement: element }, useState, useCallback: fn => fn, useRef: value => { const i = cursor++; return slots[i] ||= { current: value }; }, ...context });
  return props => { cursor = 0; return exports.fn(props); };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

function handler(file, name, context) {
  const ast = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let code;
  function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) code = node.initializer.getText(ast); ts.forEachChild(node, walk); }
  walk(ast); assert.ok(code, name);
  const exports = {};
  vm.runInNewContext(ts.transpileModule('exports.fn = ' + code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { exports, __DEV__: false, ...context });
  return exports.fn;
}

test('Orders failure uses themed feedback and settles loading without changing its request', async () => {
  let message, loading; const requests = [];
  const load = handler('app/orders.tsx', 'loadOrders', { loading: false, setLoading: value => { loading = value; }, setOrders: () => {}, getValidAccessToken: async () => 'fixture', API_URL: 'https://fixture.test',
    request: async (url, init) => { requests.push({ url, init }); return { ok: false, status: 503, json: async () => ({ message: 'Try again later' }) }; }, actionAlert: (...args) => { message = args; } });
  await load(); assert.equal(loading, false); assert.equal(requests[0].url, 'https://fixture.test/orders'); assert.equal(requests[0].init.method, 'GET');
  assert.deepEqual(Array.from(message), ['Orders unavailable', 'Try again later']);
});

test('Edit Account success navigates only after acknowledgment; verification cancel retains the old phone and needs confirmation', async () => {
  let notice, back = 0, phone, verifying; const calls = [];
  const context = { name: 'Maya Haddad', email: '', address: 'New address', phone: '71000000', originalPhone: '71000000', saving: false, verifyingPhone: false,
    getValidAccessToken: async () => 'fixture', setSaving: () => {}, setPhone: value => { phone = value; }, router: { back: () => back++ }, actionAlert: (...args) => { notice = args; },
    saveProfileInformation: async (...args) => { calls.push(args); return { response: { ok: true, status: 200 }, data: {} }; } };
  await handler('app/edit-account.tsx', 'saveChanges', context)();
  assert.equal(back, 0); assert.deepEqual(Array.from(calls[0]), ['fixture', 'Maya', 'Haddad', '', 'New address']);
  assert.equal(notice[0], 'Success'); notice[2][0].onPress(); assert.equal(back, 1);
  handler('app/edit-account.tsx', 'cancelPhoneVerification', { ...context, setPhoneVerification: value => { verifying = value; }, setOtp: () => {}, setPendingPhone: () => {} })();
  assert.equal(verifying, undefined); assert.equal(notice[2][0].style, 'cancel'); assert.equal(notice[2][0].onPress, undefined);
  notice[2][1].onPress(); assert.equal(verifying, false); assert.equal(phone, '71000000');
});

test('one lightweight shine pauses on background/reduced motion, restarts on foreground and removes listeners on unmount', async () => {
  const slots = []; let cursor = 0, effects = [], starts = 0, stops = 0, removed = 0; const listeners = {}, timings = [];
  const changed = (old, deps) => !old || !deps || deps.some((value, i) => value !== old[i]);
  const react = { createElement: element,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useCallback: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useEffect: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } };
  class Value { setValue() {} interpolate() { return 0; } }
  const subscribe = (name, callback) => { listeners[name] = callback; return { remove: () => { removed++; } }; };
  const native = { Animated: { Value, View: 'Animated', delay: delay => { assert.equal(delay, 3500); }, timing: (_value, config) => { timings.push(config); }, sequence: () => {}, loop: () => ({ start: () => starts++, stop: () => stops++ }) },
    View: 'View', StyleSheet: { create: styles => styles }, AppState: { currentState: 'active', addEventListener: subscribe },
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: subscribe } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source('components/offer-shine.tsx'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText,
    { exports, React: react, require: name => name === 'react' ? react : name === 'react-native' ? native : { useFocusEffect: fn => react.useEffect(fn, [fn]) } });
  const render = () => { cursor = 0; const tree = exports.OfferShine(); effects.splice(0).forEach(run => run()); return tree; };
  render(); await Promise.resolve(); render().props.onLayout({ nativeEvent: { layout: { width: 320 } } }); render(); assert.equal(starts, 1);
  assert.ok(timings.every(config => config.useNativeDriver)); assert.equal(timings[0].duration, 1800);
  listeners.change('background'); render(); assert.equal(stops, 1);
  listeners.change('active'); render(); assert.equal(starts, 2);
  listeners.reduceMotionChanged(true); render(); assert.equal(stops, 2);
  slots.forEach(slot => slot?.cleanup?.()); assert.equal(removed, 2);
});

test('shared plus stays plus and normal immediately while pending; pressed orange, duplicate handler suppressed, stock guard preserved', () => {
  const render = fixture('components/add-to-cart-button.tsx', 'AddToCartButton', { Pressable: 'Pressable', Ionicons: 'Icon', styles: { button: { backgroundColor: '#171717' }, active: { backgroundColor: '#E35B3F' }, disabled: { backgroundColor: '#B8B2A9' }, compact: {} } });
  let calls = 0; const props = { name: 'A', pending: true, unavailable: false, onPress: () => calls++ };
  const button = render(props);
  assert.equal(button.props.disabled, false); assert.equal(button.props.children[0].props.name, 'add');
  assert.equal(button.props.style({ pressed: false }).filter(Boolean).at(-1).backgroundColor, '#171717');
  assert.equal(button.props.style({ pressed: true }).filter(Boolean).at(-1).backgroundColor, '#E35B3F');
  button.props.onPress({ stopPropagation() {} }); assert.equal(calls, 0);
  render({ ...props, pending: false }).props.onPress({ stopPropagation() {} }); assert.equal(calls, 1);
  assert.equal(render({ ...props, unavailable: true }).props.disabled, true);
});

test('checkout passes framing, caches the image, resolves relative URLs, and handles absent/broken images without touching prices', () => {
  const render = fixture('app/checkout.tsx', 'CheckoutProductImage', { View: 'View', ProductImage: 'ProductImage', Ionicons: 'Icon', API_URL: 'https://fixture.test', styles: { itemIcon: {} } });
  const frame = { zoom: 1.4, x: .2, y: -.3 }, product = { _id: 'A', image: '/uploads/a.png', imageFrame: frame, discountedPrice: 8 };
  const image = nodes(render({ product }), node => node.type === 'ProductImage')[0];
  assert.equal(image.props.imageFrame, frame); assert.equal(image.props.source.uri, 'https://fixture.test/uploads/a.png'); assert.equal(image.props.cachePolicy, 'memory-disk');
  image.props.onError(); assert.equal(nodes(render({ product }), node => node.type === 'Icon').length, 1);
  assert.equal(nodes(render({ product: { _id: 'B' } }), node => node.type === 'Icon').length, 1);
  assert.equal(product.discountedPrice, 8);
  assert.match(source('app/checkout.tsx'), /<CheckoutProductImage key=\{item.product.image\} product=\{item.product\}/);
});

test('themed clear dialog cancels safely and invokes a destructive callback once only', () => {
  const render = fixture('components/action-dialog.tsx', 'useActionDialog', { Modal: 'Modal', View: 'View', Text: 'Text', Pressable: 'Pressable', Ionicons: 'Icon', styles: {} });
  let count = 0; const actions = [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear Cart', style: 'destructive', onPress: () => count++ }];
  render().alert('Clear Cart?', 'Remove products?', actions);
  let dialog = render().dialog; assert.equal(dialog.props.visible, true);
  dialog.props.onRequestClose(); assert.equal(count, 0); assert.equal(render().dialog.props.visible, false);
  render().alert('Clear Cart?', 'Remove products?', actions); dialog = render().dialog;
  const clear = nodes(dialog, node => node.type === 'Pressable')[1]; clear.props.onPress(); clear.props.onPress();
  assert.equal(count, 1); assert.equal(render().dialog.props.visible, false);
  render().alert('Another action', 'Replacement message');
  clear.props.onPress(); assert.equal(count, 1); assert.equal(render().dialog.props.visible, true);
  nodes(render().dialog, node => node.type === 'Pressable')[0].props.onPress(); assert.equal(render().dialog.props.visible, false);
  for (const screen of ['cart', 'favorites', 'orders', 'edit-account']) {
    assert.match(source('app/' + screen + '.tsx'), /useActionDialog/);
    assert.doesNotMatch(source('app/' + screen + '.tsx'), /Alert.alert\(/);
  }
});

test('Recently Added retains price and navigation without a cart action; detail button is pressed-only black/orange', () => {
  const text = source('app/index.tsx'), ast = ts.createSourceFile('index.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const recent = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'RecentProduct').getText(ast);
  assert.doesNotMatch(recent, /AddToCartButton|onAddToCart|pending/);
  assert.match(recent, /onPress=\{onPress\}/); assert.match(recent, /getFinalPrice\(product\)/); assert.match(recent, /imageFrame=\{product.imageFrame\}/);
  const details = source('app/product-details.tsx');
  assert.match(details, /styles.cartButton, pressed && \{ backgroundColor: '#E35B3F' \}/);
  assert.match(details, /cartButton: \{[\s\S]*?backgroundColor:\s*'#171717'/);
  assert.doesNotMatch(details, /addingToCart/);
});

test('Offers scrolling measures the section wrapper in ScrollView coordinates after section grouping', () => {
  const text = source('app/index.tsx'), ast = ts.createSourceFile('index.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let layout;
  function walk(node) {
    if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(prop => prop.name?.getText(ast) === 'testID' && prop.initializer?.text === 'home-offers')) {
      layout = node.attributes.properties.find(prop => prop.name?.getText(ast) === 'onLayout')?.initializer?.expression?.getText(ast);
    }
    ts.forEachChild(node, walk);
  }
  walk(ast); assert.ok(layout);
  const exports = {}, offersSectionY = { current: 0 };
  vm.runInNewContext(ts.transpileModule('exports.layout=' + layout, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { exports, offersSectionY });
  exports.layout({ nativeEvent: { layout: { y: 1200 } } }); assert.equal(offersSectionY.current, 1200);
});
