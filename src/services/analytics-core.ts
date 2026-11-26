// Platform-independent, explicit collection. No credentials, form values or query text enter this module.
export type AnalyticsConfig = { enabled: boolean; policyVersion: string | null; retentionDays: number | null; campaignIds: string[]; notice: string | null; priceEvidenceEnabled?: boolean };
export type Receipt = { consentToken: string; validUntil: string; policyVersion: string };
export type AnalyticsEventName = 'session_started' | 'screen_viewed' | 'product_list_viewed' | 'product_impression' | 'product_viewed' | 'search_performed' | 'registration_started' | 'registration_failed' | 'cart_viewed' | 'checkout_started' | 'checkout_blocked' | 'checkout_submitted' | 'checkout_failed';
type Properties = Record<string, string | number>;
type Event = { id: string; name: AnalyticsEventName; at: string; sessionId: string; platform: 'android' | 'web'; release: string; properties: Properties };
type Scope = { key: string; ready: boolean };
type Dependencies = {
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
  scope(): Scope;
  send(path: string, body: object | undefined, owner: string, signal: AbortSignal): Promise<{ status: number; data: unknown }>;
  now(): number; id(): string; platform: 'android' | 'web'; release: string;
};
const OFF: AnalyticsConfig = { enabled: false, policyVersion: null, retentionDays: null, campaignIds: [], notice: null };
const STORAGE = 'bstore.analytics.v1', PREF = 'bstore.analytics.preference.v1', WITHDRAW = 'bstore.analytics.withdraw.v1';
const screens = new Set(['index', 'category-products', 'brand-products', 'department-categories', 'product-details', 'search', 'offers', 'buy-get-free', 'register', 'verify-otp', 'login', 'cart', 'checkout']);
const fields: Record<AnalyticsEventName, string[]> = {
  session_started: ['screen'], screen_viewed: ['screen', 'viewId'], product_list_viewed: ['screen', 'viewId', 'itemCount', 'categoryId', 'departmentId', 'brandId'], product_viewed: ['productId', 'viewId', 'offeredPriceCents'],
  product_impression: ['productId', 'screen', 'viewId', 'offeredPriceCents'],
  search_performed: ['actionId', 'queryLengthBucket', 'resultCountBucket'], registration_started: ['attemptId'], registration_failed: ['attemptId', 'reason'],
  cart_viewed: ['viewId', 'itemCount'], checkout_started: ['flowId', 'itemCount'], checkout_blocked: ['flowId', 'reason', 'stage'], checkout_submitted: ['flowId', 'attemptId'], checkout_failed: ['flowId', 'attemptId', 'reason', 'stage'],
};
export function createAnalytics(deps: Dependencies) {
  let config = OFF, acceptedVersion: string | null = null, receipt: Receipt | null = null, owner = '';
  const impressions = new Set<string>();
  let events: Event[] = [], sessionId = '', lastActivity = 0, flowId = '', registrationId = '', campaignId: string | undefined;
  let initialized = false, generation = 0, configAt = 0, sending = false, attempts = 0, retryAt = 0;
  let storageWrites: Promise<unknown> = Promise.resolve();
  let initializing: Promise<void> | null = null;
  const listeners = new Set<() => void>(), requests = new Set<AbortController>();
  let snapshot = { config, accepted: false, ready: false, withdrawalPending: false };
  const publish = () => {
    snapshot = { config, accepted: acceptedVersion !== null && acceptedVersion === config.policyVersion, ready: initialized, withdrawalPending: snapshot.withdrawalPending };
    listeners.forEach(listener => listener());
  };
  const permitted = () => initialized && config.enabled && configAt + 300000 > deps.now() && !!receipt && Date.parse(receipt.validUntil) > deps.now()
    && acceptedVersion === config.policyVersion && owner === deps.scope().key && deps.scope().ready;
  const persist = () => {
    const epoch = generation;
    const value = JSON.stringify({ owner, receipt, events, sessionId, lastActivity, registrationId, flowId });
    storageWrites = storageWrites.catch(() => {}).then(() => epoch === generation ? deps.storage.setItem(STORAGE, value) : undefined).catch(() => {});
  };
  const call = async (path: string, body?: object) => {
    const controller = new AbortController(), epoch = generation, scopedOwner = owner;
    requests.add(controller);
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const result = await deps.send(path, body, scopedOwner, controller.signal);
      if (epoch !== generation || scopedOwner !== deps.scope().key) throw new Error('Analytics identity changed');
      return result;
    } finally { clearTimeout(timer); requests.delete(controller); }
  };
  const clear = (keepReceipt = false) => { events = []; impressions.clear(); if (!keepReceipt) receipt = null; sessionId = ''; flowId = ''; registrationId = ''; lastActivity = 0; attempts = 0; retryAt = 0; persist(); };
  const newSession = (screen?: string) => {
    if (!sessionId || deps.now() - lastActivity >= 1800000) {
      sessionId = deps.id(); flowId = ''; impressions.clear();
      events.push({ id: deps.id(), name: 'session_started', at: new Date(deps.now()).toISOString(), sessionId, platform: deps.platform, release: deps.release, properties: screen ? { screen } : {} });
    }
    lastActivity = deps.now();
  };
  const track = (name: AnalyticsEventName, properties: Properties = {}) => {
    try {
      if (!permitted() || !fields[name] || Object.keys(properties).some(key => !fields[name].includes(key))) return;
      const impressionKey = `${properties.screen}:${properties.productId}`;
      if (name === 'product_impression' && sessionId && deps.now() - lastActivity < 1800000 && (impressions.has(impressionKey) || impressions.size >= 500)) return;
      newSession(typeof properties.screen === 'string' && screens.has(properties.screen) ? properties.screen : undefined);
      const safe = Object.fromEntries(Object.entries(properties).filter(([, value]) => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))));
      if (!config.priceEvidenceEnabled) delete safe.offeredPriceCents;
      if (name === 'product_impression') {
        if (impressions.has(impressionKey) || impressions.size >= 500) return;
        impressions.add(impressionKey);
      }
      events.push({ id: deps.id(), name, at: new Date(deps.now()).toISOString(), sessionId, platform: deps.platform, release: deps.release, properties: safe });
      events = events.filter(event => Date.parse(event.at) >= deps.now() - 86400000).slice(-100);
      persist();
    } catch { /* Analytics never interrupts customer work. */ }
  };
  async function refreshConfig() {
    const epoch = generation;
    try {
      const result = await call('/config');
      const data = result.data as AnalyticsConfig;
      config = result.status === 200 && typeof data?.enabled === 'boolean' ? data : OFF;
      configAt = deps.now();
    } catch { if (epoch !== generation) return; config = OFF; }
    if (epoch !== generation) return;
    if (!config.enabled || acceptedVersion !== config.policyVersion) clear(true);
    publish();
  }
  async function processWithdrawals() {
    const epoch = generation;
    try {
      const saved = JSON.parse(await deps.storage.getItem(WITHDRAW) || '[]') as { owner: string; receipt: Receipt | null }[];
      const pending = [];
      for (const item of saved.slice(-5)) {
        if (item.owner !== owner) { pending.push(item); continue; }
        try {
          const response = await call('/withdraw', item.receipt ? { consentToken: item.receipt.consentToken } : {});
          if (response.status !== 200) pending.push(item);
        } catch { pending.push(item); }
      }
      if (epoch !== generation) return;
      await deps.storage.setItem(WITHDRAW, JSON.stringify(pending));
      snapshot.withdrawalPending = pending.some(item => item.owner === owner); publish();
    } catch { snapshot.withdrawalPending = true; publish(); }
  }
  async function grant() {
    if (!config.enabled || acceptedVersion !== config.policyVersion || !deps.scope().ready) return;
    const response = await call('/consent', { accepted: true, policyVersion: config.policyVersion,
      ...(campaignId && config.campaignIds.includes(campaignId) ? { campaignId } : {}) });
    if (response.status !== 200) throw new Error('Analytics permission unavailable');
    receipt = response.data as Receipt;
    if (receipt.policyVersion !== config.policyVersion || typeof receipt.consentToken !== 'string') { receipt = null; return; }
    persist(); publish();
  }
  async function initialize() {
    if (initializing) return initializing;
    const operation = (async () => {
      const epoch = generation;
      owner = deps.scope().key;
      try {
        const [preference, saved] = await Promise.all([deps.storage.getItem(PREF), deps.storage.getItem(STORAGE)]);
        if (epoch !== generation) return;
        acceptedVersion = preference ? JSON.parse(preference).acceptedVersion : null;
        const previous = saved ? JSON.parse(saved) : null;
        if (previous?.owner === owner) {
          receipt = previous.receipt; sessionId = previous.sessionId || ''; registrationId = previous.registrationId || '';
          flowId = previous.flowId || '';
          lastActivity = previous.lastActivity || 0;
          events = Array.isArray(previous.events) ? previous.events.filter((event: Event) => Date.parse(event.at) >= deps.now() - 86400000 && fields[event.name] && !Object.keys(event.properties || {}).some(key => !fields[event.name].includes(key))).slice(-100) : [];
        }
        initialized = true;
        await refreshConfig();
        if (epoch !== generation) return;
        await processWithdrawals();
        if (epoch !== generation) return;
        if (!snapshot.withdrawalPending && config.enabled && acceptedVersion === config.policyVersion && (!receipt || Date.parse(receipt.validUntil) <= deps.now())) { events = []; await grant(); }
      } catch { if (epoch !== generation) return; config = OFF; clear(true); initialized = true; }
      if (epoch === generation) publish();
    })();
    initializing = operation;
    void operation.finally(() => { if (initializing === operation) initializing = null; });
    return operation;
  }
  async function setConsent(accept: boolean) {
    if (!initialized) await initialize();
    if (accept) {
      if (!config.enabled || !config.policyVersion) return;
      await processWithdrawals();
      if (snapshot.withdrawalPending) throw new Error('Previous withdrawal is still pending. Please retry online.');
      acceptedVersion = config.policyVersion;
      await deps.storage.setItem(PREF, JSON.stringify({ acceptedVersion }));
      await grant(); publish();
    } else {
      const previous = receipt;
      acceptedVersion = null; clear(); publish();
      await deps.storage.setItem(PREF, JSON.stringify({ acceptedVersion: null }));
      if (previous || owner.startsWith('customer:')) {
        const saved = JSON.parse(await deps.storage.getItem(WITHDRAW) || '[]');
        await deps.storage.setItem(WITHDRAW, JSON.stringify([...saved, { owner, receipt: previous }].slice(-5)));
        snapshot.withdrawalPending = true; publish();
      }
      await processWithdrawals();
    }
  }
  async function reloadPreference() {
    try {
      const saved = JSON.parse(await deps.storage.getItem(PREF) || 'null');
      if (!saved?.acceptedVersion) await setConsent(false);
      else if (saved.acceptedVersion === config.policyVersion && acceptedVersion !== saved.acceptedVersion) {
        acceptedVersion = saved.acceptedVersion;
        await grant(); publish();
      }
    } catch { acceptedVersion = null; clear(true); publish(); }
  }
  function scopeChanged() {
    generation++; requests.forEach(controller => controller.abort());
    initializing = null;
    initialized = false; config = OFF; clear(); owner = deps.scope().key;
    // Clear queued anonymous/old-account events synchronously before another identity can send.
    persist(); publish();
    if (deps.scope().ready) void initialize().catch(() => {});
  }
  async function flush() {
    if (sending || retryAt > deps.now()) return;
    sending = true;
    const epoch = generation;
    try {
      if (!initialized) await initialize();
      if (configAt + 240000 < deps.now()) await refreshConfig();
      if (config.enabled && acceptedVersion === config.policyVersion && (!receipt || Date.parse(receipt.validUntil) <= deps.now())) { events = []; await grant(); }
      if (!permitted()) return;
      const batch = events.filter(event => Date.parse(event.at) >= deps.now() - 86400000).slice(0, 20);
      if (!batch.length) return;
      const result = await call('/events', { consentToken: receipt!.consentToken, events: batch });
      if (epoch !== generation) return;
      if (result.status === 202 || result.status === 400 || result.status === 413) {
        const sent = new Set(batch.map(event => event.id)); events = events.filter(event => !sent.has(event.id)); attempts = 0;
      } else if ([401, 403, 409].includes(result.status)) { clear(); config = OFF; publish(); }
      else throw new Error('Retry analytics later');
      persist();
    } catch {
      if (epoch === generation) {
        attempts++; retryAt = deps.now() + Math.min(300000, 15000 * 2 ** Math.min(attempts, 5));
        if (attempts >= 5) { events = []; attempts = 0; persist(); }
      }
    } finally { sending = false; }
  }
  const checkoutFlow = () => { newSession(); flowId ||= deps.id(); return flowId; };
  return { initialize, refreshConfig, setConsent, reloadPreference, scopeChanged, flush, track,
    getSnapshot: () => snapshot, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    newId: deps.id,
    priceProperties: (amount?: number): Properties => config.priceEvidenceEnabled && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && amount <= 1000000 ? { offeredPriceCents: Math.round(amount * 100) } : {},
    setCampaign: (value: string | undefined) => { if (value && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)) campaignId = value; },
    registrationStarted: () => { if (!registrationId) { registrationId = deps.id(); track('registration_started', { attemptId: registrationId }); } },
    registrationFailed: () => { if (registrationId) track('registration_failed', { attemptId: registrationId, reason: 'VALIDATION_FAILED' }); },
    screen: (screen: string) => { if (screens.has(screen)) track('screen_viewed', { screen, viewId: deps.id() }); },
    startCheckout: (itemCount: number) => { if (permitted()) track('checkout_started', { flowId: checkoutFlow(), itemCount }); },
    blockCheckout: (reason: string, stage: 'cart' | 'checkout' | 'submit') => { if (permitted()) track('checkout_blocked', { flowId: checkoutFlow(), reason, stage }); },
    context: (registration = false) => {
      try {
        if (!permitted()) return undefined;
        newSession(); persist();
        return { consentToken: receipt!.consentToken, sessionId, platform: deps.platform, release: deps.release,
          ...(flowId ? { flowId } : {}), ...(registration && registrationId ? { attemptId: registrationId } : {}) };
      } catch { return undefined; }
    },
    submit: (attemptId: string) => { if (permitted()) track('checkout_submitted', { flowId: checkoutFlow(), attemptId }); },
    finishCheckout: () => { flowId = ''; persist(); },
    transportFailure: (attemptId: string | undefined, timeout: boolean) => {
      if (permitted()) track('checkout_failed', { flowId: checkoutFlow(), ...(attemptId ? { attemptId } : {}), reason: timeout ? 'REQUEST_TIMEOUT' : 'NETWORK_UNAVAILABLE', stage: 'transport' });
    },
  };
}
