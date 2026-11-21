import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const edition = new URL(english ? '../dist/en/' : '../dist/', import.meta.url);
const {quartzConjugacyHTML,bindQuartzConjugacy} = await import(new URL('quartz-conjugacy-ui.js', edition));
const result = JSON.parse(fs.readFileSync(new URL('./fixtures/quartz-conjugacy.json', import.meta.url), 'utf8'));
const file = new URL('../dist/data/examples/quartz-298k/9005017.cif', import.meta.url);
const bytes = Uint8Array.from(fs.readFileSync(file));
const response = {ok:true,arrayBuffer:async () => bytes.buffer};
const event = {preventDefault(){}};

globalThis.document = {compatMode:'CSS1Compat',createElement:tag => new Element(tag)};
Element.prototype.focus = function(){document.activeElement=this;};

function mount({fetchCif, calculate} = {}) {
  const host = new Container();
  host.innerHTML = quartzConjugacyHTML();
  const requests = [], tasks = [];
  const cleanup = bindQuartzConjugacy(host, {
    fetchSource(url,options){
      assert.equal(url.pathname, new URL('data/examples/quartz-298k/9005017.cif', edition).pathname);
      requests.push(options.signal);
      return fetchCif ? fetchCif() : Promise.resolve(response);
    },
    run(action,input){
      assert.equal(action,'quartz_conjugacy');
      assert.equal(input.content,fs.readFileSync(file,'utf8'));
      tasks.push(input);
      return calculate ? calculate() : Promise.resolve(result);
    }
  });
  const $ = selector => host.querySelector(selector);
  return {host,requests,tasks,cleanup,submit:() => $('[data-qc-form]').onsubmit(event),
    choose(row){const select=$('#qc-prediction');select.value=String(row);select.onchange();},
    cancel:() => $('[data-qc-cancel]').onclick(),output:$('[data-qc-result]'),status:$('[data-qc-status]')};
}

const view = mount();
assert.equal(view.requests.length,0);
await view.submit();
assert.equal(view.requests.length,0,'A prediction is required before fetching the original CIF');
assert.equal(view.tasks.length,0);
view.choose(2);
await view.submit();
assert.equal(view.requests.length,1);
assert.equal(view.tasks.length,1);
assert.match(view.output.textContent,english ? /computed result.*CIF row 4/u : /对照计算结果.*CIF 行号 4/u);
const values = view.output.querySelectorAll('tbody')[0].querySelectorAll('tr').map(row => row.querySelectorAll('td').slice(1).map(cell => cell.textContent));
assert.deepEqual(values,[['3','6'],['1','0'],['0','0']]);
assert.doesNotMatch(view.output.innerHTML,/katex-error/);
assert.match(view.output.innerHTML,/<details><summary>/u,'Exact coordinate comparison starts collapsed');
const routes = view.output.querySelectorAll('a').map(link => link.getAttribute('href').replaceAll('&amp;','&'));
assert.deepEqual(routes,[
  '#classroom/foundations?module=theorems&experiment=conjugacy',
  '#classroom/foundations?module=demos&experiment=projection&preset=triangle-permutation'
]);
view.choose(4);
await view.submit();
assert.match(view.output.textContent,english ? /Your prediction was correct/u : /预测正确/u);
view.cleanup();

let resolveFetch;
const pendingFetch = mount({fetchCif:() => new Promise(resolve => {resolveFetch=resolve;})});
pendingFetch.choose(4);
const abortedSubmission = pendingFetch.submit();
pendingFetch.cancel();
assert.equal(pendingFetch.requests[0].aborted,true);
resolveFetch(response);
await abortedSubmission;
assert.equal(pendingFetch.tasks.length,0);
pendingFetch.cleanup();

let resolveTask, cancellations=0;
const pendingWorker = mount({calculate(){
  const task = new Promise(resolve => {resolveTask=resolve;});
  task.cancel = () => {cancellations++;};
  return task;
}});
pendingWorker.choose(4);
const retiredSubmission = pendingWorker.submit();
await flush();
assert.equal(pendingWorker.tasks.length,1);
pendingWorker.cleanup();
assert.equal(cancellations,1);
resolveTask(result);
await retiredSubmission;
assert.equal(pendingWorker.output.innerHTML,'');

console.log(`Quartz conjugacy UI (${english ? 'EN' : 'CN'}): prediction before fetch, byte-preserved CIF, original calculation replay, fixed-site characters, class links and request disposal.`);
