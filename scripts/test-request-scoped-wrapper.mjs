import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';

// Exercise the real application wrapper with the real shared client. A naked
// client Promise test would miss cancellation lost by an async outer wrapper.
const transports=[];
globalThis.Worker=class{
 constructor(){this.messages=[];this.terminated=false;transports.push(this);}
 postMessage(message){this.messages.push(message);}
 terminate(){this.terminated=true;}
 reply(data){this.onmessage({data});}
};
const {runPythonTask:executePythonTask,cancelPython}=await import('../dist/python-client.js');
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const declaration=parse(source,{sourceType:'module',ecmaVersion:'latest'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='runPythonTask');
assert.ok(declaration);
const captured=[],state={route:'classroom/foundations',view:'pointgroups',courseRoute:{material:'sample'}};
const context={executePythonTask,state,renderTicket:7,structuredClone,Object,Error,
 document:{querySelector:()=>({textContent:'First lesson'})},mathSourceText:n=>n.textContent,
 structureHandoffForCalculation:value=>value.valid?{verified:true}:null,
 captureCalculation:(...args)=>captured.push(args)};
vm.createContext(context);
vm.runInContext(source.slice(declaration.start,declaration.end)+'\nthis.run=runPythonTask;',context);
const reply=value=>{const t=transports.at(-1);t.reply({id:t.messages.at(-1).id,result:value});};

const input={lab:'composition',point:[1,2]};
const first=context.run('teaching_labs',input);
assert.equal(typeof first.cancel,'function');assert.deepEqual(Object.keys(first),[]);
const busy=context.run('analyze',{});assert.equal(busy.cancel(),false);
await assert.rejects(busy,/已有 Python 任务/);
assert.equal(transports[0].terminated,false);
input.point[0]=2;reply({ok:1});assert.deepEqual(await first,{ok:1});
assert.equal(captured.length,1);assert.deepEqual(captured[0][1],{lab:'composition',point:[1,2]});
assert.equal(captured[0][3].title,'First lesson');
const second=context.run('analyze',{}),secondWorker=transports.at(-1);
assert.equal(first.cancel(),false);assert.equal(secondWorker.terminated,false);
const cancelled=assert.rejects(second,/已取消/);assert.equal(second.cancel(),true);await cancelled;
assert.equal(captured.length,1);assert.equal(second.cancel(),false);
const later=context.run('analyze',{});assert.equal(second.cancel(),false);
context.renderTicket++;reply({late:true});await later;
assert.equal(captured.length,1,'Detached calculation results retain their existing no-capture rule');
const live=context.run('analyze',{});
const invalid=context.run('analyze',{}, {structureHandoff:{valid:false}});
assert.equal(invalid.cancel(),false);await assert.rejects(invalid,/结构来源/);
assert.equal(transports.at(-1).terminated,false,'Pre-dispatch validation cannot cancel the live owner');
reply({live:true});await live;assert.equal(captured.length,2);
state.view='flagship';const flagship=context.run('analyze',{});reply({flagship:true});await flagship;
assert.equal(captured.length,2);
state.view='pointgroups';const grading=context.run('symmetry_grading',{});reply({grade:true});await grading;
assert.equal(captured.length,2);
const handed=context.run('analyze',{}, {structureHandoff:{valid:true}});reply({handed:true});await handed;
assert.equal(captured.length,3);assert.equal(captured[2][3].structureHandoff.verified,true);
cancelPython();
console.log('Actual app wrapper and shared client: request-scoped cancellation survives capture, busy/validation/stale requests cannot cancel another task, and snapshot/route/flagship/grading/handoff capture rules remain unchanged.');
