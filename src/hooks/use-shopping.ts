import { useEffect, useRef, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { getSessionSnapshot } from '../services/tokenStorage';
import { shoppingState, ShoppingProduct } from '../services/shopping-state';
import { useProductFeedback } from '../components/product-feedback';

export function useShopping() {
  const state = useSyncExternalStore(shoppingState.subscribe, shoppingState.getSnapshot, shoppingState.getSnapshot);
  const { showAlert, feedback } = useProductFeedback();
  const mounted = useRef(true);
  const observed = useRef(new WeakSet<Promise<void>>());
  useEffect(() => { mounted.current = true; void shoppingState.refresh().catch(() => {}); return () => { mounted.current = false; }; }, []);
  const act = async (operation: () => Promise<void>, message?: string, title?: string) => {
    if (!getSessionSnapshot().authenticated) { router.push('/login'); return; }
    const revision = getSessionSnapshot().revision;
    const promise = operation();
    if (observed.current.has(promise)) { await promise.catch(() => {}); return; }
    observed.current.add(promise);
    if (message) showAlert(message, title);
    try { await promise; } catch (error) {
      if (mounted.current && revision === getSessionSnapshot().revision) showAlert(error instanceof Error ? error.message : 'Please try again.', 'Could not save');
    }
  };
  return { ...state, feedback, showAlert, refresh: shoppingState.refresh,
    add: (product: ShoppingProduct) => {
      const id = String(product._id || product.id);
      if (product.availability === false || shoppingState.getSnapshot().pendingCart.has(id)) return Promise.resolve();
      return act(() => shoppingState.add(product), `${product.name} has been added to your cart.`, 'Added to Cart');
    },
    toggle: (product: ShoppingProduct) => {
      const id = String(product._id || product.id);
      if (shoppingState.getSnapshot().pendingFavorites.has(id)) return Promise.resolve();
      const selected = !shoppingState.getSnapshot().favorites.some(p => String(p._id || p.id) === id);
      return act(() => shoppingState.favorite(product, selected), selected ? 'Product has been added to your favorites.' : 'Product has been removed from your favorites.', selected ? 'Added to Favorites' : 'Removed from Favorites');
    },
    remove: (id: string) => act(() => shoppingState.remove(id)),
    quantity: (id: string, quantity: number) => act(() => shoppingState.quantity(id, quantity)),
    clearCart: () => act(shoppingState.clearCart), clearFavorites: () => act(shoppingState.clearFavorites) };
}
