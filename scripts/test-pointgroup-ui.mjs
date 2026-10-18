import assert from 'node:assert/strict';
import fs from 'node:fs';

// Exercise actual loader failures and navigation races without a browser engine.
const atlas=JSON.parse(fs.readFileSync(new URL('../dist/data/pointgroup-atlas.json',import.meta.url),'utf8'));
const lessons={lessons:[],source:{title:'Fixture'}};
globalThis.localStorage={getItem:()=>'{invalid',setItem:()=>{}};
class Container {
  set innerHTML(value){
    if(this.firstElementChild)this.firstElementChild.parentNode=null;
    this.html=value;
    this.firstElementChild={parentNode:this,innerHTML:'',retry:{},querySelector(selector){return selector==='.pg-retry'?this.retry:null;}};
  }
}
const waiting=[];
globalThis.fetch=url=>new Promise(resolve=>waiting.push({url,resolve}));
const race=await import('../dist/pointgroup-ui.js?loader-race');
const container=new Container();
const pending=race.renderPointgroupView({container});
assert.equal(waiting.length,2);
container.innerHTML='<p>Unrelated scientific tool</p>';
for(const item of waiting)item.resolve({ok:true,json:async()=>item.url.includes('lessons')?lessons:atlas});
await pending;
assert.equal(container.html,'<p>Unrelated scientific tool</p>','A completed background lesson fetch must not replace the active tool');
const exported=race.getPointgroupResult();
assert.equal(exported.pointGroup.hm,'mm2');
assert.deepEqual(exported.experiment.result,exported.experiment.initialPoint);
assert.equal(exported.experiment.fullGroupOrbit.length,4);

globalThis.fetch=async()=>({ok:false,status:503});
const retry=await import('../dist/pointgroup-ui.js?loader-retry');
const errorContainer=new Container();
await retry.renderPointgroupView({container:errorContainer});
assert.match(errorContainer.firstElementChild.innerHTML,/503/);
const retryButton=errorContainer.firstElementChild.retry;
assert.equal(typeof retryButton.onclick,'function');
const retries=[];
globalThis.fetch=url=>new Promise(resolve=>retries.push({url,resolve}));
const retried=retryButton.onclick();
assert.equal(retries.length,2,'A failed load must clear the rejected cached promise');
errorContainer.innerHTML='<p>Left during retry</p>';
for(const item of retries)item.resolve({ok:true,json:async()=>item.url.includes('lessons')?lessons:atlas});
await retried;
assert.equal(errorContainer.html,'<p>Left during retry</p>');
assert.equal(retry.getPointgroupResult().pointGroup.hm,'mm2');
console.log('Point-group UI: malformed stored progress, failed-fetch recovery, late navigation isolation and verified atlas export passed.');
