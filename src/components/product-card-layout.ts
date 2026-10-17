// Reserved rows keep each grid design independent of discount/name/quantity.
export const productCardLayout = {
  title: { height: 36, lineHeight: 18 },
  price: { height: 42, minHeight: 42, justifyContent: 'center' as const, flexGrow: 0, flexShrink: 0 },
  bottom: { flexDirection: 'column' as const, alignItems: 'stretch' as const, gap: 6, width: '100%' as const },
};
