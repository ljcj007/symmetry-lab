import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Container, Element, flush} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const edition = new URL(english ? '../dist/en/' : '../dist/', import.meta.url);
const {bindZnOGammaNAC} = await import(new URL('zno-gamma-nac-ui.js', edition));
const files = Object.fromEntries(['phonopy-zno-qpoints.yaml', 'phonopy-zno-structure.yaml', 'phonopy-zno-BORN'].map(name =>
  [name, readFileSync(new URL('data/examples/' + name, edition))]));
const fixtures = spawnSync(process.env.SYMMETRY_LAB_PYTHON || 'python', ['-B', '-c', `
import json, sys
from pathlib import Path
sys.path.insert(0, 'dist/python')
from zno_gamma_nac import FILES, run
data = {key: (Path('dist/data/examples') / info[0]).read_bytes().decode('utf-8') for key, info in FILES.items()}
results = {}
for direction, coordinates, correction in [
    ([0,0,1], 'cartesian', 'neutralized'), ([0,0,1], 'cartesian', 'raw'),
    ([1,0,0], 'cartesian', 'neutralized'), ([1,0,1], 'cartesian', 'neutralized'),
    ([1,0,2], 'primitive-reciprocal', 'neutralized'),
]:
    key = ','.join(map(str, direction)) + ':' + coordinates + ':' + correction
    results[key] = run({**data, 'direction': direction, 'directionCoordinates': coordinates, 'correction': correction})
print(json.dumps(results))
`], {cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8'});
assert.equal(fixtures.status, 0, fixtures.error?.message || fixtures.stderr);
const results = JSON.parse(fixtures.stdout);

const root = new Container();
let fetchMode = 'tamper', pendingFetch = [];
let holdRun = false, deferred, cancelled = 0;
const requests = [], calls = [];
globalThis.fetch = (url, {signal}) => {
  const name = new URL(url).pathname.split('/').at(-1);
  assert.ok(Object.hasOwn(files, name));
  const request = {name, signal};
  requests.push(request);
  const bytes = Uint8Array.from(files[name]);
  if (fetchMode === 'tamper' && name === 'phonopy-zno-BORN') bytes[0] ^= 1;
  const response = new Response(bytes);
  if (fetchMode === 'hold') return new Promise(resolve => pendingFetch.push(() => resolve(response)));
  return Promise.resolve(response);
};
let current = true;
Element.prototype.focus = function () {};
const unmount = bindZnOGammaNAC({root, isCurrent: () => current, run: (tool, input) => {
  assert.equal(tool, 'zno_gamma_nac');
  for (const [key, name] of [['qpoints', 'phonopy-zno-qpoints.yaml'], ['structure', 'phonopy-zno-structure.yaml'], ['born', 'phonopy-zno-BORN']]) {
    assert.equal(input[key], files[name].toString('utf8'), 'Pass source bytes without newline normalization');
  }
  const key = `${input.direction.join(',')}:${input.directionCoordinates}:${input.correction}`;
  const result = results[key];
  assert.ok(result, key);
  calls.push(key);
  if (!holdRun) return Promise.resolve(result);
  const pending = new Promise(resolve => {deferred = () => resolve(result);});
  pending.cancel = () => {cancelled++;};
  return pending;
}});
const $ = selector => root.querySelector('#zgn-' + selector);
const submit = () => $('form').onsubmit({preventDefault() {}});
const edit = () => $('form').oninput();
const predict = answer => {$('prediction').value = answer;edit();};
const mainRows = () => $('result').querySelector('table').querySelector('tbody').querySelectorAll('tr');

assert.equal(requests.length, 0, 'Mounting should be inert');
await submit();
assert.equal(requests.length, 0, 'An empty prediction should be caught before loading the source');
assert.equal($('error').hidden, false);
predict('a1');
await submit();
assert.equal(requests.length, 3, 'Read exactly the three pinned assets');
assert.equal(calls.length, 0, 'A corrupt source should never reach the worker');
assert.equal($('error').hidden, false);
assert.match($('error').textContent, english ? /loaded or verified/ : /读取或核验/);

fetchMode = 'hold';
const sourceLoading = submit();
assert.equal(pendingFetch.length, 3);
assert.equal($('cancel').hidden, false);
$('cancel').onclick();
assert.ok(requests.slice(-3).every(request => request.signal.aborted));
for (const release of pendingFetch) release();
await sourceLoading;
assert.equal(calls.length, 0, 'Cancelling during source loading prevents the worker call');
assert.equal($('prediction').value, 'a1');

fetchMode = 'ready';
await submit();
assert.equal(calls.at(-1), '0,0,1:cartesian:neutralized');
assert.equal(mainRows().length, 12);
assert.match($('feedback').textContent, /100\.00%/);
assert.match($('feedback').textContent, english ? /agrees with your prediction/ : /与预测一致/);
assert.match($('result').innerHTML, /15\.84138/);
assert.match($('result').innerHTML, /class="katex"/);
assert.equal($('result').querySelector('[role="region"]').getAttribute('tabindex'), '0');
const fetchesAfterLoad = requests.length;
await $('counterexample').onclick();
assert.equal(calls.at(-1), '0,0,1:cartesian:raw');
assert.match($('raw-result').innerHTML, /0\.034937/);
assert.match($('raw-result').innerHTML, /0\.04764/);

holdRun = true;
const oldRaw = $('counterexample').onclick();
$('basal').onclick();
deferred();await oldRaw;
assert.equal(cancelled, 1);
assert.equal($('result').innerHTML, '', 'Editing discards stale main and raw results');
holdRun = false;
predict('a1');
await submit();
assert.equal(calls.at(-1), '1,0,0:cartesian:neutralized');
assert.match($('feedback').textContent, english ? /check your prediction again/ : /重新判断/);
assert.match($('result').innerHTML, /15\.19191/);

$('oblique').onclick();
predict('both');
await submit();
assert.match($('result').innerHTML, /10\.86899/);
assert.match($('result').innerHTML, /15\.45927/);
assert.match($('feedback').textContent, /50\.07%/);

$('coordinates').value = 'primitive-reciprocal';
$('z').value = '2';
edit();
await submit();
assert.equal(calls.at(-1), '1,0,2:primitive-reciprocal:neutralized');
assert.equal(requests.length, fetchesAfterLoad, 'Recalculate with already verified immutable source texts');
if (english) assert.doesNotMatch(root.innerHTML + $('result').innerHTML, /\p{Script=Han}/u);

holdRun = true;
const leaving = submit();
current = false;
unmount();
deferred();await leaving;await flush();
assert.equal(cancelled, 2);
assert.equal($('result').innerHTML, '', 'Unmounting prevents late results');
console.log(`ZnO Γ direction lab (${english ? 'English' : 'Chinese'}): pinned sources, prediction, direction edits, raw comparison and stale requests passed.`);
