import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './authService';
import { request } from './request';
import { onSessionChanged } from './tokenStorage';

export type CatalogProduct = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  price?: number;
  discountedPrice?: number;
  discount?: number;
  availability?: boolean;
  category?: { _id?: string; name?: string } | string;
  brand?: { _id?: string; name?: string } | string;
};

const CACHE_KEY = 'publicCatalog:v1';
const FRESH_MS = 60_000;
let publicProducts: CatalogProduct[] = [];
let diskRead: Promise<CatalogProduct[]> | null = null;
// Only one authenticated snapshot is retained; credentials never enter disk keys.
let snapshot: { token: string | null; products: CatalogProduct[]; time: number } | null = null;
const pending = new Map<string | null, Promise<CatalogProduct[]>>();
let generation = 0;
onSessionChanged(() => { generation++; snapshot = null; pending.clear(); });

function normalize(data: unknown): CatalogProduct[] {
  if (!Array.isArray(data)) throw new Error('Unable to read the product list.');
  return data.filter((item): item is CatalogProduct => Boolean(item && typeof item._id === 'string' && typeof item.name === 'string'));
}

function publicOnly(products: CatalogProduct[]): CatalogProduct[] {
  // Persist display metadata only. Logged-out customers must never see cached prices.
  return products.map(({ _id, name, description, image, discount, availability, category, brand }) => ({
    _id, name, description, image, discount, availability, category, brand,
  }));
}

export function peekPublicCatalog(): CatalogProduct[] {
  return publicProducts;
}

export async function readPublicCatalog(): Promise<CatalogProduct[]> {
  if (publicProducts.length) return publicProducts;
  if (!diskRead) {
    diskRead = AsyncStorage.getItem(CACHE_KEY).then(saved => {
      if (saved && !publicProducts.length) publicProducts = publicOnly(normalize(JSON.parse(saved)));
      return publicProducts;
    }).catch(() => publicProducts).finally(() => { diskRead = null; });
  }
  return diskRead;
}

export async function fetchCatalog(token: string | null, force = false): Promise<CatalogProduct[]> {
  if (!force && snapshot?.token === token && Date.now() - snapshot.time < FRESH_MS) return snapshot.products;
  const existing = pending.get(token);
  if (existing) return existing;
  const revision = ++generation;
  const operation = (async () => {
    const response = await request(`${API_URL}/products`, {
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'Could not load products. Please try again.');
    const products = normalize(Array.isArray(data) ? data : data.products);
    if (revision === generation) {
      snapshot = { token, products, time: Date.now() };
      publicProducts = publicOnly(products);
    // Rendering never waits for disk I/O.
      void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(publicProducts)).catch(() => {});
    }
    return products;
  })().finally(() => { if (pending.get(token) === operation) pending.delete(token); });
  pending.set(token, operation);
  return operation;
}
