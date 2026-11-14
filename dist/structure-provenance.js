// A bounded provenance snapshot. Raw structure text, atom lists and full input
// objects never belong in this handoff, URLs, history or browser storage.
const SCHEMA='symmetry-lab.structure-handoff';
const clone=x=>JSON.parse(JSON.stringify(x));
const error=message=>{throw Error(message);};
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,allowed)=>{if(!obj(x)||Object.keys(x).some(k=>!allowed.includes(k)))error('结构来源摘要含未知或不允许的字段。');};
const finite=(x,min,max)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)error('结构来源摘要需要范围内的有限数值。');return x;};
const integer=(x,min,max)=>{finite(x,min,max);if(!Number.isInteger(x))error('结构来源摘要的编号或计数必须为整数。');return x;};
const str=(x,max=240)=>{if(typeof x!=='string'||x.length>max||/[\u0000-\u001f\u007f]/u.test(x))error('结构来源摘要中的文本字段不合法。');return x;};
const vec=x=>{if(!Array.isArray(x)||x.length!==3)error('结构来源摘要的坐标必须有三个分量。');return x.map(v=>finite(v,-1e9,1e9));};
const mat=x=>{if(!Array.isArray(x)||x.length!==3)error('结构来源摘要的变换矩阵必须为三乘三。');return x.map(vec);};
const determinant=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
const checksum=x=>{if(typeof x!=='string'||!/^[0-9a-f]{64}$/.test(x))error('结构来源摘要缺少有效的 SHA-256。');return x;};
const bool=x=>{if(typeof x!=='boolean')error('结构来源摘要的状态必须是明确的布尔值。');return x;};
const associationOf=v=>({tool:'structure_bc',sourceSHA256:v.source.sha256,groupNumber:v.structure.groupNumber,hallNumber:v.structure.hallNumber,symprec:v.settings.symprec,angleTolerance:v.settings.angleTolerance,inputK:[...v.coordinates.inputK],bcK:[...v.coordinates.bcK],M:v.coordinates.M.map(row=>[...row]),q:[...v.coordinates.q]});

/** Structural and internal-consistency validation, not an independent rehash of
 * a source file that is intentionally absent from the snapshot. */
export function validateStructureHandoff(value){
 keys(value,['schema','version','source','settings','structure','coordinates','verification','doubleValued','association']);
 if(value.schema!==SCHEMA||value.version!==1)error('不支持的结构来源摘要版本。');
 keys(value.source,['kind','filename','format','sha256','byteCount','hashBasis','textSHA256','textByteCount']);
 const source={kind:str(value.source.kind,40),filename:str(value.source.filename),format:str(value.source.format,12),sha256:checksum(value.source.sha256),byteCount:integer(value.source.byteCount,1,16_000_000),hashBasis:str(value.source.hashBasis,20),textSHA256:checksum(value.source.textSHA256),textByteCount:integer(value.source.textByteCount,1,16_000_000)};
 if(!['teaching-example','user-file','user-text'].includes(source.kind)||!['poscar','cif','cell'].includes(source.format)||/[\\/]/.test(source.filename)||!['file-bytes','utf8-text'].includes(source.hashBasis))error('结构来源类型、文件名或格式不受支持。');
 if(source.hashBasis==='file-bytes'&&source.kind!=='user-file'||source.hashBasis==='utf8-text'&&(source.sha256!==source.textSHA256||source.byteCount!==source.textByteCount))error('结构摘要的文件或文本指纹约定不一致。');
 keys(value.settings,['symprec','angleTolerance']);
 const settings={symprec:finite(value.settings.symprec,1e-10,1),angleTolerance:finite(value.settings.angleTolerance,-1,90)};
 if(settings.angleTolerance!==-1&&!(settings.angleTolerance>0&&settings.angleTolerance<90))error('角度容差应为 -1 或介于 0 与 90 度之间。');
 keys(value.structure,['groupNumber','international','hallNumber','bzType','bravais','inputAtomCount','bcAtomCount']);
 const structure={groupNumber:integer(value.structure.groupNumber,1,230),international:str(value.structure.international,100),hallNumber:integer(value.structure.hallNumber,1,530),bzType:str(value.structure.bzType,100),bravais:str(value.structure.bravais,100),inputAtomCount:integer(value.structure.inputAtomCount,1,20000),bcAtomCount:integer(value.structure.bcAtomCount,1,20000)};
 keys(value.coordinates,['inputK','bcK','M','q']);
 const coordinates={inputK:vec(value.coordinates.inputK),bcK:vec(value.coordinates.bcK),M:mat(value.coordinates.M),q:vec(value.coordinates.q)};
 if(coordinates.bcK.some(v=>Math.abs(v)>100))error('表示工作台的 BC 波矢分量需在 -100 到 100 范围内；结构几何仍可单独导出。');
 const det=determinant(coordinates.M);if(!Number.isFinite(det)||Math.abs(det)<1e-30)error('结构来源摘要的坐标变换不可逆。');
 const back=coordinates.M[0].map((_,j)=>coordinates.M.reduce((s,row,i)=>s+row[j]*coordinates.bcK[i],0));
 if(back.some((v,i)=>Math.abs(v-coordinates.inputK[i])>1e-9*Math.max(1,Math.abs(v),Math.abs(coordinates.inputK[i]))))error('结构来源摘要的输入与 BC 波矢不满足逆转置变换。');
 keys(value.verification,['converted','generators','integralRotations','operationTransport','densityPreserved','covarianceErrorAngstrom','idealizationDisplacementAngstrom','method','spglibVersion','scope','warnings']);
 const v=value.verification;
 if(!Array.isArray(v.warnings)||v.warnings.length>32)error('结构来源摘要的警告列表不合法。');
 const verification={converted:bool(v.converted),generators:bool(v.generators),integralRotations:bool(v.integralRotations),operationTransport:bool(v.operationTransport),densityPreserved:bool(v.densityPreserved),covarianceErrorAngstrom:finite(v.covarianceErrorAngstrom,0,1e6),idealizationDisplacementAngstrom:finite(v.idealizationDisplacementAngstrom,0,1e6),method:str(v.method,180),spglibVersion:str(v.spglibVersion,80),scope:str(v.scope,1000),warnings:v.warnings.map(w=>str(w,1000))};
 if(!verification.converted||!verification.generators||!verification.integralRotations||!verification.operationTransport||!verification.densityPreserved)error('结构转换尚未通过完整检查，不能建立已验证的来源交接。');
 const result={schema:SCHEMA,version:1,source,settings,structure,coordinates,verification,doubleValued:bool(value.doubleValued)};
 keys(value.association,['tool','sourceSHA256','groupNumber','hallNumber','symprec','angleTolerance','inputK','bcK','M','q']);
 const expected=associationOf(result);if(Object.keys(expected).some(k=>JSON.stringify(value.association[k])!==JSON.stringify(expected[k])))error('结构来源摘要与转换结果的关联字段不一致。');
 result.association=associationOf(result);return clone(result);
}

/** Hashes the exact UTF-8 source text. Callers must also retire stale promises
 * when the owning source/result changes; isCurrent supports that lifecycle. */
export async function createStructureHandoff({result,input,source={kind:'user-text',filename:''},doubleValued=false,crypto=globalThis.crypto,isCurrent=()=>true}={}){
 if(!obj(input)||typeof input.text!=='string'||!input.text.length||input.text.length>4_000_000)error('需要非空的原始结构文本，才能建立可核对的文件来源。');
 if(!obj(result)||result.tool!=='structure_bc'||result.verified!==true||result.complete!==true)error('结构转换尚未通过完整检查，不能建立已验证的来源交接。');
 if(!crypto?.subtle||typeof crypto.subtle.digest!=='function'||typeof TextEncoder!=='function')error('当前浏览环境无法计算 SHA-256；可保留几何导出，来源交接需在支持安全摘要的环境中重试。');
 if(!isCurrent())error('结构来源已改变，本次摘要不再使用。');
 const text=input.text,inputK=vec(input.k),textBytes=new TextEncoder().encode(text);let bytes=textBytes,hashBasis='utf8-text';
 if(source.bytes!==undefined&&source.bytes!==null){
  if(source.kind!=='user-file'||!(source.bytes instanceof Uint8Array||source.bytes instanceof ArrayBuffer))error('原文件字节仅用于用户文件来源。');
  bytes=new Uint8Array(source.bytes instanceof Uint8Array?source.bytes:new Uint8Array(source.bytes));
  if(!bytes.length||bytes.length>4_000_000||typeof TextDecoder!=='function')error('原文件字节超过范围或无法核对 UTF-8 文本。');
  let decoded;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{error('原文件不是可可靠核对的 UTF-8 文本；几何导出仍可保留。');}
  if(decoded!==text)error('原文件字节与本次解析的结构文本不一致。');hashBasis='file-bytes';
 }
 if(!Array.isArray(result.k_input)||result.k_input.length!==3||result.k_input.some((v,i)=>Math.abs(v-inputK[i])>1e-12)||result.symprec!==Number(input.symprec??1e-5)||result.angle_tolerance!==Number(input.angle_tolerance??-1))error('原始请求与结构结果的坐标或容差不一致。');
 const proof=result.verification||{},certificate=result.certificate||{};
 const value={schema:SCHEMA,version:1,source:{kind:source.kind,filename:source.filename||'',format:input.format==='vasp'?'poscar':input.format||'poscar',sha256:'0'.repeat(64),byteCount:bytes.byteLength,hashBasis,textSHA256:'0'.repeat(64),textByteCount:textBytes.byteLength},settings:{symprec:result.symprec,angleTolerance:result.angle_tolerance},structure:{groupNumber:result.group_number,international:result.international,hallNumber:result.hall_number,bzType:result.bz_type||'',bravais:result.bravais||'',inputAtomCount:result.input_cell?.atom_count,bcAtomCount:result.atom_count},coordinates:{inputK,bcK:result.k_bc,M:result.transform?.coordinate_matrix,q:result.transform?.origin_shift},verification:{converted:result.verified,generators:proof.original_BC_generators,integralRotations:proof.integral_rotations,operationTransport:proof.input_operation_transport_verified,densityPreserved:proof.atoms_per_volume_preserved,covarianceErrorAngstrom:proof.atom_covariance_max_error_angstrom,idealizationDisplacementAngstrom:proof.idealization_max_atom_displacement_angstrom,method:certificate.method,spglibVersion:certificate.spglib_version,scope:certificate.scope,warnings:result.warnings||[]},doubleValued};
 value.association=associationOf(value);const snapshot=validateStructureHandoff(value);
 const hex=buffer=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
 snapshot.source.sha256=hex(await crypto.subtle.digest('SHA-256',bytes));
 if(!isCurrent())error('结构来源已改变，本次摘要不再使用。');
 snapshot.source.textSHA256=hashBasis==='utf8-text'?snapshot.source.sha256:hex(await crypto.subtle.digest('SHA-256',textBytes));
 if(!isCurrent())error('结构来源已改变，本次摘要不再使用。');
 snapshot.association=associationOf(snapshot);return validateStructureHandoff(snapshot);
}


/** Validate first; a valid source is retained only for the identical numerical
 * request. This never infers source identity from group/k equality alone. */
export function structureHandoffForCalculation(value,{action='analyze',input,result=null}={}){
 const source=validateStructureHandoff(value);
 const sameK=k=>Array.isArray(k)&&k.length===3&&k.every((v,i)=>typeof v==='number'&&Number.isFinite(v)&&v===source.coordinates.bcK[i]);
 if(action!=='analyze'||!obj(input)||input.group_number!==source.structure.groupNumber||input.doubleValued!==source.doubleValued||!sameK(input.k)||(input.bz_type||'')!==source.structure.bzType)return null;
 if(result!==null&&(!obj(result)||result.magnetic!==false||result.doubleValued!==source.doubleValued||!sameK(result.k)||result.standardLabels?.group_number!==undefined&&result.standardLabels.group_number!==source.structure.groupNumber))return null;
 return source;
}
