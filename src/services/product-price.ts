// Catalog prices are already authorized and rounded by the backend.
// Never derive class adjustments or reapply discounts in the Customer App.
export const getFinalPrice = (product: { price?: number; discount?: number; discountedPrice?: number }) => {
  const price = product.discountedPrice ?? product.price;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : 0;
};

// Percentage-discount badge for every product card, slide and detail view. Uses only the public,
// Admin-configured catalog percentage (the backend's existing rule: 0 < discount <= 100), never a
// price, so it is identical for guests, Retail and Wholesale customers. 0 means "show no badge".
export const discountPercent = (product: { discount?: unknown }): number => {
  const discount = product.discount;
  return typeof discount === 'number' && Number.isFinite(discount) && discount > 0 && discount <= 100 ? discount : 0;
};
