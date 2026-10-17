// Reserved rows keep each grid design independent of discount/name/quantity.
export const productCardLayout = {
  title: { height: 36, lineHeight: 18 },
  price: { height: 34, minHeight: 34, justifyContent: 'flex-end' as const, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bottom: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2, width: '100%' as const },
};
