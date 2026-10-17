// Reserved rows keep each grid design independent of discount/name/quantity.
export const productCardLayout = {
  content: { flexGrow: 0, flexShrink: 0, justifyContent: 'flex-start' as const, gap: 4 },
  flowPrice: { flex: 1, minWidth: 0, alignSelf: 'flex-start' as const },
  title: { height: 36, lineHeight: 18 },
  price: { height: 34, minHeight: 34, justifyContent: 'flex-end' as const, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bottom: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2, width: '100%' as const },
};
