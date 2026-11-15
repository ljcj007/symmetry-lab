import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {lessonProgression,lessonProgressionHTML,lessonProgressionEdges,lessonProgressionInventory,lessonProgressionCatalogs,progressionForSelection} from '../dist/lesson-progression.js';
import {parseClassroomRoute} from '../dist/classroom-ui.js';
import {progressionIndexSource} from './build-lesson-progression-index.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';
import {Container,Element} from './test-material-research-ui.mjs';
import {renderClassroomView,classroomSections} from '../dist/classroom-ui.js';

const path=new URL('../dist/lesson-progression-index.js',import.meta.url);
assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),progressionIndexSource(),'The factual route index is rebuilt from current production catalogues');
const inventory=new Map(lessonProgressionInventory.map(item=>[item.key,item]));
assert.equal(inventory.size,197);
assert.equal(lessonProgressionCatalogs.length,17);
assert.equal(lessonProgressionEdges.length,259);
const reviewed=new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to]));
assert.equal(reviewed.size,197,'Every indexed lesson has a substantively reviewed optional connection');
const spinReviewed=new Set(lessonProgressionEdges.slice(0,172).flatMap(edge=>[edge.from,edge.to]));
assert.equal(spinReviewed.size,148);
assert.equal(createHash('sha256').update(JSON.stringify(lessonProgressionEdges.slice(0,172))).digest('hex'),
 '80a0d817d5688490afb96d0767eb5f871c2f8bc362ea102cc307e073fad95e34',
 'All preceding 172 edges, reasons and their order remain unchanged');
assert.equal(createHash('sha256').update(JSON.stringify(lessonProgressionEdges.slice(0,82))).digest('hex'),
 '998a4da95dc3a201e64ed830c2a4f5f58306477fec8aa66cbd6f27d6ee5dfff8',
 'The preceding 82 optional connections, their reasons and their order remain unchanged');
assert.equal(createHash('sha256').update(JSON.stringify(lessonProgressionEdges.slice(0,130))).digest('hex'),
 'cb75b4d8a2ed525110a0de080b53c5c41de8372477c12968d1c06451a07e387f',
 'All preceding 130 connections retain their exact content and order');

for(const definition of lessonProgressionCatalogs){
 const actual=JSON.parse(fs.readFileSync(new URL('../dist/data/'+definition.catalog+'.json',import.meta.url),'utf8'));
 const indexed=lessonProgressionInventory.filter(item=>item.catalog===definition.catalog);
 assert.deepEqual(indexed.map(item=>item.lessonId),actual.lessons.map(item=>item.id));
 for(const lesson of actual.lessons){
  const key=definition.catalog+'::'+lesson.id,entry=inventory.get(key);
  assert.equal(entry.title,lesson.title,key);
  const parsed=parseClassroomRoute(entry.route);
  assert.equal(parsed?.section,definition.section,key);
  assert.equal(parsed.lesson,lesson.id,key);
  assert.equal(parsed.tab,'learn',key);
  if(lesson.module)assert.equal(parsed.module,lesson.module,key);
  if(lesson.track)assert.equal(parsed.track,lesson.track,key);
  assert.equal(new URLSearchParams(entry.indexRoute.split('?')[1]).has('lesson'),false,key);
  assert.equal(parseClassroomRoute(entry.indexRoute)?.section,definition.section,key);
  const response=lessonProgression({catalog:definition.catalog,lessonId:lesson.id});
  assert.equal(response.current.lessonId,lesson.id);
  assert.deepEqual(response,lessonProgression({catalog:definition.section,lessonId:lesson.id}));
  assert.equal(response.status,reviewed.has(key)?'reviewed':'index-only');
 }
}

const visited=new Set(),inPath=new Set();
function visit(identity){
 assert.ok(!inPath.has(identity),'A cycle would make the proposed prerequisite order contradictory: '+identity);
 if(visited.has(identity))return;
 inPath.add(identity);
 for(const edge of lessonProgressionEdges.filter(edge=>edge.from===identity))visit(edge.to);
 inPath.delete(identity);visited.add(identity);
}
const pairs=new Set();
for(const edge of lessonProgressionEdges){
 assert.ok(inventory.has(edge.from),edge.from);assert.ok(inventory.has(edge.to),edge.to);
 assert.notEqual(edge.from,edge.to);assert.ok(edge.reason.length>20,'Each link identifies a concrete transferable operation');
 assert.ok(!pairs.has(edge.from+'>'+edge.to),'No duplicate dependency');pairs.add(edge.from+'>'+edge.to);
 const current=inventory.get(edge.to),prior=inventory.get(edge.from);
 const response=lessonProgression(current);
 assert.ok(response.prerequisites.some(item=>item.catalog===prior.catalog&&item.lessonId===prior.lessonId&&item.reason===edge.reason));
 assert.ok(lessonProgression(prior).next.some(item=>item.catalog===current.catalog&&item.lessonId===current.lessonId&&item.reason===edge.reason));
 visit(edge.from);
}

const newReadGroups={
 'principles-materials':['order-isotropy','order-invariants','order-field-convention','exchange-bond-constraints','exchange-classical-quantum','exchange-conventions','conservation-generators','conservation-open','conservation-protection'],
 'frontiers-materials':['layer-periodicity','layer-termination','layer-registry','chiral-mirror','chiral-polarity','chiral-tolerance'],
 'quantum-materials':['geometry-rays','geometry-topology','geometry-diagnostics'],
 'response-materials':['hall-occupation','hall-entropy','hall-diagnostics']
};
const additionalKeys=Object.entries(newReadGroups).flatMap(([catalog,ids])=>ids.map(id=>catalog+'::'+id));
assert.equal(additionalKeys.length,21);
for(const key of additionalKeys)assert.ok(reviewed.has(key),'A newly read lesson has an explicit reviewed connection: '+key);

// The preceding tensor1 release reviewed four bounded scientific workflows, rather than
// inferring dependencies from catalogue order. Keep the 48 reviewed pairs and
// its 47 newly connected identities explicit while testing the real live routes.
const newlyConnectedReadGroups={
 "construction-materials": [
  "nonsymmorphic-bloch",
  "nonsymmorphic-breaking",
  "nonsymmorphic-partner",
  "wavevector-cell",
  "wavevector-satellites",
  "wavevector-star"
 ],
 "electronic-materials": [
  "pairing-exchange",
  "pairing-kitaev",
  "pairing-nodes"
 ],
 "lie-group-lessons": [
  "su3-cg-change-basis",
  "su3-cg-exact-radicals",
  "su3-cg-fundamental",
  "su3-cg-higher-representations",
  "su3-cg-multiplicity",
  "su3-dynkin-representations",
  "su3-generators",
  "su3-ninej-exact-normalization",
  "su3-ninej-high-input-labels",
  "su3-ninej-paired-trees",
  "su3-racah-coupling-paths",
  "su3-racah-exact-sixj",
  "su3-weights"
 ],
 "material-observables": [
  "magnetoelectricity",
  "piezoelectricity",
  "polarization"
 ],
 "material-research": [
  "band-crossing",
  "band-restriction",
  "band-spin",
  "mode-audit",
  "mode-freezing",
  "mode-subspaces",
  "thermal-data",
  "thermal-limits"
 ],
 "pathways-materials": [
  "bandrep-bloch-phase",
  "bandrep-decomposition",
  "bandrep-real-space"
 ],
 "quantum-materials": [
  "transport-seebeck",
  "transport-validation",
  "transport-window"
 ],
 "response-materials": [
  "device-open",
  "device-scattering",
  "device-ssh"
 ],
 "spectroscopy-materials": [
  "andreev-barriers",
  "andreev-charge",
  "andreev-checks"
 ],
 "structure-dynamics": [
  "phonopy-files",
  "soft-modes"
 ]
};
const newlyConnectedKeys=Object.entries(newlyConnectedReadGroups).flatMap(([catalog,ids])=>ids.map(id=>catalog+'::'+id));
assert.equal(newlyConnectedKeys.length,47);
const originalReviewed=new Set(lessonProgressionEdges.slice(0,82).flatMap(edge=>[edge.from,edge.to]));
const tensorReviewed=new Set(lessonProgressionEdges.slice(0,130).flatMap(edge=>[edge.from,edge.to]));
assert.equal(tensorReviewed.size,112);
for(const key of newlyConnectedKeys){
 assert.ok(!originalReviewed.has(key),'This lesson was index-only before the current review: '+key);
 assert.ok(reviewed.has(key),'A reviewed operational transfer is installed: '+key);
}
assert.deepEqual(new Set([...tensorReviewed].filter(key=>!originalReviewed.has(key))),new Set(newlyConnectedKeys));
const reviewedAdditionPairs=[
 [
  "material-observables::mechanical-modes",
  "structure-dynamics::soft-modes"
 ],
 [
  "structure-dynamics::soft-modes",
  "structure-dynamics::phonopy-files"
 ],
 [
  "structure-dynamics::phonopy-files",
  "material-research::mode-audit"
 ],
 [
  "material-research::mode-audit",
  "material-research::mode-subspaces"
 ],
 [
  "pointgroup-lessons::character-reduction",
  "material-research::mode-subspaces"
 ],
 [
  "material-research::mode-subspaces",
  "material-research::mode-freezing"
 ],
 [
  "material-research::thermal-oscillator",
  "material-research::thermal-data"
 ],
 [
  "material-research::thermal-oscillator",
  "material-research::thermal-limits"
 ],
 [
  "material-observables::ir-raman",
  "material-observables::polarization"
 ],
 [
  "material-observables::neumann",
  "material-observables::piezoelectricity"
 ],
 [
  "symmetry-course-lessons::magnetic-01",
  "material-observables::magnetoelectricity"
 ],
 [
  "material-observables::neumann",
  "material-observables::magnetoelectricity"
 ],
 [
  "quantum-materials::transport-window",
  "quantum-materials::transport-seebeck"
 ],
 [
  "connections-materials::reciprocity-onsager",
  "quantum-materials::transport-seebeck"
 ],
 [
  "quantum-materials::transport-seebeck",
  "quantum-materials::transport-validation"
 ],
 [
  "response-materials::device-open",
  "response-materials::device-scattering"
 ],
 [
  "response-materials::device-scattering",
  "response-materials::device-ssh"
 ],
 [
  "lie-group-lessons::singlet-triplet-exchange",
  "electronic-materials::pairing-exchange"
 ],
 [
  "electronic-materials::pairing-exchange",
  "electronic-materials::pairing-nodes"
 ],
 [
  "electronic-materials::pairing-exchange",
  "electronic-materials::pairing-kitaev"
 ],
 [
  "response-materials::device-open",
  "spectroscopy-materials::andreev-charge"
 ],
 [
  "electronic-materials::pairing-exchange",
  "spectroscopy-materials::andreev-charge"
 ],
 [
  "spectroscopy-materials::andreev-charge",
  "spectroscopy-materials::andreev-barriers"
 ],
 [
  "spectroscopy-materials::andreev-barriers",
  "spectroscopy-materials::andreev-checks"
 ],
 [
  "symmetry-course-lessons::space-04",
  "pathways-materials::bandrep-real-space"
 ],
 [
  "pathways-materials::bandrep-real-space",
  "pathways-materials::bandrep-bloch-phase"
 ],
 [
  "pathways-materials::bandrep-bloch-phase",
  "pathways-materials::bandrep-decomposition"
 ],
 [
  "pathways-materials::bandrep-decomposition",
  "material-research::band-restriction"
 ],
 [
  "material-research::band-restriction",
  "material-research::band-crossing"
 ],
 [
  "material-research::band-spin",
  "construction-materials::nonsymmorphic-partner"
 ],
 [
  "pathways-materials::bandrep-bloch-phase",
  "construction-materials::nonsymmorphic-bloch"
 ],
 [
  "construction-materials::nonsymmorphic-bloch",
  "construction-materials::nonsymmorphic-partner"
 ],
 [
  "construction-materials::nonsymmorphic-partner",
  "construction-materials::nonsymmorphic-breaking"
 ],
 [
  "symmetry-course-lessons::space-05",
  "construction-materials::wavevector-star"
 ],
 [
  "construction-materials::wavevector-star",
  "construction-materials::wavevector-cell"
 ],
 [
  "construction-materials::wavevector-star",
  "construction-materials::wavevector-satellites"
 ],
 [
  "lie-group-lessons::generators-commutators",
  "lie-group-lessons::su3-generators"
 ],
 [
  "lie-group-lessons::su3-generators",
  "lie-group-lessons::su3-weights"
 ],
 [
  "lie-group-lessons::su3-weights",
  "lie-group-lessons::su3-dynkin-representations"
 ],
 [
  "lie-group-lessons::su3-dynkin-representations",
  "lie-group-lessons::su3-cg-change-basis"
 ],
 [
  "lie-group-lessons::su3-cg-change-basis",
  "lie-group-lessons::su3-cg-fundamental"
 ],
 [
  "lie-group-lessons::su3-cg-fundamental",
  "lie-group-lessons::su3-cg-multiplicity"
 ],
 [
  "lie-group-lessons::su3-cg-higher-representations",
  "lie-group-lessons::su3-cg-exact-radicals"
 ],
 [
  "lie-group-lessons::su3-cg-multiplicity",
  "lie-group-lessons::su3-racah-coupling-paths"
 ],
 [
  "lie-group-lessons::su3-racah-coupling-paths",
  "lie-group-lessons::su3-racah-exact-sixj"
 ],
 [
  "lie-group-lessons::su3-racah-coupling-paths",
  "lie-group-lessons::su3-ninej-paired-trees"
 ],
 [
  "lie-group-lessons::su3-ninej-paired-trees",
  "lie-group-lessons::su3-ninej-exact-normalization"
 ],
 [
  "lie-group-lessons::su3-dynkin-representations",
  "lie-group-lessons::su3-ninej-high-input-labels"
 ]
];
assert.deepEqual(lessonProgressionEdges.slice(82,130).map(({from,to})=>[from,to]),reviewedAdditionPairs,
 'Every reviewed pair is installed once; no unreviewed inferred links are substituted');

// The spin1 review names 42 actual transfers and 36 formerly index-only lessons.
// Keep these identities explicit: a count alone would accept unrelated substitutions.
const spinStructureReadGroups={
  "coupled-materials": [
    "distortion-projection",
    "distortion-reference",
    "landau-coupling",
    "magnon-antiferromagnet",
    "magnon-ferromagnet",
    "magnon-stability",
    "qha-audit",
    "qha-response"
  ],
  "pathways-materials": [
    "wall-energy",
    "wall-gradient",
    "wall-localized"
  ],
  "pointgroup-lessons": [
    "from-point-to-space"
  ],
  "structure-dynamics": [
    "centering-basis",
    "imaginary-modes",
    "landau-stability",
    "polar-domains",
    "screw-glide",
    "structure-factor"
  ],
  "symmetry-course-lessons": [
    "color-01",
    "color-02",
    "color-03",
    "double-01",
    "double-02",
    "double-03",
    "double-04",
    "double-05",
    "double-06",
    "magnetic-02",
    "magnetic-03",
    "magnetic-04",
    "magnetic-05",
    "space-06",
    "spin-01",
    "spin-02",
    "spin-03",
    "spin-04"
  ]
};
const spinStructureKeys=Object.entries(spinStructureReadGroups).flatMap(([catalog,ids])=>ids.map(id=>catalog+'::'+id));
assert.equal(spinStructureKeys.length,36);
for(const key of spinStructureKeys){
 assert.ok(!tensorReviewed.has(key),'This lesson was index-only at tensor1: '+key);
 assert.ok(reviewed.has(key),'The reviewed spin/structure lesson has a live transfer: '+key);
}
assert.deepEqual(new Set([...spinReviewed].filter(key=>!tensorReviewed.has(key))),new Set(spinStructureKeys));
const spinStructurePairs=[
  [
    "pointgroup-lessons::representations",
    "pointgroup-lessons::from-point-to-space"
  ],
  [
    "pointgroup-lessons::from-point-to-space",
    "symmetry-course-lessons::space-06"
  ],
  [
    "pointgroup-lessons::from-point-to-space",
    "symmetry-course-lessons::double-01"
  ],
  [
    "symmetry-course-lessons::double-01",
    "symmetry-course-lessons::double-02"
  ],
  [
    "symmetry-course-lessons::double-02",
    "symmetry-course-lessons::double-03"
  ],
  [
    "pointgroup-lessons::character-reduction",
    "symmetry-course-lessons::double-03"
  ],
  [
    "symmetry-course-lessons::double-02",
    "symmetry-course-lessons::double-05"
  ],
  [
    "symmetry-course-lessons::double-02",
    "symmetry-course-lessons::double-06"
  ],
  [
    "symmetry-course-lessons::space-05",
    "symmetry-course-lessons::double-06"
  ],
  [
    "pointgroup-lessons::representations",
    "symmetry-course-lessons::magnetic-04"
  ],
  [
    "symmetry-course-lessons::magnetic-04",
    "symmetry-course-lessons::double-04"
  ],
  [
    "symmetry-course-lessons::magnetic-01",
    "symmetry-course-lessons::magnetic-02"
  ],
  [
    "symmetry-course-lessons::magnetic-02",
    "symmetry-course-lessons::magnetic-03"
  ],
  [
    "symmetry-course-lessons::space-06",
    "symmetry-course-lessons::magnetic-03"
  ],
  [
    "symmetry-course-lessons::magnetic-02",
    "symmetry-course-lessons::magnetic-04"
  ],
  [
    "symmetry-course-lessons::double-04",
    "symmetry-course-lessons::magnetic-05"
  ],
  [
    "symmetry-course-lessons::magnetic-02",
    "symmetry-course-lessons::magnetic-05"
  ],
  [
    "symmetry-course-lessons::space-05",
    "symmetry-course-lessons::magnetic-05"
  ],
  [
    "symmetry-course-lessons::color-01",
    "symmetry-course-lessons::color-02"
  ],
  [
    "symmetry-course-lessons::color-01",
    "symmetry-course-lessons::color-03"
  ],
  [
    "symmetry-course-lessons::magnetic-01",
    "symmetry-course-lessons::spin-01"
  ],
  [
    "symmetry-course-lessons::spin-01",
    "symmetry-course-lessons::spin-02"
  ],
  [
    "symmetry-course-lessons::spin-01",
    "symmetry-course-lessons::spin-03"
  ],
  [
    "symmetry-course-lessons::spin-01",
    "symmetry-course-lessons::spin-04"
  ],
  [
    "symmetry-course-lessons::magnetic-01",
    "symmetry-course-lessons::spin-04"
  ],
  [
    "structure-dynamics::soft-modes",
    "structure-dynamics::imaginary-modes"
  ],
  [
    "structure-dynamics::landau-stability",
    "structure-dynamics::imaginary-modes"
  ],
  [
    "structure-dynamics::structure-factor",
    "structure-dynamics::centering-basis"
  ],
  [
    "structure-dynamics::structure-factor",
    "structure-dynamics::screw-glide"
  ],
  [
    "coupled-materials::distortion-reference",
    "coupled-materials::distortion-projection"
  ],
  [
    "coupled-materials::distortion-projection",
    "coupled-materials::landau-coupling"
  ],
  [
    "structure-dynamics::landau-stability",
    "coupled-materials::landau-coupling"
  ],
  [
    "coupled-materials::qha-free-energy",
    "coupled-materials::qha-response"
  ],
  [
    "coupled-materials::qha-response",
    "coupled-materials::qha-audit"
  ],
  [
    "structure-dynamics::imaginary-modes",
    "coupled-materials::qha-audit"
  ],
  [
    "structure-dynamics::landau-stability",
    "pathways-materials::wall-gradient"
  ],
  [
    "structure-dynamics::polar-domains",
    "pathways-materials::wall-gradient"
  ],
  [
    "pathways-materials::wall-gradient",
    "pathways-materials::wall-energy"
  ],
  [
    "pathways-materials::wall-gradient",
    "pathways-materials::wall-localized"
  ],
  [
    "principles-materials::conservation-generators",
    "coupled-materials::magnon-ferromagnet"
  ],
  [
    "coupled-materials::magnon-ferromagnet",
    "coupled-materials::magnon-antiferromagnet"
  ],
  [
    "coupled-materials::magnon-antiferromagnet",
    "coupled-materials::magnon-stability"
  ]
];
assert.deepEqual(lessonProgressionEdges.slice(130,172).map(({from,to})=>[from,to]),spinStructurePairs,
 'All 42 reviewed transfers are installed in order, with no replacement pairs');


// Momentum1 connects named lessons from read sections and actual models.
// Lock identities and pairs independently of counts or catalogue order.
const momentumReadGroups={
  "bridges-materials": [
    "density-assumptions",
    "density-lindblad",
    "polaron-conditional-cloud",
    "polaron-truncation",
    "workshop-breaking",
    "workshop-identity",
    "workshop-spin"
  ],
  "connections-materials": [
    "defects-director",
    "defects-manifold",
    "defects-winding",
    "statistics-complete-exchange",
    "statistics-pauli-projector",
    "statistics-young-sectors"
  ],
  "construction-materials": [
    "salc-build",
    "salc-multiplicity",
    "salc-selection"
  ],
  "electronic-materials": [
    "shg-geometry",
    "shg-inference",
    "shg-tensor",
    "unfold-defects",
    "unfold-folding",
    "unfold-projection"
  ],
  "lie-group-lessons": [
    "rabi-qubit-control",
    "su3-cg-exact-complex-states",
    "su3-flavor-color",
    "su3-ninej-27-input-exact",
    "su3-ninej-adjoint-invariants",
    "su3-ninej-adjoint-observables",
    "su3-ninej-color-complex",
    "su3-ninej-fifteen-input-paths",
    "su3-ninej-four-octets-channels",
    "su3-octet-selection",
    "su3-racah-complex-observables"
  ],
  "material-observables": [
    "materials-workflow"
  ],
  "pathways-materials": [
    "bandrep-cubic-sites",
    "hubbard-gaps",
    "hubbard-ionic"
  ],
  "quantum-materials": [
    "orbital-crystal-field",
    "orbital-jahn-teller",
    "orbital-soc"
  ],
  "response-materials": [
    "multiplet-competition",
    "multiplet-fock",
    "multiplet-hund"
  ],
  "spectroscopy-materials": [
    "resonance-interactions",
    "resonance-selection",
    "resonance-zeeman",
    "spectra-audit",
    "spectra-polarization",
    "spectra-slater"
  ]
};
const momentumKeys=Object.entries(momentumReadGroups).flatMap(([catalog,ids])=>ids.map(id=>catalog+'::'+id));
assert.equal(momentumKeys.length,49);
for(const key of momentumKeys){
 assert.ok(!spinReviewed.has(key),'This lesson was index-only at spin1: '+key);
 assert.ok(reviewed.has(key),'A read transfer now connects this specific lesson: '+key);
}
assert.deepEqual(new Set([...reviewed].filter(key=>!spinReviewed.has(key))),new Set(momentumKeys));
const momentumPairs=[

 ["lie-group-lessons::su2-spinor", "lie-group-lessons::rabi-qubit-control"],
 ["lie-group-lessons::su3-dynkin-representations", "lie-group-lessons::su3-flavor-color"],
 ["lie-group-lessons::su3-flavor-color", "lie-group-lessons::su3-octet-selection"],
 ["lie-group-lessons::su3-octet-selection", "lie-group-lessons::su3-cg-multiplicity"],
 ["lie-group-lessons::su3-cg-exact-radicals", "lie-group-lessons::su3-cg-exact-complex-states"],
 ["lie-group-lessons::unitary-matrices", "lie-group-lessons::su3-cg-exact-complex-states"],
 ["lie-group-lessons::su3-racah-exact-sixj", "lie-group-lessons::su3-racah-complex-observables"],
 ["lie-group-lessons::su3-cg-exact-complex-states", "lie-group-lessons::su3-racah-complex-observables"],
 ["lie-group-lessons::su3-ninej-exact-normalization", "lie-group-lessons::su3-ninej-color-complex"],
 ["lie-group-lessons::su3-flavor-color", "lie-group-lessons::su3-ninej-color-complex"],
 ["lie-group-lessons::su3-ninej-paired-trees", "lie-group-lessons::su3-ninej-four-octets-channels"],
 ["lie-group-lessons::su3-ninej-exact-normalization", "lie-group-lessons::su3-ninej-four-octets-channels"],
 ["lie-group-lessons::su3-ninej-four-octets-channels", "lie-group-lessons::su3-ninej-adjoint-invariants"],
 ["lie-group-lessons::su3-ninej-adjoint-invariants", "lie-group-lessons::su3-ninej-adjoint-observables"],
 ["lie-group-lessons::su3-cg-exact-complex-states", "lie-group-lessons::su3-ninej-adjoint-observables"],
 ["lie-group-lessons::su3-ninej-high-input-labels", "lie-group-lessons::su3-ninej-fifteen-input-paths"],
 ["lie-group-lessons::su3-ninej-fifteen-input-paths", "lie-group-lessons::su3-ninej-27-input-exact"],
 ["lie-group-lessons::su3-ninej-exact-normalization", "lie-group-lessons::su3-ninej-27-input-exact"],
 ["material-observables::ir-raman", "material-observables::materials-workflow"],
 ["material-observables::piezoelectricity", "material-observables::materials-workflow"],
 ["material-observables::neumann", "electronic-materials::shg-tensor"],
 ["material-observables::piezoelectricity", "electronic-materials::shg-tensor"],
 ["electronic-materials::shg-tensor", "electronic-materials::shg-geometry"],
 ["material-observables::polarization", "electronic-materials::shg-geometry"],
 ["electronic-materials::shg-geometry", "electronic-materials::shg-inference"],
 ["symmetry-course-lessons::space-05", "electronic-materials::unfold-folding"],
 ["electronic-materials::unfold-folding", "electronic-materials::unfold-projection"],
 ["electronic-materials::unfold-projection", "electronic-materials::unfold-defects"],
 ["pointgroup-lessons::representations", "quantum-materials::orbital-crystal-field"],
 ["quantum-materials::orbital-crystal-field", "quantum-materials::orbital-soc"],
 ["lie-group-lessons::su2-coupling-representations", "quantum-materials::orbital-soc"],
 ["principles-materials::conservation-protection", "quantum-materials::orbital-soc"],
 ["quantum-materials::orbital-crystal-field", "quantum-materials::orbital-jahn-teller"],
 ["pathways-materials::hubbard-basis", "response-materials::multiplet-fock"],
 ["quantum-materials::orbital-crystal-field", "response-materials::multiplet-fock"],
 ["response-materials::multiplet-fock", "response-materials::multiplet-hund"],
 ["lie-group-lessons::su2-coupling-representations", "response-materials::multiplet-hund"],
 ["response-materials::multiplet-hund", "response-materials::multiplet-competition"],
 ["lie-group-lessons::su2-spinor", "spectroscopy-materials::resonance-zeeman"],
 ["material-observables::neumann", "spectroscopy-materials::resonance-zeeman"],
 ["spectroscopy-materials::resonance-zeeman", "spectroscopy-materials::resonance-interactions"],
 ["lie-group-lessons::su2-coupling-representations", "spectroscopy-materials::resonance-interactions"],
 ["response-materials::multiplet-competition", "spectroscopy-materials::resonance-interactions"],
 ["spectroscopy-materials::resonance-interactions", "spectroscopy-materials::resonance-selection"],
 ["pointgroup-lessons::selection-rules", "spectroscopy-materials::resonance-selection"],
 ["response-materials::multiplet-fock", "spectroscopy-materials::spectra-slater"],
 ["response-materials::multiplet-hund", "spectroscopy-materials::spectra-slater"],
 ["quantum-materials::orbital-soc", "spectroscopy-materials::spectra-slater"],
 ["spectroscopy-materials::spectra-slater", "spectroscopy-materials::spectra-polarization"],
 ["pointgroup-lessons::selection-rules", "spectroscopy-materials::spectra-polarization"],
 ["spectroscopy-materials::resonance-selection", "spectroscopy-materials::spectra-polarization"],
 ["spectroscopy-materials::spectra-polarization", "spectroscopy-materials::spectra-audit"],
 ["pathways-materials::bandrep-decomposition", "pathways-materials::bandrep-cubic-sites"],
 ["pathways-materials::bandrep-cubic-sites", "material-research::band-restriction"],
 ["pathways-materials::hubbard-basis", "pathways-materials::hubbard-gaps"],
 ["pathways-materials::hubbard-superexchange", "pathways-materials::hubbard-gaps"],
 ["pathways-materials::hubbard-basis", "pathways-materials::hubbard-ionic"],
 ["bridges-materials::density-pure-mixed", "pathways-materials::hubbard-ionic"],
 ["pathways-materials::hubbard-gaps", "bridges-materials::manybody-lehmann"],
 ["bridges-materials::polaron-hamiltonian", "bridges-materials::polaron-conditional-cloud"],
 ["bridges-materials::density-pure-mixed", "bridges-materials::polaron-conditional-cloud"],
 ["bridges-materials::polaron-conditional-cloud", "bridges-materials::polaron-truncation"],
 ["bridges-materials::density-pure-mixed", "bridges-materials::density-lindblad"],
 ["bridges-materials::density-lindblad", "bridges-materials::density-assumptions"],
 ["bridges-materials::density-assumptions", "principles-materials::conservation-open"],
 ["pointgroup-lessons::character-reduction", "construction-materials::salc-build"],
 ["pointgroup-lessons::projection", "construction-materials::salc-build"],
 ["construction-materials::salc-build", "construction-materials::salc-selection"],
 ["pointgroup-lessons::selection-rules", "construction-materials::salc-selection"],
 ["construction-materials::salc-build", "construction-materials::salc-multiplicity"],
 ["construction-materials::salc-selection", "construction-materials::salc-multiplicity"],
 ["pointgroup-lessons::representations", "bridges-materials::workshop-identity"],
 ["symmetry-course-lessons::magnetic-01", "bridges-materials::workshop-identity"],
 ["bridges-materials::workshop-identity", "bridges-materials::workshop-spin"],
 ["symmetry-course-lessons::double-04", "bridges-materials::workshop-spin"],
 ["bridges-materials::workshop-identity", "bridges-materials::workshop-breaking"],
 ["bridges-materials::workshop-spin", "bridges-materials::workshop-breaking"],
 ["lie-group-lessons::singlet-triplet-exchange", "connections-materials::statistics-complete-exchange"],
 ["connections-materials::statistics-complete-exchange", "connections-materials::statistics-pauli-projector"],
 ["connections-materials::statistics-pauli-projector", "connections-materials::statistics-young-sectors"],
 ["pointgroup-lessons::character-reduction", "connections-materials::statistics-young-sectors"],
 ["principles-materials::order-isotropy", "connections-materials::defects-manifold"],
 ["pathways-materials::wall-gradient", "connections-materials::defects-manifold"],
 ["connections-materials::defects-manifold", "connections-materials::defects-winding"],
 ["connections-materials::defects-winding", "connections-materials::defects-director"],
 ["connections-materials::statistics-complete-exchange", "pathways-materials::hubbard-basis"],
 ["lie-group-lessons::rabi-qubit-control", "bridges-materials::density-lindblad"]
];
assert.equal(momentumPairs.length,87);
assert.equal(createHash('sha256').update(JSON.stringify(lessonProgressionEdges.slice(172))).digest('hex'),
 '92e6f642924a938a528d42871d27077c0cb93788655ddf4013c71de5987c361f','All 87 read reasons retain their exact approved content and order');
assert.deepEqual(lessonProgressionEdges.slice(172).map(({from,to})=>[from,to]),momentumPairs,
 'All 87 read proposals are installed in their reviewed order without inferred replacements');

// Inspect rendered native anchors, including links inside the optional overflow
// disclosure. Availability never depends on completing the recommended lesson.
const unescapeHref=value=>value.replace(/&amp;/g,'&');
for(const entry of lessonProgressionInventory){
 const panel=new Element();panel.innerHTML=lessonProgressionHTML(entry);
 const anchors=panel.querySelectorAll('[data-lesson-progression-link]');
 const result=lessonProgression(entry);
 for(const [kind,targets]of [['prerequisite',result.prerequisites],['next',result.next]]){
  const links=anchors.filter(a=>a.dataset.progressionKind===kind);
  assert.equal(links.length,targets.length,entry.key+'/'+kind);
  for(const target of targets){
   const anchor=links.find(a=>unescapeHref(a.getAttribute('href'))===target.route);
   assert.ok(anchor,entry.key+' links to exact '+target.catalog+'::'+target.lessonId);
   assert.equal(anchor.tag,'a');assert.equal(anchor.onclick,undefined);
   assert.equal(anchor.getAttribute('disabled'),null);assert.equal(anchor.getAttribute('data-course-route'),null);
   const parsed=parseClassroomRoute(unescapeHref(anchor.getAttribute('href')));
   assert.equal(parsed.lesson,target.lessonId);assert.equal(parsed.tab,'learn');
  }
 }
 assert.ok(anchors.some(a=>a.dataset.progressionKind==='index'));
 assert.ok(anchors.some(a=>a.dataset.progressionKind==='start'));
}

const english=loadEnglishCatalog();
for(const edge of lessonProgressionEdges){
 assert.equal(typeof english[edge.reason],'string','Every displayed reason has an English translation');
 assert.ok(english[edge.reason].trim().length>20);assert.doesNotMatch(english[edge.reason],/[\u3400-\u9fff]/u);
}
const edgeFor=(from,to)=>lessonProgressionEdges.find(x=>x.from===from&&x.to===to);
const spinUnits=edgeFor('principles-materials::exchange-classical-quantum','principles-materials::conservation-generators');
assert.match(spinUnits.reason,/meV.*rad\/ns/);assert.match(english[spinUnits.reason],/meV.*rad\/ns/);
const energyScale=edgeFor('quantum-materials::geometry-diagnostics','response-materials::hall-occupation');
assert.match(energyScale.reason,/eV.*无单位/);assert.match(english[energyScale.reason],/eV.*dimensionless/);
const axial=edgeFor('symmetry-course-lessons::magnetic-01','principles-materials::exchange-bond-constraints');
assert.match(english[axial.reason],/axial.*endpoints/);
const grids=edgeFor('quantum-materials::geometry-diagnostics','response-materials::hall-diagnostics');
assert.match(english[grids.reason],/2N−1.*2N/);

// Inspect the explanations students actually receive at cross-model boundaries.
const reasonFor=(from,to)=>english[edgeFor(from,to).reason];
assert.match(reasonFor('material-research::thermal-oscillator','material-research::thermal-data'),/hν.*ordinary frequency.*primitive cell.*input calculation cell/);
assert.match(reasonFor('material-observables::neumann','material-observables::piezoelectricity'),/engineering shear γ=2ε.*coefficient d/);
assert.match(reasonFor('quantum-materials::transport-window','quantum-materials::transport-seebeck'),/eV.*m\/s.*Boltzmann.*not device transmission/);
assert.match(reasonFor('connections-materials::reciprocity-onsager','quantum-materials::transport-seebeck'),/Dimensionless.*cannot.*SI/);
assert.match(reasonFor('electronic-materials::pairing-exchange','spectroscopy-materials::andreev-charge'),/energy scale in eV.*particle–hole.*spin twice/);
assert.match(reasonFor('pathways-materials::bandrep-bloch-phase','construction-materials::nonsymmorphic-bloch'),/fractional k_z.*radian k_x=2πf_x/);
assert.match(reasonFor('lie-group-lessons::su3-cg-higher-representations','lie-group-lessons::su3-cg-exact-radicals'),/Exact CG.*81.*numerical CG.*256/);
assert.match(reasonFor('lie-group-lessons::su3-racah-coupling-paths','lie-group-lessons::su3-racah-exact-sixj'),/weighted orthogonality.*conversion still uses F/);
assert.match(reasonFor('lie-group-lessons::su3-ninej-paired-trees','lie-group-lessons::su3-ninej-exact-normalization'),/products of two leaf-branch dimensions.*cannot replace R/);

// Check the visible preparation instructions at the newly joined physical
// boundaries, rather than accepting any long sentence for a matching pair.
assert.match(reasonFor('pointgroup-lessons::from-point-to-space','symmetry-course-lessons::space-06'),/input k unchanged.*ordinary structure conversion for magnetic structures/);
assert.match(reasonFor('pointgroup-lessons::character-reduction','symmetry-course-lessons::double-03'),/complete four-element C4.*three copies.*not a protected threefold/);
assert.match(reasonFor('symmetry-course-lessons::double-02','symmetry-course-lessons::double-06'),/proper rotations only.*inversion and mirrors/i);
assert.match(reasonFor('symmetry-course-lessons::space-05','symmetry-course-lessons::double-06'),/fractional k_z.*does not prove energy degeneracy/);
assert.match(reasonFor('symmetry-course-lessons::magnetic-04','symmetry-course-lessons::double-04'),/U U conjugate.*Hamiltonian symmetry.*same momentum/);
assert.match(reasonFor('symmetry-course-lessons::double-04','symmetry-course-lessons::magnetic-05'),/one-dimensional axial.*magnetic reciprocal fractions.*transverse three-dimensional.*momentum condition/);
assert.match(reasonFor('symmetry-course-lessons::color-01','symmetry-course-lessons::color-03'),/change to a parent group.*C3 generator cannot.*complex conjugation/);
assert.match(reasonFor('symmetry-course-lessons::spin-01','symmetry-course-lessons::spin-03'),/hold every site fixed.*SO\(3\).*antiunitary.*O\(3\)/);
assert.match(reasonFor('symmetry-course-lessons::magnetic-01','symmetry-course-lessons::spin-04'),/orthonormal Cartesian.*time-reversal branch.*Hamiltonian/);
assert.match(reasonFor('structure-dynamics::structure-factor','structure-dynamics::screw-glide'),/positive-exponent.*R transpose h=h.*00l.*0kl.*not apply to all hkl/);
assert.match(reasonFor('coupled-materials::distortion-reference','coupled-materials::distortion-projection'),/Euclidean normalization.*angstrom.*not mass-weighted/);
assert.match(reasonFor('coupled-materials::distortion-projection','coupled-materials::landau-coupling'),/angstrom.*independently dimensionless.*neither fits energy coefficients/);
assert.match(reasonFor('coupled-materials::qha-free-energy','coupled-materials::qha-response'),/per input cell.*fixed hydrostatic pressure.*minimized G.*Cv cannot.*Cp/);
assert.match(reasonFor('structure-dynamics::imaginary-modes','coupled-materials::qha-audit'),/no mode-resolved information.*cannot establish.*dynamical stability/);
assert.match(reasonFor('pathways-materials::wall-gradient','pathways-materials::wall-localized'),/separate open spinless SSH.*eV.*bond spacings.*do not copy.*subspace projectors/i);
assert.match(reasonFor('principles-materials::conservation-generators','coupled-materials::magnon-ferromagnet'),/H\/hbar.*meV.*not tesla.*U\(1\).*does not itself guarantee a zero mode/);
assert.match(reasonFor('coupled-materials::magnon-ferromagnet','coupled-materials::magnon-antiferromagnet'),/q=qa\/pi.*FM cell a and AFM cell 2a.*different zone intervals.*non-Hermitian/);
assert.match(reasonFor('coupled-materials::magnon-antiferromagnet','coupled-materials::magnon-stability'),/Real frequencies do not establish energetic stability.*old Neel reference.*not the excitation spectrum/);


// Inspect the newly visible transfer boundaries, not only destination names.
assert.match(reasonFor('material-observables::neumann','electronic-materials::shg-tensor'),/χ\(2ω;ω,ω\).*j↔k.*Kleinman/);
assert.match(reasonFor('material-observables::piezoelectricity','electronic-materials::shg-tensor'),/χ is neither piezoelectric e nor d=χ\/2.*xxz and zxx.*independent/);
assert.match(reasonFor('material-observables::polarization','electronic-materials::shg-geometry'),/amplitudes before.*three-index.*input polarization first.*Do not copy/);
assert.match(reasonFor('symmetry-course-lessons::space-05','electronic-materials::unfold-folding'),/reciprocal fractions.*2π.*radians\/a.*k\/π.*convert/);
assert.match(reasonFor('electronic-materials::unfold-projection','electronic-materials::unfold-defects'),/M\/N.*removes an orbital.*complex eigenbasis.*missing weight/);
assert.match(reasonFor('lie-group-lessons::su3-cg-exact-complex-states','lie-group-lessons::su3-ninej-adjoint-observables'),/eight singlet paths.*thirty-two final-octet paths.*different lengths/);
assert.match(reasonFor('quantum-materials::orbital-crystal-field','quantum-materials::orbital-jahn-teller'),/not an automatic truncation.*dimensionless.*neither a bond length nor a mass-weighted displacement/);
assert.match(reasonFor('response-materials::multiplet-hund','spectroscopy-materials::spectra-slater'),/Slater.*Do not automatically relabel.*U.*J/);
assert.match(reasonFor('spectroscopy-materials::resonance-selection','spectroscopy-materials::spectra-polarization'),/pi−pf.*weights pi.*GHz to eV.*cannot reuse the same operator/);
assert.match(reasonFor('spectroscopy-materials::spectra-polarization','spectroscopy-materials::spectra-audit'),/0.4\(10−n\).*not an absolute absorption edge.*full-axis.*positive-frequency/);
assert.match(reasonFor('bridges-materials::density-assumptions','principles-materials::conservation-open'),/complete adjoint generator.*one initial state.*every initial state/);
assert.match(reasonFor('connections-materials::statistics-pauli-projector','connections-materials::statistics-young-sectors'),/central S3.*idempotence and non-Hermiticity.*Y\/3/);
assert.match(reasonFor('bridges-materials::workshop-identity','bridges-materials::workshop-spin'),/time reversal.*odd.*same-parity inversion.*even.*d\(k\)=0/);
assert.match(reasonFor('connections-materials::defects-winding','connections-materials::defects-director'),/exp\(iθ\).*exp\(2iθ\).*n≡−n.*half-turn/);


const pg=lessonProgression({catalog:'pointgroups',lessonId:'representations'});
const lie=lessonProgression({catalog:'lie',lessonId:'representations'});
assert.notEqual(pg.current.route,lie.current.route);
assert.equal(parseClassroomRoute(pg.current.route).section,'pointgroups');
assert.equal(parseClassroomRoute(lie.current.route).section,'lie');
assert.equal(parseClassroomRoute(lie.current.route).track,'representations');
assert.equal(lessonProgression({lessonId:'representations'}).status,'unknown','A naked duplicated ID must not select a catalogue');

for(const[catalog,lessonId,priorCatalog,priorId]of[
 ['bridges','manybody-lehmann','pathways-materials','hubbard-basis'],
 ['frontiers','spt-schmidt','bridges-materials','density-pure-mixed'],
 ['frontiers','spt-aklt-parent','lie-group-lessons','su2-coupling-representations'],
 ['material-research','thermal-oscillator','material-observables','acoustic-optical'],
 ['connections','reciprocity-onsager','material-observables','neumann'],
 ['pathways','scattering-chain','material-observables','mechanical-modes'],
 ['pathways','scattering-chain','material-observables','acoustic-optical'],
 ['pathways','scattering-phase','pathways-materials','scattering-chain'],
 ['pathways','scattering-temperature','pathways-materials','scattering-phase']
])assert.ok(lessonProgression({catalog,lessonId}).prerequisites.some(item=>item.catalog===priorCatalog&&item.lessonId===priorId));

const formerlyUnspecified=lessonProgression({catalog:'lie',lessonId:'su3-ninej-27-input-exact'});
assert.equal(formerlyUnspecified.status,'reviewed');
assert.deepEqual(formerlyUnspecified.prerequisites.map(item=>item.lessonId),['su3-ninej-fifteen-input-paths','su3-ninej-exact-normalization']);
assert.match(lessonProgressionHTML({catalog:'lie',lessonId:'su3-ninej-27-input-exact'}),/本主题目录/);
const unspecified=lessonProgression({catalog:'lie'});
assert.equal(unspecified.status,'unknown');assert.equal(unspecified.current,null);
assert.deepEqual(unspecified.prerequisites,[]);assert.deepEqual(unspecified.next,[]);
assert.equal(parseClassroomRoute(unspecified.index.route)?.section,'lie');
assert.equal(lessonProgressionHTML({catalog:'lie',lessonId:'future-not-in-catalogue'}),'');
assert.equal(lessonProgression({catalog:'__proto__',lessonId:'representations'}).status,'unknown');

const linkHTML=lessonProgressionHTML({catalog:'frontiers',lessonId:'spt-schmidt'});
assert.match(linkHTML,/data-progression-kind="prerequisite"/);
assert.match(linkHTML,/lesson=density-pure-mixed/);
assert.match(linkHTML,/data-progression-kind="next"/);
assert.match(linkHTML,/lesson=spt-protection/);
assert.match(linkHTML,/href="#classroom\/start"/);
assert.ok(!/\sonclick=|\sdisabled\b|javascript:/.test(linkHTML),'Learning links remain native, optional destinations');

const editable=lessonProgression({catalog:'bridges',lessonId:'manybody-lehmann'});
editable.current.title='changed';editable.prerequisites[0].title='changed';editable.index.route='#changed';
const unaffected=lessonProgression({catalog:'bridges',lessonId:'manybody-lehmann'});
assert.notEqual(unaffected.current.title,'changed');assert.notEqual(unaffected.prerequisites[0].title,'changed');assert.notEqual(unaffected.index.route,'#changed');

for(const route of ['#classroom/pointgroups?lesson=representations','#classroom/lie?track=representations&lesson=representations','#classroom/bridges?module=manybody&lesson=manybody-lehmann','#classroom/crystal?track=double&lesson=double-04']){
 const parsed=parseClassroomRoute(route);assert.ok(parsed?.lesson,'Existing deep link still resolves: '+route);
}

// These are actual initial UI choices, rather than inferred pedagogical order.
for(const[route,expected]of[
 ['#classroom/foundations','group-basics'],
 ['#classroom/crystal','space-01'],
 ['#classroom/spin?track=double','double-01'],
 ['#classroom/spin?track=magnetic','magnetic-01'],
 ['#classroom/spin?track=color','color-01'],
 ['#classroom/spin?track=spin','spin-01'],
 ['#classroom/continuous','continuous-symmetry'],
 ['#classroom/coupling','representations'],
 ['#classroom/coupling?track=cg','su3-cg-change-basis'],
 ['#classroom/coupling?track=racah','su3-racah-coupling-paths'],
 ['#classroom/coupling?track=ninej','su3-ninej-paired-trees'],
 ['#classroom/observables','mechanical-modes'],
 ['#classroom/structure-dynamics','landau-stability'],
 ['#classroom/spin?module=hubbard','hubbard-basis'],
 ['#classroom/observables?module=manybody','manybody-lehmann'],
 ['#classroom/spin?module=spt','spt-aklt-parent'],
 ['#classroom/structure-dynamics?module=distortion&material=srtio3','distortion-projection'],
 ['#classroom/structure-dynamics?module=distortion&material=srtio3&preset=batio3','distortion-reference'],
 ['#classroom/spin?track=color&lesson=color-01&level=space','color-02']
])assert.equal(progressionForSelection(parseClassroomRoute(route)).current?.lessonId,expected,route);

// All module defaults resolve within that actual module; a missing or unknown
// module cannot silently inherit the first module of a catalogue.
for(const definition of lessonProgressionCatalogs){
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/'+definition.catalog+'.json',import.meta.url),'utf8'));
 for(const module of definition.modules){
  const result=progressionForSelection({section:definition.section,module,tab:'learn'});
  assert.equal(result.current?.lessonId,data.lessons.find(item=>item.module===module).id,definition.catalog+'/'+module);
  assert.equal(result.resolution,'module-default');
 }
 if(definition.modules.length){
  assert.equal(progressionForSelection({section:definition.section}).current,null,definition.catalog);
  assert.equal(progressionForSelection({section:definition.section,module:'future-not-registered'}).current,null,definition.catalog);
 }
}

assert.equal(progressionForSelection({section:'pointgroups',lesson:'representations'}).current?.catalog,'pointgroup-lessons');
assert.equal(progressionForSelection({section:'lie',lesson:'representations'}).current?.catalog,'lie-group-lessons');
assert.equal(progressionForSelection({section:'pointgroups',lesson:'su2-spinor'}).current,null,'An explicit lesson must belong to its selected catalogue');
assert.equal(progressionForSelection({section:'frontiers',module:'layers',lesson:'spt-schmidt'}).current,null,'A module mismatch does not guess the intended lesson');
assert.equal(progressionForSelection({section:'lie',track:'future-stage'}).current,null);
assert.equal(progressionForSelection({section:'academy',track:'future-track'}).current,null);
assert.equal(progressionForSelection({section:'unregistered'}).index.route,'#classroom');
assert.equal(progressionForSelection({section:'frontiers',module:'spt',lesson:'spt-aklt-parent',exercise:'spt-schmidt-steps',tab:'learn'}).current?.lessonId,'spt-schmidt','An exercise deep link has the same explicit priority as the topic UI');
assert.equal(progressionForSelection({section:'frontiers',module:'spt',exercise:'future-exercise',tab:'learn'}).current,null);
assert.equal(progressionForSelection({section:'observables',lesson:'neumann',exercise:'count-optical',tab:'learn'}).current?.lessonId,'neumann','Observables only lets an exercise override the lesson in its derive tab');
const changed=progressionForSelection({section:'frontiers',module:'spt',tab:'learn'});
changed.current.exerciseIds.push('mutated');
assert.ok(!progressionForSelection({section:'frontiers',module:'spt',tab:'learn'}).current.exerciseIds.includes('mutated'));
// Exercise the real classroom shell with a caller-owned navigator. Graph links
// remain native; ordinary local tabs keep the current renderer and expert tool
// routes neither request the graph nor acquire a prerequisite/completion gate.
Element.prototype.insertAdjacentHTML=function(position,value){
 const fragment=new Element();fragment.innerHTML=value;
 const parent=position==='afterend'?this.parentNode:this;
 for(const child of fragment.children)child.parentNode=parent;
 if(position==='afterbegin')parent.children.unshift(...fragment.children);
 else if(position==='afterend')parent.children.splice(parent.children.indexOf(this)+1,0,...fragment.children);
 else throw Error('Unsupported test insertion position');
};
let storageReads=0,storageWrites=0,calculations=0,graphLoads=0;
globalThis.localStorage={getItem:()=>{storageReads++;return null;},setItem:()=>{storageWrites++;}};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
const progressionModule={progressionForSelection,lessonProgressionHTML};
const shellContainer=new Container(),shellCalls=[],shellMoves=[];
const shellRenderers=Object.fromEntries(classroomSections.map(s=>[s.id,options=>shellCalls.push({section:s.id,...options})]));
const renderShell=route=>renderClassroomView({container:shellContainer,route:parseClassroomRoute(route),
 onNavigate:(hash,options)=>shellMoves.push({hash,options}),courseRenderers:shellRenderers,
 run:()=>{calculations++;},loadProgression:()=>{graphLoads++;return Promise.resolve(progressionModule);}});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
let shellLessonCases=0;
for(const [catalog,lessonId,context='']of[
 ['principles-materials','order-field-convention'],['principles-materials','exchange-conventions'],
 ['principles-materials','conservation-protection'],['frontiers-materials','layer-registry'],
 ['frontiers-materials','chiral-tolerance'],['quantum-materials','geometry-diagnostics'],
 ['response-materials','hall-diagnostics'],
 ...newlyConnectedKeys.map(key=>key.split('::')),
 ...spinStructureKeys.map(key=>key.split('::')),
 ...momentumKeys.map(key=>key.split('::')),
 ['symmetry-course-lessons','double-06','experiment=double_group&preset=screw21_space&level=space&material=silicon&group=4'],
 ['coupled-materials','qha-audit','exercise=qha-boundary&material=silicon'],
 ['pathways-materials','wall-localized','exercise=wall-localized-ex']
]){
 shellLessonCases++;
 const entry=inventory.get(catalog+'::'+lessonId),route=entry.route+(context?'&'+context:''),initialContext=parseClassroomRoute(route);
 renderShell(route);await settle();
 const host=shellContainer.querySelector('#classroom-progression');assert.ok(host);assert.equal(host.hidden,false);
 assert.match(host.innerHTML,new RegExp(catalog+'::'+lessonId));
 for(const anchor of host.querySelectorAll('[data-lesson-progression-link]'))assert.equal(anchor.onclick,undefined,'Custom navigation does not turn optional anchors into gated callbacks');
 const renders=shellCalls.length,active=shellCalls.at(-1);
 active.onNavigate({tab:'lab'});await settle();assert.equal(host.hidden,true);assert.equal(shellCalls.length,renders);
 const labContext=parseClassroomRoute(shellMoves.at(-1).hash);
 assert.equal(labContext.tab,'lab');assert.deepEqual(shellMoves.at(-1).options,{render:false});
 for(const key of ['section','pathway','module','lesson','track','material','preset','exercise','group','level','experiment']){
  // An exercise selects a derive view; academy material selects its materials
  // view. Leaving those tabs intentionally removes their scoped URL selectors,
  // while the existing renderer and its input state remain mounted.
  const scopedSelector=key==='exercise'||key==='material'&&['academy','pointgroups','lie'].includes(initialContext.section);
  assert.equal(labContext[key],scopedSelector?undefined:initialContext[key],entry.key+' preserves the tab-appropriate local '+key);
 }

 active.onNavigate({tab:'learn'});await settle();assert.equal(host.hidden,false);assert.equal(shellCalls.length,renders);
}
assert.equal(shellLessonCases,142,'All 49 momentum1 identities and earlier context-rich routes use the actual classroom shell');
let expertCases=0;
for(const tool of [
 'order-parameter-lab','exchange-symmetry-lab','conservation-lab','layer-symmetry-lab',
 'chirality-polarity-lab','quantum-geometry-lab','hall-response-lab',
 'phonopy','phonon-modes','phonon-thermo','phonons','tensors',
 'phase','diffraction','distortion-modes','magnon-lab','qha-lab','domain-wall-lab',
 'electron-transport-lab','device-transport-lab','pairing-lab','andreev-lab',
 'band-representation-lab','band-connectivity','nonsymmorphic-lab','wavevector-lab',
 'lie/su3','lie/su3_tensor','lie/su3_cg','lie/su3_racah','lie/su3_ninej',
 'lie/rabi','shg-lab','unfold-lab','crystal-field-lab','local-multiplet-lab',
 'spin-resonance-lab','atomic-spectra-lab','hubbard-cluster-lab','manybody-spectra-lab',
 'polaron-lab','density-matrix-lab','salc-lab','symmetry-workshop','statistics-lab','topological-defects-lab'
]){
 expertCases++;
 const loads=graphLoads,route='compute/'+tool;assert.equal(parseClassroomRoute(route)?.calculationOnly,true,route);
 renderShell(route);await settle();assert.equal(graphLoads,loads,'Direct expert entry does not load prerequisites: '+tool);
 assert.equal(shellContainer.querySelector('#classroom-progression'),null);assert.equal(shellCalls.at(-1).selection.calculationOnly,true);
 shellCalls.at(-1).onNavigate({tab:'lab'});await settle();assert.ok(shellMoves.at(-1).hash.startsWith('#compute/'));
 assert.deepEqual(shellMoves.at(-1).options,{render:false});assert.equal(graphLoads,loads);
}
assert.equal(expertCases,46,'Every reviewed model family keeps its direct expert entry independent of the learning graph');
assert.equal(calculations,0);assert.equal(storageReads,0);assert.equal(storageWrites,0);
console.log('Lesson progression: 197 qualified routes in 17 catalogues, 259 optional edges over all 197 read lessons, all preceding 172 preserved and 87/49 momentum additions explicit, all native targets, complete English reasons, unit/action-space/model boundaries, acyclic recommendations, honest unknown-scope fallback, caller-owned local navigation and direct expert access passed.');
