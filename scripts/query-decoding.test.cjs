const test = require('node:test');
const assert = require('node:assert/strict');
const query = require('query-string');
test('patched query parser preserves Unicode, encoded plus and repeated values', () => {
  const value = query.parse('name=%D8%A8%D8%B3%D8%AA%D9%88%D8%B1&phone=%2B96170000000&tag=a&tag=b');
  assert.equal(value.name, 'بستور');
  assert.equal(value.phone, '+96170000000');
  assert.deepEqual(value.tag, ['a', 'b']);
});
test('malformed deep-link escapes cannot crash query parsing', () => {
  for (const input of ['value=%E0%A4%A', 'value=%FE%FF', 'value=%', 'value=' + '%FF'.repeat(10000)]) {
    assert.equal(typeof query.parse(input).value, 'string');
  }
});
test('query decoder resolves the patched release through the real installed parser', () => {
  const path = require('node:path'), fs = require('node:fs');
  const decoder = require.resolve('decode-uri-component', { paths: [path.dirname(require.resolve('query-string'))] });
  assert.equal(JSON.parse(fs.readFileSync(path.join(path.dirname(decoder), 'package.json'), 'utf8')).version, '0.5.0');
});
