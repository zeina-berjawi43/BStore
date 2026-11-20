// Public discount-percentage badges: visible before and after login, never exposing prices.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { fixture } = require('./catalog-fixture.cjs');
const source = file => fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8');
const PRICE_KEYS = ['price', 'discountedPrice', 'basePrice', 'oldPrice', 'priceClass'];

test('guest catalog keeps the public percentage, never prices; admin changes follow the refresh', async () => {
  const f = fixture();
  f.switchAccount(null);
  f.products([{ _id: 'p', name: 'Shampoo', image: 'p.jpg', discount: 15, availability: true, category: 'shampoo' }]);
  let guest = await f.catalog.fetchCatalog(null, true);
  assert.equal(guest[0].discount, 15);
  for (const key of PRICE_KEYS) assert.equal(guest[0][key], undefined, key);
  // Even if a response ever carried prices, the guest list drops them (defence in depth).
  f.products([{ _id: 'p', name: 'Shampoo', image: 'p.jpg', discount: 25, price: 10, discountedPrice: 7.5, availability: true, category: 'shampoo' }]);
  guest = await f.catalog.fetchCatalog(null, true);
  assert.equal(guest[0].discount, 25, 'changed percentage');
  for (const key of PRICE_KEYS) assert.equal(guest[0][key], undefined, key);
  f.products([{ _id: 'p', name: 'Shampoo', image: 'p.jpg', discount: 0, availability: true, category: 'shampoo' }]);
  guest = await f.catalog.fetchCatalog(null, true);
  assert.equal(guest[0].discount, 0, 'removed discount: no badge');
  f.products([{ _id: 'p', name: 'Shampoo', image: 'p.jpg', discount: 150, availability: true, category: 'shampoo' }]);
  assert.equal((await f.catalog.fetchCatalog(null, true))[0].discount, 0, 'invalid percentage never shown');
  f.dispose();
});

test('guest -> login -> logout: authorized prices never survive into the guest view', async () => {
  const f = fixture();
  f.products([{ _id: 'p', name: 'Shampoo', image: 'p.jpg', discount: 20, price: 12, discountedPrice: 9.6, availability: true, category: 'shampoo' }]);
  f.switchAccount('A');
  const account = await f.catalog.fetchCatalog('A', true);
  assert.equal(account[0].discountedPrice, 9.6); assert.equal(account[0].discount, 20);
  f.switchAccount(null);
  assert.equal(f.catalog.peekCurrentCatalog().length, 0, 'session change clears priced snapshots');
  const guest = await f.catalog.fetchCatalog(null, true);
  assert.equal(guest[0].discount, 20);
  for (const key of PRICE_KEYS) assert.equal(guest[0][key], undefined, key);
  for (const section of ['offers', 'top-selling']) assert.equal(f.catalog.peekPricedSection(section, 'A').length, 0);
  f.dispose();
});

test('every badge uses the shared public percentage, not price comparisons', () => {
  const checks = {
    'app/category-products.tsx': [/const badgePercent = discountPercent\(product\);/, /\{badgePercent > 0 && \(/, /-\{badgePercent\}%/],
    'app/department-categories.tsx': [/const badgePercent = discountPercent\(product\);/, /\{badgePercent > 0 && \(/, /-\{badgePercent\}%/],
    'app/favorites.tsx': [/const badgePercent = discountPercent\(product\);/, /\{badgePercent > 0 && \(/, /-\{badgePercent\}%/],
    'app/search.tsx': [/\{discountPercent\(item\) > 0 && <View style=\{styles\.discount\}>/],
    'app/index.tsx': [/\{discountPercent\(product\) > 0 && <View style=\{\[styles\.recentDiscount, styles\.topSellingDiscountPosition\]\}>/, /\{discountPercent\(product\) > 0 \? \(/,
      /discount: discountPercent\(product\) \}\)\)\);/, /\$\{activeOffer\.discount\}% OFF` : 'Offer'/],
    'app/product-details.tsx': [/\{discountPercent\(product\) > 0 && \(\s*<View style=\{styles\.discountBadge\}>/],
  };
  for (const [file, patterns] of Object.entries(checks)) for (const pattern of patterns) assert.match(source(file), pattern, `${file} ${pattern}`);
  // Prices keep their existing, price-dependent conditions (guests still see no prices).
  assert.match(source('app/search.tsx'), /\{onSale && <Text style=\{styles\.oldPrice\}/);
  assert.match(source('app/category-products.tsx'), /hasDiscount \? \(/);
  // Slideshow: no fake percentages for Buy & Get offers without a discount; no guest-specific zeroing.
  assert.doesNotMatch(source('app/index.tsx'), /discount: token \? /);
  assert.match(source('services/catalogService.ts'), /discount: discountPercent\(product\) \};/);
});
