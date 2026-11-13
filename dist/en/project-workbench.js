import {buildWorkbenchRoute,parseWorkbenchSelection} from './workbench-route.js?v=20261113-support1';

const fields=new Set(['operations','basis','k','doubleValued','group_number','bz_type','k_label']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const vector=value=>Array.isArray(value)&&value.length===3&&Array.from(value).every(x=>typeof x==='number'&&Number.isFinite(x));
const basis=value=>Array.isArray(value)&&value.length===3&&Array.from(value).every(vector);
function sameJSON(a,b,depth=0){
 if(depth>20||typeof a!==typeof b)return false;
 if(a===null||b===null)return a===b;
 if(typeof a==='number')return Number.isFinite(a)&&Number.isFinite(b)&&a===b;
 if(typeof a!=='object')return a===b;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&Array.from({length:a.length},(_,index)=>sameJSON(a[index],b[index],depth+1)).every(Boolean);
 if(!plain(a)||!plain(b))return false;
 const aa=Reflect.ownKeys(a),bb=Reflect.ownKeys(b);
 return aa.length===bb.length&&aa.every(key=>typeof key==='string'&&Object.hasOwn(b,key)&&sameJSON(a[key],b[key],depth+1));
}
const unsupported=message=>{throw new Error(message);};

// Only the standard-group settings exposed by the existing workbench can be
// restored. This check never substitutes registered operations for a custom
// operation list or metric, even when the group number happens to agree.
export function projectWorkbenchSelection(input,catalogGroups){
 if(!plain(input))unsupported("The group-representation record must contain a plain JSON input object.");
 const extra=Reflect.ownKeys(input).filter(key=>typeof key!=='string'||!fields.has(key));
 if(extra.length)unsupported("This record contains additional calculation settings that the current workbench cannot restore. Keep it and rerun it in Material Research Records; a standard-group preset cannot replace it.");
 if(typeof input.group_number!=='number'||!Number.isInteger(input.group_number)||input.group_number<1||input.group_number>230)unsupported("The record must explicitly provide an integer ordinary space-group number from 1 to 230.");
 if(!Array.isArray(catalogGroups))unsupported("The ordinary space-group database has not loaded, so this record cannot yet be restored.");
 const matches=catalogGroups.filter(group=>group?.number===input.group_number);
 if(matches.length!==1)unsupported("A unique matching ordinary space group was not found in the database. Another group cannot be substituted.");
 const group=matches[0];
 if(!Array.isArray(group.operations)||!group.operations.length||!basis(group.basis))unsupported("The matching group's standard operations or primitive basis are incomplete, so this record cannot yet be restored.");
 if(!Array.isArray(input.operations)||!input.operations.length||!sameJSON(input.operations,group.operations))unsupported("The saved symmetry operations differ from the standard-group database. The current workbench cannot restore custom operations; keep the record and rerun it in Material Research Records.");
 if(!basis(input.basis)||!sameJSON(input.basis,group.basis))unsupported("The saved primitive basis differs from the standard-group database. The current workbench cannot restore a custom basis; keep the record and rerun it in Material Research Records.");
 if(!vector(input.k)||input.k.some(x=>Math.abs(x)>100))unsupported("The saved wavevector must contain three finite numbers from −100 to 100.");
 if(typeof input.doubleValued!=='boolean')unsupported("The saved representation type must explicitly be single-valued or double-valued. Text or numbers cannot replace the Boolean setting.");
 let bzType='';
 if(Object.hasOwn(input,'bz_type')){
  if(typeof input.bz_type!=='string'||(input.bz_type!==''&&!(group.bzTypes||[]).includes(input.bz_type)))unsupported("This group does not support the saved BZ type. Another BZ setting cannot be substituted.");
  bzType=input.bz_type;
 }
 let labelK=input.k.every(x=>x===0)?'Γ':null;
 if(Object.hasOwn(input,'k_label')){
  if(typeof input.k_label!=='string'||!input.k_label.trim()||input.k_label.length>128||/[\u0000-\u001f\u007f]/u.test(input.k_label))unsupported("The saved standard label must be nonempty short text. The current workbench cannot restore other label inputs.");
  labelK=input.k_label;
 }
 const selection={mode:'sg',id:String(group.number),k:input.k.slice(),doubleValued:input.doubleValued,bzType,labelK};
 const restored=parseWorkbenchSelection(buildWorkbenchRoute(selection).split('?')[1]);
 if(!sameJSON(selection,restored))unsupported("The saved settings cannot make a complete roundtrip through the current workbench route. Defaults have not been substituted.");
 return restored;
}

export function canRestoreProjectWorkbench(input,catalogGroups){
 try{projectWorkbenchSelection(input,catalogGroups);return true;}catch{return false;}
}
