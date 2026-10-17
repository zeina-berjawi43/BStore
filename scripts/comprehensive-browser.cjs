const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
// Validate an existing Expo web export; never builds native apps or contacts the API.
const evidence = path.resolve(__dirname, '../.comprehensive-audit');
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
  window.catalogReads=0; window.categoryReads=0; const products=Array.from({length:600},(_,i)=>({_id:'P'+i,name:'Product '+i,price:10,discount:20,discountedPrice:8,availability:true,category:{_id:i%2?'hair':'shampoo',name:i%2?'Hair Care':'Shampoo'},brand:{name:'Fixture'}}));
  products.forEach(p => { p.image = 'http://127.0.0.1:4175/fixture.svg'; p.imageFrame = { zoom: 1.2, x: 0.4, y: 0 }; });
  const realNow=Date.now;window.catalogClockOffset=0;Date.now=()=>realNow()+window.catalogClockOffset;
  window.changeCatalog=()=>{products[0]={...products[0],name:'Updated Shampoo'};};
  window.networkOffline=location.search.includes('offline=true');
  window.offerOffline=location.search.includes('offerOffline=true');
  window.emptyOffers=location.search.includes('emptyOffers=true');
  if(location.search.includes('slow=true'))window.catalogDelay=1200;
  const favorites = new Set(['P0']); const cart = new Map(); window.actionRequests = [];
  window.deliveryFixture = (quantity, rules) => { cart.clear(); cart.set('A', quantity); window.deliveryRules = rules; };
  if(location.search.includes('guest=true')) {sessionStorage.removeItem('mystore.auth.v1');localStorage.removeItem('accessToken');localStorage.removeItem('refreshToken');localStorage.removeItem('isLoggedIn');localStorage.removeItem('user');}
  const originalFetch = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('mystore-backend')) return originalFetch(input, options);
    const route = new URL(url).pathname, body = options.body ? JSON.parse(options.body) : {};
    if (route.startsWith('/products/') && !route.endsWith('/offers') && !route.endsWith('/top-selling')) await new Promise(resolve => setTimeout(resolve, window.detailsDelay || 0));
    if(route==='/products'||route.includes('/categories')){
      await new Promise(resolve=>setTimeout(resolve,window.catalogDelay||0));
      if(window.networkOffline)throw Error('Fixture offline');
    }
    let data = {};
    const items = () => [...cart].map(([id, quantity]) => ({ _id: id, product: products.find(p => p._id === id), quantity }));
    if (route === '/auth/login') data={accessToken:jwt,refreshToken:'new-fixture-refresh',user:{_id:'customer',name:'Test Customer',phone:'71000000',role:'customer',phoneVerified:true,address:'Fixture address'}};
    else if (route === '/products') { window.catalogReads++; data = { products }; }
    else if (route === '/products/top-selling') data = { products: products.map(product => ({ product, totalSold: 10 })) };
    else if (route === '/products/offers') { if(window.offerOffline)throw Error('Fixture offers offline');data = { products: window.emptyOffers?[]:products.filter(p => p.discount) }; }
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
    else if (route === '/departments') data = { departments: [{ _id: 'dept', name: 'Personal Care', active: true }] };
    else if (route === '/departments/dept/categories') {window.categoryReads++;data = { categories: [{ _id: 'shampoo', name: 'Shampoo', department: 'dept' },{ _id: 'hair', name: 'Hair Care', department: 'dept' }] };}
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
    const click=text=>evaluate(`[...document.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent===${JSON.stringify(text)}&&!e.closest('[aria-hidden="true"]'))?.closest('[tabindex]')?.click()`);
    const visible=selector=>`[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().height)`;
    await send('Page.navigate',{url:'http://127.0.0.1:4175/?guest=true'});
    await until(`document.body&&document.body.innerText.includes('Product 0')&&document.body.innerText.includes('See All')`);
    assert.ok(await evaluate(`!document.body.innerText.includes('No offers available')&&!document.body.innerText.includes('$')`));
    assert.ok(await evaluate(`!document.querySelector('[aria-label="Refresh Home"]')&&!/\bEXPLORE\b|SPECIAL DEALS/.test(document.body.innerText)`));
    await click('See All');await until(`location.pathname==='/offers'&&document.body.innerText.includes('600 products')`);
    assert.ok(await evaluate(`!document.body.innerText.includes('$')`));
    for(const width of [320,1024]){await send('Emulation.setDeviceMetricsOverride',{width,height:700,deviceScaleFactor:1,mobile:width<500});await wait(250);assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`));}
    checks.push('Anonymous Home offers and all-offers direct browsing show real products without prices, at 320/1024px');
    await send('Page.navigate',{url:'http://127.0.0.1:4175/offers?guest=true'});await until(`document.body&&document.body.innerText.includes('600 products')`);
    for(let n=0;n<80;n++) {
      await evaluate(`(()=>{const scroll=[...document.querySelectorAll('div')].find(e=>!e.closest('[aria-hidden="true"]')&&e.clientHeight>0&&getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight);scroll.scrollTop=scroll.scrollHeight;})()`);await wait(150);
      if(await evaluate(`document.body.innerText.includes('Product 599')`))break;
    }
    await until(`document.body.innerText.includes('Product 599')`);
    assert.ok(await evaluate(`!document.body.innerText.includes('$')`));checks.push('Direct all-offers URL survives cold load anonymously; final offer remains reachable');
    await evaluate(`${visible('[aria-label^="Open cart,"]')}.click()`);await until(`location.pathname==='/login'`);
    await evaluate(`(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [placeholder,value]of [['Phone Number','71000000'],['Enter your password','fixture-password']]){const node=document.querySelector('input[placeholder="'+placeholder+'"]');if(!node)throw Error('Missing '+placeholder);setter.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
    await click('Login');await until(`location.pathname==='/'&&document.body.innerText.includes('Product 0')`);
    assert.equal(await evaluate(`document.querySelectorAll('[role="progressbar"]').length`),0);
    await evaluate('history.back()');await until(`['/','/offers'].includes(location.pathname)`);assert.ok(await evaluate(`!document.body.innerText.includes('Enter your password')`));
    checks.push('Protected cart login opens Home and Back excludes Login');
    await send('Page.navigate',{url:'http://127.0.0.1:4175/'});await until(`document.body&&document.body.innerText.includes('Product 0')`);
    await evaluate(`window.homeScroll=[...document.querySelectorAll('div')].find(e=>!e.closest('[aria-hidden="true"]')&&e.clientHeight>0&&getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight);window.homeScroll.scrollTop=180`);await wait(150);
    const homePosition=await evaluate(`window.homeScroll.scrollTop`);assert.ok(homePosition>100);
    await click('Personal Care');await until(`location.pathname==='/department-categories'&&document.body.innerText.includes('600 products')`);
    const rect=await evaluate(`document.querySelector('[data-testid="catalog-header"]').getBoundingClientRect().top`);
    await evaluate(`([...document.querySelectorAll('div')].find(e=>!e.closest('[aria-hidden="true"]')&&e.clientHeight>0&&getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight)).scrollTop=950`);await wait(250);
    assert.ok(await evaluate(`([...document.querySelectorAll('div')].find(e=>!e.closest('[aria-hidden="true"]')&&e.clientHeight>0&&getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight)).scrollTop>900`));
    assert.equal(await evaluate(`document.querySelector('[data-testid="catalog-header"]').getBoundingClientRect().top`),rect);
    assert.equal(await evaluate(`window.scrollY`),0);checks.push('Department header and category tabs remain fixed while only the virtual grid scrolls');
    await evaluate('history.back()');await until(`location.pathname==='/'`);
    assert.equal(await evaluate(`window.homeScroll.scrollTop`),homePosition);
    assert.equal(await evaluate('window.scrollY'),0);checks.push('Home scroll is retained without outer-document movement on department entry and exit');
    await click('See All');await until(`location.pathname==='/offers'&&document.body.innerText.includes('Product 0')`);
    const addTop = await evaluate(`${visible('[aria-label="Add Product 0 to cart"]')}.getBoundingClientRect().top`);
    await evaluate(`${visible('[aria-label="Add Product 0 to cart"]')}.click()`);
    await until(`!!${visible('[aria-label="Increase Product 0 quantity"]')}`);
    assert.equal(await evaluate(`${visible('[aria-label="Increase Product 0 quantity"]')}.getBoundingClientRect().top`), addTop);
    checks.push('Quantity selector remains at the exact same vertical position after first add');
    await evaluate(`${visible('[aria-label="Increase Product 0 quantity"]')}.click();${visible('[aria-label="Increase Product 0 quantity"]')}.click();${visible('[aria-label="Decrease Product 0 quantity"]')}.click()`);
    await until(`!!${visible('[aria-label="Open cart, 2 items"]')}`);await wait(3000);
    await evaluate(`${visible('[aria-label="Open cart, 2 items"]')}.click()`);await until(`location.pathname==='/cart'&&!!${visible('[aria-label="Product 0 quantity"]')}`);
    assert.equal(await evaluate(`${visible('[aria-label="Product 0 quantity"]')}.value`),'2');
    await evaluate('history.back()');await until(`location.pathname==='/offers'`);
    await evaluate(`${visible('[aria-label="Decrease Product 0 quantity"]')}.click();${visible('[aria-label="Decrease Product 0 quantity"]')}.click()`);
    await until(`!!${visible('[aria-label="Add Product 0 to cart"]')}`);await wait(1500);
    assert.ok(await evaluate(`!!${visible('[aria-label="Open cart, 0 items"]')}`));checks.push('Rapid inline +/- stays synchronized with Cart and returns to Add at zero');
    await send('Page.navigate',{url:'http://127.0.0.1:4175/department-categories?id=dept&name=Personal%20Care&slow=true'});
    await until(`document.body&&document.body.innerText.includes('Loading products...')`);
    assert.equal(await evaluate(`document.querySelectorAll('[role="progressbar"]').length`),1);
    const headerHeight=await evaluate(`document.querySelector('[data-testid="catalog-header"]').getBoundingClientRect().height`);
    await until(`document.body.innerText.includes('600 products')`);
    assert.equal(await evaluate(`document.querySelector('[data-testid="catalog-header"]').getBoundingClientRect().height`),headerHeight);
    checks.push('Cold department entry has one spinner and stable header height after loading');
    await send('Page.navigate',{url:'http://127.0.0.1:4175/offers?guest=true&offerOffline=true'});
    await until(`document.body&&document.body.innerText.includes('Tap to retry.')`);
    await evaluate(`window.offerOffline=false;[...document.querySelectorAll('[role="button"]')].find(e=>e.textContent.includes('Tap to retry.')).click()`);
    await until(`document.body.innerText.includes('600 products')`);
    await send('Page.navigate',{url:'http://127.0.0.1:4175/offers?guest=true&emptyOffers=true'});
    await until(`document.body&&document.body.innerText.includes('No products found')`);
    assert.ok(await evaluate(`!document.body.innerText.includes('Tap to retry.')&&document.querySelectorAll('[role="progressbar"]').length===0`));
    checks.push('All-offers network failure retries successfully; valid empty response is a settled empty state');
    const login = async()=>{
      await evaluate(`(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [placeholder,value]of [['Phone Number','71000000'],['Enter your password','fixture-password']]){const node=document.querySelector('input[placeholder="'+placeholder+'"]');setter.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
      await click('Login');
    };
    await send('Page.navigate',{url:'http://127.0.0.1:4175/cart?guest=true'});await until(`location.pathname==='/login'`);await login();await until(`location.pathname==='/'&&document.body.innerText.includes('Product 0')`);
    await send('Page.navigate',{url:'http://127.0.0.1:4175/login?guest=true'});await until(`document.body&&document.body.innerText.includes('Enter your phone number')||!!document.querySelector('input[placeholder="Phone Number"]')`);await login();await until(`location.pathname==='/'&&document.body.innerText.includes('Product 0')`);
    checks.push('Cold protected Cart login and direct login both open Home');
    await click('See All'); await until(`location.pathname==='/offers'&&document.body.innerText.includes('Product 1')`);
    assert.equal(await evaluate(`document.body.innerText.split(String.fromCharCode(10)).includes('Products')`), false);
    await evaluate('window.detailsDelay=2500'); await click('Product 1');
    await until(`location.pathname==='/product-details'&&document.body.innerText.includes('Product 1')`);
    assert.ok(await evaluate(`document.body.innerText.includes('$8.00')&&!document.body.innerText.includes('Price unavailable')`));
    await click('Add to Cart'); await until(`!!${visible('[aria-label="Increase Product 1 quantity"]')}`);
    assert.equal(await evaluate(`window.actionRequests.filter(item=>item[0]==='/cart/add'&&item[1]==='P1').length`), 1);
    checks.push('Details immediately retains listing price and first tap shows optimistic quantity before slow revalidation');
    fs.writeFileSync(path.join(evidence,'details.png'), Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(evidence,'comprehensive-browser.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
  } finally {socket?.close();chrome.kill();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
