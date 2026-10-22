const { withAppBuildGradle } = require('expo/config-plugins');

const PACKAGE = 'com.zeina43.mystore';
const LAST_PLAY_VERSION = 11;
const begin = '// @bstore-release-begin';
const end = '// @bstore-release-end';
const releaseConfiguration = `${begin}
// Read existing credentials at build time. EAS restores this file before running Gradle.
def bstoreProject = rootProject.projectDir.parentFile
def bstoreConfig = new groovy.json.JsonSlurper().parse(new File(bstoreProject, "app.json")).expo
if (bstoreConfig.android?.package != "${PACKAGE}" || android.defaultConfig.applicationId != "${PACKAGE}") {
    throw new GradleException("BStore update package must remain ${PACKAGE}.")
}
if (!(bstoreConfig.android?.versionCode instanceof Number) || bstoreConfig.android.versionCode <= ${LAST_PLAY_VERSION}
    || bstoreConfig.android.versionCode > 2100000000 || bstoreConfig.android.versionCode.intValue() != bstoreConfig.android.versionCode) {
    throw new GradleException("BStore release versionCode must be greater than ${LAST_PLAY_VERSION}.")
}
android.defaultConfig.versionCode = bstoreConfig.android.versionCode.intValue()
android.defaultConfig.versionName = bstoreConfig.version

def bstoreCredentialsFile = new File(bstoreProject, "credentials.json")
if (!bstoreCredentialsFile.exists()) {
    throw new GradleException("Missing existing credentials.json; release signing cannot fall back to debug.")
}
def bstoreCredentials
try {
    bstoreCredentials = new groovy.json.JsonSlurper().parse(bstoreCredentialsFile).android?.keystore
} catch (Exception ignored) {
    throw new GradleException("Cannot read existing Android signing credentials.")
}
if (!bstoreCredentials?.keystorePath || !bstoreCredentials?.keystorePassword || !bstoreCredentials?.keyAlias) {
    throw new GradleException("Existing Android signing credentials are incomplete.")
}
def bstoreKeyFile = new File(bstoreCredentials.keystorePath.toString())
if (!bstoreKeyFile.isAbsolute()) bstoreKeyFile = new File(bstoreProject, bstoreCredentials.keystorePath.toString())
if (!bstoreKeyFile.isFile()) {
    throw new GradleException("Existing Android upload keystore was not found.")
}
def bstoreSigning = android.signingConfigs.maybeCreate("bstoreRelease")
bstoreSigning.storeFile = bstoreKeyFile
bstoreSigning.storePassword = bstoreCredentials.keystorePassword
bstoreSigning.keyAlias = bstoreCredentials.keyAlias
bstoreSigning.keyPassword = bstoreCredentials.keyPassword ?: bstoreCredentials.keystorePassword
android.buildTypes.release.signingConfig = bstoreSigning
android.buildTypes.release.minifyEnabled = true
${end}`;

function assertReleaseIdentity(config) {
  if (config.android?.package !== PACKAGE) throw new Error(`BStore update package must remain ${PACKAGE}.`);
  if (!Number.isInteger(config.android?.versionCode) || config.android.versionCode <= LAST_PLAY_VERSION
      || config.android.versionCode > 2100000000) {
    throw new Error(`BStore versionCode must be an integer greater than ${LAST_PLAY_VERSION}.`);
  }
}

function configureReleaseGradle(contents) {
  const blocks = contents.match(/\/\/ @bstore-release-begin[\s\S]*?\/\/ @bstore-release-end/g) || [];
  const starts = contents.split(begin).length - 1;
  const ends = contents.split(end).length - 1;
  if (starts !== ends || starts > 1 || blocks.length !== starts) {
    throw new Error('BStore release configuration has incomplete or duplicate markers.');
  }
  const base = blocks.length ? contents.replace(blocks[0], '') : contents;
  return `${base.trimEnd()}\n\n${releaseConfiguration}\n`;
}

module.exports = config => {
  assertReleaseIdentity(config);
  return withAppBuildGradle(config, result => {
    if (result.modResults.language !== 'groovy') throw new Error('BStore release requires the Expo Groovy Android template.');
    result.modResults.contents = configureReleaseGradle(result.modResults.contents);
    return result;
  });
};
module.exports.configureReleaseGradle = configureReleaseGradle;
module.exports.assertReleaseIdentity = assertReleaseIdentity;
