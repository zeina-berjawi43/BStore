// Unified Offers eligibility rules (Buy & Get Free products + active percentage discounts).
const test = require('node:test'), assert = require('node:assert/strict');
const { load } = require('./shopping-fixture.cjs');
const offers = load('services/offers.ts', { './social-metadata': load('services/social-metadata.ts') });
const BUY_GET = '6afa01170b8dc1a73f68a832';
const ids = list => Array.from(list, p => p._id);
const inBuyGet = (extra = {}) => ({ _id: 'bundle', discount: 0, availability: true, category: { _id: 'offers-cat', name: 'Offers', department: BUY_GET }, ...extra });
const regular = (extra = {}) => ({ _id: 'chips', discount: 0, availability: true, category: { _id: 'chips-cat', name: 'Chips', department: 'snacks' }, ...extra });

test('1. Buy & Get Free products qualify without a discount', () => {
  assert.equal(offers.isBuyGetOffer(inBuyGet()), true);
  assert.equal(offers.isSpecialDiscount(inBuyGet()), false);
  assert.equal(offers.isBuyGetOffer(inBuyGet({ category: { _id: 'x', department: { _id: BUY_GET } } })), true, 'populated department object');
});

test('2-3. regular products qualify only while an active discount applies (existing rule)', () => {
  assert.equal(offers.isSpecialDiscount(regular({ discount: 20 })), true);
  assert.equal(offers.isSpecialDiscount(regular({ discount: 100 })), true);
  for (const discount of [0, -5, 101, NaN, '20', undefined]) assert.equal(offers.isSpecialDiscount(regular({ discount })), false, String(discount));
  assert.equal(offers.isSpecialDiscount(regular({ discount: 20, availability: false })), false, 'existing offers rule requires availability');
  assert.equal(offers.isBuyGetOffer(regular({ discount: 20 })), false, '4. stays a regular product of its own category');
});

test('5-6. eligibility follows the department relationship, never category names', () => {
  assert.equal(offers.isBuyGetOffer(inBuyGet({ category: { _id: 'offers-cat', name: 'Renamed by admin', department: BUY_GET } })), true, 'renamed category');
  assert.equal(offers.isBuyGetOffer(inBuyGet({ category: { _id: 'offers-cat', name: 'Offers', department: 'snacks' } })), false, 'moved out of Buy & Get Free');
  assert.equal(offers.isBuyGetOffer(regular({ category: { _id: 'c', name: 'Buy & Get Free Offers', department: 'snacks' } })), false, 'name alone never qualifies');
  for (const category of [null, undefined, 'offers-cat', { _id: 'c' }, { _id: 'c', department: null }]) assert.equal(offers.isBuyGetOffer({ _id: 'p', category }), false);
});

test('7-10. filters: product in both types once per filter and once in All; exact counts; empty sets', () => {
  const both = inBuyGet({ _id: 'both', discount: 10 });
  const list = [inBuyGet(), both, regular({ _id: 'sale', discount: 20 }), regular({ _id: 'sale', discount: 20 }), { ...both }];
  assert.deepEqual(ids(offers.filterOffers(list, offers.OFFERS_ALL)), ['bundle', 'both', 'sale']);
  assert.deepEqual(ids(offers.filterOffers(list, offers.OFFERS_BUY_GET)), ['bundle', 'both']);
  assert.deepEqual(ids(offers.filterOffers(list, offers.OFFERS_SPECIAL)), ['both', 'sale']);
  assert.equal(offers.filterOffers([], offers.OFFERS_ALL).length, 0);
  assert.equal(offers.filterOffers([regular({ _id: 'sale', discount: 20 })], offers.OFFERS_BUY_GET).length, 0);
  assert.deepEqual(Array.from(offers.uniqueOffers([{ id: 'a' }, { _id: 'a' }, { _id: '' }]), p => p._id ?? p.id), ['a'], 'same product once; ID-less entries are never shown');
});

test('exactly three filters, in order: All | Buy & Get | Special Discounts', () => {
  assert.deepEqual(['All', ...Array.from(offers.OFFER_FILTERS, f => f.name)], ['All', 'Buy & Get', 'Special Discounts']);
});

test('11. one server-filtered request returns the complete set (no client paging assumptions)', () => {
  assert.equal(offers.OFFERS_QUERY, '?department=' + BUY_GET);
  const many = Array.from({ length: 1500 }, (_, i) => regular({ _id: 's' + i, discount: 5 }));
  assert.equal(offers.filterOffers(many, offers.OFFERS_ALL).length, 1500);
});
