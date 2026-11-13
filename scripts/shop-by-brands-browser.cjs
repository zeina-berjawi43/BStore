// Browser smoke test for Home "Shop by Brands" against an existing Expo web export.
// Never contacts the real API: every backend call is answered by an in-page fixture.
// Usage: BSTORE_WEB_EXPORT=<export dir> node scripts/shop-by-brands-browser.cjs
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(process.env.BSTORE_WEB_EXPORT || path.join(__dirname, '../dist'));
const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'bstore-brands-'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const PORT = 4176;

const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]);
  if (name.startsWith('/logo/')) {
    if (name.includes('broken')) { res.writeHead(404).end(); return; }
    const hue = name.length * 37 % 360, wide = name.includes('wide');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${wide ? 400 : 200}" height="200"><rect width="100%" height="200" rx="30" fill="hsl(${hue},70%,55%)"/><text x="50%" y="120" font-size="60" text-anchor="middle" fill="#fff">${name.slice(6, 8)}</text></svg>`);
    return;
  }
  let file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

// Runs in the page (guest session: no tokens stored).
const mock = () => {
  const zero = location.search.includes('brands=0');
  const logo = id => `http://127.0.0.1:4176/logo/${id}`;
  const names = ['Nivea', 'Dove', 'Lindt', 'Nestle', 'Ariel', 'Lipton', 'Pringles', 'Garnier', 'Colgate', 'Kinder'];
  const brands = zero ? [] : names.map((name, i) => ({ _id: 'b' + i, name, image: logo((i === 3 ? 'broken' : i === 1 ? 'wide' : 'sq') + i), order: i, updatedAt: '2026-11-01' }));
  const products = Array.from({ length: 40 }, (_, i) => ({ _id: 'P' + i, name: 'Product ' + i, discount: 0, availability: i % 7 !== 0,
    image: logo('sq-p' + i), category: { _id: i % 2 ? 'hair' : 'shampoo', name: i % 2 ? 'Hair Care' : 'Shampoo' },
    brand: { _id: 'b' + (i % 4), name: names[i % 4] } }));
  window.requests = [];
  const originalFetch = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('mystore-backend')) return originalFetch(input, options);
    const route = new URL(url).pathname; window.requests.push(route);
    let data = {};
    if (route === '/brands/home') data = { brands };
    else if (route === '/products') data = { products };
    else if (route === '/products/top-selling') data = { products: [] };
    else if (route === '/products/offers') data = { products: [] };
    else if (route === '/departments') data = { departments: [{ _id: 'dept', name: 'Personal Care', active: true }] };
    else if (route === '/categories') data = { categories: [{ _id: 'shampoo', name: 'Shampoo', department: 'dept' }, { _id: 'hair', name: 'Hair Care', department: 'dept' }] };
    else if (route === '/slideshows') data = { slides: [] };
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
};

(async () => {
  assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Expo web export not found: ' + root);
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(evidence, 'chrome-'));
  const chrome = spawn(process.env.BSTORE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket, id = 0; const callbacks = new Map(), errors = [], checks = [];
  try {
    let tabs;
    for (let attempt = 0; attempt < 60; attempt++) { try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); break; } catch { await wait(200); } }
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    socket.addEventListener('message', event => { const m = JSON.parse(event.data); if (m.id) { const p = callbacks.get(m.id); callbacks.delete(m.id); if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; callbacks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
    const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const until = async (expression, tries = 100) => { for (let n = 0; n < tries; n++) { if (await evaluate(expression)) return; await wait(100); } throw Error('Timed out: ' + expression + '\n' + (await evaluate('document.body.innerText')).slice(0, 800)); };
    const shot = async name => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const file = path.join(evidence, name + '.png'); fs.writeFileSync(file, Buffer.from(data, 'base64')); return file; };
    const scroller = `document.querySelector('[data-testid="brand-carousel"] > div')`;
    const left = () => evaluate(`${scroller}.scrollLeft`);

    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 900, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + mock.toString() + ')()' });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await until(`!!document.querySelector('[data-testid="home-brands"]') && document.body.innerText.includes('Shop by Categories')`);

    // Position: immediately before Categories.
    const order = await evaluate(`(() => { const b = document.querySelector('[data-testid="home-brands"]'), c = document.querySelector('[data-testid="home-categories"]'); return { follows: b.nextElementSibling === c, title: b.innerText.startsWith('Shop by Brands') }; })()`);
    assert.deepEqual(order, { follows: true, title: true }); checks.push('Shop by Brands is the section immediately before Categories');

    // Circles: equal sizes, round, labels centered; loop copies hidden from assistive tech.
    const geometry = await evaluate(`(() => { const items = [...document.querySelectorAll('[data-testid="brand-carousel"] [role="button"]')];
      const circles = items.map(i => i.firstElementChild.getBoundingClientRect());
      const visible = items.filter(i => i.getAttribute('aria-hidden') !== 'true').map(i => i.getAttribute('aria-label'));
      return { count: items.length, sizes: [...new Set(circles.map(r => Math.round(r.width) + 'x' + Math.round(r.height)))],
        radius: getComputedStyle(items[0].firstElementChild).borderRadius, visible }; })()`);
    assert.equal(geometry.count, 30, '10 brands x 3 loop copies');
    assert.deepEqual(geometry.sizes, ['76x76']); assert.equal(geometry.radius, '38px');
    assert.equal(geometry.visible.length, 10); assert.equal(geometry.visible[0], 'Shop Nivea');
    checks.push('10 brands in order, identical 76px circles, screen readers see each brand once');
    await wait(1200); checks.push('screenshot: ' + await shot('home-brands'));

    // Automatic movement.
    const a = await left(); await wait(1500); const b = await left();
    assert.ok(b > a + 10, `carousel should auto-scroll (${a} -> ${b})`); checks.push(`auto-scroll moved ${Math.round(b - a)}px in 1.5s`);

    // Auto-pause while touched; a manual swipe moves it; it stays paused for the
    // idle interval after release, then resumes from where it is (no jump).
    const box = await evaluate(`(() => { const r = ${scroller}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 40 }; })()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    const p1 = await left(); await wait(1200); const p2 = await left();
    assert.ok(Math.abs(p2 - p1) < 2, `paused while touched (${p1} -> ${p2})`);
    for (let step = 1; step <= 8; step++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x - step * 15, y: box.y }] }); await wait(16); }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(400); const swiped = await left();
    assert.ok(swiped > p2 + 40, `manual swipe scrolls (${p2} -> ${swiped})`);
    assert.equal(await evaluate('location.pathname'), '/', 'a swipe must not open a brand');
    await wait(1200); const p3 = await left();
    assert.ok(Math.abs(p3 - swiped) < 2, `still paused during idle interval (${swiped} -> ${p3})`);
    await wait(2200); const p4 = await left();
    assert.ok(p4 > p3 + 5 && p4 - p3 < 120, `resumed smoothly (${p3} -> ${p4})`);
    checks.push('pauses on touch, manual swipe works, stays paused for the idle interval, resumes smoothly');

    // Loop wrap stays within the middle copy (no blank edge, no visible jump).
    const span = 10 * (88 + 14);
    await evaluate(`${scroller}.scrollLeft = ${2 * span - 30}`);
    await wait(2600); await wait(1500);
    const wrapped = await left();
    assert.ok(wrapped >= span - 5 && wrapped < 2 * span, `wrapped into middle copy (${wrapped})`);
    checks.push('seamless wrap keeps the offset inside the middle copy');

    // Broken logo falls back to the brand initial without breaking layout.
    const fallback = await evaluate(`[...document.querySelectorAll('[aria-label="Shop Nestle"]')].every(i => i.firstElementChild.innerText.trim() === 'N' && Math.round(i.firstElementChild.getBoundingClientRect().width) === 76)`);
    assert.ok(fallback); checks.push('failed logo shows initial fallback in the same circle');

    // Tap a brand -> existing product list filtered by that brand, guest sees no prices.
    await evaluate(`document.querySelector('[aria-label="Shop Dove"]:not([aria-hidden="true"])').click()`);
    await until(`location.pathname === '/brand-products' && document.body.innerText.includes('Product 1')`);
    const list = await evaluate(`(() => { const t = document.body.innerText; const names = [...new Set((t.match(/Product \\d+/g) || []))]; return { names, prices: /\\$\\d/.test(t), title: t.includes('Dove') }; })()`);
    assert.ok(list.title); assert.equal(list.prices, false, 'guests see no prices');
    assert.ok(list.names.length > 0 && list.names.every(n => Number(n.split(' ')[1]) % 4 === 1), 'only Dove products: ' + list.names.join(','));
    assert.equal(list.names.length, 10);
    checks.push('tapping Dove opens its 10 products only, without prices for guests');
    checks.push('screenshot: ' + await shot('brand-products'));
    await evaluate('history.back()');
    await until(`location.pathname === '/' && !!document.querySelector('[data-testid="home-brands"]')`);
    checks.push('back to Home keeps the section');
    assert.ok((await evaluate(`window.requests.filter(r => r === '/brands/home').length`)) <= 2, 'no repeated brand requests');

    // Zero eligible brands -> whole section hidden, rest of Home intact.
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?brands=0` });
    await evaluate(`localStorage.clear(); true`);
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?brands=0` });
    await until(`document.body.innerText.includes('Shop by Categories')`);
    await wait(800);
    assert.equal(await evaluate(`!!document.querySelector('[data-testid="home-brands"]')`), false);
    checks.push('zero brands: section hidden, Categories still shown');

    assert.deepEqual(errors, [], 'no uncaught page errors');
    console.log('PASS\n- ' + checks.join('\n- '));
  } finally {
    socket?.close(); chrome.kill(); server.close();
  }
})().catch(error => { console.error('FAIL', error); process.exitCode = 1; });
