const modes=['sg','msg','mpg'];
const invalidGroup=()=>new Error('未找到该群。');
const coordinates=['kx','ky','kz'];

// Keep the established sg= links while using the same explicit key for each catalogue.
export function parseWorkbenchSelection(query,parseCoordinate=Number){
 const params=query instanceof URLSearchParams?query:new URLSearchParams(String(query||'').replace(/^\?/,''));
 const selected=modes.filter(mode=>params.has(mode));
 if(!selected.length)return null;
 if(selected.length!==1||params.getAll(selected[0]).length!==1)throw invalidGroup();
 const mode=selected[0],raw=params.get(mode).trim();
 const id=mode==='sg'?String(Number(raw)):raw;
 if(mode==='sg'?(!/^\d+$/.test(raw)||!Number.isInteger(Number(raw))||Number(raw)<1||Number(raw)>230):!/^\d+\.\d+$/.test(raw))throw invalidGroup();
 const values=coordinates.map(key=>parseCoordinate(params.get(key)||'0'));
 if(values.some(value=>!Number.isFinite(value)||Math.abs(value)>100))throw new Error('坐标必须为 −100 到 100 之间的有限数值。');
 const k=mode==='mpg'?[0,0,0]:values;
 return {mode,id,k,doubleValued:params.get('double')==='true',bzType:params.get('bz')||'',labelK:params.get('label')||(k.every(value=>value===0)?'Γ':null)};
}

export function buildWorkbenchRoute({mode='sg',id,k=[0,0,0],doubleValued=false,bzType='',labelK=null}){
 if(!modes.includes(mode)||!Array.isArray(k)||k.length!==3)throw invalidGroup();
 const params=new URLSearchParams({[mode]:String(id),kx:String(k[0]),ky:String(k[1]),kz:String(k[2]),double:String(Boolean(doubleValued))});
 if(bzType)params.set('bz',bzType);
 if(labelK)params.set('label',labelK);
 const selection=parseWorkbenchSelection(params);
 for(let i=0;i<3;i++)params.set(coordinates[i],String(selection.k[i]));
 params.set(mode,selection.id);
 if(selection.labelK)params.set('label',selection.labelK);
 return 'workbench?'+params.toString();
}
