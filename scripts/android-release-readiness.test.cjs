const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { AndroidConfig } = require('expo/config-plugins');
const releasePlugin = require('../plugins/with-android-release.cjs');
const optimizePlugin = require('../plugins/with-optimized-proguard.cjs');
const ignore = require('ignore');

const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const root = path.resolve('fixture-release-root');
const appGradle = `apply plugin: "com.android.application"
android {
  defaultConfig { applicationId 'com.zeina43.mystore'
    versionCode 1
    versionName "1.0.0"
  }
  buildTypes { release {
    signingConfig signingConfigs.debug
    minifyEnabled enableMinifyInReleaseBuilds
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
  } }
}
// Preserve unrelated application wiring.
`;

function fixture({ native = true, subject = 'CN=Existing Upload', expires = '2099-01-01', failPrivateKey = false, expectedFingerprint } = {}) {
  const googleFile = path.join(root, 'google-services.json');
  const keyFile = path.join(root, 'credentials', 'fixture.jks');
  const credentials = { android: { keystore: { keystorePath: 'credentials/fixture.jks',
    keystorePassword: 'fixture-store-password', keyAlias: 'fixture-alias', keyPassword: 'fixture-key-password' } } };
  const entries = [
    ['app.json', JSON.stringify({ expo: config })], ['eas.json', fs.readFileSync('eas.json')],
    ['credentials.json', JSON.stringify(credentials)], ['credentials/fixture.jks', 'fixture-key'],
    ['google-services.json', JSON.stringify({ client: [{ client_info: { android_client_info: { package_name: config.android.package } } }] })],
  ];
  if (native) entries.push(['android/app/build.gradle', appGradle],
    ['android/build.gradle', 'buildscript { dependencies { classpath("existing.plugin") } }'],
    ['android/gradle.properties', 'existing.property=preserve\nandroid.enableMinifyInReleaseBuilds=false\n'],
    ['android/app/src/main/AndroidManifest.xml', '<manifest>preserve</manifest>']);
  const files = new Map(entries.map(([name, value]) => [path.join(root, name), Buffer.from(value)]));
  const calls = [];
  const io = {
    existsSync: file => files.has(file) || [...files.keys()].some(key => key.startsWith(file + path.sep)),
    readFileSync: (file, encoding) => {
      if (!files.has(file)) throw Error('Missing fixture file');
      return encoding ? files.get(file).toString(encoding) : files.get(file);
    },
    writeFileSync: (file, value) => files.set(file, Buffer.from(value)),
  };
  const sdk = { ...AndroidConfig, Manifest: {
    readAndroidManifestAsync: async () => ({}),
    getMainActivityOrThrow: () => ({ $: { 'android:screenOrientation': 'unspecified' } }),
  } };
  const dependencies = {
    'node:fs': io, 'node:path': path,
    'node:crypto': { X509Certificate: class { constructor() {
      this.subject = subject; this.validTo = expires; this.fingerprint256 = Array(32).fill('AA').join(':');
    } } },
    'node:child_process': { spawnSync: (tool, args, options) => {
      calls.push({ tool, args, options });
      return { status: failPrivateKey && args.includes('-certreq') ? 1 : 0, stdout: 'fixture-certificate' };
    } },
    'expo/config-plugins': { AndroidConfig: sdk },
    '../plugins/with-android-release.cjs': releasePlugin,
    '../plugins/with-optimized-proguard.cjs': optimizePlugin,
    [path.join(root, 'app.config.js')]: ({ config: base }) => ({ ...base, android: { ...base.android, googleServicesFile: googleFile } }),
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync('scripts/android-release.cjs', 'utf8'), {
    module, __dirname: path.join(root, 'scripts'), Buffer, console,
    process: { platform: 'win32', env: { BSTORE_PLAY_UPLOAD_CERT_SHA256: expectedFingerprint } },
    require: name => { assert.ok(name in dependencies, 'Unexpected import'); return dependencies[name]; },
  });
  return { ...module.exports, files, calls, keyFile, credentials };
}

test('release plugin rejects a new package or a reused version and accepts the existing Play update identity', () => {
  assert.doesNotThrow(() => releasePlugin.assertReleaseIdentity(config));
  for (const android of [{ ...config.android, package: 'another.app' }, { ...config.android, versionCode: 11 },
    { ...config.android, versionCode: '12' }, { ...config.android, versionCode: 12.5 },
    { ...config.android, versionCode: 2100000001 }]) assert.throws(() => releasePlugin.assertReleaseIdentity({ ...config, android }));
});

test('release signing injection refuses incomplete or duplicate owned blocks', () => {
  for (const contents of ['// @bstore-release-begin', '// @bstore-release-end',
    '// @bstore-release-begin\n// @bstore-release-begin\n// @bstore-release-end']) {
    assert.throws(() => releasePlugin.configureReleaseGradle(contents), /markers/);
  }
});

test('native release preparation is idempotent, uses existing signing inputs and preserves other native configuration', async () => {
  const f = fixture();
  const sourceKey = Buffer.from(f.files.get(f.keyFile));
  const first = await f.prepare(root);
  assert.equal(first.nativeProjectPresent, true);
  const gradle = f.files.get(path.join(root, 'android', 'app', 'build.gradle')).toString();
  assert.match(gradle, /versionCode 12/);
  assert.match(gradle, /proguard-android-optimize\.txt/);
  assert.ok(gradle.includes('// Preserve unrelated application wiring.'));
  assert.ok(gradle.lastIndexOf('android.buildTypes.release.signingConfig = bstoreSigning') > gradle.indexOf('signingConfig signingConfigs.debug'));
  assert.ok(!gradle.includes('fixture-store-password') && !gradle.includes('fixture-key-password'));
  assert.ok(f.files.get(f.keyFile).equals(sourceKey));
  assert.equal(f.files.get(path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')).toString(), '<manifest>preserve</manifest>');
  assert.equal((await f.prepare(root)).changedFiles, 0);
  assert.equal(f.check(root).privateKeyReadable, true);
  for (const { args, options } of f.calls) {
    assert.ok(!args.includes('fixture-store-password') && !args.includes('fixture-key-password'));
    assert.equal(options.env.BSTORE_RELEASE_STORE_PASSWORD, 'fixture-store-password');
  }
});

test('preflight refuses debug certificates, expired certificates and invalid private-key passwords', async () => {
  for (const [options, message] of [[{ subject: 'CN=Android Debug' }, /Debug certificate/],
    [{ expires: '2000-01-01' }, /expired/], [{ failPrivateKey: true }, /private signing key/]]) {
    const f = fixture(options); await f.prepare(root); assert.throws(() => f.check(root), message);
  }
});

test('fresh EAS native generation is supported without an existing Android directory', async () => {
  const f = fixture({ native: false });
  assert.equal((await f.prepare(root)).nativeProjectPresent, false);
  assert.equal(f.check(root).versionCode, 12);
  const native = releasePlugin(config);
  const result = await native.mods.android.appBuildGradle({ modResults: { language: 'groovy', contents: appGradle } });
  assert.match(result.modResults.contents, /bstoreRelease/);
});

test('preflight can compare against the public Google Play upload fingerprint without changing credentials', () => {
  const matching = fixture({ native: false, expectedFingerprint: 'aa'.repeat(32) });
  assert.equal(matching.check(root).playUploadCertificateMatched, true);
  const different = fixture({ native: false, expectedFingerprint: 'bb'.repeat(32) });
  assert.throws(() => different.check(root), /does not match/);
  assert.equal(different.calls.length, 1);
});

test('EAS uses the shared version and existing credentials while source archives exclude every signing input and backup', () => {
  const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  assert.equal(eas.cli.appVersionSource, 'local');
  assert.equal(eas.build.production.autoIncrement, false);
  assert.equal(eas.build.production.credentialsSource, 'local');
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  const rules = ignore().add(fs.readFileSync('.easignore', 'utf8'));
  assert.equal(rules.ignores('google-services.json'), false);
  for (const file of ['credentials.json', 'credentials/android/keystore.jks', 'android-diagnostic-backup/build.gradle',
    'android/app/build.gradle', '.env', 'project-firebase-adminsdk-test.json']) assert.equal(rules.ignores(file), true, file);
});
