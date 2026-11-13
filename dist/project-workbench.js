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
 if(!plain(input))unsupported('这份群表示记录的输入须为普通 JSON 对象。');
 const extra=Reflect.ownKeys(input).filter(key=>typeof key!=='string'||!fields.has(key));
 if(extra.length)unsupported('这份记录含当前工作台不能还原的额外计算设置；请在材料研究记录中保留并重算，不能用标准群预设替代。');
 if(typeof input.group_number!=='number'||!Number.isInteger(input.group_number)||input.group_number<1||input.group_number>230)unsupported('这份记录须明确给出 1 到 230 之间的整数普通空间群编号。');
 if(!Array.isArray(catalogGroups))unsupported('普通空间群数据库尚未载入，暂不能还原这份记录。');
 const matches=catalogGroups.filter(group=>group?.number===input.group_number);
 if(matches.length!==1)unsupported('数据库中未找到唯一对应的普通空间群，不能改用其他群。');
 const group=matches[0];
 if(!Array.isArray(group.operations)||!group.operations.length||!basis(group.basis))unsupported('对应群的标准操作或原胞基底不完整，暂不能还原这份记录。');
 if(!Array.isArray(input.operations)||!input.operations.length||!sameJSON(input.operations,group.operations))unsupported('保存的对称操作与标准群数据库不一致；当前工作台不能还原自定义操作，请在材料研究记录中保留并重算。');
 if(!basis(input.basis)||!sameJSON(input.basis,group.basis))unsupported('保存的原胞基底与标准群数据库不一致；当前工作台不能还原自定义基底，请在材料研究记录中保留并重算。');
 if(!vector(input.k)||input.k.some(x=>Math.abs(x)>100))unsupported('保存的波矢须为三个 −100 到 100 之间的有限数字。');
 if(typeof input.doubleValued!=='boolean')unsupported('保存的表示类型须明确为单值或双值，不能用文本或数字代替。');
 let bzType='';
 if(Object.hasOwn(input,'bz_type')){
  if(typeof input.bz_type!=='string'||(input.bz_type!==''&&!(group.bzTypes||[]).includes(input.bz_type)))unsupported('该群不支持保存的 BZ 类型，不能改用其他 BZ 设置。');
  bzType=input.bz_type;
 }
 let labelK=input.k.every(x=>x===0)?'Γ':null;
 if(Object.hasOwn(input,'k_label')){
  if(typeof input.k_label!=='string'||!input.k_label.trim()||input.k_label.length>128||/[\u0000-\u001f\u007f]/u.test(input.k_label))unsupported('保存的标准标签须为非空短文本；当前工作台不能还原其他标签输入。');
  labelK=input.k_label;
 }
 const selection={mode:'sg',id:String(group.number),k:input.k.slice(),doubleValued:input.doubleValued,bzType,labelK};
 const restored=parseWorkbenchSelection(buildWorkbenchRoute(selection).split('?')[1]);
 if(!sameJSON(selection,restored))unsupported('保存的设置不能完整往返现有工作台路由，未改用默认设置。');
 return restored;
}

export function canRestoreProjectWorkbench(input,catalogGroups){
 try{projectWorkbenchSelection(input,catalogGroups);return true;}catch{return false;}
}
