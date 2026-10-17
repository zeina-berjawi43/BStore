const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function handler(file, name, context) {
  const ast = ts.createSourceFile(file, fs.readFileSync('src/app/' + file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let code;
  const walk = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) code = node.initializer.getText(ast); ts.forEachChild(node, walk); };
  walk(ast); assert.ok(code);
  const exports = {};
  vm.runInNewContext(ts.transpileModule('exports.fn = ' + code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, Error, __DEV__: false, ...context });
  return exports.fn;
}
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function notificationFixture(enabled) {
  const write = deferred(), device = deferred(), alerts = [];
  let value = enabled, busy = false, writes = 0, deviceCalls = 0;
  const toggle = handler('notifications.tsx', 'toggleNotifications', {
    notificationsEnabled: enabled, busy: false, loadFailed: false, savingRef: { current: false }, Platform: { OS: 'android' },
    setBusy: next => { busy = next; }, setNotificationsEnabled: next => { value = next; }, setDeviceState() {},
    updateNotificationSetting: next => { writes++; assert.equal(next, !enabled); return write.promise; },
    syncPush: () => { deviceCalls++; return device.promise; }, Alert: { alert: (...args) => alerts.push(args) },
  });
  return { toggle, write, device, alerts, value: () => value, busy: () => busy, writes: () => writes, deviceCalls: () => deviceCalls };
}
test('notification switch responds immediately, suppresses concurrent writes and rolls back a rejected save', async () => {
  const f = notificationFixture(true);
  const operation = f.toggle(); await f.toggle();
  assert.equal(f.value(), false); assert.equal(f.writes(), 1); assert.equal(f.deviceCalls(), 0);
  f.write.reject(Error('Connection failed')); await operation;
  assert.equal(f.value(), true); assert.equal(f.busy(), false); assert.match(f.alerts[0][1], /Connection failed/);
});
test('notification preference confirmation does not wait for slow permission or device registration', async () => {
  const f = notificationFixture(false), operation = f.toggle();
  assert.equal(f.value(), true); f.write.resolve(true); await operation;
  assert.equal(f.busy(), false); assert.equal(f.deviceCalls(), 1); assert.equal(f.alerts.length, 0);
  f.device.resolve('ready');
});
test('Account shows the scoped profile immediately and ignores revalidation after account switching', async () => {
  const fetch = deferred(), cached = { _id: 'customer-A', name: 'Maya' };
  let revision = 1, shown;
  const load = handler('account.tsx', 'loadUser', {
    getSessionSnapshot: () => ({ revision, authenticated: true }), peekSessionUser: () => cached,
    setUser: user => { shown = user; }, fetchCurrentUser: () => fetch.promise,
  });
  const job = load(); assert.equal(shown, cached);
  revision++; shown = { _id: 'customer-B' }; fetch.resolve(cached); await job;
  assert.equal(shown._id, 'customer-B');
});
