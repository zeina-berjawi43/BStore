const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { fixture, product, deferred, flush, createShoppingState } = require('./shopping-fixture.cjs');
function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/'+file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports, require:name=>{assert.ok(name in dependencies,name);return dependencies[name];}});
  return exports;
}
test('rapid inline increments are absolute intents, coalesced without lost taps or client prices', async()=>{
  const gate=deferred(), {state,calls}=fixture({send:()=>gate.promise}); await state.refresh();
  const jobs=[state.adjust(product('A'),1),state.adjust(product('A'),1),state.adjust(product('A'),1)];
  assert.equal(state.getSnapshot().cartCount,3); await flush();
  assert.equal(calls.filter(c=>c.method).length,1); assert.equal(calls.at(-1).body.quantity,3);
  assert.equal(calls.at(-1).body.price,undefined);gate.resolve({});await Promise.all(jobs);
  await state.refresh(true);assert.equal(state.getSnapshot().cartCount,3);
});
test('inline remove and re-add behind an in-flight write preserve latest intent',async()=>{
  const gate=deferred();let writes=0;const {state,calls}=fixture({cart:[{product:product('A'),quantity:1}],send:()=>++writes===1?gate.promise:{}});await state.refresh();
  const first=state.adjust(product('A'),1);await flush();
  const more=[state.adjust(product('A'),-1),state.adjust(product('A'),-1),state.adjust(product('A'),1)];
  assert.equal(state.getSnapshot().cartCount,1);gate.resolve({});await Promise.all([first,...more]);
  assert.equal(state.getSnapshot().cartCount,1);assert.equal(calls.at(-1).body.quantity,1);
  await state.adjust(product('A'),-1);assert.equal(state.getSnapshot().cartCount,0);assert.equal(calls.at(-1).url,'/cart/remove');
  await state.adjust(product('A'),1);assert.equal(calls.at(-1).url,'/cart/add');assert.equal(state.getSnapshot().cartCount,1);
});
test('inline failure rolls back, availability forbids increases, account changes reject stale writes',async()=>{
  const gate=deferred(), {state}=fixture({cart:[{product:product('A'),quantity:2}],send:()=>gate.promise});await state.refresh();
  await state.adjust({...product('A'),availability:false},1);assert.equal(state.getSnapshot().cartCount,2);
  const change=state.adjust(product('A'),-1), failed=assert.rejects(change,/offline/);await flush();gate.reject(Error('offline'));await failed;await flush();assert.equal(state.getSnapshot().cartCount,2);
  const other=deferred(), next=fixture({send:()=>other.promise});await next.state.refresh();
  const old=next.state.adjust(product('B'),1), rejected=assert.rejects(old,/session changed/);await flush();next.state.reset();other.resolve({});await rejected;await flush();assert.equal(next.state.getSnapshot().cartCount,0);
});
test('protected login intents are one-use, allowlisted and never accept external URLs',()=>{
  let authenticated=false;const pushes=[];
  const api=load('services/login-intent.ts',{'expo-router':{router:{push:value=>pushes.push(value)}},'./tokenStorage':{getSessionSnapshot:()=>({authenticated})},'./sessionRoutes':{privateRoutes:['cart','account','checkout']}});
  api.openProtected('/cart');assert.equal(pushes[0].pathname,'/login');assert.equal(pushes[0].params.returnTo,'/cart');assert.equal(api.takeLoginDestination(),'/cart');assert.equal(api.takeLoginDestination(),null);
  for(const path of ['https://evil.test','//evil.test','/login','/cart?redirect=https://evil.test']){api.rememberLoginDestination(path);assert.equal(api.takeLoginDestination(),null);}
  authenticated=true;api.openProtected('/account');assert.equal(pushes.at(-1),'/account');
});

test('an ambiguous committed add is read back before a newer inline quantity, never blindly added again',async()=>{
  let server=[],writes=[];const gate=deferred();
  const state=createShoppingState({authenticated:()=>true,send:async(path,method,body)=>{
    if(!method)return path==='/favorites'?{favorites:[]}:{cart:{items:server}};
    writes.push(path);if(path==='/cart/add'){await gate.promise;server=[{product:product('A'),quantity:1}];throw Error('timed out after commit');}
    server=server.map(row=>({...row,quantity:body.quantity}));return {cart:{items:server}};
  }});await state.refresh();
  const first=state.add(product('A')),failed=assert.rejects(first,/timed out/);await flush();
  const next=state.adjust(product('A'),1);gate.resolve();await Promise.all([failed,next]);await flush();
  assert.deepEqual(writes,['/cart/add','/cart/update']);assert.equal(server[0].quantity,2);assert.equal(state.getSnapshot().cartCount,2);
});
test('web pull refresh requires a downward top-edge gesture, ignores horizontal/cancel and cleans listeners',async()=>{
  const listeners={}, effects=[], node={scrollTop:0,addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:name=>delete listeners[name]};let refreshes=0,distance=0;
  const react={useRef:value=>({current:value}),useState:()=>[0,value=>{distance=value;}],useEffect:fn=>effects.push(fn)};
  const {useWebPullRefresh}=load('hooks/use-web-pull-refresh.ts',{react,'react-native':{Platform:{OS:'web'}}});
  useWebPullRefresh({current:{getScrollableNode:()=>node}},true,async()=>{refreshes++;});const cleanups=effects.map(fn=>fn());
  const event=(x,y)=>({touches:[{clientX:x,clientY:y}],preventDefault:()=>{}});
  listeners.touchstart(event(0,0));listeners.touchmove(event(0,80));assert.equal(distance,80);listeners.touchend();assert.equal(refreshes,1);assert.equal(distance,0);
  node.scrollTop=10;listeners.touchstart(event(0,0));listeners.touchmove(event(0,90));listeners.touchend();assert.equal(refreshes,1);
  node.scrollTop=0;listeners.touchstart(event(0,0));listeners.touchmove(event(100,20));listeners.touchend();assert.equal(refreshes,1);
  listeners.touchstart(event(0,0));listeners.touchmove(event(0,90));listeners.touchcancel();listeners.touchend();assert.equal(refreshes,1);
  cleanups.forEach(fn=>fn?.());assert.equal(Object.keys(listeners).length,0);
});

test('decrement to zero behind a failed unsaved add settles without deleting a nonexistent server item',async()=>{
  const gate=deferred(), {state,calls}=fixture({send:()=>gate.promise});await state.refresh();
  const add=state.add(product('A')),failed=assert.rejects(add,/offline/);await flush();
  const zero=state.adjust(product('A'),-1);gate.reject(Error('offline'));await Promise.all([failed,zero]);await flush();
  assert.equal(state.getSnapshot().cartCount,0);assert.equal(calls.filter(call=>call.method).length,1);
});
