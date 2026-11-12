import {searchEntries} from './tool-search.js?v=20261113-depth1';

const categoryOrder=['structure','representation','coupling','observables','models','algebra'];
const reassigned={
 'compute/statistics-lab':'representation',
 'compute/topological-defects-lab':'structure',
 'compute/symmetry-audit':'representation'
};
const firstTools={
 structure:['structure','compute/diffraction','compute/layer-symmetry-lab','compute/phase','compute/order-parameter-lab','compute/distortion-modes','compute/wavevector-lab','compute/domain-wall-lab','compute/topological-defects-lab'],
 representation:['workbench','compute/foundations-demos','compute/group-theorems','compute/lie/u1','compute/lie/commutator','compute/lie/su2','compute/lie/representations','compute/lie/interferometer','compute/lie/su3','compute/symmetry-mini-demos','compute/symmetry-audit','compute/statistics-lab','compute/band-representation-lab','compute/advanced/symbolic_spacegroups','compute/advanced/symbolic_interfaces'],
 observables:['compute/phonons','compute/tensors','compute/shg-flagship','compute/shg-lab','compute/chirality-polarity-lab','compute/reciprocity-lab','compute/dynamic-scattering-lab','compute/spin-resonance-lab','compute/atomic-spectra-lab','compute/phonon-modes','compute/phonopy','compute/phonon-thermo','compute/qha-lab','compute/electron-transport-lab','compute/hall-response-lab','compute/manybody-spectra-lab'],
 models:['magnetictb','compute/lie/rabi','compute/advanced/symbolic','compute/salc-lab','compute/symmetry-workshop','compute/crystal-field-lab','compute/local-multiplet-lab','compute/exchange-symmetry-lab','compute/magnon-lab','compute/band-connectivity','compute/nonsymmorphic-lab','bands','compute/unfold-lab','compute/quantum-geometry-lab','compute/hubbard-cluster-lab','compute/polaron-lab','compute/density-matrix-lab','compute/conservation-lab','compute/manybody-spt-lab','compute/pairing-lab','compute/andreev-lab','compute/device-transport-lab']
};
export function orderToolGroups(groups){
 const known=new Set(groups.map(group=>group.id));
 const tagged=groups.flatMap(group=>group.tools.map(tool=>({category:known.has(reassigned[tool[0]])?reassigned[tool[0]]:group.id,tool})));
 const order=[...categoryOrder.filter(id=>known.has(id)),...groups.map(group=>group.id).filter(id=>!categoryOrder.includes(id))];
 return order.map(id=>{
  const group=groups.find(g=>g.id===id);
  const first=firstTools[id]||[],rank=route=>{const index=first.indexOf(route);return index<0?first.length:index;};
  return {...group,tools:tagged.filter(item=>item.category===id).map(item=>item.tool).sort((a,b)=>rank(a[0])-rank(b[0]))};
 });
}
export function filterToolDirectory(entries,{category='all',arithmetic='all',query='',favorites=null}={}){
 const selected=entries.filter(item=>(category==='all'||item.category===category)&&(arithmetic==='all'||item.capability?.arithmetic===arithmetic)&&(!favorites||favorites.includes(item.route)));
 return String(query).trim()?searchEntries(selected,query,selected.length):selected;
}
