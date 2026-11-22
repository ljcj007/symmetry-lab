import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderClassroomView,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Navigation must not write progress')};
globalThis.fetch=async url=>{
 const file=String(url).split('?')[0].split('/').at(-1);
 return {ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('data/'+file,edition),'utf8'))};
};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(position,html){
 const fragment=new Element();
 fragment.innerHTML=html;
 const parent=position==='afterbegin'?this:this.parentNode;
 const index=position==='afterbegin'?0:parent.children.indexOf(this)+1;
 for(const child of fragment.children)child.parentNode=parent;
 parent.children.splice(index,0,...fragment.children);
};
Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};

const lesson='#classroom/crystal?track=space&tab=learn&lesson=space-04';
const page=new Container(),visits=[];
const $=selector=>page.querySelector(selector);
let dispose=()=>{};
async function mount(url){
 dispose?.();
 dispose=await renderClassroomView({container:page,route:parseClassroomRoute(url),
  onNavigate:route=>visits.push(route),run:()=>assert.fail('Classroom navigation must not calculate')});
 await flush();
}
async function click(selector){
 const button=$(selector);
 assert.ok(button,selector+' must be available');
 await button.onclick();
 await flush();
 return parseClassroomRoute(visits.at(-1));
}

await mount(lesson+'&material=silicon');
const qualified=await click('#sc-chapter-derive');
assert.equal(qualified.tab,'derive');
assert.equal(qualified.lesson,'space-04');
assert.equal(qualified.exercise,'space-pminus1-orbit-stabilizer');
assert.equal(qualified.material,'silicon','Retain the material explicitly named by the lesson URL');
const back=await click('#sc-return-lesson');
assert.equal(back.tab,'learn');
assert.equal(back.lesson,'space-04');
assert.equal(back.material,'silicon');

await mount(lesson);
const fresh=await click('#sc-chapter-derive');
assert.equal(fresh.tab,'derive');
assert.equal(fresh.exercise,'space-pminus1-orbit-stabilizer');
assert.equal(fresh.material,undefined,'An unqualified lesson in the same loaded module cannot inherit silicon');
const lab=await click('[data-sc-tab="lab"]');
assert.equal(lab.tab,'lab');
assert.equal(lab.material,undefined);

await mount('#classroom/crystal?track=space&tab=materials&lesson=space-04&material=silicon');
const changed=await click('[data-sc-material="gaas"]');
assert.equal(changed.tab,'materials');
assert.equal(changed.material,'gaas','An explicit selection replaces the initial material');
const materialDerivation=await click('#sc-material-derive');
assert.equal(materialDerivation.tab,'derive');
assert.equal(materialDerivation.material,'gaas','The selected material accompanies its own derivation');
assert.equal(materialDerivation.exercise,'space-si-gaas-inversion');
assert.equal($('#sc-derive-select').value,materialDerivation.exercise);

dispose?.();
console.log(`Academy material context (${english?'English':'Chinese'}): retained qualified lessons, isolated fresh visits and followed an explicit GaAs material selection.`);
