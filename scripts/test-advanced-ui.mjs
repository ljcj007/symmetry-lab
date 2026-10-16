import assert from 'node:assert/strict';
import {renderAdvancedView} from '../dist/advanced-ui.js';

// Minimal inert DOM: exercise the actual asynchronous UI handlers, including
// clicking Run before a slow example response has arrived.
class Container {
  dataset = {researchView:'advanced'};
  set innerHTML(html) {
    this.html = html; this.elements = new Map(); this.tabs = [];
    for (const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
      const element = {disabled:/\sdisabled(?:\s|>)/.test(tag[0]), value:'',
        addEventListener(type,handler){this['on'+type]=handler;},
        click(){if(!this.disabled)return this.onclick?.();}};
      this.elements.set('#'+tag[1], element);
    }
    for (const tag of html.matchAll(/data-exact-tool="([^"]+)"/g)) this.tabs.push({dataset:{exactTool:tag[1]}});
  }
  querySelector(selector){return this.elements.get(selector)||null;}
  querySelectorAll(selector){return selector==='[data-exact-tool]'?this.tabs:[];}
}
const container = new Container();
const calls = [];
renderAdvancedView({container,run:async(tool,payload)=>{calls.push({tool,payload});return {expression:'2'};},toast:()=>{},download:()=>{}});
container.tabs.find(b=>b.dataset.exactTool==='symbolic').onclick();
container.querySelector('#exact-example').onchange({target:{value:'chain'}});
let resolveFetch;
const originalFetch = globalThis.fetch;
globalThis.fetch = () => new Promise(resolve=>{resolveFetch=resolve;});
try {
  const pending = container.querySelector('#exact-load').onclick();
  assert.ok(container.querySelector('#exact-run').disabled, 'Run must be disabled while downloading an example');
  assert.ok(container.querySelector('#exact-input').disabled);
  await container.querySelector('#exact-run').onclick(); // Even a programmatic event must be guarded.
  assert.equal(calls.length,0);
  resolveFetch({ok:true,json:async()=>({action:'algebra',expression:'1+1'})});
  await pending;
  assert.equal(container.querySelector('#exact-run').disabled,false);
  await container.querySelector('#exact-run').onclick();
  assert.deepEqual(calls,[{tool:'symbolic',payload:{action:'algebra',expression:'1+1'}}]);
  assert.match(container.html,/符号结果/);

  const failed = container.querySelector('#exact-load').onclick();
  resolveFetch({ok:false});
  await failed;
  assert.equal(container.querySelector('#exact-run').disabled,false,'A failed download must release the input');
  assert.match(container.html,/示例加载失败/);

  const switched = container.querySelector('#exact-load').onclick();
  container.tabs.find(b=>b.dataset.exactTool==='crystkit_ext').onclick();
  const visible = container.html;
  resolveFetch({ok:true,json:async()=>({action:'algebra',expression:'3'})});
  await switched;
  assert.equal(container.html,visible,'Completing a background load must not replace another tool');
} finally {globalThis.fetch=originalFetch;}
console.log('Advanced UI: slow example/run race, download recovery and background tool isolation passed.');
