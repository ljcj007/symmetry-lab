import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {toolsIndex,renderNavigationHub}=await import(new URL('navigation-ui.js',edition));
const {finderResults}=await import(new URL('tool-finder.js',edition));
const {renderResearchView,setResearchInput,getResearchResult}=await import(new URL('research-ui.js?quartz-test',edition));
const {handednessExample,quartzHandednessExample}=await import(new URL('crystkit-handedness-ui.js',edition));
const quartzRoute='crystkit?preset=quartz-handedness';
for(const query of ['quartz chirality','α quartz 154 152','alpha quartz 154 152','P3221 P3121','P3₂21 P3₁21',...(!english?['石英 手性']:[])]){
 assert.ok(finderResults(toolsIndex,query,{scope:'tools'}).some(tool=>tool.route==='crystkit'),query);
}
const exact='CrystKit quartz chirality';
assert.equal(finderResults(toolsIndex,exact,{scope:'tools'})[0]?.route,'crystkit');
globalThis.document={activeElement:null};
globalThis.fetch=()=>assert.fail('The catalogue exercise does not fetch structural data or load a preset automatically');
Element.prototype.focus=function(){document.activeElement=this;};
const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const search=directory.querySelector('#site-search');
search.value=exact;search.oninput();
const ordinaryLink=directory.querySelector('[data-route="crystkit"]');
const quartzLink=directory.querySelector('[data-route="'+quartzRoute+'"]');
assert.equal(ordinaryLink.getAttribute('href'),'#crystkit');
assert.equal(quartzLink.getAttribute('href'),'#'+quartzRoute);
assert.match(quartzLink.textContent,english?/α-quartz catalogue handedness comparison/:/α-石英手性目录比较/);
assert.equal(toolsIndex.length,75);

const app=readFileSync(new URL('app.js',edition),'utf8');
const marker=app.indexOf('handednessExercise:state.route');
const first=app.lastIndexOf('context:{',marker),last=app.indexOf('}',marker);
assert.ok(first>=0&&last>first);
const routeContext=route=>vm.runInNewContext('('+app.slice(first+'context:'.length,last+1)+')',{
 state:{route,group:{number:19},mode:'sg',k:[0,0,0],doubleValued:false}
});
const container=new Container();container.dataset={};
const $=selector=>container.querySelector(selector);
const quartzPanel=()=>$('#crystkit-quartz-handedness');
const model={action:'analyze',group_number:19,point:['1/7','2/7','3/7']};
setResearchInput('crystkit',model);
let dispose=()=>{};
const calls=[],exports=[];
function mount(route){
 dispose();
 dispose=renderResearchView('crystkit',{
  container,context:routeContext(route),toast:message=>assert.fail(message),
  download:(data,name)=>exports.push({data:JSON.parse(data),name}),
  async run(action,payload){
   assert.equal(action,'crystkit');
   calls.push(payload);
   if(payload.right.group_number===152&&payload.positive_only){
    return {action:'compare',status:'no_match_in_search',equivalent:null};
   }
   const reversed=payload.right.group_number===152;
   return {action:'compare',status:'verified',equivalent:true,identityVerified:true,
    determinant:reversed?-1:1,orientationPreserved:!reversed,origin:reversed?[0,0,'-1/2']:[0,0,0]};
  }
 });
}
for(const route of ['crystkit','crystkit?preset=quartz-handedness&preset=quartz-handedness']){
 mount(route);
 assert.equal(quartzPanel().open,false);
 assert.deepEqual(JSON.parse($('#research-json').value),model);
}
mount('crystkit?preset=handedness');
const legacy=$('#crystkit-handedness');
assert.equal(legacy.open,true);
assert.equal(quartzPanel().open,false);
assert.deepEqual(legacy.querySelectorAll('[data-crystkit-hand]').map(button=>button.dataset.crystkitHand),['positive','both','control']);
assert.deepEqual([handednessExample('positive').left.group_number,handednessExample('both').right.group_number,handednessExample('control').left.group_number],[212,213,207]);

mount(quartzRoute);
assert.equal(quartzPanel().open,true);
assert.deepEqual(JSON.parse($('#research-json').value),model,'Opening the precise route preserves the draft');
assert.ok(quartzPanel().querySelector('a[href="#structure?quartz-hand=practice"]'));
assert.ok(quartzPanel().querySelector('a[href="#classroom/observables?module=chirality&amp;lesson=chiral-mirror"]'));
assert.equal(calls.length,0);
const stale=quartzPanel().querySelector('[data-crystkit-hand="quartz-positive"]');
$('#research-json').oninput({target:{value:''}});
mount(quartzRoute);
assert.equal($('#research-json').value,'','A deliberately blank draft also stays blank');
stale.onclick();
assert.equal($('#research-json').value,'');
const identity=[[1,0,0],[0,1,0],[0,0,1]];
const inversion=[[-1,0,0],[0,-1,0],[0,0,-1]];
for(const [id,right,positiveOnly,det,origin] of [
 ['quartz-positive',152,true,null,null],['quartz-both',152,false,-1,[0,0,'-1/2']],
 ['quartz-passive',154,true,1,[0,0,0]]
]){
 const previous=calls.length;
 quartzPanel().querySelector('[data-crystkit-hand="'+id+'"]').onclick();
 assert.equal(calls.length,previous,'Loading is an explicit draft operation');
 assert.equal(document.activeElement,$('#run-research'));
 const input={action:'compare',left:{group_number:154},right:{group_number:right},bases:[identity,inversion],positive_only:positiveOnly};
 assert.deepEqual(quartzHandednessExample(id),input);
 assert.deepEqual(JSON.parse($('#research-json').value),input);
 await $('#run-research').onclick();
 assert.equal(calls.length,previous+1);
 assert.deepEqual(calls.at(-1),input);
 const result=getResearchResult('crystkit');
 if(det===null){
  assert.equal(result.equivalent,null);
  assert.match(container.innerHTML,english?/No match within the basis search/:/所搜索的基底中未找到匹配/);
 }else{
  assert.equal(result.determinant,det);
  assert.deepEqual(result.origin,origin);
  assert.equal(result.identityVerified,true);
 }
}
$('#research-export').onclick();
assert.deepEqual(exports[0],{name:'crystkit-result.json',data:getResearchResult('crystkit')});
dispose();
console.log('Quartz catalogue ('+(english?'English':'Chinese')+'): Finder terms, exact link and route, independent drafts, manual comparisons, and legacy cases passed.');
