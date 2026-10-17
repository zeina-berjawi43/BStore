const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = owner => 'header.' + Buffer.from(JSON.stringify({ userId: owner })).toString('base64url') + '.signature';
test('immediate Account cache rejects another credential owner, updates the current profile and clears on logout', async () => {
  const disk = new Map([['user', JSON.stringify({ _id: 'A', name: 'Customer A' })]]);
  const browser = new Map([['mystore.auth.v1', JSON.stringify({ accessToken: jwt('B'), refreshToken: jwt('B') })]]);
  const storage = map => ({ getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  const exports = {}, dependencies = {
    '@react-native-async-storage/async-storage': { ...storage(disk), multiRemove: async keys => keys.forEach(key => disk.delete(key)) },
    'expo-secure-store': {}, 'react-native': { Platform: { OS: 'web' } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/tokenStorage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, window: { sessionStorage: storage(browser), localStorage: storage(new Map()) }, require: name => dependencies[name] });
  await exports.readTokens(); assert.equal(exports.peekSessionUser(), null);
  await exports.saveSessionUser(jwt('B'), { _id: 'B', name: 'Customer B' });
  assert.equal(exports.peekSessionUser().name, 'Customer B');
  await exports.saveSessionUser(jwt('B'), { _id: 'B', name: 'Updated B' });
  assert.equal(exports.peekSessionUser().name, 'Updated B');
  await exports.updateTokens({ accessToken: jwt('C'), refreshToken: jwt('C') }, { _id: 'C', name: 'Customer C' });
  assert.equal(exports.peekSessionUser()._id, 'C');
  await assert.rejects(exports.saveSessionUser(jwt('B'), { _id: 'B', name: 'Late B' }), /session changed/);
  assert.equal(exports.peekSessionUser()._id, 'C');
  await exports.clearTokens(); assert.equal(exports.peekSessionUser(), null); assert.equal(disk.has('user'), false);
});
