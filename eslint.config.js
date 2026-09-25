// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**", ".release-check/**", "android/**", "ios/**", ".expo/**"],
  },
  {
    files: ["app.config.js", "scripts/**/*.cjs"],
    languageOptions: { globals: { __dirname: "readonly", Buffer: "readonly" } },
  }
]);
