const assert = require('node:assert/strict');
const test = require('node:test');
const { useOptimizedProguardFile } = require('../plugins/with-optimized-proguard.cjs');

test('R8 plugin changes only the default rules file and preserves release wiring', () => {
  const input = `release {
    minifyEnabled enableMinifyInReleaseBuilds
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    signingConfig signingConfigs.debug
  }`;
  assert.equal(useOptimizedProguardFile(input), input.replace('"proguard-android.txt"', '"proguard-android-optimize.txt"'));
});

test('R8 plugin remains stable when Prebuild applies it again', () => {
  const input = "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'";
  const once = useOptimizedProguardFile(input);
  assert.equal(useOptimizedProguardFile(once), once);
  assert.ok(once.includes("'proguard-rules.pro'"));
});

test('R8 plugin refuses an unsupported or ambiguous template', () => {
  for (const input of ['', 'proguardFiles "custom.pro"', 'getDefaultProguardFile("proguard-android.txt")\ngetDefaultProguardFile("proguard-android.txt")']) {
    assert.throws(() => useOptimizedProguardFile(input), /expected one default ProGuard rules file/);
  }
});

test('R8 plugin refuses unsupported build-script languages', async () => {
  const plugin = require('../plugins/with-optimized-proguard.cjs');
  const config = plugin({});
  await assert.rejects(() => config.mods.android.appBuildGradle({ modResults: { language: 'kotlin', contents: '' } }), /expected the Expo Groovy Android template/);
});
