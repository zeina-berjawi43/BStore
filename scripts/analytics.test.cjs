const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const file = path.resolve(__dirname, '../src/services/analytics-core.ts'), exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: exportsObject, setTimeout, clearTimeout, AbortController, Date, console });
const { createAnalytics } = exportsObject;
function fixture(platform = 'web') {
  const storage = new Map(), calls = [];
  let now = Date.now(), serial = 0, owner = 'anonymous', enabled = true, fail = false, deliveredButLost = false;
  const config = { enabled: true, policyVersion: 'notice-v1', retentionDays: 90, campaignIds: ['wholesale-campaign'], notice: 'Test notice' };
  const engine = createAnalytics({
    storage: { getItem: async key => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) },
    scope: () => ({ key: owner, ready: true }), now: () => now, id: () => `identifier_123456789_${serial++}`, platform, release: '1.0.0.16',
    send: async (url, body, scopedOwner) => {
      calls.push({ url, body: body ? structuredClone(body) : undefined, owner: scopedOwner });
      if (fail || (deliveredButLost && url === '/events')) throw Error('offline');
      if (url === '/config') return { status: 200, data: { ...config, enabled } };
      if (url === '/consent') return { status: 200, data: { consentToken: `receipt-${owner}-${serial++}`, validUntil: new Date(now + 7 * 86400000).toISOString(), policyVersion: config.policyVersion } };
      return { status: url === '/events' ? 202 : 200, data: {} };
    },
  });
  return { engine, storage, calls, setEnabled: value => { enabled = value; }, setFail: value => { fail = value; }, setLost: value => { deliveredButLost = value; }, advance: ms => { now += ms; }, owner: value => { owner = value; engine.scopeChanged(); }, config };
}
const settle = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
for (const platform of ['web', 'android']) test(`${platform}: opt-in is required, batches are bounded and raw search/form properties are rejected`, async () => {
  const f = fixture(platform); await f.engine.initialize();
  f.engine.screen('index'); assert.equal(f.engine.context(), undefined); await f.engine.flush();
  assert.equal(f.calls.filter(call => call.url === '/consent').length, 0);
  await f.engine.setConsent(true);
  f.engine.track('search_performed', { query: 'private text' });
  for (let i = 0; i < 40; i++) f.engine.screen('cart');
  await f.engine.flush(); const request = f.calls.find(call => call.url === '/events');
  assert.equal(request.body.events.length, 20); assert.ok(request.body.events.every(event => event.platform === platform));
  assert.equal(JSON.stringify(request).includes('private text'), false);
  f.engine.screen('verify-otp?phone=private'); await f.engine.flush();
  assert.equal(JSON.stringify(f.calls).includes('phone=private'), false);
});
test('offline retries reuse event IDs and consent receipts without blocking customer operations', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true);
  f.engine.screen('index'); f.setLost(true); await f.engine.flush();
  const first = f.calls.filter(call => call.url === '/events')[0]; f.setLost(false); f.advance(40000); await f.engine.flush();
  const second = f.calls.filter(call => call.url === '/events')[1];
  assert.deepEqual(first.body.events, second.body.events); assert.equal(first.body.consentToken, second.body.consentToken);
});
test('login/logout/account replacement drops old events and rebinds permission before authenticated capture', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true);
  f.engine.screen('register'); f.owner('customer:A');
  assert.equal(f.engine.context(), undefined); await settle();
  f.engine.screen('cart'); await f.engine.flush();
  const batches = f.calls.filter(call => call.url === '/events'); assert.equal(batches.length, 1);
  assert.equal(batches[0].owner, 'customer:A'); assert.equal(batches[0].body.events.some(event => event.properties.screen === 'register'), false);
  f.engine.screen('checkout'); f.owner('customer:B'); await settle(); f.engine.screen('index'); await f.engine.flush();
  assert.equal(f.calls.filter(call => call.url === '/events').at(-1).body.events.some(event => event.properties.screen === 'checkout'), false);
});
test('kill switch and changed policy stop capture; a new notice requires a new positive choice', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true); f.engine.screen('cart');
  f.setEnabled(false); await f.engine.refreshConfig(); await f.engine.flush(); assert.equal(f.engine.context(), undefined);
  assert.equal(f.calls.filter(call => call.url === '/events').length, 0);
  f.setEnabled(true); f.config.policyVersion = 'notice-v2'; await f.engine.refreshConfig(); assert.equal(f.engine.context(), undefined);
});
test('withdrawal turns collection off immediately and queues safe removal while offline', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true); f.engine.screen('cart'); f.setFail(true);
  await f.engine.setConsent(false); assert.equal(f.engine.context(), undefined); assert.equal(f.engine.getSnapshot().withdrawalPending, true);
  f.setFail(false); await f.engine.setConsent(false); assert.equal(f.engine.getSnapshot().withdrawalPending, false);
  assert.equal(f.calls.filter(call => call.url === '/events').length, 0);
});
test('idle sessions rotate and the queue cannot grow indefinitely', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true); f.engine.screen('index'); const first = f.engine.context().sessionId;
  f.advance(31 * 60000); assert.equal(f.engine.context(), undefined, 'Stale server policy fails closed');
  await f.engine.refreshConfig(); f.engine.screen('cart'); assert.notEqual(f.engine.context().sessionId, first);
  for (let i = 0; i < 200; i++) f.engine.screen('cart'); await settle();
  const stored = JSON.parse(f.storage.get('bstore.analytics.v1')); assert.ok(stored.events.length <= 100);
});
test('unavailable storage and network fail closed without uncaught capture exceptions', async () => {
  const engine = createAnalytics({ storage: { getItem: async () => { throw Error('storage unavailable'); }, setItem: async () => { throw Error(); }, removeItem: async () => {} }, scope: () => ({ key: 'anonymous', ready: true }), now: Date.now, id: () => 'identifier_123456789', platform: 'android', release: '1', send: async () => { throw Error(); } });
  await engine.initialize(); assert.doesNotThrow(() => engine.screen('cart')); assert.equal(engine.context(), undefined); await engine.flush();
});
test('a late initialization from an old identity cannot disable or overwrite a replacement identity', async () => {
  const storage = new Map([['bstore.analytics.preference.v1', JSON.stringify({ acceptedVersion: 'v1' })]]);
  let owner = 'anonymous', calls = 0, releaseOld;
  const config = { enabled: true, policyVersion: 'v1', retentionDays: 90, campaignIds: [], notice: 'Notice' };
  const oldResponse = new Promise(resolve => { releaseOld = resolve; });
  const engine = createAnalytics({ storage: { getItem: async key => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) }, scope: () => ({ key: owner, ready: true }), now: Date.now, id: () => 'identifier_123456789', platform: 'web', release: '1',
    send: async (url, _body, scopedOwner) => {
      if (url === '/config') { if (++calls === 1) return oldResponse; return { status: 200, data: config }; }
      return { status: 200, data: { consentToken: `receipt-${scopedOwner}`, validUntil: new Date(Date.now() + 100000).toISOString(), policyVersion: 'v1' } };
    } });
  const old = engine.initialize(); await settle(); owner = 'customer:B'; engine.scopeChanged(); await settle();
  assert.equal(engine.context().consentToken, 'receipt-customer:B');
  releaseOld({ status: 200, data: config }); await old; await settle();
  assert.equal(engine.context().consentToken, 'receipt-customer:B');
});
test('withdrawal in another browser tab stops this tab and requests removal for its receipt', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true); f.engine.screen('cart');
  f.storage.set('bstore.analytics.preference.v1', JSON.stringify({ acceptedVersion: null }));
  await f.engine.reloadPreference(); assert.equal(f.engine.context(), undefined);
  assert.ok(f.calls.some(call => call.url === '/withdraw'));
  await f.engine.flush(); assert.equal(f.calls.some(call => call.url === '/events'), false);
});
test('checkout flow survives a first/idle session start and rotates after a confirmed response', async () => {
  const f = fixture(); await f.engine.initialize(); await f.engine.setConsent(true);
  f.engine.startCheckout(2); const first = f.engine.context().flowId; assert.ok(first);
  f.engine.submit('attempt_1234567890123'); assert.equal(f.engine.context().flowId, first);
  await f.engine.flush(); const events = f.calls.find(call => call.url === '/events').body.events;
  assert.equal(events.find(event => event.name === 'checkout_started').properties.flowId, first);
  f.engine.finishCheckout(); f.engine.startCheckout(3); assert.notEqual(f.engine.context().flowId, first);
  f.advance(31 * 60000); await f.engine.refreshConfig(); f.engine.startCheckout(1); assert.ok(f.engine.context().flowId);
});

for (const platform of ['web', 'android']) test(`${platform}: impressions deduplicate per screen and session; price evidence is separately gated`, async () => {
  const f = fixture(platform); await f.engine.initialize(); await f.engine.setConsent(true);
  const properties = { productId: '507f1f77bcf86cd799439011', screen: 'category-products', viewId: 'view_1234567890123456', offeredPriceCents: 900 };
  for (let i = 0; i < 5; i++) f.engine.track('product_impression', properties);
  await f.engine.flush();
  let seen = f.calls.filter(call => call.url === '/events').flatMap(call => call.body.events).filter(event => event.name === 'product_impression');
  assert.equal(seen.length, 1); assert.equal(seen[0].properties.offeredPriceCents, undefined);
  f.config.priceEvidenceEnabled = true; await f.engine.refreshConfig();
  f.engine.track('product_impression', { ...properties, screen: 'search' }); await f.engine.flush();
  seen = f.calls.filter(call => call.url === '/events').flatMap(call => call.body.events).filter(event => event.name === 'product_impression');
  assert.equal(seen.length, 2); assert.equal(seen[1].properties.offeredPriceCents, 900);
  f.advance(31 * 60000); await f.engine.refreshConfig(); f.engine.track('product_impression', properties); await f.engine.flush();
  assert.equal(f.calls.filter(call => call.url === '/events').flatMap(call => call.body.events).filter(event => event.name === 'product_impression').length, 3);
});
test('no customer-facing analytics settings, consent prompt or privacy section is shipped (owner did not request one)', () => {
  const fs = require('node:fs'), path = require('node:path'), root = path.join(__dirname, '..', 'src');
  const files = []; (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(tsx?|jsx?)$/.test(e.name) && files.push(path.join(dir, e.name)); })(root);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /AnalyticsPreferences|Optional Shopping Analytics|Share optional shopping activity/i, path.relative(root, file));
    if (/[\/]app[\/]/.test(file)) assert.doesNotMatch(text, /analytics\.setConsent\(/, `${path.relative(root, file)} must not offer a consent control`);
  }
});
for (const platform of ['web', 'android']) test(`${platform}: server-declared notice basis collects without any device choice, still bounded and sanitized`, async () => {
  const f = fixture(platform); f.config.basis = 'notice'; await f.engine.initialize(); await settle();
  assert.equal(f.calls.filter(call => call.url === '/consent').length, 1, 'receipt obtained automatically under notice basis');
  assert.equal(f.storage.has('bstore.analytics.preference.v1'), false, 'no device preference is created');
  f.engine.track('search_performed', { query: 'private text' }); f.engine.screen('index');
  await f.engine.flush(); const sent = f.calls.find(call => call.url === '/events');
  assert.ok(sent && sent.body.events.some(event => event.name === 'screen_viewed'));
  assert.equal(JSON.stringify(f.calls).includes('private text'), false);
  await f.engine.reloadPreference(); await settle();
  assert.equal(f.calls.filter(call => call.url === '/withdraw').length, 0, 'cleared browser storage is not treated as a withdrawal');
});
test('notice basis never collects while the server reports collection disabled', async () => {
  const f = fixture(); f.config.basis = 'notice'; f.setEnabled(false); await f.engine.initialize(); await settle();
  f.engine.screen('index'); await f.engine.flush();
  assert.equal(f.calls.filter(call => ['/consent', '/events'].includes(call.url)).length, 0);
  assert.equal(f.engine.context(), undefined);
});
test('consent basis (default) still requires an explicit choice and sends nothing without it', async () => {
  const f = fixture(); await f.engine.initialize(); await settle(); f.engine.screen('index'); await f.engine.flush();
  assert.equal(f.calls.filter(call => ['/consent', '/events'].includes(call.url)).length, 0);
});
