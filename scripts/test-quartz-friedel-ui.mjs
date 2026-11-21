import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const dist=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {quartzFriedelHTML,bindQuartzFriedel}=await import(new URL('quartz-friedel-ui.js',dist));
const model=JSON.parse(fs.readFileSync(new URL('./fixtures/quartz-friedel.json',import.meta.url),'utf8'));
const relativeSource='data/examples/quartz-298k/9005017.cif';
const file=new URL(relativeSource,new URL('../dist/',import.meta.url));
const bytes=Uint8Array.from(fs.readFileSync(file));
const response={ok:true,arrayBuffer:async()=>bytes.buffer};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
Element.prototype.focus=function(){document.activeElement=this;};

function mount({open=false,fetchCif,calculate}={}) {
  const container=new Container();
  container.innerHTML=quartzFriedelHTML({open});
  const host=container.querySelector('[data-quartz-friedel]');
  const requests=[], tasks=[];
  const clean=bindQuartzFriedel(host,{
    fetchSource(url,{signal}){
      assert.equal(url.pathname,new URL(relativeSource,dist).pathname);
      requests.push(signal);
      return fetchCif ? fetchCif() : Promise.resolve(response);
    },
    run(action,input){
      assert.equal(action,'quartz_friedel');
      assert.deepEqual(input,{content:fs.readFileSync(file,'utf8')});
      tasks.push(input);
      return calculate ? calculate() : Promise.resolve(model);
    }
  });
  const $=selector=>host.querySelector(selector);
  return {host,requests,tasks,clean,submit:()=>$('[data-qf-form]').onsubmit({preventDefault(){}}),
    choose(id,value){const select=$('#qf-'+id);select.value=value;select.onchange();},
    toggle(opened){host.open=opened;host.ontoggle();},
    output:$('[data-qf-result]'),status:$('[data-qf-status]')};
}

const idle=mount();
assert.equal(idle.host.open,false);
idle.choose('contrast','110');
idle.choose('mirror','swap');
await idle.submit();
assert.equal(idle.requests.length,0,'Closed details stay idle with completed predictions.');
idle.toggle(true);
assert.equal(idle.requests.length,0,'Opening the details does not fetch.');
assert.equal(idle.tasks.length,0,'Opening the details does not start Python.');
idle.clean();

const view=mount({open:true});
assert.equal(view.host.open,true,'Exact lesson links can open the advanced disclosure.');
await view.submit();
assert.equal(view.requests.length,0);
assert.equal(view.tasks.length,0);
view.choose('contrast','101');
await view.submit();
assert.equal(view.requests.length,0);
assert.equal(document.activeElement,view.host.querySelector('#qf-mirror'));
view.choose('mirror','same');
assert.equal(view.requests.length,0,'Selecting both predictions leaves the source idle.');
await view.submit();
assert.equal(view.requests.length,1);
assert.equal(view.tasks.length,1);
assert.match(view.output.textContent,english ? /only the 110 pair has unequal intensities/u : /只有 110 呈现强度差/u);
assert.match(view.output.textContent,english ? /swaps the two intensities/u : /互换两个方向的强度/u);
const table=view.output.querySelector('tbody');
const cells=id=>table.querySelector('[data-qf-case="'+id+'"]').querySelectorAll('td').slice(1).map(cell=>cell.textContent);
assert.deepEqual(cells('real110'),['688.492','688.492','0','0%']);
assert.deepEqual(cells('illustrative110'),['746.039','634.215','111.824','8.10%']);
assert.deepEqual(cells('mirrored110'),['634.215','746.039','-111.824','-8.10%']);
assert.deepEqual(cells('illustrative101'),['1095.600','1095.600','0','0%']);
assert.deepEqual(cells('illustrative001'),['0','0','0','—']);
assert.deepEqual(cells('illustrative003'),['159.013','159.013','0','0%']);
assert.equal(view.output.querySelector('[role="region"]').getAttribute('tabindex'),'0');
assert.doesNotMatch(view.output.innerHTML,/katex-error/u);
assert.match(view.host.textContent,english ? /response that depends on energy and polarization/u : /涉及能量与偏振相关/u);
assert.match(view.output.textContent,english ? /their intensities add in the powder peak/u : /合并到粉末棒峰时要相加强度/u);
view.choose('contrast','110');
view.choose('mirror','swap');
assert.equal(view.output.innerHTML,'');
await view.submit();
assert.match(view.output.textContent,english ? /intensity difference was correct/u : /强度差预测正确/u);
assert.match(view.output.textContent,english ? /inversion prediction was correct/u : /反演预测正确/u);
view.clean();

let resolveFetch;
const fetching=mount({open:true,fetchCif:()=>new Promise(resolve=>{resolveFetch=resolve;})});
fetching.choose('contrast','110');
fetching.choose('mirror','swap');
const fetchSubmission=fetching.submit();
fetching.toggle(false);
assert.equal(fetching.requests[0].aborted,true);
resolveFetch(response);
await fetchSubmission;
assert.equal(fetching.tasks.length,0,'Closing during a source fetch prevents a late worker.');
fetching.clean();

let resolveTask, cancels=0;
const running=mount({open:true,calculate(){
  const task=new Promise(resolve=>{resolveTask=resolve;});
  task.cancel=()=>{cancels++;};
  return task;
}});
running.choose('contrast','110');
running.choose('mirror','swap');
const runSubmission=running.submit();
await flush();
assert.equal(running.tasks.length,1);
running.clean();
assert.equal(cancels,1);
resolveTask(model);
await runSubmission;
assert.equal(running.output.innerHTML,'');

const malformed=mount({open:true,calculate:()=>Promise.resolve({...model,source:{...model.source,sha256:'wrong'}})});
malformed.choose('contrast','110');
malformed.choose('mirror','swap');
await malformed.submit();
assert.equal(malformed.output.innerHTML,'');
assert.match(malformed.status.textContent,english ? /Could not complete the Friedel-pair check/u : /弗里德尔对计算暂未完成/u);
malformed.clean();
console.log(`Quartz Friedel UI (${english?'EN':'CN'}): idle disclosure, two predictions, actual fixture and cancellation passed.`);
