const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

for (const order of ['layout-first', 'image-first']) {
  test(`startup handoff waits for both artwork and layout (${order}) and reports once`, () => {
    const exports = {};
    let ready = 0;
    const mocks = {
      react: { useRef: value => ({ current: value }) },
      'react-native': { View: 'View', Image: 'Image', StyleSheet: { create: value => value, absoluteFill: {} } },
      'expo-status-bar': { StatusBar: 'StatusBar' },
    };
    const file = path.resolve(__dirname, '../src/components/startup-screen.tsx');
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, { exports, require: name => name.endsWith('.png') ? name : mocks[name] ?? require(name) });
    const screen = exports.StartupScreen({ onReady: () => ready++ });
    const artwork = screen.props.children.find(child => child?.type === 'Image');
    assert.equal(screen.props.style.backgroundColor, '#E7DED1');
    assert.equal(artwork.props.resizeMode, 'contain');
    const first = order === 'layout-first' ? screen.props.onLayout : artwork.props.onLoadEnd;
    const second = order === 'layout-first' ? artwork.props.onLoadEnd : screen.props.onLayout;
    first(); assert.equal(ready, 0, 'must retain native splash before both prerequisites');
    second(); assert.equal(ready, 1);
    first(); second(); assert.equal(ready, 1, 'duplicate native events cannot hide splash repeatedly');
  });
}

test('native logo fits Android splash mask and references existing artwork', () => {
  const root = path.resolve(__dirname, '..');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  const [, splash] = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
  assert.equal(splash.backgroundColor, '#E7DED1');
  assert.equal(splash.resizeMode, 'contain');
  assert.ok(splash.imageWidth > 0 && splash.imageWidth * Math.sqrt(2) <= 192, 'square artwork must fit inside the 192dp visible circle');
  assert.ok(fs.existsSync(path.resolve(root, splash.image)));
  assert.ok(fs.existsSync(path.resolve(root, config.web.favicon)));
});
