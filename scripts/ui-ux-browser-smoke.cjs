const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
// Validate an existing Expo web export; never builds native apps or contacts the API.
const evidence = path.resolve(__dirname, '../.release-check');
fs.mkdirSync(evidence, { recursive: true });
const root = path.join(evidence, 'ui-ux-final');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(req.url.split('?')[0]);
  if (name === '/fixture.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#f3cc84"/><rect x="200" width="200" height="300" fill="#e35b3f"/><circle cx="300" cy="150" r="80" fill="#fff"/><text x="300" y="165" font-size="45" text-anchor="middle">BStore</text></svg>'); return; }

  let file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const mock = () => {
  const jwt = 'header.' + btoa(JSON.stringify({ exp: 4102444800, sid: 'smoke', sub: 'customer' })) + '.signature';
  localStorage.setItem('accessToken', jwt); localStorage.setItem('refreshToken', 'smoke-refresh');
  localStorage.setItem('user', JSON.stringify({ _id: 'customer', name: 'Test Customer', phone: '71000000', role: 'customer', phoneVerified: true, address: 'Fixture address' }));
  localStorage.setItem('isLoggedIn', 'true');
  const products = [
    { _id: 'A', name: 'Test Almonds', price: 10, discount: 20, discountedPrice: 8, availability: true, category: { _id: 'category', name: 'Grocery' } },
    { _id: 'B', name: 'Test Biscuits', price: 12, discount: 0, discountedPrice: 12, availability: true, category: { _id: 'category', name: 'Grocery' } },
    { _id: 'C', name: 'Test Coffee', price: 20, discount: 10, discountedPrice: 18, availability: true, category: { _id: 'category', name: 'Grocery' } },
  ];
  products.forEach(p => { p.image = 'http://127.0.0.1:4175/fixture.svg'; p.imageFrame = { zoom: 1.2, x: 0.4, y: 0 }; });
  const favorites = new Set(['A']); const cart = new Map(); window.actionRequests = [];
  window.deliveryFixture = (quantity, rules) => { cart.clear(); cart.set('A', quantity); window.deliveryRules = rules; };
  const originalFetch = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('mystore-backend')) return originalFetch(input, options);
    const route = new URL(url).pathname, body = options.body ? JSON.parse(options.body) : {};
    let data = {};
    const items = () => [...cart].map(([id, quantity]) => ({ _id: id, product: products.find(p => p._id === id), quantity }));
    if (route === '/products') data = { products };
    else if (route === '/products/top-selling') data = { products: products.map(product => ({ product, totalSold: 10 })) };
    else if (route === '/products/offers') data = { products: products.filter(p => p.discount) };
    else if (route.startsWith('/products/')) data = { product: products.find(p => route.endsWith(p._id)) };
    else if (route === '/favorites') data = { favorites: [...favorites].map(id => ({ product: { ...products.find(p => p._id === id), brand: '507f191e810c19729de860ea', category: '507f1f77bcf86cd799439012' } })) };
    else if (route === '/favorites/add' || route === '/favorites/remove') {
      window.actionRequests.push([route, body.productId]); await new Promise(resolve => setTimeout(resolve, 1500));
      if (window.failFavorite) return new Response(JSON.stringify({ message: 'Simulated failure' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      if (route.endsWith('/add')) favorites.add(body.productId); else favorites.delete(body.productId);
    } else if (route === '/favorites/clear') {
      window.actionRequests.push([route]); await new Promise(resolve => setTimeout(resolve, 1500)); favorites.clear();
    } else if (route === '/cart/clear') {
      window.actionRequests.push([route]); await new Promise(resolve => setTimeout(resolve, 1500)); cart.clear(); data = { cart: { items: items() } };
    } else if (route === '/cart/update' || route === '/cart/remove') {
      window.actionRequests.push([route, body.productId, body.quantity]); await new Promise(resolve => setTimeout(resolve, 1000));
      if (route.endsWith('/remove')) cart.delete(body.productId); else cart.set(body.productId, body.quantity); data = { cart: { items: items() } };
    } else if (route === '/cart/add') {
      window.actionRequests.push([route, body.productId]); await new Promise(resolve => setTimeout(resolve, 1500));
      cart.set(body.productId, (cart.get(body.productId) || 0) + body.quantity); data = { cart: { items: items() } };
    } else if (route === '/cart') data = { cart: { items: items() }, minimumOrderValue: 1 };
    else if (route === '/orders/create') { window.actionRequests.push([route,body]); window.placedOrders=(window.placedOrders||0)+1;cart.clear();return new Response(JSON.stringify({order:{_id:'fixture-order'}}),{status:201,headers:{'Content-Type':'application/json'}}); }
    else if (route === '/orders') data={orders:[]};
    else if (route === '/users/me') data = { user: JSON.parse(localStorage.getItem('user')) };
    else if (route === '/departments') data = { departments: [{ _id: 'dept', name: 'Grocery', active: true }] };
    else if (route === '/categories') data = { categories: [{ _id: 'category', name: 'Grocery', department: 'dept' }] };
    else if (route === '/slideshows') data = { slides: [1, 2, 3].map(id => ({ _id: String(id), image: 'http://127.0.0.1:4175/fixture.svg?slide=' + id, active: true, order: id })) };
    if (route.startsWith('/cart') && window.deliveryRules) {
      data.minimumOrderValue = window.deliveryRules.minimumCheckoutAmount;
      data.pricing = { deliveryRules: window.deliveryRules };
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
};
(async () => {
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(evidence, 'ui-ux-chrome-'));
  const chrome = spawn(process.env.BSTORE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket, id = 0; const callbacks = new Map(), errors = [], checks = [];
  try {
    let tabs;
    for (let attempt = 0; attempt < 60; attempt++) { try { const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]; tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); break; } catch { await wait(200); } }
    assert.ok(tabs?.some(tab=>tab.type==='page'), 'Headless Chrome must expose a page');
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const pair = callbacks.get(message.id); callbacks.delete(message.id); message.error ? pair.reject(Error(JSON.stringify(message.error))) : pair.resolve(message.result); } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails); });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; callbacks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const until = async expression => { for (let n = 0; n < 100; n++) { if (await evaluate(expression)) return; await wait(100); } throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText')); };
    const clickDialog = async text => { await until(` [...document.querySelectorAll('[role="dialog"] [role="button"]')].some(e=>e.textContent===${JSON.stringify(text)}) `); return evaluate(`(() => { const e=[...document.querySelectorAll('[role="dialog"] [role="button"]')].find(e=>e.textContent===${JSON.stringify(text)}); if(!e)throw Error('Missing dialog action');e.click(); })()`); };
    const clickText = text => evaluate(`(() => { const e = [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent === ${JSON.stringify(text)} && e.getBoundingClientRect().height); if (!e) throw Error('Missing text'); e.closest('[tabindex]')?.click(); })()`);
    const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(evidence, name + '.png'), Buffer.from(result.data, 'base64')); };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 1, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + mock.toString() + ')()' });
    await send('Page.navigate', { url: 'http://127.0.0.1:4175/' });
    await until(`document.body && document.body.innerText.includes('Test Almonds')`);
    await evaluate(`window.ui = selector => [...document.querySelectorAll(selector)].find(e => e.getBoundingClientRect().width && !e.closest('[aria-hidden="true"]')); void 0`);
    await evaluate(`window.homeMarker = [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent === 'Top Selling'); void 0`);
    assert.ok(await evaluate(`document.body.innerText.includes('$8.00') && document.body.innerText.includes('20% OFF')`)); checks.push('Home offer pricing renders');
    for (const width of [320,360,412]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true}); await wait(150);
      const offerGeometry=await evaluate(`(()=>{const n=window.ui('[data-testid="home-offers"]'),label=[...n.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent==='LIMITED DEAL'&&!e.closest('[aria-hidden="true"]')),info=label.parentElement,card=info.parentElement,white=card.children[0],slot=white.children[0];return {card:card.getBoundingClientRect().width,white:white.getBoundingClientRect().width,info:info.getBoundingClientRect().width,image:slot.getBoundingClientRect().width,overflow:info.scrollWidth>info.clientWidth||info.scrollHeight>info.clientHeight};})()`);
      assert.ok(Math.abs(offerGeometry.white-offerGeometry.info)<1,JSON.stringify(offerGeometry));
      assert.ok(Math.abs(offerGeometry.image-offerGeometry.card*.43)<1,JSON.stringify(offerGeometry));
      assert.equal(offerGeometry.overflow,false,JSON.stringify(offerGeometry));
      assert.equal(await evaluate(`(()=>{const n=window.ui('[data-testid="home-top-selling"]'),text=[...n.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent==='20% OFF'),badge=text.parentElement,image=badge.parentElement,b=badge.getBoundingClientRect(),r=image.getBoundingClientRect();return Math.abs(b.top-r.top-6)<1&&b.bottom<=r.bottom&&r.height===145;})()`),true);
      const geometry=await evaluate(`(()=>{const ids=['home-categories','home-top-selling','home-recently-added','home-offers'];return ids.map(id=>{const e=window.ui('[data-testid="'+id+'"]'),r=e.getBoundingClientRect(),h=e.firstElementChild.getBoundingClientRect(),c=e.children[1].getBoundingClientRect();return {top:r.top,bottom:r.bottom,titleGap:c.top-h.bottom,contentBottom:c.bottom};});})()`);
      assert.ok(geometry.every(g=>Math.abs(g.titleGap-10)<1),JSON.stringify(geometry));
      const gaps=geometry.slice(1).map((g,i)=>g.top-geometry[i].bottom); assert.ok(gaps.every(g=>Math.abs(g-24)<1),JSON.stringify(gaps));
      const visualGaps=geometry.slice(1).map((g,i)=>g.top-geometry[i].contentBottom+4);assert.ok(visualGaps.every(g=>Math.abs(g-28)<1),JSON.stringify(visualGaps));
      assert.equal(await evaluate(`!!window.ui('[data-testid="home-recently-added"]').querySelector('[aria-label^="Add "]')`),false);
      assert.equal(await evaluate(`(()=>{const n=window.ui('[data-testid="home-offers"]'),label=[...n.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent==='LIMITED DEAL');return getComputedStyle(label.parentElement).backgroundColor==='rgb(255, 240, 232)'&&getComputedStyle(label.nextElementSibling).color==='rgb(23, 23, 23)';})()`),true);
    }
    checks.push('Offers backgrounds are equal halves and image canvas remains 43% of card at 320/360/412px; Top Selling badge top inset stays inside unchanged image');
    checks.push('Home effective section gaps 24px, title gaps 10px at 320/360/412px; Recently Added has no cart button; Offers has cream promo panel and dark text');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});

    await wait(400);
    await screenshot('customer-home');
    await evaluate(`window.mainPager = [...document.querySelectorAll('div')].find(e => getComputedStyle(e).overflowX === 'auto' && e.querySelector('img[src*="slide="]')); window.slideSource = () => { const p=window.mainPager.getBoundingClientRect(); return [...window.mainPager.querySelectorAll('img')].find(i => { const r=i.getBoundingClientRect(); return Math.abs(r.left-p.left)<3; })?.src; }; void 0`);
    const originalSlide = await evaluate('window.slideSource()');
    const mainRect = await evaluate(`(() => { const r=window.mainPager.getBoundingClientRect(); return {x:r.right-40,y:r.top+100}; })()`);
    const initialOffset = await evaluate('window.mainPager.scrollLeft');
    await send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[mainRect]});
    for(let step=1;step<=8;step++) { await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mainRect.x-step*32,y:mainRect.y}]}); await wait(35); }
    assert.ok(await evaluate('window.mainPager.scrollLeft') > initialOffset + 100, 'Main image must track the finger before release');
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await wait(600);
    assert.notEqual(await evaluate('window.slideSource()'), originalSlide);
    const manualSlide = await evaluate('window.slideSource()'); await wait(3900);
    assert.notEqual(await evaluate('window.slideSource()'),manualSlide);
    checks.push('Main carousel follows finger, snaps and resumes autoplay after manual swipe');

    for (const destination of ['Favorites', 'Cart', 'Settings']) {
      await clickText(destination); await until(`location.pathname === '/${destination.toLowerCase()}'`); await wait(300);
      await evaluate(`[...document.querySelectorAll('[tabindex="0"]')].find(e => e.getBoundingClientRect().height && !e.closest('[aria-hidden="true"]')).click()`);
      await until(`location.pathname === '/'`);
      assert.equal(await evaluate('window.homeMarker.isConnected'), true); checks.push(destination + ' back retains Home');
    }
    await evaluate(`[...document.querySelectorAll('[tabindex="0"]')].find(e => e.getBoundingClientRect().height && !e.closest('[aria-hidden="true"]')).click()`);
    await until(`location.pathname === '/account'`); await wait(300);
    assert.equal(await evaluate(`document.body.innerText.includes('App settings and preferences')`), false);
    await evaluate(`[...document.querySelectorAll('[tabindex="0"]')].find(e => e.getBoundingClientRect().height && !e.closest('[aria-hidden="true"]')).click()`);
    await until(`location.pathname === '/'`); assert.equal(await evaluate('window.homeMarker.isConnected'), true);
    checks.push('Account back retains Home; Settings row removed');
    await evaluate(`window.offerText = () => [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent === 'LIMITED DEAL' && !e.closest('[aria-hidden="true"]')).parentElement.parentElement; window.offerText().scrollIntoView({ block: 'center' }); void 0`);
    await wait(200);
    const beforeOffer = await evaluate('window.offerText().innerText');
    const rect = await evaluate(`(() => {const r = window.offerText().getBoundingClientRect(); return { x: r.x + r.width * 0.75, y: r.y + r.height / 2 };})()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y }] });
    for (let step = 1; step <= 8; step++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x - step * 32, y: rect.y }] }); await wait(35); }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(600);
    assert.notEqual(await evaluate('window.offerText().innerText'), beforeOffer);
    assert.equal(await evaluate('location.pathname'), '/');
    checks.push('Offers touch swipe changes product and does not trigger product navigation');
    const swipedOffer = await evaluate('window.offerText().innerText');
    await until(`window.offerText().innerText !== ${JSON.stringify(swipedOffer)}`);
    checks.push('Offers autoplay resumes after manual swipe');
    await clickText('Search'); await until(`!!document.querySelector('input')`);
    await evaluate(`(() => { const input = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Test'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await until(`!!window.ui('[aria-label="Add Test Biscuits to favorites"]')`);
    await evaluate(`window.ui('[aria-label="Add Test Biscuits to favorites"]').click()`);
    await until(`!!window.ui('[aria-label="Remove Test Biscuits from favorites"]')`);
    assert.equal(await evaluate(`window.ui('[aria-label="Remove Test Biscuits from favorites"]').getAttribute('aria-disabled')`), 'true');
    checks.push('Search heart changes during delayed network request');
    assert.equal(await evaluate('document.body.innerText.includes("Find your favorites")'), false);
    await evaluate(`window.ui('[aria-label="Add Test Almonds to cart"]').click(); window.ui('[aria-label="Add Test Almonds to cart"]').click()`);
    assert.notEqual(await evaluate(`window.ui('[aria-label="Add Test Biscuits to cart"]').getAttribute('aria-disabled')`), 'true');
    await evaluate(`window.ui('[aria-label="Add Test Biscuits to cart"]').click()`);
    assert.equal(await evaluate('document.body.innerText.includes("Adding...")'), false);
    assert.equal(await evaluate(`!!window.ui('[aria-label="Open cart, 2 items"]')`), true);
    await wait(5000);
    assert.equal(await evaluate(`window.actionRequests.filter(([p,id]) => p === '/cart/add' && id === 'A').length`), 1);
    assert.equal(await evaluate(`window.actionRequests.filter(([p,id]) => p === '/cart/add' && id === 'B').length`), 1);
    assert.equal(await evaluate('location.pathname'), '/search');
    assert.equal(await evaluate('document.activeElement.tagName'), 'INPUT');
    checks.push('Independent cart buttons, duplicate suppression, retained Search and keyboard focus');
    await screenshot('customer-search');
    for (const width of [320, 360, 412]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 915, deviceScaleFactor: 1, mobile: true }); await wait(300);
      const layout = await evaluate(`(() => {
        const b = window.ui('[aria-label="Add Test Almonds to cart"]');
        const price = [...b.parentElement.querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent === '$8.00');
        if (!price) throw Error('Price not found: '+b.parentElement.outerHTML.slice(0,2500));
        const a=b.getBoundingClientRect(), p=price.parentElement.parentElement.getBoundingClientRect();
        return { unclipped: [...price.parentElement.children].every(e => e.scrollWidth <= e.clientWidth + 1), row: b.parentElement === price.parentElement.parentElement.parentElement, noOverlap: p.right <= a.left, centered: Math.abs((p.top+p.bottom)/2 - (a.top+a.bottom)/2) < 2, width: innerWidth };
      })()`);
      assert.ok(layout.noOverlap && layout.centered && layout.unclipped, JSON.stringify(layout));
      await screenshot('customer-search-' + width);
    }
    checks.push('Search price and cart button share row without overlap at 320/360/412px');
    await evaluate(`window.failFavorite = true; window.ui('[aria-label="Remove Test Biscuits from favorites"]').click()`);
    await until(`!!window.ui('[aria-label="Add Test Biscuits to favorites"]')`);
    await until(`!!window.ui('[aria-label="Remove Test Biscuits from favorites"]')`);
    assert.equal(await evaluate(`!!window.ui('[aria-label="Remove Test Biscuits from favorites"]')`), true);
    checks.push('Search removal is immediate and server failure restores the selected heart');
    await evaluate(`window.failFavorite = false; window.ui('[aria-label="Open cart, 2 items"]').click()`);
    await until(`location.pathname === '/cart' && !!window.ui('[aria-label="Test Almonds quantity"]')`);
    await evaluate(`window.ui('[aria-label="Increase Test Almonds quantity"]').click(); window.ui('[aria-label="Increase Test Almonds quantity"]').click()`);
    await until(`window.ui('[aria-label="Test Almonds quantity"]').value === '3'`);
    assert.equal(await evaluate(`window.actionRequests.filter(([p])=>p==='/cart/update').length`), 1);
    assert.equal(await evaluate(`window.ui('[aria-label="Test Biscuits quantity"]').disabled`), false);
    await wait(2500);
    await evaluate(`window.ui('[aria-label="Decrease Test Almonds quantity"]').click()`);
    await until(`window.ui('[aria-label="Test Almonds quantity"]').value === '2'`);
    await wait(1200);
    await evaluate(`(() => { const input=window.ui('[aria-label="Test Almonds quantity"]'); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'7'); input.dispatchEvent(new Event('input',{bubbles:true})); input.blur(); })()`);
    await until(`window.ui('[aria-label="Test Almonds quantity"]').value === '7'`);
    await wait(1300);
    assert.equal(await evaluate(`window.actionRequests.filter(([p,id,q])=>p==='/cart/update' && id==='A' && q===7).length`), 1);
    checks.push('Cart +/- updates immediately; manual quantity commits on blur once without Done');
    await evaluate(`window.ui('[aria-label="Remove Test Biscuits from cart"]').click()`);
    await until(`!window.ui('[aria-label="Test Biscuits quantity"]')`);
    checks.push('Remove from Cart removes the row immediately');
    await wait(1200);
    await clickText('Checkout'); await until(`location.pathname==='/checkout'&&document.body.innerText.includes('Place Order')`);
    await until(`!!window.ui('img[src*="fixture.svg"]')`);
    assert.equal(await evaluate(`document.body.innerText.includes('$56.00')`),true);
    assert.equal(await evaluate(`(()=>{let i=window.ui('img[src*="fixture.svg"]');while(i){const r=i.getBoundingClientRect();if(Math.abs(r.width-48)<1&&Math.abs(r.height-48)<1&&getComputedStyle(i).backgroundColor==='rgb(255, 255, 255)')return true;i=i.parentElement;}return false;})()`),true);
    assert.equal(await evaluate(`window.actionRequests.some(([p])=>p==='/orders')`),false);
    checks.push('Checkout renders framed white product image, unchanged $56 total and Place Order without submitting an order');
    await evaluate(`[...document.querySelectorAll('[tabindex="0"]')].find(e=>e.getBoundingClientRect().height&&!e.closest('[aria-hidden="true"]')).click()`);
    await until(`location.pathname==='/cart'&&!!window.ui('[aria-label="Test Almonds quantity"]')`);

    await evaluate(`window.confirm=()=>{throw Error('Raw confirm must not be called')}`); await clickText('Clear Cart');
    await until(`document.body.innerText.includes('Clear Cart?')`); await clickDialog('Cancel');
    assert.equal(await evaluate(`!!window.ui('[aria-label="Test Almonds quantity"]')`), true);
    await clickText('Clear Cart'); await until(`document.body.innerText.includes('Clear Cart?')`); await clickDialog('Clear Cart');
    await until(`!window.ui('[aria-label="Test Almonds quantity"]')`);
    await wait(1800);
    checks.push('Clear Cart requires confirmation and empties immediately');
    await evaluate(`[...document.querySelectorAll('[tabindex="0"]')].find(e=>e.getBoundingClientRect().height && !e.closest('[aria-hidden="true"]')).click()`);
    await until(`location.pathname==='/search'`);
    await evaluate(`window.ui('[aria-label="Go back"]').click()`);
    await until(`location.pathname==='/'`); await clickText('Favorites');
    await until(`location.pathname==='/favorites' && document.body.innerText.includes('2 favorites')`);
    assert.equal(await evaluate(`!!window.ui('[aria-label="Open cart, 0 items"]')`), true);
    assert.equal(await evaluate(`/507f191e810c19729de860ea|507f1f77bcf86cd799439012/.test(document.body.innerText)`),false);
    await evaluate(`window.ui('[aria-label="Add Test Almonds to cart"]').click();window.ui('[aria-label="Add Test Almonds to cart"]').click()`);
    await until(`!!window.ui('[aria-label="Open cart, 1 items"]')`);
    assert.equal(await evaluate(`getComputedStyle(window.ui('[aria-label="Add Test Almonds to cart"]')).backgroundColor`),'rgb(23, 23, 23)');
    assert.equal(await evaluate(`location.pathname`),'/favorites');
    checks.push('Favorites reference IDs absent; Add to Cart stays black during delayed request, remains on Favorites and updates badge immediately');
    await wait(1800);
    await evaluate(`window.ui('[aria-label="Open cart, 1 items"]').click()`);await until(`location.pathname==='/cart'`);
    await clickText('Checkout');await until(`location.pathname==='/checkout'&&document.body.innerText.includes('Place Order')`);
    await clickText('Place Order');await clickText('Place Order');
    await until(`!!document.querySelector('[role="dialog"]')&&document.body.innerText.includes('Order Placed')`);
    assert.equal(await evaluate(`window.placedOrders`),1);
    assert.equal(await evaluate(`[...document.querySelector('[role="dialog"]').querySelectorAll('*')].some(e=>getComputedStyle(e).fontFamily.toLowerCase().includes('ionicons'))`),false);
    assert.equal(await evaluate(`location.pathname`),'/checkout');await clickDialog('OK');await until(`location.pathname==='/orders'`);
    checks.push('One mocked successful order shows icon-free themed Order Placed dialog, then acknowledges to Orders');
    await evaluate(`history.back()`);await until(`location.pathname==='/cart'`);
    await evaluate(`history.back()`);await until(`location.pathname==='/favorites'&&document.body.innerText.includes('2 favorites')`);

    await clickText('Clear Favorites'); await until(`document.body.innerText.includes('Clear Favorites?')`); await clickText('Cancel');
    assert.equal(await evaluate(`document.body.innerText.includes('2 favorites')`), true);
    await clickText('Clear Favorites'); await until(`document.body.innerText.includes('Clear Favorites?')`); await clickDialog('Clear Favorites');
    await until(`document.body.innerText.includes('0 favorites')`);
    await wait(1800);
    checks.push('Favorites live count and zero cart badge track clears; Clear Favorites requires confirmation and empties immediately');
    for(const [quantity,threshold,message,total,fee] of [
      [2,100,'Add $14.00 more to reach the minimum order.',16,null],
      [4,100,'Add $68.00 more to get FREE delivery.',37,5],
      [4,32,"You've got FREE delivery!",32,0],
      [13,100,"You've got FREE delivery!",104,0]]) {
      await evaluate(`window.deliveryFixture(${quantity},{priceClass:'C',minimumCheckoutAmount:30,freeDeliveryThreshold:${threshold},deliveryFeeBelowThreshold:5})`);
      await evaluate(`window.ui('[aria-label^="Open cart,"]').click()`);
      await until(`location.pathname==='/cart'&&document.body.innerText.includes('$${total.toFixed(2)}')`);
      if(quantity===2)assert.ok(await evaluate(`document.body.innerText.includes('more to reach the minimum order.')&&!document.body.innerText.includes('enjoy FREE delivery')`));
      else {
        assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(message)})&&document.body.innerText.includes('Products subtotal')&&document.body.innerText.includes('Delivery')&&document.body.innerText.includes(${JSON.stringify(fee?'$5.00':'FREE')})&&document.querySelectorAll('[role="progressbar"]').length===2`));
        await clickText('Checkout');await until(`location.pathname==='/checkout'&&document.body.innerText.includes(${JSON.stringify(message.replace('to get FREE delivery','to enjoy FREE delivery'))})`);
        assert.ok(await evaluate(`document.body.innerText.includes('$${total.toFixed(2)}')&&document.body.innerText.includes(${JSON.stringify(fee?'Delivery: $5.00':'Delivery: FREE')})`));
        await evaluate('history.back()');await until(`location.pathname==='/cart'`);
      }
      await evaluate('history.back()');await until(`location.pathname==='/favorites'`);
    }
    checks.push('Class C Cart/Checkout show blocked minimum, paid delivery, exact/above FREE thresholds and matching totals from changed server rules');
    await send('Page.navigate',{url:'http://127.0.0.1:4175/account'});await until(`document.body.innerText.includes('Logout')`);
    await clickText('Logout');await until(`!!document.querySelector('[role="dialog"]')`);
    assert.equal(await evaluate(`location.pathname==='/account'&&document.body.innerText.includes('Logout')`),true);await clickDialog('Cancel');
    assert.equal(await evaluate(`location.pathname==='/account'&&document.body.innerText.includes('Logout')`),true);
    await clickText('Logout');await until(`!!document.querySelector('[role="dialog"]')`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(400);
    assert.equal(await evaluate(`location.pathname==='/account'&&document.body.innerText.includes('Logout')&&!document.querySelector('[role="dialog"]')`),true);
    await clickText('Logout');await clickDialog('Log Out');await until(`location.pathname!=='/account'&&!document.body.innerText.includes('Logout')`);
    checks.push('Account themed Logout: tap/Cancel/Escape retain session, explicit Log Out clears existing session');
    assert.equal(errors.length, 0, JSON.stringify(errors));
    fs.writeFileSync(path.join(evidence, 'ui-ux-browser-results.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }, null, 2));
    await send('Browser.close');
  } finally { socket?.close(); chrome.kill(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
