import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container, Element, flush} from './test-material-research-ui.mjs';

const edition = new URL(process.argv.includes('--english') ? '../dist/en/' : '../dist/', import.meta.url);
const {renderObservablesView} = await import(new URL('observables-ui.js', edition));
const {renderMaterialResearchView} = await import(new URL('material-research-ui.js', edition));
const {renderCoupledMaterialsView} = await import(new URL('coupled-materials-ui.js', edition));
globalThis.document = {createElement: tag => new Element(tag)};
globalThis.localStorage = {getItem: () => null, setItem() {}};
const sources = ['phonopy-zno-qpoints.yaml', 'phonopy-zno-structure.yaml'];
const fetches = [];
let corrupt = false;
let heldReads = null;
globalThis.fetch = async (resource, {signal} = {}) => {
  const url = new URL(resource, edition);
  const name = url.pathname.split('/').at(-1);
  const bytes = fs.readFileSync(url);
  if (sources.includes(name)) fetches.push(name);
  if (corrupt && name === sources[1]) bytes[0] ^= 1;
  const response = new Response(bytes);
  if (heldReads && sources.includes(name)) {
    return new Promise(resolve => heldReads.push({signal, resolve: () => resolve(response)}));
  }
  return response;
};

async function mount(render, selection) {
  const container = new Container();
  const calls = [];
  const close = await render({container, selection, run(action, input) {
    calls.push({action, input});
    return Promise.reject(new Error('input recorded for the dedicated kernel test'));
  }});
  const find = selector => container.querySelector(selector);
  const value = id => find('#' + id).value;
  const click = selector => {
    const control = find(selector);
    assert.ok(control && typeof control.onclick === 'function', selector);
    return control.onclick();
  };
  const run = id => find('#' + id).onsubmit({preventDefault() {}});
  return {container, calls, close, find, value, click, run};
}

const raman = await mount(renderObservablesView, {lesson: 'polarization', material: 'nacl', tab: 'learn'});
await raman.click('[data-obs-tab="lab"]');
assert.equal(raman.value('obs-preset'), 'nacl');
assert.equal(raman.value('obs-channel'), 'ir');
raman.find('#obs-angle-number').value = '17.3';
raman.find('#obs-form').oninput({target: raman.find('#obs-angle-number')});
await raman.click('[data-obs-tab="learn"]');
await raman.click('[data-obs-tab="lab"]');
assert.equal(raman.value('obs-angle-number'), '17.3', 'Ordinary tabs preserve the draft');
await raman.click('[data-obs-tab="learn"]');
await raman.click('#obs-learn-lab');
assert.equal(raman.value('obs-material'), 'nacl', 'The material background remains independent');
assert.equal(raman.value('obs-preset'), 'silicon');
assert.equal(raman.value('obs-channel'), 'raman');
assert.equal(raman.value('obs-mode'), 'z');
assert.equal(raman.value('obs-angle-number'), '22.5');
assert.equal(raman.value('obs-polarization'), 'parallel');
assert.equal(raman.calls.length, 0);
await raman.run('obs-form');
assert.equal(raman.calls[0].action, 'phonons');
assert.equal(raman.calls[0].input.angle, 22.5);
raman.close?.();

const freezing = await mount(renderMaterialResearchView, {module: 'modes', lesson: 'mode-freezing', tab: 'learn'});
assert.deepEqual(fetches, []);
corrupt = true;
await freezing.click('#mr-to-lab');
assert.ok(freezing.find('#mr-result [role="alert"]') || freezing.find('#mr-retry-input'));
assert.equal(freezing.calls.length, 0);
corrupt = false;
await freezing.click('#mr-retry-input');
assert.deepEqual(fetches, [...sources, ...sources]);
assert.equal(freezing.value('mr-preset'), 'custom');
assert.equal(freezing.value('mr-qi'), '3');
assert.equal(freezing.value('mr-bi'), '10');
assert.equal(freezing.value('mr-frequency-unit'), 'THz');
assert.deepEqual(JSON.parse(freezing.value('mr-supercell')), [2, 1, 1]);
assert.equal(freezing.calls.length, 0);
await freezing.run('mr-form');
await freezing.click('[data-mr-zno-cells="3"]');
assert.deepEqual(JSON.parse(freezing.value('mr-supercell')), [3, 1, 1]);
assert.equal(freezing.calls.length, 1);
await freezing.run('mr-form');
assert.deepEqual(fetches, [...sources, ...sources], 'Reuse only the verified pair');
for (const [index, repetitions] of [2, 3].entries()) {
  const {action, input} = freezing.calls[index];
  assert.equal(action, 'phonon_modes');
  assert.equal(input.selected_q, 3);
  assert.equal(input.selected_band, 10);
  assert.deepEqual(input.supercell, [repetitions, 1, 1]);
  assert.equal(input.content, fs.readFileSync(new URL('data/examples/' + sources[0], edition), 'utf8'));
  assert.equal(input.structure_content, fs.readFileSync(new URL('data/examples/' + sources[1], edition), 'utf8'));
}
freezing.close?.();

const held = await mount(renderMaterialResearchView, {module: 'modes', lesson: 'mode-freezing', tab: 'learn'});
heldReads = [];
const unfinished = held.click('#mr-to-lab');
await flush();
assert.equal(heldReads.length, 2);
const originalPreset = held.value('mr-preset');
held.close?.();
assert.ok(heldReads.every(request => request.signal.aborted), 'Leaving cancels both source reads');
for (const request of heldReads) request.resolve();
await unfinished;
assert.equal(held.value('mr-preset'), originalPreset, 'A completed stale source cannot replace the input');
assert.equal(held.calls.length, 0);
heldReads = null;

const qha = await mount(renderCoupledMaterialsView, {module: 'qha', lesson: 'qha-audit', tab: 'derive'});
await qha.click('#cm-flow-lab');
assert.ok(qha.find('[data-cm-qha-audit]'));
assert.equal(qha.value('cm-pressure'), '-100');
assert.equal(qha.value('cm-source'), 'preset');
assert.equal(qha.value('cm-fit_degree'), '2');
assert.equal(qha.value('cm-fit_window'), '5');
assert.equal(qha.calls.length, 0);
await qha.run('cm-form');
await qha.click('[data-cm-qha-audit-case="interior"]');
assert.equal(qha.value('cm-pressure'), '0');
assert.equal(qha.calls.length, 1);
await qha.run('cm-form');
assert.equal(qha.calls[0].action, 'qha_lab');
assert.equal(qha.calls[1].action, 'qha_lab');
assert.deepEqual(qha.calls[0].input, {...qha.calls[1].input, pressure: -100});
qha.close?.();
console.log('Material lesson actions preserve manual run and verified source, keep normal drafts, and load the three requested controls.');
