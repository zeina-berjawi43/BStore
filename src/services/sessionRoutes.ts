// Include public catalog screens: they also hold account-specific prices/favorites in memory.
export const publicRoutes = [
  'index', 'loading', 'category-products', 'department-categories', 'product-details',
  'search', 'settings', 'help', 'about', 'privacy',
] as const;
export const privateRoutes = [
  'account', 'edit-account', 'change-password', 'favorites', 'cart', 'checkout',
  'orders', 'order-details', 'notifications',
] as const;
export const guestRoutes = ['login', 'register', 'verify-otp', 'forgot-password', 'reset-password'] as const;

export const cleanSessionNavigationState = () => ({ index: 0, routes: [{ name: 'index' }] });
