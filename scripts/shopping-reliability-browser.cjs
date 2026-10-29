// Run against an Expo web export. All backend calls use local fixtures; no production writes.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const evidence = path.resolve(__dirname, '../.release-check');
const root = path.resolve(process.env.BSTORE_WEB_EXPORT || path.join(evidence, 'cart-favorites-web'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file
    : fs.existsSync(path.join(file, 'index.html')) ? path.join(file, 'index.html') : file + '.html';
  if (!fs.existsSync(target)) return res.writeHead(404).end();
  res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

function installFixture() {
  const jwt = 'header.' + btoa(JSON.stringify({ exp: 4102444800, sid: 'fixture-session', sub: 'customer' })) + '.signature';
  sessionStorage.setItem('mystore.auth.v1', JSON.stringify({ accessToken: jwt, refreshToken: 'fixture-refresh' }));
  const user = { _id: 'customer', name: 'Test Customer', phone: '71000000', role: 'customer', phoneVerified: true, address: 'Fixture address' };
  localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('isLoggedIn', 'true');
  const products = ['A', 'B'].map(id => ({ _id: id, name: 'Product ' + id, image: '', availability: true, price: 10, discountedPrice: 10, discount: 0 }));
  window.fixture = JSON.parse(sessionStorage.getItem('shopping-fixture') || 'null') || { cart: null, favorites: ['A'], calls: [] };
  window.persistFixture = () => sessionStorage.setItem('shopping-fixture', JSON.stringify(window.fixture));
  const originalFetch = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('mystore-backend')) return originalFetch(input, options);
    const route = new URL(url).pathname, body = options.body ? JSON.parse(options.body) : {};
    const method = options.method || 'GET', f = window.fixture;
    f.calls.push([route, method, body]); window.persistFixture();
    const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    const items = () => Object.entries(f.cart || {}).map(([id, quantity]) => ({ product: products.find(p => p._id === id), quantity, price: 10 }));
    if (route === '/cart') {
      const data = { cart: f.cart === null ? null : { items: items() }, minimumOrderValue: 1 };
      if (f.delayCart) await new Promise(resolve => setTimeout(resolve, f.delayCart));
      return f.failCartRead ? response({ message: 'Cart temporarily unavailable' }, 503) : response(data);
    }
    if (route.startsWith('/cart/')) {
      await new Promise(resolve => setTimeout(resolve, 150));
      if (f.failCartWrite) return response({ message: 'Cart save failed' }, 400);
      f.cart ||= {};
      if (route.endsWith('/add')) f.cart[body.productId] = (f.cart[body.productId] || 0) + body.quantity;
      if (route.endsWith('/update')) f.cart[body.productId] = body.quantity;
      if (route.endsWith('/remove')) delete f.cart[body.productId];
      if (route.endsWith('/clear')) f.cart = {};
      window.persistFixture(); return response({ cart: { items: items() }, minimumOrderValue: 1 });
    }
    if (route === '/favorites') {
      const data = { favorites: f.favorites.map(id => ({ product: products.find(p => p._id === id) })) };
      if (f.delayFavorites) await new Promise(resolve => setTimeout(resolve, f.delayFavorites));
      return f.failFavoritesRead ? response({ message: 'Favorites temporarily unavailable' }, 503) : response(data);
    }
    if (route.startsWith('/favorites/')) {
      await new Promise(resolve => setTimeout(resolve, 150));
      if (f.failFavoriteWrite) return response({ message: 'Favorite save failed' }, 400);
      if (route.endsWith('/add') && !f.favorites.includes(body.productId)) f.favorites.push(body.productId);
      if (route.endsWith('/remove')) f.favorites = f.favorites.filter(id => id !== body.productId);
      if (route.endsWith('/clear')) f.favorites = [];
      window.persistFixture(); return response({});
    }
    if (route === '/products' || route === '/products/offers') return response({ products });
    if (route === '/products/top-selling') return response({ products: [] });
    if (route.startsWith('/products/')) return response({ product: products.find(p => route.endsWith(p._id)) });
    if (route === '/users/me') return response({ user });
    if (route === '/departments') return response({ departments: [] });
    if (route === '/categories') return response({ categories: [] });
    if (route === '/slideshows') return response({ slides: [] });
    return response({});
  };
}

(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  await new Promise(resolve => server.listen(4182, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(evidence, 'shopping-chrome-'));
  const chrome = spawn(process.env.BSTORE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket, id = 0;
  const callbacks = new Map(), errors = [], checks = [];
  try {
    let tabs;
    for (let i = 0; i < 60; i++) {
      try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); break; }
      catch { await wait(200); }
    }
    assert.ok(tabs?.some(tab => tab.type === 'page'), 'Headless Chrome must expose a page');
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) { const pair = callbacks.get(message.id); callbacks.delete(message.id); message.error ? pair.reject(Error(JSON.stringify(message.error))) : pair.resolve(message.result); }
      else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; callbacks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const until = async expression => { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await wait(100); } throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText')); };
    const visible = selector => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().height)`;
    const click = label => evaluate(`${visible('[aria-label="' + label + '"]')}?.click()`);
    const navigate = route => send('Page.navigate', { url: 'http://127.0.0.1:4182' + route });
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 800, deviceScaleFactor: 1, mobile: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + installFixture.toString() + ')()' });
    await navigate('/cart');
    await until(`document.body?.innerText.includes('Your cart is empty')`);
    assert.ok(await evaluate(`!document.body.innerText.includes('Could not verify')`));
    checks.push('A backend null cart renders a valid empty cart');

    await navigate('/favorites'); await until(`!!${visible('[aria-label="Add Product A to cart"]')}`);
    await click('Add Product A to cart');
    await until(`window.fixture.cart?.A===1`);
    await click('Increase Product A quantity'); await click('Increase Product A quantity');
    await until(`window.fixture.cart.A===3`);
    await click('Open cart, 3 items');
    await until(`location.pathname==='/cart'&&!!${visible('[aria-label="Product A quantity"]')}`);
    assert.equal(await evaluate(`${visible('[aria-label="Product A quantity"]')}.value`), '3');
    checks.push('First add, rapid increments and navigation share the same saved quantity');

    await navigate('/cart'); await until(`!!${visible('[aria-label="Product A quantity"]')}`);
    assert.equal(await evaluate(`${visible('[aria-label="Product A quantity"]')}.value`), '3');
    await evaluate(`window.fixture.failCartWrite=true`);
    await click('Increase Product A quantity');
    await until(`document.body.innerText.includes('Cart save failed')`);
    assert.equal(await evaluate(`${visible('[aria-label="Product A quantity"]')}.value`), '3');
    assert.equal(await evaluate('window.fixture.cart.A'), 3);
    checks.push('Cart reload persists quantity and a rejected save rolls back with feedback');

    await evaluate(`window.fixture.failCartWrite=false;window.fixture.failCartRead=true;window.persistFixture()`);
    await navigate('/favorites'); await until(`!!${visible('[aria-label="Remove Product A from favorites"]')}`);
    await click('Remove Product A from favorites');
    await until(`window.fixture.favorites.length===0&&document.body.innerText.includes('No favorites yet')`);
    checks.push('Favorite removal succeeds even when Cart loading fails');

    await evaluate(`window.fixture.failFavoritesRead=true;window.persistFixture()`);
    await navigate('/favorites'); await until(`!!${visible('[aria-label="Retry loading favorites"]')}`);
    assert.ok(await evaluate(`!document.body.innerText.includes('No favorites yet')`));
    await evaluate(`window.fixture.failFavoritesRead=false;window.fixture.favorites=['A']`);
    await click('Retry loading favorites');
    await until(`!!${visible('[aria-label="Remove Product A from favorites"]')}`);
    checks.push('Failed initial Favorites load shows Retry and recovers without an app restart');

    await evaluate(`window.fixture.failFavoriteWrite=true`);
    await click('Remove Product A from favorites');
    await until(`document.body.innerText.includes('Favorite save failed')&&!!${visible('[aria-label="Remove Product A from favorites"]')}`);
    assert.deepEqual(await evaluate('window.fixture.favorites'), ['A']);
    await evaluate(`window.fixture.failFavoriteWrite=false;window.fixture.failCartRead=false;window.persistFixture()`);
    await click('Remove Product A from favorites');
    await until(`window.fixture.favorites.length===0`);
    await navigate('/favorites'); await until(`document.body.innerText.includes('No favorites yet')`);
    checks.push('Failed favorite removal restores the row; a later removal persists across reload');

    await evaluate(`window.fixture.failCartRead=true;window.persistFixture()`);
    await navigate('/search'); await until(`!!document.querySelector('input[aria-label="Search products"]')`);
    await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Search products"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Product B');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await until(`!!${visible('[aria-label="Add Product B to favorites"]')}&&${visible('[aria-label="Add Product B to favorites"]')}.getAttribute('aria-disabled')!=='true'`);
    await click('Add Product B to favorites'); await click('Add Product B to favorites');
    await until(`window.fixture.favorites.includes('B')&&!!${visible('[aria-label="Remove Product B from favorites"]')}`);
    assert.equal(await evaluate(`window.fixture.calls.filter(([route])=>route==='/favorites/add').length`), 1);
    await navigate('/product-details?id=B');
    await until(`!!${visible('[aria-label="Remove Product B from favorites"]')}`);
    await click('Remove Product B from favorites');
    await until(`!window.fixture.favorites.includes('B')&&!!${visible('[aria-label="Add Product B to favorites"]')}`);
    await navigate('/favorites'); await until(`document.body.innerText.includes('No favorites yet')`);
    checks.push('Search cards and Product Details share favorite status, suppress duplicate taps and stay usable when Cart fails');
    assert.equal(errors.length, 0, JSON.stringify(errors));
    fs.writeFileSync(path.join(evidence, 'cart-favorites-browser.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally { socket?.close(); chrome.kill(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
