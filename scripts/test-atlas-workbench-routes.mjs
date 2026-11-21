import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {languageURL} from '../dist/language-switch.js';

const catalog=name=>JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const groups={sg:catalog('space-groups').groups,msg:catalog('magnetic-groups').groups,mpg:catalog('points').points};
const noop=()=>{};

async function appInstance(edition,{hash,selectedId='',priorSelection=false,loadCatalog=async mode=>groups[mode],beforeReady}){
 const address=file=>new URL('../dist/'+edition+file,import.meta.url);
 const app=readFileSync(address('app.js'),'utf8');
 const {buildWorkbenchRoute,parseWorkbenchSelection}=await import(address('workbench-route.js'));
 const {matchMagneticGroupQuery}=await import(address('magnetic-group-query.js'));
 const {spaceGroupNumberForQuery,spaceGroupSymbolKey}=await import(address('tool-search.js'));
 const {createResourceLoader}=await import(address('resource-loader.js'));
 const groupLoader=createResourceLoader(loadCatalog);
 const section=(start,end)=>{
  const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
  assert.ok(from>=0&&to>from,start);
  return app.slice(from,to);
 };
 const state={view:'home',route:'home',primary:'home',mode:'sg',group:null,k:[0,0,0],bzType:'',labelK:null,doubleValued:false,dbMode:'sg',dbQuery:'',dbType:'all',dbPage:0};
 if(priorSelection===true)Object.assign(state,{group:groups.sg[21],k:[.5,0,0],bzType:'OrthFace(a)',labelK:'X',doubleValued:true});
 else if(priorSelection)Object.assign(state,priorSelection);
 const gid=(group=state.group,mode=state.mode)=>mode==='sg'?String(group.number):group.id;
 const button={dataset:{openGroup:selectedId}},host={innerHTML:'',dataset:{},classList:{toggle:noop,add:noop},focus:noop},location={hash};
 const calculations=[],historyWrites=[];
 const context={state,location,URLSearchParams,buildWorkbenchRoute,parseWorkbenchSelection,parseNumber:Number,matchMagneticGroupQuery,spaceGroupNumberForQuery,spaceGroupSymbolKey,
  labels:{home:['home',''],database:['database',''],workbench:['workbench','']},knownTool:noop,parseClassroomRoute:noop,withClassroomNavigationContext:noop,
  projectNavigation:{enter:noop,selection:noop,html:()=>'',bind:noop,consumeInput:noop},phonopyScatteringVisit:noop,
  history:{
   pushState(_state,_title,next){historyWrites.push(['push',next]);location.hash=next;},
   replaceState(_state,_title,next){historyWrites.push(['replace',next]);location.hash=next;}
  },
  $:()=>host,$$:selector=>selector==='[data-open-group]'?[button]:[],updateBreadcrumb:noop,rememberRoute:noop,esc:String,
  groupLoader,optionalViews:{peek:()=>true},ensureGroups:mode=>groupLoader.get(mode),list:mode=>groups[mode],gid,
  databases:{},renderNavigationHub:noop,window:{scrollTo:noop},
  modeButtons:()=>'',gtitle:group=>group.bcSymbol||group.symbol,crystalSpan:String,lattices:{},tableHTML:()=>'',
  resultMatches:()=>false,fraction:String,bindWorkbench:noop,renderResults:noop,renderViz:noop,
  async calculate(){calculations.push([location.hash,gid(),state.mode]);},
  toast:message=>assert.fail(message)
 };
 vm.createContext(context);
 const fragments=[
  ['async function openWorkbench(', '\nconst $='],
  ['function setView(request,', '\nfunction updateBreadcrumb'],
  ['function clearRenderedView(){', '\nfunction bindWorkbench(){'],
  ['function renderDatabase(){', '\nfunction activeContext(){']
 ];
 vm.runInContext('let renderTicket=0,renderedViewCleanup=null,dictionaryController=null;'+fragments.map(args=>section(...args)).join('\n'),context);
 const opening=context.setView(hash,{history:false});
 if(beforeReady)await beforeReady({opening,navigate:context.setView,location,host,state,historyWrites});
 await opening;
 return {state,button,host,location,calculations,historyWrites,gid};
}

const pendingMagneticHash='#workbench?msg=62.448&kx=0.5&ky=0&kz=0&double=true&label=X';

for(const [edition,otherEdition,targetLanguage] of [['','en/','en'],['en/','','zh-CN']]){
 const pending=Promise.withResolvers(),loads=[];
 const repeated=await appInstance(edition,{hash:pendingMagneticHash,
  loadCatalog:async mode=>{loads.push(mode);return mode==='msg'?pending.promise:groups[mode];},
  async beforeReady({navigate,state,location}){
   assert.equal(state.pendingGroup?.mode,'msg');
   // These bare routes are the navigation callback used by the global finder.
   const reentries=[navigate('workbench',{focusTitle:true}),navigate('workbench',{focusTitle:true})];
   pending.resolve(groups.msg);
   await Promise.all(reentries);
   assert.equal(location.hash,pendingMagneticHash,'Finder re-entry must preserve a deep link still loading');
  }
 });
 assert.equal(repeated.gid(),'62.448');
 assert.deepEqual(Array.from(repeated.state.k),[.5,0,0]);
 assert.equal(repeated.state.labelK,'X');
 assert.equal(repeated.state.doubleValued,true);
 assert.deepEqual(repeated.historyWrites,[]);
 assert.deepEqual(repeated.calculations,[]);
 assert.deepEqual(loads,['msg'],'Repeated re-entry shares the pending catalog load');

 const retrying=Promise.withResolvers();let attempts=0;
 const retried=await appInstance(edition,{hash:pendingMagneticHash,loadCatalog:async mode=>{
  if(mode!=='msg')return groups[mode];
  if(++attempts===1)throw Error('Temporary catalog failure');
  return retrying.promise;
 },async beforeReady({opening,navigate,host}){
  await opening;
  assert.match(host.innerHTML,/Temporary catalog failure/);
  const retry=host.onclick(),reentry=navigate('workbench',{focusTitle:true});
  retrying.resolve(groups.msg);
  await Promise.all([retry,reentry]);
 }});
 assert.equal(attempts,2);
 assert.equal(retried.gid(),'62.448');
 assert.equal(retried.location.hash,pendingMagneticHash);
 assert.deepEqual(retried.historyWrites,[]);
 assert.deepEqual(retried.calculations,[]);

 for(const route of ['workbench?sg=22&kx=0&ky=0&kz=0&double=false&label=%CE%93','home','workbench']){
  const obsolete=Promise.withResolvers();
  const replaced=await appInstance(edition,{hash:pendingMagneticHash,loadCatalog:async mode=>mode==='msg'?obsolete.promise:groups[mode],
   async beforeReady({navigate,location}){
    if(route==='workbench'){
     location.hash='#workbench';
     await navigate(route,{history:false});
    }else await navigate(route);
    if(route==='home')await navigate('workbench');
    obsolete.resolve(groups.msg);
   }
  });
  assert.equal(replaced.state.mode,'sg');
  assert.equal(replaced.gid(),route.includes('?')?'22':'225','A stale MSG reply must never replace a newer destination');
  assert.deepEqual(replaced.calculations,[]);
 }

 const invalidated=Promise.withResolvers();
 const recovered=await appInstance(edition,{hash:pendingMagneticHash,loadCatalog:async mode=>mode==='msg'?invalidated.promise:groups[mode],
  async beforeReady({navigate,host}){
   await navigate('workbench?sg=invalid');
   assert.match(host.innerHTML,/resource-retry/,'An explicit invalid replacement displays the existing error');
   await navigate('workbench');
   invalidated.resolve(groups.msg);
  }
 });
 assert.equal(recovered.gid(),'225','Re-entry can leave an invalid selection after its catalog was already read');
 assert.deepEqual(recovered.calculations,[]);

 const priorMagneticSelection={mode:'msg',group:groups.msg.find(group=>group.id==='62.448'),k:[.5,0,0],labelK:'X',doubleValued:true};
 const retained=await appInstance(edition,{hash:'#workbench',priorSelection:priorMagneticSelection});
 assert.equal(retained.gid(),'62.448');
 assert.equal(retained.state.mode,'msg');
 assert.deepEqual(Array.from(retained.state.k),[.5,0,0]);
 assert.equal(retained.state.labelK,'X');
 assert.equal(retained.state.doubleValued,true);
 assert.deepEqual(retained.calculations,[],'An expert alias opens the workbench without launching a calculation');
 const fresh=await appInstance(edition,{hash:'#workbench'});
 assert.equal(fresh.gid(),'225');
 assert.equal(fresh.state.mode,'sg');
 assert.equal(fresh.state.doubleValued,false);
 assert.deepEqual(Array.from(fresh.state.k),[0,0,0]);
 assert.deepEqual(fresh.calculations,[]);
 const switched=new URL(languageURL('https://example.org/symmetry-lab/'+edition+retained.location.hash,targetLanguage));
 const restored=await appInstance(otherEdition,{hash:switched.hash});
 assert.equal(restored.location.hash,retained.location.hash);
 assert.equal(restored.gid(),'62.448');
 assert.deepEqual(restored.calculations,[]);
 for(const [mode,id,bzType] of [['sg','4',''],['msg','62.448',''],['mpg','2.3',''],['sg','22','OrthFace(a)']]){
  const atlas=await appInstance(edition,{hash:`#atlas/${mode}?q=${id}`,selectedId:id,priorSelection:true});
  assert.equal(atlas.state.view,'database');
  assert.equal(atlas.calculations.length,0);
  await atlas.button.onclick();
  const expected=`#workbench?${mode}=${id}&kx=0&ky=0&kz=0&double=true${bzType?'&bz=OrthFace%28a%29':''}&label=%CE%93`;
  assert.equal(atlas.location.hash,expected);
  assert.deepEqual(atlas.historyWrites,[['push',expected]],'The history entry always contains the selected group');
  assert.deepEqual(atlas.calculations,[[expected,id,mode]],'An explicit row click calculates once after restoration');
  const source='https://example.org/symmetry-lab/'+edition+expected;
  const switched=new URL(languageURL(source,targetLanguage));
  assert.equal(switched.hash,expected);
  for(const [reloadEdition,hash] of [[edition,expected],[otherEdition,switched.hash]]){
   const restored=await appInstance(reloadEdition,{hash});
   assert.equal(restored.state.view,'workbench');
   assert.equal(restored.state.mode,mode);
   assert.equal(restored.gid(),id);
   assert.deepEqual(Array.from(restored.state.k),[0,0,0]);
   assert.equal(restored.state.labelK,'Γ');
   assert.equal(restored.state.doubleValued,true);
   assert.equal(restored.state.bzType,bzType);
   assert.deepEqual(restored.historyWrites,[]);
   assert.deepEqual(restored.calculations,[],'Reload and language switch do not calculate');
  }
 }
 console.log(`Atlas workbench links (${edition?'English':'Chinese'}): all catalogs, clean history, retained compatible BZ and spin, one explicit calculation and safe reload.`);
}
