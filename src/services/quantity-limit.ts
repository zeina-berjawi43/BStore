// Maximum quantity per product per order (customer app: native and web).
//
// Mirrors the backend rule (backend/services/quantityLimit.js) for immediate
// feedback only. The backend re-checks every cart change and order with the
// current product data and is the final authority.
//
// One cart = one order, so the cart quantity of a product is what is limited.
// It applies identically to Retail and Wholesale customers.

export const QUANTITY_LIMIT_EXCEEDED = 'QUANTITY_LIMIT_EXCEEDED';
export const QUANTITY_LIMIT_TITLE = 'Maximum Quantity Reached';

type LimitedProduct = { _id?: string; id?: string; name?: string; quantityLimitEnabled?: unknown; maxQuantityPerOrder?: unknown } | null | undefined;

// Positive integer limit, or null when the product is unlimited (missing fields,
// disabled toggle, or malformed data all keep the original unlimited behaviour).
export function productQuantityLimit(product: LimitedProduct): number | null {
  if (!product || product.quantityLimitEnabled !== true) return null;
  const max = product.maxQuantityPerOrder;
  return typeof max === 'number' && Number.isSafeInteger(max) && max >= 1 ? max : null;
}

export function quantityLimitMessage(name: string | undefined, max: number) {
  const label = typeof name === 'string' && name.trim() ? name.trim() : 'this product';
  return `You can order a maximum of ${max} of ${label} per order.`;
}

// Message when moving from `current` to `next` would break the limit, else null.
// Decreases are always allowed so a cart above a newly lowered limit can be fixed.
export function quantityLimitBlock(product: LimitedProduct, current: number, next: number): string | null {
  const max = productQuantityLimit(product);
  if (max === null || next <= current || next <= max) return null;
  return quantityLimitMessage(product?.name, max);
}

export type QuantityLimitIssue = { productId: string; name: string; quantity: number; maxQuantityPerOrder: number };

// Cart rows whose (aggregated) quantity is above the product's current limit,
// e.g. after the Admin lowered the maximum. Nothing is changed automatically.
export function cartQuantityLimitIssues(items: { product?: LimitedProduct; quantity: number }[]): QuantityLimitIssue[] {
  const totals = new Map<string, { product: LimitedProduct; quantity: number }>();
  for (const item of items || []) {
    const id = String(item?.product?._id || item?.product?.id || '');
    if (!id) continue;
    const entry = totals.get(id);
    totals.set(id, { product: item.product, quantity: (entry?.quantity || 0) + (Number(item.quantity) || 0) });
  }
  const issues: QuantityLimitIssue[] = [];
  for (const [productId, { product, quantity }] of totals) {
    const max = productQuantityLimit(product);
    if (max !== null && quantity > max) issues.push({ productId, name: product?.name || 'This product', quantity, maxQuantityPerOrder: max });
  }
  return issues;
}

export function cartQuantityLimitSummary(issues: QuantityLimitIssue[]) {
  if (issues.length === 1) {
    const [issue] = issues;
    return `${quantityLimitMessage(issue.name, issue.maxQuantityPerOrder)} Your cart has ${issue.quantity}. Reduce the quantity to continue to checkout.`;
  }
  return 'Some products in your cart are above their maximum quantity per order. Reduce the highlighted quantities to continue to checkout.';
}

export class QuantityLimitError extends Error {
  code = QUANTITY_LIMIT_EXCEEDED;
  title = QUANTITY_LIMIT_TITLE;
}

// Cache-first reconciliation without extra requests: of two local copies of the same
// product (the cart row and a catalog/details copy), use the one the server saved most
// recently. Saving a quantity limit updates the product's updatedAt, so a background
// catalog refresh can lift or tighten "+" immediately. Without comparable timestamps the
// preferred (cart) copy is kept. The backend still validates every change.
export function newestProductCopy<T extends object>(preferred: T | null | undefined, other: T | null | undefined): T | null | undefined {
  if (!preferred || !other) return preferred || other;
  const stamp = (value: T) => { const time = (value as { updatedAt?: unknown }).updatedAt; return typeof time === 'string' ? Date.parse(time) : NaN; };
  const a = stamp(preferred), b = stamp(other);
  return Number.isFinite(b) && (!Number.isFinite(a) || b > a) ? other : preferred;
}
