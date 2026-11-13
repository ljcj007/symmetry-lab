// A project opens a fresh, editable copy. Scientific records and results are
// never rewritten here; only the owning calculation view reads this RAM input.
import {PROJECT_INPUT_FIELDS,PROJECT_INPUT_ENUMS} from './project-input-fields.js?v=20261113-support1';
const rows=[
 ['quantum_geometry_lab','quantum-materials','geometry','quantum-geometry-lab'],
 ['crystal_field_lab','quantum-materials','orbitals','crystal-field-lab'],
 ['hall_response_lab','response-materials','hall','hall-response-lab'],
 ['device_transport_lab','response-materials','device','device-transport-lab'],
 ['local_multiplet_lab','response-materials','multiplet','local-multiplet-lab'],
 ['spin_resonance_lab','spectroscopy','resonance','spin-resonance-lab'],
 ['andreev_lab','spectroscopy','andreev','andreev-lab'],
 ['atomic_spectra_lab','spectroscopy','spectra','atomic-spectra-lab'],
 ['phonon_thermo','material-research','thermo','phonon-thermo'],
 ['band_connectivity','material-research','bands','band-connectivity'],
 ['shg_lab','electronic-materials','shg','shg-lab'],
 ['band_rep_lab','pathways','bandrep','band-representation-lab'],
 ['dynamic_scattering_lab','pathways','scattering','dynamic-scattering-lab'],
 ['domain_wall_lab','pathways','domainwall','domain-wall-lab'],
 ['hubbard_lab','pathways','hubbard','hubbard-cluster-lab'],
 ['manybody_spectra_lab','bridges','manybody','manybody-spectra-lab'],
 ['polaron_lab','bridges','polaron','polaron-lab'],
 ['density_matrix_lab','bridges','density','density-matrix-lab'],
 ['symmetry_workshop','bridges','workshop','symmetry-workshop'],
 ['order_parameter_lab','principles','order','order-parameter-lab'],
 ['exchange_symmetry_lab','principles','exchange','exchange-symmetry-lab'],
 ['conservation_lab','principles','conservation','conservation-lab'],
 ['salc_lab','construction','salc','salc-lab'],
 ['wavevector_lab','construction','wavevector','wavevector-lab'],
 ['nonsymmorphic_lab','construction','nonsymmorphic','nonsymmorphic-lab'],
 ['statistics_lab','connections','statistics','statistics-lab'],
 ['defects_lab','connections','defects','topological-defects-lab'],
 ['reciprocity_lab','connections','reciprocity','reciprocity-lab'],
 ['layer_symmetry_lab','frontiers','layers','layer-symmetry-lab'],
 ['chirality_polarity_lab','frontiers','chirality','chirality-polarity-lab'],
 ['manybody_spt_lab','frontiers','spt','manybody-spt-lab'],
 ['analyze','workbench','workbench','workbench'],
 ['teaching_labs','lie','lie','lie/su2_coupling']
];
export const PROJECT_INPUT_TARGETS=Object.freeze(Object.fromEntries(rows.map(([action,family,module,route])=>[action,Object.freeze({action,family,module,route:family==='workbench'?'#workbench':'#compute/'+route})])));
// The current project bank uses this one teaching_labs subtype. Other teaching
// payloads (including differently parameterized angle experiments) are not
// advertised as restorable until their individual UI adapters are verified.
const lieExperiments=new Set(['su2_coupling']);
const plain=value=>{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const prototype=Object.getPrototypeOf(value);
 // Objects copied across same-origin realms still have an ordinary Object
 // prototype whose own prototype is null; class/Date instances do not.
 return prototype===null||Object.getPrototypeOf(prototype)===null;
};
export function supportsProjectInput(action,input){
 if(!Object.hasOwn(PROJECT_INPUT_TARGETS,action))return false;
 if(input===undefined)return true;
 if(!plain(input))return false;
 const fields=PROJECT_INPUT_FIELDS[action];
 if(fields&&Object.keys(input).some(key=>!fields.includes(key)))return false;
 if(Object.entries(PROJECT_INPUT_ENUMS[action]||{}).some(([key,values])=>Object.hasOwn(input,key)&&!values.some(value=>value===input[key])))return false;
 return action!=='teaching_labs'||input.lab==='lie'&&lieExperiments.has(input.experiment);
}
export function getProjectInputTarget(action,input){
 if(!supportsProjectInput(action,input))return null;
 const target=PROJECT_INPUT_TARGETS[action];
 return action==='teaching_labs'&&input?{...target,route:'#compute/lie/'+input.experiment,experiment:input.experiment}:{...target};
}
function checkedCopy(input){
 let nodes=0;
 const check=(value,depth)=>{
  if(++nodes>250000||depth>20)throw Error("The saved input is too large or too deeply nested.");
  if(value===null||typeof value==='boolean'||typeof value==='string')return;
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error("The saved input contains a nonfinite number.");return;}
  if(!Array.isArray(value)&&!plain(value))throw Error("The saved input is not restorable JSON data.");
  for(const [key,child]of Object.entries(value)){
   if(['__proto__','prototype','constructor'].includes(key))throw Error("The saved input contains an unsupported field.");
   check(child,depth+1);
  }
 };
 if(!plain(input))throw Error("The saved record has no restorable input object.");
 check(input,0);
 if(new TextEncoder().encode(JSON.stringify(input)).length>4_000_000)throw Error("The saved input exceeds this page's editable 4 MB limit.");
 return structuredClone(input);
}
export function projectInputFor(selection,action,defaults={}){
 if(!selection||!Object.hasOwn(selection,'projectInput')||selection.projectInput===undefined)return {status:'none'};
 const handoff=selection.projectInput;
 try{
  if(!plain(handoff)||handoff.action!==action)throw Error("The saved record belongs to another calculation tool. The current input has not been replaced.");
  if(!supportsProjectInput(action,handoff.input))throw Error("The saved record contains parameters or experiment options that this page does not yet support. The current input has not been replaced.");
  const record=checkedCopy(handoff.input),input={...structuredClone(defaults),...record};
  // Existing file-enabled views read editable JSON from content before sending
  // the same parsed data to Python. Retain data too for lossless source copying.
  if(Object.hasOwn(record,'data'))input.content=JSON.stringify(record.data,null,2);
  if(record.source==='dos'&&typeof record.dos_content==='string')input.content=record.dos_content;
  return {status:'loaded',input,message:"An editable input copy has been created from the project record. Parameter changes do not rewrite the saved record. Review the input, then run the calculation explicitly."};
 }catch(error){return {status:'rejected',message:"Project input was not loaded: "+error.message};}
}
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const projectInputStatusHTML=state=>state?.status==='none'||!state?'':`<p class="notice project-input-notice" role="${state.status==='rejected'?'alert':'status'}">${escapeHTML(state.message)}</p>`;
