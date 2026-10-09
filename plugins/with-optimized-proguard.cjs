const { withAppBuildGradle } = require('expo/config-plugins');

// Expo SDK 57 generates proguard-android.txt, which includes -dontoptimize.
// Change only the default rules file; retain the app and library keep rules.
function useOptimizedProguardFile(contents) {
  const defaultRules = /getDefaultProguardFile\((['"])proguard-android(?:-optimize)?\.txt\1\)/g;
  const matches = contents.match(defaultRules) || [];
  if (matches.length !== 1) {
    throw new Error('BStore R8 configuration: expected one default ProGuard rules file. Review the generated Android template.');
  }
  return contents.replace(defaultRules, 'getDefaultProguardFile("proguard-android-optimize.txt")');
}

function withOptimizedProguard(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error('BStore R8 configuration: expected the Expo Groovy Android template.');
    }
    modConfig.modResults.contents = useOptimizedProguardFile(modConfig.modResults.contents);
    return modConfig;
  });
}

module.exports = withOptimizedProguard;
module.exports.useOptimizedProguardFile = useOptimizedProguardFile;
