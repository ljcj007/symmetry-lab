import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {parseClassroomRoute,renderClassroomView}=await import(new URL('classroom-ui.js',edition));
const {renderPointgroupView,getPointgroupResult}=await import(new URL('pointgroup-ui.js',edition));
const read=name=>JSON.parse(readFileSync(new URL('data/'+name+'.json',edition),'utf8'));
const lessons=read('pointgroup-lessons'),atlas=read('pointgroup-atlas');
const fetched=[],routes=[];
globalThis.fetch=async url=>{
  fetched.push(String(url).split('?')[0]);
  return {ok:true,json:async()=>String(url).includes('pointgroup-lessons')?lessons:atlas};
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
globalThis.localStorage={getItem:()=>null,setItem(){assert.fail('These replays do not modify lesson quiz progress.');}};
Object.defineProperty(Element.prototype,'firstElementChild',{get(){return this.children[0]||null;}});
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};
const page=new Container();
const open=route=>renderClassroomView({container:page,route,onNavigate:hash=>routes.push(hash),
  loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
  run:()=>assert.fail('These finite comparisons use the existing atlas only.'),
  courseRenderers:{pointgroups:renderPointgroupView}
});
const $=selector=>page.querySelector(selector);
const latest=()=>parseClassroomRoute(routes.at(-1));
const find=id=>lessons.lessons.findIndex(row=>row.id===id);
const choose=(selector,value)=>{const control=$(selector);control.value=String(value);control.onchange({target:control});};
const square='#classroom/foundations?tab=learn&lesson=group-basics&group=7';
let dispose=await open(square);
const firstExperiment=$('#pg-lesson-lab');
assert.match(firstExperiment.textContent,english?/Replay the fourfold rotation/:/重放例题/);
firstExperiment.onclick();
assert.deepEqual([latest().tab,latest().lesson,latest().group,latest().preset],['lab','group-basics','9','square-quarter-turn']);
const exactRoute=routes.at(-1);
assert.equal($('#pg-lab-group').value,'9');
assert.equal(getPointgroupResult().experiment.operation.label,'C4z+');
assert.deepEqual(getPointgroupResult().experiment.operation.matrix,[[0,-1,0],[1,0,0],[0,0,1]]);
assert.deepEqual(getPointgroupResult().experiment.initialPoint,[1,0,0]);
const vectors=[[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[1,0,0]];
assert.deepEqual($('#pg-square-sequence').querySelectorAll('td').map(cell=>cell.textContent),vectors.map(vector=>'('+vector.join(', ')+')'));
for(const [i,point] of vectors.slice(1).entries()){
  $('#pg-apply').onclick();
  const state=getPointgroupResult().experiment;
  assert.equal(state.applications,i+1);
  assert.deepEqual(state.result,point);
}
assert.match($('#pg-lab-status').textContent,english?/initial position/:/回到了初始位置/);
assert.equal(getPointgroupResult().experiment.fullGroupOrbit.length,4);

choose('#pg-lab-group',5);
assert.equal(latest().group,'5');
assert.equal(latest().preset,undefined);
assert.equal($('#pg-square-sequence'),null);
$('#pg-lab-atlas').onclick();
assert.equal($('[data-pg-group="5"]').getAttribute('aria-pressed'),'true');
$('[data-pg-group="13"]').onclick();
assert.equal(latest().group,'13');
$('#pg-to-lab').onclick();
assert.equal($('#pg-lab-group').value,'13');
assert.equal($('#pg-square-sequence'),null);
dispose();

dispose=await open(exactRoute);
assert.deepEqual(getPointgroupResult().experiment.initialPoint,[1,0,0]);
assert.equal($('#pg-square-sequence').querySelectorAll('tr').length,6);
choose('#pg-lab-operation',2);
assert.equal(latest().preset,undefined);
assert.equal($('#pg-square-sequence'),null);
$('#pg-return-lesson').onclick();
$('#pg-chapter-lab').onclick();
assert.equal(latest().preset,'square-quarter-turn');
assert.equal(getPointgroupResult().experiment.operation.label,'C4z+');
dispose();

dispose=await open('#classroom/foundations?tab=learn&lesson=operations-notation&group=7');
$('#pg-lesson-lab').onclick();
assert.equal($('#pg-lab-group').value,'7');
assert.equal(latest().preset,undefined);
assert.equal($('[data-c4v-crosswalk-entry]'),null);
$('#pg-return-lesson').onclick();
choose('#pg-chapter-select',find('representations'));
const details=$('[data-c4v-crosswalk-entry]');
assert.ok(details);
assert.equal(details.open,false);
details.open=true;
const body=$('[data-c4v-crosswalk-body]');
const rows=$('[data-c4v-columns]').querySelector('tbody').querySelectorAll('tr');
assert.deepEqual(rows.map(row=>row.getAttribute('data-c4v-column')),['E','C4z+','mx','C2z','mda']);
assert.deepEqual(rows.map(row=>row.querySelectorAll('td').slice(1).map(cell=>cell.textContent)),
  [['1','3'],['2','1'],['2','1'],['1','-1'],['2','1']]);
assert.deepEqual(rows.map(row=>row.querySelector('td').querySelector('[data-math-source]').getAttribute('data-math-source')),
  ['E','2C_4',String.raw`2\sigma_v`,'C_2',String.raw`2\sigma_d`]);
const tuple=value=>'('+value.join(',\\,')+')';
const dataMath=node=>node.querySelectorAll('[data-math-source]').map(entry=>entry.getAttribute('data-math-source'));
const inputs=dataMath(body);
assert.ok(inputs.includes(tuple([3,1,-1,1,1])));
assert.ok(inputs.includes(tuple([3,1,1,-1,1])));
const run=()=>$('#c4v-mirror-check').onsubmit({preventDefault(){}});
const result=$('#c4v-transfer-result');
choose('#c4v-mirror-prediction','axis');run();
assert.match(result.textContent,english?/Compare how the axis/:/再比较轴向镜面/);
assert.ok(dataMath(result).includes(tuple([1,-1,1,1,-1])));
assert.match(result.innerHTML,/B1/);
assert.match(result.innerHTML,/Γ3/);
choose('#c4v-mirror-prediction','diagonal');
assert.equal(result.innerHTML,'');run();
assert.match(result.textContent,english?/agrees with your prediction/:/与矩阵计算一致/);
if(english)assert.doesNotMatch(body.innerHTML+result.innerHTML,/\p{Script=Han}/u);
const atlasRoute=$('[data-c4v-atlas]').getAttribute('href').replaceAll('&amp;','&');
assert.equal(parseClassroomRoute(atlasRoute).group,'13');

const staleForm=$('#c4v-mirror-check'),prior=result.innerHTML;
choose('#pg-chapter-select',find('character-reduction'));
assert.ok($('[data-c4v-crosswalk-entry]'));
assert.ok($('[data-complex-character-entry]'));
staleForm.onsubmit({preventDefault(){}});
assert.equal(result.innerHTML,prior);
dispose();
dispose=await open(atlasRoute);
assert.equal($('[data-pg-group="13"]').getAttribute('aria-pressed'),'true');
assert.equal($('[data-c4v-crosswalk-entry]'),null);
assert.deepEqual(fetched,['./data/pointgroup-lessons.json','./data/pointgroup-atlas.json']);
dispose();
console.log(`Point-group lesson handoff (${english?'English':'Chinese'}): exact C4 example, manual atlas switches, 4mm mapping and transferred mode passed.`);
