import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container} from './test-material-research-ui.mjs';
import {getChoiceFeedback,renderChoiceFeedback,bindChoiceFeedback} from '../dist/learning-feedback.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url),'utf8'));
const foundations=read('pointgroup-lessons.json'),observables=read('material-observables.json'),response=read('response-materials.json');
const basic=foundations.lessons.filter(x=>['representations','character-reduction'].includes(x.id)).flatMap(x=>x.quiz);
const tensor=observables.exercises.find(x=>x.id==='tensor-constraints').steps;
assert.equal(basic.length,4);assert.equal(tensor.length,4);
assert.deepEqual(basic.map(q=>q.answer),[1,0,1,2],'Existing foundation answers remain unchanged');
assert.deepEqual(tensor.map(q=>q.answer),[2,1,0,1],'Existing tensor answers remain unchanged');
const multipletChecks=response.exercises.find(x=>x.id==='multiplet-fock-steps').steps.slice(2);
const all=[...basic,...tensor,...multipletChecks],snapshot=JSON.stringify(all),remediationIds=[];
for(const q of all){
 assert.equal(q.feedback.length,q.choices.length,'Feedback is aligned with the original choice order');
 assert.equal(new Set(q.feedback.map(x=>x.message)).size,q.choices.length,'Each choice has a distinct explanation');
 for(let selected=0;selected<q.choices.length;selected++){
  const f=getChoiceFeedback(q,selected);assert.ok(f?.message);
  if(selected===q.answer)assert.equal(f.remediation,undefined,'Correct choices do not trigger remedial treatment');
  else{
   const r=f.remediation;assert.ok(r?.id&&r.prompt&&r.explanation);assert.ok(r.choices.length>=2);
   assert.ok(Number.isInteger(r.answer)&&r.answer>=0&&r.answer<r.choices.length);
   remediationIds.push(r.id);
   assert.notEqual(r.prompt,q.prompt||q.question,'A changed-condition check is not the original question repeated');
  }
 }
}
assert.equal(new Set(remediationIds).size,remediationIds.length);
assert.equal(JSON.stringify(all),snapshot,'Feedback selection must not mutate data or progress');

const legacy={question:'Legacy',choices:['a','b'],answer:1,explanation:'Existing explanation'};
assert.equal(getChoiceFeedback(legacy,0),null);assert.equal(renderChoiceFeedback(legacy,0),'');
for(const selected of [-1,3,null,undefined,'0',NaN])assert.equal(getChoiceFeedback(basic[0],selected),null);
assert.equal(getChoiceFeedback({...basic[0],feedback:[]},0),null);
assert.equal(getChoiceFeedback({...basic[0],answer:99},0),null);
assert.equal(getChoiceFeedback({...basic[0],feedback:[null,null,null]},0),null);

// Messages and choice labels are text, never executable HTML. Each same-page
// instance has its own legend, radio group, button description, and live region.
const hostile={question:'<img src=x>',choices:['wrong','right'],answer:1,feedback:[{
 message:'<script>not executable</script>',remediation:{id:'safe',prompt:'<b>prompt</b>',choices:['<img src=x>','plain'],answer:1,explanation:'<em>plain result</em>'}
},{message:'right'}]};
const safe=renderChoiceFeedback(hostile,0,{prefix:'safe-a'});
assert.match(safe,/&lt;script&gt;/);assert.match(safe,/&lt;b&gt;/);assert.match(safe,/&lt;img/);assert.doesNotMatch(safe,/<script|<img|<b>/);
assert.match(safe,/aria-label=/);assert.match(safe,/aria-describedby="safe-a-remediation-prompt"/);
assert.match(safe,/id="safe-a-remediation-result"[^>]*role="status"/);
assert.doesNotMatch(renderChoiceFeedback(hostile,0,{prefix:'"><img src=x>'}),/<img/);
assert.match(renderChoiceFeedback(basic[0],basic[0].answer,{prefix:'correct-only'}),/correct-only-feedback/);
assert.doesNotMatch(renderChoiceFeedback(basic[0],basic[0].answer),/data-feedback-check/);

let writes=0;globalThis.localStorage={setItem(){writes++;throw Error('Remediation must not write original progress');}};
const q=basic[0],wrong=0,prefix='pg-representation-0',otherPrefix='pg-representation-1';
const container=new Container();
container.innerHTML=renderChoiceFeedback(q,wrong,{prefix})+renderChoiceFeedback(q,wrong,{prefix:otherPrefix});
const panel=container.querySelector('#'+prefix+'-feedback'),other=container.querySelector('#'+otherPrefix+'-feedback');
assert.notEqual(panel.querySelector('input').getAttribute('name'),other.querySelector('input').getAttribute('name'));
const results=[];let active=true;
const dispose=bindChoiceFeedback(container,q,wrong,{prefix,isCurrent:()=>active,onResult:value=>results.push(value)});
bindChoiceFeedback(container,q,wrong,{prefix:otherPrefix});
const inputs=panel.querySelectorAll('[data-feedback-choice]'),check=panel.querySelector('[data-feedback-check]'),result=panel.querySelector('[data-feedback-result]');
assert.equal(check.disabled,true);check.onclick();assert.equal(results.length,0);
inputs[1].onchange();assert.equal(check.disabled,false);check.onclick();
assert.equal(results.at(-1).correct,false);assert.match(result.textContent,/再核对/);
assert.deepEqual(Object.keys(results.at(-1)).sort(),['correct','id','selected']);
assert.equal(other.querySelector('[data-feedback-result]').textContent,'');
panel.querySelector('[data-feedback-reset]').onclick();assert.equal(check.disabled,true);assert.equal(result.textContent,'');assert.ok(inputs.every(input=>input.checked===false));check.onclick();assert.equal(results.length,1,'Undoing the local answer clears feedback without marking another result');
inputs[0].onchange();assert.equal(result.textContent,'');check.onclick();assert.equal(results.at(-1).correct,true);
assert.match(result.textContent,/变式核对一致/);assert.equal(writes,0);
const oldCheck=check.onclick,oldChange=inputs[0].onchange,prior=result.textContent;
active=false;oldChange();oldCheck();assert.equal(result.textContent,prior);assert.equal(results.length,2,'External lifecycle guard blocks old events');
active=true;container.innerHTML=renderChoiceFeedback(q,wrong,{prefix});oldChange();oldCheck();
assert.equal(results.length,2,'Same-prefix replacement does not let old nodes write new feedback');
dispose();assert.equal(check.onclick,null);assert.equal(inputs[0].onchange,null);
const replacement=container.querySelector('#'+prefix+'-feedback');
const clean=bindChoiceFeedback(container,q,wrong,{prefix});const nextCheck=replacement.querySelector('[data-feedback-check]');
const detached=nextCheck.onclick;container.innerHTML='<p>Another lesson</p>';detached();assert.equal(container.innerHTML,'<p>Another lesson</p>');clean();
assert.equal(typeof bindChoiceFeedback(container,legacy,0),'function');

// Independent finite checks for the arithmetic in the new remedial examples.
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,x,k)=>sum+x*b[k][j],0)));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const transformed=(r,a)=>mm(mm(r,a),transpose(r));
const c4=[[0,-1,0],[1,0,0],[0,0,1]],diag=(a,b,c)=>[[a,0,0],[0,b,0],[0,0,c]];
assert.deepEqual(transformed(c4,diag(4,4,7)),diag(4,4,7));
const cycle=[[0,0,1],[1,0,0],[0,1,0]];
assert.notDeepEqual(transformed(cycle,diag(2,2,5)),diag(2,2,5));
assert.deepEqual(transformed(cycle,diag(3,3,3)),diag(3,3,3));
assert.equal((-1)*(-1),1);assert.notEqual(2,(10-4)/2);

const fockLesson=response.lessons.find(x=>x.id==='multiplet-fock');
const shift=fockLesson.sections.find(x=>x.title==='固定N时，改变U究竟改变什么？');
assert.ok(shift);assert.match(shift.text,/保持J.*不变/);assert.match(shift.text,/U′=U−2J/);
assert.match(shift.text,/比较不同N/);assert.match(shift.formula,/N\(N−1\)\/2/);
const fock=response.exercises.find(x=>x.id==='multiplet-fock-steps');
assert.deepEqual(fock.steps.map(x=>x.answer),[1,2,0,1]);
assert.match(fock.prompt,/保持 J.*不变/);assert.match(fock.prompt,/U′=U−2J/);
let n6=0;
for(let state=0;state<1024;state++){
 const nu=Array.from({length:5},(_,m)=>(state>>(2*m))&1),nd=Array.from({length:5},(_,m)=>(state>>(2*m+1))&1);
 const n=nu.reduce((s,x)=>s+x,0)+nd.reduce((s,x)=>s+x,0);
 let coefficient=nu.reduce((s,x,m)=>s+x*nd[m],0);
 for(let m=0;m<5;m++)for(let j=m+1;j<5;j++)coefficient+=(nu[m]+nd[m])*(nu[j]+nd[j]);
 assert.equal(coefficient,n<2?0:n*(n-1)/2,'All density pairs carry the same U coefficient at fixed J');
 if(n===6){n6++;assert.equal(coefficient/5,3,'A U increase of 1/5 eV shifts every d6 determinant by 3 eV');}
}
assert.equal(n6,210);
// The response catalogue is generated from fragments: preserve the teaching
// repair when that catalogue is rebuilt without writing or rebuilding it here.
const merged=Object.fromEntries(['modules','lessons','exercises','cases','sources'].map(key=>[key,[]]));
for(const name of ['hall-response','device-transport','local-multiplet']){
 const part=read(name+'-content.json');
 for(const key of Object.keys(merged))for(const row of part[key]){
  const previous=merged[key].find(x=>x.id===row.id);
  if(previous)assert.deepEqual(previous,row,'Duplicate source records must agree');else merged[key].push(row);
 }
}
for(const key of Object.keys(merged))assert.deepEqual(merged[key],response[key],'Response catalogue remains reproducible from source fragments: '+key);
console.log('Choice feedback: 4 foundation questions, 4 tensor steps, 2 multiplet steps, legacy fallback, safe/labelled HTML, isolated multi-question remediation, reset/stale guards, no original-progress writes, and fixed-N Kanamori pair identity over 1024 states passed.');
