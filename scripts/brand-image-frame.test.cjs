const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('../../admin-app/scripts/check-admin.cjs');
const legacy = harness('src/services/image-frame.ts').exports;
const panel = harness('../admin-panel/src/utils/brand-image-frame.ts', [], { dependencies: { './image-frame': legacy } }).exports;
const customer = harness('../mystore/src/services/brand-image-frame.ts', [], { dependencies: { './image-frame': legacy } }).exports;
const plain = value => JSON.parse(JSON.stringify(value));
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(walk)];

test('Brand-only math is identical in Panel and Customer; legacy and Product contracts are untouched', () => {
  const root = path.resolve(__dirname, '../..');
  assert.equal(fs.readFileSync(path.join(root, 'admin-panel/src/utils/brand-image-frame.ts'), 'utf8'), fs.readFileSync(path.join(root, 'mystore/src/services/brand-image-frame.ts'), 'utf8'));
  for (const math of [panel, customer]) {
    assert.equal(math.validBrandFrame({ version: 2, scale: 1.1, x: 0, y: 0 }), true);
    assert.equal(legacy.validFrame({ version: 2, scale: 1.1, x: 0, y: 0 }), false, 'old clients safely show original fit');
    assert.equal(math.validBrandFrame({ version: 2, scale: 1.1, zoom: 2, x: 0, y: 0 }), false, 'malformed versions cannot become a cover crop');
    const frame = { zoom: 2.3, x: .2, y: -.7 };
    assert.deepEqual(plain(math.brandFrameGeometry(515, 388, 134, 134, frame)), plain(legacy.frameGeometry(515, 388, 134, 134, frame)));
  }
});

const shapes = [['square', 400, 400], ['portrait', 400, 800], ['landscape', 800, 400], ['wide', 2000, 200],
  ['tall', 200, 2000], ['small', 32, 16], ['large', 4096, 2048], ['transparent PNG', 600, 300], ['transparent margins', 1000, 800], ['Nestle', 515, 388]];
for (const [name, width, height] of shapes) {
  test(`${name}: 1.1x is a true 10% enlargement from original fit, panning and responsive previews match`, () => {
    const original = customer.brandFrameGeometry(width, height, 318, 318, customer.DEFAULT_BRAND_FRAME);
    const larger = customer.brandFrameGeometry(width, height, 318, 318, { version: 2, scale: 1.1, x: 0, y: 0 });
    assert.ok(Math.abs(larger.width / original.width - 1.1) < 1e-10);
    assert.ok(Math.abs(larger.height / original.height - 1.1) < 1e-10);
    for (const scale of [1, 1.1, 1.11, 2, 4]) for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
      const frame = { version: 2, scale, x, y };
      const main = panel.brandFrameGeometry(width, height, 318, 318, frame);
      const small = customer.brandFrameGeometry(width, height, 134, 134, JSON.parse(JSON.stringify(frame)));
      assert.ok(Math.abs(main.width / main.height - width / height) < 1e-10);
      for (const key of ['width', 'height', 'left', 'top']) assert.ok(Math.abs(main[key] / 318 - small[key] / 134) < 1e-10);
      const moved = legacy.panFrame(frame, 10000, -10000, main.travelX, main.travelY);
      assert.equal(moved.x, -1); assert.equal(moved.y, 1);
      assert.equal(customer.validBrandFrame(moved), true);
    }
  });
}

test('actual Customer Brand renderer uses contained geometry and forwards cache/load callbacks', () => {
  for (const side of [96, 107, 136]) for (const [, width, height] of shapes) {
    const h = harness('../mystore/src/components/brand-image.tsx', [], { dependencies: {
      '../services/brand-image-frame': customer, 'expo-image': { Image: 'ExpoImage' },
    } });
    let loads = 0;
    const frame = { version: 2, scale: 1.11, x: .3, y: -.4 };
    const props = { imageFrame: frame, source: { uri: 'local-fixture.jpg', cacheKey: 'same-image' }, cachePolicy: 'memory-disk', onLoad: () => loads++ };
    let tree = h.render(h.exports.BrandImage, props).tree;
    walk(tree).find(node => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width: side, height: side } } });
    tree = h.render(h.exports.BrandImage, props).tree;
    walk(tree).find(node => node.type === 'ExpoImage').props.onLoad({ source: { width, height } });
    const image = walk(h.render(h.exports.BrandImage, props).tree).find(node => node.type === 'ExpoImage');
    const expected = customer.brandFrameGeometry(width, height, side, side, frame);
    for (const key of ['width', 'height', 'left', 'top']) assert.equal(image.props.style[key], expected[key]);
    assert.equal(image.props.source.cacheKey, 'same-image'); assert.equal(image.props.cachePolicy, 'memory-disk');
    assert.equal(loads, 1); assert.equal(image.props.contentFit, 'fill');
  }
});
