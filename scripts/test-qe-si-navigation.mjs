import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const route='atlas/qe-si';
const noop=()=>{};
const noCalculation=()=>assert.fail('Opening the QE–Si link must not load a numerical resource or run a calculation');
const receipt=JSON.parse(readFileSync(new URL('../dist/end-to-end/data/si-reference-receipt.json',import.meta.url),'utf8'));

function nativeEntry(source,language){
 const section=(start,end)=>{
  const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
  assert.ok(from>=0&&to>from,start);
  return source.slice(from,to);
 };
 const state={route:'home',view:'home',primary:'home'};
 const exportToggle=[],historyWrites=[],nodes=new Map();
 const location={hash:'#home'};
 const context={
  state,location,URLSearchParams,labels:{},document:{documentElement:{lang:language}},
  parseClassroomRoute:noop,knownTool:noop,withClassroomNavigationContext:noop,phonopyScatteringVisit:noop,
  projectNavigation:{enter:noop,selection:noop,html:()=>'',bind:noop,consumeInput:noop},
  history:{pushState(_state,_title,hash){historyWrites.push(hash);location.hash=hash;}},
  $(selector){if(!nodes.has(selector))nodes.set(selector,{dataset:{},classList:{toggle(name,hidden){if(selector==='#export-top')exportToggle.push([name,hidden]);}}});return nodes.get(selector);},
  $$:()=>[],updateBreadcrumb:noop,rememberRoute:noop,clearRenderedView:noop,dictionaryController:null,
  groupLoader:{peek:noCalculation},optionalViews:{peek:noCalculation,get:noCalculation},
  fetch:noCalculation,ensureGroups:noCalculation,runPythonTask:noCalculation,isClassroomView:()=>false
 };
 vm.createContext(context);
 vm.runInContext('let renderTicket=0;'+[
  section("labels['qe-si']", '\nlabels.classroom'),
  section('function setView(request,', '\nfunction updateBreadcrumb'),
  section('async function render(){','\nfunction renderWorkbench')
 ].join('\n'),context);
 return context.setView(route).then(()=>{
  assert.equal(state.primary,'atlas');
  assert.equal(state.view,'qe-si');
  assert.deepEqual(historyWrites,['#'+route]);
  assert.deepEqual(exportToggle,[['hidden',true]]);
  assert.match(nodes.get('#page-title').textContent,/QE–Si/);
  assert.match(nodes.get('#app').innerHTML,/href="#atlas\/materials\?material=silicon"/);
  return nodes.get('#app').innerHTML.match(/href="([^"]*end-to-end\/[^"]*)"/)[1];
 });
}

const makeElement=()=>({
 children:[],setAttribute:noop,append(...children){this.children.push(...children);},
 replaceChildren(...children){this.children=children;}
});
const originalFetch=globalThis.fetch;
for(const [edition,language,footerHref,queries] of [
 ['', 'zh-CN',undefined,['QE-Si','Quantum ESPRESSO','带隙复核']],
 ['en/','en','../en/',['QE-Si','Quantum ESPRESSO','silicon band gap']]
]){
 const file=name=>new URL('../dist/'+edition+name,import.meta.url);
 const domain='http://127.0.0.1:4318/symmetry-lab/';
 const base=domain+edition,expected=domain+'end-to-end/'+(language==='en'?'?lang=en':'');
 const source=readFileSync(file('index.html'),'utf8');
 const sidebarHref=source.match(/href="([^"]*end-to-end\/[^"]*)"/)[1];
 assert.equal(new URL(sidebarHref,base).href,expected,'The static link stays on the active origin and uses its language');
 const appHref=await nativeEntry(readFileSync(file('app.js'),'utf8'),language);
 assert.equal(new URL(appHref,base).href,expected,'The native atlas bridge opens the same case and language');

 const {toolsIndex}=await import(file('navigation-ui.js'));
 const {finderResults}=await import(file('tool-finder.js'));
 const index=JSON.parse(readFileSync(file('data/search-index.json'),'utf8')).entries;
 assert.equal(index.filter(row=>row.route===route).length,1);
 for(const query of queries)for(const scope of ['all','materials']){
  const results=finderResults([...toolsIndex,...index],query,{scope});
  assert.equal(results[0]?.route,route,`${language}: ${query} in ${scope}`);
 }

 const elements=new Map();
 globalThis.document={documentElement:{lang:'zh-CN'},title:'',querySelectorAll:()=>[],
  querySelector(selector){if(!elements.has(selector))elements.set(selector,makeElement());return elements.get(selector);},
  createElement:makeElement,createTextNode:text=>text
 };
 globalThis.location=new URL(expected);
 globalThis.fetch=async input=>{
  assert.equal(input,'./data/si-reference-receipt.json');
  return {ok:true,json:async()=>receipt};
 };
 await import(new URL('../dist/end-to-end/app.js?navigation-'+language,import.meta.url));
 assert.equal(document.documentElement.lang,language);
 assert.equal(elements.get('#run').disabled,false);
 assert.equal(elements.get('#status').textContent,undefined,'The verifier awaits a deliberate click');
 assert.equal(elements.get('footer .brand')?.href,footerHref);
 delete globalThis.document;
 delete globalThis.location;
}
globalThis.fetch=originalFetch;
console.log('QE–Si navigation: both static editions, native atlas bridge, case search, manual run and localized return passed.');
