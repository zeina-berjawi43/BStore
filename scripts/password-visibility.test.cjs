const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');

// Execute the actual forms with inert services; a toggle must never call an API.
function form(file, exportName = 'default') {
  const slots = []; let cursor = 0, actions = 0;
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: value => { const i = cursor++; return slots[i] ||= { current: value }; }, useEffect: () => {}, useCallback: fn => fn, useMemo: fn => fn() };
  const native = new Proxy({ StyleSheet: { create: styles => styles }, Platform: { OS: 'android' } }, { get: (object, key) => object[key] || String(key) });
  const router = { push: () => { actions++; }, back: () => { actions++; }, replace: () => { actions++; } };
  const exports = {};
  const dependencies = { react, 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' }, 'expo-symbols': { SymbolView: 'Icon' },
    'expo-router': { router, useRouter: () => router, useLocalSearchParams: () => ({ phone: '71000000', mode: 'register' }) },
    'react-native-safe-area-context': { SafeAreaView: 'View' } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText,
    { exports, React: react, __DEV__: false, requestAnimationFrame: fn => fn(), require: name => dependencies[name] || new Proxy({}, { get: (_object, key) => {
      if (key === '__esModule') return true;
      if (name.includes('components')) return String(key);
      if (name.includes('hooks')) return () => () => {};
      return () => { actions++; };
    } }) });
  return { render: props => { cursor = 0; return exports[exportName](props); }, actions: () => actions };
}
function nodes(tree, predicate, result = []) {
  if (!tree) return result;
  if (Array.isArray(tree)) { tree.forEach(child => nodes(child, predicate, result)); return result; }
  if (typeof tree !== 'object') return result;
  if (predicate(tree)) result.push(tree);
  nodes(tree.props?.children, predicate, result); return result;
}
function verify(harness, render, count) {
  let tree = render();
  const fields = () => nodes(tree, node => typeof node.props?.secureTextEntry === 'boolean');
  const eyes = () => nodes(tree, node => /^(Show|Hide) /i.test(node.props?.accessibilityLabel || ''));
  assert.equal(fields().length, count); assert.equal(eyes().length, count);
  fields().forEach(field => assert.equal(field.props.secureTextEntry, true));
  fields().forEach((field, i) => field.props.onChangeText?.('fixture-' + i)); tree = render();
  const values = fields().map(field => field.props.value), completion = fields().map(field => field.props.autoComplete);
  for (let i = 0; i < count; i++) {
    const eye = eyes()[i]; assert.equal(eye.props.accessibilityRole, 'button'); eye.props.onPress(); tree = render();
    fields().forEach((field, j) => assert.equal(field.props.secureTextEntry, i !== j));
    assert.deepEqual(fields().map(field => field.props.value), values);
    assert.deepEqual(fields().map(field => field.props.autoComplete), completion);
    assert.match(eyes()[i].props.accessibilityLabel, /^Hide /i);
    eyes()[i].props.onPress(); tree = render(); fields().forEach(field => assert.equal(field.props.secureTextEntry, true));
  }
  assert.equal(harness.actions(), 0);
}
for (const [route, count] of [['login', 1], ['register', 2], ['change-password', 3], ['reset-password', 2], ['verify-otp', 1]]) test(route + ': all actual fields are hidden, independent, retain values and autocomplete, and never call auth when toggled', () => {
  const file = path.join(__dirname, '../src/app/' + route + '.tsx'), harness = form(file);
  verify(harness, () => harness.render(), count);
  const recreated = form(file); verify(recreated, () => recreated.render(), count);
});
module.exports = { form, nodes, verify };
