import assert from 'node:assert/strict';
import {Container,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {renderResearchView,setResearchInput,getResearchResult}=await import(prefix+'research-ui.js?handedness-test');
const {handednessExample}=await import(prefix+'crystkit-handedness-ui.js');
const container=new Container();
container.dataset={};
const $=selector=>container.querySelector(selector);
const runCalls=[],downloads=[];
const draft={action:'analyze',group_number:19,point:['1/7','2/7','3/7']};
setResearchInput('crystkit',draft);
const dispose=renderResearchView('crystkit',{
 container,context:{mode:'sg',group:{number:19},handednessExercise:true},
 toast:message=>assert.fail(message),
 download:(data,name)=>downloads.push({data:JSON.parse(data),name}),
 run:async(action,input)=>{
  assert.equal(action,'crystkit');
  runCalls.push(input);
  if(input.left.group_number===212&&input.positive_only)return {
   action:'compare',status:'no_match_in_search',equivalent:null
  };
  const orientationPreserved=input.left.group_number===207;
  return {
   action:'compare',status:'verified',equivalent:true,identityVerified:true,
   determinant:orientationPreserved?1:-1,orientationPreserved,
   origin:orientationPreserved?[0,0,0]:['-1/2','-1/2','-1/2']
  };
 }
});
assert.notEqual($('#crystkit-handedness').getAttribute('open'),null);
assert.deepEqual(JSON.parse($('#research-json').value),draft);
assert.equal(runCalls.length,0);
assert.ok(container.querySelector('a[href="#classroom/observables?module=chirality&amp;lesson=chiral-mirror"]'));
const headline=english?/Affine comparison/:/仿射比较/;
for(const [scenario,group,positive,reason,determinant] of [
 ['positive',212,true,english?/>No match within the basis search<\//:/>所搜索的基底中未找到匹配<\//,null],
 ['both',212,false,english?/>Orientation reversed<\//:/>反转取向<\//,-1],
 ['control',207,true,english?/>Orientation preserved<\//:/>保持取向<\//,1]
]){
 const previousCalls=runCalls.length;
 const exercise=$('#crystkit-handedness');
 exercise.open=true;
 const load=$('[data-crystkit-hand="'+scenario+'"]');
 load.onclick();
 assert.equal(getResearchResult('crystkit'),null);
 assert.equal(runCalls.length,previousCalls);
 const input=JSON.parse($('#research-json').value);
 assert.deepEqual(input,handednessExample(scenario));
 assert.equal(input.left.group_number,group);
 assert.equal(input.right.group_number,group===212?213:207);
 assert.equal(input.positive_only,positive);
 $('#run-research').onclick();
 await flush();
 assert.equal(runCalls.length,previousCalls+1);
 assert.deepEqual(runCalls.at(-1),input);
 assert.match(container.innerHTML,headline);
 assert.match(container.innerHTML,reason);
 if(determinant!==null)assert.equal(getResearchResult('crystkit').determinant,determinant);
}
$('#research-export').onclick();
assert.equal(downloads[0].name,'crystkit-result.json');
assert.deepEqual(downloads[0].data,getResearchResult('crystkit'));
const input=$('#research-json');
input.oninput({target:{value:JSON.stringify(draft)}});
assert.equal(getResearchResult('crystkit'),null);
dispose();
console.log((english?'English':'Chinese')+' CrystKit handedness controls and exact comparison evidence passed');
