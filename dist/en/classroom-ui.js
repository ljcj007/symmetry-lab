import {createResourceLoader} from './resource-loader.js?v=20261110-en1';
const courseDefinitions={
'group-theorems':{load:()=>import('./group-theorems.js?v=20261111-demos1'),render:'renderGroupTheoremsView',result:'getGroupTheoremsResult'},
'symmetry-mini-demos':{load:()=>import('./symmetry-mini-demos.js?v=20261111-demos1'),render:'renderSymmetryMiniDemosView',result:'getSymmetryMiniDemosResult'},
'foundations-demos':{load:()=>import('./foundations-demos.js?v=20261111-demos1'),render:'renderFoundationsDemosView',result:'getFoundationsDemosResult'},
'frontiers':{load:()=>import('./frontiers-ui.js?v=20261110-en1'),render:'renderFrontiersView',result:'getFrontiersResult'}
,'connections':{load:()=>import('./connections-ui.js?v=20261110-en1'),render:'renderConnectionsView',result:'getConnectionsResult'}
,'construction':{load:()=>import('./construction-ui.js?v=20261110-en1'),render:'renderConstructionView',result:'getConstructionResult'}
,'principles':{load:()=>import('./principles-ui.js?v=20261110-en1'),render:'renderPrinciplesView',result:'getPrinciplesResult'}
,'bridges':{load:()=>import('./bridges-ui.js?v=20261110-en1'),render:'renderBridgesView',result:'getBridgesResult'}
,'pathways':{load:()=>import('./pathways-ui.js?v=20261110-en1'),render:'renderPathwaysView',result:'getPathwaysResult'}
,'spectroscopy':{load:()=>import('./spectroscopy-ui.js?v=20261110-en1'),render:'renderSpectroscopyView',result:'getSpectroscopyResult'}
,'response-materials':{load:()=>import('./response-materials-ui.js?v=20261110-en1'),render:'renderResponseMaterialsView',result:'getResponseMaterialsResult'}
,'pointgroups':{load:()=>import('./pointgroup-ui.js?v=20261111-demos1'),render:'renderPointgroupView',result:'getPointgroupResult'}
,'academy':{load:()=>import('./symmetry-course-ui.js?v=20261110-en1'),render:'renderSymmetryCourseView',result:'getSymmetryCourseResult'}
,'lie':{load:()=>import('./lie-group-ui.js?v=20261110-en1'),render:'renderLieGroupView',result:'getLieGroupResult'}
,'observables':{load:()=>import('./observables-ui.js?v=20261110-en1'),render:'renderObservablesView',result:'getObservablesResult'}
,'dynamics':{load:()=>import('./structure-dynamics-ui.js?v=20261110-en1'),render:'renderStructureDynamicsView',result:'getStructureDynamicsResult'}
,'material-research':{load:()=>import('./material-research-ui.js?v=20261110-en1'),render:'renderMaterialResearchView',result:'getMaterialResearchResult'}
,'coupled-materials':{load:()=>import('./coupled-materials-ui.js?v=20261110-en1'),render:'renderCoupledMaterialsView',result:'getCoupledMaterialsResult'}
,'electronic-materials':{load:()=>import('./electronic-materials-ui.js?v=20261110-en1'),render:'renderElectronicMaterialsView',result:'getElectronicMaterialsResult'}
,'quantum-materials':{load:()=>import('./quantum-materials-ui.js?v=20261110-en1'),render:'renderQuantumMaterialsView',result:'getQuantumMaterialsResult'}
,'flagship':{load:()=>import('./shg-flagship.js?v=20261110-en1'),render:'renderSHGFlagship',result:'getSHGFlagshipResult'}
};
const courseModules=createResourceLoader(key=>courseDefinitions[key].load());
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Physical course modules retain their IDs, URLs and independent progress keys.
export const classroomSections=[{id:'group-theorems',slug:'foundations',title:"Group Theorems: Proofs and Applications"},{id:'symmetry-mini-demos',slug:'foundations',title:"Geometry, Bands, and Spin Demos"},{id:'foundations-demos',slug:'foundations',title:"Foundational Teaching Demos"},{id:'flagship',slug:'shg-flagship',title:"SHG flagship experiment"},{id:'frontiers',slug:'frontiers',title:"Layer groups, chirality and many-body topology"},{id:'connections',slug:'connections',title:"Identical particles, defects and reciprocal responses"},{id:'construction',slug:'construction',title:"Representation construction, supercells and band connectivity"},{id:'principles',slug:'principles',title:"Symmetry, symmetry breaking and conservation"},{id:'bridges',slug:'bridges',title:"Many-body spectra, polarons and quantum states"},{id:'pathways',slug:'pathways',title:"Sites, scattering, domain walls and correlations"},{id:'spectroscopy',slug:'spectroscopy',title:"Magnetic resonance, superconducting junctions and multiplet spectra"},{id:'response-materials',slug:'response',title:"Transverse responses, devices and multielectron states"},{id:'quantum-materials',slug:'quantum',title:"Orbitals, quantum geometry and electronic transport"},{id:'electronic-materials',slug:'electronic',title:"Electron pairing, nonlinear optics and band unfolding"},{id:'coupled-materials',slug:'mechanisms',title:"Distortions, magnetic excitations and thermal expansion"},{id:'material-research',slug:'research',title:"Material analysis topics"},{id:'pointgroups',slug:'pointgroups',title:"Fundamentals and point groups"},{id:'academy',slug:'crystal',title:"Crystal symmetry and internal degrees of freedom"},{id:'lie',slug:'lie',title:"Continuous groups and representations"},{id:'observables',slug:'observables',title:"Material properties and spectra"},{id:'dynamics',slug:'structure-dynamics',title:"Structures, phase transitions and experiments"}];
export const classroomPathways=[
  {id:'foundations',section:'pointgroups',title:"Fundamentals and representations",summary:"Build the language of representation theory, starting with symmetry operations, groups and characters.",level:"Beginner",prerequisite:"Vectors and matrices",links:[["Nine Theorems: Proof and Application Workshop",'module=theorems&experiment=rearrangement'],["Water, Characters, and Spectroscopy",'module=demos&experiment=water'],["Matrices and Characters",'module=demos&experiment=characters'],["D₃ Triangle: Projection and Basis Functions",'module=demos&experiment=projection'],["SO(3) → O → D₄ Level Splitting",'module=demos&experiment=splitting'],["Jahn–Teller Effect",'module=demos&experiment=jt'],["Macroscopic Crystal Symmetry",'module=demos&experiment=macro'],["Point Groups of Platonic Solids",'module=mini&experiment=polyhedra'],["Degenerate Vibrations and Model Spectra",'module=mini&experiment=vibrations'],["Brillouin Zone and Band Degeneracy",'module=mini&experiment=bands'],["Permutations and Two-Spin States",'module=mini&experiment=manybody'],["Time Reversal and Spin",'module=mini&experiment=time-reversal'],["Double Groups and Spin–Orbit Coupling",'module=mini&experiment=double-soc'],["Three-level symmetry diagnostics",'module=audit'],["Permutation groups and identical-particle statistics",'module=statistics'],["Symmetry-adapted bases and a unified view of selection rules",'module=salc'],["The 32 point groups and their characters",''],["Symmetry operation demonstrations",'tab=lab'],["Concept checks",'tab=quiz']]},
  {id:'crystal',section:'academy',track:'space',title:"Crystal symmetry",summary:"Extend point groups to three-dimensional periodic structures and explore translations, screw axes and glide planes.",level:"Foundations → Advanced",prerequisite:"Point groups and representations",links:[["Layer groups, surfaces and interface symmetry",'module=layers'],["Screws, glides and momentum-dependent degeneracies",'module=nonsymmorphic'],["Symmetry derivation workshop",'module=workshop'],["From Wyckoff sites to band representations",'module=bandrep'],["Quantum transport in devices",'module=device'],["Quantum geometry and topological diagnostics",'module=geometry'],["Supercells and band unfolding",'module=unfold'],["Band compatibility relations and connectivity",'module=bands'],["Space groups and Bloch phases",'track=space'],["Seitz operation experiment",'tab=lab&experiment=seitz'],["Representative materials and 3D structures",'tab=materials']]},
  {id:'observables',section:'observables',title:"Material properties and spectra",summary:"Test symmetry predictions with material case studies, from primitive-cell vibrations and selection rules to property tensors.",level:"Foundations → Applications",prerequisite:"Point groups, characters and matrices",links:[["Si, GaAs and BaTiO₃ · SHG flagship experiment",'module=shg-story'],["Chirality, polarity and pseudosymmetry experiments",'module=chirality'],["Reciprocity relations and response constraints",'module=reciprocity'],["Many-body spectral functions and responses",'module=manybody'],["Inelastic scattering and the dynamic structure factor",'module=scattering'],["Multiplet spectra and polarization selection rules",'module=spectra'],["Anomalous Hall and transverse thermoelectric responses",'module=hall'],["Cross-module projects",'module=hall&tab=project'],["Electronic transport and thermoelectricity",'module=transport'],["Nonlinear optics and SHG",'module=shg'],["Quasiharmonic approximation and thermal expansion",'module=qha'],["Phonon thermodynamics",'module=thermo'],["Crystal vibrations and spectra",'lesson=mechanical-modes'],["Property tensors and responses",'lesson=neumann'],["Interactive experiments",'tab=lab'],["Guided exercises",'tab=derive'],["Material case studies",'tab=cases']]},
  {id:'structure-dynamics',section:'dynamics',title:"Structures, phase transitions and experiments",summary:"Connect order parameters, polar domains and diffraction extinctions with imported Phonopy data.",level:"Foundations → Applications",prerequisite:"Space groups, vibrations and matrices",links:[["Order-parameter manifolds and topological defects",'module=defects'],["Finite-wavevector order and supercells",'module=wavevector'],["Order parameters and symmetry breaking",'module=order'],["Electron–phonon coupling and polarons",'module=polaron'],["Domain walls and localized states",'module=domainwall'],["Structural distortion decomposition and mode coupling",'module=distortion'],["Phonon mode classification and frozen phonons",'module=modes'],["Phase transitions and domains",'lesson=landau-stability'],["Diffraction phases and extinctions",'lesson=structure-factor'],["Phonon data and soft modes",'lesson=phonopy-files'],["Interactive experiments",'tab=lab'],["Guided exercises",'tab=derive'],["Material study paths",'tab=cases']]},
  {id:'spin',section:'academy',track:'double',title:"Spin and extended symmetries",summary:"Distinguish spinor double covers, time reversal, color permutations and independent spin rotations.",level:"Advanced",prerequisite:"Point groups, space groups and linear algebra",links:[["Projective representations and many-body SPT phases",'module=spt'],["Bond symmetry, magnetic exchange and DMI",'module=exchange'],["Density matrices, entanglement and decoherence",'module=density'],["Small Hubbard clusters",'module=hubbard'],["Magnetic resonance and effective spins",'module=resonance'],["Superconducting junctions and Andreev reflection",'module=andreev'],["Multielectron crystal fields and multiplets",'module=multiplet'],["Crystal fields, orbitals and the Jahn–Teller effect",'module=orbitals'],["Superconducting pairing and BdG theory",'module=pairing'],["Magnetic exchange and spin waves",'module=magnons'],["Double groups and spinors",'track=double'],["Magnetic groups and corepresentations",'track=magnetic'],["Color groups and label permutations",'track=color'],["Spin point groups and spin space groups",'track=spin']]},
  {id:'continuous',section:'lie',track:'continuous',title:"Continuous groups in physics",summary:"Explore SU(2) and SU(3) generators, weight diagrams and continuous transformations of quantum states.",level:"Foundations → Advanced",prerequisite:"Complex numbers, matrices and quantum states",links:[["Continuous symmetries and conserved quantities",'module=conservation'],["Generators and physical applications",'track=continuous'],["SU(2) and the Bloch sphere",'tab=lab&experiment=su2'],["SU(3) and weight diagrams",'tab=lab&experiment=su3']]},
  {id:'coupling',section:'lie',track:'coupling',title:"Tensor products and recoupling",summary:"Progress from representation decomposition to CG basis transformations, Racah (6j) coefficients and four-body 9j coefficients.",level:"Advanced → Specialized topics",prerequisite:"Representations, tensor products and SU(2)/SU(3)",links:[["Representations and tensor-product decomposition",'track=representations'],["CG coefficients and basis transformations",'track=cg'],['Racah（6j）','track=racah'],["Four-body recoupling (9j)",'track=ninej']]}
];
const queryFields=['module','tab','lesson','experiment','preset','track','material','exercise','group','level','project'];
const specialistModules={
 theorems:{section:'group-theorems',pathway:'foundations',route:'group-theorems'},
 mini:{section:'symmetry-mini-demos',pathway:'foundations',route:'symmetry-mini-demos'},
 demos:{section:'foundations-demos',pathway:'foundations',route:'foundations-demos'},
 'shg-story':{section:'flagship',pathway:'observables',route:'shg-flagship'},
 layers:{section:'frontiers',pathway:'crystal',route:'layer-symmetry-lab'},
 chirality:{section:'frontiers',pathway:'observables',route:'chirality-polarity-lab'},
 spt:{section:'frontiers',pathway:'spin',route:'manybody-spt-lab'},
 audit:{section:'connections',pathway:'foundations',route:'symmetry-audit'},
 statistics:{section:'connections',pathway:'foundations',route:'statistics-lab'},
 defects:{section:'connections',pathway:'structure-dynamics',route:'topological-defects-lab'},
 reciprocity:{section:'connections',pathway:'observables',route:'reciprocity-lab'},
  salc:{section:'construction',pathway:'foundations',route:'salc-lab'},
  wavevector:{section:'construction',pathway:'structure-dynamics',route:'wavevector-lab'},
  nonsymmorphic:{section:'construction',pathway:'crystal',route:'nonsymmorphic-lab'},
  order:{section:'principles',pathway:'structure-dynamics',route:'order-parameter-lab'},
  exchange:{section:'principles',pathway:'spin',route:'exchange-symmetry-lab'},
  conservation:{section:'principles',pathway:'continuous',route:'conservation-lab'},
  manybody:{section:'bridges',pathway:'observables',route:'manybody-spectra-lab'},
  polaron:{section:'bridges',pathway:'structure-dynamics',route:'polaron-lab'},
  density:{section:'bridges',pathway:'spin',route:'density-matrix-lab'},
  workshop:{section:'bridges',pathway:'crystal',route:'symmetry-workshop'},
  bandrep:{section:'pathways',pathway:'crystal',route:'band-representation-lab'},
  scattering:{section:'pathways',pathway:'observables',route:'dynamic-scattering-lab'},
  domainwall:{section:'pathways',pathway:'structure-dynamics',route:'domain-wall-lab'},
  hubbard:{section:'pathways',pathway:'spin',route:'hubbard-cluster-lab'},
  resonance:{section:'spectroscopy',pathway:'spin',route:'spin-resonance-lab'},
  andreev:{section:'spectroscopy',pathway:'spin',route:'andreev-lab'},
  spectra:{section:'spectroscopy',pathway:'observables',route:'atomic-spectra-lab'},
  hall:{section:'response-materials',pathway:'observables',route:'hall-response-lab'},
  device:{section:'response-materials',pathway:'crystal',route:'device-transport-lab'},
  multiplet:{section:'response-materials',pathway:'spin',route:'local-multiplet-lab'},
  orbitals:{section:'quantum-materials',pathway:'spin',route:'crystal-field-lab'},
  geometry:{section:'quantum-materials',pathway:'crystal',route:'quantum-geometry-lab'},
  transport:{section:'quantum-materials',pathway:'observables',route:'electron-transport-lab'},
  pairing:{section:'electronic-materials',pathway:'spin',route:'pairing-lab'},
  shg:{section:'electronic-materials',pathway:'observables',route:'shg-lab'},
  unfold:{section:'electronic-materials',pathway:'crystal',route:'unfold-lab'},
  modes:{section:'material-research',pathway:'structure-dynamics',route:'phonon-modes'},
  bands:{section:'material-research',pathway:'crystal',route:'band-connectivity'},
  thermo:{section:'material-research',pathway:'observables',route:'phonon-thermo'},
  distortion:{section:'coupled-materials',pathway:'structure-dynamics',route:'distortion-modes'},
  magnons:{section:'coupled-materials',pathway:'spin',route:'magnon-lab'},
  qha:{section:'coupled-materials',pathway:'observables',route:'qha-lab'}
};
const specialist=id=>Object.hasOwn(specialistModules,id)?specialistModules[id]:null;
const specialistTools=Object.fromEntries(Object.entries(specialistModules).map(([module,item])=>['compute/'+item.route,{module,...item}]));
const defaultsFor=id=>{const p=classroomPathways.find(p=>p.id===id);return p?{section:p.section,pathway:p.id,...(p.track?{track:p.track}:{})}:null;};
export const isClassroomView=view=>classroomSections.some(section=>section.id===view);
export function parseClassroomRoute(route){
  if(typeof route!=='string')return null;
  const [path,query='']=route.replace(/^#/,'').split('?'),params=new URLSearchParams(query);
  let result;
  const tool=Object.hasOwn(specialistTools,path)?specialistTools[path]:null;
  if(tool)result={section:tool.section,module:tool.module,pathway:tool.pathway,tab:'lab',calculationOnly:true};
  else if(['compute/phase','compute/diffraction','compute/phonopy'].includes(path))result={section:'dynamics',pathway:'structure-dynamics',tab:'lab',experiment:path.slice(8),calculationOnly:true};
  else if(['compute/phonons','compute/tensors'].includes(path))result={section:'observables',pathway:'observables',tab:'lab',experiment:path.slice(8),calculationOnly:true};
  else if(path.startsWith('compute/lie/')){const experiment=path.slice('compute/lie/'.length);if(!/^[a-z][a-z0-9_]*$/.test(experiment))return null;result={section:'lie',pathway:'coupling',tab:'lab',experiment,calculationOnly:true};}
  else if(path==='classroom')result={section:'overview',pathway:'overview'};
  else {
    const slug=path.startsWith('classroom/')?path.slice(10):path;
    const legacy={'shg-flagship':'observables',frontiers:'crystal',connections:'foundations',construction:'foundations',principles:'structure-dynamics',pointgroups:'foundations',academy:'crystal',lie:'continuous',research:'structure-dynamics',mechanisms:'structure-dynamics',electronic:'spin',quantum:'spin',response:'observables',spectroscopy:'spin',pathways:'crystal',bridges:'observables'};
    result=defaultsFor(legacy[slug]||slug);if(!result)return null;
    if(slug==='shg-flagship')result.module='shg-story';
    if(slug==='research')result.module='modes';
    if(slug==='mechanisms')result.module='distortion';
    if(slug==='electronic')result.module='pairing';
    if(slug==='quantum')result.module='orbitals';
    if(slug==='response')result.module='hall';
    if(slug==='spectroscopy')result.module='resonance';
    if(slug==='frontiers')result.module='layers';
    if(slug==='connections')result.module='statistics';
    if(slug==='construction')result.module='salc';
    if(slug==='principles')result.module='order';
    if(slug==='bridges')result.module='manybody';
    if(slug==='pathways')result.module='bandrep';
  }
  for(const field of queryFields){const value=params.get(field);if(value!==null&&value.length<=160)result[field]=value;}
  if(result.calculationOnly&&!tool)delete result.module;
  if(specialist(result.module)){result.section=specialist(result.module).section;result.pathway=specialist(result.module).pathway;}
  if(result.calculationOnly)result.tab='lab';
  if(tool)result={...result,section:tool.section,module:tool.module,pathway:tool.pathway,tab:'lab',calculationOnly:true};
  else if(['compute/phase','compute/diffraction','compute/phonopy','compute/phonons','compute/tensors'].includes(path))result.experiment=path.slice(8);
  return result;
}
export function buildClassroomHash(selection={}){
  const module=specialist(selection.module),specialSection=['group-theorems','symmetry-mini-demos','foundations-demos','flagship','frontiers','connections','construction','principles','bridges','pathways','material-research','coupled-materials','electronic-materials','quantum-materials','response-materials','spectroscopy'].includes(selection.section);
  const pathway=selection.pathway||module?.pathway||({pointgroups:'foundations',academy:'crystal',lie:'continuous'}[selection.section])||'overview';
  const path=selection.calculationOnly?(specialSection?'compute/'+(module?.route||(selection.section==='coupled-materials'?'distortion-modes':'phonon-modes')):selection.section==='dynamics'?'compute/'+(['phase','diffraction','phonopy'].includes(selection.experiment)?selection.experiment:'phase'):selection.section==='observables'?'compute/'+(selection.experiment==='tensors'?'tensors':'phonons'):'compute/lie/'+encodeURIComponent(selection.experiment||'su3_cg')):pathway==='overview'?'classroom':'classroom/'+pathway;
  const params=new URLSearchParams();
  for(const key of queryFields)if(selection[key]!==undefined&&selection[key]!==null&&selection[key]!==''&&!(selection.calculationOnly&&(key==='tab'||key==='experiment'&&!['group-theorems','foundations-demos','symmetry-mini-demos'].includes(selection.section))))params.set(key,String(selection[key]));
  return '#'+path+(params.size?'?'+params.toString():'');
}
export function resolveClassroomRoute(route,last='pointgroups'){
  if(route==='classroom')return isClassroomView(last)?last:'pointgroups';
  return parseClassroomRoute(route)?.section||null;
}
export const classroomHash=section=>'#classroom/'+(classroomSections.find(item=>item.id===section)||classroomSections.find(item=>item.id==='pointgroups')).slug;
const renderers=Object.fromEntries(Object.keys(courseDefinitions).map(section=>[section,async options=>{
 const host=options.container;host.innerHTML="<div class=\"loading-card\" role=\"status\">Loading this lesson…</div>";const marker=host.firstElementChild;
 const current=()=>host.isConnected!==false&&host.firstElementChild===marker;
 try{const module=await courseModules.get(section);if(current())return module[courseDefinitions[section].render](options);}
 catch(error){if(current()){host.innerHTML="<div class=\"notice error\">This lesson could not be loaded."+esc(error.message)+" <button class=\"secondary\" data-course-retry>Retry this lesson</button></div>";host.querySelector('[data-course-retry]').onclick=()=>renderers[section](options);}}
}]));
export function getClassroomResult(section){const course=courseModules.peek(section)?.[courseDefinitions[section]?.result]?.();return course?{kind:'group-theory-classroom',section,course}:null;}

export function renderClassroomView({container,section='pointgroups',route,onSection=()=>{},onNavigate,onLocation=()=>{},run,cancelRun,toast,download,openGroup,courseRenderers=renderers}){
  let selection=typeof route==='string'?parseClassroomRoute(route):route;
  selection=selection||parseClassroomRoute(classroomHash(section));
  section=selection.section;
  const overview=section==='overview',pathway=classroomPathways.find(p=>p.id===selection.pathway),embedded=selection.calculationOnly||selection.embeddedOnly||selection.atlasOnly;
  const pathLink=(id,query='')=>'#classroom/'+id+(query?'?'+query:'');
  const directory=`<nav class="classroom-directory" aria-label="Learning paths and topics"><a href="#classroom" data-course-route="#classroom" class="classroom-all ${overview?'active':''}">Learning Overview</a>${classroomPathways.map((item,index)=>`<section><a href="${pathLink(item.id)}" data-course-route="${pathLink(item.id)}" class="classroom-path ${selection.pathway===item.id?'active':''}" ${selection.pathway===item.id?'aria-current="page"':''}><small>0${index+1}</small><strong>${item.title}</strong></a>${selection.pathway===item.id?`<div class="classroom-topics">${item.links.map(([title,query])=>`<a href="${esc(pathLink(item.id,query))}" data-course-route="${esc(pathLink(item.id,query))}">${esc(title)}</a>`).join('')}</div>`:''}</section>`).join('')}</nav>`;
  const cards=classroomPathways.map((item,index)=>`<a class="classroom-path-card" href="${pathLink(item.id)}" data-course-route="${pathLink(item.id)}"><span class="classroom-card-number">0${index+1}<small>${item.level}</small></span><h2>${item.title}</h2><p>${item.summary}</p><div>Prerequisites: ${item.prerequisite}</div><strong>Explore this path →</strong></a>`).join('');
  container.innerHTML=`<div class="classroom-page ${embedded?'classroom-embedded':'classroom-shell'}">${embedded?'':directory}<div class="classroom-main">${overview?`<header class="classroom-overview"><span>FOLLOW A LEARNING PATH</span><h2>From your first symmetry operation to many-body recoupling.</h2><p>Choose a path, then read, experiment and practice within each unit. Point groups and space groups organize spatial symmetry; individual topics explain double-valued representations, magnetism and internal degrees of freedom.</p></header><aside class="classroom-next"><h3>See Symmetry: Foundational Demos</h3><p>Water Vibrations · Characters · D₃ Projection · Level Splitting · Jahn–Teller · Crystal Symmetry</p><a href="#classroom/foundations?module=demos&experiment=water">Open Water and Representation Demos →</a><p><a href="#classroom/foundations?module=mini&experiment=polyhedra">Platonic Solids, Degenerate Bands, Permutations, and Spin →</a></p></aside><aside class="classroom-next"><h3>Start with a complete experiment</h3><a href="#classroom/observables?module=shg-story">Why is SHG different in Si, GaAs and BaTiO₃? Predict → Calculate → Explain → Test a counterexample</a></aside><div class="classroom-path-grid">${cards}</div><aside class="classroom-next"><h3>Already have a calculation in mind?</h3><p>The calculation center exposes the full parameter set. Classroom experiments use the same engines with teaching presets.</p><a href="#compute">Open the calculation center →</a></aside>`:`${embedded?'':`<div class="classroom-course-heading"><span>${esc(pathway?.level||"Lesson")} · Prerequisites: ${esc(pathway?.prerequisite||"Linear algebra")}</span><a href="#classroom" data-course-route="#classroom">All learning paths</a></div>`}${!embedded&&selection.pathway==='foundations'?"<nav class=\"classroom-next\" aria-label=\"Foundational Teaching Entries\"><strong>Foundational Demos and Proof Workshop</strong><p><a href=\"#classroom/foundations?module=demos&experiment=water\">Representations and Molecules · 6 Demos</a> · <a href=\"#classroom/foundations?module=mini&experiment=polyhedra\">Geometry, Bands, and Spin · 6 Demos</a> · <a href=\"#classroom/foundations?module=theorems&experiment=rearrangement\">Group Theorems · 9 Proofs and Applications</a></p></nav>":''}<section id="classroom-course" aria-label="${esc(pathway?.title||"Calculation tool")}"></section>`}</div></div>`;
  const root=container.firstElementChild,current=()=>root.parentNode===container&&container.isConnected!==false;
  const move=(hash,options)=>{if(!current())return;if(onNavigate)onNavigate(hash,options);else {const next=parseClassroomRoute(hash);if(next&&next.section!=='overview')onSection(next.section);}};
  root.querySelectorAll('[data-course-route]').forEach(link=>link.onclick=event=>{event?.preventDefault();move(link.dataset.courseRoute);});
  onLocation(overview?"Learning center":selection.calculationOnly?"Calculation center / Tensor products and recoupling":"Learning center / "+(pathway?.title||"Lesson"));
  if(overview)return;
  const update=patch=>{if(!current())return;selection={...selection,...patch};if(specialist(patch.module)){selection.section=specialist(patch.module).section;selection.pathway=specialist(patch.module).pathway;}if(patch.tab&&patch.tab!=='derive')delete selection.exercise;if(patch.tab&&patch.tab!=='materials'&&!['frontiers','connections','construction','principles','bridges','pathways','observables','dynamics','material-research','coupled-materials','electronic-materials','quantum-materials','response-materials','spectroscopy'].includes(section))delete selection.material;move(buildClassroomHash(selection),{render:false});};
  return courseRenderers[section]({container:root.querySelector('#classroom-course'),run,cancelRun,toast,download,selection,onNavigate:update,onLocation,
    openGroup:spec=>openGroup?.(typeof spec==='number'?{mode:'sg',id:spec,k:[0,0,0],doubleValued:false}:spec)});
}
