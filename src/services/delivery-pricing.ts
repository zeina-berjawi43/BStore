export type DeliveryRules = { priceClass: 'A' | 'B' | 'C'; minimumCheckoutAmount: number; freeDeliveryThreshold?: number; deliveryFeeBelowThreshold?: number };

// Display-only projection of the backend's current rules. Checkout independently recalculates in its transaction.
export function deliverySummary(subtotal: number, rules?: DeliveryRules, minimum = Infinity) {
  const cents = Math.round(subtotal * 100);
  const minimumCents = Math.round((rules?.minimumCheckoutAmount ?? minimum) * 100);
  const allowed = cents >= minimumCents;
  const classC = rules?.priceClass === 'C';
  const threshold = classC ? Math.round((rules.freeDeliveryThreshold ?? Infinity) * 100) : 0;
  const deliveryFee = classC && allowed && cents < threshold ? rules.deliveryFeeBelowThreshold ?? 0 : 0;
  const remaining = Math.max(0, minimumCents - cents) / 100;
  const toFree = Math.max(0, threshold - cents) / 100;
  return { subtotal, deliveryFee, total: (cents + Math.round(deliveryFee * 100)) / 100, allowed, classC, remaining, toFree,
    message: !allowed ? `Add $${remaining.toFixed(2)} more to reach the minimum order.`
      : classC ? (toFree > 0 ? `Add $${toFree.toFixed(2)} more to enjoy FREE delivery.` : "You've got FREE delivery!") : 'Minimum order reached' };
}
