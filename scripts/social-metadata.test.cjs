// Link previews (Open Graph / Twitter) for Home and the Buy & Get Free short link.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { load } = require('./shopping-fixture.cjs');
const meta = load('services/social-metadata.ts');
const root = path.resolve(__dirname, '..');
const png = file => { const b = fs.readFileSync(path.join(root, file)); assert.equal(b.toString('latin1', 1, 4), 'PNG', file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('Home metadata', () => {
  const home = meta.socialMetadataFor('/');
  assert.equal(home.title, 'BStore | Shop Online in Lebanon');
  assert.equal(home.description, 'Shop snacks, groceries, cleaning products and personal care essentials with BStore. Retail and Wholesale ordering available.');
  assert.equal(meta.absoluteUrl(home.path), 'https://bstore-web.onrender.com/');
  assert.equal(meta.absoluteUrl(home.image), 'https://bstore-web.onrender.com/og/bstore-home-social.png');
});

test('Buy & Get Free metadata: query strings and trailing slashes keep the clean canonical URL', () => {
  for (const pathname of ['/buy-get-free', '/buy-get-free/', '/buy-get-free?v=1', '/buy-get-free?v=2&utm_source=whatsapp']) {
    const offers = meta.socialMetadataFor(pathname);
    assert.equal(offers.title, 'BStore – Buy & Get Free 🎁', pathname);
    assert.equal(offers.description, 'Buy your products and get a free gift with every offer');
    assert.equal(meta.absoluteUrl(offers.path), 'https://bstore-web.onrender.com/buy-get-free');
    assert.equal(meta.absoluteUrl(offers.image), 'https://bstore-web.onrender.com/og/buy-get-free-social.png');
  }
});

test('other pages are unchanged: no Home or Buy & Get Free preview applied globally', () => {
  for (const pathname of ['/offers', '/department-categories', '/search', '/cart', '/product-details', '/unknown']) assert.equal(meta.socialMetadataFor(pathname), null, pathname);
});

test('preview images are 1200x630 and the official sources stay unchanged', () => {
  assert.deepEqual(png('public/og/bstore-home-social.png'), [1200, 630]);
  assert.deepEqual(png('public/og/buy-get-free-social.png'), [1200, 630]);
  assert.deepEqual(png('public/og/buy-get-free.png'), [1254, 1254], 'user-supplied artwork kept as delivered');
  assert.deepEqual(png('assets/images/startup-logo.png'), [748, 723], 'official logo untouched');
});

test('short link reuses the existing department screen and is a public route', () => {
  const route = fs.readFileSync(path.join(root, 'src/app/buy-get-free.tsx'), 'utf8');
  assert.match(route, /<DepartmentCategoriesScreen[\s\S]*departmentId=\{BUY_GET_FREE_DEPARTMENT\.id\}/);
  assert.equal(meta.BUY_GET_FREE_DEPARTMENT.id, '6afa01170b8dc1a73f68a832');
  assert.equal(meta.BUY_GET_FREE_DEPARTMENT.name, 'Buy & Get Free');
  assert.match(fs.readFileSync(path.join(root, 'src/services/sessionRoutes.ts'), 'utf8'), /'buy-get-free'/);
  const layout = fs.readFileSync(path.join(root, 'src/app/_layout.tsx'), 'utf8');
  // Rendered outside the startup-screen/Stack branch so static export writes it into the page HTML.
  const head = layout.indexOf('<SocialHead pathname={pathname} />');
  assert.ok(head > layout.lastIndexOf('</Stack>}') && head < layout.indexOf('</SafeAreaView>'));
});
