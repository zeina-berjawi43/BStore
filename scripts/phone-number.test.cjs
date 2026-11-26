const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const source = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
function execute(code, context = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Error, analytics: { registrationStarted() {}, registrationFailed() {} }, __DEV__: false, ...context });
  return exports;
}
const phone = execute(source('services/phone-number.ts'));
function ast(file) { return ts.createSourceFile(file, source('app/' + file + '.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function handler(file, name, context) {
  const tree = ast(file); let expression;
  const walk = node => { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) expression = node.initializer.getText(tree); ts.forEachChild(node, walk); };
  walk(tree); assert.ok(expression, 'Expected production handler');
  return execute('exports.run = ' + expression, { ...phone, validationError: message => context.setError(message), ...context }).run;
}
const invalid = ['', '1', '1234567', '123456789', '12ab5678', '1234+678', '1234 678', ' 12345678 ', '١٢٣٤٥٦٧٨', '１２３４５６７８', '12345678\n'];

test('phone validation accepts exactly eight ASCII digits, preserving leading zeroes', () => {
  assert.equal(phone.PHONE_NUMBER_LENGTH, 8);
  for (const value of ['12345678', '01234567', '00000000']) {
    assert.equal(phone.phoneNumberError(value), null);
    assert.equal(phone.sanitizePhoneInput(value), value);
    assert.doesNotThrow(() => phone.requirePhoneNumber(value));
  }
});

test('empty, short, long, alphabetic, symbol, spaced and non-ASCII numbers are rejected', () => {
  for (const value of invalid) {
    assert.ok(phone.phoneNumberError(value), 'Invalid input must have a validation message');
    assert.throws(() => phone.requirePhoneNumber(value));
  }
  assert.equal(phone.phoneNumberError(''), 'Please enter your phone number.');
  assert.match(phone.phoneNumberError('1234567'), /exactly 8 digits/);
});

test('typed and pasted input is filtered to ASCII digits and capped at eight', () => {
  for (const [input, expected] of [
    ['abc!+-() ', ''], ['70 123-456', '70123456'], ['1234567890', '12345678'],
    ['a0b1c2d3e4f5g6h7i8', '01234567'], ['١٢3４5', '35'],
  ]) assert.equal(phone.sanitizePhoneInput(input), expected);
});

for (const file of ['register', 'login', 'forgot-password', 'edit-account']) test(`${file}: the actual phone input filters paste and has an eight-character limit`, () => {
  const tree = ast(file); let field;
  const walk = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'TextInput' && node.attributes.properties.some(prop =>
      prop.name?.getText(tree) === 'onChangeText' && prop.initializer?.getText(tree).includes('sanitizePhoneInput'))) field = node;
    ts.forEachChild(node, walk);
  };
  walk(tree); assert.ok(field, 'The production phone input must sanitize edits');
  const attribute = name => field.attributes.properties.find(prop => prop.name?.getText(tree) === name)?.initializer;
  assert.equal(attribute('keyboardType').text, 'number-pad');
  assert.equal(execute('exports.value = ' + attribute('maxLength').expression.getText(tree), phone).value, 8);
  let saved;
  const change = execute('exports.run = ' + attribute('onChangeText').expression.getText(tree), {
    ...phone, setPhone: value => { saved = value; }, setError() {}, setPhoneError() {}, setGeneralError() {},
  }).run;
  change('a01 234-56789'); assert.equal(saved, '01234567');
  change('abc+ ١٢٣'); assert.equal(saved, '');
});

for (const platform of ['android', 'web']) for (const [file, action] of [
  ['register', 'handleRegister'], ['login', 'handleLogin'], ['forgot-password', 'handleContinue'],
]) test(`${platform}/${file}: submission revalidates raw state independently of input filtering`, async () => {
  for (const value of [...invalid, '01234567']) {
    const calls = [], errors = [], routes = [];
    const submit = handler(file, action, {
      loading: false, phone: value, firstName: 'Test', lastName: 'Customer', address: 'Fixture address',
      purchaseUsage: 'personal_home',
      password: 'fixture-password', confirmPassword: 'fixture-password', rememberMe: false, Platform: { OS: platform },
      setError: text => { if (text) errors.push(text); }, setPhoneError: text => { if (text) errors.push(text); },
      setPasswordError() {}, setGeneralError() {}, setLoading() {}, setPassword() {}, setConfirmPassword() {},
      registerUser: async input => { calls.push(input.phone); }, loginUser: async number => { calls.push(number); }, requestPasswordReset: async number => { calls.push(number); },
      router: { push: route => routes.push(route) },
    });
    await submit();
    const valid = value === '01234567';
    assert.equal(calls.length, valid ? 1 : 0, 'Invalid raw state must never reach the API');
    if (valid) assert.equal(calls[0], value);
    else { assert.ok(errors.length > 0); assert.equal(routes.length, 0); }
  }
});

test('profile validation blocks changed invalid phones before saving any profile data', async () => {
  for (const value of invalid) {
    let calls = 0; const notices = [];
    const save = handler('edit-account', 'saveChanges', {
      phone: value, originalPhone: '70000000', name: 'Test Customer', email: '', address: 'Fixture address', saving: false, verifyingPhone: false,
      getValidAccessToken: async () => { calls++; }, saveProfileInformation: async () => { calls++; }, actionAlert: (...args) => notices.push(args),
    });
    await save(); assert.equal(calls, 0); assert.ok(notices.length > 0);
  }
});

test('profile saves preserve an unchanged stored phone without migration or a phone-change request', async () => {
  for (const originalPhone of ['01234567', '1234567', '+96170000000']) {
    const saved = [], notices = []; let phoneChanges = 0, shown;
    const save = handler('edit-account', 'saveChanges', {
      phone: originalPhone, originalPhone, name: 'Test Customer', email: '', address: 'Updated address', saving: false, verifyingPhone: false,
      getValidAccessToken: async () => 'fixture-access', setSaving() {}, setPhone: value => { shown = value; },
      saveProfileInformation: async (...args) => { saved.push(args); return { response: { ok: true }, data: {} }; },
      requestPhoneChange: async () => { phoneChanges++; }, actionAlert: (...args) => notices.push(args), router: { back() {} },
    });
    await save(); assert.equal(saved.length, 1); assert.equal(phoneChanges, 0); assert.equal(shown, originalPhone);
    assert.equal(saved[0].length, 5, 'The profile payload must continue to exclude phone');
    assert.equal(notices[0][0], 'Success');
  }
});

test('saving a new valid phone still requests verification instead of committing it immediately', async () => {
  const calls = []; let pending, verifying;
  const save = handler('edit-account', 'saveChanges', {
    phone: '01234567', originalPhone: '70000000', name: 'Test Customer', email: '', address: 'Fixture address', saving: false, verifyingPhone: false,
    getValidAccessToken: async () => 'fixture-access', setSaving() {}, setPhone() {}, setOtp() {},
    setPendingPhone: value => { pending = value; }, setPhoneVerification: value => { verifying = value; },
    saveProfileInformation: async () => { calls.push('profile'); return { response: { ok: true }, data: {} }; },
    requestPhoneChange: async (_token, value) => { calls.push('verification'); assert.equal(value, '01234567'); return { response: { ok: true }, data: {} }; },
    actionAlert() {},
  });
  await save();
  assert.deepEqual(calls, ['profile', 'verification']);
  assert.equal(pending, '01234567'); assert.equal(verifying, true);
});

test('phone-change request checks eight digits again before sending its existing API payload', async () => {
  for (const value of [...invalid, '01234567']) {
    const sent = [];
    const change = handler('edit-account', 'requestPhoneChange', {
      API_URL: 'https://fixture.invalid', request: async (url, options) => { sent.push({ url, options }); return { ok: true, json: async () => ({}) }; },
    });
    if (value === '01234567') {
      await change('fixture-access', value);
      assert.equal(sent.length, 1); assert.equal(sent[0].url, 'https://fixture.invalid/auth/request-change-phone');
      assert.equal(JSON.parse(sent[0].options.body).newPhone, value);
    } else { await assert.rejects(change('fixture-access', value)); assert.equal(sent.length, 0); }
  }
});

for (const [file, action] of [['reset-password', 'handleResetPassword'], ['verify-otp', 'handleVerify']]) test(`${file}: invalid route phone numbers cannot bypass validation`, async () => {
  for (const value of invalid) {
    let calls = 0; const errors = [];
    const submit = handler(file, action, {
      phone: value, loading: false, resending: false, isRegistration: true, otp: '123456', newPassword: 'fixture-password', confirmPassword: 'fixture-password',
      setError: text => { if (text) errors.push(text); }, setMessage() {},
      resetPassword: async () => { calls++; }, verifyRegistrationOTP: async () => { calls++; },
    });
    await submit(); assert.equal(calls, 0); assert.ok(errors.length > 0);
  }
});

for (const file of ['reset-password', 'verify-otp']) test(`${file}: resend rejects invalid or missing route phone numbers`, async () => {
  for (const value of invalid) {
    let calls = 0; const errors = [];
    const resend = handler(file, 'handleResend', {
      phone: value, loading: false, resending: false, resendSeconds: 0, seconds: 0, isRegistration: true, password: 'fixture-password',
      setError: text => { if (text) errors.push(text); }, setMessage() {}, setResendMessage() {},
      requestPasswordReset: async () => { calls++; }, resendRegistrationOTP: async () => { calls++; },
    });
    await resend(); assert.equal(calls, 0); assert.ok(errors.length > 0);
  }
});
