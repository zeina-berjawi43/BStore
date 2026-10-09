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
  const api = load('services/homeSectionsService.ts', name => name.includes('async-storage') ? storage : { request: () => { const call = deferred(); calls.push(call); return call.promise; } });
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
for (const section of ['slides', 'departments']) {
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
test('out-of-order responses cannot overwrite newer data in memory or disk', async () => {
  const api = service(); const older = api.refreshHomeSection('slides'); const newer = api.refreshHomeSection('slides');
  api.calls[1].resolve(response('slides', [item('new')])); await newer;
  api.calls[0].resolve(response('slides', [item('old')])); await older; await flush();
  assert.equal((await service(api.disk).readHomeSection('slides'))[0].id, 'new');
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
for (const cached of [null, [{ id: 'cached' }]]) {
  test(`hook: ${cached ? 'cached slow refresh' : 'first-launch placeholder'} and friendly failure`, async () => {
    const env = hooks(); const read = deferred(); const refresh = deferred();
    const { useHomeSection } = load('hooks/use-home-section.ts', name => name === 'react' ? env.react : { readHomeSection: () => read.promise, refreshHomeSection: () => refresh.promise });
    const render = () => env.render(() => useHomeSection('slides'));
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
