// Localize new Python display messages only. This module is not a serializer
// for user projects, imported files, calculation inputs or numerical values.
const marker=/ZXQD(\d+)DQXZ/g;
const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const normalizeKey=key=>String(key).replace(/[-_\s]/g,'').toLowerCase();
const displayKeys=new Set(('label labels title titles name names summary summaries description descriptions detail details message messages scope scopes warning warnings error errors reason reasons explanation explanations interpretation interpretations assumption assumptions convention conventions condition conditions limitation limitations meaning meanings hint hints prompt prompts question questions text caption captions statusMessage modelName instructions goal goals method definition qualification criterion hamiltonianSymmetry initialState finalState stateSelection branch_tracking free_ion_limit pair_weight_definition residual_norm operation channel feedback 数值方法 T₂约定').split(' ').map(normalizeKey));
const displayContainers=new Set(['steps','sources','derivation','derivations','tables','table','columns','rows','headers','choices']);
const protectedKeys=new Set(('id ids kind model module action route url uri href path filename fileName file files filePath source sourceId sourceIds references input inputs parameter parameters params defaults default value values payload data raw rawData content contents fileContent original originalText rawText exports export downloads download poscar cif csv trace code python sourceCode matrix matrices hamiltonian eigenvalues eigenvectors eigenstates coordinates positions momenta rotations operations generators weights probabilities amplitudes coefficients symbol symbols version release schema schemaVersion format notes note userNotes project projects progress learningEvidence').split(' ').map(normalizeKey));
const exactMathKeys=new Set(['formula','formulas','tex','latex','expression','expressions','intrinsicpermutation','particleholeoperator','distortedsymbol']);
const explanatorySuffix=/(?:conventions?|explanations?|descriptions?|summar(?:y|ies)|messages?|warnings?|reasons?|meanings?|labels?|titles?)$/i;

function childDisplayMode(key,mode,nativeAnnotations=false){
 const normalized=normalizeKey(key);
 if(mode==='raw')return 'raw';
 // A caller may identify a fresh, application-generated Python result. Its
 // registered explanatory notes and generator names are presentation labels.
 // Notebook/user-note trees remain opaque, even in that explicit mode.
 if(nativeAnnotations){
  if(['note','notes'].includes(normalized)||!protectedKeys.has(normalized)&&/notes?$/i.test(key))return 'display';
  if(normalized==='generators'||normalized==='value'&&mode==='display')return 'math';
  if(normalized==='operations')return 'walk';
 }
 if(protectedKeys.has(normalized))return 'raw';
 if(exactMathKeys.has(normalized)||/(?:units?|formulas?)$/.test(normalized)||mode==='math')return 'math';
 if(mode==='display'||displayKeys.has(normalized)||displayContainers.has(normalized)||explanatorySuffix.test(key))return 'display';
 return 'walk';
}

// Development-time extraction uses the identical allowlist as runtime cloning.
// It only visits new Python-result fixtures, never notebooks or imported files.
export function collectResultDisplayMessages(value,{nativeAnnotations=false}={}){
 const rows=[],seen=new WeakMap();
 function walk(node,mode='walk',path=[]){
  if(typeof node==='string'){if((mode==='display'||mode==='math')&&/[\u3400-\u9fff]/u.test(node))rows.push({source:node,path,mode});return;}
  if(!node||typeof node!=='object'||mode==='raw')return;
  const modes=seen.get(node)||new Set();if(modes.has(mode))return;modes.add(mode);seen.set(node,modes);
  if(Array.isArray(node))node.forEach((item,index)=>walk(item,mode,[...path,index]));
  else for(const [key,item]of Object.entries(node))walk(item,childDisplayMode(key,mode,nativeAnnotations),[...path,key]);
 }
 walk(value);return rows;
}

function translationMap(value){
 if(value instanceof Map)return new Map([...value].filter(([key,text])=>typeof key==='string'&&typeof text==='string'));
 return new Map(Object.entries(value||{}).filter(([,text])=>typeof text==='string'));
}

function templatePairs(value,translations){
 if(Array.isArray(value))return value.map(item=>typeof item==='string'?[item,translations.get(item)]:Array.isArray(item)?item:[item?.source,item?.translation??item?.target]).filter(([source,target])=>typeof source==='string'&&typeof target==='string');
 return Object.entries(value||{}).filter(([,text])=>typeof text==='string');
}

function compileTemplate(source,target){
 const sourceMarkers=[...source.matchAll(marker)],targetIds=new Set([...target.matchAll(marker)].map(x=>x[1])),sourceIds=new Set(sourceMarkers.map(x=>x[1]));
 if(!sourceMarkers.length||source.length>8000||sourceMarkers.length>32||sourceIds.size!==targetIds.size||[...sourceIds].some(id=>!targetIds.has(id)))return null;
 // Adjacent independent placeholders cannot be decoded unambiguously.
 if(/ZXQD\d+DQXZZXQD\d+DQXZ/.test(source))return null;
 let expression='^',position=0,staticLength=0;const found=new Set();
 for(const match of sourceMarkers){
  const literal=source.slice(position,match.index);expression+=escapeRegExp(literal);staticLength+=literal.length;
  expression+=found.has(match[1])?'\\k<v'+match[1]+'>':'(?<v'+match[1]+'>[\\s\\S]*?)';
  found.add(match[1]);position=match.index+match[0].length;
 }
 const last=source.slice(position);expression+=escapeRegExp(last)+'$';staticLength+=last.length;
 // A marker alone could match arbitrary user text. Require a known sentence.
 if(!staticLength)return null;
 return {source,target,pattern:new RegExp(expression,'u'),staticLength,markerCount:sourceMarkers.length};
}

export function createResultLocalizer({translations={},templates=[],nativeAnnotations=false}={}){
 const exact=translationMap(translations),patterns=templatePairs(templates,exact).map(([source,target])=>compileTemplate(source,target)).filter(Boolean).sort((a,b)=>b.staticLength-a.staticLength||a.markerCount-b.markerCount||a.source.localeCompare(b.source));
 const exactText=value=>typeof value==='string'&&/[\u3400-\u9fff]/u.test(value)&&exact.has(value)?exact.get(value):value;
 function text(value){
  if(typeof value!=='string')return value;
  if(exact.has(value))return exact.get(value);
  // Error strings can include filenames. Captures are substituted verbatim;
  // they never pass through the translation map or another template.
  if(value.length>200000)return value;
  for(const template of patterns){
   const match=template.pattern.exec(value);if(!match)continue;
   return template.target.replace(marker,(_,id)=>match.groups['v'+id]);
  }
  return value;
 }

 function result(value){
  const copies=new WeakMap();
  function clone(node,mode='walk'){
   if(typeof node==='string')return mode==='display'?text(node):mode==='math'?exactText(node):node;
   if(!node||typeof node!=='object')return node;
   // Python results are JSON trees. Preserve aliases defensively when called
   // with an ordinary JavaScript object, without mutating the supplied value.
   const modes=copies.get(node)||new Map();
   if(modes.has(mode))return modes.get(mode);
   copies.set(node,modes);
   if(Array.isArray(node)){const list=[];modes.set(mode,list);for(const item of node)list.push(clone(item,mode));return list;}
   const output={};modes.set(mode,output);
   for(const [key,item]of Object.entries(node)){
    // Defining a property also keeps a literal __proto__ key inert.
    Object.defineProperty(output,key,{value:clone(item,childDisplayMode(key,mode,nativeAnnotations)),writable:true,enumerable:true,configurable:true});
   }
   return output;
  }
  return clone(value);
 }
 return {text,result};
}
