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
  return tokens;
}

export const readTokens = (): Promise<Tokens> => serialized(read);

export const updateTokens = (tokens: Partial<Tokens>): Promise<void> => serialized(async () => {
  const current = await read();
  const pendingLogouts = [...new Set([...(current.pendingLogouts || []),
    ...(tokens.refreshToken && current.refreshToken && tokens.refreshToken !== current.refreshToken ? [current.refreshToken] : []),
  ])];
  await persist({ ...current, ...tokens, pendingLogouts });
  await AsyncStorage.multiRemove(LEGACY_KEYS);
  if (tokens.refreshToken !== undefined && tokens.refreshToken !== current.refreshToken) {
    listeners.forEach(listener => listener());
  }
});

async function clear(): Promise<void> {
  // An empty secure record prevents old plaintext credentials from being migrated
  // again if legacy cleanup fails or the process exits during logout.
  const current = await read();
  const pendingLogouts = [...new Set([...(current.pendingLogouts || []), ...(current.refreshToken ? [current.refreshToken] : [])])];
  await persist({ ...EMPTY, pendingLogouts });
  await AsyncStorage.multiRemove([...LEGACY_KEYS, 'user', 'isLoggedIn']);
  listeners.forEach(listener => listener());
}

export const clearTokens = (): Promise<void> => serialized(clear);

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
