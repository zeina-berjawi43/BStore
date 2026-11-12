// Build first: node node_modules/expo/bin/cli export --platform web --output-dir .release-check/registration-web
// Uses headless Chrome with all BStore HTTP requests intercepted locally.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../.release-check/registration-web');
const evidence = path.resolve(__dirname, '../.release-check/registration');
fs.mkdirSync(evidence, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file += '.html';
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
function mock() {
  window.registrationRequests = [];
  const original = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('mystore-backend')) return original(input, options);
    const route = new URL(url).pathname;
    if (route === '/auth/register') window.registrationRequests.push(JSON.parse(options.body));
    return new Response(JSON.stringify(route === '/auth/register'
      ? { requiresPhoneVerification: true, verificationStatus: 'pending' }
      : {}), { status: route === '/auth/register' ? 201 : 200, headers: { 'Content-Type': 'application/json' } });
  };
}
let chrome, socket;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const profile = fs.mkdtempSync(path.join(evidence, 'chrome-'));
  chrome = spawn(process.env.BSTORE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let tabs;
  for (let i = 0; i < 60; i++) {
    try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); break; } catch { await wait(200); }
  }
  assert.ok(tabs?.some(tab => tab.type === 'page'), 'Chrome must start');
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const callbacks = new Map(), errors = [];
  socket.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const cb = callbacks.get(msg.id); callbacks.delete(msg.id); msg.error ? cb.reject(Error(JSON.stringify(msg.error))) : cb.resolve(msg.result); }
    else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; callbacks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(100); } throw Error('Timed out: ' + expression); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + mock.toString() + ')()' });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  for (const [index, answer] of ['personal_home', 'mini_market_supermarket'].entries()) {
    await send('Page.navigate', { url: base + '/register' });
    await until(`document.querySelectorAll('[role=radio]').length === 2`);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role=radio]'), el => el.getAttribute('aria-checked'))`), ['false', 'false']);
    assert.equal(await evaluate(`document.querySelector('[role=radiogroup]').getAttribute('aria-label')`), 'ما هي طبيعة استخدامكم للمشتريات؟');
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role=radio]'), el => el.getAttribute('aria-label'))`), ['استهلاك شخصي ومنزلي', 'ميني ماركت / سوبر ماركت']);
    for (const [placeholder, value] of [['First Name', 'Test'], ['Last Name', 'Customer'], ['Phone Number', '71000000'], ['Address', 'Beirut'], ['Password (8–72 characters)', 'password123'], ['Confirm Password', 'password123']]) {
      await evaluate(`(() => { const el = document.querySelector('[placeholder=' + ${JSON.stringify(JSON.stringify(placeholder))} + ']'); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    }
    const submit = `Array.from(document.querySelectorAll('[role=button]')).find(el => el.textContent.trim().startsWith('Create Account')).click()`;
    await evaluate(submit);
    await until(`document.body.innerText.includes('يرجى تحديد طبيعة استخدامكم للمشتريات')`);
    assert.equal(await evaluate('window.registrationRequests.length'), 0);
    for (const selected of [1 - index, index]) {
      await evaluate(`document.querySelectorAll('[role=radio]')[${selected}].click()`);
      await until(`document.querySelectorAll('[role=radio]')[${selected}].getAttribute('aria-checked') === 'true'`);
      assert.equal(await evaluate(`document.querySelectorAll('[role=radio][aria-checked=true]').length`), 1);
    }
    for (const width of [320, 390, 768, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('[role=radio]')).every(el => el.getBoundingClientRect().height >= 44)`), true);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate(`document.querySelector('[role=radiogroup]').scrollIntoView({block: 'center'})`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(evidence, answer + '.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(submit);
    await until(`window.registrationRequests.length === 1`);
    const body = await evaluate('window.registrationRequests[0]');
    assert.equal(body.purchaseUsage, answer); assert.equal(body.priceClass, undefined);
    await until(`location.pathname === '/verify-otp'`);
    console.log('PASS:', answer, 'explicit selection, mutual exclusion, required error, mobile/desktop layout, payload and verification navigation');
  }
  await send('Page.navigate', { url: base + '/login' });
  await until(`!!document.querySelector('[placeholder="Phone Number"]')`);
  assert.equal(await evaluate(`document.querySelectorAll('[role=radio], [role=radiogroup]').length`), 0);
  assert.equal(errors.length, 0);
  console.log('PASS: login contains no question; no browser runtime errors');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket) socket.close();
  if (chrome) chrome.kill();
  await new Promise(resolve => server.close(resolve));
});
