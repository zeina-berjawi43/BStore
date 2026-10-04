const fs = require('fs'), path = require('path'), vm = require('vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../src');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, console, Error, require: name => { if (!(name in dependencies)) throw Error('Unexpected dependency: ' + name); return dependencies[name]; } });
  return exports;
}
const session = { authenticated: true, revision: 1 };
const { createShoppingState } = load('services/shopping-state.ts', {
  './authService': {}, './request': {}, './tokenStorage': { getSessionSnapshot: () => session, subscribeSession: () => {} },
  './cartPricing': load('services/cartPricing.ts'), './product-price': load('services/product-price.ts'),
});
const product = id => ({ _id: id, id, name: id, price: 12, discountedPrice: 10, imageFrame: { zoom: 2, x: .5, y: -.5 } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function fixture({ cart = [], favorites = [], send, authenticated = () => true } = {}) {
  const calls = [];
  const state = createShoppingState({ authenticated, send: async (url, method, body) => {
    calls.push({ url, method, body });
    if (!method) return url === '/cart' ? { cart: { items: cart }, minimumOrderValue: 100 } : { favorites: favorites.map(p => ({ product: p })) };
    const result = send ? await send(url, method, body) : {};
    if (Array.isArray(result.cart?.items)) cart = result.cart.items;
    else if (url === '/cart/add') {
      const found = cart.find(row => row.product._id === body.productId);
      cart = found ? cart.map(row => row === found ? { ...row, quantity: row.quantity + 1 } : row) : [...cart, { product: product(body.productId), quantity: 1, price: 10 }];
    } else if (url === '/cart/update') cart = cart.map(row => row.product._id === body.productId ? { ...row, quantity: body.quantity } : row);
    else if (url === '/cart/remove') cart = cart.filter(row => row.product._id !== body.productId);
    else if (url === '/cart/clear') cart = [];
    else if (url === '/favorites/add') favorites = favorites.some(p => (p._id || p.id) === body.productId) ? favorites : [...favorites, product(body.productId)];
    else if (url === '/favorites/remove') favorites = favorites.filter(p => (p._id || p.id) !== body.productId);
    else if (url === '/favorites/clear') favorites = [];
    return result;
  } });
  return { state, calls };
}
module.exports = { createShoppingState, fixture, product, deferred, flush };
