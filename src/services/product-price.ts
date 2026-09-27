export const getFinalPrice = (
  product: { price?: number; discount?: number; discountedPrice?: number }
) => {
  const originalPrice =
    Number(product.price) || 0;
  const discount =
    Number(product.discount) || 0;
  if (
    product.discountedPrice !== undefined &&
    product.discountedPrice !== null
  ) {
    return Number(
      product.discountedPrice
    );
  }
  if (
    discount <= 0
  ) {
    return Number(
      originalPrice.toFixed(2)
    );
  }
  const finalPrice =
    originalPrice -
    (
      originalPrice *
      discount
    ) / 100;
  return Number(
    finalPrice.toFixed(2)
  );
};
