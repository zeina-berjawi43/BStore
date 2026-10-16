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
function notificationFixture(authenticated=true) {const state={authenticated,revision:0};const handled={current:null},pendingNotification={current:null};let active=true,processing=false;const destinations=[],clears=[],resets=[],replaces=[],shadeDismissals=[];const code=initializer('app/_layout.tsx','handle');const fn=run('exports.handle='+code,{handled,pendingNotification,dismissNotificationShade:id=>shadeDismissals.push(id),getSessionSnapshot:()=>state,notificationDestination:async data=>{destinations.push(data);return data.userId==='customer'?{pathname:'/order-details',params:{orderId:data.orderId}}:null},Notifications:{clearLastNotificationResponseAsync:async()=>clears.push(true)},navigationRef:{resetRoot:s=>resets.push(s)},orderNotificationState:id=>({index:2,routes:[{name:'index'},{name:'orders'},{name:'order-details',params:{orderId:id}}]}),router:{replace:r=>replaces.push(r),dismissTo:()=>{}},active,processing}).handle;return {fn,state,handled,pendingNotification,destinations,clears,resets,replaces,shadeDismissals};}
const response=(id='tap',userId='customer')=>({notification:{request:{identifier:id,content:{data:{type:'order',orderId:'507f1f77bcf86cd799439011',userId}}}}});
test('cold/warm order notification creates Home > Orders > actual Order; repeat response adds nothing',async()=>{const f=notificationFixture();await f.fn(response());await f.fn(response());assert.equal(f.resets.length,1);assert.deepEqual(Array.from(f.resets[0].routes,r=>r.name),['index','orders','order-details']);assert.equal(f.resets[0].routes[2].params.orderId,'507f1f77bcf86cd799439011');assert.equal(f.clears.length,1);assert.deepEqual(f.shadeDismissals,['tap']);});
test('signed-out notification retains intent until login and does not clear the saved tap response',async()=>{const f=notificationFixture(false);const tap=response();await f.fn(tap);assert.equal(f.pendingNotification.current,tap);assert.equal(f.clears.length,0);assert.deepEqual(f.replaces,['/login']);f.state.authenticated=true;f.state.revision++;await f.fn(f.pendingNotification.current);assert.equal(f.resets.length,1);assert.equal(f.pendingNotification.current,null);});
test('another customer notification never opens Order Details',async()=>{const f=notificationFixture();await f.fn(response('other','someone-else'));assert.equal(f.resets.length,0);});
test('backend order lookup remains scoped to authenticated customer',()=>{const s=fs.readFileSync('../backend/routes/orderRoutes.js','utf8');assert.match(s.slice(s.indexOf('GET /orders/:orderId')),/Order.findOne\(\{[\s\S]*?user:\s*req.user.userId/);});

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
