const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = file => fs.readFileSync(require('node:path').join(__dirname, '../src', file), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function load(file, requireMock) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: requireMock, URL, Date });
  return exports;
}
function service(disk = new Map(), options = {}) {
  const calls = [];
  const storage = { getItem: options.getItem || (async key => disk.get(key) || null), setItem: options.setItem || (async (key, value) => disk.set(key, value)) };
  const api = load('services/homeSectionsService.ts', name => name.includes('async-storage') ? storage :
    name === './image-frame' ? load('services/image-frame.ts', () => ({})) :
      { request: () => { const call = deferred(); calls.push(call); return call.promise; } });
  return { ...api, calls, disk };
}
const response = (section, items) => ({ ok: true, json: async () => ({ [section]: items }) });
const item = (id, extras = {}) => ({ _id: id, name: id, image: `${id}.jpg`, ...extras });
function hooks() {
  const slots = []; let cursor = 0; const effects = [];
  const changed = (old, deps) => !old || deps.some((value, i) => value !== old[i]);
  const react = {
    useRef: initial => slots[cursor++] ??= { current: initial },
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useCallback: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect: (fn, deps) => { const i = cursor++; if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  react.useLayoutEffect = react.useEffect;
  return { react, render: fn => { cursor = 0; const result = fn(); effects.splice(0).forEach(fn => fn()); return result; }, unmount: () => slots.forEach(slot => slot?.cleanup?.()) };
}
for (const section of ['slides', 'departments', 'brands']) {
  test(`${section}: cold-start persistence, failed/malformed refresh preservation, Admin updates and removals`, async () => {
    const api = service();
    assert.equal(await api.readHomeSection(section), null);
    let pending = api.refreshHomeSection(section);
    api.calls[0].resolve(response(section, [item('A'), item('disabled', { active: false })]));
    const first = await pending; await flush();
    assert.equal(first.length, 1);
    const cold = service(api.disk);
    assert.equal((await cold.readHomeSection(section))[0].imageKey, first[0].imageKey);
    for (const bad of [{ ok: false }, response(section, {}), response(section, [null])]) {
      pending = cold.refreshHomeSection(section); cold.calls.at(-1).resolve(bad);
      await assert.rejects(pending);
      assert.equal((await cold.readHomeSection(section))[0].id, 'A');
    }
    pending = cold.refreshHomeSection(section); cold.calls.at(-1).reject(new Error('Failed to fetch private technical detail'));
    await assert.rejects(pending);
    pending = cold.refreshHomeSection(section); cold.calls.at(-1).resolve(response(section, [item('A', { updatedAt: 'new-revision' })]));
    assert.notEqual((await pending)[0].imageKey, first[0].imageKey);
    pending = cold.refreshHomeSection(section); cold.calls.at(-1).resolve(response(section, [item('B', { image: 'changed.jpg' })]));
    assert.equal((await pending)[0].id, 'B');
    pending = cold.refreshHomeSection(section); cold.calls.at(-1).resolve(response(section, []));
    assert.equal((await pending).length, 0); await flush();
    assert.equal((await service(api.disk).readHomeSection(section)).length, 0);
  });
}
test('slow refresh permits disk hydration; late disk reads cannot replace newer successful data', async () => {
  const diskRead = deferred(); const api = service(new Map(), { getItem: () => diskRead.promise });
  const read = api.readHomeSection('slides'); const refresh = api.refreshHomeSection('slides');
  diskRead.resolve(JSON.stringify({ version: 1, items: [{ id: 'cached', name: '', image: 'cached', order: 1, active: true }] }));
  assert.equal((await read)[0].id, 'cached');
  api.calls[0].resolve(response('slides', [item('fresh')])); await refresh;
  assert.equal((await api.readHomeSection('slides'))[0].id, 'fresh');
  const late = deferred(); const other = service(new Map(), { getItem: () => late.promise });
  const reading = other.readHomeSection('slides'); const fetching = other.refreshHomeSection('slides');
  other.calls[0].resolve(response('slides', [item('fresh')])); await fetching;
  late.resolve(JSON.stringify({ version: 1, items: [{ id: 'old', name: '', image: 'old', order: 1, active: true }] }));
  assert.equal((await reading)[0].id, 'fresh');
});
test('concurrent refreshes share one request and preserve the resulting memory and disk snapshot', async () => {
  const api = service(); const first = api.refreshHomeSection('slides'); const second = api.refreshHomeSection('slides');
  assert.equal(api.calls.length, 1);
  api.calls[0].resolve(response('slides', [item('fresh')])); await second; await flush();
  assert.equal((await service(api.disk).readHomeSection('slides'))[0].id, 'fresh');
});
test('fresh snapshots prevent repeat focus requests, while a forced refresh still revalidates', async () => {
  const api = service();
  const first = api.refreshHomeSection('slides', false); api.calls[0].resolve(response('slides', [item('A')]));
  await first;
  assert.equal((await api.refreshHomeSection('slides', false)).length, 1);
  assert.equal(api.calls.length, 1);
  const forced = api.refreshHomeSection('slides', true); assert.equal(api.calls.length, 2);
  api.calls[1].resolve(response('slides', [item('B')]));
  assert.equal((await forced)[0].id, 'B');
});
test('an expired focus cache revalidates, and a transient failure releases the request for recovery', async () => {
  const originalNow = Date.now; let now = 1_000;
  Date.now = () => now;
  try {
    const api = service();
    const initial = api.refreshHomeSection('slides', false); api.calls[0].resolve(response('slides', [item('cached')]));
    await initial;
    now += 60_001;
    const failed = api.refreshHomeSection('slides', false); assert.equal(api.calls.length, 2);
    api.calls[1].reject(new Error('temporary network failure'));
    await assert.rejects(failed, /temporary network failure/);
    assert.equal((await api.readHomeSection('slides'))[0].id, 'cached');
    const recovered = api.refreshHomeSection('slides', false); assert.equal(api.calls.length, 3);
    api.calls[2].resolve(response('slides', [item('recovered')]));
    assert.equal((await recovered)[0].id, 'recovered');
  } finally { Date.now = originalNow; }
});
test('invalid cache and unavailable device storage degrade to usable network data', async () => {
  const api = service(new Map(), { getItem: async () => '{invalid', setItem: async () => { throw new Error('Disk full'); } });
  assert.equal(await api.readHomeSection('slides'), null);
  const pending = api.refreshHomeSection('slides'); api.calls[0].resolve(response('slides', [item('A')]));
  assert.equal((await pending)[0].id, 'A'); await flush();
});
test('signed external image URLs stay intact while their cache revision changes', async () => {
  const api = service(); const url = 'https://cdn.example/image?signature=secret';
  const keys = [];
  for (const revision of ['one', 'two']) {
    const pending = api.refreshHomeSection('slides'); api.calls.at(-1).resolve(response('slides', [item('A', { image: url, updatedAt: revision })]));
    const [result] = await pending; assert.equal(result.image, url); keys.push(result.imageKey);
  }
  assert.notEqual(keys[0], keys[1]);
});
for (const section of ['slides', 'brands']) for (const cached of [null, [{ id: 'cached' }]]) {
  test(`hook ${section}: ${cached ? 'cached slow refresh' : 'first-launch placeholder'} and friendly failure`, async () => {
    const env = hooks(); const read = deferred(); const refresh = deferred();
    const { useHomeSection } = load('hooks/use-home-section.ts', name => name === 'react' ? env.react : { peekHomeSection: () => null, readHomeSection: () => read.promise, refreshHomeSection: () => refresh.promise });
    const render = () => env.render(() => useHomeSection(section));
    let state = render(); assert.equal(state.loading, true);
    const pending = state.refresh(); read.resolve(cached); await flush(); state = render();
    assert.equal(state.hydrated, true); assert.equal(state.loading, cached === null);
    assert.equal(state.items.length, cached ? 1 : 0);
    refresh.reject(new Error('raw internal fetching error')); await pending; state = render();
    assert.equal(state.items.length, cached ? 1 : 0); assert.equal(state.loading, false);
    assert.equal(state.error, 'Unable to load this section. Please try again.');
  });
}
test('image replacement keeps displayed content, ignores obsolete display callbacks and handles broken URLs', () => {
  const env = hooks(); const jsx = (type, props, key) => ({ type, props, key });
  const { HomeImage } = load('components/home-image.tsx', name => name === 'react' ? env.react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'expo-image' ? { Image: 'Image' } : name === 'react-native' ? { View: 'View', StyleSheet: { create: value => value, absoluteFill: {} } } : { Ionicons: 'Icon' });
  const render = uri => env.render(() => HomeImage({ uri, style: {} }));
  const images = tree => tree.props.children[1];
  let tree = render('old'); assert.ok(tree.props.children[0]);
  const old = images(tree)[0]; old.props.onDisplay(); tree = render('new');
  assert.equal(images(tree).length, 2); assert.equal(images(tree)[0].key, old.key);
  const next = images(tree)[1]; next.props.onDisplay(); old.props.onDisplay(); tree = render('new');
  assert.equal(images(tree).length, 1); assert.equal(images(tree)[0].props.source.uri, 'new');
  tree = render('broken'); images(tree)[1].props.onError(); tree = render('broken');
  assert.equal(images(tree).length, 1); assert.equal(images(tree)[0].props.source.uri, 'new');
});

test('desktop slideshow can contain the image without remounting its cached source or changing default fit', () => {
  const env = hooks(); const jsx = (type, props, key) => ({ type, props, key });
  const { HomeImage } = load('components/home-image.tsx', name => name === 'react' ? env.react :
    name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'expo-image' ? { Image: 'Image' } :
    name === 'react-native' ? { View: 'View', StyleSheet: { create: value => value, absoluteFill: {} } } : { Ionicons: 'Icon' });
  const render = contentFit => env.render(() => HomeImage({ uri: 'slide', cacheKey: 'cached-slide', style: {}, contentFit }));
  let tree = render(); const original = tree.props.children[1][0];
  assert.equal(original.props.contentFit, 'cover'); original.props.onDisplay();
  tree = render('contain');
  assert.equal(tree.props.children[1].length, 1);
  assert.equal(tree.props.children[1][0].key, original.key);
  assert.equal(tree.props.children[1][0].props.source.cacheKey, 'cached-slide');
  assert.equal(tree.props.children[1][0].props.contentFit, 'contain');
  assert.equal(render().props.children[1][0].props.contentFit, 'cover');
});

test('hook successful refresh wins over late hydration and older refresh; unmount ignores completion', async () => {
  const env = hooks(); const disk = deferred(); const calls = [];
  const { useHomeSection } = load('hooks/use-home-section.ts', name => name === 'react' ? env.react : { readHomeSection: () => disk.promise, refreshHomeSection: () => { const pending = deferred(); calls.push(pending); return pending.promise; } });
  const render = () => env.render(() => useHomeSection('departments'));
  let state = render(); const old = state.refresh(); const fresh = state.refresh();
  calls[1].resolve([{ id: 'fresh' }]); await fresh;
  disk.resolve([{ id: 'cached' }]); calls[0].resolve([{ id: 'old' }]); await old; await flush();
  state = render(); assert.equal(state.items[0].id, 'fresh'); assert.equal(state.error, '');
  const last = state.refresh(); env.unmount(); calls[2].resolve([{ id: 'unmounted' }]); await last;
  assert.equal(render().items[0].id, 'fresh');
});

test('unchanged image URLs receive bounded renewal keys without invalidating every refresh', async () => {
  const api = service(); const original = Date.now; let now = 0; Date.now = () => now;
  try {
    const keys = [];
    for (now of [0, 1000, 6 * 60 * 60 * 1000]) {
      const pending = api.refreshHomeSection('slides'); api.calls.at(-1).resolve(response('slides', [item('A', { updatedAt: 'constant' })]));
      keys.push((await pending)[0].imageKey);
    }
    assert.equal(keys[0], keys[1]); assert.notEqual(keys[1], keys[2]);
  } finally { Date.now = original; }
});

test('Brands: memory cache paints synchronously and a successful empty refresh removes cached content', async () => {
  const api = service();
  const initial = api.refreshHomeSection('brands'); api.calls[0].resolve(response('brands', [item('A')]));
  await initial;
  const env = hooks();
  const { useHomeSection } = load('hooks/use-home-section.ts', name => name === 'react' ? env.react : api);
  const render = () => env.render(() => useHomeSection('brands'));
  let state = render();
  assert.equal(state.items[0].id, 'A'); assert.equal(state.loading, false);
  const slow = state.refresh(true); state = render();
  assert.equal(state.items[0].id, 'A'); assert.equal(state.loading, false);
  api.calls[1].resolve(response('brands', [])); await slow; await flush();
  state = render(); assert.equal(state.items.length, 0); assert.equal(state.error, '');
  assert.equal((await service(api.disk).readHomeSection('brands')).length, 0, 'empty success replaces disk cache');
});

test('Brands: slow refresh allows disk hydration, but late disk data cannot resurrect removed Brands', async () => {
  const disk = new Map([['homeSections:v1:brands', JSON.stringify({ version: 1, items: [
    { id: 'cached', name: 'Cached', image: 'https://cdn.example/logo.png', imageKey: 'stable-image', active: true, order: 0 },
  ] })]]);
  const api = service(disk);
  const refresh = api.refreshHomeSection('brands', false);
  assert.equal((await api.readHomeSection('brands'))[0].imageKey, 'stable-image');
  api.calls[0].resolve(response('brands', [])); await refresh;
  const late = deferred(); const other = service(disk, { getItem: () => late.promise });
  const read = other.readHomeSection('brands'); const removal = other.refreshHomeSection('brands');
  other.calls[0].resolve(response('brands', [])); await removal;
  late.resolve(JSON.stringify({ version: 1, items: [
    { id: 'obsolete', name: 'Old', image: 'old.png', active: true, order: 0 },
  ] }));
  assert.equal((await read).length, 0);
});

test('Brands: failures retain cache, cooldown prevents repeated focus requests, explicit retry can recover', async () => {
  const originalNow = Date.now; let now = 1000; Date.now = () => now;
  try {
    for (const warm of [false, true]) {
      const api = service();
      if (warm) { const initial = api.refreshHomeSection('brands'); api.calls[0].resolve(response('brands', [item('A')])); await initial; }
      now += 60_001;
      const failed = api.refreshHomeSection('brands', false);
      api.calls.at(-1).reject(new Error('private Render/DNS error')); await assert.rejects(failed);
      assert.equal((await api.readHomeSection('brands'))?.length ?? 0, warm ? 1 : 0);
      const count = api.calls.length;
      for (let n = 0; n < 3; n++) await assert.rejects(api.refreshHomeSection('brands', false));
      assert.equal(api.calls.length, count, 'no automatic retry loop');
      const explicit = api.refreshHomeSection('brands', true);
      const focus = api.refreshHomeSection('brands', false);
      assert.equal(api.calls.length, count + 1, 'focus shares explicit retry');
      api.calls.at(-1).resolve(response('brands', [item('recovered')]));
      assert.equal((await explicit)[0].id, 'recovered'); assert.equal((await focus)[0].id, 'recovered');
      await api.refreshHomeSection('brands', false); assert.equal(api.calls.length, count + 1, 'fresh success is reused');
      now += 60_001;
      const later = api.refreshHomeSection('brands', false); api.calls.at(-1).resolve(response('brands', [])); await later;
      assert.equal(api.peekHomeSection('brands').length, 0);
    }
    const cold = service(); const failed = cold.refreshHomeSection('brands', false);
    cold.calls[0].reject(Error('offline')); await assert.rejects(failed);
    now += 60_001;
    const retry = cold.refreshHomeSection('brands', false);
    assert.equal(cold.calls.length, 2); cold.calls[1].resolve(response('brands', [])); await retry;
  } finally { Date.now = originalNow; }
});

test('Brands: focus joins a pending forced visibility refresh even while the old snapshot is fresh', async () => {
  const api = service(); const initial = api.refreshHomeSection('brands');
  api.calls[0].resolve(response('brands', [item('A')])); await initial;
  const forced = api.refreshHomeSection('brands', true); const focus = api.refreshHomeSection('brands', false);
  assert.equal(api.calls.length, 2);
  api.calls[1].resolve(response('brands', []));
  assert.equal((await forced).length, 0); assert.equal((await focus).length, 0);
});

test('Brands: API and disk caches keep only public metadata, framing and enabled visibility', async () => {
  const frame = { zoom: 2, x: 0.5, y: -0.5 };
  const api = service(); const refresh = api.refreshHomeSection('brands');
  api.calls[0].resolve(response('brands', [item('A', { imageFrame: frame, price: 50, products: [{ price: 20 }] }),
    item('disabled', { showOnHome: false })]));
  const items = await refresh; await flush();
  assert.equal(items.length, 1); assert.deepEqual({ ...items[0].imageFrame }, frame);
  assert.doesNotMatch(api.disk.get('homeSections:v1:brands'), /price|products/);
  const cached = JSON.parse(api.disk.get('homeSections:v1:brands'));
  cached.items[0].price = 99; cached.items[0].accountId = 'private';
  cached.items.push({ ...cached.items[0], id: 'hidden', showOnHome: false });
  cached.items.push({ ...cached.items[0], id: '' });
  api.disk.set('homeSections:v1:brands', JSON.stringify(cached));
  const restored = await service(api.disk).readHomeSection('brands');
  assert.equal(restored.length, 1); assert.equal(restored[0].imageKey, items[0].imageKey);
  assert.equal('price' in restored[0], false); assert.equal('accountId' in restored[0], false);
});

test('Brand images retain the displayed image and crop until replacement displays; broken images never loop', () => {
  const env = hooks(); const jsx = (type, props, key) => ({ type, props, key });
  const { HomeImage } = load('components/home-image.tsx', name => name === 'react' ? env.react :
    name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'expo-image' ? { Image: 'Image' } :
    name === 'react-native' ? { View: 'View', StyleSheet: { create: value => value, absoluteFill: {} } } :
    name === './product-image' ? { ProductImage: 'ProductImage' } :
    name === '../services/image-frame' ? load('services/image-frame.ts', () => ({})) : { Ionicons: 'Icon' });
  const frame = { zoom: 2, x: 0.5, y: -0.5 };
  const render = (uri, imageFrame) => env.render(() => HomeImage({ uri, style: {}, brand: { logoSize: 75, imageFrame } }));
  const images = tree => tree.props.children[1];
  let tree = render('old', frame); assert.ok(tree.props.children[0]);
  const old = images(tree)[0]; assert.equal(old.type, 'ProductImage'); old.props.onDisplay();
  tree = render('new'); assert.equal(images(tree).length, 2);
  assert.deepEqual(images(tree)[0].props.imageFrame, frame, 'displayed crop belongs to old image');
  const next = images(tree)[1]; assert.equal(next.props.contentFit, 'contain');
  assert.equal(next.props.cachePolicy, 'memory-disk'); assert.equal(next.props.source.cacheKey, 'new');
  next.props.onError(); tree = render('new'); assert.equal(images(tree).length, 1);
  next.props.onDisplay(); tree = render('new');
  assert.equal(images(tree)[0].props.source.uri, 'old', 'late display after an error cannot replace usable content');
  tree = render('broken'); images(tree).at(-1).props.onError(); tree = render('broken');
  assert.equal(images(tree).some(image => image.props.source.uri === 'broken'), false);
  const cold = hooks();
  // Separate component instance: an initial error replaces the skeleton with a neutral icon.
  const coldImage = load('components/home-image.tsx', name => name === 'react' ? cold.react :
    name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'expo-image' ? { Image: 'Image' } :
    name === 'react-native' ? { View: 'View', StyleSheet: { create: value => value, absoluteFill: {} } } :
    name === '../services/image-frame' ? load('services/image-frame.ts', () => ({})) : { Ionicons: 'Icon' });
  const coldRender = () => cold.render(() => coldImage.HomeImage({ uri: 'broken', style: {}, brand: { logoSize: 75 } }));
  tree = coldRender(); images(tree)[0].props.onError(); tree = coldRender();
  assert.equal(images(tree).length, 0); assert.equal(tree.props.children[0].props.children.props.name, 'image-outline');
});
