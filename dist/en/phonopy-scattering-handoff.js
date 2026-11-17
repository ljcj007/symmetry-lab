// Target-bound RAM drafts contain the original input, never a selected animation.
// An unfinished importer handoff is distinct from a restorable complete record.
let pending=null;
const clone=value=>structuredClone(value),plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function phonopyScatteringDraft(input){
 if(!plain(input)||!(typeof input.content==='string'&&input.content.trim()||plain(input.data)))throw Error("First read an original file containing phonon eigenvectors.");
 const draft={};
 for(const key of ['content','data','filename','structure_content','structure_data','frequency_unit'])if(Object.hasOwn(input,key))draft[key]=clone(input[key]);
 draft.qIndex=Number.isInteger(input.selected_q)&&input.selected_q>=0?input.selected_q:0;
 draft.G=[0,0,0];draft.channel='creation';draft.primitiveOrderConfirmed=false;
 return {action:'phonopy_scattering',input:draft};
}
export function setPhonopyScatteringInput(input){pending={identity:{},draft:phonopyScatteringDraft(input)};return true;}
export function phonopyScatteringVisit(route){
 const active=pending;
 // Every navigation consumes a pending intent, including an unrelated route.
 pending=null;
 if(String(route||'').replace(/^#/,'').split('?')[0]!=='compute/phonopy-scattering'||!active)return null;
 return clone(active.draft);
}
