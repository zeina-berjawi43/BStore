// Shared dimensions; cards may grow for large text and long localized content.
export const shoppingCardLayout = {
  card: { padding: 10, marginBottom: 10, minHeight: 140 },
  image: { width: 96, height: 96 },
  info: { paddingRight: 24 },
  remove: { position: 'absolute' as const, top: 0, right: 0, width: 44, height: 44,
    alignItems: 'center' as const, justifyContent: 'center' as const, zIndex: 10 },
};
