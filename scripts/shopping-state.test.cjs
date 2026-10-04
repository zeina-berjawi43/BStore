const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm'), ts = require('typescript');
const { fixture, product, deferred, flush, createShoppingState } = require('./shopping-fixture.cjs');
const item = (id, quantity = 1) => ({ product: product(id), quantity, price: 999 });
const ids = values => Array.from(values, p => p._id || p.id);

test('uncertain committed write is read back without retry; checkout stays blocked until reconciliation finishes', async () => {
  let server = [], reads = 0, writes = 0; const write = deferred(), read = deferred();
  const state = createShoppingState({ authenticated: () => true, send: async (url, method) => {
    if (!method) {
      if (url === '/favorites') return { favorites: [] };
      reads++; if (reads > 1) await read.promise;
      return { cart: { items: server }, minimumOrderValue: 100 };
    }
    writes++; await write.promise; server = [item('A')]; throw Error('response timed out after commit');
  } });
  await state.refresh(); const operation = state.add(product('A')); const failure = assert.rejects(operation, /timed out/);
  await flush(); write.resolve(); await failure; await flush();
  assert.equal(state.getSnapshot().cartCount, 0); assert.equal(state.getSnapshot().busy, true);
  read.resolve(); await flush();
  assert.equal(state.getSnapshot().cartCount, 1); assert.equal(state.getSnapshot().busy, false); assert.equal(writes, 1);
});

function shoppingHook(state, session = { authenticated: true, revision: 1 }) {
  const exports = {}, messages = [], cleanups = [], navigations = [];
  const source = fs.readFileSync(path.join(__dirname, '../src/hooks/use-shopping.ts'), 'utf8');
  const dependencies = {
    react: { useRef: value => ({ current: value }), useSyncExternalStore: (_subscribe, snapshot) => snapshot(), useEffect: effect => cleanups.push(effect()) },
    'expo-router': { router: { push: route => navigations.push(route) } },
    '../services/tokenStorage': { getSessionSnapshot: () => session }, '../services/shopping-state': { shoppingState: state },
    '../components/product-feedback': { useProductFeedback: () => ({ showAlert: (...args) => messages.push(args), feedback: null }) },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, Error, require: name => dependencies[name] });
  return { hook: exports.useShopping(), messages, navigations, unmount: () => cleanups.forEach(fn => fn?.()) };
}

test('actual shared hook publishes immediate success feedback once and restores state with one error on failure', async () => {
  const gate = deferred(), { state } = fixture({ send: () => gate.promise }); await state.refresh();
  const { hook, messages } = shoppingHook(state);
  const first = hook.add(product('A')); await hook.add(product('A'));
  assert.equal(state.getSnapshot().cartCount, 1); assert.equal(messages.length, 1); assert.equal(messages[0][1], 'Added to Cart');
  await flush(); gate.reject(Error('offline')); await first;
  assert.equal(state.getSnapshot().cartCount, 0); assert.equal(messages.length, 2); assert.equal(messages[1][1], 'Could not save');
});
test('actual shared hook never reports old-session/unmounted request completion', async () => {
  const gate = deferred(), { state } = fixture({ send: () => gate.promise }); await state.refresh();
  const { hook, messages, unmount } = shoppingHook(state); const first = hook.toggle(product('A')); await flush();
  unmount(); gate.reject(Error('offline')); await first; assert.equal(messages.length, 1); assert.equal(state.getSnapshot().favorites.length, 0);
});
test('coalesced quantity failure generates one shared error toast', async () => {
  const gate = deferred(), { state } = fixture({ cart: [item('A')], send: () => gate.promise }); await state.refresh();
  const { hook, messages } = shoppingHook(state); const first = hook.quantity('A', 2), second = hook.quantity('A', 3);
  await flush(); gate.reject(Error('offline')); await Promise.all([first, second]); assert.equal(messages.length, 1); assert.equal(state.getSnapshot().cart[0].quantity, 1);
});
test('shared clear confirmation cancels safely and clears only after explicit native confirmation', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/confirm-shopping-clear.ts'), 'utf8'), exports = {}; let buttons, calls = 0;
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: () => ({ Platform: { OS: 'android' }, Alert: { alert: (_title, _message, choices) => { buttons = choices; } } }) });
  exports.confirmShoppingClear('Cart', async () => { calls++; }); assert.equal(calls, 0); assert.equal(buttons[0].style, 'cancel');
  buttons[1].onPress(); assert.equal(calls, 1);
});

test('add is immediately visible, preserves loaded price, counts quantities and suppresses same-product duplicates', async () => {
  const gate = deferred(), { state, calls } = fixture({ cart: [item('A', 2)], send: () => gate.promise }); await state.refresh();
  const first = state.add(product('A')); assert.equal(state.getSnapshot().cartCount, 3); assert.equal(state.getSnapshot().cart[0].price, 10);
  assert.equal(state.add(product('A')), first); assert.equal(state.getSnapshot().cartCount, 3);
  await flush(); assert.equal(calls.filter(c => c.method).length, 1); assert.equal(calls.at(-1).body.quantity, 1); assert.equal(calls.at(-1).body.price, undefined);
  gate.resolve({}); await first; assert.equal(state.getSnapshot().cartCount, 3);
});
test('failed add rolls back only that product; another optimistic add survives', async () => {
  const gate = deferred(), { state } = fixture({ send: (_url, _method, body) => body.productId === 'A' ? gate.promise : {} }); await state.refresh();
  const a = state.add(product('A')), rejected = assert.rejects(a, /offline/), b = state.add(product('B')); assert.equal(state.getSnapshot().cartCount, 2);
  await flush(); gate.reject(Error('offline')); await rejected; await b; assert.equal(state.getSnapshot().cartCount, 1); assert.equal(state.getSnapshot().cart[0].product._id, 'B');
});
for (const selected of [true, false]) for (const fail of [true, false]) test(`favorite ${selected ? 'add' : 'remove'} is immediate and ${fail ? 'rolls back' : 'stays saved'}`, async () => {
  const gate = deferred(), { state } = fixture({ favorites: selected ? [] : [product('A')], send: () => gate.promise }); await state.refresh();
  const job = state.favorite(product('A'), selected); assert.equal(state.getSnapshot().favorites.length, selected ? 1 : 0);
  const completion = fail ? assert.rejects(job, /offline/) : job; await flush();
  if (fail) gate.reject(Error('offline')); else gate.resolve({}); await completion;
  assert.equal(state.getSnapshot().favorites.length, (fail ? !selected : selected) ? 1 : 0);
});
test('favorite failure restores only the failed row while a later removal stays removed', async () => {
  const gate = deferred(), { state } = fixture({ favorites: [product('A'), product('B')], send: (_url, _method, body) => body.productId === 'A' ? gate.promise : {} }); await state.refresh();
  const a = state.favorite(product('A'), false), failed = assert.rejects(a, /offline/), b = state.favorite(product('B'), false);
  assert.equal(state.getSnapshot().favorites.length, 0); await flush(); gate.reject(Error('offline')); await failed; await b; assert.deepEqual(ids(state.getSnapshot().favorites), ['A']);
});
test('rapid quantity edits coalesce and older acknowledgments cannot overwrite the latest quantity', async () => {
  const a = deferred(), b = deferred(), { state, calls } = fixture({ cart: [item('A')], send: (_url, _method, body) => body.quantity === 2 ? a.promise : b.promise }); await state.refresh();
  const two = state.quantity('A', 2); await flush(); const three = state.quantity('A', 3), four = state.quantity('A', 4);
  assert.equal(three, four); assert.equal(state.getSnapshot().cart[0].quantity, 4); assert.equal(state.getSnapshot().cartCount, 4);
  a.resolve({ cart: { items: [item('A', 2)] } }); await two; await flush(); assert.equal(state.getSnapshot().cart[0].quantity, 4);
  b.resolve({ cart: { items: [item('A', 4)] } }); await four; assert.deepEqual(calls.filter(c => c.method).map(c => c.body.quantity), [2, 4]);
});
test('failed latest quantity restores last acknowledged quantity', async () => {
  const gate = deferred(), { state } = fixture({ cart: [item('A', 2)], send: () => gate.promise }); await state.refresh();
  const job = state.quantity('A', 4), failed = assert.rejects(job, /offline/); assert.equal(state.getSnapshot().cart[0].quantity, 4);
  await flush(); gate.reject(Error('offline')); await failed; assert.equal(state.getSnapshot().cart[0].quantity, 2);
});
test('remove is immediate and failure restores quantity, price and framing metadata', async () => {
  const gate = deferred(), { state } = fixture({ cart: [item('A', 3)], send: () => gate.promise }); await state.refresh();
  const job = state.remove('A'), failed = assert.rejects(job, /offline/); assert.equal(state.getSnapshot().cartCount, 0);
  await flush(); gate.reject(Error('offline')); await failed; assert.equal(state.getSnapshot().cartCount, 3); assert.equal(state.getSnapshot().cart[0].product.imageFrame.zoom, 2);
});
for (const resource of ['Cart', 'Favorites']) for (const fail of [true, false]) test(`clear ${resource} immediately empties only that resource and ${fail ? 'rolls back' : 'stays empty'}`, async () => {
  const gate = deferred(), { state } = fixture({ cart: [item('A', 2)], favorites: [product('B')], send: () => gate.promise }); await state.refresh();
  const job = state['clear' + resource](), done = fail ? assert.rejects(job, /offline/) : job;
  assert.equal(state.getSnapshot()[resource === 'Cart' ? 'cart' : 'favorites'].length, 0);
  assert.equal(state.getSnapshot()[resource === 'Cart' ? 'favorites' : 'cart'].length, 1);
  await flush(); if (fail) gate.reject(Error('offline')); else gate.resolve({}); await done;
  assert.equal(state.getSnapshot()[resource === 'Cart' ? 'cart' : 'favorites'].length, fail ? 1 : 0);
});
test('clear cannot be undone by older writes and a new add after clear is retained', async () => {
  const gate = deferred(), { state, calls } = fixture({ send: url => url === '/cart/add' && calls.filter(c => c.method).length === 1 ? gate.promise : {} }); await state.refresh();
  const a = state.add(product('A')); await flush(); const clear = state.clearCart(), b = state.add(product('B'));
  assert.deepEqual(Array.from(state.getSnapshot().cart, row => row.product._id), ['B']); gate.resolve({}); await Promise.all([a, clear, b]);
  assert.deepEqual(calls.filter(c => c.method).map(c => c.url), ['/cart/add', '/cart/clear', '/cart/add']); assert.equal(state.getSnapshot().cartCount, 1);
});
test('account reset clears all private state and ignores a late old-account write', async () => {
  const gate = deferred(), { state } = fixture({ cart: [item('A')], favorites: [product('A')], send: () => gate.promise }); await state.refresh();
  const job = state.add(product('B')), failed = assert.rejects(job, /session changed/); await flush(); state.reset();
  assert.equal(state.getSnapshot().cartCount, 0); assert.equal(state.getSnapshot().favorites.length, 0); gate.resolve({ cart: { items: [item('B')] } }); await failed; await flush(); assert.equal(state.getSnapshot().cartCount, 0);
});
test('stale focus refetch cannot revert a completed mutation', async () => {
  const cartRead = deferred(); let reads = 0;
  const state = createShoppingState({ authenticated: () => true, send: async (url, method) => {
    if (method) return {}; if (url === '/favorites') return { favorites: [] };
    if (++reads === 1) return { cart: { items: [item('A')] }, minimumOrderValue: 100 }; return cartRead.promise;
  } }); await state.refresh(); const read = state.refresh(true), add = state.add(product('B'));
  cartRead.resolve({ cart: { items: [] }, minimumOrderValue: 100 }); await read; await add; assert.equal(state.getSnapshot().cartCount, 2);
});
test('guest actions cannot populate private cart or favorite state', async () => {
  const { state, calls } = fixture({ authenticated: () => false }); await state.refresh(); await assert.rejects(state.add(product('A')), /log in/); assert.equal(calls.length, 0); assert.equal(state.getSnapshot().cartCount, 0);
});
test('manual quantity accepts the actual input draft on blur without Done; invalid input never sends', async () => {
  const text = fs.readFileSync(path.join(__dirname, '../src/app/cart.tsx'), 'utf8'), ast = ts.createSourceFile('cart.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let code;
  function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleManualQuantitySubmit') code = node.initializer.getText(ast); ts.forEachChild(node, walk); } walk(ast);
  const calls = [], context = { exports: {}, editingQuantity: { current: 'A' }, quantityDraft: { current: { A: '12' } }, manualQuantities: { A: '1' }, shoppingState: { getSnapshot: () => ({ cart: [item('A')] }) }, mutateCart: (...args) => calls.push(args), setManualQuantities: () => {}, actionAlert: () => {} };
  vm.runInNewContext(ts.transpileModule('exports.fn = ' + code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  await context.exports.fn('A'); assert.deepEqual(calls, [['A', 12]]); assert.equal(context.editingQuantity.current, null);
  await context.exports.fn('A'); assert.equal(calls.length, 1, 'keyboard hide followed by blur must not submit the stale displayed value');
  context.quantityDraft.current.A = ''; await context.exports.fn('A'); assert.equal(calls.length, 1);
  assert.match(text, /onBlur=\{\(\) =>\s*handleManualQuantitySubmit/); assert.match(text, /Keyboard.addListener\('keyboardDidHide'/);
});
test('all product action routes use shared state, count badges and no blocking Adding wording', () => {
  for (const route of ['index', 'search', 'favorites', 'product-details', 'category-products', 'department-categories']) {
    const text = fs.readFileSync(path.join(__dirname, '../src/app/' + route + '.tsx'), 'utf8');
    assert.match(text, /useShopping/); assert.doesNotMatch(text, /Adding\.\.\./); assert.match(text, route === 'index' ? /cartCount/ : /<CartButton/);
  }
  const favorites = fs.readFileSync(path.join(__dirname, '../src/app/favorites.tsx'), 'utf8');
  assert.doesNotMatch(favorites, /Your saved products|styles.countContainer/); assert.match(favorites, /Clear Favorites/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../src/app/search.tsx'), 'utf8'), /Find your favorites/);
});
test('actual product image styles are white without changing framing geometry', () => {
  for (const route of ['index', 'search', 'favorites', 'cart', 'product-details', 'category-products', 'department-categories', 'order-details']) {
    const text = fs.readFileSync(path.join(__dirname, '../src/app/' + route + '.tsx'), 'utf8'), ast = ts.createSourceFile(route, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function walk(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'StyleSheet.create') for (const prop of node.arguments[0].properties) {
      if (ts.isPropertyAssignment(prop) && /image|photo/i.test(prop.name.getText(ast)) && ts.isObjectLiteralExpression(prop.initializer)) assert.match(prop.initializer.getText(ast), /backgroundColor:\s*'#FFFFFF'/, route + ' ' + prop.name.getText(ast));
    } ts.forEachChild(node, walk); } walk(ast);
  }
});

test('Favorites retains backend-relative image resolution after adopting shared products', () => {
  const text = fs.readFileSync(path.join(__dirname, '../src/app/favorites.tsx'), 'utf8');
  const ast = ts.createSourceFile('favorites.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let code;
  function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'getImageUrl') code = node.initializer.getText(ast); ts.forEachChild(node, walk); } walk(ast);
  const context = { exports: {}, API_URL: 'https://store.example' };
  vm.runInNewContext(ts.transpileModule('exports.image = ' + code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  for (const value of ['photo.png', 'uploads/photo.png', '/uploads/photo.png', 'uploads\\photo.png']) assert.equal(context.exports.image(value), 'https://store.example/uploads/photo.png');
  assert.equal(context.exports.image('https://images.example/photo.png'), 'https://images.example/photo.png');
  assert.equal(context.exports.image(''), ''); assert.match(text, /getImageUrl\(product.image\)/);
});
