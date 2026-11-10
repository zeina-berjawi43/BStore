import { fetchCurrentUser } from './authService';
import { getSessionSnapshot, peekSessionUser } from './tokenStorage';

// DEMO accounts (screen recordings) show this placeholder instead of every amount.
// The flag comes from the backend profile and is a display hint only: the backend
// independently removes all prices from DEMO responses and rejects DEMO orders.
export const DEMO_PRICE = 'X$';
export const DEMO_ORDER_MESSAGE = 'Demo Mode — Orders cannot be placed.';
export const isDemoMode = () => (peekSessionUser() as { demoMode?: unknown } | null)?.demoMode === true;

// Every authenticated catalog/cart/favorites response states whether the account is DEMO.
// When an admin switches DEMO on or off, the cached profile disagrees with the server:
// re-read the profile once, which reloads prices (see saveSessionUser in tokenStorage).
const RESYNC_COOLDOWN_MS = 15000;
let resyncing = false, lastResync = 0;
export function syncDemoMode(data: unknown) {
  if (!getSessionSnapshot().authenticated || !data || typeof data !== 'object') return;
  if (((data as { demoMode?: unknown }).demoMode === true) === isDemoMode()) return;
  if (resyncing || Date.now() - lastResync < RESYNC_COOLDOWN_MS) return;
  resyncing = true; lastResync = Date.now();
  void fetchCurrentUser().catch(() => {}).finally(() => { resyncing = false; });
}
