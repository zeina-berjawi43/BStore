type PricedItem = { product: { _id: string; discountedPrice?: number } | null; quantity: number; price: number };

export const cartTotal = (items: { price: number; quantity: number }[]) =>
  items.reduce((cents, item) => cents + Math.round(item.price * 100) * item.quantity, 0) / 100;

// Checkout charges the current product price, not the snapshot saved when an item was added.
export function currentCartPrices<T extends PricedItem>(items: T[]): T[] {
  return items.map(item => {
    if (!item.product?._id) throw new Error('A product in your cart is no longer available. Please contact BStore to update your cart.');
    const price = Number(item.product.discountedPrice ?? item.price);
    if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error('Your cart contains an invalid price or quantity. Please reopen your cart.');
    }
    return { ...item, price: Math.round(price * 100) / 100 };
  });
}
