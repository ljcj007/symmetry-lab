import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const {bindGammaPeriodicity,gaasGammaPeriodicity}=await import(english?'../dist/en/gamma-periodicity-ui.js':'../dist/gamma-periodicity-ui.js');
const local=(zh,en)=>english?en:zh;
const translations={
 axis:[0,0,1],
 a3:[.5,.5,0],
 a1:[0,.5,.5],
 a2:[.5,0,.5]
};
for(const [route,translation] of Object.entries(translations)){
 for(const field of ['rotation','shift','optical']){
  const result=gaasGammaPeriodicity(field,route);
  assert.deepEqual(result.translation,translation);
  assert.deepEqual(result.sites.map(site=>site.symbol),['Ga','As']);
  assert.deepEqual(result.sites[1].position,[.25,.25,.25]);
  for(const site of result.sites){
   assert.deepEqual(site.nextPosition,site.position.map((x,index)=>x+translation[index]));
   const expected=field==='rotation'?[-translation[1]/25||0,translation[0]/25,0]:[0,0,0];
   assert.deepEqual(site.delta,expected);
  }
  assert.equal(result.agreesAcrossCells,field!=='rotation'||route==='axis');
  if(field==='optical')assert.deepEqual(result.withinCellDelta,[0,0,-.16]);
  if(field==='shift')assert.deepEqual(result.withinCellDelta,[0,0,0]);
 }
}
assert.equal(gaasGammaPeriodicity('rotation','toString'),null);
assert.equal(gaasGammaPeriodicity('other','axis'),null);
const changed=gaasGammaPeriodicity('optical','axis');
changed.sites[0].displacement[2]=0;
assert.equal(gaasGammaPeriodicity('optical','axis').sites[0].displacement[2],.08);

// Model the native select defaults, hidden result and actual production handlers.
class Mount{
 isConnected=true;
 set innerHTML(markup){
  this.markup=markup;
  this.nodes=new Map();
  for(const match of markup.matchAll(/<(select|div|p|button)\b([^>]+)>/g)){
   const id=match[2].match(/\bid="([^"]+)"/)?.[1];
   if(!id)continue;
   const node={value:'',textContent:'',innerHTML:'',hidden:/\bhidden\b/.test(match[2])};
   if(match[1]==='select'){
    const options=markup.slice(match.index+match[0].length).split('</select>')[0];
    node.value=options.match(/<option value="([^"]+)" selected>/)?.[1]||'';
   }
   this.nodes.set('#'+id,node);
  }
 }
 querySelector(selector){return this.nodes.get(selector)||null;}
}
let owns=true;
const mount=new Mount(),cleanup=bindGammaPeriodicity({root:mount,isCurrent:()=>owns});
const field=mount.querySelector('#gp-field'),route=mount.querySelector('#gp-route');
const guess=mount.querySelector('#gp-predict'),check=mount.querySelector('#gp-check');
const status=mount.querySelector('#gp-status'),output=mount.querySelector('#gp-result');
assert.match(mount.markup,/id="gp-status" role="status" aria-atomic="true"/);
assert.match(mount.markup,/href="#compute\/phonons\?material=gaas"/);
assert.equal(field.value,'rotation');
assert.equal(route.value,'axis');
assert.equal(output.hidden,true);
check.onclick();
assert.match(status.textContent,local(/请选择/,/Choose a displacement field/));
assert.equal(output.hidden,true);
guess.value='same';
check.onclick();
assert.equal(output.hidden,false);
assert.match(output.innerHTML,local(/叉积为零/,/cross product vanishes/));
route.value='a3';
route.onchange();
assert.equal(guess.value,'');
assert.equal(output.hidden,true);
guess.value='same';
check.onclick();
assert.match(status.textContent,local(/请比较/,/Check the displacement difference/));
assert.match(output.innerHTML,/Δu\/a (?:为|=) +\(−0\.02, 0\.02, 0\)/);
field.value='optical';
field.onchange();
assert.equal(output.hidden,true);
guess.value='same';
check.onclick();
assert.match(output.innerHTML,/\(0, 0, −0\.16\)/);
assert.match(output.innerHTML,local(/满足 Γ 点周期条件/,/satisfies Γ-point periodicity/));
owns=false;
route.onchange();
assert.equal(output.hidden,false,'A detached owner cannot clear the current result');
owns=true;
cleanup();
status.textContent='finished';
check.onclick();
assert.equal(status.textContent,'finished','Explicit cleanup prevents stale callbacks');

const prefix=english?'../dist/en/':'../dist/';
const {parseClassroomRoute}=await import(prefix+'classroom-ui.js');
const {renderObservablesView}=await import(prefix+'observables-ui.js');
const expectedSelection=parseClassroomRoute('classroom/observables?material=gaas&lesson=acoustic-optical');
const container=new Container();
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL(prefix+String(url).split('?')[0],import.meta.url)))});
const stop=await renderObservablesView({container,selection:expectedSelection,run:()=>assert.fail('Opening the Γ exercise cannot run Python')});
const detail=container.querySelector('[data-obs-gamma-entry]');
const body=detail.querySelector('[data-obs-gamma-body]');
assert.equal(body.innerHTML,'','Closed classroom exercise loads no component');
detail.open=true;
detail.ontoggle();
assert.match(body.textContent,local(/正在载入演示/,/Loading the demonstration/));
detail.open=false;
detail.ontoggle();
for(let i=0;i<6;i++)await new Promise(setImmediate);
assert.equal(body.innerHTML,'','An already closed disclosure cannot mount after import');
detail.open=true;
detail.ontoggle();
for(let i=0;i<20&&!body.querySelector('#gp-check');i++)await new Promise(setImmediate);
assert.ok(body.querySelector('#gp-check'),'The real classroom route mounts the interactive exercise');
stop();
assert.equal(body.innerHTML,'');
assert.equal(detail.ontoggle,null);

console.log(`GaAs Γ periodicity (${english?'English':'Chinese'}): exact sites, translations, optical controls, axis counterexample, component ownership and classroom mount passed.`);
