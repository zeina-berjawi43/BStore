const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = file => fs.readFileSync('src/' + file, 'utf8');
function execute(code, context) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, { exports, __DEV__: false, ...context });
  return exports;
}
function handler(name, context) {
  const ast = ts.createSourceFile('index.tsx', source('app/index.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let code; function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) code = node.initializer.getText(ast); ts.forEachChild(node, walk); } walk(ast);
  assert.ok(code); return execute('exports.fn=' + code, context).fn;
}

for (const result of [true, false, 'reject']) test(`Home refresh ${result}: deduplication, real progress, success-only slideshow reset`, async () => {
  let resolve, reject, calls = 0, refreshing = false, reset = 0, slide = 2, error = '';
  const gate = new Promise((yes, no) => { resolve = yes; reject = no; });
  const ref = { current: null };
  const refresh = handler('refreshHome', { refreshInFlight: ref, getSessionSnapshot: () => ({ revision: 1 }),
    loadHome: force => { assert.equal(force, true); calls++; return gate; },
    setRefreshing: value => { refreshing = value; }, setRefreshError: value => { error = value; },
    setCurrentSlide: value => { slide = value; }, setSlideResetKey: fn => { reset = fn(reset); } });
  const first = refresh(); assert.equal(refresh(), first); assert.equal(calls, 1); assert.equal(refreshing, true);
  if (result === 'reject') reject(Error('offline')); else resolve(result);
  await first; assert.equal(refreshing, false); assert.equal(ref.current, null);
  assert.equal(slide, result === true ? 0 : 2); assert.equal(reset, result === true ? 1 : 0);
  assert.equal(!!error, result !== true);
});

test('Home aggregate refresh reports partial failure and waits for every section without clearing cached content', async () => {
  let finish, completed = false;
  const slow = new Promise(resolve => { finish = resolve; });
  const ref = value => ({ current: value });
  const load = handler('loadHome', { homeGenerationRef: ref(0), homeLoadedRef: ref(true), accessTokenRef: ref('A'), sectionsRef: ref(null),
    loadSlideshow: async () => false, loadDepartments: () => slow, loadData: async () => ({ token: 'A', loggedIn: true }),
    peekPricedSection: () => [], setIsLoggedIn() {}, loadProducts: async () => true, loadOffers: async () => true, loadTopSelling: async () => true,
    loadCartCount: async () => { throw Error('cart offline'); }, loadFavorites: async () => {}, setInitialLoading() {} });
  const result = load(true).then(value => { completed = true; return value; });
  for(let i=0;i<10;i++) await Promise.resolve(); assert.equal(completed, false);
  finish(true); assert.equal(await result, false);
});

test('Offers pagination uses every real offer, clamps selection and handles zero and one', () => {
  const ast = ts.createSourceFile('index.tsx', source('app/index.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function walk(node) { if (ts.isJsxAttribute(node) && node.name.text === 'testID' && node.initializer?.text === 'offer-pagination') {
    let parent = node; while(parent && !ts.isConditionalExpression(parent)) parent = parent.parent;
    expression = parent.getText(ast);
  } ts.forEachChild(node, walk); } walk(ast); assert.ok(expression);
  const createElement = (type, props, ...children) => ({ type, props: { ...props, children } });
  for (const [count,active] of [[0,0],[1,0],[8,7],[3,7]]) {
    const tree = execute('exports.tree=(' + expression + ')', { React: { createElement }, View: 'View', styles: {},
      offerProducts: Array.from({ length: count }, (_, i) => ({ id: String(i) })), activeOfferIndex: active }).tree;
    if (!count) { assert.equal(tree, null); continue; }
    const dots = tree.props.children.flat(); assert.equal(dots.length, count);
    assert.equal(dots.filter(dot => dot.props.accessibilityState.selected).length, 1);
    assert.equal(dots[Math.min(active,count-1)].props.accessibilityState.selected, true);
    assert.equal(new Set(dots.map(dot => dot.props.key)).size, count);
  }
});

test('Android status icons are dark before/after startup without web/native padding changes or competing screen overrides', () => {
  assert.equal(JSON.parse(fs.readFileSync('app.json')).expo.androidStatusBar.barStyle, 'dark-content');
  const layout = source('app/_layout.tsx');
  assert.match(layout, /Platform.OS === 'android' && <StatusBar style="dark"/);
  assert.match(layout, /statusBarStyle: 'dark'/);
  for (const file of fs.readdirSync('src/app').filter(file => file.endsWith('.tsx') && file !== '_layout.tsx')) {
    assert.doesNotMatch(source('app/' + file), /<StatusBar|setBarStyle\(/);
  }
  assert.doesNotMatch(source('components/startup-screen.tsx'), /<StatusBar/);
});

test('Cart/Favorites share compact dimensions and accessible corner-X hit targets', () => {
  const { shoppingCardLayout: layout } = execute(source('components/shopping-card-layout.ts'), {});
  assert.equal(layout.image.width, 96); assert.equal(layout.image.height, 96);
  assert.ok(layout.remove.width >= 44 && layout.remove.height >= 44);
  assert.equal(layout.remove.position, 'absolute'); assert.equal(layout.remove.right, 0);
  for(const file of ['app/cart.tsx', 'app/favorites.tsx']) {
    const code = source(file); assert.match(code, /shoppingCardLayout.card/); assert.match(code, /shoppingCardLayout.image/);
    assert.match(code, /accessibilityLabel=\{`Remove \$\{product.name\} from (cart|favorites)`\}/);
    assert.match(code, /name="close"/);
  }
});
