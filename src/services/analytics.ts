import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { createAnalytics } from './analytics-core';
import { getSessionSnapshot, peekSessionUser, readTokens } from './tokenStorage';
import { installRequestObserver } from './request';

const API = 'https://mystore-backend-u6ey.onrender.com/analytics';
// A Web tab has its own session/queue. Only the explicit device preference is shared across tabs.
const analyticsStorage = {
  getItem: async (key: string) => Platform.OS === 'web' && key === 'bstore.analytics.v1' ? (typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)) : AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) => { if (Platform.OS === 'web' && key === 'bstore.analytics.v1') { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value); } else await AsyncStorage.setItem(key, value); },
  removeItem: async (key: string) => { if (Platform.OS === 'web' && key === 'bstore.analytics.v1') { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); } else await AsyncStorage.removeItem(key); },
};
const scope = () => {
  const session = getSessionSnapshot();
  const profile = peekSessionUser() as { _id?: string; id?: string } | null;
  const id = profile?._id || profile?.id;
  return { key: session.authenticated ? `customer:${id || 'unresolved'}` : 'anonymous', ready: session.ready && (!session.authenticated || !!id) };
};
export const analytics = createAnalytics({
  storage: analyticsStorage, scope, now: Date.now,
  id: () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`,
  platform: Platform.OS === 'android' ? 'android' : 'web',
  release: `${Constants.expoConfig?.version || 'unknown'}.${Platform.OS === 'android' ? Constants.expoConfig?.android?.versionCode || 0 : 'web'}`,
  send: async (path, body, owner, signal) => {
    const credentials = scope().key.startsWith('customer:') ? await readTokens() : null;
    if (scope().key !== owner) throw new Error('Analytics identity changed');
    const response = await fetch(API + path, { method: body ? 'POST' : 'GET', signal,
      headers: { 'Content-Type': 'application/json', ...(credentials?.accessToken ? { Authorization: `Bearer ${credentials.accessToken}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  },
});

export function analyticsCampaignFromURL(url: string) {
  try {
    const query = url.split('?')[1]?.split('#')[0];
    if (!query) return;
    // Only these explicit campaign/referral codes are considered; never URLs, arbitrary query parameters or install attribution.
    const parts = new URLSearchParams(query);
    analytics.setCampaign(parts.get('utm_campaign') || parts.get('ref') || undefined);
  } catch { /* Ignore malformed links. */ }
}

let installed = false;
export function installAnalyticsRequests() {
  if (installed) return;
  installed = true;
  installRequestObserver({
    prepare: (url, options) => {
      if (!/\/(cart\/(add|update|remove|clear)|orders\/create|auth\/(register|verify-registration-otp|verify-otp))\/?$/.test(url) || !['POST', 'PUT', 'DELETE'].includes(options.method || 'GET')) return options;
      const context = analytics.context(url.includes('/auth/'));
      if (!context) return options;
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
      if (url.endsWith('/orders/create') && typeof body.idempotencyKey === 'string') {
        analytics.submit(body.idempotencyKey);
        Object.assign(context, analytics.context(), { attemptId: body.idempotencyKey });
      }
      return { ...options, body: JSON.stringify({ ...body, analyticsContext: context }) };
    },
    failed: (url, options, error) => {
      if (!url.endsWith('/orders/create')) return;
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
      const current = analytics.context();
      if (!body.analyticsContext || current?.consentToken !== body.analyticsContext.consentToken) return;
      if ((error as { status?: number })?.status) return;
      analytics.transportFailure(body.idempotencyKey, (error as { name?: string })?.name === 'AbortError');
    },
    responded: (url, options, status) => {
      if (!url.endsWith('/orders/create') || status !== 201) return;
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
      if (body.analyticsContext?.consentToken === analytics.context()?.consentToken) analytics.finishCheckout();
    },
  });
}
