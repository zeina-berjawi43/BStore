import { router } from 'expo-router';

export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function goBackOrSettings() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

// Return to the retained Home instance without remounting its catalog.
export function startShopping() {
  router.dismissTo('/');
}

export function orderNotificationState(orderId: string) {
  return { index: 2, routes: [
    { name: 'index' }, { name: 'orders' },
    { name: 'order-details', params: { orderId } },
  ] };
}
