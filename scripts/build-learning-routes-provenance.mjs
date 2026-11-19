import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {lessonProgressionEdges,lessonProgressionCatalogs,lessonProgressionInventory} from '../dist/lesson-progression.js';
const root=new URL('../',import.meta.url);
const example=JSON.parse(fs.readFileSync(new URL('dist/data/examples/phonopy-al-abacus-source.json',root),'utf8'));
const raw=fs.readFileSync(new URL('dist/data/examples/'+example.localFile,root));
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),example.sha256);
assert.equal(raw.length,example.byteCount);
const reviewed=new Set(lessonProgressionEdges.flatMap(x=>[x.from,x.to]));
const files=['dist/app.js','dist/index.html','dist/classroom-ui.js','dist/classroom.css','dist/lesson-progression.js','dist/lesson-progression-index.js','dist/material-notebook.js','dist/python-client.js','dist/python-worker.js',
 'dist/python/phonopy_import.py','dist/python/phonon_modes.py','dist/python/density_matrix_lab.py','dist/python/symmetry_frontiers.py','dist/structure-dynamics-ui.js','dist/frontiers-views.js','dist/docs/phonopy-import.md','dist/docs/frontiers.md','dist/docs/density-matrix.md','dist/data/frontiers-materials.json','dist/data/formula-dictionary.json',
 'scripts/test-classroom-ui.mjs','scripts/test-lesson-progression.mjs','scripts/build-lesson-progression-index.mjs','scripts/build-learning-routes-provenance.mjs','scripts/test-python-phonopy-import.py','scripts/test-python-phonon-modes.py','scripts/test-python-frontiers.py','scripts/test-python-density-matrix.py','scripts/test-structure-dynamics-ui.mjs','scripts/test-frontiers-ui.mjs',
 'locales/en-lesson-progression.json','locales/en-entropy-conventions.json','locales/en-phonopy-units.json','scripts/english-catalog.mjs','package.json','GOAL-ROADMAP.md','NOTICE.txt',...fs.readdirSync(new URL('dist/data/examples/',root)).filter(x=>x.startsWith('phonopy-al-abacus-')).map(x=>'dist/data/examples/'+x)];
files.push('dist/pathways-ui.js','scripts/test-pathways-ui.mjs');
files.push(...lessonProgressionCatalogs.map(item=>'dist/data/'+item.catalog+'.json'));
files.push('scripts/test-material-research-ui.mjs','scripts/test-material-notebook.mjs',
 'scripts/test-navigation-ui.mjs','scripts/test-lie-group-ui.mjs');
files.push('dist/foundations-demos.js','dist/optional-panel.js','dist/gamma-periodicity-ui.js','dist/python/phonon_spectra.py',
 'locales/en-gamma-periodicity.json','locales/en-gamma-periodicity-host.json',
 'scripts/test-gamma-periodicity.mjs','scripts/test-python-gamma-periodicity-reference.py',
 'dist/tool-capabilities.js','locales/en-trace-file-search.json','scripts/test-file-search.mjs');
files.push('dist/tool-finder.js','dist/lesson-topic-finder.js','dist/tool-search.js','dist/navigation-ui.js',
 'scripts/test-lesson-topic-finder.mjs','scripts/test-lesson-topic-host.mjs','locales/en-lesson-topic-finder.json','locales/en-lesson-topic-host.json');
files.push('dist/band-match-results.js','dist/style.css','dist/python/symmetry_core.py','scripts/test-band-match-results.mjs',
 'scripts/test-python-band-match-display.py','locales/en-band-match-display.json');
files.push('dist/research-ui.js','dist/crystkit-handedness-ui.js','dist/frontiers-ui.js','dist/python/crystkit_browser.py',
 'scripts/test-crystkit-handedness-ui.mjs','scripts/test-python-crystkit.py','scripts/test-native-navigation.mjs',
 'locales/en-crystkit-handedness.json');
files.push('dist/al-gamma-source.js','dist/material-research-ui.js','scripts/test-al-gamma-source.mjs',
 'scripts/test-al-gamma-discovery.mjs','scripts/test-python-al-gamma-source.py','scripts/test-material-research-content.py',
 'locales/en-al-gamma-source.json','locales/en-al-gamma-host.json','locales/en-al-gamma-discovery.json');
files.push('dist/zero-start.js','dist/zero-start-placement.js','dist/navigation.css','dist/docs/structure-bc.md',
 'scripts/test-zero-start-placement.mjs','scripts/test-route-focus.mjs','scripts/test-python-structure-bc.py',
 'locales/en-zero-start-placement.json');
files.push('dist/symmetry-course-ui.js','dist/structure-ui.js','dist/cif-setting-practice.js','dist/docs/cif-setting-practice.md',
 'scripts/test-cif-setting-lesson.mjs','scripts/test-cif-setting-practice.mjs',
 'locales/en-cif-setting-search.json','locales/en-cif-setting-lesson.json','locales/en-cif-setting-practice.json');

files.push('dist/symmetry-course-ui.js','dist/pointgroup-ui.js','dist/coupled-materials-ui.js',
 'dist/python/teaching_labs.py','dist/python/group_extensions.py','dist/python/symmetry_core.py',
 'dist/python/structure_bc.py','dist/python/standard_labels.py','dist/python/phase_domains.py',
 'dist/python/diffraction.py','dist/python/distortion_lab.py','dist/python/magnon_lab.py',
 'dist/python/qha_lab.py','dist/python/domain_wall_lab.py','dist/python/conservation_lab.py');
files.push('dist/lie-physics-ui.js','dist/su3-cg-ui.js','dist/su3-racah-ui.js','dist/su3-ninej-ui.js',
 'dist/observables-ui.js','dist/electronic-materials-ui.js','dist/quantum-materials-ui.js',
 'dist/response-materials-ui.js','dist/spectroscopy-ui.js','dist/bridges-ui.js','dist/construction-ui.js','dist/connections-ui.js',
 'dist/python/lie_labs.py','dist/python/lie_applications.py','dist/python/su3_cg.py','dist/python/su3_cg_exact.py',
 'dist/python/su3_racah.py','dist/python/su3_ninej.py','dist/python/shg_lab.py','dist/python/unfold_lab.py',
 'dist/python/crystal_field_lab.py','dist/python/local_multiplet_lab.py','dist/python/spin_resonance_lab.py',
 'dist/python/atomic_spectra_lab.py','dist/python/hubbard_lab.py','dist/python/manybody_spectra_lab.py',
 'dist/python/polaron_lab.py','dist/python/salc_lab.py','dist/python/symmetry_workshop.py','dist/python/symmetry_connections.py');
const data={schemaVersion:1,release:'20261115-momentum1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Optional reviewed cross-lesson routes through representations, order parameters, exchange, conservation, layers, chirality, quantum geometry, phonon import and thermodynamics, equilibrium tensors, bulk and device transport, pairing and NS scattering, band representations, finite-wavevector ordering, SU(3) recoupling, spinor double covers, magnetic and color operations, spin-group locking, structural distortions, diffraction, domains and walls, magnons and quasiharmonic response, all indexed SU(3) lesson connections, nonlinear optics, band unfolding, orbital and many-electron spectra, SALCs, fermion statistics and order-parameter defects; schema-valid classroom drafts, explicit conventions, and the retained pinned official Phonopy example.',
 counts:{catalogues:lessonProgressionCatalogs.length,indexedLessons:lessonProgressionInventory.length,reviewedLessons:reviewed.size,optionalEdges:lessonProgressionEdges.length,officialExampleQOccurrences:example.counts.qpointOccurrences,officialExampleBands:example.counts.bandsPerQ},
 verification:['All indexed routes and identities resolve; explicit prerequisite/next edges are acyclic, reasoned and optional. Same-name point-group and Lie lessons remain distinct.','The graph loads only for learning views. Local chapter changes update it without changing course-render behavior; stale async callbacks cannot expose a lab graph.','The original official band and companion structure files retain their exact SHA-256 and full BSD license. Real frequencies, q-point order, path segmentation, eigenvectors and selected mode flow through public calculation entries.','Length and frequency declarations preserve provenance, distinguish explicit user confirmation, and reject inconsistent units. Frozen-mode export converts declared au lattice lengths into Angstroms.','SPT entropy retains the original natural-log numeric field and adds nat/bit metadata and conversion. Density-matrix entropy retains its original log2/bit numeric field.'],
 limitations:[`All ${lessonProgressionInventory.length} indexed lessons have at least one reviewed optional connection in the ${lessonProgressionEdges.length}-edge graph. This coverage records concrete conceptual transfers; it does not establish complete operational teaching depth, targeted diagnosis or an authentic scientific workflow in every lesson.`,'A reviewed learning connection identifies a concrete concept to carry between lessons. It does not certify a complete operation-level derivation, diagnostic remediation, or authentic-material workflow in either lesson.','These software and reference-calculation checks do not measure student learning or complete the broad site audit.','The official Al data are an existing monatomic calculated example with real and complex supplied eigenvectors, including relative complex phases. They are not experiment, newly computed data, optical-branch validation, or a general unequal-mass multi-atom import audit.','The band file has no frequency-unit declaration. The example entry explicitly selects THz; the selected convention is not relabeled as file metadata.','SPT pure-state subsystem entropy and mixed-state von Neumann entropy are not interchangeable entanglement measures.'],
 officialExample:{source:example.url,commit:example.commit,sha256:example.sha256,license:example.license},
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const bytes=Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n/g,'\n'));return[name,{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}];}))};
data.verification.push('All four pathway families retain raw valid or incomplete drafts through actual course-tab handlers. Valid inputs do not produce a false schema warning; incomplete fields identify their own validation error. Ordinary tab navigation does not run a calculation.');
data.verification.push('Thirty-four additional optional connections come from substantive reading of 21 existing lessons, their exercises, declared models and bounded operation panels. All destinations resolve and the combined graph remains acyclic. Links retain polar/axial action spaces, energy-unit choices, finite layer-normal boundaries, and the distinct geometry and response refinement grids.');
data.verification.push('Forty-eight further optional connections preserve the preceding 82 and connect 47 previously index-only lessons. Every one of the 197 registered lesson panels renders its exact native prerequisite and next hrefs, including overflow links. That intermediate 130-edge graph is retained in full, all visible reasons have English translations, and every newly connected lesson is exercised through the actual classroom shell without calculation or mastery-state access.');
data.verification.push('Visible reasons distinguish ordinary frequency and input-cell thermal normalization, tensor intrinsic symmetry and engineering shear, SI Boltzmann moments and device absorption, arbitrary pairing scales and NS eV, fractional and radian Bloch momentum, and GT copy gauges versus dimension-reduced 6j/9j tables. These are preparation recommendations, not automatic transfer of numeric results between different models.');

data.verification.push('Forty-two further optional transfers preserve all preceding 130 edges and connect 36 previously index-only lessons. The 172-edge graph over 148 connected lessons is acyclic; all 197 native lesson routes and every prerequisite/next href are checked, with complete English reasons and the actual classroom shell exercised for all 36 new identities.');
data.verification.push('Visible reasons retain proper-rotation lift limits, complete double-group versus representative counts, antiunitary conjugation and same-momentum conditions, ordinary versus magnetic settings, and SO(3) versus generalized O(3). Structural reasons distinguish angstrom geometric amplitudes from dimensionless Landau coordinates, positive diffraction phases, per-input-cell quasiharmonic energies and Cp, reduced scalar walls versus independent eV SSH chains, and meV spin-wave energies with different magnetic-cell momentum intervals.');
data.limitations.push('Course connections do not themselves implement or certify the separately documented operation workshops. Exact color/spin/SOC and antitranslation panels have their own source, model and verification scopes; existing preset and solver boundaries remain separate.');
data.reviewHistory=[{release:'20261115-tensor1',reviewedLessons:112,optionalEdges:130},{release:'20261115-spin1',reviewedLessons:148,optionalEdges:172},{release:'20261115-momentum1',reviewedLessons:197,optionalEdges:259,newConnections:87,newlyConnectedLessons:49}];
data.verification.push('Eighty-seven further read optional relationships preserve all preceding 172 edges and connect the remaining 49 named inventory lessons. All 197 lessons now have recommendations through 259 acyclic edges. Tests lock every new pair and identity, all native lesson links, complete English reasons, 142 real classroom-shell contexts and 46 independent expert entries without calculation or mastery-state access.');
data.verification.push('New visible boundaries retain equal-input-frequency SHG j/k symmetry without full Kleinman permutation, χ versus piezoelectric e and d=χ/2, reciprocal fractions versus radian wavevectors, exact complex amplitudes versus fixed-irrep path spaces, single-particle versus Slater determinant models, electric versus magnetic probes and their separate units/thermal weights, same-k antiunitary tests, complete fermionic exchange, and declared order-parameter manifolds.');
data.verification.push('The water lesson links to a GaAs displacement comparison. Both editions check the rigid rotation against all three fcc primitive directions. The optical contrast uses the existing Python phonon example geometry and a verified model frame. The exact trace.txt lookup opens the ordinary and magnetic band-character tool with its existing input constraints.');
data.verification.push('Every indexed lesson opens contextual course search from its current learning panel. All 197 canonical lesson identities resolve into 51 topics. Same-name lessons stay distinct. Users can browse their topic or retain the query when broadening to the course catalog or the whole lesson inventory.');
assert.deepEqual(Object.values(data.counts),[17,197,197,259,84,3]);
const target=new URL('dist/data/learning-routes-provenance.json',root),body=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Learning routes provenance is stale');else fs.writeFileSync(target,body);
console.log('Learning routes:',JSON.stringify(data.counts));
