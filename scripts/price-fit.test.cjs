// Product grid price row: prices keep their designed size when they fit, never wrap into extra
// lines, and the reserved row height is respected (Category and Department grids).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { load } = require('./shopping-fixture.cjs');
const { fitPriceText, productCardLayout } = load('components/product-card-layout.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('designed size is kept whenever the measured width allows it', () => {
  assert.deepEqual(plain(fitPriceText('$10.00', 91, 17, 20)), { style: { fontSize: 17, lineHeight: 20 }, lines: 1 });
  assert.deepEqual(plain(fitPriceText('$1234.50', 139, 17, 20, true)), { style: { fontSize: 17, lineHeight: 20 }, lines: 1 });
  // Before the first layout pass nothing is guessed: the design size is used.
  assert.deepEqual(plain(fitPriceText('$123456789.99', 0, 17, 20, true)), { style: { fontSize: 17, lineHeight: 20 }, lines: 1 });
});

test('a price that would wrap is scaled to one line instead (never above the design size)', () => {
  const narrow = fitPriceText('$10.00', 47, 17, 20);
  assert.equal(narrow.lines, 1); assert.ok(narrow.style.fontSize < 17 && narrow.style.fontSize >= 10);
  assert.equal(narrow.style.lineHeight, 20, 'row geometry unchanged');
  for (const width of [30, 47, 91, 139, 400]) for (const text of ['$1.00', '$10.00', '$999.99', '$12345.67']) {
    const fit = fitPriceText(text, width, 17, 20, true);
    assert.ok(fit.style.fontSize <= 17);
    assert.ok(fit.lines * fit.style.lineHeight <= productCardLayout.price.height, 'fits the reserved price row');
  }
});

test('only extreme plain prices use two smaller lines, which still fit the reserved row', () => {
  const two = fitPriceText('$123456789.99', 47, 17, 20, true);
  assert.equal(two.lines, 2); assert.ok(two.style.fontSize >= 8);
  assert.equal(two.lines * two.style.lineHeight, productCardLayout.price.height);
  // Discounted prices sit under the old price, so they are always a single line.
  assert.equal(fitPriceText('$123456789.99', 47, 17, 20).lines, 1);
});

test('grids reserve the price row and keep stock status on the brand line', () => {
  for (const file of ['app/category-products.tsx', 'app/department-categories.tsx']) {
    const source = fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8');
    assert.match(source, /priceContainer: \{\s*\.\.\.productCardLayout\.price,/, file);
    // The brand row runs from its opening tag to the bottom (price) row; it must hold both the brand
    // and the stock status and be closed before the price row starts.
    const start = source.indexOf('<View style={styles.brandRow}>');
    const row = source.slice(start, source.indexOf('{/* BOTTOM */}', start));
    assert.ok(start >= 0, file);
    assert.match(row, /styles\.productCategory/, file);
    assert.match(row, /isOutOfStock && \([\s\S]*styles\.outOfStockText[\s\S]*Out of Stock/, file);
    assert.match(row.trimEnd(), /<\/View>$/, file);
    assert.equal(source.split('Out of Stock').length - 1, 1, `${file}: stock status rendered only inside the brand row`);
    assert.doesNotMatch(source, /\{\/\* OUT OF STOCK \*\/\}/, file);
  }
  const favorites = fs.readFileSync(path.resolve(__dirname, '../src/app/favorites.tsx'), 'utf8');
  const priceArea = favorites.slice(favorites.indexOf('<View style={styles.priceArea}>'), favorites.indexOf('ACTIONS'));
  assert.match(priceArea, /Out of Stock/, 'Favorites status shares the price row');
});
