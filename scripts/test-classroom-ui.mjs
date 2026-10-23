import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {classroomSections,resolveClassroomRoute,classroomHash,renderClassroomView}=await import('../dist/classroom-ui.js');
for(const [old,canonical] of [['pointgroups','pointgroups'],['academy','crystal'],['lie','lie']]) {
  assert.equal(resolveClassroomRoute(old),old);
  assert.equal(resolveClassroomRoute('classroom/'+canonical),old);
  assert.equal(classroomHash(old),'#classroom/'+canonical);
}
assert.equal(resolveClassroomRoute('classroom','academy'),'academy');
assert.equal(resolveClassroomRoute('classroom','unknown'),'pointgroups');
assert.equal(resolveClassroomRoute('workbench'),null);
class Container {
  isConnected=true;
  set innerHTML(html){
    if(this.firstElementChild)this.firstElementChild.parentNode=null;
    this.html=html;this.child={};
    this.buttons=classroomSections.map(s=>({dataset:{classroomSection:s.id},focus:()=>{this.focused=s.id;}}));
    this.firstElementChild={parentNode:this,querySelectorAll:()=>this.buttons,querySelector:()=>this.child};
  }
  querySelector(selector){return this.buttons.find(b=>selector==='#classroom-tab-'+b.dataset.classroomSection);}
}
const c=new Container(),calls=[],opened=[];
const courseRenderers=Object.fromEntries(classroomSections.map(s=>[s.id,options=>calls.push({section:s.id,...options})]));
const show=section=>renderClassroomView({container:c,section,onSection:show,courseRenderers,openGroup:s=>opened.push(s)});
show('pointgroups');
assert.equal(calls.at(-1).container,c.child);
calls.at(-1).openGroup(99);
assert.deepEqual(opened[0],{mode:'sg',id:99,k:[0,0,0],doubleValued:false});
c.buttons[1].onclick();assert.equal(calls.at(-1).section,'academy');
const magnetic={mode:'msg',id:'1.3',k:[0,0,.5],doubleValued:true};
calls.at(-1).openGroup(magnetic);assert.deepEqual(opened[1],magnetic);
let prevented=0;
c.buttons[1].onkeydown({key:'ArrowRight',preventDefault(){prevented++;}});
assert.equal(calls.at(-1).section,'lie');assert.equal(c.focused,'lie');assert.equal(prevented,1);
c.buttons[2].onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(calls.at(-1).section,'pointgroups');
c.buttons[0].onkeydown({key:'End',preventDefault(){}});assert.equal(calls.at(-1).section,'lie');
c.buttons[2].onkeydown({key:'Home',preventDefault(){}});assert.equal(calls.at(-1).section,'pointgroups');
const count=calls.length;c.isConnected=false;c.buttons[1].onclick();assert.equal(calls.length,count,'Detached tabs cannot trigger navigation');
const index=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
assert.equal((index.match(/data-view="classroom"/g)||[]).length,1);
assert.doesNotMatch(index,/data-view="(?:pointgroups|academy)"/,'Only one classroom sidebar entry remains');
console.log('Unified classroom: legacy links, canonical routes, retained selection, keyboard tabs, workbench adapters and detached navigation passed.');
