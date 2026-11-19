import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const english=process.argv.includes('--english');
const {bindSiConventionalFolding,siConventionalFolding}=await import(english?'../dist/en/si-conventional-folding-ui.js':'../dist/si-conventional-folding-ui.js');
const local=(zh,en)=>english?en:zh;

const source=readFileSync(new URL('../dist/data/examples/phonopy-si-structure/POSCAR-0',import.meta.url),'utf8').split(/\r?\n/);
assert.match(source[7],/^Direct$/i);
const officialPositions=source.slice(8,16).map(row=>row.trim().split(/\s+/).map(Number));
const centering=[[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0]];
const waves=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]];
const rows=[[1,1,1,1],[1,1,-1,-1],[1,-1,1,-1],[1,-1,-1,1]];
for(const [index,row] of rows.entries()){
 for(const [otherIndex,other] of rows.entries()){
  assert.equal(row.reduce((sum,sign,i)=>sum+sign*other[i],0),otherIndex===index?4:0);
 }
 for(const [j,shift] of centering.entries()){
  const result=siConventionalFolding(index,j);
  assert.deepEqual(result.wave,waves[index]);
  assert.deepEqual(result.phases,row);
  assert.deepEqual(result.translation,shift);
  assert.equal(result.translationSign,row[j]);
  assert.equal(result.isPrimitiveGamma,index===0);
  assert.deepEqual(result.sites.map(site=>site.beforePosition),officialPositions);
  for(const [offset,site] of result.sites.entries()){
   assert.deepEqual(site.afterPosition,site.beforePosition.map((entry,axis)=>(entry+shift[axis])%1));
   assert.deepEqual(site.afterPosition,officialPositions[(offset<4?0:4)+site.to]);
   assert.equal(site.afterSign,site.beforeSign*result.translationSign);
  }
 }
}
assert.equal(siConventionalFolding(1,1).translationSign,1,'A single phase-preserving centering shift does not establish primitive Γ');
assert.equal(siConventionalFolding(1,1).isPrimitiveGamma,false);
assert.equal(siConventionalFolding(1,2).translationSign,-1);
assert.equal(siConventionalFolding('1',0),null);
assert.equal(siConventionalFolding(0,-1),null);

class Control extends EventTarget{
 value='';
 textContent='';
 innerHTML='';
 dataset={};
 attributes=new Map();
 focused=false;
 focus(){this.focused=true;}
 setAttribute(name,value){this.attributes.set(name,value);}
 fire(name){this.dispatchEvent(new Event(name));}
}
class Mount{
 set innerHTML(markup){
  this.markup=markup;
  this.ids=new Map([...markup.matchAll(/\bid="([^"]+)"/g)].map(match=>['#'+match[1],new Control()]));
  this.rows=[...markup.matchAll(/data-si-fold-wave="(\d)" aria-pressed="(true|false)"/g)].map(match=>{
   const node=new Control();
   node.dataset.siFoldWave=match[1];
   node.setAttribute('aria-pressed',match[2]);
   return node;
  });
 }
 querySelector(key){return this.ids.get(key);}
 querySelectorAll(){return this.rows;}
}

const root=new Mount();
let current=true;
const cleanup=bindSiConventionalFolding({root,isCurrent:()=>current});
assert.match(root.markup,/href="#structure"/);
assert.match(root.markup,/id="si-fold-feedback" class="obs-feedback" role="status"/);
assert.equal(root.rows.length,4);
const translation=root.querySelector('#si-fold-translation');
const sign=root.querySelector('#si-fold-phase');
const sites=root.querySelector('#si-fold-sites');
const choice=root.querySelector('#si-fold-choice');
const check=root.querySelector('#si-fold-check');
const feedback=root.querySelector('#si-fold-feedback');
check.fire('click');
assert.equal(choice.focused,true);
assert.match(feedback.textContent,local(/先选择/,/Choose an answer/));
assert.equal(sign.textContent,'exp(2πi k·t₁) = +1');
root.rows[1].fire('click');
assert.equal(root.rows[0].attributes.get('aria-pressed'),'false');
assert.equal(root.rows[1].attributes.get('aria-pressed'),'true');
assert.equal(choice.value,'');
choice.value='primitive';
check.fire('click');
assert.match(feedback.textContent,local(/再试一次/,/Try again/));
translation.value='2';
translation.fire('change');
assert.equal(sign.textContent,'exp(2πi k·t₂) = −1');
assert.match(sites.innerHTML,/\(0\.875, 0\.875, 0\.875\) · \+<\/td><td>\(0\.375, 0\.875, 0\.375\) · −/);
choice.value='folded';
check.fire('click');
assert.match(feedback.innerHTML,local(/原胞的 X 星/,/primitive-cell X star/));
root.rows[0].fire('click');
assert.equal(choice.value,'');
choice.value='primitive';
check.fire('click');
assert.match(feedback.innerHTML,local(/确实属于原胞 Γ/,/so this row is primitive-cell Γ/));
current=false;
root.rows[1].fire('click');
assert.equal(root.rows[0].attributes.get('aria-pressed'),'true');
cleanup();
current=true;
root.rows[1].fire('click');
assert.equal(root.rows[0].attributes.get('aria-pressed'),'true');

console.log(`Si conventional-cell folding (${english?'English':'Chinese'}): official sites, phase sectors, native-control prediction and route passed.`);
