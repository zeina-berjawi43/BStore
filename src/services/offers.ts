// Unified Offers: Buy & Get Free offer products + products with an active percentage discount.
//
// The backend selects the eligible products (GET /products/offers?department=<Buy & Get Free id>),
// so the complete set arrives in one small response, independent of any catalog paging.
// These pure helpers only classify and filter that response for the three Offers filters; they
// never change prices, create products or depend on category names.
import { BUY_GET_FREE_DEPARTMENT } from './social-metadata';

export const OFFERS_ALL = 'ALL';
export const OFFERS_BUY_GET = 'buy-get';
export const OFFERS_SPECIAL = 'special-discounts';
// Exactly three filters, in this order (rendered with the existing department tab design).
export const OFFER_FILTERS = [
  { _id: OFFERS_BUY_GET, name: 'Buy & Get' },
  { _id: OFFERS_SPECIAL, name: 'Special Discounts' },
] as const;

type OfferProduct = {
  _id?: string; id?: string; discount?: number; availability?: boolean;
  category?: { _id?: string; department?: string | { _id?: string } | null } | string | null;
};

const productId = (product: OfferProduct) => String(product._id ?? product.id ?? '');

// Buy & Get: the product's category belongs to the existing Buy & Get Free department.
export function isBuyGetOffer(product: OfferProduct) {
  const category = product.category;
  if (!category || typeof category !== 'object') return false;
  const department = category.department;
  const id = typeof department === 'object' && department ? department._id : department;
  return id === BUY_GET_FREE_DEPARTMENT.id;
}

// Special Discounts: the backend's existing discount rule, unchanged (0 < discount <= 100, available).
export function isSpecialDiscount(product: OfferProduct) {
  const discount = product.discount;
  return typeof discount === 'number' && discount > 0 && discount <= 100 && product.availability === true;
}

// One card per real product ID, preserving the server order.
export function uniqueOffers<T extends OfferProduct>(products: T[]): T[] {
  const seen = new Set<string>();
  return products.filter(product => { const id = productId(product); if (!id || seen.has(id)) return false; seen.add(id); return true; });
}

export function filterOffers<T extends OfferProduct>(products: T[], filter: string): T[] {
  const unique = uniqueOffers(products);
  if (filter === OFFERS_BUY_GET) return unique.filter(isBuyGetOffer);
  if (filter === OFFERS_SPECIAL) return unique.filter(isSpecialDiscount);
  return unique;
}

// Query added to the existing offers endpoint; ignored by older backends (which then return the
// discounted products only, so nothing breaks during a staged deployment).
export const OFFERS_QUERY = `?department=${encodeURIComponent(BUY_GET_FREE_DEPARTMENT.id)}`;
