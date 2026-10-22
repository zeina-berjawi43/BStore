import { API_URL, getValidAccessToken } from './authService';
import { request } from './request';
import { getSessionSnapshot, subscribeSession, onPricingChanged } from './tokenStorage';
import { currentCartPrices } from './cartPricing';
import { getFinalPrice } from './product-price';
import type { DeliveryRules } from './delivery-pricing';

export type ShoppingProduct = { _id?: string; id?: string; name: string; discountedPrice?: number; price?: number; availability?: boolean; [key: string]: any };
export type ShoppingItem = { product: ShoppingProduct & { _id: string }; quantity: number; price: number };
type Data = { cart: ShoppingItem[]; favorites: ShoppingProduct[]; minimum: number; deliveryRules?: DeliveryRules };
type Operation = { kind: 'add' | 'quantity' | 'remove' | 'favorite' | 'clearCart' | 'clearFavorites'; id: string; product?: ShoppingProduct; quantity?: number; selected?: boolean; started?: boolean; resolve: () => void; reject: (error: Error) => void; promise: Promise<void> };
const productId = (product: ShoppingProduct) => String(product._id || product.id || '');
const empty = (): Data => ({ cart: [], favorites: [], minimum: Infinity });

// Confirmed server data plus an ordered operation log. Rollback removes only the
// failed operation, preserving newer user intent and unrelated products.
export function createShoppingState(deps: { send: (path: string, method?: string, body?: object) => Promise<any>; authenticated: () => boolean }) {
  let confirmed = empty(), operations: Operation[] = [], generation = 0, running = false;
  const intents = new Map<string, number>();
  let loaded = false, favoritesLoaded = false, loading: Promise<void> | null = null, mutationRevision = 0;
  let cartLoading: Promise<void> | null = null;
  let cartError: Error | null = null;
  let uncertainCart = false;
  const failedCart = new Map<string, { quantity: number; error: Error }>();
  const matches = (id: string, quantity: number) => id === '' ? confirmed.cart.length === 0
    : (confirmed.cart.find(item => item.product._id === id)?.quantity || 0) === quantity;
  const acceptCart = (data: any) => {
    if (!Array.isArray(data.cart?.items)) throw Error('Could not verify your cart. Please try again.');
    confirmed = { ...confirmed, cart: currentCartPrices(data.cart.items), minimum: data.minimumOrderValue ?? confirmed.minimum,
      deliveryRules: data.pricing?.deliveryRules ?? confirmed.deliveryRules };
    for (const [id, failure] of failedCart) if (matches(id, failure.quantity)) failedCart.delete(id);
    cartError = failedCart.values().next().value?.error || null;
    uncertainCart = false; loaded = true;
  };
  const listeners = new Set<() => void>();
  let snapshot = { ...empty(), ready: false, favoritesReady: false, busy: false, pendingCart: new Set<string>(), pendingFavorites: new Set<string>(), cartCount: 0 };
  const apply = (data: Data, op: Operation): Data => {
    if (op.kind === 'clearCart') return { ...data, cart: [] };
    if (op.kind === 'clearFavorites') return { ...data, favorites: [] };
    if (op.kind === 'favorite') return { ...data, favorites: op.selected
      ? data.favorites.some(p => productId(p) === op.id) ? data.favorites : [...data.favorites, op.product!]
      : data.favorites.filter(p => productId(p) !== op.id) };
    const item = data.cart.find(value => value.product._id === op.id);
    if (op.kind === 'remove') return { ...data, cart: data.cart.filter(value => value.product._id !== op.id) };
    if (op.kind === 'quantity') {
      if (op.quantity === 0) return { ...data, cart: data.cart.filter(value => value.product._id !== op.id) };
      return { ...data, cart: item ? data.cart.map(value => value === item ? { ...value, quantity: op.quantity! } : value)
        : op.product ? [...data.cart, { product: { ...op.product, _id: op.id }, quantity: op.quantity!, price: getFinalPrice(op.product) ?? 0 }] : data.cart };
    }
    return { ...data, cart: item ? data.cart.map(value => value === item ? { ...value, quantity: value.quantity + 1 } : value)
      : [...data.cart, { product: { ...op.product!, _id: op.id }, quantity: 1, price: getFinalPrice(op.product!) ?? 0 }] };
  };
  const publish = () => {
    const data = operations.reduce(apply, confirmed);
    snapshot = { ...data, ready: loaded, favoritesReady: favoritesLoaded, busy: operations.length > 0 || loading !== null,
      pendingCart: new Set(operations.filter(op => !['favorite', 'clearFavorites'].includes(op.kind)).map(op => op.id)),
      pendingFavorites: new Set(operations.filter(op => ['favorite', 'clearFavorites'].includes(op.kind)).map(op => op.id)),
      cartCount: data.cart.reduce((count, item) => count + item.quantity, 0) };
    listeners.forEach(fn => fn());
  };
  const reset = () => {
    intents.clear(); failedCart.clear(); uncertainCart = false;
    generation++; confirmed = empty(); loaded = false; favoritesLoaded = false; loading = null; cartLoading = null; cartError = null;
    const previous = operations; operations = []; running = false; publish();
    previous.forEach(op => op.reject(Error('Your session changed.')));
  };
  const refresh = (force = false): Promise<void> => {
    if (!deps.authenticated()) return Promise.resolve();
    if (loading) return loading;
    if (loaded && (!force || operations.length)) return Promise.resolve();
    const version = generation;
    const readRevision = mutationRevision, initial = !loaded;
    const cartWork = deps.send('/cart').then(cart => {
      if (version !== generation) return;
      if (!initial && readRevision !== mutationRevision) return;
      acceptCart(cart); publish();
    }).catch(error => {
      if (version !== generation || (!initial && readRevision !== mutationRevision)) return;
      cartError = error instanceof Error ? error : Error('Could not load your cart.');
      throw error;
    }).finally(() => { if (version === generation) cartLoading = null; });
    cartLoading = cartWork;
    const favoriteWork = deps.send('/favorites').then(favorites => {
      if (version !== generation || (!initial && readRevision !== mutationRevision)) return;
      confirmed = { ...confirmed, favorites: (favorites.favorites || []).map((item: any) => item.product).filter((p: any) => p && typeof p === 'object') };
      favoritesLoaded = true;
      publish();
    });
    const work = Promise.allSettled([cartWork, favoriteWork]).then(results => {
      for (const result of results) if (result.status === 'rejected') throw result.reason;
    }).finally(() => { if (version === generation) { loading = null; publish(); } });
    loading = work; publish(); return work;
  };
  const drain = async () => {
    if (running) return;
    running = true; const version = generation; let reconcile = false;
    while (operations.length && version === generation) {
      const op = operations[0];
      const cartOperation = !['favorite', 'clearFavorites'].includes(op.kind);
      let intendedQuantity: number | undefined;
      let confirmationAttempted = false;
      try {
        void refresh().catch(() => {});
        await (cartLoading || Promise.resolve());
        if (!loaded) throw cartError || Error('Could not load your cart.');
        if (version !== generation) break;
        // A timed-out write may already exist on the server. Resolve that ambiguity
        // before choosing add versus update for a newer absolute quantity intent.
        if (uncertainCart && cartOperation) {
          const cart = await deps.send('/cart');
          if (version !== generation) break;
          acceptCart(cart); mutationRevision++; publish();
        }
        intendedQuantity = op.kind === 'add' ? (confirmed.cart.find(item => item.product._id === op.id)?.quantity || 0) + 1
          : op.kind === 'quantity' ? op.quantity : 0;
        op.started = true;
        const inline = op.kind === 'quantity' && op.product;
        const cartAction = inline ? op.quantity === 0 ? 'remove' : confirmed.cart.some(item => item.product._id === op.id) ? 'update' : 'add' : op.kind === 'quantity' ? 'update' : op.kind;
        const path = op.kind === 'favorite' ? `/favorites/${op.selected ? 'add' : 'remove'}`
          : op.kind === 'clearFavorites' ? '/favorites/clear' : op.kind === 'clearCart' ? '/cart/clear'
          : `/cart/${cartAction}`;
        const method = cartAction === 'add' || (op.kind === 'favorite' && op.selected) ? 'POST' : cartAction === 'update' ? 'PUT' : 'DELETE';
        const absent = inline && op.quantity === 0 && !confirmed.cart.some(item => item.product._id === op.id);
        let data = absent ? {} : await deps.send(path, method, op.id ? { productId: op.id, ...(op.kind === 'add' ? { quantity: 1 } : op.kind === 'quantity' && op.quantity! > 0 ? { quantity: op.quantity } : {}) } : undefined);
        if (version !== generation) break;
        if (cartOperation && !absent && !Array.isArray(data.cart?.items)) {
          confirmationAttempted = true; uncertainCart = true;
          data = await deps.send('/cart');
          if (version !== generation) break;
          if (!Array.isArray(data.cart?.items)) throw Error('Could not verify your cart. Please try again.');
        }
        const next = apply(confirmed, op);
        if (Array.isArray(data.cart?.items)) {
          acceptCart(data);
          if (cartOperation && !matches(op.id, intendedQuantity!)) throw Error('The saved cart does not match your change. Please try again.');
          if (cartOperation && matches(op.id, intendedQuantity!)) {
            if (op.kind === 'clearCart') failedCart.clear(); else failedCart.delete(op.id);
            cartError = failedCart.values().next().value?.error || null;
          }
        } else confirmed = next;
        operations.shift(); mutationRevision++; publish(); op.resolve();
      } catch (error) {
        if (version !== generation) break;
        const failure = error instanceof Error ? error : Error('Could not save your change.');
        const status = (error as { status?: number })?.status;
        // Transport/parsing/session-verification failures and 5xx responses can follow a committed write.
        const uncertain = !status || status === 409 || status >= 500;
        if (cartOperation && op.started && uncertain && !confirmationAttempted) {
          uncertainCart = true;
          try {
            const cart = await deps.send('/cart');
            if (version !== generation) break;
            acceptCart(cart); mutationRevision++;
            if (matches(op.id, intendedQuantity!)) {
              if (op.kind === 'clearCart') failedCart.clear(); else failedCart.delete(op.id);
              cartError = failedCart.values().next().value?.error || null;
              operations.shift(); mutationRevision++; publish(); op.resolve(); continue;
            }
          } catch { if (version !== generation) break; }
        }
        if (cartOperation) {
          cartError = failure;
          if (intendedQuantity !== undefined) failedCart.set(op.id, { quantity: intendedQuantity, error: failure });
        } else reconcile = true;
        operations.shift(); mutationRevision++; publish(); op.reject(failure);
      }
    }
    if (version === generation) {
      running = false;
      // Favorites retain their existing rollback/refetch behavior. Cart writes reconcile inline.
      if (reconcile) void refresh(true).catch(() => {});
    }
  };
  const synchronizeCart = async () => {
    const version = generation;
    for (;;) {
      if (version !== generation || !deps.authenticated()) throw Error('Your session changed.');
      const pending = operations.filter(op => !['favorite', 'clearFavorites'].includes(op.kind));
      if (pending.length) { await Promise.all(pending.map(op => op.promise)); continue; }
      if (cartLoading) { await cartLoading; continue; }
      if (cartError) throw cartError;
      if (!loaded) throw Error('Please wait for your cart to load.');
      return snapshot;
    }
  };
  const enqueue = (input: Omit<Operation, 'promise' | 'resolve' | 'reject'>) => {
    if (!deps.authenticated()) return Promise.reject(Error('Please log in to save your change.'));
    if (['quantity', 'add', 'remove', 'clearCart'].includes(input.kind)) {
      intents.set('', (intents.get('') || 0) + 1);
      if (input.kind === 'clearCart') {
        for (const id of intents.keys()) if (id) intents.set(id, intents.get(id)! + 1);
      } else intents.set(input.id, (intents.get(input.id) || 0) + 1);
    }
    if (input.kind === 'quantity') {
      const tail = operations.at(-1);
      const previous = tail?.kind === 'quantity' && tail.id === input.id && !tail.started ? tail : undefined;
      if (previous) { previous.quantity = input.quantity; previous.product ||= input.product; publish(); return previous.promise; }
    }
    const duplicate = operations.find(op => op.kind === input.kind && op.id === input.id);
    if (duplicate && input.kind !== 'quantity') return duplicate.promise;
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    operations.push({ ...input, promise, resolve, reject }); mutationRevision++; publish(); void drain(); return promise;
  };
  return { intentVersion: (id: string) => intents.get(id) || 0, getSnapshot: () => snapshot, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, reset, refresh, synchronizeCart,
    adjust: (product: ShoppingProduct, delta: number) => {
      const id = productId(product), current = snapshot.cart.find(item => item.product._id === id)?.quantity || 0;
      if (!id || ![-1, 1].includes(delta) || (delta > 0 && product.availability === false)) return Promise.resolve();
      const quantity = Math.max(0, current + delta);
      if (!Number.isSafeInteger(quantity) || quantity === current) return Promise.resolve();
      return enqueue({ kind: 'quantity', id, product, quantity });
    },
    add: (product: ShoppingProduct) => enqueue({ kind: 'add', id: productId(product), product }),
    favorite: (product: ShoppingProduct, selected: boolean) => enqueue({ kind: 'favorite', id: productId(product), product, selected }),
    quantity: (id: string, quantity: number) => Number.isSafeInteger(quantity) && quantity >= 1 ? enqueue({ kind: 'quantity', id, quantity }) : Promise.reject(Error('Enter a whole number of at least 1.')),
    remove: (id: string) => enqueue({ kind: 'remove', id }),
    clearCart: () => enqueue({ kind: 'clearCart', id: '' }), clearFavorites: () => enqueue({ kind: 'clearFavorites', id: '' }) };
}

export const shoppingState = createShoppingState({ authenticated: () => getSessionSnapshot().authenticated,
  send: async (path, method = 'GET', body) => {
    const revision = getSessionSnapshot().revision;
    const token = await getValidAccessToken();
    if (!token || revision !== getSessionSnapshot().revision) throw Error('Please log in to save your change.');
    const response = await request(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw Object.assign(Error(data.message || 'Could not save your change. Please try again.'), { status: response.status });
    return data;
  } });
let revision = getSessionSnapshot().revision;
onPricingChanged(() => { shoppingState.reset(); void shoppingState.refresh().catch(() => {}); });
subscribeSession(() => {
  const session = getSessionSnapshot();
  if (session.revision !== revision || !session.authenticated) { revision = session.revision; shoppingState.reset(); }
});
