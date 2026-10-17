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
