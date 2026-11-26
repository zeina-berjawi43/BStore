const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const parent = path.dirname(require.resolve('@expo/fingerprint/package.json'));
test('fingerprint uses the patched CommonJS matcher while keeping Expo SDK 57', () => {
  const file = require.resolve('minimatch/package.json', { paths: [parent] });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).version, '11.0.1');
  assert.match(require('expo/package.json').version, /^57\./);
});
test('Expo fingerprint ignore paths retain file, directory, Unicode and negation behavior', () => {
  const paths = require(path.join(parent, 'build/utils/Path.js'));
  const rules = ['**/node_modules/**', '**/.git/**', '!node_modules/allowed.js'];
  assert.equal(paths.isIgnoredPath('node_modules/example/index.js', rules), true);
  assert.equal(paths.isIgnoredPath('node_modules/allowed.js', rules), false);
  assert.equal(paths.isIgnoredPath('.git/config', rules), true);
  assert.equal(paths.isIgnoredPath('src/بستور.ts', rules), false);
  const dirs = paths.buildDirMatchObjects(paths.buildPathMatchObjects(['node_modules/**', '.git/**']));
  assert.equal(dirs.some(rule => rule.match('node_modules')), true);
  assert.equal(dirs.some(rule => rule.match('src')), false);
});

// Both existing consumers (xcode and ngrok) use the CommonJS named API.
test('development tunnel adapter resolves patched UUID and preserves its UUID v4 API without starting a tunnel', () => {
  const ngrokParent = path.dirname(require.resolve('@expo/ngrok/package.json'));
  const entry = require.resolve('uuid', { paths: [ngrokParent] });
  const manifest = require.resolve('uuid/package.json', { paths: [ngrokParent] });
  assert.equal(JSON.parse(fs.readFileSync(manifest, 'utf8')).version, '11.1.1');
  const source = fs.readFileSync(require.resolve('@expo/ngrok'), 'utf8');
  assert.match(source, /uuid\.v4\(\)/);
  assert.doesNotMatch(source, /uuid\.(v3|v5|v6)\s*\(/);
  assert.match(require(entry).v4(), /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(typeof require('@expo/ngrok').connect, 'function');
});
