import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Tokens = { accessToken: string | null; refreshToken: string | null; pendingLogouts?: string[] };
const KEY = 'mystore.auth.v1';
const LEGACY_KEYS = ['accessToken', 'refreshToken'];
const EMPTY: Tokens = { accessToken: null, refreshToken: null };
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let webTokens: Tokens | null = null;
let cachedTokens: Tokens | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
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

async function persist(tokens: Tokens): Promise<void> {
  if (Platform.OS === 'web') {
    // No secure native store on web: keep credentials only for this page lifetime.
    webTokens = tokens;
  } else {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens), options);
  }
  cachedTokens = null;
}

async function read(): Promise<Tokens> {
  if (cachedTokens) return { ...cachedTokens };
  const raw = Platform.OS === 'web'
    ? (webTokens ? JSON.stringify(webTokens) : null)
    : await SecureStore.getItemAsync(KEY, options);
  let tokens: Tokens;
  if (raw !== null) {
    const parsed = JSON.parse(raw);
    tokens = {
      accessToken: typeof parsed?.accessToken === 'string' ? parsed.accessToken : null,
      refreshToken: typeof parsed?.refreshToken === 'string' ? parsed.refreshToken : null,
      pendingLogouts: Array.isArray(parsed?.pendingLogouts) ? parsed.pendingLogouts.filter((value: unknown) => typeof value === 'string') : [],
    };
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
  if (!sessionSnapshot.ready) publishSession(tokens);
  return tokens;
}

export const readTokens = (): Promise<Tokens> => serialized(read);

export const readSessionUser = (): Promise<string | null> => serialized(async () => {
  const tokens = await read();
  return tokens.accessToken || tokens.refreshToken ? AsyncStorage.getItem('user') : null;
});

export const updateTokens = (tokens: Partial<Tokens>, user?: object, expectedAccessToken?: string, expectedRevision?: number): Promise<void> => serialized(async () => {
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
  if (changed) await AsyncStorage.multiRemove(['user', 'isLoggedIn']);
  const next = { ...current, ...tokens, pendingLogouts };
  await persist(next);
  try {
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
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
  await AsyncStorage.setItem('user', JSON.stringify(user));
});

async function clear(): Promise<void> {
  // An empty secure record prevents old plaintext credentials from being migrated
  // again if legacy cleanup fails or the process exits during logout.
  const current = await read();
  const pendingLogouts = [...new Set([...(current.pendingLogouts || []), ...(current.refreshToken ? [current.refreshToken] : [])])];
  await persist({ ...EMPTY, pendingLogouts });
  // Secure logout already succeeded: discard mounted screens even if plaintext cleanup fails.
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
