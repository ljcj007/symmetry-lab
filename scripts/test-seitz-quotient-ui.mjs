import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container, flush} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const prefix = english ? '../dist/en/' : '../dist/';
const database = JSON.parse(fs.readFileSync(new URL('../dist/data/space-groups.json', import.meta.url)));
const {analyzeSeitzGroup, inspectPair} = await import('../dist/seitz-quotient-core.js');
const controls = root => ({
  at: id => root.querySelector('#' + id),
  select(id, value) {
    const element = this.at(id);
    assert.ok(element.querySelectorAll('option').some(option => option.value === String(value)));
    element.value = String(value);
    return element.onchange({target: element});
  },
  click(id) {
    const element = this.at(id);
    assert.ok(element, 'Expected control ' + id);
    assert.equal(element.disabled, false);
    return element.onclick();
  },
  toggle(open) {
    const element = this.at('sq-tabs');
    element.open = open;
    return element.ontoggle({target: element});
  }
});
const statusFor = (root, id) => root.querySelector('#' + id).textContent;

let fetches = 0;
globalThis.fetch = async path => {
  fetches++;
  assert.equal(path, (english ? '../' : '') + 'data/space-groups.json');
  return fetches === 1 ? {ok: false, status: 503} : {ok: true, json: async () => database};
};
const ui = await import(prefix + 'seitz-quotient-ui.js?component-test');
const stateStore = new Map();
const handoffs = [];
const mount = (root, isCurrent = () => true) => ui.bindSeitzQuotient({
  root, stateStore, isCurrent, openGroup: (number, settings) => handoffs.push({number, settings})
});

const root = new Container();
const here = controls(root);
const dispose = mount(root);
assert.equal(fetches, 0, 'The starter is immediately available without loading the large database');
assert.equal(here.at('sq-check-prediction').disabled, true);
assert.equal(here.at('sq-starter-result'), null);
assert.equal(here.at('sq-space-group'), null);
here.select('sq-guess', 'first');
await here.click('sq-check-prediction');
assert.match(root.querySelector('[role="alert"]').textContent, english ? /Please try again/ : /请重试/);
await here.click('sq-check-prediction');
assert.equal(fetches, 2);
assert.match(statusFor(root, 'sq-starter-result'), english ? /Check the coordinates/ : /再看两边/);
assert.equal(root.querySelectorAll('.sq-fraction-line').length, 2);
assert.match(root.innerHTML, /data-math-source="P21"/);
assert.match(root.innerHTML, /--sq-position:62\.5000%/, 'The screw ends one cell farther along BC z');
here.select('sq-guess', 'second');
assert.equal(here.at('sq-starter-result'), null, 'An edited prediction retires its old feedback');
await here.click('sq-check-prediction');
assert.match(statusFor(root, 'sq-starter-result'), english ? /Correct/ : /预测正确/);
here.select('sq-starter-k', '-1');
assert.match(root.innerHTML, /<annotation encoding="application\/x-tex">i<\/annotation>/,
  'A negative quarter wavevector on a +1 shift produces +i');

here.select('sq-scenario', 'glide');
assert.equal(here.at('sq-guess').value, '');
assert.equal(here.at('sq-starter-result'), null);
here.select('sq-guess', 'second');
await here.click('sq-check-prediction');
assert.match(root.innerHTML, /data-math-source="Pc"/);
assert.match(root.innerHTML, /data-math-source="Pb"/,
  'The conventional Pc symbol and the BC Pb setting are distinguished');
assert.match(root.innerHTML, /--sq-position:54\.1667%/,
  'The glide ends one cell farther along BC x');
here.select('sq-scenario', 'screw');
assert.equal(here.at('sq-guess').value, 'second');
assert.equal(here.at('sq-starter-k').value, '-1');

await here.toggle(true);
assert.equal(here.at('sq-space-group').querySelectorAll('option').length, 230);
assert.match(here.at('sq-space-group').innerHTML, /P2₁/);
assert.equal(here.at('sq-product-result'), null);
assert.equal(here.at('sq-open-calculation'), null);
assert.equal(here.at('sq-apply-first').value, '1');
assert.equal(here.at('sq-apply-second').value, '1');
here.click('sq-show-product');
assert.match(root.innerHTML, english ? /within this wavevector sector/ : /在这个波矢上读取/);
assert.match(root.innerHTML, /g_Ag_B=T_Lg_/);
here.select('sq-k-z', '1');
assert.match(root.innerHTML, /<annotation encoding="application\/x-tex">-i<\/annotation>/);
here.select('sq-k-x', '1');
assert.match(root.innerHTML, english ? /different reciprocal equivalence class/ : /不同的倒易等价类/);
here.click('sq-open-calculation');
assert.deepEqual(handoffs, [{number: 4, settings: {k: [0.25, 0, 0.25]}}]);
const staleHandoff = here.at('sq-open-calculation').onclick;

here.select('sq-space-group', '230');
assert.equal(here.at('sq-product-result'), null);
assert.equal(here.at('sq-apply-first').querySelectorAll('option').length, 48);
const cubic = analyzeSeitzGroup(database.groups.find(group => group.number === 230));
const orderSensitive = cubic.table.flat().find(pair =>
  pair.leftIndex !== pair.rightIndex && pair.representativeIndex !== inspectPair(cubic, pair.rightIndex, pair.leftIndex).representativeIndex);
assert.ok(orderSensitive);
here.select('sq-apply-first', orderSensitive.rightIndex);
here.select('sq-apply-second', orderSensitive.leftIndex);
here.click('sq-show-product');
const inOrder = here.at('sq-product-result').innerHTML;
here.click('sq-swap');
assert.equal(here.at('sq-apply-first').value, String(orderSensitive.leftIndex));
assert.equal(here.at('sq-product-result'), null);
staleHandoff();
assert.equal(handoffs.length, 1, 'Detached controls cannot transfer an earlier group');
here.click('sq-show-product');
assert.notEqual(here.at('sq-product-result').innerHTML, inOrder);
assert.doesNotMatch(here.at('sq-product-result').innerHTML, /NaN|Infinity/);
if (english) assert.doesNotMatch(root.innerHTML, /[\u3400-\u9fff]/u);

dispose();
here.click('sq-open-calculation');
assert.equal(handoffs.length, 1, 'Disposed controls no longer transfer the group');
const reopened = new Container();
const disposeReopened = mount(reopened);
assert.equal(controls(reopened).at('sq-space-group').value, '230');
assert.ok(controls(reopened).at('sq-product-result'));
assert.equal(controls(reopened).at('sq-starter-k').value, '-1');
assert.equal(fetches, 2, 'The successful shared catalogue load is cached');
disposeReopened();

let finishLoad;
globalThis.fetch = () => new Promise(resolve => { finishLoad = resolve; });
const delayed = await import(prefix + 'seitz-quotient-ui.js?component-race');
const abandoned = new Container();
const disposeAbandoned = delayed.bindSeitzQuotient({
  root: abandoned, stateStore: new Map(), isCurrent: () => true, openGroup: () => assert.fail('unexpected handoff')
});
const pending = controls(abandoned).toggle(true);
await flush();
disposeAbandoned();
abandoned.innerHTML = '<p>Another classroom activity</p>';
finishLoad({ok: true, json: async () => database});
await pending;
assert.equal(abandoned.innerHTML, '<p>Another classroom activity</p>');

console.log('Seitz quotient (' + (english ? 'English' : 'Chinese') +
  '): lazy shared load, exact starter comparisons, ordered pair, phase signs and momentum scope, handoff and lifecycle passed.');
