const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PNG } = require('pngjs');

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
    assert.equal(screen.props.style.backgroundColor, '#FFFFFF');
    assert.equal(artwork.props.resizeMode, 'contain');
    assert.equal(artwork.props.style.width, 140);
    assert.equal(artwork.props.style.height, 140 * 723 / 748);
    const first = order === 'layout-first' ? screen.props.onLayout : artwork.props.onLoad;
    const second = order === 'layout-first' ? artwork.props.onLoad : screen.props.onLayout;
    first(); assert.equal(ready, 0, 'must retain native splash before both prerequisites');
    second(); assert.equal(ready, 1);
    first(); second(); assert.equal(ready, 1, 'duplicate native events cannot hide splash repeatedly');
  });
}

test('native logo fits Android splash mask and references existing artwork', () => {
  const root = path.resolve(__dirname, '..');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  const [, splash] = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
  assert.equal(splash.backgroundColor, '#FFFFFF');
  assert.equal(splash.dark.backgroundColor, '#FFFFFF');
  assert.equal(splash.dark.image, splash.image);
  assert.equal(splash.resizeMode, 'contain');
  assert.ok(splash.imageWidth > 0 && splash.imageWidth <= 140, 'full artwork must fit inside the 192dp visible circle');
  assert.ok(fs.existsSync(path.resolve(root, splash.image)));
  assert.ok(fs.existsSync(path.resolve(root, config.web.favicon)));
});

test('dedicated startup artwork preserves every original pixel and fits the Android safe circle', () => {
  const original = PNG.sync.read(fs.readFileSync(path.resolve(__dirname, '../assets/images/splash-logo.png')));
  const cropped = PNG.sync.read(fs.readFileSync(path.resolve(__dirname, '../assets/images/startup-logo.png')));
  assert.equal(cropped.width, 748);
  assert.equal(cropped.height, 723);
  let left = cropped.width, right = -1, top = cropped.height, bottom = -1;
  for (let y = 0; y < original.height; y++) for (let x = 0; x < original.width; x++) {
    const i = (y * original.width + x) * 4;
    const artwork = original.data[i + 3] > 0 && Math.min(...original.data.subarray(i, i + 3)) < 255;
    const inside = x >= 140 && x < 888 && y >= 110 && y < 833;
    if (!inside) { assert.equal(artwork, false, 'crop cannot remove artwork'); continue; }
    const cx = x - 140, cy = y - 110, j = (cy * cropped.width + cx) * 4;
    assert.ok(original.data.subarray(i, i + 4).equals(cropped.data.subarray(j, j + 4)));
    if (artwork) {
      left = Math.min(left, cx); right = Math.max(right, cx);
      top = Math.min(top, cy); bottom = Math.max(bottom, cy);
      assert.ok(Math.hypot(cx - (cropped.width - 1) / 2, cy - (cropped.height - 1) / 2) * 140 / cropped.width < 96);
    }
  }
  assert.equal((left + right) / 2, (cropped.width - 1) / 2);
  assert.equal((top + bottom) / 2, (cropped.height - 1) / 2);
  for (const width of [240, 280, 320, 360, 390]) assert.ok(140 < width);
});
