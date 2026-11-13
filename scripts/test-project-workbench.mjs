import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectWorkbenchSelection,canRestoreProjectWorkbench} from '../dist/project-workbench.js';
import {buildWorkbenchRoute,parseWorkbenchSelection} from '../dist/workbench-route.js?v=20261113-support1';

const groups=JSON.parse(fs.readFileSync(new URL('../dist/data/space-groups.json',import.meta.url),'utf8')).groups;
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/pathways-projects.json',import.meta.url),'utf8'));
const real=fixtures.requests['site-bloch-little-group/little'];
assert.equal(real.action,'analyze');assert.equal(real.input.group_number,4);
const input=structuredClone(real.input),before=structuredClone(input),catalogBefore=structuredClone(groups);
let calls=0;
globalThis.fetch=()=>{calls++;throw Error('Pure restoration must not fetch data');};
globalThis.compute=()=>{calls++;throw Error('Pure restoration must not calculate');};
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){calls++;throw Error('Pure restoration must not read or write storage');}});

const selection=projectWorkbenchSelection(input,groups);
assert.deepEqual(selection,{mode:'sg',id:'4',k:[0,0,.5],doubleValued:false,bzType:'',labelK:null});
assert.equal(canRestoreProjectWorkbench(input,groups),true);
assert.deepEqual(parseWorkbenchSelection(buildWorkbenchRoute(selection).split('?')[1]),selection);
for(const parameters of [
 {k:[0,0,0]},
 {k:[0,0,0],bz_type:'MonoPrim',k_label:'Γ',doubleValued:true},
 {k:[0,0,.5],bz_type:'MonoPrim',k_label:'Z',doubleValued:true},
 {k:[.125,-.25,.375],bz_type:'',k_label:'custom metadata label'},
 {k:[100,-100,.5],doubleValued:false}
]){
 const request={...structuredClone(input),...parameters},result=projectWorkbenchSelection(request,groups);
 assert.deepEqual(result.k,request.k);assert.equal(result.doubleValued,request.doubleValued);assert.equal(result.bzType,request.bz_type||'');
 assert.equal(result.labelK,request.k_label||(request.k.every(x=>x===0)?'Γ':null));
 assert.deepEqual(parseWorkbenchSelection(buildWorkbenchRoute(result).split('?')[1]),result);
}
const detached=projectWorkbenchSelection(input,groups);detached.k[2]=.1;assert.deepEqual(input,before);assert.deepEqual(groups,catalogBefore);
const reordered=structuredClone(input);reordered.operations=reordered.operations.map(operation=>Object.fromEntries(Object.entries(operation).reverse()));assert.equal(canRestoreProjectWorkbench(reordered,groups),true,'JSON property order does not change an operation');

const rejects=(change,pattern)=>{
 const request=structuredClone(input);change(request);assert.throws(()=>projectWorkbenchSelection(request,groups),pattern);assert.equal(canRestoreProjectWorkbench(request,groups),false);
};
for(const value of [null,{},[],4,'4'])assert.throws(()=>projectWorkbenchSelection(value,groups));
for(const number of [0,231,4.5,'4',NaN,Infinity])rejects(x=>x.group_number=number,/编号/);
assert.throws(()=>projectWorkbenchSelection(input,[]),/未找到唯一/);
assert.throws(()=>projectWorkbenchSelection(input,{}),/数据库尚未载入/);
assert.throws(()=>projectWorkbenchSelection(input,[groups[3],structuredClone(groups[3])]),/未找到唯一/);
rejects(x=>x.operations.reverse(),/自定义操作/);
rejects(x=>x.operations[1].translation[2]=0,/自定义操作/);
rejects(x=>x.operations[0].name='renamed identity',/自定义操作/);
rejects(x=>x.operations[0].antiunitary=true,/自定义操作/);
rejects(x=>x.operations[0].spinRotation[0][0][0]=-1,/自定义操作/);
rejects(x=>x.operations[0].apiOnlyFlag=true,/自定义操作/);
rejects(x=>delete x.operations,/自定义操作/);
rejects(x=>x.basis[0][1]+=1e-14,/自定义基底/);
rejects(x=>x.basis[0][1]=NaN,/自定义基底/);
rejects(x=>delete x.basis,/自定义基底/);
for(const k of [[0,0],[0,0,0,0],['0',0,0],[NaN,0,0],[Infinity,0,0],[0,-100.001,0],Array(3)])rejects(x=>x.k=k,/波矢/);
for(const value of ['false',0,1,null,undefined])rejects(x=>x.doubleValued=value,/表示类型/);
for(const value of ['not-a-BZ','MonoPrim ',4,null,undefined])rejects(x=>x.bz_type=value,/BZ/);
for(const value of ['', '  ',4,null,undefined,'Z\u0000','X'.repeat(129)])rejects(x=>x.k_label=value,/标准标签/);
for(const [key,value]of [['includeMatrices',false],['includeMatrices',true],['tolerance',1e-8],['mode','msg'],['originShift',[0,0,0]]])rejects(x=>x[key]=value,/额外计算设置/);
assert.throws(()=>projectWorkbenchSelection({...input,[Symbol('api setting')]:1},groups),/额外计算设置/);

// Every registered ordinary group uses its own operation ordering and metric.
for(const group of groups){
 const request={operations:group.operations,basis:group.basis,k:[0,0,0],doubleValued:false,group_number:group.number};
 const result=projectWorkbenchSelection(request,groups);assert.equal(result.id,String(group.number));assert.equal(result.labelK,'Γ');
 for(const bz of group.bzTypes||[]){const withBZ=projectWorkbenchSelection({...request,bz_type:bz,doubleValued:true},groups);assert.equal(withBZ.bzType,bz);assert.equal(withBZ.doubleValued,true);}
}
assert.equal(calls,0);assert.deepEqual(input,before);assert.deepEqual(groups,catalogBefore);
console.log('Project workbench snapshots: real SG4 fixture, all 230 standard groups, explicit BZ/labels/spin/k roundtrips, exact operations and primitive basis, mutation isolation, unsupported custom/extra settings, finite ranges, and zero computation/network/storage passed.');
