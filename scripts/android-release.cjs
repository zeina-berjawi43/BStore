const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { AndroidConfig } = require('expo/config-plugins');
const { assertReleaseIdentity, configureReleaseGradle } = require('../plugins/with-android-release.cjs');
const { useOptimizedProguardFile: optimizeProguardFile } = require('../plugins/with-optimized-proguard.cjs');

function readJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`Cannot read ${label}.`); }
}

function releaseInputs(root) {
  const base = readJson(path.join(root, 'app.json'), 'app configuration').expo;
  assertReleaseIdentity(base);
  let config;
  try { config = require(path.join(root, 'app.config.js'))({ config: base }); }
  catch { throw new Error('Android app configuration could not be resolved. Check the existing Firebase client input.'); }
  if (!config.android.googleServicesFile) throw new Error('Existing Customer Firebase client file is required.');
  const firebase = readJson(config.android.googleServicesFile, 'Firebase client configuration');
  if (!firebase.client?.some(client => client.client_info?.android_client_info?.package_name === config.android.package)) {
    throw new Error('Firebase client package does not match BStore.');
  }
  const eas = readJson(path.join(root, 'eas.json'), 'EAS configuration');
  if (eas.cli.appVersionSource !== 'local' || eas.build.production.autoIncrement !== false
      || eas.build.production.credentialsSource !== 'local' || eas.build.production.android.buildType !== 'app-bundle') {
    throw new Error('Production EAS must use the shared local version, existing local credentials and AAB format.');
  }
  if (config.orientation !== 'default') throw new Error('BStore must allow device orientation changes.');
  const keystore = readJson(path.join(root, 'credentials.json'), 'existing signing credentials').android?.keystore;
  if (!keystore || !['keystorePath', 'keystorePassword', 'keyAlias'].every(key => typeof keystore[key] === 'string' && keystore[key])) {
    throw new Error('Existing signing credentials are incomplete.');
  }
  const keyFile = path.resolve(root, keystore.keystorePath);
  if (!fs.existsSync(keyFile)) throw new Error('Existing upload keystore is missing.');
  return { config, keystore, keyFile };
}

async function prepare(root) {
  const inputs = releaseInputs(root);
  const android = path.join(root, 'android');
  if (!fs.existsSync(android)) return { changedFiles: 0, nativeProjectPresent: false };
  const projectFile = path.join(android, 'build.gradle');
  const appFile = path.join(android, 'app', 'build.gradle');
  const propertiesFile = path.join(android, 'gradle.properties');
  const beforeApp = fs.readFileSync(appFile, 'utf8');
  let app = AndroidConfig.Version.setVersionCode(inputs.config, beforeApp);
  app = AndroidConfig.Version.setVersionName(inputs.config, app);
  app = AndroidConfig.GoogleServices.applyPlugin(inputs.config, app);
  app = configureReleaseGradle(optimizeProguardFile(app));
  const properties = fs.readFileSync(propertiesFile, 'utf8');
  const minify = /^android\.enableMinifyInReleaseBuilds\s*=.*$/m;
  const edits = [
    [projectFile, AndroidConfig.GoogleServices.setClassPath(inputs.config, fs.readFileSync(projectFile, 'utf8'))],
    [appFile, app],
    [propertiesFile, minify.test(properties) ? properties.replace(minify, 'android.enableMinifyInReleaseBuilds=true')
      : `${properties.trimEnd()}\nandroid.enableMinifyInReleaseBuilds=true\n`],
  ];
  const manifestFile = path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(manifestFile);
  const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  if (main.$['android:screenOrientation'] !== 'unspecified' || main.$['android:resizeableActivity'] === 'false') {
    throw new Error('Native orientation/resizability differs from source configuration; synchronize native generation before release.');
  }
  let changedFiles = 0;
  for (const [file, after] of edits) {
    if (fs.readFileSync(file, 'utf8') !== after) { fs.writeFileSync(file, after); changedFiles++; }
  }
  const source = fs.readFileSync(inputs.config.android.googleServicesFile);
  const target = path.join(android, 'app', 'google-services.json');
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(source)) { fs.writeFileSync(target, source); changedFiles++; }
  return { changedFiles, nativeProjectPresent: true };
}

function check(root) {
  const { config, keystore, keyFile } = releaseInputs(root);
  const bin = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
  const javaTool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', bin) : bin;
  const result = spawnSync(javaTool, ['-exportcert', '-rfc', '-keystore', keyFile,
    '-storepass:env', 'BSTORE_RELEASE_STORE_PASSWORD', '-alias', keystore.keyAlias], {
    env: { ...process.env, BSTORE_RELEASE_STORE_PASSWORD: keystore.keystorePassword },
    encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  if (result.error?.code === 'EPERM') throw new Error('Signing check subprocess blocked by sandbox (EPERM).');
  if (result.error || result.status !== 0) throw new Error('Existing upload certificate could not be read. Check JDK, keystore password and alias; no credentials were changed.');
  let certificate;
  try { certificate = new crypto.X509Certificate(result.stdout); }
  catch { throw new Error('Upload certificate output was invalid.'); }
  if (/CN\s*=\s*Android Debug/i.test(certificate.subject)) throw new Error('Debug certificate cannot be used for a Play update.');
  if (Date.parse(certificate.validTo) <= Date.now()) throw new Error('Existing upload certificate has expired.');
  const expectedFingerprint = process.env.BSTORE_PLAY_UPLOAD_CERT_SHA256;
  if (expectedFingerprint) {
    const expected = expectedFingerprint.replace(/[:\s]/g, '').toLowerCase();
    const actual = certificate.fingerprint256.replace(/:/g, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actual) {
      throw new Error('Existing keystore does not match the supplied Google Play upload certificate SHA-256.');
    }
  }
  // A CSR is generated only in memory and discarded; this verifies the private-key password
  // without changing the keystore, creating a key, or signing an application.
  const privateKey = spawnSync(javaTool, ['-certreq', '-keystore', keyFile,
    '-storepass:env', 'BSTORE_RELEASE_STORE_PASSWORD', '-keypass:env', 'BSTORE_RELEASE_KEY_PASSWORD', '-alias', keystore.keyAlias], {
    env: { ...process.env, BSTORE_RELEASE_STORE_PASSWORD: keystore.keystorePassword,
      BSTORE_RELEASE_KEY_PASSWORD: keystore.keyPassword || keystore.keystorePassword },
    encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  if (privateKey.error?.code === 'EPERM') throw new Error('Signing check subprocess blocked by sandbox (EPERM).');
  if (privateKey.error || privateKey.status !== 0) throw new Error('Existing private signing key could not be read. Check its password and alias; no credentials were changed.');
  if (fs.existsSync(path.join(root, 'android'))) {
    const native = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
    if (configureReleaseGradle(optimizeProguardFile(native)) !== native
        || !native.includes(`versionCode ${config.android.versionCode}`)) {
      throw new Error('Local native release configuration needs npm run release:prepare.');
    }
  }
  return { package: config.android.package, versionCode: config.android.versionCode,
    certificateReadable: true, privateKeyReadable: true, debugCertificate: false, certificateExpired: false,
    playUploadCertificateMatched: expectedFingerprint ? true : null };
}

module.exports = { releaseInputs, prepare, check };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const mode = process.argv[2];
  Promise.resolve().then(() => {
    if (mode === 'prepare') return prepare(root);
    if (mode === 'check') return check(root);
    throw new Error('Use prepare or check. No build or upload is performed by this script.');
  }).then(result => console.log('BStore release preflight:', JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
