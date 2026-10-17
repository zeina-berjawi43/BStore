const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
// Validate an existing Expo web export; never builds native apps or contacts the API.
const evidence = path.resolve(__dirname, '../.navigation-check');
fs.mkdirSync(evidence, { recursive: true });
const root = process.env.BSTORE_WEB_EXPORT ? path.resolve(process.env.BSTORE_WEB_EXPORT) : path.join(evidence, 'web');
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
  sessionStorage.setItem('mystore.auth.v1',JSON.stringify({accessToken:jwt,refreshToken:'smoke-refresh'})); localStorage.setItem('accessToken', jwt); localStorage.setItem('refreshToken', 'smoke-refresh');
  localStorage.setItem('user', JSON.stringify({ _id: 'customer', name: 'Test Customer', phone: '71000000', role: 'customer', phoneVerified: true, address: 'Fixture address' }));
  localStorage.setItem('isLoggedIn', 'true');
  window.catalogReads=0; const products = [
    { _id: 'A', name: 'Test Almonds', price: 10, discount: 20, discountedPrice: 8, availability: true, category: { _id: 'category', name: 'Grocery' } },
    { _id: 'B', name: 'Test Biscuits', price: 12, discount: 0, discountedPrice: 12, availability: true, category: { _id: 'category', name: 'Grocery' } },
    { _id: 'C', name: 'Test Coffee', price: 20, discount: 10, discountedPrice: 18, availability: true, category: { _id: 'category', name: 'Grocery' } },
  ];
  products.forEach(p => { p.image = 'http://127.0.0.1:4175/fixture.svg'; p.imageFrame = { zoom: 1.2, x: 0.4, y: 0 }; });
  const favorites = new Set(['A']); const cart = new Map(); window.actionRequests = [];
  window.deliveryFixture = (quantity, rules) => { cart.clear(); cart.set('A', quantity); window.deliveryRules = rules; };
  if(location.search.includes('guest=true')) {sessionStorage.removeItem('mystore.auth.v1');localStorage.removeItem('accessToken');localStorage.removeItem('refreshToken');localStorage.removeItem('isLoggedIn');localStorage.removeItem('user');}
  window.offerCount=8;window.fixtureRequests=[];
  const originalFetch = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('mystore-backend')) return originalFetch(input, options);
    const route = new URL(url).pathname, body = options.body ? JSON.parse(options.body) : {};
    window.fixtureRequests.push(route);
    if(window.refreshDelay)await new Promise(resolve=>setTimeout(resolve,window.refreshDelay));
    if(window.failSlide&&route==='/slideshows')throw Error('Fixture slideshow failure');
    let data = {};
    const items = () => [...cart].map(([id, quantity]) => ({ _id: id, product: products.find(p => p._id === id), quantity }));
    if (route === '/auth/login') data={accessToken:jwt,refreshToken:'new-fixture-refresh',user:{_id:'customer',name:'Test Customer',phone:'71000000',role:'customer',phoneVerified:true,address:'Fixture address'}};
    else if (route === '/products') { window.catalogReads++; data = { products }; }
    else if (route === '/products/top-selling') data = { products: products.map(product => ({ product, totalSold: 10 })) };
    else if (route === '/products/offers') data = { products: Array.from({length:window.offerCount},(_,i)=>({...products[0],_id:'offer-'+i,name:'Offer '+i})) };
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
    else if (route.startsWith('/orders/')) data={order:{_id:route.split('/').pop(),orderNumber:123,user:{name:'Test Customer',phone:'71000000'},items:[],totalPrice:0,status:'Delivered',shippingAddress:'Fixture address',createdAt:'2026-10-01T00:00:00Z'}};
    else if (route === '/users/me') data = { user: JSON.parse(localStorage.getItem('user')) };
    else if (route === '/departments') data = { departments: [{ _id: 'dept', name: 'Grocery', active: true }] };
    else if (route === '/departments/dept/categories') data = { categories: [{ _id: 'category', name: 'Pantry', department: 'dept' }] };
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
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 450, deviceScaleFactor: 1, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + mock.toString() + ')()' });
    await send('Page.navigate', { url: 'http://127.0.0.1:4175/' });
    await until(`document.body && document.body.innerText.includes('Test Almonds')`);

    const refresh = async () => {
      await evaluate(`document.querySelector('[data-testid="home-scroll"]').scrollTop=0`);
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:40}]});
      for(const y of [60,90,120,150])await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    const waitRefresh = () => until(`!document.querySelector('[aria-label="Refreshing Home"]')`);
    await until(`document.querySelectorAll('[data-testid="offer-pagination"] [aria-label^="Offer "]').length===8`);
    for(const width of [320,412,1024]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:width<500});await wait(250);
      assert.equal(await evaluate(`document.querySelectorAll('[data-testid="offer-pagination"] [aria-label^="Offer "]').length`),8);
      await evaluate(`window.offerPager=[...document.querySelectorAll('[data-testid="home-offers"] div')].find(e=>getComputedStyle(e).overflowX==='auto');window.offerPager.scrollLeft=window.offerPager.clientWidth*8;true;`);
      await until(`document.querySelector('[aria-label="Offer 8 of 8"]').getAttribute('aria-selected')==='true'`);
    }
    checks.push('Eight offer dots, selected last page and resize at 320/412/1024 widths');
    for(const count of [1,0,8]) {
      await evaluate(`window.offerCount=${count}`);await refresh();await waitRefresh();
      await until(`document.querySelectorAll('[data-testid="offer-pagination"] [aria-label^="Offer "]').length===${count}`);
    }
    checks.push('Dynamic offer counts 8 > 1 > 0 > 8 reset pagination safely');
    await evaluate(`window.slideshowPager=()=>[...document.querySelectorAll('[data-testid="home-slideshow"] div')].find(e=>getComputedStyle(e).overflowX==='auto');window.oldPager=window.slideshowPager();window.oldPager.scrollLeft=window.oldPager.clientWidth*2;true;`);
    await wait(300);
    await evaluate('window.refreshDelay=650;window.fixtureRequests=[]');await refresh();
    await until(`!!document.querySelector('[aria-label="Refreshing Home"]')`);
    await refresh();await waitRefresh();
    assert.ok(await evaluate(`!window.oldPager.isConnected&&Math.abs(window.slideshowPager().scrollLeft-window.slideshowPager().clientWidth)<2`));
    assert.equal(await evaluate(`window.fixtureRequests.filter(p=>p==='/slideshows').length`),1);
    checks.push('Refresh animates, deduplicates concurrent pulls and resets the slideshow to banner one on success');
    await evaluate(`window.oldPager=window.slideshowPager();window.oldPager.scrollLeft=window.oldPager.clientWidth*2;window.failSlide=true;true;`);await wait(300);
    await refresh();await waitRefresh();
    assert.ok(await evaluate(`window.oldPager.isConnected&&Math.abs(window.oldPager.scrollLeft-window.oldPager.clientWidth*2)<2`));
    assert.ok(await evaluate(`document.body.innerText.includes('Some Home content could not be refreshed.')&&document.body.innerText.includes('Test Almonds')`));
    checks.push('Failed refresh retains the slideshow position and cached content, with failure feedback');
    const attempts=await evaluate(`window.fixtureRequests.filter(p=>p==='/slideshows').length`);
    await evaluate(`window.failSlide=false;[...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent.includes('Tap to retry.')).click()`);
    await until(`!document.body.innerText.includes('Tap to retry.')&&!document.querySelector('[aria-label="Refreshing Home"]')`);
    assert.equal(await evaluate(`window.fixtureRequests.filter(p=>p==='/slideshows').length`),attempts+1);
    checks.push('Retry repeats the failed real section request and clears error only after success');
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(evidence,'phase3-browser-results.json'),JSON.stringify({checks,errors},null,2));
    console.log(JSON.stringify({checks,errors},null,2));
  } finally { socket?.close();chrome.kill();server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
