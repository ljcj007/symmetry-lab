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
assert.equal(lessonProgressionEdges.length,130);
const reviewed=new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to]));
assert.equal(reviewed.size,112,'The remaining indexed lessons are not automatically assigned dependencies');
assert.equal(createHash('sha256').update(JSON.stringify(lessonProgressionEdges.slice(0,82))).digest('hex'),
 '998a4da95dc3a201e64ed830c2a4f5f58306477fec8aa66cbd6f27d6ee5dfff8',
 'The preceding 82 optional connections, their reasons and their order remain unchanged');

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

// This release was reviewed as four bounded scientific workflows, rather than
// inferring dependencies from catalogue order. Keep the 48 reviewed pairs and
// the 47 newly connected identities explicit while testing the real live routes.
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
for(const key of newlyConnectedKeys){
 assert.ok(!originalReviewed.has(key),'This lesson was index-only before the current review: '+key);
 assert.ok(reviewed.has(key),'A reviewed operational transfer is installed: '+key);
}
assert.deepEqual(new Set([...reviewed].filter(key=>!originalReviewed.has(key))),new Set(newlyConnectedKeys));
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
assert.deepEqual(lessonProgressionEdges.slice(82).map(({from,to})=>[from,to]),reviewedAdditionPairs,
 'Every reviewed pair is installed once; no unreviewed inferred links are substituted');

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

const unspecified=lessonProgression({catalog:'lie',lessonId:'su3-ninej-27-input-exact'});
assert.equal(unspecified.status,'index-only');
assert.deepEqual(unspecified.prerequisites,[]);assert.deepEqual(unspecified.next,[]);
assert.match(lessonProgressionHTML({catalog:'lie',lessonId:'su3-ninej-27-input-exact'}),/本主题目录/);
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
for(const [catalog,lessonId]of[
 ['principles-materials','order-field-convention'],['principles-materials','exchange-conventions'],
 ['principles-materials','conservation-protection'],['frontiers-materials','layer-registry'],
 ['frontiers-materials','chiral-tolerance'],['quantum-materials','geometry-diagnostics'],
 ['response-materials','hall-diagnostics'],
 ...newlyConnectedKeys.map(key=>key.split('::'))
]){
 const entry=inventory.get(catalog+'::'+lessonId),initialContext=parseClassroomRoute(entry.route);
 renderShell(entry.route);await settle();
 const host=shellContainer.querySelector('#classroom-progression');assert.ok(host);assert.equal(host.hidden,false);
 assert.match(host.innerHTML,new RegExp(catalog+'::'+lessonId));
 for(const anchor of host.querySelectorAll('[data-lesson-progression-link]'))assert.equal(anchor.onclick,undefined,'Custom navigation does not turn optional anchors into gated callbacks');
 const renders=shellCalls.length,active=shellCalls.at(-1);
 active.onNavigate({tab:'lab'});await settle();assert.equal(host.hidden,true);assert.equal(shellCalls.length,renders);
 const labContext=parseClassroomRoute(shellMoves.at(-1).hash);
 assert.equal(labContext.tab,'lab');assert.deepEqual(shellMoves.at(-1).options,{render:false});
 for(const key of ['section','pathway','module','lesson','track','material','preset','exercise','group','level']){
  assert.equal(labContext[key],initialContext[key],entry.key+' preserves local '+key);
 }

 active.onNavigate({tab:'learn'});await settle();assert.equal(host.hidden,false);assert.equal(shellCalls.length,renders);
}
for(const tool of [
 'order-parameter-lab','exchange-symmetry-lab','conservation-lab','layer-symmetry-lab',
 'chirality-polarity-lab','quantum-geometry-lab','hall-response-lab',
 'phonopy','phonon-modes','phonon-thermo','phonons','tensors',
 'electron-transport-lab','device-transport-lab','pairing-lab','andreev-lab',
 'band-representation-lab','band-connectivity','nonsymmorphic-lab','wavevector-lab',
 'lie/su3','lie/su3_tensor','lie/su3_cg','lie/su3_racah','lie/su3_ninej'
]){
 const loads=graphLoads,route='compute/'+tool;assert.equal(parseClassroomRoute(route)?.calculationOnly,true,route);
 renderShell(route);await settle();assert.equal(graphLoads,loads,'Direct expert entry does not load prerequisites: '+tool);
 assert.equal(shellContainer.querySelector('#classroom-progression'),null);assert.equal(shellCalls.at(-1).selection.calculationOnly,true);
 shellCalls.at(-1).onNavigate({tab:'lab'});await settle();assert.ok(shellMoves.at(-1).hash.startsWith('#compute/'));
 assert.deepEqual(shellMoves.at(-1).options,{render:false});assert.equal(graphLoads,loads);
}
assert.equal(calculations,0);assert.equal(storageReads,0);assert.equal(storageWrites,0);
console.log('Lesson progression: 197 qualified routes in 17 catalogues, 130 optional edges over 112 connected read lessons, original 82 preserved, all native targets, complete English reasons, unit/action-space/model boundaries, acyclic recommendations, honest index fallback, caller-owned local navigation and direct expert access passed.');
