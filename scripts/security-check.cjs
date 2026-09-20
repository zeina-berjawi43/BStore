const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup(fetchImpl, initial = {}, config = {}) {
  const storage = new Map(Object.entries(initial));
  const secure = new Map(Object.entries(config.secure || {}));
  const secureStore = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    getItemAsync: async key => secure.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (config.failWrite) throw Error('secure storage unavailable');
      secure.set(key, value);
    },
  };
  const cache = new Map();
  const asyncStorage = {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
    multiRemove: async keys => { keys.forEach(key => storage.delete(key)); },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, {
      exports, __DEV__: false, console, setTimeout, clearTimeout, AbortController,
      fetch: fetchImpl,
      require: name => name === '@react-native-async-storage/async-storage'
        ? asyncStorage : name === 'expo-secure-store' ? secureStore
        : name === 'expo-notifications' ? config.notifications || {}
        : name === 'expo-constants' ? { expoConfig: { extra: { eas: { projectId: 'test-project' } } } }
        : name === 'react-native' ? { Platform: { OS: config.platform || 'android' } }
        : load(path.resolve(path.dirname(file), name + '.ts')),
    }, { filename: file });
    return exports;
  }
  return { storage, secure, push: load(path.resolve(__dirname, '../src/services/pushService.ts')), tokens: load(path.resolve(__dirname, '../src/services/tokenStorage.ts')), auth: load(path.resolve(__dirname, '../src/services/authService.ts')), request: load(path.resolve(__dirname, '../src/services/request.ts')).request,
    getCheckoutAttempt: load(path.resolve(__dirname, '../src/services/checkoutAttempt.ts')).getCheckoutAttempt,
    catalog: load(path.resolve(__dirname, '../src/services/catalogService.ts')),
    shopping: load(path.resolve(__dirname, '../src/services/shoppingService.ts')) };
}

const reply = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const token = exp => 'header.' + Buffer.from(JSON.stringify({ exp, sid: 'session' })).toString('base64url') + '.signature';

test('valid access tokens do not cause refresh requests', async () => {
  const value = token(Date.now() / 1000 + 300);
  const { auth } = setup(() => assert.fail('unexpected network call'), { accessToken: value });
  assert.equal(await auth.getValidAccessToken(), value);
});

test('concurrent expired-token requests share one refresh', async () => {
  let calls = 0;
  const { auth, storage, secure, tokens } = setup(async () => { calls++; return reply(200, { accessToken: 'new' }); }, { refreshToken: 'refresh' });
  const result = await Promise.all(Array.from({ length: 8 }, () => auth.getValidAccessToken()));
  assert.deepEqual(result, Array(8).fill('new'));
  assert.equal(calls, 1);
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).accessToken, 'new');
});

for (const status of [429, 500, 503]) {
  test(`refresh HTTP ${status} preserves the session and rejects`, async () => {
    const { auth, storage, secure, tokens } = setup(async () => reply(status, {}), { refreshToken: 'refresh', user: 'saved' });
    await assert.rejects(auth.getValidAccessToken());
    assert.equal(JSON.parse(secure.get('mystore.auth.v1')).refreshToken, 'refresh');
    assert.equal(storage.get('user'), 'saved');
  });
}

test('invalid refresh token clears the session', async () => {
  const { auth, storage, secure, tokens } = setup(async () => reply(401, {}), { refreshToken: 'refresh', user: 'saved' });
  assert.equal(await auth.getValidAccessToken(), null);
  assert.equal(storage.size, 0);
});

test('network failure preserves saved credentials', async () => {
  const { auth, storage, secure, tokens } = setup(async () => { throw Error('offline'); }, { refreshToken: 'refresh' });
  await assert.rejects(auth.getValidAccessToken(), /offline/);
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).refreshToken, 'refresh');
});

test('malformed refresh response does not erase the session', async () => {
  const { auth, storage, secure, tokens } = setup(async () => reply(200, {}), { refreshToken: 'refresh' });
  await assert.rejects(auth.getValidAccessToken(), /Invalid session response/);
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).refreshToken, 'refresh');
});

test('late refresh cannot overwrite credentials from another login', async () => {
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const { auth, storage, secure, tokens } = setup(() => new Promise(resolve => { finish = resolve; started(); }), { refreshToken: 'old-refresh' });
  const refresh = auth.getValidAccessToken();
  await ready;
  await tokens.updateTokens({ refreshToken: 'new-refresh', accessToken: 'new-session' });
  finish(reply(200, { accessToken: 'old-session' }));
  await assert.rejects(refresh, /session changed/);
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).accessToken, 'new-session');
});

test('late refresh response cannot restore a logged-out session', async () => {
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const { auth, storage, secure, tokens } = setup(() => new Promise(resolve => { finish = resolve; started(); }), { refreshToken: 'refresh' });
  const refresh = auth.getValidAccessToken();
  await ready;
  await auth.logoutLocal();
  finish(reply(200, { accessToken: 'old-session' }));
  assert.equal(await refresh, null);
  assert.equal(storage.size, 0);
});

test('logout clears local data even if the server fails', async () => {
  const { auth, storage, secure, tokens } = setup(async () => { throw Error('offline'); }, { refreshToken: 'refresh', user: 'saved' });
  await auth.logout();
  assert.equal(storage.size, 0);
});

test('network timeout aborts once without retrying a mutation', async () => {
  let calls = 0;
  const { request } = setup((url, options) => {
    calls++;
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted'))));
  });
  await assert.rejects(request('https://example.invalid/orders/create', { method: 'POST' }, 10), /aborted/);
  assert.equal(calls, 1);
});

test('caller cancellation is forwarded to the request', async () => {
  const controller = new AbortController();
  const { request } = setup((url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')))));
  const pending = request('https://example.invalid', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /aborted/);
});

test('changing password replaces credentials and keeps the user logged in', async () => {
  const { auth, storage, secure, tokens } = setup(async () => reply(200, {
    message: 'Password changed', accessToken: 'new-access', refreshToken: 'new-refresh', user: { id: 'user' },
  }), { accessToken: token(Date.now() / 1000 + 300), refreshToken: 'old-refresh', isLoggedIn: 'true' });
  await auth.changePassword('old-password', 'new-password', 'new-password');
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).accessToken, 'new-access');
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).refreshToken, 'new-refresh');
  assert.equal(storage.get('isLoggedIn'), 'true');
});

test('checkout retries reuse a persisted request ID regardless of item order', async () => {
  const { getCheckoutAttempt } = setup(() => assert.fail('no network expected'));
  const items = [{ productId: 'a', quantity: 2 }, { productId: 'b', quantity: 1 }];
  const first = await getCheckoutAttempt('user', 'Beirut', items);
  const retry = await getCheckoutAttempt('user', 'Beirut', [...items].reverse());
  assert.equal(first.key, retry.key);
  assert.match(first.key, /^[A-Za-z0-9_-]{16,128}$/);
});

test('checkout attempts are separate for changed carts and different users', async () => {
  const { getCheckoutAttempt } = setup(() => assert.fail('no network expected'));
  const first = await getCheckoutAttempt('user', 'Beirut', [{ productId: 'a', quantity: 1 }]);
  const changed = await getCheckoutAttempt('user', 'Beirut', [{ productId: 'a', quantity: 2 }]);
  const other = await getCheckoutAttempt('other-user', 'Beirut', [{ productId: 'a', quantity: 2 }]);
  assert.notEqual(first.key, changed.key);
  assert.notEqual(other.storageKey, changed.storageKey);
  assert.notEqual(other.key, changed.key);
});

test('home and search reuse product requests and never persist private prices', async () => {
  let calls = 0;
  const { catalog, storage } = setup(async () => {
    calls++;
    return reply(200, { products: [{ _id: 'one', name: 'Chocolate', price: 10, discountedPrice: 8 }] });
  });
  const [home, search] = await Promise.all([catalog.fetchCatalog('signed-in'), catalog.fetchCatalog('signed-in')]);
  assert.equal(calls, 1);
  assert.equal(home[0].price, 10);
  assert.equal(search[0].price, 10);
  await catalog.fetchCatalog('signed-in');
  assert.equal(calls, 1);
  const persisted = JSON.parse(storage.get('publicCatalog:v1'));
  assert.equal(persisted[0].name, 'Chocolate');
  assert.equal(persisted[0].price, undefined);
  assert.equal(persisted[0].discountedPrice, undefined);
});

test('guest catalog never reuses an authenticated price snapshot', async () => {
  const { catalog } = setup(async (url, options) => reply(200, { products: [{
    _id: 'one', name: 'Chocolate', ...(options.headers.Authorization ? { price: 10 } : {}),
  }] }));
  await catalog.fetchCatalog('signed-in');
  const guest = await catalog.fetchCatalog(null);
  assert.equal(guest[0].price, undefined);
});

test('search cart and favorite actions use the correct endpoints without trusting client prices', async () => {
  const calls = [];
  const { shopping } = setup(async (url, options) => {
    calls.push({ url, options });
    return reply(200, {});
  });
  await shopping.addProductToCart('product', 'access');
  await shopping.setProductFavorite('product', true, 'access');
  await shopping.setProductFavorite('product', false, 'access');
  assert.ok(calls[0].url.endsWith('/cart/add'));
  assert.deepEqual(JSON.parse(calls[0].options.body), { productId: 'product', quantity: 1 });
  assert.ok(calls[1].url.endsWith('/favorites/add'));
  assert.equal(calls[1].options.method, 'POST');
  assert.ok(calls[2].url.endsWith('/favorites/remove'));
  assert.equal(calls[2].options.method, 'DELETE');
  assert.ok(calls.every(call => call.options.headers.Authorization === 'Bearer access'));
});

test('failed search mutations report failure instead of success', async () => {
  const { shopping } = setup(async () => reply(400, { message: 'Product is out of stock' }));
  await assert.rejects(shopping.addProductToCart('product', 'access'), /out of stock/);
});


test('migration preserves credentials securely and removes plaintext copies', async () => {
  const { tokens, storage, secure } = setup(() => {}, { accessToken: 'access', refreshToken: 'refresh' });
  const migrated = await tokens.readTokens();
  assert.equal(migrated.accessToken, 'access');
  assert.equal(migrated.refreshToken, 'refresh');
  assert.equal(storage.size, 0);
  assert.equal(JSON.parse(secure.get('mystore.auth.v1')).refreshToken, 'refresh');
});

test('migration failure preserves the legacy session for a later retry', async () => {
  const { tokens, storage } = setup(() => {}, { refreshToken: 'refresh' }, { failWrite: true });
  await assert.rejects(tokens.readTokens(), /secure storage unavailable/);
  assert.equal(storage.get('refreshToken'), 'refresh');
});

test('secure credentials win over stale legacy credentials', async () => {
  const { tokens, storage } = setup(() => {}, { refreshToken: 'old' }, {
    secure: { 'mystore.auth.v1': JSON.stringify({ accessToken: 'new', refreshToken: 'new-refresh' }) },
  });
  assert.equal((await tokens.readTokens()).refreshToken, 'new-refresh');
  assert.equal(storage.size, 0);
});

test('logout before migration cannot resurrect the old session', async () => {
  const { auth, tokens, storage } = setup(() => {}, { accessToken: 'old', refreshToken: 'old' });
  await auth.logoutLocal();
  assert.equal((await tokens.readTokens()).accessToken, null);
  assert.equal((await tokens.readTokens()).refreshToken, null);
  assert.equal(storage.size, 0);
});

test('access-only replacement preserves the refresh credential', async () => {
  const { tokens, storage } = setup(() => {}, { accessToken: 'old', refreshToken: 'refresh' });
  await tokens.updateTokens({ accessToken: 'new' });
  assert.equal((await tokens.readTokens()).accessToken, 'new');
  assert.equal((await tokens.readTokens()).refreshToken, 'refresh');
  assert.equal(storage.size, 0);
});

test('web credentials stay in memory without plaintext persistence', async () => {
  const { tokens, storage, secure } = setup(() => {}, {}, { platform: 'web' });
  await tokens.updateTokens({ accessToken: 'access', refreshToken: 'refresh' });
  assert.equal((await tokens.readTokens()).refreshToken, 'refresh');
  assert.equal(storage.size, 0);
  assert.equal(secure.size, 0);
});


test('login writes both credentials securely without leaving plaintext tokens', async () => {
  const { auth, tokens, storage } = setup(async () => reply(200, {
    accessToken: 'access', refreshToken: 'refresh', user: { id: 'user' },
  }));
  await auth.loginUser('phone', 'password');
  assert.equal((await tokens.readTokens()).accessToken, 'access');
  assert.equal((await tokens.readTokens()).refreshToken, 'refresh');
  assert.equal(storage.has('accessToken'), false);
  assert.equal(storage.has('refreshToken'), false);
  assert.equal(storage.get('isLoggedIn'), 'true');
});


test('offline logout stays cleared and retries revocation when connectivity returns', async () => {
  let offline = true;
  const { auth, tokens } = setup(async () => { if (offline) throw Error('offline'); return reply(200, {}); }, { refreshToken: 'old' });
  await auth.logout();
  assert.equal((await tokens.readTokens()).refreshToken, null);
  assert.equal((await tokens.readTokens()).pendingLogouts[0], 'old');
  offline = false;
  await auth.flushPendingLogouts();
  assert.equal((await tokens.readTokens()).pendingLogouts.length, 0);
});

function pushFixture(granted) {
  let enabled = true;
  const calls = [];
  const notifications = {
    AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted, canAskAgain: false }),
    getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[test]' }),
  };
  const fixture = setup(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/notification-setting') && options.method === 'PUT') enabled = JSON.parse(options.body).notificationsEnabled;
    return reply(200, { notificationsEnabled: enabled });
  }, { accessToken: token(Date.now()/1000 + 300), refreshToken: 'refresh', user: JSON.stringify({ id: 'user' }) }, { notifications });
  return { ...fixture, calls };
}

test('permission denial detaches the device without registering a token', async () => {
  const { push, calls } = pushFixture(false);
  assert.equal(await push.syncPush(), 'denied');
  assert.equal(calls.at(-1).options.method, 'DELETE');
  assert.equal(calls.some(call => call.options.method === 'PUT'), false);
});

test('granted permission registers a device with the signed-in session', async () => {
  const { push, calls } = pushFixture(true);
  assert.equal(await push.syncPush(), 'ready');
  const call = calls.at(-1);
  assert.equal(call.options.method, 'PUT');
  assert.deepEqual(JSON.parse(call.options.body), { token: 'ExpoPushToken[test]' });
  assert.ok(call.options.headers.Authorization.startsWith('Bearer '));
});

test('notification navigation rejects other accounts and arbitrary URLs', async () => {
  const { push } = pushFixture(true);
  assert.equal(await push.notificationDestination({ type: 'order', userId: 'other', orderId: 'a'.repeat(24) }), null);
  assert.equal(await push.notificationDestination({ userId: 'user', url: 'https://evil.invalid' }), null);
  assert.equal(await push.notificationDestination({ type: 'order', userId: 'user', orderId: '../admin' }), null);
  assert.equal((await push.notificationDestination({ type: 'order', userId: 'user', orderId: 'a'.repeat(24) })).pathname, '/order-details');
});
test('switching accounts queues revocation of the previous device session', async () => {
  const { tokens } = setup(() => {}, { accessToken: 'old-access', refreshToken: 'old-session' });
  await tokens.updateTokens({ accessToken: 'new-access', refreshToken: 'new-session' });
  const current = await tokens.readTokens();
  assert.equal(current.refreshToken, 'new-session');
  assert.equal(current.pendingLogouts[0], 'old-session');
});


test('customer setting stays synchronized through disable and re-enable', async () => {
  const { auth, push, storage, calls } = pushFixture(true);
  for (const enabled of [false, true]) {
    assert.equal(await auth.updateNotificationSetting(enabled), enabled);
    assert.equal(await auth.getNotificationSetting(), enabled);
    assert.equal(JSON.parse(storage.get('user')).notificationsEnabled, enabled);
    assert.equal(await push.syncPush(), enabled ? 'ready' : 'disabled');
    assert.equal(calls.at(-1).options.method, enabled ? 'PUT' : 'DELETE');
  }
});
test('permission errors preserve the authenticated session', async () => {
  const { auth, request } = setup(async () => reply(403, {}), { accessToken: 'access', refreshToken: 'refresh' });
  await assert.rejects(request('https://example.invalid/cart', { headers: { Authorization: 'Bearer access' } }), error => error.status === 403);
  assert.equal(await auth.getAccessToken(), 'access');
});

test('responses from a previous account are rejected before data reaches a screen', async () => {
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const { request, tokens } = setup(() => new Promise(resolve => { finish = resolve; started(); }), { accessToken: 'old', refreshToken: 'old-refresh' });
  const pending = request('https://example.invalid/cart', { headers: { Authorization: 'Bearer old' } });
  await ready;
  await tokens.updateTokens({ accessToken: 'new', refreshToken: 'new-refresh' });
  finish(reply(200, { privateData: 'old-account' }));
  await assert.rejects(pending, /session changed/);
});

test('a stalled response body times out without retrying the request', async () => {
  let calls = 0;
  const { request } = setup(async () => {
    calls++;
    return { ok: true, status: 200, json: () => new Promise(() => {}) };
  });
  const response = await request('https://example.invalid/cart', {}, 10);
  await assert.rejects(response.json(), /timed out/);
  assert.equal(calls, 1);
});
