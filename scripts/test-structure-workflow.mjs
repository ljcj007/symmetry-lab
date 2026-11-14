import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Element,Container,flush} from './test-material-research-ui.mjs';
import {buildWorkbenchRoute,parseWorkbenchSelection} from '../dist/workbench-route.js';
import {createProjectNavigator} from '../dist/project-navigation.js';
import {validateStructureHandoff,createStructureHandoff,structureHandoffForCalculation} from '../dist/structure-provenance.js';
import * as sourceView from '../dist/structure-handoff.js';
import * as notebook from '../dist/material-notebook.js?v=20261114-evidence1';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/structure-handoff.json',import.meta.url),'utf8'));
const groups=JSON.parse(fs.readFileSync(new URL('../dist/data/space-groups.json',import.meta.url),'utf8')).groups;
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const section=(start,end)=>{const i=app.indexOf(start),j=app.indexOf(end,i);assert.ok(i>=0&&j>i,start);return app.slice(i,j);};
const clone=structuredClone;
Element.prototype.addEventListener=function(name,handler){this['on'+name]=handler;};
Element.prototype.focus=function(){};Element.prototype.select=function(){};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Object.defineProperty(Element.prototype,'classList',{configurable:true,get(){const element=this;return {toggle(name,force){const values=new Set((element.attributes.class||'').split(/\s+/).filter(Boolean)),on=force??!values.has(name);if(on)values.add(name);else values.delete(name);element.attributes.class=[...values].join(' ');},add(name){this.toggle(name,true);},remove(name){this.toggle(name,false);}};}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
 if(selector.includes(','))return [...new Set(selector.split(',').flatMap(s=>this.querySelectorAll(s.trim())))];
 const parts=selector.split(/\s+/);if(parts.length===2)return this.querySelectorAll(parts[0]).flatMap(parent=>queryAll.call(parent,parts[1]));
 return queryAll.call(this,selector);
};
const host=new Container();host.dataset={};host.innerHTML='';const shell={isConnected:true};
const nodes=new Map(['page-title','page-subtitle','view-context','export-top','toast'].map(id=>[id,new Element('div',{id},shell)]));nodes.set('app',host);
const document={querySelector:s=>nodes.get(s.slice(1))||host.querySelector(s),querySelectorAll:s=>host.querySelectorAll(s.replace(/^#app\s+/,'')),createElement:tag=>new Element(tag)};
globalThis.document=document;globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('No automatic localStorage write')};delete globalThis.indexedDB;
const state={view:'home',route:'home',mode:'sg',group:groups[224],primary:'home',k:[0,0,0],doubleValued:false,bzType:'',labelK:null,result:null,calculationTicket:0,busy:false,tab:'characters'};
const calls=[],downloads=[],historyWrites=[],loaded=[],notices=[];const location={hash:''};
let held,hold=false;
const moduleMap=new Map([['structureHandoff',sourceView]]);
const context={state,renderTicket:0,dictionaryController:null,document,URLSearchParams,structuredClone,console,Promise,Math,Object,
 validateStructureHandoff,structureHandoffForCalculation,buildWorkbenchRoute,parseWorkbenchSelection,projectNavigation:createProjectNavigator(),
 optionalViews:{get:async key=>{loaded.push(key);return moduleMap.get(key);},peek:key=>moduleMap.get(key)},
 ensureGroups:async()=>({groups}),groupLoader:{peek:()=>({groups})},databases:{sg:{groups}},list:()=>groups,
 $:s=>document.querySelector(s),$$:s=>document.querySelectorAll(s),
 esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
 gid:(g=state.group)=>String(g.number),gtitle:(g=state.group)=>g.bcSymbol||g.symbol,
 lattices:{},crystalSpan:String,fraction:String,mathSourceText:n=>n?.textContent||'',
 knownTool:()=>null,labels:Object.fromEntries(['home','workbench','notebook','docs'].map(k=>[k,[k,'']])),
 parseClassroomRoute:()=>null,withClassroomNavigationContext:x=>x,isClassroomView:()=>false,
 location,history:{pushState:(value,title,hash)=>{historyWrites.push({value,hash});location.hash=hash;},replaceState:(value,title,hash)=>{historyWrites.push({value,hash});location.hash=hash;}},
 rememberRoute:()=>{},updateBreadcrumb:()=>{},cancelPython:()=>{},toast:message=>notices.push(message),showError:message=>assert.fail(message),
 captureCalculation:notebook.captureCalculation,renderMaterialNotebook:notebook.renderMaterialNotebook,
 renderNavigationHub:async()=>{host.innerHTML='<p>other route</p>';},
 renderResults:()=>{},renderViz:()=>{},exportCSV:()=>{},
 download:(body,name)=>downloads.push({body,name}),
 executePythonTask:async(action,input)=>{calls.push({action,input:clone(input)});assert.equal(action,'analyze');const item=Object.values(fixture.cases).find(x=>x.conversion.group_number===input.group_number&&x.conversion.k_bc.every((v,i)=>v===input.k[i]));assert.ok(item);const result=clone(item.analyses[input.doubleValued?'double':'single'].result);if(hold){hold=false;return new Promise(resolve=>{held=()=>resolve(result);});}return result;}
};
const functions=[
 section('async function runPythonTask(','\nconst optionalViews='),section('async function openWorkbench(','\nconst $='),
 section('function parseNumber(','\nfunction toast('),section('function setView(','\nfunction updateBreadcrumb('),
 section('function workbenchSource(){','\nlet dictionaryController='),section('async function render(){','\nfunction renderWorkbench(){'),
 section('function renderWorkbench(){','\nfunction showSearch('),section('function readCoords(){','\nfunction matrixHTML('),
 section('function exportJSON(){','\nfunction exportCSV(')
].join('\n');
vm.createContext(context);vm.runInContext(functions,context);
const item=fixture.cases['screw-line-plus-reciprocal'];const source=await createStructureHandoff({input:item.request,result:item.conversion,source:{kind:'teaching-example',filename:'screw.cif'},doubleValued:true});
await context.openWorkbench({id:source.structure.groupNumber,k:source.coordinates.bcK,bzType:source.structure.bzType,structureHandoff:source});
assert.equal(calls.length,0,'Source handoff opens settings without automatic single-valued calculation');assert.equal(state.doubleValued,true,notices.join('; '));assert.deepEqual([...state.k],source.coordinates.bcK);assert.ok(host.querySelector('[data-structure-handoff]'),host.innerHTML.slice(0,700));assert.match(host.querySelector('#workbench-structure-source').innerHTML,/尚未关联表示计算/);
assert.ok(state.k.some(x=>x>1));
await host.querySelector('#calculate').onclick();assert.equal(calls.length,1);assert.equal(calls[0].input.doubleValued,true);assert.equal(Object.hasOwn(calls[0].input,'structureHandoff'),false);assert.match(host.querySelector('#workbench-structure-source').innerHTML,/当前数值表示验证通过/);assert.match(host.querySelector('#workbench-structure-source').innerHTML,/部分或未命名/);
context.exportJSON();const exported=JSON.parse(downloads.at(-1).body);assert.deepEqual(exported.structureHandoff,source);
const recorded=notebook.latestCalculation();assert.deepEqual(recorded.structureHandoff,source);assert.equal(Object.hasOwn(recorded.result,'structureHandoff'),false);
// Full app context capture and notebook rerun use the same source; it never enters Python input.
let project=notebook.addRecord(notebook.makeProject({title:'Source association'}),recorded);await notebook.saveProject(project);
const mount=new Container();await notebook.renderMaterialNotebook({container:mount,run:context.runPythonTask,download:()=>{}});assert.match(mount.firstElementChild.innerHTML,/未重新读取原文件/);
await mount.querySelector('#nb-rerun').onclick();let saved=(await notebook.listProjects()).find(x=>x.id===project.id);assert.equal(saved.records.length,2);assert.deepEqual(saved.records[1].structureHandoff,source);assert.deepEqual(notebook.latestCalculation().structureHandoff,source);
const edited=clone(recorded.input);edited.doubleValued=false;mount.querySelector('#nb-rerun-input').value=JSON.stringify(edited);await mount.querySelector('#nb-rerun').onclick();saved=(await notebook.listProjects()).find(x=>x.id===project.id);assert.equal(saved.records.length,3);assert.equal(Object.hasOwn(saved.records.at(-1),'structureHandoff'),false);assert.deepEqual(saved.records[0].structureHandoff,source,'Original source record remains unchanged');
for(const mutate of [p=>p.records[0].structureHandoff.source.text='secret',p=>p.records[0].input.k[0]+=1,p=>p.records[0].structureHandoff.association.q[0]+=1,p=>p.records[0].result.k[0]+=1,p=>p.records[0].action='induce']){const bad=clone(saved);mutate(bad);assert.throws(()=>notebook.importProject(JSON.stringify(bad)));}
// A live parameter change removes the pending-source association. Old source
// metadata stays attached only to its own immutable completed result.
host.querySelector('[data-spin="false"]').onclick();await flush();assert.equal(!!host.querySelector('[data-structure-handoff]'),false);await host.querySelector('#calculate').onclick();context.exportJSON();assert.equal(Object.hasOwn(JSON.parse(downloads.at(-1).body),'structureHandoff'),false);
// Ordinary direct links preserve their established one-calculation behavior.
const before=calls.length;await context.openWorkbench({id:item.conversion.group_number,k:item.conversion.k_bc,bzType:item.conversion.bz_type,doubleValued:true});assert.equal(calls.length,before+1);assert.equal(!!host.querySelector('[data-structure-handoff]'),false);
const reopenSource=()=>context.openWorkbench({id:source.structure.groupNumber,k:source.coordinates.bcK,bzType:source.structure.bzType,structureHandoff:source});
await reopenSource();const coordinate=host.querySelector('#k-0');coordinate.value=String(Number(coordinate.value)+1e-10);coordinate.onchange();await flush();assert.equal(!!host.querySelector('[data-structure-handoff]'),false,'Even a tiny changed k loses the exact source association');
await reopenSource();state.bzType='';await context.render();assert.equal(!!host.querySelector('[data-structure-handoff]'),false,'Changing the BZ naming setting does not reuse the source claim');
await reopenSource();context.selectGroup(groups[0]);await flush();assert.equal(!!host.querySelector('[data-structure-handoff]'),false,'Changing the selected group does not reuse the source claim');
assert.ok(historyWrites.every(x=>x.value===null&&!/sha256|sourceSHA|source=|structureHandoff|symprec|%7B|\{/.test(x.hash)));
assert.equal(JSON.stringify(historyWrites).includes(source.source.sha256),false);
console.log('Structure workflow: actual open/setView/render/bind/calculate/capture/export and notebook reruns; manual source launch, unfolded k/BZ/spin, strict import association, altered-input isolation and no source in URL/history/Python passed.');
