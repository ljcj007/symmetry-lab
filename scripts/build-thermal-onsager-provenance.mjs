import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {LEARNING_BRIDGE_HOOKS} from '../dist/learning-bridge-host.js';
import {THERMAL_BRIDGE_HOOKS} from '../dist/thermal-learning-bridge.js';
import {ONSAGER_BRIDGE_HOOKS} from '../dist/onsager-learning-bridge.js';
const root=new URL('../',import.meta.url),hooks={...THERMAL_BRIDGE_HOOKS,...ONSAGER_BRIDGE_HOOKS};
assert.deepEqual(LEARNING_BRIDGE_HOOKS.thermal,Object.keys(THERMAL_BRIDGE_HOOKS));
assert.deepEqual(LEARNING_BRIDGE_HOOKS.onsager,Object.keys(ONSAGER_BRIDGE_HOOKS));
const names=['dist/learning-bridge-host.js','dist/material-research-ui.js','dist/connections-ui.js','dist/index.html',
 'dist/thermal-learning-bridge.js','dist/thermal-learning-bridge.css','dist/onsager-learning-bridge.js','dist/onsager-learning-bridge.css',
 'dist/data/material-research.json','dist/data/connections-materials.json','dist/python/phonon_thermo.py','dist/python/symmetry_connections.py','dist/python/property_tensors.py',
 'scripts/test-learning-bridge-host.mjs','scripts/test-thermal-learning-bridge.mjs','scripts/test-onsager-learning-bridge.mjs','scripts/test-thermal-onsager-integration.mjs','scripts/test-python-thermal-onsager-bridges.py','scripts/build-thermal-onsager-provenance.mjs','scripts/english-catalog.mjs',
 'locales/en-thermal-learning-bridge.json','locales/en-onsager-learning-bridge.json','package.json','GOAL-ROADMAP.md'];
const data={schemaVersion:1,release:'20261113-thermal1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Optional oscillator probability and thermodynamic-force/flux derivations integrated in four existing lessons.',hooks,
 counts:{lessons:Object.keys(hooks).length,placements:Object.values(hooks).flat().length,bridgeKinds:new Set(Object.values(hooks).flat()).size,thermalStages:4,onsagerLessons:Object.keys(ONSAGER_BRIDGE_HOOKS).length},
 verification:[
  'Finite positive-frequency oscillator references retain all geometric tail probability, distinguish mode count from occupation, handle zero temperature, and compare the energy variance with the analytic heat capacity.',
  'Dimensionless and relative low-temperature checks preserve representable thermal energy and free-energy contributions; ordinary frequency, angular frequency and the common energy quantum are distinguished.',
  'A local energy-origin comparison preserves probabilities, entropy and heat capacity. Copying uses the unshifted existing complete 3n Einstein model and the original selected temperature without automatic calculation.',
  'Independent matrices and existing Python requests check the stated time parities, field/magnetization reversal, spatial covariance, entropy-conjugate dual maps, nonconjugate force-only maps and explicit negative dissipation directions.',
  'Real course renderers preserve local controls, native disclosures, unsubmitted predictions and original incomplete calculator drafts; explicit input copying clears obsolete drafts and preserves continuous force values.',
  'Exact lesson hooks lazy-load the references only in learning views, without adding prerequisite gates or rewriting existing course mastery.'
 ],
 boundaries:[
  'These are finite teaching references, not additional general transport or phonon solvers and not measured student learning outcomes.',
  'The fixed oscillator has theta=400 K. Selected degenerate modes and a complete 3n model cell are separate ledgers. A Gamma-point optical classification does not remove acoustic branches from a bulk thermal sum.',
  'The Onsager matrices are dimensionless bounded models. Ordinary spatial indices are not electric/thermal channel indices. Kelvin algebra states its temperature and force/flux definitions; no SI material coefficient calibration is inferred.',
  'Only four existing lessons receive these panels. Broader curriculum depth, targeted remediation and authentic workflows across all tool families remain open.'
 ],
 sources:[
  {url:'https://phonopy.github.io/phonopy/formulation.html#thermodynamic-properties',supports:'Harmonic partition function, Bose occupation, free energy, entropy and heat capacity.'},
  {url:'https://journals.aps.org/pr/abstract/10.1103/PhysRev.38.2265',supports:'Entropy-conjugate transport coefficients and reversal of odd external conditions.'},
  {url:'https://arxiv.org/abs/1207.1629',supports:'Distinction between thermoelectric cross coefficients, Seebeck and Peltier definitions and reversal conventions.'}
 ],
 files:Object.fromEntries(names.sort().map(name=>{const bytes=Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n/g,'\n'));return[name,{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}];}))};
assert.deepEqual(Object.values(data.counts),[4,4,4,4,3]);
const target=new URL('dist/data/thermal-onsager-provenance.json',root),body=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),body,'Thermal/Onsager provenance is stale');else fs.writeFileSync(target,body);
console.log('Thermal/Onsager bridges:',JSON.stringify(data.counts));
