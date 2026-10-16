const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = file => fs.readFileSync('src/' + file, 'utf8');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function fixture() {
  let time = 1000, token = 'A', focus, cleanup, cursor = 0;
  const session = { authenticated: true, revision: 0 }, slots = [], effects = [], calls = [], sessionListeners = new Set(), pricingListeners = new Set();
  const clock = class extends Date { static now() { return time; } };
  let products = [{ _id: 'p', name: 'Shampoo', price: 10, discountedPrice: 8, discount: 20, image: 'p.jpg', imageFrame: { zoom: 1 }, category: 'shampoo', availability: true }];
  let fail = false;
  const tokens = { getSessionSnapshot: () => session, subscribeSession: () => () => {},
    onSessionChanged: fn => { sessionListeners.add(fn); return () => sessionListeners.delete(fn); },
    onPricingChanged: fn => { pricingListeners.add(fn); return () => pricingListeners.delete(fn); } };
  const load = (file, deps = {}) => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
      { exports, Date: clock, setInterval: () => 1, clearInterval() {}, require: name => { if (!(name in deps)) throw Error('Unmocked ' + name); return deps[name]; } });
    return exports;
  };
  const request = async url => { calls.push(url); if (fail) throw Error('offline'); return { ok: true, json: async () => url.includes('/products') ? { products } : { categories: url.includes('/other/') ? [{ _id: 'other', name: 'Other department' }] : [{ _id: 'shampoo', name: 'Shampoo' }, { _id: 'hair', name: 'Hair Care' }] } }; };
  const resources = load('services/resource-cache.ts');
  const auth = { API_URL: 'https://test', getValidAccessToken: async () => token };
  const catalog = load('services/catalogService.ts', { './resource-cache': resources, './authService': auth, './tokenStorage': tokens, './request': { request },
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} } });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo: fn => fn(), useCallback: fn => fn, useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; effects.push(slots[i]); } },
  };
  const hook = load('hooks/use-catalog-screen.ts', { react, 'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'expo-router': { useFocusEffect: fn => { focus = fn; } }, '../services/authService': auth, '../services/tokenStorage': tokens,
    '../services/catalogService': catalog, '../services/request': { request }, '../services/resource-cache': resources,
    '../services/product-price': load('services/product-price.ts') });
  return { catalog, resources, calls, render: (id = 'care') => { cursor = 0; return hook.useCatalogScreen(id); },
    focus: () => { cleanup = focus(); }, blur: () => { cleanup?.(); },
    advance: ms => { time += ms; }, fail: value => { fail = value; }, products: value => { products = value; },
    switchAccount: value => { token = value; session.revision++; sessionListeners.forEach(fn => fn()); },
    pricingChanged: () => pricingListeners.forEach(fn => fn()), flush,
    dispose: () => { cleanup?.(); effects.forEach(effect => effect.cleanup?.()); } };
}
module.exports = { fixture, flush };
