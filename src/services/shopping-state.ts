import { API_URL, getValidAccessToken } from './authService';
import { request } from './request';
import { getSessionSnapshot, subscribeSession } from './tokenStorage';
import { currentCartPrices } from './cartPricing';
import { getFinalPrice } from './product-price';

export type ShoppingProduct = { _id?: string; id?: string; name: string; discountedPrice?: number; price?: number; availability?: boolean; [key: string]: any };
export type ShoppingItem = { product: ShoppingProduct & { _id: string }; quantity: number; price: number };
type Data = { cart: ShoppingItem[]; favorites: ShoppingProduct[]; minimum: number };
type Operation = { kind: 'add' | 'quantity' | 'remove' | 'favorite' | 'clearCart' | 'clearFavorites'; id: string; product?: ShoppingProduct; quantity?: number; selected?: boolean; started?: boolean; resolve: () => void; reject: (error: Error) => void; promise: Promise<void> };
const productId = (product: ShoppingProduct) => String(product._id || product.id || '');
const empty = (): Data => ({ cart: [], favorites: [], minimum: Infinity });

// Confirmed server data plus an ordered operation log. Rollback removes only the
// failed operation, preserving newer user intent and unrelated products.
export function createShoppingState(deps: { send: (path: string, method?: string, body?: object) => Promise<any>; authenticated: () => boolean }) {
  let confirmed = empty(), operations: Operation[] = [], generation = 0, running = false;
  let loaded = false, loading: Promise<void> | null = null, mutationRevision = 0;
  const listeners = new Set<() => void>();
  let snapshot = { ...empty(), ready: false, busy: false, pendingCart: new Set<string>(), pendingFavorites: new Set<string>(), cartCount: 0 };
  const apply = (data: Data, op: Operation): Data => {
    if (op.kind === 'clearCart') return { ...data, cart: [] };
    if (op.kind === 'clearFavorites') return { ...data, favorites: [] };
    if (op.kind === 'favorite') return { ...data, favorites: op.selected
      ? data.favorites.some(p => productId(p) === op.id) ? data.favorites : [...data.favorites, op.product!]
      : data.favorites.filter(p => productId(p) !== op.id) };
    const item = data.cart.find(value => value.product._id === op.id);
    if (op.kind === 'remove') return { ...data, cart: data.cart.filter(value => value.product._id !== op.id) };
    if (op.kind === 'quantity') return { ...data, cart: data.cart.map(value => value.product._id === op.id ? { ...value, quantity: op.quantity! } : value) };
    return { ...data, cart: item ? data.cart.map(value => value === item ? { ...value, quantity: value.quantity + 1 } : value)
      : [...data.cart, { product: { ...op.product!, _id: op.id }, quantity: 1, price: getFinalPrice(op.product!) ?? 0 }] };
  };
  const publish = () => {
    const data = operations.reduce(apply, confirmed);
    snapshot = { ...data, ready: loaded, busy: operations.length > 0 || loading !== null,
      pendingCart: new Set(operations.filter(op => !['favorite', 'clearFavorites'].includes(op.kind)).map(op => op.id)),
      pendingFavorites: new Set(operations.filter(op => ['favorite', 'clearFavorites'].includes(op.kind)).map(op => op.id)),
      cartCount: data.cart.reduce((count, item) => count + item.quantity, 0) };
    listeners.forEach(fn => fn());
  };
  const reset = () => {
    generation++; confirmed = empty(); loaded = false; loading = null;
    const previous = operations; operations = []; running = false; publish();
    previous.forEach(op => op.reject(Error('Your session changed.')));
  };
  const refresh = (force = false): Promise<void> => {
    if (!deps.authenticated()) return Promise.resolve();
    if (loading) return loading;
    if (loaded && (!force || operations.length)) return Promise.resolve();
    const version = generation;
    const readRevision = mutationRevision, initial = !loaded;
    const work = Promise.all([deps.send('/cart'), deps.send('/favorites')]).then(([cart, favorites]) => {
      if (version !== generation) return;
      if (!initial && readRevision !== mutationRevision) return;
      confirmed = { cart: currentCartPrices(Array.isArray(cart.cart?.items) ? cart.cart.items : []),
        favorites: (favorites.favorites || []).map((item: any) => item.product).filter((p: any) => p && typeof p === 'object'),
        minimum: cart.minimumOrderValue ?? Infinity };
      loaded = true; publish();
    }).finally(() => { if (version === generation) { loading = null; publish(); } });
    loading = work; publish(); return work;
  };
  const drain = async () => {
    if (running) return;
    running = true; const version = generation; let reconcile = false;
    while (operations.length && version === generation) {
      const op = operations[0];
      try {
        await refresh();
        if (version !== generation) break;
        op.started = true;
        const path = op.kind === 'favorite' ? `/favorites/${op.selected ? 'add' : 'remove'}`
          : op.kind === 'clearFavorites' ? '/favorites/clear' : op.kind === 'clearCart' ? '/cart/clear'
          : `/cart/${op.kind === 'quantity' ? 'update' : op.kind}`;
        const method = op.kind === 'add' || (op.kind === 'favorite' && op.selected) ? 'POST' : op.kind === 'quantity' ? 'PUT' : 'DELETE';
        const data = await deps.send(path, method, op.id ? { productId: op.id, ...(op.kind === 'add' ? { quantity: 1 } : op.kind === 'quantity' ? { quantity: op.quantity } : {}) } : undefined);
        if (version !== generation) break;
        const next = apply(confirmed, op);
        confirmed = Array.isArray(data.cart?.items) ? { ...next, cart: currentCartPrices(data.cart.items), minimum: data.minimumOrderValue ?? next.minimum } : next;
        operations.shift(); mutationRevision++; publish(); op.resolve();
      } catch (error) {
        if (version !== generation) break;
        reconcile = true;
        operations.shift(); mutationRevision++; publish(); op.reject(error instanceof Error ? error : Error('Could not save your change.'));
      }
    }
    if (version === generation) {
      running = false;
      // A timeout may occur after the server committed. Read back once, after
      // queued writes settle; never retry a mutation or overwrite newer intent.
      if (reconcile) void refresh(true).catch(() => {});
    }
  };
  const enqueue = (input: Omit<Operation, 'promise' | 'resolve' | 'reject'>) => {
    if (!deps.authenticated()) return Promise.reject(Error('Please log in to save your change.'));
    if (input.kind === 'quantity') {
      const tail = operations.at(-1);
      const previous = tail?.kind === 'quantity' && tail.id === input.id && !tail.started ? tail : undefined;
      if (previous) { previous.quantity = input.quantity; publish(); return previous.promise; }
    }
    const duplicate = operations.find(op => op.kind === input.kind && op.id === input.id);
    if (duplicate && input.kind !== 'quantity') return duplicate.promise;
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    operations.push({ ...input, promise, resolve, reject }); mutationRevision++; publish(); void drain(); return promise;
  };
  return { getSnapshot: () => snapshot, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, reset, refresh,
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
    if (!response.ok) throw Error(data.message || 'Could not save your change. Please try again.');
    return data;
  } });
let revision = getSessionSnapshot().revision;
subscribeSession(() => {
  const session = getSessionSnapshot();
  if (session.revision !== revision || !session.authenticated) { revision = session.revision; shoppingState.reset(); }
});
