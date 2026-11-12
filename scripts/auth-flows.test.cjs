const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');

// Exercise the real auth service, request wrapper and token storage. Native
// modules and HTTP are mocked: these tests cannot verify a device's Java runtime.
function fixture(platform) {
  const storage = new Map(), secure = new Map(), session = new Map(), local = new Map();
  const calls = [], replies = [], cache = new Map();
  const browserStorage = values => ({
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  });
  const dependencies = {
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      removeItem: async key => { storage.delete(key); },
      multiRemove: async keys => { keys.forEach(key => storage.delete(key)); },
    },
    'expo-secure-store': {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
      getItemAsync: async key => secure.get(key) ?? null,
      setItemAsync: async (key, value) => { secure.set(key, value); },
    },
    'react-native': { Platform: { OS: platform } },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = fs.readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, {
      exports, __DEV__: false, Error, setTimeout, clearTimeout, AbortController,
      // No application console or response/body logging is exposed by this fixture.
      console: { log() {}, error() {} },
      window: { sessionStorage: browserStorage(session), localStorage: browserStorage(local) },
      fetch: async (url, options) => {
        calls.push({ url, options });
        const next = replies.shift();
        if (!next) throw Error('Missing HTTP fixture');
        if (next.error) throw next.error;
        return { ok: next.status >= 200 && next.status < 300, status: next.status,
          json: async () => { if (next.invalidJSON) throw Error('Invalid fixture JSON'); return next.body; } };
      },
      require: name => dependencies[name] || load(path.resolve(path.dirname(file), name + '.ts')),
    }, { filename: file });
    return exports;
  }
  const root = path.resolve(__dirname, '../src/services');
  const auth = load(path.join(root, 'authService.ts'));
  const tokens = load(path.join(root, 'tokenStorage.ts'));
  const reply = (status, body) => replies.push({ status, body });
  const expectRequest = (index, route, fields) => {
    const call = calls[index];
    assert.ok(call, 'The operation must send a request');
    assert.equal(call.url, auth.API_URL + '/auth/' + route);
    assert.ok(call.url.startsWith('https://'), 'Authentication must use HTTPS');
    assert.equal(call.options.method, 'POST');
    assert.equal(call.options.headers['Content-Type'], 'application/json');
    assert.equal(call.options.headers.Accept, 'application/json');
    assert.ok(!call.options.headers.Authorization, 'Guest auth requests must not borrow a saved bearer token');
    const body = JSON.parse(call.options.body);
    assert.deepEqual(Object.keys(body).sort(), Object.keys(fields).sort());
    // Boolean assertions deliberately avoid printing request field values on failure.
    for (const [key, value] of Object.entries(fields)) assert.ok(body[key] === value, 'Incorrect authentication request field');
  };
  return { auth, tokens, calls, replies, reply, expectRequest, request: load(path.join(root, 'request.ts')).request };
}

const registration = () => ({ firstName: ' Test ', lastName: ' Customer ', phone: ' 71000000 ', address: ' Fixture address ', password: 'fixture-password-only', confirmPassword: 'fixture-password-only', purchaseUsage: 'personal_home' });
const registrationReply = { message: 'Registration successful. Your verification request is waiting for approval.', requiresPhoneVerification: true, verificationStatus: 'pending' };
const resetReply = { message: 'If this phone number has a verified account, a password reset request has been created.' };
const dnsFailure = () => Error('fetch failed: java.net.UnknownHostException: Unable to resolve host "mystore-backend-u6ey.onrender.com": No address associated with hostname');
const connectionMessage = 'Cannot connect to BStore. Check your internet connection and try again. If the problem continues, try another network.';

for (const platform of ['android', 'web']) {
  test(`${platform}: registration rejects unanswered/invalid usage without HTTP and forwards only the explicit answer`, async () => {
    const f = fixture(platform);
    for (const purchaseUsage of [undefined, null, '', 'C-D', 'B-D', 'PERSONAL_HOME', ' personal_home', [], {}, true, 1]) {
      await assert.rejects(f.auth.registerUser({ ...registration(), purchaseUsage }), /يرجى تحديد طبيعة استخدامكم للمشتريات/);
    }
    assert.equal(f.calls.length, 0);
    for (const purchaseUsage of ['personal_home', 'mini_market_supermarket']) {
      f.reply(201, registrationReply);
      await f.auth.registerUser({ ...registration(), purchaseUsage, priceClass: 'A', role: 'admin' });
      const body = JSON.parse(f.calls.at(-1).options.body);
      assert.equal(body.purchaseUsage, purchaseUsage);
      assert.equal(body.priceClass, undefined);
      assert.equal(body.role, undefined);
    }
  });

  test(`${platform}: registration validates an eight-digit phone before any HTTP request`, async () => {
    const f = fixture(platform);
    for (const value of ['', '1234567', '123456789', '12ab5678', '1234+678', '1234 678', '١٢٣٤٥٦٧٨']) {
      await assert.rejects(f.auth.registerUser({ ...registration(), phone: value }));
    }
    assert.equal(f.calls.length, 0);
  });

  test(`${platform}: registration sends the backend contract and stays signed out until verification`, async () => {
    const f = fixture(platform), input = registration();
    f.reply(201, registrationReply);
    const result = await f.auth.registerUser(input);
    f.expectRequest(0, 'register', { ...input, firstName: 'Test', lastName: 'Customer', phone: '71000000', address: 'Fixture address' });
    assert.equal(result.requiresPhoneVerification, true);
    assert.equal(result.verificationStatus, 'pending');
    assert.equal((await f.tokens.readTokens()).accessToken, null);
    assert.equal(f.calls.length, 1);
  });

  test(`${platform}: code verification uses the registration endpoint and installs a session only on success`, async () => {
    const f = fixture(platform);
    f.reply(400, { message: 'Verification code expired' });
    await assert.rejects(f.auth.verifyRegistrationOTP(' 71000000 ', ' 123456 '), /Verification code expired/);
    assert.equal((await f.tokens.readTokens()).accessToken, null);
    f.reply(200, { message: 'Phone verified', accessToken: 'fixture-access', refreshToken: 'fixture-refresh', user: { id: 'fixture-customer' } });
    await f.auth.verifyRegistrationOTP(' 71000000 ', ' 123456 ');
    f.expectRequest(1, 'verify-registration-otp', { phone: '71000000', otp: '123456' });
    assert.equal(f.tokens.getSessionSnapshot().authenticated, true);
    assert.ok((await f.tokens.readTokens()).accessToken === 'fixture-access', 'Verified credentials must be persisted');
  });

  test(`${platform}: registration resend requires its password and cannot start a session`, async () => {
    const f = fixture(platform);
    f.reply(200, { message: 'Registration verification requested', verificationStatus: 'pending' });
    await f.auth.resendRegistrationOTP(' 71000000 ', 'fixture-password-only');
    f.expectRequest(0, 'resend-registration-otp', { phone: '71000000', password: 'fixture-password-only' });
    assert.equal((await f.tokens.readTokens()).accessToken, null);
  });

  test(`${platform}: forgot/reset password use the six-digit-code contract without an email redirect`, async () => {
    const f = fixture(platform);
    f.reply(200, resetReply);
    const requested = await f.auth.requestPasswordReset(' 71000000 ');
    f.expectRequest(0, 'forgot-password', { phone: '71000000' });
    assert.equal(requested.message, resetReply.message);
    f.reply(200, { message: 'Password reset successful. Please log in.' });
    await f.auth.resetPassword(' 71000000 ', ' 123456 ', 'fixture-new-password', 'fixture-new-password');
    f.expectRequest(1, 'reset-password', { phone: '71000000', otp: '123456', newPassword: 'fixture-new-password', confirmPassword: 'fixture-new-password' });
    assert.equal((await f.tokens.readTokens()).accessToken, null);
    assert.equal(f.calls.length, 2);
  });

  for (const [route, message, status] of [
    ['register', 'Phone number already exists.', 409],
    ['forgot', 'Too many verification requests. Please try again later.', 429],
    ['reset', 'Verification code expired', 400],
    ['reset', 'Incorrect verification code', 400],
    ['reset', 'Too many incorrect attempts', 400],
  ]) test(`${platform}: ${route} preserves a ${status} API error and never retries the write`, async () => {
    const f = fixture(platform); f.reply(status, { message });
    const work = route === 'register' ? f.auth.registerUser(registration())
      : route === 'forgot' ? f.auth.requestPasswordReset('71000000')
      : f.auth.resetPassword('71000000', '123456', 'fixture-new-password', 'fixture-new-password');
    await assert.rejects(work, error => error.message === message);
    assert.equal(f.calls.length, 1);
    assert.equal((await f.tokens.readTokens()).accessToken, null);
  });

  test(`${platform}: transport and malformed-JSON failures reject without saving credentials`, async () => {
    const f = fixture(platform);
    f.replies.push({ error: Error('Network request failed') });
    await assert.rejects(f.auth.registerUser(registration()), /Network request failed/);
    f.replies.push({ status: 200, invalidJSON: true });
    await assert.rejects(f.auth.requestPasswordReset('71000000'), /Invalid server response/);
    assert.equal(f.calls.length, 2);
    assert.equal((await f.tokens.readTokens()).accessToken, null);
  });

  for (const operation of ['registration', 'login', 'forgot password', 'reset password']) test(`${platform}: ${operation} explains a DNS failure without retrying or inventing a session`, async () => {
    const f = fixture(platform); f.replies.push({ error: dnsFailure() });
    const work = operation === 'registration' ? f.auth.registerUser(registration())
      : operation === 'login' ? f.auth.loginUser('71000000', 'fixture-password-only')
      : operation === 'forgot password' ? f.auth.requestPasswordReset('71000000')
      : f.auth.resetPassword('71000000', '123456', 'fixture-new-password', 'fixture-new-password');
    await assert.rejects(work, error => error.message === connectionMessage);
    assert.equal(f.calls.length, 1);
    assert.equal(f.tokens.getSessionSnapshot().authenticated, false);
  });

  test(`${platform}: Cart and Favorites DNS failures keep the existing credentials and use the shared connection message`, async () => {
    const f = fixture(platform);
    await f.tokens.updateTokens({ accessToken: 'fixture-access', refreshToken: 'fixture-refresh' });
    for (const route of ['/cart', '/favorites']) {
      f.replies.push({ error: dnsFailure() });
      await assert.rejects(f.request(f.auth.API_URL + route, { headers: { Authorization: 'Bearer fixture-access' } }), error => error.message === connectionMessage);
      const saved = await f.tokens.readTokens();
      assert.ok(saved.accessToken === 'fixture-access' && saved.refreshToken === 'fixture-refresh', 'A DNS failure must not erase credentials');
    }
    assert.equal(f.calls.length, 2);
  });

  test(`${platform}: a user retry after DNS recovery can request a reset without restarting the app`, async () => {
    const f = fixture(platform); f.replies.push({ error: dnsFailure() });
    await assert.rejects(f.auth.requestPasswordReset('71000000'), error => error.message === connectionMessage);
    f.reply(200, resetReply);
    const result = await f.auth.requestPasswordReset('71000000');
    assert.equal(result.message, resetReply.message);
    assert.equal(f.calls.length, 2);
  });
}
