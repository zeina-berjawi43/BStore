// Reserved rows keep each grid design independent of discount/name/quantity.
export const productCardLayout = {
  title: { height: 36, lineHeight: 18 },
  price: { height: 42, minHeight: 42, justifyContent: 'center' as const, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bottom: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, width: '100%' as const },
};
