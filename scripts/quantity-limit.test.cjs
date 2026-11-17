// Maximum quantity per order in the customer app (shared by native and web builds).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { fixture, product, flush, load } = require('./shopping-fixture.cjs');
const limit = load('services/quantity-limit.ts');
const limited = (id, max) => ({ ...product(id), name: 'Chocolate Bar', quantityLimitEnabled: true, maxQuantityPerOrder: max });
const qty = (state, id) => state.getSnapshot().cart.find(item => item.product._id === id)?.quantity || 0;
const writes = calls => calls.filter(call => call.method);

test('rules: legacy/disabled unlimited; exact maximum allowed; increases above blocked; decreases allowed', () => {
  assert.equal(limit.productQuantityLimit(product('A')), null);
  assert.equal(limit.productQuantityLimit({ quantityLimitEnabled: false, maxQuantityPerOrder: 6 }), null);
  assert.equal(limit.productQuantityLimit({ quantityLimitEnabled: true, maxQuantityPerOrder: 0 }), null);
  const p = limited('C', 6);
  assert.equal(limit.quantityLimitBlock(p, 5, 6), null);
  assert.equal(limit.quantityLimitBlock(p, 6, 7), 'You can order a maximum of 6 of Chocolate Bar per order.');
  assert.equal(limit.quantityLimitBlock(p, 9, 8), null, 'decrease while still above the limit');
  assert.equal(limit.quantityLimitBlock(product('A'), 1000, 1001), null);
  // Same text as the backend message.
  const backend = require('../../backend/services/quantityLimit');
  assert.equal(limit.quantityLimitMessage('Chocolate Bar', 6), backend.quantityLimitMessage('Chocolate Bar', 6));
});

test('cart issues: aggregated per product, only above the current limit', () => {
  const issues = limit.cartQuantityLimitIssues([{ product: limited('C', 6), quantity: 4 }, { product: limited('C', 6), quantity: 3 }, { product: product('A'), quantity: 99 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(issues)), [{ productId: 'C', name: 'Chocolate Bar', quantity: 7, maxQuantityPerOrder: 6 }]);
  assert.equal(limit.cartQuantityLimitIssues([{ product: limited('C', 6), quantity: 6 }]).length, 0);
  assert.match(limit.cartQuantityLimitSummary(issues), /maximum of 6 of Chocolate Bar per order\. Your cart has 7\. Reduce/);
});

test('quantity controls stop at the maximum without contacting the server; unlimited products unchanged', async () => {
  const { state, calls } = fixture({ cart: [{ product: limited('C', 6), quantity: 5, price: 10 }] });
  await state.refresh();
  await state.adjust(limited('C', 6), 1);
  assert.equal(qty(state, 'C'), 6);
  const before = writes(calls).length;
  await assert.rejects(state.adjust(limited('C', 6), 1), error => error.code === 'QUANTITY_LIMIT_EXCEEDED' && /maximum of 6/.test(error.message));
  await assert.rejects(state.quantity('C', 7), /maximum of 6/);
  await assert.rejects(state.add(limited('C', 6)), /maximum of 6/);
  assert.equal(writes(calls).length, before, 'blocked increases send nothing');
  assert.equal(qty(state, 'C'), 6);
  await state.adjust(limited('C', 6), -1); assert.equal(qty(state, 'C'), 5);
  for (let i = 0; i < 20; i++) await state.adjust(product('A'), 1);
  assert.equal(qty(state, 'A'), 20);
});

test('saved cart above a newly lowered maximum is not altered; customer can step down', async () => {
  // Server cart (restored on app start/reload) already holds 7 while the limit is now 6.
  const { state, calls } = fixture({ cart: [{ product: limited('C', 6), quantity: 7, price: 10 }] });
  await state.refresh();
  assert.equal(qty(state, 'C'), 7, 'not silently changed');
  assert.equal(writes(calls).length, 0, 'no automatic cart write');
  assert.equal(limit.cartQuantityLimitIssues(state.getSnapshot().cart).length, 1);
  await assert.rejects(state.quantity('C', 8), /maximum of 6/);
  await state.quantity('C', 6);
  assert.equal(qty(state, 'C'), 6);
  assert.equal(limit.cartQuantityLimitIssues(state.getSnapshot().cart).length, 0);
});

test('server limit rejection (stale client data) rolls back only that change, without a lasting cart error', async () => {
  let rejections = 0;
  const { state } = fixture({ cart: [{ product: product('C'), quantity: 6, price: 10 }], send: async url => {
    if (url === '/cart/update') { rejections++; throw Object.assign(Error('You can order a maximum of 6 of C per order.'), { status: 400, code: 'QUANTITY_LIMIT_EXCEEDED', title: 'Maximum Quantity Reached' }); }
    return {};
  } });
  await state.refresh();
  await assert.rejects(state.adjust(product('C'), 1), /maximum of 6/);
  await flush();
  assert.equal(rejections, 1);
  assert.equal(qty(state, 'C'), 6);
  assert.equal(state.getSnapshot().cartError, null);
});

test('cart and checkout screens surface the limit with the existing notice and dialog components', () => {
  const read = file => fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8');
  const cart = read('app/cart.tsx'), checkout = read('app/checkout.tsx'), hook = read('hooks/use-shopping.ts');
  assert.match(cart, /testID="cart-quantity-limit-notice"[^>]*style=\{styles\.minimumBox\}/);
  assert.match(cart, /disabled=\{\s*!canCheckout \|\| limitIssues\.length > 0\s*\}/);
  assert.match(cart, /cartQuantityLimitIssues\(latest\.cart\)/);
  assert.match(checkout, /data\?\.code === QUANTITY_LIMIT_EXCEEDED/);
  assert.match(checkout, /cartQuantityLimitIssues\(cart\)/);
  assert.match(hook, /showAlert\(message, QUANTITY_LIMIT_TITLE\)/);
});

// ---- "+" is disabled only once the maximum is reached (all selectors share QuantitySelector) ----
const ts = require('typescript'), vm = require('vm');
function renderSelector(state, p) {
  const exports = {}, element = (type, props, ...children) => ({ type, props: { ...props, children } });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/components/quantity-selector.tsx'), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, { exports, React: { createElement: element }, require: name => {
      if (name === 'react') return { createElement: element, useSyncExternalStore: (_subscribe, read) => read() };
      if (name === 'react/jsx-runtime') throw Error('unexpected');
      if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: s => s } };
      if (name === '../services/shopping-state') return { shoppingState: state };
      throw Error('Unexpected dependency: ' + name);
    } });
  const adjusts = [];
  const tree = exports.QuantitySelector({ product: p, onAdjust: delta => adjusts.push(delta), children: 'Add' });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(all)];
  const nodes = all(tree), find = label => nodes.find(n => n.props?.accessibilityLabel === label);
  const stop = { stopPropagation() {} };
  const text = nodes.filter(n => n.type === 'Text').flatMap(n => n.props.children).filter(v => typeof v === 'string').join(' ');
  return { plus: find(`Increase ${p.name} quantity`), minus: find(`Decrease ${p.name} quantity`), adjusts, stop, text };
}

test('QuantitySelector: "+" enabled below the maximum, disabled at and above it; "-" always works; nothing reveals the maximum', async () => {
  const p = limited('C', 6);
  const { state } = fixture({ cart: [{ product: p, quantity: 5, price: 10 }] });
  await state.refresh();
  let view = renderSelector(state, p);
  assert.equal(view.plus.props.disabled, false);
  assert.equal(state.atQuantityLimit('C', p), false);
  assert.doesNotMatch(view.text, /6|max|per order/i, 'no proactive maximum before it is reached');
  await state.adjust(p, 1); // reaches 6
  view = renderSelector(state, p);
  assert.equal(view.plus.props.disabled, true);
  assert.equal(view.plus.props.accessibilityState.disabled, true);
  view.plus.props.onPress(view.stop); assert.deepEqual(view.adjusts, [], 'disabled "+" cannot increase');
  assert.equal(view.minus.props.disabled, undefined);
  view.minus.props.onPress(view.stop); assert.deepEqual(view.adjusts, [-1]);
  await state.adjust(p, -1);
  assert.equal(renderSelector(state, p).plus.props.disabled, false, 're-enabled after decreasing');
});

test('QuantitySelector: unlimited, legacy and disabled-limit products are never blocked; above-limit carts keep "+" disabled', async () => {
  const unlimited = product('A'), off = { ...product('B'), quantityLimitEnabled: false, maxQuantityPerOrder: 2 };
  const over = limited('C', 4);
  const { state } = fixture({ cart: [{ product: unlimited, quantity: 999, price: 10 }, { product: off, quantity: 50, price: 10 }, { product: over, quantity: 7, price: 10 }] });
  await state.refresh();
  assert.equal(renderSelector(state, unlimited).plus.props.disabled, false);
  assert.equal(renderSelector(state, off).plus.props.disabled, false);
  assert.equal(state.atQuantityLimit('A'), false);
  const view = renderSelector(state, over);
  assert.equal(view.plus.props.disabled, true);
  assert.equal(view.minus.props.disabled, undefined);
  assert.equal(state.getSnapshot().cart.find(item => item.product._id === 'C').quantity, 7, 'saved quantity untouched');
  // Out of stock still disables "+" as before.
  assert.equal(renderSelector(state, { ...unlimited, availability: false }).plus.props.disabled, true);
});

test('cart "+" uses the same rule and existing disabled style; typed quantities keep the informative error', () => {
  const cart = fs.readFileSync(path.resolve(__dirname, '../src/app/cart.tsx'), 'utf8');
  assert.match(cart, /const atQuantityLimit = quantityLimitBlock\(product, item\.quantity, item\.quantity \+ 1\) !== null;/);
  // Same rule as the shared selector: the cart row is the shopping snapshot row.
  const p = limited('C', 6);
  for (const [quantity, atLimit] of [[5, false], [6, true], [7, true]]) assert.equal(limit.quantityLimitBlock(p, quantity, quantity + 1) !== null, atLimit);
  assert.equal(limit.quantityLimitBlock(product('A'), 500, 501), null);
  assert.match(cart, /\(itemUpdating \|\| atQuantityLimit\) &&\s*styles\.quantityButtonDisabled/);
  assert.match(cart, /disabled=\{\s*itemUpdating \|\| atQuantityLimit\s*\}/);
  // "-" button unchanged: disabled only while updating.
  const minus = cart.slice(cart.indexOf('`Decrease ${product.name} quantity`'), cart.indexOf('`${product.name} quantity`'));
  assert.match(minus, /disabled=\{\s*itemUpdating\s*\}/);
  assert.doesNotMatch(minus, /atQuantityLimit/);
  const hook = fs.readFileSync(path.resolve(__dirname, '../src/hooks/use-shopping.ts'), 'utf8');
  assert.match(hook, /showAlert\(message, QUANTITY_LIMIT_TITLE\)/);
});

// ---- Dynamic maximums (the value 6 is only an example) ----
for (const max of [1, 3, 6, 12, 24, 1000000]) test(`dynamic maximum ${max}: allowed up to ${max}, "+" disabled at ${max}, "-" re-enables`, async () => {
  const p = limited('D', max);
  const { state, calls } = fixture({ cart: [{ product: p, quantity: max - 1 || 1, price: 10 }] });
  await state.refresh();
  if (max > 1) { assert.equal(state.atQuantityLimit('D', p), false); await state.adjust(p, 1); }
  assert.equal(qty(state, 'D'), max);
  assert.equal(state.atQuantityLimit('D', p), true);
  assert.equal(renderSelector(state, p).plus.props.disabled, true);
  const writesBefore = writes(calls).length;
  await assert.rejects(state.quantity('D', max + 1), new RegExp(`maximum of ${max} of`));
  assert.equal(writes(calls).length, writesBefore);
  if (max > 1) { await state.adjust(p, -1); assert.equal(renderSelector(state, p).plus.props.disabled, false); }
  assert.equal(calls.filter(call => /^\/products/.test(call.url)).length, 0, 'limit checks never fetch products');
});

// ---- Stale cached limits are reconciled from existing local refreshes, without requests ----
test('a newer catalog copy (background refresh) lifts a raised limit and applies a lowered one immediately', async () => {
  const cartCopy = { ...limited('E', 4), updatedAt: '2026-11-17T10:00:00.000Z' };
  const { state, calls } = fixture({ cart: [{ product: cartCopy, quantity: 4, price: 10 }] });
  await state.refresh();
  let reads = calls.length;
  assert.equal(renderSelector(state, cartCopy).plus.props.disabled, true);
  const raised = { ...limited('E', 10), updatedAt: '2026-11-17T10:05:00.000Z' };
  assert.equal(renderSelector(state, raised).plus.props.disabled, false, 'admin raised the limit: no permanent stale block');
  assert.equal(calls.length, reads, 'limit checks make no requests');
  await state.adjust(raised, 1); assert.equal(qty(state, 'E'), 5); // the normal cart write (and its existing confirmation)
  reads = calls.length;
  const older = { ...limited('E', 10), updatedAt: '2026-11-17T09:00:00.000Z' };
  // Cart row from the write above is the mock's copy without updatedAt; an older copy must not win over a dated one.
  assert.equal(limit.newestProductCopy(cartCopy, older), cartCopy);
  const lowered = { ...limited('E', 5), updatedAt: '2026-11-17T10:10:00.000Z' };
  assert.equal(renderSelector(state, lowered).plus.props.disabled, true, 'admin lowered the limit: "+" stops at the new maximum');
  const disabled = { ...product('E'), quantityLimitEnabled: false, maxQuantityPerOrder: null, updatedAt: '2026-11-17T10:20:00.000Z' };
  assert.equal(renderSelector(state, disabled).plus.props.disabled, false, 'admin disabled the limit');
  assert.equal(calls.slice(reads).filter(call => !call.method).length, 0, 'no extra reads to check limits');
});

test('newestProductCopy keeps the cart copy without comparable timestamps', () => {
  const a = { updatedAt: '2026-01-02T00:00:00Z' }, b = { updatedAt: 'not a date' }, c = {};
  assert.equal(limit.newestProductCopy(a, b), a);
  assert.equal(limit.newestProductCopy(c, a), a);
  assert.equal(limit.newestProductCopy(a, c), a);
  assert.equal(limit.newestProductCopy(undefined, a), a);
});

test('quantity selector subscription only changes when the at-limit result changes (no extra renders)', async () => {
  const p = limited('F', 3), other = product('G');
  const { state } = fixture({ cart: [{ product: p, quantity: 1, price: 10 }] });
  await state.refresh();
  const read = () => state.atQuantityLimit('F', p);
  const seen = []; const unsubscribe = state.subscribe(() => seen.push(read()));
  for (let i = 0; i < 5; i++) await state.adjust(other, 1); // unrelated product changes
  assert.ok(seen.every(value => value === false), 'boolean snapshot is stable, so React skips re-rendering');
  unsubscribe();
});
