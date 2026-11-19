import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container, flush} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const prefix = english ? '../dist/en/' : '../dist/';
const read = name => JSON.parse(fs.readFileSync(new URL(prefix + 'data/' + name + '.json', import.meta.url)));
const catalog = read('pointgroup-identify');
const atlas = read('pointgroup-atlas');
const select = (root, id, value) => {
  const element = root.querySelector('#' + id);
  assert.ok(element.querySelectorAll('option').some(option => option.value === String(value)));
  element.value = String(value);
  element.onchange({target: element});
};
const click = (root, id) => {
  const element = root.querySelector('#' + id);
  assert.ok(element, 'Expected control ' + id);
  assert.equal(element.disabled, false);
  element.onclick();
};
const controlText = (root, id) => root.querySelector('#' + id).textContent;
const verifyMessage = (root, id, zh, en) => assert.match(controlText(root, id), english ? en : zh);

let fetches = 0;
globalThis.fetch = async url => {
  fetches++;
  assert.match(url.pathname, english ? /\/en\/data\/pointgroup-identify\.json$/ : /\/dist\/data\/pointgroup-identify\.json$/);
  assert.equal(url.search, '?v=20261119-pointgroups1');
  if (fetches === 1) return {ok: false, status: 503};
  return {ok: true, json: async () => catalog};
};
const {bindPointgroupIdentify} = await import(prefix + 'pointgroup-identify-ui.js?component-tests');
const stateStore = new Map();
const handoffs = [];
const mount = (root, isCurrent = () => true) => bindPointgroupIdentify({
  root, atlas, stateStore, isCurrent, openGroup: (id, tab) => handoffs.push([String(id), tab])
});
const root = new Container();
const unbind = mount(root);
await flush();
assert.match(root.querySelector('[role="alert"]').textContent, english ? /Please try again/ : /请重试/);
click(root, 'pgi-retry');
await flush();
assert.equal(fetches, 2);
assert.equal(root.querySelector('#pgi-case').value, 'case-01');
assert.equal(root.querySelector('#pgi-predict').querySelectorAll('option').length, 33);
assert.equal(root.querySelector('#pgi-operation').querySelectorAll('option').length, 2);
assert.equal(root.querySelector('#pgi-candidates').getAttribute('open'), null);
assert.equal(root.querySelector('#pgi-atlas'), null);
assert.match(root.querySelector('.pgi-action').innerHTML, /\(1, 0, 0\)/);
select(root, 'pgi-axis', '2');
assert.match(root.querySelector('.pgi-action').innerHTML, /\(0, 0, 1\)/);
select(root, 'pgi-op-guess', 'proper-2');
click(root, 'pgi-op-check');
verifyMessage(root, 'pgi-op-feedback', /再检查/, /Check the sign/);
select(root, 'pgi-op-guess', 'proper-1');
click(root, 'pgi-op-check');
verifyMessage(root, 'pgi-op-feedback', /判断正确/, /Correct/);
select(root, 'pgi-operation', '1');
assert.equal(root.querySelector('#pgi-op-feedback'), null);
assert.equal(root.querySelector('#pgi-op-check').disabled, true);

select(root, 'pgi-predict', '1');
assert.equal(root.querySelector('#pgi-answer').value, '1');
click(root, 'pgi-review');
verifyMessage(root, 'pgi-review-feedback', /排除了所选点群/, /rules out the selected group/);
assert.equal(root.querySelector('#pgi-atlas'), null);
select(root, 'pgi-answer', '7');
click(root, 'pgi-review');
verifyMessage(root, 'pgi-review-feedback', /与目前证据相容/, /fits the evidence so far/);
assert.equal(root.querySelector('#pgi-atlas'), null);
select(root, 'pgi-interpretation', 'exact');
click(root, 'pgi-interpret-check');
verifyMessage(root, 'pgi-interpret-feedback', /仍是部分观察/, /still partial/);
select(root, 'pgi-interpretation', 'lower');
click(root, 'pgi-interpret-check');
verifyMessage(root, 'pgi-interpret-feedback', /判断正确/, /Correct/);

const oldAnswer = root.querySelector('#pgi-answer');
click(root, 'pgi-next');
assert.equal(root.querySelector('#pgi-operation').querySelectorAll('option').length, 3);
assert.equal(root.querySelector('#pgi-review-feedback'), null);
assert.equal(root.querySelector('#pgi-interpret-feedback'), null);
oldAnswer.onchange({target: {value: '1'}});
assert.equal(root.querySelector('#pgi-answer').value, '7', 'Detached inputs cannot change a new rendering');
click(root, 'pgi-order');
assert.equal(root.querySelector('#pgi-order'), null);
assert.match(controlText(root, 'pgi-count-summary'), /4/);
click(root, 'pgi-full');
assert.equal(root.querySelector('#pgi-operation').querySelectorAll('option').length, 4);
assert.equal(root.querySelector('#pgi-next'), null);
assert.equal(root.querySelector('#pgi-atlas'), null);
click(root, 'pgi-interpret-check');
verifyMessage(root, 'pgi-interpret-feedback', /清单已完整/, /The list is complete/);
select(root, 'pgi-interpretation', 'exact');
click(root, 'pgi-interpret-check');
verifyMessage(root, 'pgi-interpret-feedback', /判断正确/, /Correct/);
select(root, 'pgi-answer', '6');
click(root, 'pgi-review');
verifyMessage(root, 'pgi-review-feedback', /二重正旋转.*所选点群应有/, /Twofold proper rotation.*Expected for your selection/);
assert.match(root.querySelector('#pgi-review-feedback').innerHTML, /data-math-source="mm2"/);
select(root, 'pgi-answer', '7');
click(root, 'pgi-review');
verifyMessage(root, 'pgi-review-feedback', /分类正确/, /matching point group/);
click(root, 'pgi-atlas');
click(root, 'pgi-lab');
assert.deepEqual(handoffs, [['7', 'atlas'], ['7', 'lab']]);

unbind();
click(root, 'pgi-lab');
assert.equal(handoffs.length, 2, 'Disposed callbacks cannot trigger a real navigation');
const reopened = new Container();
const disposeReopened = mount(reopened);
await flush();
assert.equal(fetches, 2, 'Reopening uses the existing successful catalog request');
assert.equal(reopened.querySelector('#pgi-predict').value, '1');
assert.equal(reopened.querySelector('#pgi-answer').value, '7');
assert.ok(reopened.querySelector('#pgi-lab'));

select(reopened, 'pgi-mode', 'all');
assert.equal(reopened.querySelector('#pgi-case').querySelectorAll('option').length, 32);
for (const exercise of catalog.exercises) {
  select(reopened, 'pgi-case', exercise.id);
  if (reopened.querySelector('#pgi-full')) click(reopened, 'pgi-full');
  select(reopened, 'pgi-answer', exercise.groupId);
  click(reopened, 'pgi-review');
  verifyMessage(reopened, 'pgi-review-feedback', /分类正确/, /matching point group/);
  assert.ok(reopened.querySelector('#pgi-atlas'));
  assert.doesNotMatch(reopened.innerHTML, /NaN|Infinity/);
  if (english) assert.doesNotMatch(reopened.innerHTML, /[\u3400-\u9fff]/u);
}
disposeReopened();

const delayed = await import(prefix + 'pointgroup-identify-ui.js?component-race');
let finishRequest;
globalThis.fetch = () => new Promise(resolve => { finishRequest = resolve; });
const abandoned = new Container();
const disposeAbandoned = delayed.bindPointgroupIdentify({
  root: abandoned, atlas, stateStore: new Map(), isCurrent: () => true, openGroup: () => {}
});
disposeAbandoned();
abandoned.innerHTML = '<p>Another classroom activity</p>';
finishRequest({ok: true, json: async () => catalog});
await flush();
assert.equal(abandoned.innerHTML, '<p>Another classroom activity</p>');
console.log('Point-group identification (' + (english ? 'English' : 'Chinese') +
  '): all 32 cases, exact versus partial evidence, matrix feedback, witness, handoff, reopening and cancellation passed.');
