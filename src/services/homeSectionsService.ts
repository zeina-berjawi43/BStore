import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './request';

const API_URL = 'https://mystore-backend-u6ey.onrender.com';
export type HomeSection = 'slides' | 'departments';
export type HomeItem = { id: string; name: string; image: string; imageKey?: string; order: number; active: boolean };
const snapshots = new Map<HomeSection, HomeItem[]>();
const revisions = new Map<HomeSection, number>();
const writes = new Map<HomeSection, Promise<void>>();
const key = (section: HomeSection) => `homeSections:v1:${section}`;

function imageUrl(image: unknown): string {
  if (image && typeof image === 'object') {
    const value = image as Record<string, unknown>;
    image = value.url ?? value.path ?? value.filename ?? value.file ?? value.image;
  }
  if (typeof image !== 'string' || !image.trim()) return '';
  let value = image.trim();
  if (/^https?:\/\//.test(value)) return value;
  value = value.replace(/^file:\/\/\//, '').replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(value)) value = value.split('/').pop() || '';
  value = value.replace(/^\/+/, '');
  return `${API_URL}/${value.startsWith('uploads/') ? value : `uploads/${value}`}`;
}

function normalize(section: HomeSection, data: unknown, fetchedAt: number): HomeItem[] {
  if (!Array.isArray(data)) throw new Error('Invalid Home response');
  return data.filter(raw => !(raw && typeof raw === 'object' && raw.active === false)).map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid Home item');
    const item = raw as Record<string, unknown>;
    const id = item._id ?? item.id;
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid Home identifier');
    if (section === 'departments' && (typeof item.name !== 'string' || !item.name.trim())) {
      throw new Error('Invalid Home name');
    }
    let image = imageUrl(item.image);
    // Bound reuse even if an overwritten image does not change the API revision.
    // Only our public uploads get query parameters; signed external URLs stay intact.
    const revision = typeof item.updatedAt === 'string' ? item.updatedAt :
        typeof item.imageVersion === 'string' || typeof item.imageVersion === 'number' ? item.imageVersion :
        '';
    const version = `${revision}:${Math.floor(fetchedAt / (6 * 60 * 60 * 1000))}`;
    const imageKey = image ? `${image}:${version}` : '';
    if (image.startsWith(`${API_URL}/uploads/`)) {
      const url = new URL(image);
      url.searchParams.set('bstoreImageVersion', String(version));
      image = url.toString();
    }
    const order = Number(item.order) || (section === 'slides' ? 1 : 0);
    if (!Number.isFinite(order)) throw new Error('Invalid Home order');
    return { id, name: typeof item.name === 'string' ? item.name : '', image, imageKey,
      order, active: true };
  }).filter(item => item.active && (section !== 'slides' || !!item.image))
    .sort((a, b) => a.order - b.order || (section === 'departments' ? a.name.localeCompare(b.name) : 0));
}

export async function readHomeSection(section: HomeSection): Promise<HomeItem[] | null> {
  if (snapshots.has(section)) return snapshots.get(section)!;
  try {
    const saved = await AsyncStorage.getItem(key(section));
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed.version !== 1 || !Array.isArray(parsed.items) ||
        !parsed.items.every((item: HomeItem) => item && typeof item.id === 'string' &&
          typeof item.name === 'string' && typeof item.image === 'string' &&
          Number.isFinite(item.order) && item.active === true &&
          (item.imageKey === undefined || typeof item.imageKey === 'string'))) return null;
    // A pending refresh must not prevent cold-start hydration. A completed refresh wins.
    if (!snapshots.has(section)) snapshots.set(section, parsed.items);
    return snapshots.get(section) ?? null;
  } catch { return null; }
}

export async function refreshHomeSection(section: HomeSection): Promise<HomeItem[]> {
  const revision = (revisions.get(section) || 0) + 1;
  revisions.set(section, revision);
  const endpoint = section === 'slides' ? 'slideshows' : 'departments';
  const response = await request(`${API_URL}/${endpoint}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Home content unavailable');
  const data = await response.json();
  const items = normalize(section, data?.[section], Date.now());
  if (revision !== revisions.get(section)) return snapshots.get(section) ?? items;
  snapshots.set(section, items);
  // Serialize disk writes so an older successful response cannot finish last.
  const write = (writes.get(section) ?? Promise.resolve()).then(() =>
    AsyncStorage.setItem(key(section), JSON.stringify({ version: 1, items }))).catch(() => {});
  writes.set(section, write);
  void write.finally(() => { if (writes.get(section) === write) writes.delete(section); });
  return items;
}
