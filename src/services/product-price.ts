// Catalog prices are already authorized and rounded by the backend.
// Never derive class adjustments or reapply discounts in the Customer App.
export const getFinalPrice = (product: { price?: number; discount?: number; discountedPrice?: number }) => {
  const price = product.discountedPrice ?? product.price;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : 0;
};
