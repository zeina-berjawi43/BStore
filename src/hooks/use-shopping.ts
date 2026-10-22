import { useEffect, useRef, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { getSessionSnapshot } from '../services/tokenStorage';
import { shoppingState, ShoppingProduct } from '../services/shopping-state';
import { useProductFeedback } from '../components/product-feedback';

export function useShopping() {
  const state = useSyncExternalStore(shoppingState.subscribe, shoppingState.getSnapshot, shoppingState.getSnapshot);
  const { showAlert, updateAlert, feedback } = useProductFeedback();
  const mounted = useRef(true);
  const reportedErrors = useRef(new WeakSet<Promise<void>>());
  const observed = useRef(new WeakSet<Promise<void>>());
  useEffect(() => { mounted.current = true; void shoppingState.refresh().catch(() => {}); return () => { mounted.current = false; }; }, []);
  const act = async (operation: () => Promise<void>, message?: string, title?: string, confirm?: () => boolean, cartId?: string) => {
    if (!getSessionSnapshot().authenticated) { router.push('/login'); return; }
    const revision = getSessionSnapshot().revision;
    const promise = operation();
    const intent = cartId === undefined ? undefined : shoppingState.intentVersion(cartId);
    const reportError = (error: unknown) => {
      if (mounted.current && revision === getSessionSnapshot().revision &&
          (cartId === undefined || shoppingState.intentVersion(cartId) === intent) && !reportedErrors.current.has(promise)) {
        reportedErrors.current.add(promise);
        showAlert(error instanceof Error ? error.message : 'Please try again.', 'Could not save');
      }
    };
    const notice = message && confirm ? showAlert('Your cart change is being saved.', 'Updating cart') : undefined;
    const notify = () => {
      if (message && mounted.current && revision === getSessionSnapshot().revision && (!confirm || confirm())) {
        if (notice !== undefined) updateAlert(notice, message, title || 'Added to Cart');
        else showAlert(message, title);
      }
    };
    if (observed.current.has(promise)) {
      try { await promise; if (confirm) notify(); } catch (error) { reportError(error); }
      return;
    }
    observed.current.add(promise);
    try { await promise; notify(); } catch (error) {
      reportError(error);
    }
  };
  return { ...state, feedback, showAlert, refresh: shoppingState.refresh,
    adjust: (product: ShoppingProduct, delta: number) => act(() => shoppingState.adjust(product, delta), undefined, undefined, undefined, String(product._id || product.id)),
    add: (product: ShoppingProduct) => {
      const id = String(product._id || product.id);
      if (product.availability === false) return Promise.resolve();
      let intent = 0;
      return act(() => { const work = shoppingState.adjust(product, 1); intent = shoppingState.intentVersion(id); return work; }, `${product.name} has been added to your cart.`, 'Added to Cart', () => shoppingState.intentVersion(id) === intent && (shoppingState.getSnapshot().cart.find(item => item.product._id === id)?.quantity || 0) > 0, id);
    },
    toggle: (product: ShoppingProduct) => {
      const id = String(product._id || product.id);
      if (shoppingState.getSnapshot().pendingFavorites.has(id)) return Promise.resolve();
      const selected = !shoppingState.getSnapshot().favorites.some(p => String(p._id || p.id) === id);
      // The removed row is immediate feedback; avoid replaying success notices
      // as a sequence of background removals finishes.
      return act(() => shoppingState.favorite(product, selected), selected ? 'Product has been added to your favorites.' : undefined, selected ? 'Added to Favorites' : undefined);
    },
    remove: (id: string) => act(() => shoppingState.remove(id), undefined, undefined, undefined, id),
    quantity: (id: string, quantity: number) => act(() => shoppingState.quantity(id, quantity), undefined, undefined, undefined, id),
    clearCart: () => act(shoppingState.clearCart, undefined, undefined, undefined, ''), clearFavorites: () => act(shoppingState.clearFavorites) };
}
