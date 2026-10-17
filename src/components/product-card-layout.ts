// Reserved rows keep each grid design independent of discount/name/quantity.
export const productCardLayout = {
  title: { height: 32, lineHeight: 16 },
  price: { height: 34, minHeight: 34, justifyContent: 'center' as const, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bottom: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2, width: '100%' as const },
};
