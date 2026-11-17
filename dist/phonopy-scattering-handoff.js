import {supportsProjectInput} from './project-input.js?v=20261117-derive1';

// Target-bound RAM drafts contain the original input, never a selected animation.
// An unfinished importer handoff is distinct from a restorable complete record.
let pending=null;
const clone=value=>structuredClone(value),plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function phonopyScatteringDraft(input){
 if(!plain(input)||!(typeof input.content==='string'&&input.content.trim()||plain(input.data)))throw Error('请先读取一份包含声子本征矢的原始文件。');
 const draft={};
 for(const key of ['content','data','filename','structure_content','structure_data','frequency_unit'])if(Object.hasOwn(input,key))draft[key]=clone(input[key]);
 draft.qIndex=Number.isInteger(input.selected_q)&&input.selected_q>=0?input.selected_q:0;
 draft.G=[0,0,0];draft.channel='creation';draft.primitiveOrderConfirmed=false;
 return {action:'phonopy_scattering',input:draft};
}
export function setPhonopyScatteringInput(input){pending={identity:{},kind:'importer',draft:phonopyScatteringDraft(input)};return true;}
export function phonopyScatteringTeachingInput(payload){
 if(!plain(payload)||payload.action!=='phonopy_scattering'||payload.sourceKind!=='teaching-reference'||!['A','B'].includes(payload.point)||typeof payload.referenceId!=='string'||!payload.referenceId.trim()||payload.referenceId.length>200||!/^[a-f0-9]{64}$/i.test(payload.fingerprint||''))throw Error('教学副本需要完整的参考身份与测点。');
 const input=payload.input;
 if(!supportsProjectInput('phonopy_scattering',input)||input.primitiveOrderConfirmed!==true||input.channel!=='creation'||!Array.isArray(input.G)||input.G.length!==3||input.G.some(x=>!Number.isInteger(x))||Object.hasOwn(input,'Q')||(input.QCoordinates??'primitive-reciprocal')!=='primitive-reciprocal')throw Error('教学副本必须保留完整、已声明条件的三维创建通道输入。');
 return {action:'phonopy_scattering',input:clone(input),referenceId:payload.referenceId,fingerprint:payload.fingerprint,point:payload.point,sourceKind:'teaching-reference'};
}
export function setPhonopyScatteringTeachingInput(payload){pending={identity:{},kind:'teaching',draft:phonopyScatteringTeachingInput(payload)};return true;}
export function phonopyScatteringVisit(route){
 const active=pending;
 // Every navigation consumes a pending intent, including an unrelated route.
 pending=null;
 if(String(route||'').replace(/^#/,'').split('?')[0]!=='compute/phonopy-scattering'||!active)return null;
 return clone(active.draft);
}
