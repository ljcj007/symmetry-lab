import {progressionCatalogs,progressionLessons} from './lesson-progression-index.js?v=20261113-route1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(catalog,lessonId)=>catalog+'::'+lessonId;
const byKey=new Map(progressionLessons.map(item=>[key(item.catalog,item.lessonId),item]));
const catalogFor=new Map(progressionCatalogs.flatMap(item=>[[item.catalog,item],[item.section,item]]));
const copyLesson=item=>({...item,exerciseIds:[...(item.exerciseIds||[])]});
const ref=(catalog,lessonId)=>key(catalog,lessonId);
const pg=id=>ref('pointgroup-lessons',id),sc=id=>ref('symmetry-course-lessons',id),lie=id=>ref('lie-group-lessons',id);
const obs=id=>ref('material-observables',id),research=id=>ref('material-research',id),pathways=id=>ref('pathways-materials',id);
const bridges=id=>ref('bridges-materials',id),frontiers=id=>ref('frontiers-materials',id),connections=id=>ref('connections-materials',id);

// Each edge names the operation carried into the destination. These optional
// recommendations are not a dependency inferred from catalogue/array order.
const edgeDefinitions=[
 [pg('group-basics'),pg('operations-notation'),"Use composition and inverse operations to identify group elements before reading rotation, mirror, and inversion symbols."],
 [pg('operations-notation'),pg('thirty-two'),"Connect specific rotations and mirrors with the rotation orders allowed in a periodic crystal."],
 [pg('operations-notation'),pg('representations'),"Identify the geometric operation, then see how its action on column vectors gives a matrix."],
 [pg('representations'),pg('character-reduction'),"Specify the action space and matrices before using their traces to calculate irreducible multiplicities."],
 [pg('character-reduction'),pg('projection'),"Distinguish an irreducible representation's dimension from its multiplicity before projecting the corresponding basis functions."],
 [pg('character-reduction'),pg('selection-rules'),"Use character reduction to determine whether the tensor product of the operator and initial and final state representations contains a totally symmetric component."],
 [pg('thirty-two'),sc('space-01'),"Distinguish point-group types before introducing periodic translations, the lattice, and the atomic basis."],
 [sc('space-01'),sc('space-02'),"Build on lattices and translations to represent and compose spatial operations using Seitz pairs."],
 [sc('space-02'),sc('space-03'),"Use the composition rules for rotations and translations to understand screw axes and glide planes."],
 [sc('space-02'),sc('space-04'),"Apply spatial operations repeatedly to distinguish a site's orbit from the stabilizer that fixes it."],
 [sc('space-03'),sc('space-05'),"Include real-space fractional translations in Bloch phases to examine momentum-dependent representations."],
 [pg('representations'),sc('space-05'),"Understand representation matrices and characters before introducing wavevectors and little-group conditions."],
 [pg('representations'),lie('continuous-symmetry'),"Compare familiar discrete matrix operations with continuously adjustable rotations and phases."],
 [lie('continuous-symmetry'),lie('unitary-matrices'),"Continuous transformations must still preserve the state's norm; use this requirement to understand unitarity."],
 [lie('unitary-matrices'),lie('generators-commutators'),"Study small norm-preserving matrix transformations to identify generators and the commutator that compares their order."],
 [lie('generators-commutators'),lie('su2-spinor'),"Apply the general idea of generators to Pauli matrices and rotations of a two-component spinor."],
 [lie('su2-spinor'),lie('su2-double-cover'),"Follow the rotation of one spinor, then compare when its two-component amplitudes and the corresponding three-dimensional vector return to their original values."],
 [lie('generators-commutators'),lie('representations'),"Distinguish group elements from generators before comparing matrices for the same group acting in different spaces."],
 [lie('representations'),lie('su2-coupling-representations'),"Distinguish representation dimension from multiplicity before constructing product and coupled bases for two spins."],
 [lie('su2-spinor'),lie('su2-coupling-representations'),"Understand the two-component space of one spin 1/2 before constructing the four-dimensional space of two spins."],
 [lie('su2-coupling-representations'),lie('singlet-triplet-exchange'),"Use the singlet and triplet sectors obtained by tensor-product decomposition to analyze exchange energies."],
 [pg('representations'),obs('mechanical-modes'),"Combine the atomic permutation with the action on three-dimensional displacements to construct the mechanical representation."],
 [obs('mechanical-modes'),obs('acoustic-optical'),"Check the total displacement dimension before separating collective translations from relative motion."],
 [obs('mechanical-modes'),obs('ir-raman'),"Use the irreducible components of the displacement representation to identify vibrations that can couple to optical operators."],
 [pg('selection-rules'),obs('ir-raman'),"Apply the general matrix-element condition to polar-vector and quadratic-function selection rules."],
 [pathways('hubbard-basis'),pathways('hubbard-superexchange'),"Fix the occupation-number sector and fermionic mode ordering before following virtual hopping in the dimer."],
 [pathways('hubbard-basis'),bridges('manybody-lehmann'),"Apply creation and annihilation operators to occupation-number states before distinguishing transition energies from nonzero spectral weights."],
 [bridges('manybody-lehmann'),bridges('manybody-response'),"Understand the initial and final states and matrix elements before replacing the single-electron probe with a spin or charge probe that preserves particle number."],
 [bridges('manybody-lehmann'),bridges('manybody-checks'),"Use the calculated addition and removal spectra to check sum rules, limiting cases, and averaging over degenerate states."],
 [lie('su2-coupling-representations'),bridges('density-exchange'),"Connect the change to singlet and triplet basis states with entanglement generated by exchange evolution."],
 [bridges('density-pure-mixed'),bridges('density-exchange'),"Distinguish a global pure state from a mixed reduced state before explaining exchange-generated entanglement."],
 [lie('su2-coupling-representations'),frontiers('spt-aklt-parent'),"Use the singlet and symmetric triplet sectors of two spins 1/2 to understand virtual and physical spins in the AKLT construction."],
 [bridges('density-pure-mixed'),frontiers('spt-schmidt'),"Work through the partial trace for two spins before constructing reduced states and entanglement entropy from Schmidt probabilities."],
 [frontiers('spt-aklt-parent'),frontiers('spt-schmidt'),"Specify the AKLT state and boundary conditions before distinguishing group actions on physical spins and the Schmidt virtual space."],
 [frontiers('spt-schmidt'),frontiers('spt-protection'),"Identify the entanglement spectrum and projective representation before checking protection conditions along a perturbation path."],
 [obs('acoustic-optical'),research('thermal-oscillator'),"Count the vibrational branches per primitive cell before constructing thermal occupations and partition functions for positive-frequency modes."],
 [research('thermal-oscillator'),pathways('scattering-temperature'),"Use the Bose occupation obtained from normalized thermal probabilities to distinguish n+1 for phonon creation from n for phonon annihilation."],
 [research('thermal-oscillator'),bridges('polaron-hamiltonian'),"Understand quantum-oscillator energies and occupations before combining local oscillators and the electron in one Hilbert space."],
 [research('thermal-oscillator'),ref('coupled-materials','qha-free-energy'),"Establish the phonon free energy per primitive cell before comparing free energies at different volumes."],
 [obs('neumann'),connections('reciprocity-onsager'),"Understand the tensor constraints imposed by spatial operations, then separately choose thermodynamic fluxes and forces to discuss reciprocity."],
 [sc('magnetic-01'),connections('reciprocity-onsager'),"Establish time-reversal parity, then check the parities of the thermodynamic state variables defining the conjugate flux-force pairs and reverse the magnetic field and magnetization together."],
 [obs('neumann'),connections('reciprocity-spatial-response'),"Use spatial tensor constraints to compare allowed components within one magnetic domain."],
 [connections('reciprocity-onsager'),connections('reciprocity-spatial-response'),"Distinguish the reversed magnetic states compared by reciprocity from spatial point-group constraints before combining the two conditions."],
 [connections('reciprocity-spatial-response'),connections('reciprocity-dissipation'),"Once spatial and reciprocity conditions are specified, examine the symmetric dissipative part and the antisymmetric transverse response."]
];

export const lessonProgressionEdges=Object.freeze(edgeDefinitions.map(([from,to,reason])=>Object.freeze({from,to,reason})));
export const lessonProgressionInventory=Object.freeze(progressionLessons.map(item=>Object.freeze({...copyLesson(item),exerciseIds:Object.freeze([...(item.exerciseIds||[])]),key:key(item.catalog,item.lessonId)})));
export const lessonProgressionCatalogs=Object.freeze(progressionCatalogs.map(item=>Object.freeze({...item,modules:Object.freeze([...item.modules])})));

/** A fresh value is returned on every call; there is no learning-progress state. */
export function lessonProgression({catalog,lessonId}={}){
 const definition=catalogFor.get(catalog),catalogId=definition?.catalog;
 const identity=catalogId&&typeof lessonId==='string'?key(catalogId,lessonId):null;
 const current=identity?byKey.get(identity):null;
 const prerequisites=current?lessonProgressionEdges.filter(edge=>edge.to===identity).map(edge=>({...copyLesson(byKey.get(edge.from)),reason:edge.reason})):[];
 const next=current?lessonProgressionEdges.filter(edge=>edge.from===identity).map(edge=>({...copyLesson(byKey.get(edge.to)),reason:edge.reason})):[];
 return{status:current?(prerequisites.length||next.length?'reviewed':'index-only'):'unknown',
  current:current?copyLesson(current):null,prerequisites,next,
  index:definition?{title:definition.title,route:current?.indexRoute||definition.route}:{title:"All classroom pathways",route:'#classroom'},
  start:{title:"Start from the basics",route:'#classroom/start'}};
}

/**
 * Resolve an initial, parsed classroom selection without confusing a catalogue's
 * first lesson with the first lesson of the selected module/stage. This is
 * routing metadata, not an inference about prerequisite order. Unknown or
 * insufficiently scoped destinations return current:null and a catalogue index.
 * Pass the complete selection when exercise/material/preset context is present.
 */
export function progressionForSelection(selection={}){
 const definition=catalogFor.get(selection.section||selection.catalog);
 const fallback=()=>({...lessonProgression({catalog:definition?.catalog}),resolution:'index'});
 if(!definition)return fallback();
 let candidates=progressionLessons.filter(item=>item.catalog===definition.catalog);
 const modular=definition.modules.length>0;
 if(modular){
  if(!definition.modules.includes(selection.module))return fallback();
  candidates=candidates.filter(item=>item.module===selection.module);
 }else if(selection.module)return fallback();
 let chosen=typeof selection.lesson==='string'&&selection.lesson?candidates.find(item=>item.lessonId===selection.lesson):null;
 if(selection.lesson&&!chosen)return fallback();
 let resolution=chosen?'explicit':modular?'module-default':'course-default';
 const exerciseMaySelect=modular||definition.section==='dynamics'||definition.section==='observables'&&selection.tab==='derive';
 if(selection.exercise&&exerciseMaySelect){
  const exerciseLesson=candidates.find(item=>item.exerciseIds.includes(selection.exercise));
  if(!exerciseLesson)return fallback();
  chosen=exerciseLesson;resolution='exercise';
 }
 if(definition.section==='lie'){
  const tracks=['all','continuous','representations','cg','racah','ninej','coupling'];
  if(!chosen&&selection.track&&!tracks.includes(selection.track))return fallback();
  const track=selection.track||'all';
  const matches=item=>track==='all'||item.track===track||track==='continuous'&&item.lessonId==='representations'||track==='coupling'&&item.track!=='continuous';
  if(!chosen){chosen=candidates.find(matches);resolution='track-default';}
 }else if(definition.section==='academy'){
  const tracks=['all',...new Set(candidates.map(item=>item.track))];
  if(!chosen&&selection.track&&!tracks.includes(selection.track))return fallback();
  const track=chosen?.track||selection.track||'all';
  let visible=candidates.filter(item=>track==='all'||item.track===track);
  const level=['point','space'].includes(selection.level)?selection.level:'all';
  const matching=visible.filter(item=>level==='all'||!item.symmetryLevel||item.symmetryLevel==='point-and-space'||item.symmetryLevel===level);
  if(matching.length)visible=matching;
  if(!chosen||!visible.includes(chosen)){chosen=visible[0];resolution='track-default';}
 }else if(definition.section==='coupled-materials'&&selection.module==='distortion'&&!selection.lesson&&!selection.exercise){
  const preset=['batio3','srtio3'].includes(selection.preset)?selection.preset:['batio3','srtio3'].includes(selection.material)?selection.material:'batio3';
  if(preset==='srtio3'){chosen=candidates.find(item=>item.labPreset==='srtio3');resolution='material-default';}
 }
 chosen??=candidates[0];
 if(!chosen)return fallback();
 return{...lessonProgression(chosen),resolution};
}

function linkList(items,kind){
 const itemHTML=item=>`<li><a data-lesson-progression-link data-progression-kind="${kind}" href="${esc(item.route)}">${esc(item.title)}</a><p>${esc(item.reason)}</p></li>`;
 if(items.length<=3)return '<ul>'+items.map(itemHTML).join('')+'</ul>';
 return '<ul>'+items.slice(0,3).map(itemHTML).join('')+"</ul><details><summary>More connections</summary><ul>"+items.slice(3).map(itemHTML).join('')+'</ul></details>';
}

/** Native links support keyboard use, copied URLs and opening in a new tab. */
export function lessonProgressionHTML(selection={}){
 const result=lessonProgression(selection);
 if(!result.current)return '';
 return `<section class="lesson-progression" data-lesson-progression="${esc(key(result.current.catalog,result.current.lessonId))}" aria-label="Preparation and further study"><h3>Connect this lesson</h3><p class="lesson-progression-intro">Review foundations or continue in greater depth as needed. These recommendations do not restrict direct access to lessons or tools.</p><div class="lesson-progression-columns">${result.prerequisites.length?`<section><h4>Suggested preparation</h4>${linkList(result.prerequisites,'prerequisite')}</section>`:''}${result.next.length?`<section><h4>Where to go next</h4>${linkList(result.next,'next')}</section>`:''}${!result.prerequisites.length&&!result.next.length?"<p>Choose your next topic from this subject's contents.</p>":''}</div><p class="lesson-progression-index"><a data-lesson-progression-link data-progression-kind="index" href="${esc(result.index.route)}">Subject contents</a><a data-lesson-progression-link data-progression-kind="start" href="${esc(result.start.route)}">Begin with the basics</a></p></section>`;
}
