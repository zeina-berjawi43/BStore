import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Tokens = { accessToken: string | null; refreshToken: string | null; pendingLogouts?: string[] };
const KEY = 'mystore.auth.v1';
const LEGACY_KEYS = ['accessToken', 'refreshToken'];
const EMPTY: Tokens = { accessToken: null, refreshToken: null };
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let webRemember = false;
let cachedTokens: Tokens | null = null;
let cachedUser: object | null = null;
export const peekSessionUser = () => sessionSnapshot.authenticated ? cachedUser : null;
// Scope the immediate profile to the credential's owner, including old storage
// left by interrupted app versions. This is cache isolation, not authentication.
function scopedProfile(user: object | null, tokens: Tokens): object | null {
  if (!user) return null;
  const id = (user as { _id?: string; id?: string })._id || (user as { id?: string }).id;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  try {
    const encoded = (tokens.refreshToken || tokens.accessToken || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    let decoded = '', buffer = 0, bits = 0;
    for (const character of encoded) {
      const value = alphabet.indexOf(character);
      if (value < 0) continue;
      buffer = (buffer << 6) | value; bits += 6;
      if (bits >= 8) { bits -= 8; decoded += String.fromCharCode((buffer >> bits) & 255); }
    }
    const payload = JSON.parse(decoded);
    return id && String(payload.userId || payload.sub) === String(id) ? user : null;
  } catch { return null; }
}
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
const pricingListeners = new Set<() => void>();
export function onPricingChanged(listener: () => void) {
  pricingListeners.add(listener);
  return () => { pricingListeners.delete(listener); };
}
const snapshotListeners = new Set<() => void>();
let sessionSnapshot = { ready: false, authenticated: false, revision: 0 };
export const getSessionSnapshot = () => sessionSnapshot;
export function subscribeSession(listener: () => void) {
  snapshotListeners.add(listener);
  return () => { snapshotListeners.delete(listener); };
}
function publishSession(tokens: Tokens, changed = false) {
  sessionSnapshot = {
    ready: true,
    authenticated: !!(tokens.accessToken || tokens.refreshToken),
    revision: sessionSnapshot.revision + (changed ? 1 : 0),
  };
  snapshotListeners.forEach(listener => listener());
  if (changed) listeners.forEach(listener => listener());
}
export function onSessionChanged(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Serialize migration, token replacement and logout, including conditional refresh writes.
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}

async function persist(tokens: Tokens, rememberMe?: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    // Browser storage is readable by same-origin JavaScript, unlike SecureStore.
    const remember = !!(tokens.accessToken || tokens.refreshToken) && (rememberMe ?? webRemember);
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    other.removeItem(KEY);
    target.setItem(KEY, JSON.stringify(tokens));
    webRemember = remember;
  } else {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens), options);
  }
  cachedTokens = null;
}

async function read(): Promise<Tokens> {
  if (cachedTokens) return { ...cachedTokens };
  if (Platform.OS === 'web' && typeof window === 'undefined') return { ...EMPTY };
  let raw: string | null;
  if (Platform.OS === 'web') {
    const session = window.sessionStorage.getItem(KEY);
    raw = session ?? window.localStorage.getItem(KEY);
    webRemember = session === null && raw !== null;
  } else {
    raw = await SecureStore.getItemAsync(KEY, options);
  }
  let tokens: Tokens;
  if (raw !== null) {
    const parsed = JSON.parse(raw);
    tokens = {
      accessToken: typeof parsed?.accessToken === 'string' ? parsed.accessToken : null,
      refreshToken: typeof parsed?.refreshToken === 'string' ? parsed.refreshToken : null,
      pendingLogouts: Array.isArray(parsed?.pendingLogouts) ? parsed.pendingLogouts.filter((value: unknown) => typeof value === 'string') : [],
    };
  } else if (Platform.OS === 'web') {
    // Do not resurrect legacy persistent credentials in a new browser session.
    tokens = { ...EMPTY };
  } else {
    tokens = {
      accessToken: await AsyncStorage.getItem('accessToken'),
      refreshToken: await AsyncStorage.getItem('refreshToken'),
    };
    // Never delete the old copy until secure storage succeeds.
    await persist(tokens);
  }
  await AsyncStorage.multiRemove(LEGACY_KEYS);
  cachedTokens = tokens;
  if (!sessionSnapshot.ready) {
    const saved = tokens.accessToken || tokens.refreshToken ? await AsyncStorage.getItem('user') : null;
    try { cachedUser = scopedProfile(saved ? JSON.parse(saved) : null, tokens); } catch { cachedUser = null; }
    publishSession(tokens);
  }
  return tokens;
}

export const readTokens = (): Promise<Tokens> => serialized(read);

export const readSessionUser = (): Promise<string | null> => serialized(async () => {
  const tokens = await read();
  return tokens.accessToken || tokens.refreshToken ? AsyncStorage.getItem('user') : null;
});

export const updateTokens = (tokens: Partial<Tokens>, user?: object, expectedAccessToken?: string, expectedRevision?: number, rememberMe?: boolean): Promise<void> => serialized(async () => {
  const current = await read();
  if (expectedRevision !== undefined && expectedRevision !== sessionSnapshot.revision) {
    throw new Error('Your session changed. Please try again.');
  }
  if (expectedAccessToken !== undefined && current.accessToken !== expectedAccessToken) {
    throw new Error('Your session changed. Please try again.');
  }
  const changed = tokens.refreshToken !== undefined && tokens.refreshToken !== current.refreshToken;
  const pendingLogouts = [...new Set([...(current.pendingLogouts || []),
    ...(tokens.refreshToken && current.refreshToken && tokens.refreshToken !== current.refreshToken ? [current.refreshToken] : []),
  ])];
  // Clear the old profile before installing another session, even if a later write fails.
  if (changed) { cachedUser = null; await AsyncStorage.multiRemove(['user', 'isLoggedIn']); }
  const next = { ...current, ...tokens, pendingLogouts };
  await persist(next, rememberMe);
  try {
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      cachedUser = scopedProfile(user, next);
      await AsyncStorage.setItem('isLoggedIn', 'true');
    }
    await AsyncStorage.multiRemove(LEGACY_KEYS);
  } finally {
    if (changed) publishSession(next, true);
  }
});

// Profile writes share the token queue so a late response cannot overwrite a new login.
export const saveSessionUser = (expectedAccessToken: string, user: object): Promise<void> => serialized(async () => {
  const current = await read();
  if (!current.accessToken || current.accessToken !== expectedAccessToken) {
    throw new Error('Your session changed. Please try again.');
  }
  const previous = await AsyncStorage.getItem('user');
  const previousUser = previous ? JSON.parse(previous) : null;
  if (previousUser?.pricingScope && !(user as { pricingScope?: string }).pricingScope) {
    user = { ...user, pricingScope: previousUser.pricingScope };
  }
  await AsyncStorage.setItem('user', JSON.stringify(user));
  cachedUser = scopedProfile(user, current);
  const priceClass = (value: object) => (value as { pricingScope?: string }).pricingScope;
  if (previous && priceClass(JSON.parse(previous)) !== undefined && priceClass(user) !== undefined && priceClass(JSON.parse(previous)) !== priceClass(user)) pricingListeners.forEach(listener => listener());
});

async function clear(): Promise<void> {
  // An empty secure record prevents old plaintext credentials from being migrated
  // again if legacy cleanup fails or the process exits during logout.
  const current = await read();
  const pendingLogouts = [...new Set([...(current.pendingLogouts || []), ...(current.refreshToken ? [current.refreshToken] : [])])];
  await persist({ ...EMPTY, pendingLogouts });
  // Secure logout already succeeded: discard mounted screens even if plaintext cleanup fails.
  cachedUser = null;
  publishSession(EMPTY, true);
  await AsyncStorage.multiRemove([...LEGACY_KEYS, 'user', 'isLoggedIn']);
}

export const clearTokens = (expectedAccessToken?: string | null): Promise<void> => serialized(async () => {
  if (expectedAccessToken !== undefined && (await read()).accessToken !== expectedAccessToken) {
    throw new Error('Your session changed. Please try again.');
  }
  await clear();
});

export const acknowledgeLogout = (token: string): Promise<void> => serialized(async () => {
  const current = await read();
  await persist({ ...current, pendingLogouts: (current.pendingLogouts || []).filter(value => value !== token) });
});

export const applyRefresh = (
  expectedRefreshToken: string,
  accessToken: string | null
): Promise<string | null> => serialized(async () => {
  const current = await read();
  if (current.refreshToken !== expectedRefreshToken) {
    if (current.refreshToken) throw new Error('Your session changed. Please try again.');
    return null;
  }
  if (accessToken === null) await clear();
  else await persist({ ...current, accessToken });
  return accessToken;
});
