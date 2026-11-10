import {homeHTML} from './entry-home.js?v=20261110-en1';
import {createResourceLoader,fetchJSON} from './resource-loader.js?v=20261110-en1';
import {classroomPathways} from './classroom-ui.js?v=20261110-en1';
// Shared entry points. A tool keeps one implementation even when a lesson links to it.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const toolGroups=[
 {id:'observables',title:"Phonon spectra and material properties",summary:"Compute spectral selection rules and allowed responses from primitive-cell displacements and symmetry operations.",tools:[
  ['compute/symmetry-audit',"Three-level symmetry diagnostics workshop","Check the model, state and probe separately, including unitary symmetries and time reversal.","three-layer diagnosis counterexample time reversal"],
  ['compute/statistics-lab',"Permutation groups and identical-particle statistics","Full particle exchange, Pauli projection, S₃ and Young operators.","Pauli Young Displacement Fermi Bose"],
  ['compute/topological-defects-lab',"Order-parameter manifolds and topological defects","XY vortices, nematic directors, loop winding numbers and boundaries.","Vortex topology  domain wall  homotopy"],
  ['compute/shg-flagship',"Si, GaAs and BaTiO₃ · SHG flagship experiment","Predict, calculate, explain and test counterexamples: how inversion symmetry constrains second-harmonic generation.","SHG second harmonic generation frequency doubling Si GaAs BaTiO3 flagship"],
  ['compute/chirality-polarity-lab',"Chirality and polarity · Mirror matching and tolerances","3D point sets, allowed polar vectors, pseudosymmetry scans and round-trip polarization.","chirality polarity mirror image pseudo tolerance"],
  ['compute/reciprocity-lab',"Reciprocity relations and response constraints","Spatial covariance, Onsager–Casimir relations, magnetic-domain reversal and dissipation.","Onsager Casimir Hall Reciprocity Dissipation"],
  ['compute/manybody-spectra-lab',"Many-body spectral functions · Addition, removal and response","Actual transition matrix elements and spectral-weight sum rules in finite Hubbard clusters, with links between spectral peaks and states.","Lehmann many-body spectral function spin response"],
  ['compute/dynamic-scattering-lab',"Inelastic scattering · Dynamic structure factor","Diatomic chains, polarization projections, thermal populations, Stokes/anti-Stokes processes and S(Q,E) maps.","inelastic scattering DSF dynamic structure factor phonon"],
  ['compute/spin-resonance-lab',"Magnetic resonance · Effective spins and EPR","Anisotropic g tensors, zero-field splitting, hyperfine interactions, field direction and magnetic-dipole transition spectra.","EPR ESR resonance magnetic resonance effective spin ultrafine"],
  ['compute/atomic-spectra-lab',"Multiplet spectra · Polarization-resolved XAS","Polarization-resolved 2p→3d absorption with full Slater interactions and SOC in the d⁸/d⁹ atomic approximation.","XAS XMCD XLD multiplet Polarization selection rule Slater"],
  ['compute/phonons',"Γ-point phonons · IR / Raman spectra","Mechanical representations, acoustic/optical decomposition, 3D displacements and polarization selection rules for Si, GaAs and NaCl.","phonon vibration infrared Raman Raman phonon spectrum"],
  ['compute/phonon-modes',"Phonon modes · Classification and frozen structures","Γ-point degenerate subspaces, commensurate supercells and frozen-phonon export to POSCAR / CIF.","Phonopy irrep frozen phonon Symmetrical phonon"],
  ['compute/phonon-thermo',"Phonon thermodynamics · F / S / Cv","Einstein / Debye models, weighted meshes, total DOS and imported Phonopy thermal properties.","Heat capacity Free energy Entropy Thermodynamics Debye Einstein"],
  ['compute/qha-lab',"Quasiharmonic approximation · Thermal expansion and Cp","Static and vibrational free energies at multiple volumes, equilibrium volume, bulk modulus and derivative convergence.","QHA Quasi-harmonic Thermal expansion Constant pressure heat capacity Phonopy Free energy"],
  ['compute/phonopy',"Phonopy · Import phonon data","Read band / qpoints YAML, complex eigenvectors, segmented dispersions and DOS.","Phonopy phonon band yaml DOS soft mode virtual frequency"],
  ['compute/hall-response-lab',"Anomalous Hall and transverse thermoelectricity · Intrinsic responses","The two-band QWZ model, finite-temperature occupations, σxy, αxy and mesh convergence.","Hall Nernst Berry Abnormal Hall Horizontal thermoelectric"],
  ['compute/electron-transport-lab',"Electronic transport and thermoelectricity · Constant relaxation time","Weighted full-Brillouin-zone meshes, carriers, σ/τ, Seebeck coefficients and κₑ/τ.","transport electronics transport thermoelectric Seebeck Boltzmann"],
  ['compute/shg-lab',"Nonlinear optics · Rotational-anisotropy SHG","Second-harmonic tensors, surface orientations, polarization channels and relative intensities for Td / 4mm / Oh.","SHG frequency doubling Nonlinear Optics GaAs BaTiO3 Polarization"],
  ['compute/tensors',"Property tensors · Exact symmetry constraints","Dielectric, elastic, piezoelectric and magnetoelectric tensors; point-group presets, custom generators and rotated responses.","dielectric elastic piezoelectric magnetoelectric Neumann tensor"],
 ]},
 {id:'structure',title:"Structures, phase transitions and diffraction",summary:"Start from a crystal structure to identify its group and coordinate conventions.",tools:[
  ['compute/layer-symmetry-lab',"Layer groups · Surfaces, terminations and interfaces","Surface cuts, normal boundaries, element matching and stacking paths.","layer group surface interface layer slab"],
  ['compute/wavevector-lab',"Finite-wavevector order · Wavevector stars and supercells","From real-mode combinations to translational domains, finite supercell groups and Fourier intensities.","q star supercell commensurate modulation reverse phase domain"],
  ['compute/order-parameter-lab',"Order parameters · Invariants and symmetry breaking","Generate polynomial invariants from group operations and track order-parameter directions, stabilizers and domains.","Landau order parameter subgroup broken invariant"],
  ['compute/domain-wall-lab',"Domain walls and localized states · Continuum fields and SSH interfaces","Gradient free energy, wall widths and energies, mesh diagnostics and interface-localized spectra.","domain wall domain wall interface local state SSH"],
  ['compute/phase',"Structural phase transitions · Free energy and domains","Landau stationary points, stability, idealized polar distortions of BaTiO₃ and six domains.","phase transition Landau order parameter domain ferroelectric"],
  ['compute/distortion-modes',"Structural distortions · Mode decomposition and coupling","Structure pairs in a common cell, atom mapping, mode projection and reconstruction, and a two-order-parameter free energy.","Distortion Decomposition Structure Matching polarity Octahedral Mode Coupling BaTiO3 SrTiO3"],
  ['compute/diffraction',"Diffraction · Structure factors and extinctions","Atomic phases, centering and basis extinctions, screw-axis conditions and powder stick patterns.","XRD diffraction extinction structure factor"],
  ['structure',"Structure standardization · BC cells","Import POSCAR / CIF, identify the space group and transform the primitive cell, origin and wavevector.","POSCAR CIF spglib primitive cell"],
 ]},
 {id:'representation',title:"Representations and corepresentations",summary:"Classify quantum states using symmetry operations.",tools:[
  ['compute/band-representation-lab',"Wyckoff sites → Band representations","Site orbits, Bloch actions and little-group decomposition for selected three-dimensional space groups.","Wyckoff site induced band representation EBR"],
  ['workbench',"Irreducible representations and magnetic corepresentations","Space groups, magnetic space groups and magnetic point groups; single- and double-valued representations, little groups and full k stars.","SOC Irreducible character Bilbao BC"],
  ['compute/advanced/symbolic_spacegroups',"Symbolic space-group representations","Construct exact little-group representations, corepresentations and induced representations along symbolic k lines.","symbol k star"],
  ['compute/advanced/symbolic_interfaces',"Representation matrices and projections","Common kernels, intertwiners, projections and semilinear representation checks.","interleaved projection common core"],
 ]},
 {id:'coupling',title:"Tensor products and recoupling",summary:"Decompose composite systems and transform between coupling bases.",tools:[
  ['products',"Crystal groups · Full-k-star tensor-product decomposition","Choose two wavevectors and representations, then find the resulting wavevectors and irreducible components.","space group magnetic group tensor"],
  ['compute/lie/su2_coupling',"SU(2) · Angular-momentum coupling","Two-spin coupling, CG coefficients and exchange energy levels.","SU2 Spin"],
  ['compute/lie/su3_tensor',"SU(3) · Representations and tensor products","Dynkin labels, representation dimensions, weights and tensor-product decomposition.","SU3 means"],
  ['compute/lie/su3_cg',"SU(3) · CG coefficients and basis transformations","Numerical and exact radical coefficients, complex amplitudes and basis transformations in both directions.",'Clebsch Gordan'],
  ['compute/lie/su3_racah','SU(3) · Racah / 6j',"Recoupling matrices and outer multiplicities for triple tensor products.","Racah Triple 6j"],
  ['compute/lie/su3_ninej',"SU(3) · 9j coefficients and four-body recoupling","Higher-dimensional inputs, exact coefficients, channel probabilities and inverse basis transformations.","Quadruple 8 10 15 27"],
 ]},
 {id:'models',title:"Hamiltonians and bands",summary:"Build models and apply symmetry to band analysis.",tools:[
  ['compute/salc-lab',"Symmetry-adapted bases · Selection rules and matrix assessment","Projection replays, SALC blocks, polarization matrix elements and equivalent subspaces.","SALC Wigner Eckart projection operator selection rule"],
  ['compute/nonsymmorphic-lab',"Screws and glides · Momentum-dependent degeneracies","Bloch phases, partner switching, hourglass connectivity and controlled symmetry breaking.","nonsymmorphic hourglass spiral slip hourglass"],
  ['compute/exchange-symmetry-lab',"Bond symmetry · Magnetic exchange and DMI","Axial vectors, bond-end exchange constraints, exchange-tensor decomposition and spin canting.","Moriya DMI Antisymmetric exchange"],
  ['compute/conservation-lab',"Continuous symmetries · Conservation and degeneracy diagnostics","Term-by-term commutators, conservation under dissipation, time reversal and consistent basis changes.","Noether Noether generator Conservation Kramers"],
  ['compute/polaron-lab',"Electron–phonon coupling · Holstein polarons","Two-site quantum phonons, electron–lattice correlations and truncation convergence.","Holstein polaron Electronic phonon Coupling"],
  ['compute/density-matrix-lab',"Density matrices · Entanglement and decoherence","Partial traces, Bloch trajectories, purity, negativity and Lindblad dynamics for one or two spins.","density Lindblad entanglement decoherence Rabi"],
  ['compute/symmetry-workshop',"Symmetry derivation workshop · From allowed terms to bands","Toggle generators to track coefficient constraints and bands in a second-order spin model.","Rashba time reversal Mirror Derivative k.p"],
  ['compute/manybody-spt-lab',"Many-body SPT phases · AKLT and projective representations","Finite spin chains, entanglement spectra, edge states and paths through protecting conditions.",'AKLT Haldane SPT Schmidt'],
  ['compute/hubbard-cluster-lab',"Small Hubbard clusters · Correlations and exchange","Exact diagonalization on 2–4 sites, double occupancy, spin correlations and finite-cluster gaps.","Hubbard Association Strong Association Super Exchange ED"],
  ['compute/andreev-lab',"Superconducting junctions · Andreev reflection","Electron/hole reflection, conductance and flux checks at normal-metal–superconductor contacts.","Andreev NS BdG superconducting reflective contact"],
  ['compute/device-transport-lab',"Quantum transport in devices · Two leads and transmission","Uniform / SSH chains, contacts, barriers, Landauer conductance and local spectra.","Landauer device device electrode transmission scattering"],
  ['compute/local-multiplet-lab',"Multielectron crystal fields · Hund coupling and multiplets","The five-orbital Kanamori model at fixed N, spin classification, orbital occupations and high-/low-spin competition.","Hund Kanamori multiplet multielectronics multiplet crystal field"],
  ['compute/crystal-field-lab',"Crystal fields and orbitals · SOC and Jahn–Teller coupling","d orbitals and coordination, cubic and tetragonal splitting, spin–orbit coupling and the E⊗e model.","orbital crystal field crystal field orbital SOC Jahn Teller NiO"],
  ['compute/quantum-geometry-lab',"Quantum geometry · Metrics and topological diagnostics","SSH / QWZ models, Berry curvature, quantum metrics, gap closings and mesh convergence.","quantum metric quantum metric Berry Chern Zak topology"],
  ['compute/pairing-lab',"Superconducting pairing · Gaps and BdG theory","Square-lattice singlet s-/d-wave and complex pairing, plus bulk spectra and end states of the Kitaev chain.","superconductivity BdG superconducting pairing energy gap node Kitaev"],
  ['compute/unfold-lab',"Supercells and defects · Band unfolding","One-dimensional tight-binding supercells, impurity potentials, dimerization and primitive-cell-projected spectral weights.","unfolding band supercell defect unfolding spectrum weight"],
  ['compute/band-connectivity',"Band compatibility relations and connectivity","Representation branching along Γ–X, mirror-protected crossings, symmetry-breaking gaps and SOC models.","compatibility C4v Rashba SOC band connectivity"],
  ['compute/magnon-lab',"Magnons · Exchange and spin waves","XXZ ferromagnetic / antiferromagnetic chains, mode precession, polarization, applied fields and stability.","magnon spin wave magnon spin wave exchange anisotropy Goldstone"],
  ['magnetictb',"Tight-binding models and topology","Symmetry-constrained models, bands, films, surface spectra, Wilson loops and Chern numbers.",'MagneticTB Berry hr'],
  ['compute/advanced/symbolic',"Symbolic Hamiltonians and k·p models","Exact hopping constraints, Bloch matrices, parametric expressions and polynomial orbitals.",'SymPy Hamiltonian'],
  ['bands',"Band-character matching","Import trace / JSON data to decompose band characters into representations of the current group.",'DFT trace'],
 ]},
 {id:'algebra',title:"Group classification and exact algebra",summary:"Study groups using matrix generators, integral lattices and affine extensions.",tools:[
  ['crystkit',"Affine operations and crystal-group tools","Group closure, point orbits, coordinate transformations, generators and matching to 3D reference groups.",'CrystKit'],
  ['compute/advanced/carat',"Higher-dimensional rational classes · CARAT","Find Q-class representatives in dimensions 1–6 and inspect their matrices and classification evidence.","Class Q High Dimension CARAT"],
  ['compute/advanced/carat_integral',"Integral and affine classes","Study Z classes and affine classes within a rational class, with completeness certificates.","Class Z Affine"],
  ['compute/advanced/integral_normalizer',"Integral normalizer","Find integral changes of basis that preserve a given integral point group.","normalizer"],
  ['compute/advanced/arithmetic_centralizer',"Arithmetic centralizer","Compute commutant orders, central decompositions and unit groups.","centralizer"],
  ['compute/advanced/crystkit_ext',"Group extensions and generators","Vector systems, extension orbits, generators of infinite space groups and torsion-freeness.","cohomology expansion"],
 ]}
];
export const toolsIndex=toolGroups.flatMap(group=>group.tools.map(([route,title,summary,keywords])=>({route,title,summary,keywords,kind:"Calculate",category:group.id})));
export const knownTool=route=>toolsIndex.find(t=>t.route===String(route||'').replace(/^#/,''));
export function searchEntries(entries,query,limit=30){
 const terms=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 if(!terms.length)return [];
 const score=item=>terms.reduce((n,term)=>n+(item.title.toLocaleLowerCase().includes(term)?4:0)+(String(item.keywords||'').toLocaleLowerCase().includes(term)?2:0),0);
 return entries.filter(item=>terms.every(term=>(item.title+' '+item.summary+' '+(item.keywords||'')).toLocaleLowerCase().includes(term))).sort((a,b)=>score(b)-score(a)).slice(0,limit);
}
const readSaved=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string'&&/^[a-z0-9_/?=&.%+-]+$/i.test(v)).slice(0,20):[];}catch{return [];}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Session-only navigation remains usable. */}};
export const favoriteRoutes=()=>readSaved('symmetry-lab.favorites.v1').filter(knownTool);
export function rememberRoute(route){if(['home','compute','atlas','classroom','docs'].includes(route))return;save('symmetry-lab.recent.v1',[route,...readSaved('symmetry-lab.recent.v1').filter(x=>x!==route)].slice(0,6));}
export function toggleFavorite(route){if(!knownTool(route))return favoriteRoutes();const old=favoriteRoutes();const next=old.includes(route)?old.filter(x=>x!==route):[...old,route];save('symmetry-lab.favorites.v1',next);return next;}
const link=(route,label,cls='')=>`<a class="${cls}" href="#${esc(route)}" data-route="${esc(route)}">${label}</a>`;
function toolCard(item,favorites){return `<article class="nav-tool-card">${link(item.route,`<span class="nav-card-kicker">${item.kind}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><span class="nav-card-go">Open tool →</span>`)}<button type="button" class="nav-favorite" data-favorite="${esc(item.route)}" aria-pressed="${favorites.includes(item.route)}" aria-label="${favorites.includes(item.route)?"Remove from favorites":"Add to favorites"}${esc(item.title)}">${favorites.includes(item.route)?'★':'☆'}</button></article>`;}
const searchCatalog=createResourceLoader(async()=>{const data=await fetchJSON('data/search-index.json?v=20261110-en1');if(!Array.isArray(data.entries))throw Error("The search index has an invalid format.");return data.entries;});
export async function renderNavigationHub({container,view='home',databases}){
 const favorites=favoriteRoutes();
 const search=`<section class="nav-search-panel"><label for="site-search">${view==='compute'?"Find a calculation tool":view==='atlas'?"Search groups, materials and lessons":"Have a question in mind?"}</label><div class="nav-search-row"><input id="site-search" type="search" placeholder="Try: mirror symmetry, phonons, GaAs, 225" autocomplete="off"><span id="site-search-status">Enter keywords to search lessons, tools and group catalogs.</span></div><div id="site-search-results" aria-live="polite"></div></section>`;
 container.innerHTML='<div class="nav-hub">'+(view==='home'?'<div id="hub-body"></div>'+search:search+'<div id="hub-body"></div>')+'</div>';

 const root=container.firstElementChild,current=()=>root.parentNode===container&&container.isConnected!==false;
 const body=root.querySelector('#hub-body');
 if(view==='compute')body.innerHTML=`<p class="nav-introduction">Choose a tool by task. The classroom uses these same CG, 6j and 9j calculators. Save a tool to access it directly from the overview.</p><nav class="nav-category-links" aria-label="Calculation categories">${toolGroups.map(g=>`<button type="button" data-category="${g.id}">${g.title}</button>`).join('')}</nav>${toolGroups.map(g=>`<section class="nav-tool-section" id="tools-${g.id}"><header><h2>${g.title}</h2><p>${g.summary}</p></header><div class="nav-card-grid">${toolsIndex.filter(t=>t.category===g.id).map(t=>toolCard(t,favorites)).join('')}</div></section>`).join('')}`;
 else if(view==='atlas')body.innerHTML=`<p class="nav-introduction">Start with group operations or material structures, then open the corresponding lesson or calculation. Every entry uses the existing catalogs and 3D models.</p><div class="nav-card-grid nav-atlas-grid">${[
  ['atlas/pointgroups',"The 32 crystallographic point groups","Rotations, mirrors, inversion and characters, linked to introductory lessons."],
  ['atlas/sg',"230 space groups","Numbers, international symbols, operations and lattices, with links to representation calculations."],
  ['atlas/msg',"1,651 magnetic space groups","BNS / OG numbers, the four magnetic-group types and corepresentation tools."],
  ['atlas/mpg',"122 magnetic point groups","Magnetic point-group catalogs, time reversal and corepresentations."],
  ['atlas/materials',"Crystalline and magnetic materials","NaCl, Si, GaAs, Fe, NiO and MnF₂: structures, magnetic moments and 3D operations, linked to phonons, spectra and property tensors."],
  ['atlas/research',"Material analysis workflows","Phonon classification → frozen structures; band compatibility; thermodynamics and restorable research records."],
  ['classroom/observables?module=shg-story',"SHG flagship experiment · Three materials","Connect structures, tensors and polarization signals, from predictions to counterexamples."],
  ['atlas/frontiers',"Layer groups, chirality and many-body topology","Explore slab boundaries, mirror images, polar vectors and AKLT chains, with linked operations and inverse identification."],
  ['atlas/connections',"Identical particles, defects and reciprocal responses","Connect full particle exchange and order-parameter manifolds to response constraints, with three-level checks and evidence reports."],
  ['atlas/construction',"Representations, supercells and band connectivity","Progress from symmetry-adapted bases and finite wavevectors to momentum-dependent degeneracies, with construction replays and matrix assignments."],
  ['atlas/principles',"Symmetry, symmetry breaking and conservation","Track the origins and physical consequences of constraints, from order parameters and bond-exchange tensors to generators."],
  ['atlas/bridges',"Many-body spectra, polarons and quantum states","Connect many-body transitions and electron–lattice correlations to entanglement and decoherence, alongside the symmetry derivation workshop."],
  ['atlas/compare',"Parameter comparisons and prediction tests","Keep result A, calculate B, then compare inputs, compatible curves and numerical differences from the same tool."],
  ['atlas/pathways',"Sites, scattering, domain walls and correlations","Connect real-space sites to band representations, scattering experiments, and spatial and electronic correlations."],
  ['docs/dictionary',"Dictionary of Formulas and Symbols","Look up variable definitions, units, coordinate conventions and conditions of validity, with links to derivations and experiments."],
  ['atlas/spectroscopy',"Magnetic resonance, superconducting junctions and polarized spectra","Connect effective spins and electron–hole scattering to spectral signatures of atomic multiplets."],['atlas/response',"Transverse responses, devices and multielectron states","Connect Berry geometry, scattering at leads and local multielectron interactions."],
  ['atlas/projects',"Cross-module projects","Collect calculation evidence, explain your derivations and export complete projects and research reports."],
  ['atlas/quantum',"Orbitals, quantum geometry and electronic transport","Progress from local d orbitals to Bloch-wavefunction geometry and thermoelectric responses."],
  ['atlas/electronic',"Electron pairing, second-harmonic generation and defect bands","Connect pairing gaps and GaAs / BaTiO₃ nonlinear optics to supercell spectral weights."],
  ['atlas/mechanisms',"Distortions, magnetic excitations and finite temperature","Structural mode coupling → magnetic exchange and spin waves → free energies at multiple volumes and thermal expansion."],
  ['atlas/notebook',"My material research notebook","Save calculation inputs, results, conventions and interpretations locally. Export a project to restore it or rerun its calculations later."],
  ['atlas/dynamics',"Case studies in structures, phase transitions and experiments","Polar domains in BaTiO₃; diffraction from Si, NaCl and GaAs; and your own Phonopy data."],
  ['classroom/spin',"Double groups, color groups and spin groups","Study point groups and three-dimensional space groups, with explicit limits for each teaching example."]
 ].map(([r,t,s])=>`<article>${link(r,`<h2>${t}</h2><p>${s}</p><span class="nav-card-go">Explore →</span>`,'nav-atlas-card')}</article>`).join('')}</div>`;
 else {
  const recent=readSaved('symmetry-lab.recent.v1').map(route=>{const tool=knownTool(route.split('?')[0]);return tool?{...tool,route}:{route,title:route.startsWith('classroom')?"Resume the last lesson":route.startsWith('atlas')?"Continue exploring the atlas":"Resume the last calculation",summary:"Return to where you left off",kind:"Recent"};});
  body.innerHTML=homeHTML({link,toolCard,knownTool,favorites,recent,pathways:classroomPathways,esc});
 }
 root.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>root.querySelector('#tools-'+button.dataset.category)?.scrollIntoView({behavior:'smooth',block:'start'}));
 root.querySelectorAll('[data-favorite]').forEach(button=>button.onclick=()=>{const selected=toggleFavorite(button.dataset.favorite).includes(button.dataset.favorite);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',(selected?"Remove from favorites":"Add to favorites")+knownTool(button.dataset.favorite).title);button.textContent=selected?'★':'☆';});
 let entries=[...toolsIndex];
 const input=root.querySelector('#site-search'),results=root.querySelector('#site-search-results'),status=root.querySelector('#site-search-status');
 const update=()=>{const query=input.value.trim();if(!query){results.innerHTML='';return;}const found=searchEntries(entries,query);results.innerHTML=found.length?`<ul class="nav-search-list">${found.map(t=>`<li>${link(t.route,`<span>${esc(t.kind)}</span><strong>${esc(t.title)}</strong><small>${esc(t.summary)}</small>`)}</li>`).join('')}</ul>`:"<p class=\"nav-empty\">No matches found. Try a group number, material name or calculation name.</p>";};
 let loading=false,ready=false;
 const loadSearch=async()=>{if(loading||ready||!current())return;loading=true;status.textContent="Loading the search index; you can search tools now…";
  try{const extra=await searchCatalog.get('all');if(!current())return;entries=[...toolsIndex,...extra];ready=true;status.textContent="Tools · Lessons · Group catalogs · Materials";update();}
  catch{if(current()){status.innerHTML="Lessons and group catalogs are temporarily unavailable. Tool search still works. <button type=\"button\" id=\"search-retry\">Retry the search index</button>";root.querySelector('#search-retry').onclick=loadSearch;}}
  finally{loading=false;}
 };
 input.onfocus=loadSearch;input.oninput=()=>{update();loadSearch();};
}
