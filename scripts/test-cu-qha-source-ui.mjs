import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const prefix = english ? '../dist/en/' : '../dist/';
const bundleRoot = new URL(prefix + 'data/examples/phonopy-cu-qha/', import.meta.url);
const files = new Map(['source.json', 'payload.json'].map(name => [name, fs.readFileSync(new URL(name, bundleRoot))]));
const payload = files.get('payload.json').toString('utf8');
const manifest = JSON.parse(files.get('source.json').toString('utf8'));
const read = bytes => ({ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer});
const at = (root, id) => root.querySelector('#' + id);
async function click(root, id) {
  const control = at(root, id);
  assert.ok(control, 'Expected button ' + id);
  assert.equal(control.disabled, false);
  await control.onclick();
}

let corrupt = 'source.json';
let fetches = 0;
globalThis.fetch = async (url, {signal}) => {
  fetches++;
  assert.ok(signal instanceof AbortSignal);
  assert.equal(url.search, '?v=20261119-cu-qha1');
  assert.ok(url.href.startsWith(bundleRoot.href));
  const name = url.pathname.split('/').at(-1);
  assert.ok(files.has(name));
  const bytes = Buffer.from(files.get(name));
  if (name === corrupt) bytes[12] ^= 1;
  return read(bytes);
};
const {bindCuQhaSource} = await import(prefix + 'cu-qha-source-ui.js?widget-test');
const root = new Container();
const submitted = [];
let allowApply = false;
const cleanup = bindCuQhaSource({
  root, isCurrent: () => true, onApply(input) {
    submitted.push(input);
    return allowApply;
  }
});
assert.equal(fetches, 0, 'Opening the widget never downloads inputs');
assert.equal(at(root, 'cq-preview'), null);
assert.equal(at(root, 'cq-apply'), null);
for (const name of ['source.json', 'payload.json']) {
  corrupt = name;
  await click(root, 'cq-load');
  assert.match(root.querySelector('[role="alert"]').textContent,
    english ? /differs from the pinned version/ : /与固定版本不同/);
  assert.equal(at(root, 'cq-preview'), null);
  assert.equal(at(root, 'cq-apply'), null);
}
corrupt = '';
await click(root, 'cq-load');
assert.equal(fetches, 6);
assert.equal(submitted.length, 0, 'Preview does not apply or calculate');
assert.ok(at(root, 'cq-apply'));
assert.ok(at(root, 'cq-preview'));
assert.match(root.querySelector('[role="status"]').textContent,
  english ? /all 11 raw YAML texts/ : /11 段原始 YAML 文本/);
assert.equal(root.querySelector('tbody').querySelectorAll('tr').length, 11);
assert.match(root.innerHTML, /2500 K/);
assert.match(root.innerHTML, /300 K/);
const tableText = root.querySelector('tbody').textContent;
let position = -1;
for (const entry of manifest.thermalFiles) {
  const next = tableText.indexOf(String(entry.staticVolumeAngstrom3), position + 1);
  assert.ok(next > position);
  position = next;
  assert.match(root.querySelector('tbody').innerHTML, new RegExp('href="[^"]+' + entry.path.replaceAll('.', '\\.') + '"'));
}
assert.ok(root.querySelectorAll('a').some(a =>
  a.getAttribute('href') === new URL(prefix + 'docs/cu-qha-example.md', import.meta.url).href));
await click(root, 'cq-apply');
assert.ok(root.querySelector('[role="alert"]'));
assert.equal(at(root, 'cq-applied'), null);
allowApply = true;
await click(root, 'cq-apply');
assert.ok(at(root, 'cq-applied'));
const input = submitted.at(-1);
assert.equal(input.content, payload, 'Do not save a parsed and re-serialized copy');
assert.equal(input.source, 'thermal');
assert.equal(input.filename, 'phonopy-cu-qha-payload.json');
assert.equal(input.sourceEvidence.payloadSha256, manifest.payload.sha256);
assert.deepEqual(input.sourceEvidence.thermalFiles, manifest.thermalFiles);
assert.ok(Object.isFrozen(input) && Object.isFrozen(input.sourceEvidence.thermalFiles[0].yaml));
if (english) assert.doesNotMatch(root.innerHTML, /[\u3400-\u9fff]/u);
cleanup();
await click(root, 'cq-apply');
assert.equal(submitted.length, 2, 'A stale apply handler cannot replace another form draft');

const reopened = new Container();
const closeReopened = bindCuQhaSource({root: reopened, onApply: () => assert.fail('automatic apply')});
assert.ok(at(reopened, 'cq-preview'));
assert.equal(at(reopened, 'cq-applied'), null);
assert.equal(fetches, 6, 'The verified in-memory preview can be reused');
closeReopened();

const waiting = [];
globalThis.fetch = (url, {signal}) => new Promise(resolve => waiting.push({url, signal, resolve}));
const delayed = await import(prefix + 'cu-qha-source-ui.js?widget-race');
const another = new Container();
const stop = delayed.bindCuQhaSource({root: another, onApply: () => assert.fail('stale apply')});
const pending = click(another, 'cq-load');
assert.equal(waiting.length, 2);
stop();
another.innerHTML = '<p>Replacement calculation form</p>';
assert.ok(waiting.every(entry => entry.signal.aborted), 'Cleanup aborts every pending source read');
for (const entry of waiting) entry.resolve(read(files.get(entry.url.pathname.split('/').at(-1))));
await pending;
assert.equal(another.innerHTML, '<p>Replacement calculation form</p>');
console.log('Cu QHA source (' + (english ? 'English' : 'Chinese') +
  '): byte verification, ordered preview, exact manual transfer, abort and stale-response checks passed.');
