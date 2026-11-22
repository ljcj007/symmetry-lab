import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {Container,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {parseClassroomRoute,isClassroomView}=await import(new URL('classroom-ui.js',edition));
const {createProjectNavigator}=await import(new URL('project-navigation.js',edition));
const {readMagneticTBPreset,magneticTBPresetRoute}=await import(new URL('magnetictb-presets.js',edition));
const root='magnetictb';
const ids=['graphene','spinful-chain','ssh','chern'];
const route=id=>'#'+root+(id?'?preset='+id:'');
const examples=new Map(ids.map(id=>{
 const path=`examples/magnetictb-${id}.json`;
 return [path,JSON.parse(readFileSync(new URL(path,edition),'utf8'))];
}));
// The JSON editor serializes parsed numeric data, so source -0 is displayed as 0.
const example=id=>JSON.parse(JSON.stringify(examples.get(`examples/magnetictb-${id}.json`)));
const requests=[],deferred=new Map();
globalThis.fetch=async path=>{
 requests.push(path);
 assert.ok(examples.has(path),'Preset resolution may only fetch an allowlisted built-in');
 if(deferred.has(path))await deferred.get(path).promise;
 return {ok:true,json:async()=>structuredClone(examples.get(path))};
};

// Use the site's actual route dispatcher, research render branch and hashchange registration.
const app=readFileSync(new URL('app.js',edition),'utf8').replaceAll('\r\n','\n');
function fragment(start,end){
 const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from,start);
 return app.slice(from,to);
}
let pageId=0;
async function createPage(start){
 const research=await import(new URL(`research-ui.js?magnetictb-test-${++pageId}`,edition));
 const container=new Container();container.dataset={};
 const state={route:'home',view:'home',primary:'home',mode:'sg',group:{number:19,operations:[]}};
 const history=[start],location={hash:start},toasts=[],runs=[];
 let cursor=0,onHashChange;
 const shell={classList:{toggle(){}}};
 const context=createContext({
  state,location,URLSearchParams,readMagneticTBPreset,magneticTBPresetRoute,parseClassroomRoute,isClassroomView,
  projectNavigation:createProjectNavigator(),knownTool:()=>null,withClassroomNavigationContext:course=>course,
  phonopyScatteringVisit:()=>null,labels:{magnetictb:['MagneticTB',''],home:['Home','']},
  $:id=>id==='#app'?container:id==='#resource-retry'?container.querySelector(id):shell,$$:()=>[],esc:String,
  rememberRoute(){},updateBreadcrumb(){},groupLoader:{peek:()=>true},ensureGroups:async()=>{},
  optionalViews:{get:async()=>research,peek:()=>true},renderNavigationHub:async()=>{},databases:{},
  history:{
   pushState(_state,_title,hash){history.splice(++cursor);history[cursor]=location.hash=hash;},
   replaceState(_state,_title,hash){history[cursor]=location.hash=hash;}
  },
  window:{addEventListener(type,handler){assert.equal(type,'hashchange');onHashChange=handler;}},
  toast:message=>toasts.push(message),download:()=>assert.fail('Unexpected download'),
  runPythonTask:async(action,input)=>{
   runs.push({action,input});
   return {model:{orbital_count:2,hoppings:input.hoppings}};
  }
 });
 runInContext([
  'let renderTicket=0,renderedViewCleanup=null,dictionaryController=null;',
  fragment('function setView(','function updateBreadcrumb('),
  fragment('function clearRenderedView()','function renderWorkbench(){'),
  fragment("window.addEventListener('hashchange'",'\n')
 ].join('\n'),context);
 const settle=async wait=>{await wait;await flush();assert.ok(!container.innerHTML.includes('resource-retry'),container.innerHTML);};
 const visit=hash=>settle(context.setView(hash));
 const go=delta=>{cursor+=delta;location.hash=history[cursor];return settle(onHashChange());};
 await settle(context.setView(start,{history:false}));
 const $=id=>container.querySelector('#'+id);
 const text=()=>$('research-json').value;
 const draft=()=>JSON.parse(text());
 const choose=id=>{const select=$('research-example');select.value=id;select.onchange({target:select});};
 const load=()=>$('load-research-example').onclick();
 const edit=value=>{const input=$('research-json');input.value=value;input.oninput({target:input});};
 return {container,state,location,history,visit,go,text,draft,choose,load,edit,$,toasts,runs};
}

const page=await createPage(route());
assert.deepEqual(page.draft(),example('graphene'));
assert.match(page.container.querySelector('.research-intro').textContent,
 english?/copy the address to reopen the same inputs/:/复制网址即可再次打开相同输入/);
page.choose('chern');
assert.equal(page.location.hash,route(),'Selection alone leaves the loaded route');
assert.deepEqual(page.draft(),example('graphene'));
await page.load();
assert.equal(page.location.hash,route('chern'));
assert.equal(page.state.route,route('chern').slice(1));
assert.deepEqual(page.draft(),example('chern'));
assert.equal(page.runs.length,0,'Loading a built-in does not call Python');
await page.go(-1);
assert.equal(page.location.hash,route());
assert.deepEqual(page.draft(),example('graphene'));
await page.go(1);
assert.equal(page.location.hash,route('chern'));
assert.deepEqual(page.draft(),example('chern'));
assert.equal(page.runs.length,0,'Back/Forward restores input for manual Run');

for(const id of ids){
 const opened=await createPage(route(id));
 assert.equal(opened.location.hash,route(id));
 assert.equal(opened.$('research-example').value,id);
 assert.deepEqual(opened.draft(),example(id));
 assert.deepEqual(opened.runs,[]);
}
for(const query of ['?preset=unknown','?preset=..%2fchern','?preset=chern&preset=ssh','?preset=chern?bad','?preset=chern&data=test']){
 const opened=await createPage('#'+root+query);
 assert.equal(opened.location.hash,route(),query);
 assert.deepEqual(opened.draft(),example('graphene'),query);
}

const ownDraft='{"action":"bands","description":"private draft"}';
const historySize=page.history.length;
page.edit(ownDraft);
assert.equal(page.location.hash,route());
assert.equal(page.history.length,historySize,'Editing detaches the preset in the current history entry');
assert.equal(page.text(),ownDraft);
await page.visit('#home');
await page.go(-1);
assert.equal(page.text(),ownDraft,'Returning to a bare tool still retains the in-memory draft');

await page.visit(route('chern'));
await page.$('tb-hr-file').onchange({target:{files:[{size:12,text:async()=> 'local hr file'}]}});
assert.equal(page.location.hash,route(),'Successful file import clears the preset route');
assert.equal(page.draft().hr_text,'local hr file');
assert.ok(!page.location.hash.includes('local hr file'));
await page.visit(route('chern'));
await page.$('run-research').onclick();
assert.deepEqual(page.runs,[{action:'magnetictb',input:example('chern')}]);
assert.equal(page.location.hash,route('chern'),'Calculating a preset keeps its exact input link');
page.container.querySelector('[data-post="chern"]').onclick();
assert.equal(page.location.hash,route(),'Preparing a follow-up clears the preset route');
assert.equal(page.draft().method,'chern');
assert.equal(page.runs.length,1,'Preparing a follow-up waits for the next Run');

const sshGate=Promise.withResolvers();
deferred.set('examples/magnetictb-ssh.json',sshGate);
page.choose('ssh');
const oldLoad=page.load();
await page.visit(route('spinful-chain'));
sshGate.resolve();
await oldLoad;
deferred.delete('examples/magnetictb-ssh.json');
assert.equal(page.location.hash,route('spinful-chain'));
assert.deepEqual(page.draft(),example('spinful-chain'));

const chernGate=Promise.withResolvers();
deferred.set('examples/magnetictb-chern.json',chernGate);
await page.visit(route('chern'));
page.edit(ownDraft);
chernGate.resolve();
await flush();
deferred.delete('examples/magnetictb-chern.json');
assert.equal(page.location.hash,route());
assert.equal(page.text(),ownDraft,'Editing wins over a late route-triggered load');
assert.equal(page.runs.length,1);
assert.ok(requests.every(path=>examples.has(path)));
console.log(`MagneticTB presets (${english?'English':'Chinese'}): all four routes, native hash history, exact inputs, draft isolation, deferred loads and manual Run passed.`);
