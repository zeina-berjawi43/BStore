// Reserved rows keep each grid design independent of discount/name/quantity.
export const productCardLayout = {
  content: { flexGrow: 0, flexShrink: 0, justifyContent: 'flex-start' as const, gap: 4 },
  flowPrice: { flex: 1, minWidth: 0, alignSelf: 'flex-start' as const },
  title: { height: 36, lineHeight: 18 },
  price: { height: 34, minHeight: 34, justifyContent: 'flex-end' as const, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bottom: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2, width: '100%' as const },
};

// Prices stay inside the reserved price row instead of wrapping into extra lines (which split
// values such as "$10." / "00" on 320px grids and made cards uneven). The designed size is kept
// whenever the measured width allows; only a price that would not fit is scaled down. A price that
// would fall below a readable size may use two smaller lines that still fit the reserved row.
// 0.64em is a deliberately conservative average advance for bold digits (Roboto, Segoe UI, SF).
const PRICE_CHAR_EM = 0.64;
export function fitPriceText(text: string, width: number, base: number, lineHeight: number, allowTwoLines = false) {
  if (!(width > 0)) return { style: { fontSize: base, lineHeight }, lines: 1 };
  const chars = Math.max(1, text.length);
  const single = Math.min(base, Math.floor(width / (chars * PRICE_CHAR_EM)));
  if (single >= 10 || !allowTwoLines) return { style: { fontSize: Math.max(8, single), lineHeight }, lines: 1 };
  const twoLine = Math.min(base, Math.floor(width / (Math.ceil(chars / 2) * PRICE_CHAR_EM)));
  return { style: { fontSize: Math.max(8, twoLine), lineHeight: productCardLayout.price.height / 2 }, lines: 2 };
}
