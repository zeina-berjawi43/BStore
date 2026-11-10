type PricedItem = { product: { _id: string; discountedPrice?: number } | null; quantity: number; price: number };

export const cartTotal = (items: { price: number; quantity: number }[]) =>
  items.reduce((cents, item) => cents + Math.round(item.price * 100) * item.quantity, 0) / 100;

// Checkout charges the current product price, not the snapshot saved when an item was added.
// demo: the backend marked this cart response as DEMO and sent no prices. Items keep an
// internal 0 that is never displayed (every amount renders as the X$ placeholder).
export function currentCartPrices<T extends PricedItem>(items: T[], demo = false): T[] {
  return items.map(item => {
    if (!item.product?._id) throw new Error('A product in your cart is no longer available. Please contact BStore to update your cart.');
    if (demo) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Your cart contains an invalid quantity. Please reopen your cart.');
      return { ...item, price: 0 };
    }
    const price = item.product.discountedPrice;
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error('Your cart contains an invalid price or quantity. Please reopen your cart.');
    }
    return { ...item, price: Math.round(price * 100) / 100 };
  });
}
