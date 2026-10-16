// Memory only. The caller supplies a session-specific key for private data.
export function createResourceCache(limit = 32, freshMs = 60_000, usableMs = 300_000) {
  type Entry = { value: unknown; time: number };
  const entries = new Map<string, Entry>();
  const pending = new Map<string, Promise<unknown>>();
  let generation = 0;
  function peek<T>(key: string): T | undefined {
    const entry = entries.get(key);
    if (!entry || Date.now() - entry.time >= usableMs) return undefined;
    entries.delete(key); entries.set(key, entry);
    return entry.value as T;
  }
  async function load<T>(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
    const cached = peek<T>(key);
    if (!force && cached !== undefined && Date.now() - entries.get(key)!.time < freshMs) return cached;
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const epoch = generation;
    const operation = fetcher().then(value => {
      if (epoch !== generation) throw new Error('Catalog session changed. Please retry.');
      entries.delete(key); entries.set(key, { value, time: Date.now() });
      while (entries.size > limit) entries.delete(entries.keys().next().value!);
      return value;
    }).finally(() => { if (pending.get(key) === operation) pending.delete(key); });
    pending.set(key, operation);
    return operation;
  }
  return { peek, load, clear: () => { generation++; entries.clear(); pending.clear(); } };
}

// Preserve object and list identity when the server sends identical visible data.
export function reconcileItems<T extends { _id: string }>(previous: T[] | undefined, next: T[]): T[] {
  const byId = new Map(previous?.map(item => [item._id, item]));
  const result = next.map(item => {
    const old = byId.get(item._id);
    return old && JSON.stringify(old) === JSON.stringify(item) ? old : item;
  });
  return previous && previous.length === result.length && result.every((item, i) => item === previous[i]) ? previous : result;
}
