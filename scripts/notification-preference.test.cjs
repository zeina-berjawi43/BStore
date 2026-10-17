const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm'), ts = require('typescript');
const { deferred, flush } = require('./shopping-fixture.cjs');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/notification-preference.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exportsObject, Error, require: name => name.includes('tokenStorage') ? { peekSessionUser: () => null, onSessionChanged() {} } : {} });
const create = exportsObject.createNotificationPreference;
test('rapid notification changes remain immediate and persist latest intent after slow acknowledgments', async () => {
  const first = deferred(), second = deferred(), calls = []; let persisted = false;
  const state = create({ load: async () => persisted, save: value => { calls.push(value); return (calls.length === 1 ? first : second).promise.then(() => persisted = value); } }, false);
  state.toggle(); assert.equal(state.getSnapshot().value, true);
  state.toggle(); state.toggle(); state.toggle(); assert.equal(state.getSnapshot().value, false);
  first.resolve(); await flush(); assert.equal(state.getSnapshot().value, false); assert.deepEqual(calls, [true, false]);
  second.resolve(); await flush(); assert.equal(persisted, false); assert.equal(state.getSnapshot().saving, false);
  await state.load(); assert.equal(state.getSnapshot().value, false);
});
test('slow initial read cannot overwrite a toggle; failures roll back visibly and retry succeeds', async () => {
  const read = deferred(), write = deferred(); let persisted = true;
  const state = create({ load: () => read.promise, save: async value => { await write.promise; persisted = value; return value; } });
  const loading = state.load(); state.toggle(); assert.equal(state.getSnapshot().value, false);
  read.resolve(true); await loading; await flush(); assert.equal(state.getSnapshot().value, false);
  write.reject(Error('offline')); await flush(); assert.equal(state.getSnapshot().value, true); assert.match(state.getSnapshot().error, /offline/);
  const fresh = create({ load: async () => persisted, save: async value => persisted = value }, true);
  fresh.toggle(); await flush(); assert.equal(fresh.getSnapshot().value, false); assert.equal(persisted, false);
});
test('newer notification intent survives failed older write and old-session responses are ignored', async () => {
  const gate = deferred(); let calls = 0;
  const state = create({ load: async () => false, save: async value => { if (++calls === 1) await gate.promise; return value; } }, false);
  state.toggle(); state.toggle(); gate.reject(Error('offline')); await flush();
  assert.equal(state.getSnapshot().value, false); assert.equal(state.getSnapshot().error, ''); assert.equal(calls, 2);
  const late = deferred(), other = create({ load: async () => true, save: () => late.promise }, false);
  other.toggle(); other.reset(false); late.resolve(true); await flush(); assert.equal(other.getSnapshot().value, false);
});
