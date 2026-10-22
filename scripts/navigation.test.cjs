const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=f=>fs.readFileSync('src/'+f,'utf8');
function run(code,context={}) {const exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,...context});return exports;}
function initializer(file,name) {const ast=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let result;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)result=n.initializer.getText(ast);ts.forEachChild(n,walk);}walk(ast);assert.ok(result,name);return result;}
test('Back helpers pop existing history; direct entries replace with safe parents; shopping pops retained Home',()=>{let history=['index','settings','notifications']; const router={canGoBack:()=>history.length>1,back:()=>history.pop(),replace:r=>history[history.length-1]=r,push:()=>assert.fail('must not push'),dismissTo:r=>{assert.equal(r,'/');history=['index'];}};const nav=run(source('services/navigation.ts'),{require:()=>({router})});nav.goBackOrSettings();assert.deepEqual(history,['index','settings']);nav.goBackOrHome();assert.deepEqual(history,['index']);history=['notifications'];nav.goBackOrSettings();assert.deepEqual(history,['/settings']);history=['index','account','orders'];nav.startShopping();assert.deepEqual(history,['index']);});
for(const file of ['app/category-products.tsx','app/department-categories.tsx'])test(file+' retains selection and does not reload on product Back',async()=>{
  assert.match(source(file),/useCatalogScreen\(/);
  const f=require('./catalog-fixture.cjs').fixture();
  f.render();f.focus();await f.flush();let view=f.render();
  view.setSelectedSubCategory('shampoo');f.render();f.blur();f.focus();await f.flush();view=f.render();
  assert.equal(view.selectedSubCategory,'shampoo');assert.equal(view.filteredProducts.length,1);
  assert.equal(f.calls.filter(url=>url.endsWith('/products')).length,1);
  assert.equal(f.calls.filter(url=>url.endsWith('/categories')).length,1);f.dispose();
});
function notificationFixture(authenticated=true, clear=async()=>{}) {
  const state={authenticated,revision:0}, handled={current:null}, pendingNotification={current:null};
  const clears=[],resets=[],replaces=[],shadeDismissals=[];
  const nav=run(source('services/navigation.ts'),{require:()=>({router:{}})});
  const push=run(source('services/pushService.ts'),{require:name=>name==='./authService'
    ? {getValidAccessToken:async()=>state.authenticated?'token':null,getSavedUser:async()=>({_id:'customer'})} : {}});
  const fn=run('exports.handle='+initializer('app/_layout.tsx','handle'),{
    handled,pendingNotification,active:true,processing:false,
    dismissNotificationShade:id=>shadeDismissals.push(id),getSessionSnapshot:()=>state,
    notificationDestination:push.notificationDestination,
    Notifications:{clearLastNotificationResponseAsync:async()=>{clears.push(true);await clear();}},
    navigationRef:{resetRoot:s=>resets.push(s)},ordersNotificationState:nav.ordersNotificationState,
    router:{replace:r=>replaces.push(r),dismissTo:()=>{}},
  }).handle;
  return {fn,state,handled,pendingNotification,clears,resets,replaces,shadeDismissals};
}
const response=(id='tap',userId='customer')=>({notification:{request:{identifier:id,content:{data:{type:'order',orderId:'507f1f77bcf86cd799439011',userId}}}}});
test('cold/warm order notification opens My Orders; repeat response adds nothing',async()=>{const f=notificationFixture();await f.fn(response());await f.fn(response());assert.equal(f.resets.length,1);assert.deepEqual(Array.from(f.resets[0].routes,r=>r.name),['index','orders']);assert.equal(f.resets[0].index,1);assert.equal(f.clears.length,1);assert.deepEqual(f.shadeDismissals,['tap']);});

test('failed notification cleanup still opens My Orders and does not repeat navigation',async()=>{
  const f=notificationFixture(true,async()=>{throw Error('native cleanup failed');});
  await f.fn(response());await f.fn(response());
  assert.equal(f.resets.length,1);assert.equal(f.resets[0].routes[1].name,'orders');
});
test('signed-out notification retains intent until login and does not clear the saved tap response',async()=>{const f=notificationFixture(false);const tap=response();await f.fn(tap);assert.equal(f.pendingNotification.current,tap);assert.equal(f.clears.length,0);assert.deepEqual(f.replaces,['/login']);f.state.authenticated=true;f.state.revision++;await f.fn(f.pendingNotification.current);assert.equal(f.resets.length,1);assert.equal(f.pendingNotification.current,null);});
test('another customer notification never opens My Orders',async()=>{const f=notificationFixture();await f.fn(response('other','someone-else'));assert.equal(f.resets.length,0);});

test('another order notification remounts Orders even while Orders is already open; Back returns Home',async()=>{
  const f=notificationFixture();await f.fn(response('first'));await f.fn(response('second'));
  assert.equal(f.resets.length,2);
  const {StackRouter}=require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
  const stack=StackRouter({initialRouteName:'index'});
  const options={routeNames:['index','orders','order-details'],routeParamList:{},routeGetIdList:{}};
  const first=stack.getRehydratedState({...f.resets[0],stale:true},options);
  const second=stack.getRehydratedState({...f.resets[1],stale:true},options);
  assert.equal(second.routes[second.index].name,'orders');
  assert.notEqual(second.routes[second.index].key,first.routes[first.index].key);
  const home=stack.getStateForAction(second,{type:'GO_BACK'},options);
  assert.equal(home.routes[home.index].name,'index');
  assert.equal(stack.getStateForAction(home,{type:'GO_BACK'},options),null);
});
test('backend order lookup remains scoped to authenticated customer',()=>{const s=fs.readFileSync('../backend/routes/orderRoutes.js','utf8');assert.match(s.slice(s.indexOf('GET /orders/:orderId')),/Order.findOne\(\{[\s\S]*?user:\s*req.user.userId/);});

test('Orders fetches fresh statuses on focus and shows loading until the server responds',async()=>{
  const {flush}=require('./catalog-fixture.cjs');
  const slots=[],calls=[];let cursor=0,focus,finish,status='Preparing';
  const hooks={
    useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=v;}];},
    useRef:initial=>{const i=cursor++;return slots[i]??={current:initial};},
    useCallback:fn=>fn,useEffect:fn=>fn(),
  };
  const mocks={
    react:hooks,'expo-router':{router:{},useFocusEffect:fn=>{focus=fn;}},
    'react-native':{StyleSheet:{create:s=>s}},'@expo/vector-icons':{},
    '../services/navigation':{},'../components/action-dialog':{useActionDialog:()=>({alert:()=>assert.fail('unexpected alert')})},
    '../services/authService':{getValidAccessToken:async()=>'token'},
    '../services/request':{request:async(url,options)=>{
      calls.push({url,options});const current=status;
      await new Promise(resolve=>{finish=resolve;});
      return{ok:true,json:async()=>({orders:[{_id:'order',status:current,items:[],totalPrice:10,createdAt:'2026-10-22'}]})};
    }},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(source('app/orders.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports,__DEV__:false,require:name=>{assert.ok(name in mocks,name);return mocks[name];}});
  const render=()=>{cursor=0;return exports.default();};
  const text=tree=>JSON.stringify(tree);
  assert.match(text(render()),/Loading your orders/);
  focus();await flush();assert.equal(calls.length,1);
  assert.match(text(render()),/Loading your orders/);
  finish();await flush();assert.match(text(render()),/Preparing/);
  status='Shipped';focus();await flush();finish();await flush();
  const refreshed=text(render());assert.match(refreshed,/Shipped/);assert.doesNotMatch(refreshed,/Preparing/);
  assert.equal(calls.length,2);
  for(const call of calls){assert.match(call.url,/\/orders$/);assert.equal(call.options.cache,'no-store');}
});

test('installed Expo StackRouter handles Android-style GO_BACK: Order Details > Orders > Home > exit',()=>{
 const {StackRouter}=require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
 const stack=StackRouter({initialRouteName:'index'});
 const options={routeNames:['index','orders','order-details'],routeParamList:{},routeGetIdList:{}};
 const {orderNotificationState}=run(source('services/navigation.ts'),{require:()=>({router:{}})});
 let state=stack.getRehydratedState({...orderNotificationState('507f1f77bcf86cd799439011'),stale:true},options);
 assert.equal(state.routes[state.index].name,'order-details');
 state=stack.getStateForAction(state,{type:'GO_BACK'},options);assert.equal(state.routes[state.index].name,'orders');
 state=stack.getStateForAction(state,{type:'GO_BACK'},options);assert.equal(state.routes[state.index].name,'index');
 assert.equal(stack.getStateForAction(state,{type:'GO_BACK'},options),null);
});
