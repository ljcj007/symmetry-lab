import assert from 'node:assert/strict';

// A controlled transport exercises cancellation and late events without a CDN.
const transports=[];
globalThis.Worker=class {
 constructor(){this.messages=[];this.terminated=false;transports.push(this);}
 postMessage(message){this.messages.push(message);}
 terminate(){this.terminated=true;}
 reply(data){this.onmessage({data});}
};
const {runPythonTask,cancelPython,onPythonStatus}=await import('../dist/python-client.js');
const states=[];
const unsubscribe=onPythonStatus(state=>states.push(state.status));
const first=runPythonTask('analyze',{k:[0,0,0]});
await assert.rejects(runPythonTask('crystkit',{}),/已有 Python 任务/);
const old=transports[0],oldId=old.messages[0].id;
const cancelled=assert.rejects(first,/已取消/);
cancelPython();
await cancelled;
assert.equal(old.terminated,true);
const second=runPythonTask('magnetictb',{action:'bands'});
const fresh=transports[1],id=fresh.messages[0].id;
old.onerror({message:'late event from terminated worker'});
old.reply({id:oldId,result:{stale:true}});
fresh.reply({id,status:'running',message:'calculating'});
fresh.reply({id,result:{value:7}});
assert.deepEqual(await second,{value:7});
assert.equal(fresh.terminated,false);
const bad=runPythonTask('crystkit',{action:'invalid'});
const failed=assert.rejects(bad,/invalid action/);
fresh.reply({id:fresh.messages.at(-1).id,error:'invalid action'});
await failed;
const retry=runPythonTask('crystkit',{action:'analyze'});
fresh.reply({id:fresh.messages.at(-1).id,result:{verified:true}});
assert.deepEqual(await retry,{verified:true});
assert.ok(states.includes('running')&&states.includes('error')&&states.includes('ready'));
// Exact 4096-dimensional recoupling gets a bounded longer computation window;
// loading still has its own deadline, and timeout really terminates the worker.
const setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,timers=[];
try {
  globalThis.setTimeout=(callback,delay)=>{const timer={callback,delay};timers.push(timer);return timer;};
  globalThis.clearTimeout=timer=>{if(timer)timer.cleared=true;};
  const heavy=runPythonTask('teaching_labs',{lab:'lie',experiment:'su3_ninej',factors:[[1,1],[1,1],[1,1],[1,1]]});
  assert.equal(timers.at(-1).delay,180000);
  const loading=timers.at(-1);
  fresh.reply({id:fresh.messages.at(-1).id,status:'running',message:'exact recoupling'});
  assert.equal(loading.cleared,true);
  assert.equal(timers.at(-1).delay,600000);
  const timedOut=assert.rejects(heavy,/超过 600 秒/);
  timers.at(-1).callback();await timedOut;
  assert.equal(fresh.terminated,true);
  const regular=runPythonTask('analyze',{}),normal=transports.at(-1);
  normal.reply({id:normal.messages.at(-1).id,status:'running',message:'analyzing'});
  assert.equal(timers.at(-1).delay,180000);
  normal.reply({id:normal.messages.at(-1).id,result:{ok:true}});await regular;
} finally {globalThis.setTimeout=setTimer;globalThis.clearTimeout=clearTimer;}
unsubscribe();cancelPython();
console.log('Python client: serial dispatch, cancellation, stale-worker isolation, error recovery and bounded exact-recoupling timeout passed.');
