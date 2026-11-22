import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {Container, Element, flush} from './test-material-research-ui.mjs';

const edition = new URL(process.argv.includes('--english') ? '../dist/en/' : '../dist/', import.meta.url);
const {renderPathwaysView} = await import(new URL('pathways-ui.js', edition));
const {renderBridgesView} = await import(new URL('bridges-ui.js', edition));
globalThis.document = {createElement: tag => new Element(tag)};
globalThis.localStorage = {getItem: () => null, setItem() {}};
globalThis.fetch = async resource => new Response(fs.readFileSync(new URL(resource, edition)));
const captured = {};

async function mount(renderer, selection) {
  const container = new Container();
  const transitions = [];
  let calls = 0;
  let expectedKey;
  const close = await renderer({container, selection, onNavigate: value => transitions.push(value),
    run(action, input) {
      calls++;
      assert.ok(expectedKey, 'Opening or editing a lesson must never start a solver');
      assert.ok(!captured[expectedKey], 'A manual submit dispatches exactly once');
      captured[expectedKey] = {action, input};
      return Promise.reject(new Error('Captured request for the shared Python API check.'));
    }
  });
  const find = selector => container.querySelector(selector);
  const input = key => find('#pw-' + key);
  const click = async selector => {
    const node = find(selector);
    assert.ok(node && typeof node.onclick === 'function', selector);
    await node.onclick();
  };
  const values = fields => Object.fromEntries(fields.map(key => [key, input(key).value]));
  const edit = (key, text) => {
    const field = input(key);
    field.value = text;
    input('form').oninput({target: field});
  };
  const selectPreset = target => {
    const chooser = input('preset');
    assert.ok(chooser.querySelector(`option[value="${target}"]`), target);
    chooser.value = target;
    chooser.onchange({target: chooser});
  };
  return {input, values, edit, click, selectPreset, transitions, close, get calls() {return calls;},
    async submit(key) {
      expectedKey = key;
      input('form').onsubmit({preventDefault() {}});
      await flush();
      expectedKey = undefined;
      assert.ok(captured[key], key);
    }
  };
}

async function checkDraft(lab, key, valid) {
  lab.edit(key, valid);
  await lab.click('[data-pw-tab="learn"]');
  await lab.click('[data-pw-tab="lab"]');
  assert.equal(lab.input(key).value, valid);
  assert.equal(lab.input('form').querySelector('[role="alert"]'), null, 'A valid draft receives no error');
  lab.edit(key, '');
  await lab.click('[data-pw-tab="derive"]');
  await lab.click('[data-pw-tab="lab"]');
  assert.equal(lab.input(key).value, '', 'An incomplete draft remains incomplete');
  const diagnostic = lab.input('form').querySelector('[role="alert"]');
  assert.ok(diagnostic);
  assert.match(diagnostic.textContent, process.argv.includes('--english') ? /left blank/u : /不能留空/u);
}

for (const [lesson, preset, key] of [
  ['hubbard-basis', 'chain-four', 'hubbardBasis'],
  ['hubbard-gaps', 'dimer-free-gap', 'hubbardGap'],
  ['hubbard-ionic', 'ionic-atomic-dimer', 'hubbardIonic']
]) {
  const lab = await mount(renderPathwaysView, {module:'hubbard',lesson,tab:'learn'});
  await lab.click('#pw-to-lab');
  assert.equal(lab.input('preset').value, preset);
  assert.equal(lab.transitions.at(-1).preset, preset);
  if (lesson === 'hubbard-basis') await checkDraft(lab, 'hopping', '1.125');
  await lab.click('[data-pw-tab="derive"]');
  await lab.click('#pw-flow-lab');
  assert.equal(lab.input('preset').value, preset);
  assert.equal(lab.calls, 0);
  await lab.submit(key);
  if (lesson === 'hubbard-basis') {
    lab.edit('boundary','periodic');
    await lab.submit('hubbardPeriodic');
  } else if (lesson === 'hubbard-gaps') {
    lab.edit('nUp','0');
    lab.edit('nDown','0');
    await lab.submit('hubbardEmpty');
  } else {
    lab.selectPreset('atomic-dimer');
    await lab.submit('hubbardIonicDegenerate');
  }
  lab.close?.();
}

const lindblad = await mount(renderBridgesView, {module:'density',lesson:'density-lindblad',tab:'learn'});
await lindblad.click('#pw-to-lab');
assert.equal(lindblad.input('preset').value, 'rabi-damped');
assert.equal(lindblad.input('drive').value, '1');
await checkDraft(lindblad, 'gamma1', '0.32');
await lindblad.click('[data-pw-tab="derive"]');
await lindblad.click('#pw-flow-lab');
assert.deepEqual(lindblad.values(['preset','experiment','initialState','drive','gamma1','gammaPhi']),
  {preset:'free-damping-check',experiment:'single',initialState:'plus_x',drive:'0',gamma1:'0.4',gammaPhi:'0.1'});
assert.equal(lindblad.calls, 0);
await lindblad.submit('undrivenDamping');
lindblad.close?.();

const thermal = await mount(renderBridgesView, {module:'density',lesson:'density-assumptions',tab:'learn'});
await thermal.click('#pw-to-lab');
assert.deepEqual(thermal.values(['preset','experiment','initialState','exchange','thermalScale','points']),
  {preset:'thermal-exchange-sparse',experiment:'pair',initialState:'thermal',exchange:'1',thermalScale:'0.8',points:'41'});
await thermal.click('[data-pw-tab="derive"]');
await thermal.click('#pw-flow-lab');
assert.equal(thermal.input('preset').value, 'thermal-exchange-sparse');
assert.equal(thermal.calls, 0);
await thermal.submit('thermalSparse');
thermal.selectPreset('thermal-exchange-dense');
assert.equal(thermal.calls, 1);
await thermal.submit('thermalDense');
assert.deepEqual(captured.thermalDense.input, {...captured.thermalSparse.input,points:161});
thermal.close?.();

const polaron = await mount(renderBridgesView, {module:'polaron',lesson:'polaron-conditional-cloud',tab:'derive'});
await polaron.click('#pw-flow-lab');
assert.deepEqual(polaron.values(['preset','hopping','phononEnergy','coupling','siteBias','cutoff']),
  {preset:'conditional-cloud-atomic',hopping:'0',phononEnergy:'1',coupling:'0.5',siteBias:'0.8',cutoff:'8'});
assert.equal(polaron.calls, 0);
await polaron.submit('polaronAtomic');
polaron.selectPreset('symmetric-cloud');
assert.equal(polaron.calls, 1);
await polaron.submit('polaronSymmetric');
assert.equal(captured.polaronSymmetric.input.siteBias, 0);
assert.equal(captured.polaronSymmetric.input.hopping, 1);
polaron.close?.();

for (const [renderer, module, preset, values] of [
  [renderPathwaysView,'hubbard','dimer-half',{sites:'2',interactionU:'4'}],
  [renderPathwaysView,'hubbard','ionic-dimer',{hopping:'1',alternatingPotential:'6'}],
  [renderBridgesView,'polaron','atomic-shift',{hopping:'0',coupling:'0.7'}],
  [renderBridgesView,'density','dephasing-plusx',{initialState:'plus_x',gamma1:'0',gammaPhi:'0.25'}]
]) {
  const direct = await mount(renderer,{module,preset,calculationOnly:true});
  assert.equal(direct.input('preset').value, preset);
  assert.deepEqual(direct.values(Object.keys(values)), values);
  assert.equal(direct.calls, 0);
  direct.close?.();
}
if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',
  ['-B','scripts/test-python-manybody-lesson-handoffs.py'],
  {cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(captured),encoding:'utf8'});
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if (process.argv.includes('--emit-requests')) console.log(JSON.stringify(captured));
else console.log('Many-body classroom actions, ordinary and incomplete drafts, legacy calculator presets and manual requests passed.');
