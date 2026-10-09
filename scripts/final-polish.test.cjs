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
  const render = fixture('components/action-dialog.tsx', 'useActionDialog', { Modal: 'Modal', ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable', Ionicons: 'Icon', styles: {} });
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

test('symbol-free confirmations preserve Cancel, Back and once-only destructive actions; success Back acknowledges once', () => {
  const context = { Modal: 'Modal', ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable', Ionicons: 'Icon', styles: {} };
  const render = fixture('components/action-dialog.tsx', 'useActionDialog', context);
  let confirmed = 0;
  const options = { showIcon: false };
  for (const title of ['Clear Cart?', 'Clear Favorites?', 'Log Out']) {
    render(options).alert(title, 'Confirm?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: () => confirmed++ }]);
    let dialog = render(options).dialog;
    assert.equal(nodes(dialog, node => node.type === 'Icon').length, 0);
    dialog.props.onRequestClose(); assert.equal(confirmed, 0);
    render(options).alert(title, 'Confirm?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: () => confirmed++ }]);
    dialog = render(options).dialog; nodes(dialog, node => node.type === 'Pressable')[0].props.onPress(); assert.equal(confirmed, 0);
  }
  const success = { showIcon: false, acknowledgeOnDismiss: true };
  render(success).alert('Order Placed', 'Your order has been placed successfully.', [{ text: 'OK', onPress: () => confirmed++ }]);
  const dialog = render(success).dialog; dialog.props.onRequestClose(); dialog.props.onRequestClose();
  assert.equal(confirmed, 1); assert.equal(nodes(dialog, node => node.type === 'Icon').length, 0);
});

test('Account Logout opens a confirmation without auth changes; the existing guarded logout runs only after confirmation', async () => {
  let authenticated = true, calls = 0, notice, finish;
  const logoutInProgress = { current: false };
  const logout = handler('app/account.tsx', 'logout', { logoutInProgress, authLogout: async () => { calls++; await new Promise(resolve => { finish = resolve; }); authenticated = false; }, setUser: () => {}, Alert: { alert: () => assert.fail('Unexpected error') } });
  const request = handler('app/account.tsx', 'requestLogout', { logoutInProgress, logout, actionAlert: (...args) => { notice = args; } });
  request(); assert.equal(authenticated, true); assert.equal(calls, 0);
  assert.equal(notice[2][0].style, 'cancel'); assert.equal(notice[2][0].onPress, undefined);
  request(); notice[2][1].onPress(); notice[2][1].onPress(); assert.equal(calls, 1);
  assert.equal(authenticated, true); finish(); await new Promise(resolve => setImmediate(resolve)); assert.equal(authenticated, false);
  assert.match(source('app/account.tsx'), /onPress=\{requestLogout\}/);
});

test('successful checkout keeps one request/payload/cleanup and routes to Orders only through themed acknowledgment', async () => {
  const cart = [{ product: { _id: '507f1f77bcf86cd799439011' }, quantity: 2, price: 8 }];
  let notice, finish, cleaned, cleared; const requests = [], routes = [], orderInFlight = { current: false };
  const place = handler('app/checkout.tsx', 'placeOrder', { cart, user: { _id: 'customer', phone: '71000000', address: ' Beirut ' }, displayName: 'Maya', placingOrder: false, orderInFlight, cartRevision: 'revision', API_URL: 'https://fixture.test',
    delivery: { allowed: true, total: 16 },
    setPlacingOrder: () => {}, getAccessToken: async () => 'fixture', getCheckoutAttempt: async () => ({ key: 'same-attempt', storageKey: 'attempt-key' }),
    request: async (url, init) => { requests.push({ url, init }); await new Promise(resolve => { finish = resolve; }); return { status: 201, ok: true }; },
    readJsonResponse: async () => ({ order: { _id: 'order' } }), AsyncStorage: { multiRemove: async keys => { cleaned = Array.from(keys); } }, setCart: value => { cleared = Array.from(value); },
    actionAlert: (...args) => { notice = args; }, router: { replace: route => routes.push(route) }, Alert: { alert: () => assert.fail('Raw success alert') } });
  const first = place(); await place(); await new Promise(resolve => setImmediate(resolve)); assert.equal(requests.length, 1);
  finish(); await first; assert.deepEqual(JSON.parse(requests[0].init.body), { idempotencyKey: 'same-attempt', expectedTotal: 16, shippingAddress: 'Beirut' });
  assert.deepEqual(cleaned, ['attempt-key', 'cart']); assert.deepEqual(cleared, []); assert.deepEqual(routes, []);
  assert.equal(notice[0], 'Order Placed'); notice[2][0].onPress(); assert.deepEqual(routes, ['/orders']);
});

test('actual Favorites card omits both reference IDs from text while retaining keys and cart/remove/details IDs; pending cart stays black', () => {
  const product = { _id: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439011', name: 'Almonds', brand: '507f191e810c19729de860ea', category: '507f1f77bcf86cd799439012', price: 10, discountedPrice: 8, discount: 20, availability: true };
  const shopping = { favorites: [product], pendingCart: new Set(), pendingFavorites: new Set(), add: value => { added = value; }, toggle: value => { removed = value; } };
  let added, removed, destination;
  const render = fixture('app/favorites.tsx', 'Favorites', { useShopping: () => shopping, useActionDialog: () => ({ dialog: null }),
    useState: initial => [initial === false ? true : initial, () => {}],
    favoriteReferenceLabel: fixture('app/favorites.tsx', 'favoriteReferenceLabel'), useFocusEffect: () => {}, goBackOrHome: () => {},
    router: { push: value => { destination = value; } }, View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', CartButton: 'CartButton', Ionicons: 'Icon',
    styles: { addToCartButton: { backgroundColor: '#171717' }, productCard: {} }, getFinalPrice: () => 8, formatPrice: value => '$' + value.toFixed(2) });
  let tree = render();
  const visible = nodes(tree, node => node.type === 'Text').map(node => JSON.stringify(node.props.children)).join('');
  for (const id of [product._id, product.brand, product.category]) assert.ok(!visible.includes(id), id);
  const card = nodes(tree, node => node.props?.key === product._id)[0]; assert.ok(card); card.props.onPress(); assert.equal(destination.params.id, product._id);
  const button = nodes(tree, node => node.props?.accessibilityLabel === 'Add Almonds to cart')[0]; button.props.onPress({ stopPropagation() {} }); assert.equal(added.id, product._id);
  const remove = nodes(card, node => node !== card && node.type === 'Pressable' && nodes(node, child => child.type === 'Icon' && child.props.name === 'heart').length)[0]; remove.props.onPress({ stopPropagation() {} }); assert.equal(removed, product);
  shopping.pendingCart.add(product._id); tree = render();
  const pending = nodes(tree, node => node.props?.accessibilityLabel === 'Add Almonds to cart')[0];
  assert.equal(pending.props.disabled, false);
  assert.equal(pending.props.style({ pressed: false }).filter(Boolean).at(-1).backgroundColor, '#171717');
  assert.equal(pending.props.style({ pressed: true }).filter(Boolean).at(-1).backgroundColor, '#E35B3F');
  assert.equal(product.brand, '507f191e810c19729de860ea');
});

test('Top Selling keeps the badge design at a 6px top inset for single/double-digit discounts and omits it without an offer', () => {
  const text = source('app/index.tsx');
  const position = vm.runInNewContext('(' + text.match(/topSellingDiscountPosition: (\{[^}]+\})/)[1] + ')');
  assert.equal(position.top, 6); assert.equal(position.bottom, 'auto');
  const render = fixture('app/index.tsx', 'TopSellingProductRow', { useEffect: () => {},
    Animated: { View: 'Animated', Value: class { interpolate() { return 0; } } }, View: 'View', Text: 'Text', Pressable: 'Pressable', ProductImage: 'ProductImage', Ionicons: 'Icon', AddToCartButton: 'AddToCartButton',
    styles: { topSellingDiscountPosition: position }, getFinalPrice: product => product.discountedPrice });
  for (const discount of [0, 5, 20]) {
    const tree = render({ product: { id: 'A', name: 'A', price: 10, discount, discountedPrice: 10 * (1 - discount / 100) }, isLoggedIn: true });
    const badges = nodes(tree, node => Array.isArray(node.props?.style) && node.props.style.includes(position));
    assert.equal(badges.length, discount ? 1 : 0);
    if (discount) assert.ok(JSON.stringify(badges[0].props.children).includes(String(discount)));
  }
});

test('Class C Cart renders minimum, paid delivery and FREE states from current server rules without changing A/B minimums',()=>{
  // Compile the production function with its full signature.
  const ast=ts.createSourceFile('delivery.ts',source('services/delivery-pricing.ts'),ts.ScriptTarget.Latest,true);
  const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='deliverySummary');
  const ctx={exports:{}};vm.runInNewContext(ts.transpileModule(fn.getText(ast)+'\nexports.summary=deliverySummary;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,ctx);
  const rules={priceClass:'C',minimumCheckoutAmount:30,freeDeliveryThreshold:100,deliveryFeeBelowThreshold:5};
  for(const [subtotal,allowed,total,message] of [[20,false,20,'Add $10.00 more to reach the minimum order.'],[30,true,35,'Add $70.00 more to enjoy FREE delivery.'],[60,true,65,'Add $40.00 more to enjoy FREE delivery.'],[100,true,100,"You've got FREE delivery!"],[120,true,120,"You've got FREE delivery!"]]) {
    const actual=ctx.exports.summary(subtotal,rules);assert.equal(actual.allowed,allowed);assert.equal(actual.total,total);assert.equal(actual.message,message);
    const shopping={cart:[{product:{_id:'A',name:'Almonds',availability:true,discountedPrice:subtotal},quantity:1,price:subtotal}],ready:true,busy:false,minimum:30,deliveryRules:rules};
    const render=fixture('app/cart.tsx','Cart',{getSessionSnapshot:()=>({authenticated:true}),useShopping:()=>shopping,useActionDialog:()=>({dialog:null}),deliverySummary:ctx.exports.summary,cartTotal:items=>items.reduce((sum,item)=>sum+item.price*item.quantity,0),useEffect:()=>{},useFocusEffect:()=>{},styles:{},getImageUrl:()=>null,
      View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable',ScrollView:'ScrollView',ProductImage:'ProductImage',Ionicons:'Icon',router:{},goBackOrHome:()=>{}});
    const tree=render();const texts=nodes(tree,node=>node.type==='Text').map(node=>JSON.stringify(node.props.children)).join('');
    assert.ok(texts.includes(allowed?message.replace('to enjoy FREE delivery','to get FREE delivery'):'more to reach the minimum order.'));
    const checkout=nodes(tree,node=>node.type==='Pressable'&&nodes(node,child=>child.type==='Text'&&JSON.stringify(child.props.children).includes('Checkout')).length).at(-1);
    assert.equal(checkout.props.disabled,!allowed);
    if(allowed)assert.ok(texts.includes(subtotal>=100?'FREE':'$5.00'));
  }
  for(const priceClass of ['A','B'])assert.equal(ctx.exports.summary(29,{priceClass,minimumCheckoutAmount:30}).allowed,false);
});

test('two-stage Cart fills, colors and totals use current Class C rules only, including zero and decimal boundaries',()=>{
  const ast=ts.createSourceFile('delivery.ts',source('services/delivery-pricing.ts'),ts.ScriptTarget.Latest,true);
  const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='deliverySummary');
  const context={exports:{}};vm.runInNewContext(ts.transpileModule(fn.getText(ast)+'\nexports.summary=deliverySummary;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
  const summary=context.exports.summary;
  const rules={priceClass:'C',minimumCheckoutAmount:30,freeDeliveryThreshold:100,deliveryFeeBelowThreshold:5};
  const renderCart=(subtotal,rules,authenticated=true,empty=false)=>fixture('app/cart.tsx','Cart',{
    useShopping:()=>({cart:empty?[]:[{product:{_id:'P',name:'Product',availability:true,discountedPrice:subtotal},quantity:1,price:subtotal}],ready:true,busy:false,minimum:rules.minimumCheckoutAmount,deliveryRules:rules}),
    getSessionSnapshot:()=>({authenticated}),useActionDialog:()=>({dialog:null}),deliverySummary:summary,cartTotal:items=>items.reduce((sum,item)=>sum+item.price*item.quantity,0),
    useEffect:()=>{},useFocusEffect:()=>{},styles:{},getImageUrl:()=>null,View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable',ScrollView:'ScrollView',ProductImage:'ProductImage',Ionicons:'Icon',router:{},goBackOrHome:()=>{}})();
  for(const [subtotal,first,second] of [[0,0,0],[15,50,0],[29.99,29.99/30*100,0],[30,100,0],[65,100,50],[100,100,100],[200,100,100]]) {
    const tree=renderCart(subtotal,rules), bars=nodes(tree,node=>node.props?.accessibilityRole==='progressbar');assert.equal(bars.length,2);
    assert.ok(Math.abs(bars[0].props.accessibilityValue.now-first)<1e-8);assert.ok(Math.abs(bars[1].props.accessibilityValue.now-second)<1e-8);
    const fills=bars.map(bar=>nodes(bar,node=>node.props?.style?.width)[0].props.style);
    assert.equal(fills[0].backgroundColor,subtotal>=30?'#27804A':'#D74343');assert.equal(fills[1].backgroundColor,subtotal>=100?'#27804A':'#D9A521');
    const text=nodes(tree,node=>node.type==='Text').map(node=>JSON.stringify(node.props.children)).join('');
    assert.ok(text.includes('Products subtotal'));assert.ok(!text.includes('enjoy FREE delivery'));
    assert.ok(text.includes('$'+summary(subtotal,rules).total.toFixed(2)));
    if(subtotal>=30)assert.ok(text.includes(subtotal>=100?'FREE':'$5.00'));
  }
  assert.equal(nodes(renderCart(0,rules,true,true),node=>node.props?.accessibilityRole==='progressbar').length,2);
  for(const priceClass of ['A','B']) {
    const tree=renderCart(65,{...rules,priceClass});assert.equal(nodes(tree,node=>node.props?.accessibilityRole==='progressbar').length,0);
    const text=nodes(tree,node=>node.type==='Text').map(node=>JSON.stringify(node.props.children)).join('');assert.ok(!text.includes('Products subtotal'));assert.ok(!text.includes('FREE'));
  }
  assert.equal(nodes(renderCart(65,rules,false),node=>node.props?.accessibilityRole==='progressbar').length,0);
  const changed=summary(60,{...rules,minimumCheckoutAmount:40,freeDeliveryThreshold:80,deliveryFeeBelowThreshold:7});assert.equal(changed.freeProgress,50);assert.equal(changed.total,67);
  for(const minimum of [0,30]) {const equal=summary(minimum,{...rules,minimumCheckoutAmount:minimum,freeDeliveryThreshold:minimum});assert.equal(equal.minimumProgress,100);assert.equal(equal.freeProgress,100);}
  assert.equal(summary(30.01,{...rules,minimumCheckoutAmount:30.01,freeDeliveryThreshold:30.03}).minimumProgress,100);
});

test('Checkout blocks below the minimum before a request and handles authoritative price changes without clearing cart',async()=>{
  let notice,calls=0,cleared=false;
  const base={cart:[{product:{_id:'A'},quantity:1,price:20}],user:{_id:'customer',phone:'71000000',address:'Beirut'},displayName:'Maya',placingOrder:false,orderInFlight:{current:false},
    delivery:{allowed:false,message:'Add $10.00 more to reach the minimum order.',total:20},actionAlert:(...args)=>notice=args,Alert:{alert:(...args)=>notice=args},setPlacingOrder:()=>{},
    request:async()=>{calls++;return{ok:false,status:409};},getAccessToken:async()=>'fixture',getCheckoutAttempt:async()=>({key:'same-attempt'}),cartRevision:'revision',API_URL:'https://fixture.test',
    readJsonResponse:async()=>({message:'Review updated total',pricing:{deliveryRules:{minimumCheckoutAmount:30}}}),setDeliveryRules:()=>{},setMinimumOrder:()=>{},loadData:async()=>{},setCart:()=>{cleared=true;}};
  await handler('app/checkout.tsx','placeOrder',base)();assert.equal(calls,0);assert.equal(notice[0],'Minimum Order');
  await handler('app/checkout.tsx','placeOrder',{...base,delivery:{allowed:true,total:25}})();assert.equal(calls,1);assert.equal(cleared,false);assert.equal(notice[0],'Order Failed');
});

test('Customer Order Details uses historical paid/FREE delivery and saved grand total; legacy orders remain readable',()=>{
  for(const fee of [5,0,undefined]) {
    const order={_id:'507f1f77bcf86cd799439011',customerOrderNumber:fee===undefined?undefined:3,items:[{product:{_id:'P',name:'Almonds',image:''},quantity:1,price:80}],totalPrice:80+(fee||0),status:'Pending',shippingAddress:'Beirut',
      ...(fee===undefined?{}:{subtotal:80,discountAmount:0,deliveryFee:fee,deliveryRules:{priceClass:'C'}})};
    const render=fixture('app/order-details.tsx','OrderDetails',{useLocalSearchParams:()=>({orderId:order._id}),useState:initial=>[initial===null?order:false,()=>{}],useFocusEffect:()=>{},
      formatPrice:price=>'$'+Number(price).toFixed(2),formatOrderDate:()=>'',getImageUrl:()=>'',getStatusStyles:()=>({}),styles:{},router:{},
      View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',ProductImage:'ProductImage',Ionicons:'Icon'});
    const text=nodes(render(),node=>node.type==='Text').map(node=>JSON.stringify(node.props.children)).join('');
    assert.equal(text.includes('Order #3'),fee!==undefined);assert.ok(!text.includes(order._id));
    assert.ok(text.includes('$'+order.totalPrice.toFixed(2)));if(fee!==undefined)assert.ok(text.includes(fee?'$5.00':'FREE'));else assert.ok(!text.includes('Delivery:'));
  }
});

test('My Orders retains stable saved numbers under sorting/status changes and navigates with internal IDs; legacy IDs stay hidden',()=>{
  const orders=[{_id:'507f1f77bcf86cd799439011',customerOrderNumber:1,totalPrice:85,status:'Cancelled',createdAt:'2020-01-01',items:[]},
    {_id:'507f1f77bcf86cd799439012',customerOrderNumber:2,totalPrice:120,status:'Pending',createdAt:'2020-02-01',items:[]},
    {_id:'507f1f77bcf86cd799439013',totalPrice:80,status:'Pending',createdAt:'2019-01-01',items:[]}];
  let destination;
  const render=fixture('app/orders.tsx','Orders',{useState:initial=>[Array.isArray(initial)?orders:false,()=>{}],useActionDialog:()=>({dialog:null}),useFocusEffect:()=>{},formatPrice:value=>'$'+value.toFixed(2),
    View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Ionicons:'Icon',styles:{},router:{push:value=>destination=value},goBackOrHome:()=>{}});
  for(const sorted of [false,true]) {
    if(sorted)orders.reverse();
    const tree=render(),text=nodes(tree,node=>node.type==='Text').map(node=>JSON.stringify(node.props.children)).join('');
    assert.ok(text.includes('Order #1'));assert.ok(text.includes('Order #2'));for(const order of orders)assert.ok(!text.includes(order._id));
    const card=nodes(tree,node=>node.props?.key===orders[0]._id)[0];card.props.onPress();assert.equal(destination.params.orderId,orders[0]._id);
  }
});
