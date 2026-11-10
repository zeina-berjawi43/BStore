import { API_URL, getValidAccessToken } from './authService';
import { request } from './request';
import { getSessionSnapshot, subscribeSession, onPricingChanged } from './tokenStorage';
import { currentCartPrices } from './cartPricing';
import { getFinalPrice } from './product-price';
import { syncDemoMode } from './demo-mode';
import type { DeliveryRules } from './delivery-pricing';

export type ShoppingProduct = { _id?: string; id?: string; name: string; discountedPrice?: number; price?: number; availability?: boolean; [key: string]: any };
export type ShoppingItem = { product: ShoppingProduct & { _id: string }; quantity: number; price: number };
type Data = { cart: ShoppingItem[]; favorites: ShoppingProduct[]; minimum: number; deliveryRules?: DeliveryRules };
type Operation = { kind: 'add' | 'adjust' | 'quantity' | 'remove' | 'favorite' | 'clearCart' | 'clearFavorites'; id: string; product?: ShoppingProduct; quantity?: number; selected?: boolean; started?: boolean; resolve: () => void; reject: (error: Error) => void; promise: Promise<void> };
type Resource = 'cart' | 'favorites';
const isCartOperation = (op: Pick<Operation, 'kind'>) => !['favorite', 'clearFavorites'].includes(op.kind);
const hasCart = (data: any) => data?.cart === null || Array.isArray(data?.cart?.items);
const productId = (product: ShoppingProduct) => String(product._id || product.id || '');
const empty = (): Data => ({ cart: [], favorites: [], minimum: Infinity });

// Confirmed server data plus an ordered operation log. Rollback removes only the
// failed operation, preserving newer user intent and unrelated products.
export function createShoppingState(deps: { send: (path: string, method?: string, body?: object) => Promise<any>; authenticated: () => boolean }) {
  let confirmed = empty(), operations: Operation[] = [], generation = 0, running = false;
  const intents = new Map<string, number>();
  let loaded = false, favoritesLoaded = false;
  const mutations = { cart: 0, favorites: 0 };
  let cartLoading: Promise<void> | null = null;
  let favoritesLoading: Promise<void> | null = null;
  let cartError: Error | null = null;
  let favoritesError: Error | null = null;
  let uncertainCart = false;
  let uncertainFavorites = false;
  const failedCart = new Map<string, { quantity: number; error: Error }>();
  const matches = (id: string, quantity: number) => id === '' ? confirmed.cart.length === 0
    : (confirmed.cart.find(item => item.product._id === id)?.quantity || 0) === quantity;
  const acceptCart = (data: any) => {
    if (!hasCart(data)) throw Error('Could not verify your cart. Please try again.');
    confirmed = { ...confirmed, cart: currentCartPrices(data.cart?.items || [], data.demoMode === true), minimum: data.minimumOrderValue ?? confirmed.minimum,
      deliveryRules: data.pricing?.deliveryRules ?? confirmed.deliveryRules };
    for (const [id, failure] of failedCart) if (matches(id, failure.quantity)) failedCart.delete(id);
    cartError = failedCart.values().next().value?.error || null;
    uncertainCart = false; loaded = true;
  };
  const acceptFavorites = (data: any) => {
    if (!Array.isArray(data?.favorites)) throw Error('Could not verify your favorites. Please try again.');
    confirmed = { ...confirmed, favorites: data.favorites.map((item: any) => item.product).filter((p: any) => p && typeof p === 'object') };
    favoritesLoaded = true; favoritesError = null; uncertainFavorites = false;
  };
  const listeners = new Set<() => void>();
  let snapshot = { ...empty(), ready: false, favoritesReady: false, busy: false, cartError: null as string | null, favoritesError: null as string | null, pendingCart: new Set<string>(), pendingFavorites: new Set<string>(), cartCount: 0 };
  const apply = (data: Data, op: Operation): Data => {
    if (op.kind === 'clearCart') return { ...data, cart: [] };
    if (op.kind === 'clearFavorites') return { ...data, favorites: [] };
    if (op.kind === 'favorite') return { ...data, favorites: op.selected
      ? data.favorites.some(p => productId(p) === op.id) ? data.favorites : [...data.favorites, op.product!]
      : data.favorites.filter(p => productId(p) !== op.id) };
    const item = data.cart.find(value => value.product._id === op.id);
    if (op.kind === 'remove') return { ...data, cart: data.cart.filter(value => value.product._id !== op.id) };
    if (op.kind === 'quantity' || op.kind === 'adjust') {
      const quantity = op.kind === 'adjust' ? Math.max(0, (item?.quantity || 0) + op.quantity!) : op.quantity!;
      if (quantity === 0) return { ...data, cart: data.cart.filter(value => value.product._id !== op.id) };
      return { ...data, cart: item ? data.cart.map(value => value === item ? { ...value, quantity } : value)
        : op.product ? [...data.cart, { product: { ...op.product, _id: op.id }, quantity, price: getFinalPrice(op.product) ?? 0 }] : data.cart };
    }
    return { ...data, cart: item ? data.cart.map(value => value === item ? { ...value, quantity: value.quantity + 1 } : value)
      : [...data.cart, { product: { ...op.product!, _id: op.id }, quantity: 1, price: getFinalPrice(op.product!) ?? 0 }] };
  };
  const publish = () => {
    const data = operations.reduce(apply, confirmed);
    snapshot = { ...data, ready: loaded, favoritesReady: favoritesLoaded, busy: operations.length > 0 || cartLoading !== null || favoritesLoading !== null,
      cartError: cartError?.message || null, favoritesError: favoritesError?.message || null,
      pendingCart: new Set(operations.filter(op => !['favorite', 'clearFavorites'].includes(op.kind)).map(op => op.id)),
      pendingFavorites: new Set(operations.filter(op => ['favorite', 'clearFavorites'].includes(op.kind)).map(op => op.id)),
      cartCount: data.cart.reduce((count, item) => count + item.quantity, 0) };
    listeners.forEach(fn => fn());
  };
  const reset = () => {
    intents.clear(); failedCart.clear(); uncertainCart = false; uncertainFavorites = false;
    generation++; confirmed = empty(); loaded = false; favoritesLoaded = false; cartLoading = null; favoritesLoading = null; cartError = null; favoritesError = null;
    const previous = operations; operations = []; running = false; publish();
    previous.forEach(op => op.reject(Error('Your session changed.')));
  };
  const load = (resource: Resource, force: boolean): Promise<void> => {
    if (!deps.authenticated()) return Promise.resolve();
    const pending = resource === 'cart' ? cartLoading : favoritesLoading;
    if (pending) return pending;
    const ready = resource === 'cart' ? loaded : favoritesLoaded;
    if (ready && (!force || operations.some(op => isCartOperation(op) === (resource === 'cart')))) return Promise.resolve();
    const version = generation;
    const readRevision = mutations[resource], initial = !ready;
    const work = deps.send(`/${resource}`).then(data => {
      if (version !== generation) return;
      if (!initial && readRevision !== mutations[resource]) return;
      if (resource === 'cart') acceptCart(data); else acceptFavorites(data);
      publish();
    }).catch(error => {
      if (version !== generation || (!initial && readRevision !== mutations[resource])) return;
      const failure = error instanceof Error ? error : Error(`Could not load your ${resource}.`);
      if (resource === 'cart') cartError = failure; else favoritesError = failure;
      throw error;
    }).finally(() => {
      if (version !== generation) return;
      if (resource === 'cart') cartLoading = null; else favoritesLoading = null;
      publish();
    });
    if (resource === 'cart') cartLoading = work; else favoritesLoading = work;
    publish(); return work;
  };
  const refresh = (force = false, resource?: Resource): Promise<void> => {
    if (resource) return load(resource, force);
    return Promise.allSettled([load('cart', force), load('favorites', force)]).then(results => {
      for (const result of results) if (result.status === 'rejected') throw result.reason;
    });
  };
  const drain = async () => {
    if (running) return;
    running = true; const version = generation;
    while (operations.length && version === generation) {
      const op = operations[0];
      const cartOperation = isCartOperation(op);
      const resource: Resource = cartOperation ? 'cart' : 'favorites';
      let intendedQuantity: number | undefined;
      let confirmationAttempted = false;
      try {
        await load(resource, false);
        if (cartOperation ? !loaded : !favoritesLoaded) throw (cartOperation ? cartError : favoritesError) || Error(`Could not load your ${resource}.`);
        if (version !== generation) break;
        // A timed-out write may already exist on the server. Resolve that ambiguity
        // before choosing add versus update for a newer absolute quantity intent.
        if (uncertainCart && cartOperation) {
          const cart = await deps.send('/cart');
          if (version !== generation) break;
          acceptCart(cart); mutations.cart++; publish();
        }
        if (!cartOperation && uncertainFavorites) {
          const data = await deps.send('/favorites');
          if (version !== generation) break;
          acceptFavorites(data); mutations.favorites++; publish();
        }
        intendedQuantity = op.kind === 'add' ? (confirmed.cart.find(item => item.product._id === op.id)?.quantity || 0) + 1
          : op.kind === 'adjust' ? Math.max(0, (confirmed.cart.find(item => item.product._id === op.id)?.quantity || 0) + op.quantity!)
          : op.kind === 'quantity' ? op.quantity : 0;
        op.started = true;
        const inline = (op.kind === 'quantity' || op.kind === 'adjust') && op.product;
        const cartAction = inline ? intendedQuantity === 0 ? 'remove' : confirmed.cart.some(item => item.product._id === op.id) ? 'update' : 'add' : op.kind === 'quantity' ? 'update' : op.kind;
        const path = op.kind === 'favorite' ? `/favorites/${op.selected ? 'add' : 'remove'}`
          : op.kind === 'clearFavorites' ? '/favorites/clear' : op.kind === 'clearCart' ? '/cart/clear'
          : `/cart/${cartAction}`;
        const method = cartAction === 'add' || (op.kind === 'favorite' && op.selected) ? 'POST' : cartAction === 'update' ? 'PUT' : 'DELETE';
        const absent = inline && intendedQuantity === 0 && !confirmed.cart.some(item => item.product._id === op.id);
        let data = absent ? {} : await deps.send(path, method, op.id ? { productId: op.id, ...(op.kind === 'add' ? { quantity: 1 } : ['quantity', 'adjust'].includes(op.kind) && intendedQuantity! > 0 ? { quantity: intendedQuantity } : {}) } : undefined);
        if (version !== generation) break;
        if (cartOperation && !absent && !hasCart(data)) {
          confirmationAttempted = true; uncertainCart = true;
          data = await deps.send('/cart');
          if (version !== generation) break;
          if (!hasCart(data)) throw Error('Could not verify your cart. Please try again.');
        }
        const next = apply(confirmed, op);
        if (cartOperation && hasCart(data)) {
          acceptCart(data);
          if (cartOperation && !matches(op.id, intendedQuantity!)) throw Error('The saved cart does not match your change. Please try again.');
          if (cartOperation && matches(op.id, intendedQuantity!)) {
            if (op.kind === 'clearCart') failedCart.clear(); else failedCart.delete(op.id);
            cartError = failedCart.values().next().value?.error || null;
          }
        } else confirmed = next;
        if (!cartOperation) favoritesError = null;
        operations.shift(); mutations[resource]++; publish(); op.resolve();
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
            acceptCart(cart); mutations.cart++;
            if (matches(op.id, intendedQuantity!)) {
              if (op.kind === 'clearCart') failedCart.clear(); else failedCart.delete(op.id);
              cartError = failedCart.values().next().value?.error || null;
              operations.shift(); mutations.cart++; publish(); op.resolve(); continue;
            }
          } catch { if (version !== generation) break; }
        }
        if (cartOperation) {
          cartError = failure;
          if (intendedQuantity !== undefined) failedCart.set(op.id, { quantity: intendedQuantity, error: failure });
        } else {
          favoritesError = failure;
          if (op.started && uncertain) {
            uncertainFavorites = true;
            try {
              const data = await deps.send('/favorites');
              if (version !== generation) break;
              acceptFavorites(data); mutations.favorites++;
              const matches = op.kind === 'clearFavorites' ? confirmed.favorites.length === 0
                : confirmed.favorites.some(p => productId(p) === op.id) === op.selected;
              if (matches) { operations.shift(); mutations.favorites++; publish(); op.resolve(); continue; }
            } catch { if (version !== generation) break; }
            favoritesError = failure;
          }
        }
        operations.shift(); mutations[resource]++; publish(); op.reject(failure);
      }
    }
    if (version === generation) {
      running = false;
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
    if (isCartOperation(input)) {
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
    if (duplicate && input.kind !== 'quantity' && input.kind !== 'adjust') return duplicate.promise;
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    operations.push({ ...input, promise, resolve, reject }); mutations[isCartOperation(input) ? 'cart' : 'favorites']++; publish(); void drain(); return promise;
  };
  return { intentVersion: (id: string) => intents.get(id) || 0, getSnapshot: () => snapshot, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, reset, refresh, synchronizeCart,
    adjust: (product: ShoppingProduct, delta: number) => {
      const id = productId(product), current = snapshot.cart.find(item => item.product._id === id)?.quantity || 0;
      if (!id || ![-1, 1].includes(delta) || (delta > 0 && product.availability === false)) return Promise.resolve();
      const quantity = Math.max(0, current + delta);
      if (!Number.isSafeInteger(quantity) || quantity === current) return Promise.resolve();
      // Before hydration, preserve a relative tap so saved quantities are not replaced.
      return enqueue({ kind: loaded ? 'quantity' : 'adjust', id, product, quantity: loaded ? quantity : delta });
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
    syncDemoMode(data);
    return data;
  } });
let revision = getSessionSnapshot().revision;
onPricingChanged(() => { shoppingState.reset(); void shoppingState.refresh().catch(() => {}); });
subscribeSession(() => {
  const session = getSessionSnapshot();
  if (session.revision !== revision || !session.authenticated) { revision = session.revision; shoppingState.reset(); }
});
