import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {parseClassroomRoute,renderClassroomView}=await import(new URL('classroom-ui.js',edition));
const {renderPointgroupView}=await import(new URL('pointgroup-ui.js',edition));
const read=name=>JSON.parse(readFileSync(new URL('data/'+name+'.json',edition),'utf8'));
const lessons=read('pointgroup-lessons'),atlas=read('pointgroup-atlas');
const requests=[];
globalThis.fetch=async url=>{
  requests.push(String(url));
  return {ok:true,json:async()=>String(url).includes('pointgroup-lessons')?lessons:atlas};
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
globalThis.localStorage={getItem:()=>null,setItem(){assert.fail('Optional practice should not write to course mastery.');}};
Object.defineProperty(Element.prototype,'firstElementChild',{get(){return this.children[0]||null;}});
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};
const page=new Container();
const open=route=>renderClassroomView({container:page,route,
  loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
  run:()=>assert.fail('The finite replay uses the existing atlas without starting a worker.'),
  courseRenderers:{pointgroups:renderPointgroupView}
});
const $=selector=>page.querySelector(selector);
let dispose=await open('#classroom/foundations?lesson=group-basics');
assert.equal($('[data-complex-character-entry]'),null);
assert.ok($('[data-composition-entry]'),'The first square lesson keeps its original activity.');
dispose();

dispose=await open('#classroom/foundations?tab=learn&lesson=character-reduction');
const detail=$('[data-complex-character-entry]');
assert.ok(detail);
assert.equal(detail.open,false);
assert.ok($('.pg-lesson').innerHTML.indexOf('class="pg-worked"')<$('.pg-lesson').innerHTML.indexOf('data-complex-character-entry'));
detail.open=true;
const body=$('[data-complex-character-body]');
const form=$('#cch-form'),result=$('#cch-result'),vector=$('#cch-vector'),guess=$('#cch-prediction');
const submit=()=>form.onsubmit({preventDefault(){}});
const select=(control,value)=>{control.value=value;control.onchange();};
const cells=row=>row.querySelectorAll('td').map(cell=>cell.querySelector('[data-math-source]').getAttribute('data-math-source'));
const terms=()=>result.querySelector('tbody').querySelectorAll('tr').map(cells);
assert.deepEqual(requests.map(request=>request.split('?')[0]),['./data/pointgroup-lessons.json','./data/pointgroup-atlas.json']);
assert.equal(result.innerHTML,'');
assert.equal(body.querySelectorAll('[data-math-source]').at(-1).getAttribute('data-math-source'),
  String.raw`R=\begin{pmatrix}0&amp;-1\\1&amp;0\end{pmatrix}`);
submit();
assert.equal(result.querySelector('table'),null,'A blank prediction should not reveal the worked result.');

select(guess,'Γ4');submit();
assert.match(result.querySelector('#cch-feedback').textContent,english?/column again/:/这一列重新核对/);
assert.match(result.textContent,english?/different character/:/本征值不同/);
assert.equal(document.activeElement,result);
assert.deepEqual(terms(),[['1','1','1','1','1'],['i','1','-1','-1','1'],
  ['-1','1','1','1','1'],['-i','1','-1','-1','1']]);
assert.deepEqual(cells(result.querySelector('[data-cch-total]')),['4','0','0','4']);
assert.deepEqual(cells(result.querySelector('[data-cch-weight]')),['1','0','0','1']);
const originalLink=result.querySelector('[data-cch-atlas]').getAttribute('href').replaceAll('&amp;','&');
assert.equal(originalLink,'#classroom/foundations?tab=atlas&group=9');

select(vector,'-1');
assert.equal(guess.value,'');
assert.equal(result.innerHTML,'','Changing the vector clears the previous result.');
select(guess,'Γ4');submit();
assert.match(result.querySelector('#cch-feedback').textContent,english?/agrees with/:/与预测一致/);
assert.deepEqual(terms(),[['1','1','1','1','1'],['-i','-1','1','1','-1'],
  ['-1','1','1','1','1'],['i','-1','1','1','-1']]);
assert.deepEqual(cells(result.querySelector('[data-cch-total]')),['0','4','4','0']);
assert.deepEqual(cells(result.querySelector('[data-cch-weight]')),['0','1','1','0']);
if(english)assert.doesNotMatch(body.innerHTML+result.innerHTML,/\p{Script=Han}/u);

const selected=parseClassroomRoute(originalLink);
assert.equal(selected.group,'9');
dispose();
dispose=await open(originalLink);
assert.equal($('[data-complex-character-entry]'),null);
assert.equal($('[data-pg-group="9"]').getAttribute('aria-pressed'),'true');
assert.equal($('#pg-group-detail').querySelector('table').querySelector('tbody').querySelectorAll('tr').length,4);
const finished=result.innerHTML;
submit();
assert.equal(result.innerHTML,finished,'A detached checkpoint cannot replace the active view or its previous result.');
assert.equal(requests.length,2);
dispose();
console.log(`Complex character checkpoint (${english?'English':'Chinese'}): lesson host, wrong prediction, conjugate transfer, exact products, and C4 atlas passed.`);
