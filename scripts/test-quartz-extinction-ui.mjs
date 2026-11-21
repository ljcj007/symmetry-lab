import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const edition = new URL(english ? '../dist/en/' : '../dist/', import.meta.url);
const {quartzExtinctionHTML,bindQuartzExtinction} = await import(new URL('quartz-extinction-ui.js', edition));
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/quartz-extinction.json',import.meta.url),'utf8'));
const path = new URL('../dist/data/examples/quartz-298k/9005017.cif',import.meta.url);
const raw = Uint8Array.from(fs.readFileSync(path));
const response = {ok:true,arrayBuffer:async () => raw.buffer};
globalThis.document = {compatMode:'CSS1Compat',createElement:tag => new Element(tag)};
Element.prototype.focus = function(){document.activeElement=this;};

function mount({fetchCif, calculate} = {}) {
  const host = new Container();
  host.innerHTML = quartzExtinctionHTML();
  const requests = [], tasks = [];
  const cleanup = bindQuartzExtinction(host, {
    fetchSource(url,{signal}){
      assert.equal(url.pathname,new URL('data/examples/quartz-298k/9005017.cif',edition).pathname);
      requests.push(signal);
      return fetchCif ? fetchCif() : Promise.resolve(response);
    },
    run(action,input){
      assert.equal(action,'quartz_extinction');
      assert.deepEqual(input,{content:fs.readFileSync(path,'utf8')});
      tasks.push(input);
      return calculate ? calculate() : Promise.resolve(fixture);
    }
  });
  const $ = selector => host.querySelector(selector);
  return {host,requests,tasks,cleanup,submit:() => $('[data-qe-form]').onsubmit({preventDefault(){}}),
    choose(id,value){const select=$('#qe-'+id);select.value=value;select.onchange();},
    cancel:() => $('[data-qe-cancel]').onclick(),output:$('[data-qe-result]')};
}

const view=mount();
await view.submit();
assert.equal(view.requests.length,0);
view.choose('axial','all');
await view.submit();
assert.equal(view.requests.length,0,'Selecting only one prediction must leave the file and worker idle.');
assert.equal(document.activeElement,view.host.querySelector('#qe-phase'));
view.choose('phase','intensity');
await view.submit();
assert.equal(view.requests.length,1);
assert.equal(view.tasks.length,1);
assert.match(view.output.textContent,english ? /zero intensities in the first two rows/u : /前两行的零强度/u);
assert.match(view.output.textContent,english ? /active-inversion rows/u : /固定晶轴反演两行/u);
const boxes=view.output.querySelectorAll('tbody');
const table=(body,from) => body.querySelectorAll('tr').map(row => row.querySelectorAll('td').slice(from).map(cell => cell.textContent));
assert.deepEqual(table(boxes[0],0),[['0','0'],['0','0'],['150.013','150.013']]);
assert.deepEqual(table(boxes[1],1), [
  ['-16.529','-28.629','1092.864'],['-16.529','28.629','1092.864'],
  ['-16.529','28.629','1092.864'],['-16.529','28.629','1092.864'],['-16.529','-28.629','1092.864']
]);
assert.match(view.output.innerHTML,/<details><summary>/u);
assert.doesNotMatch(view.output.innerHTML,/katex-error/u);
assert.deepEqual(view.output.querySelectorAll('a').slice(-2).map(link => link.getAttribute('href')),
  ['#structure?quartz-hand=practice','#compute/diffraction']);
view.choose('axial','thirds');
view.choose('phase','conjugate');
assert.equal(view.output.innerHTML,'');
await view.submit();
assert.match(view.output.textContent,english ? /Your axial prediction was correct/u : /轴向预测正确/u);
assert.match(view.output.textContent,english ? /Your off-axis prediction was correct/u : /离轴预测正确/u);
view.cleanup();

let resolveFetch;
const fetching=mount({fetchCif:() => new Promise(resolve => {resolveFetch=resolve;})});
fetching.choose('axial','thirds');
fetching.choose('phase','conjugate');
const fetchSubmission=fetching.submit();
fetching.cancel();
assert.equal(fetching.requests[0].aborted,true);
resolveFetch(response);
await fetchSubmission;
assert.equal(fetching.tasks.length,0,'Cancel while reading the source prevents launching a stale worker.');
fetching.cleanup();

let resolveTask, cancels=0;
const running=mount({calculate(){
  const task=new Promise(resolve => {resolveTask=resolve;});
  task.cancel=() => {cancels++;};
  return task;
}});
running.choose('axial','thirds');
running.choose('phase','conjugate');
const runningSubmission=running.submit();
await flush();
assert.equal(running.tasks.length,1);
running.cleanup();
assert.equal(cancels,1,'Leaving the panel must cancel its active worker request.');
resolveTask(fixture);
await runningSubmission;
assert.equal(running.output.innerHTML,'');
console.log(`Quartz extinction UI (${english ? 'EN' : 'CN'}): prediction gate, actual CIF/core fixture, axial and Friedel controls, route handoffs and safe cancellation.`);
