// A bounded provenance snapshot. Raw structure text, atom lists and full input
// objects never belong in this handoff, URLs, history or browser storage.
const SCHEMA='symmetry-lab.structure-handoff';
const clone=x=>JSON.parse(JSON.stringify(x));
const error=message=>{throw Error(message);};
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,allowed)=>{if(!obj(x)||Object.keys(x).some(k=>!allowed.includes(k)))error("The structure-source summary contains unknown or disallowed fields.");};
const finite=(x,min,max)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)error("The structure-source summary requires finite numbers within the allowed ranges.");return x;};
const integer=(x,min,max)=>{finite(x,min,max);if(!Number.isInteger(x))error("Identifiers and counts in the structure-source summary must be integers.");return x;};
const str=(x,max=240)=>{if(typeof x!=='string'||x.length>max||/[\u0000-\u001f\u007f]/u.test(x))error("A text field in the structure-source summary is invalid.");return x;};
const vec=x=>{if(!Array.isArray(x)||x.length!==3)error("Each coordinate in the structure-source summary must have three components.");return x.map(v=>finite(v,-1e9,1e9));};
const mat=x=>{if(!Array.isArray(x)||x.length!==3)error("The transformation matrix in the structure-source summary must be 3 by 3.");return x.map(vec);};
const determinant=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
const checksum=x=>{if(typeof x!=='string'||!/^[0-9a-f]{64}$/.test(x))error("The structure-source summary does not contain a valid SHA-256 digest.");return x;};
const bool=x=>{if(typeof x!=='boolean')error("Each status in the structure-source summary must be an explicit Boolean value.");return x;};
const associationOf=v=>({tool:'structure_bc',sourceSHA256:v.source.sha256,groupNumber:v.structure.groupNumber,hallNumber:v.structure.hallNumber,symprec:v.settings.symprec,angleTolerance:v.settings.angleTolerance,inputK:[...v.coordinates.inputK],bcK:[...v.coordinates.bcK],M:v.coordinates.M.map(row=>[...row]),q:[...v.coordinates.q]});

/** Structural and internal-consistency validation, not an independent rehash of
 * a source file that is intentionally absent from the snapshot. */
export function validateStructureHandoff(value){
 keys(value,['schema','version','source','settings','structure','coordinates','verification','doubleValued','association']);
 if(value.schema!==SCHEMA||value.version!==1)error("This version of the structure-source summary is not supported.");
 keys(value.source,['kind','filename','format','sha256','byteCount','hashBasis','textSHA256','textByteCount']);
 const source={kind:str(value.source.kind,40),filename:str(value.source.filename),format:str(value.source.format,12),sha256:checksum(value.source.sha256),byteCount:integer(value.source.byteCount,1,16_000_000),hashBasis:str(value.source.hashBasis,20),textSHA256:checksum(value.source.textSHA256),textByteCount:integer(value.source.textByteCount,1,16_000_000)};
 if(!['teaching-example','user-file','user-text'].includes(source.kind)||!['poscar','cif','cell'].includes(source.format)||/[\\/]/.test(source.filename)||!['file-bytes','utf8-text'].includes(source.hashBasis))error("The structure-source type, file name, or format is not supported.");
 if(source.hashBasis==='file-bytes'&&source.kind!=='user-file'||source.hashBasis==='utf8-text'&&(source.sha256!==source.textSHA256||source.byteCount!==source.textByteCount))error("The file and text fingerprint conventions in the structure summary are inconsistent.");
 keys(value.settings,['symprec','angleTolerance']);
 const settings={symprec:finite(value.settings.symprec,1e-10,1),angleTolerance:finite(value.settings.angleTolerance,-1,90)};
 if(settings.angleTolerance!==-1&&!(settings.angleTolerance>0&&settings.angleTolerance<90))error("The angle tolerance must be -1 or strictly between 0 and 90 degrees.");
 keys(value.structure,['groupNumber','international','hallNumber','bzType','bravais','inputAtomCount','bcAtomCount']);
 const structure={groupNumber:integer(value.structure.groupNumber,1,230),international:str(value.structure.international,100),hallNumber:integer(value.structure.hallNumber,1,530),bzType:str(value.structure.bzType,100),bravais:str(value.structure.bravais,100),inputAtomCount:integer(value.structure.inputAtomCount,1,20000),bcAtomCount:integer(value.structure.bcAtomCount,1,20000)};
 keys(value.coordinates,['inputK','bcK','M','q']);
 const coordinates={inputK:vec(value.coordinates.inputK),bcK:vec(value.coordinates.bcK),M:mat(value.coordinates.M),q:vec(value.coordinates.q)};
 if(coordinates.bcK.some(v=>Math.abs(v)>100))error("The BC wave-vector components must lie between -100 and 100 for the representation workbench; structure geometry can still be exported separately.");
 const det=determinant(coordinates.M);if(!Number.isFinite(det)||Math.abs(det)<1e-30)error("The coordinate transformation in the structure-source summary is not invertible.");
 const back=coordinates.M[0].map((_,j)=>coordinates.M.reduce((s,row,i)=>s+row[j]*coordinates.bcK[i],0));
 if(back.some((v,i)=>Math.abs(v-coordinates.inputK[i])>1e-9*Math.max(1,Math.abs(v),Math.abs(coordinates.inputK[i]))))error("The input and BC wave vectors in the structure-source summary do not satisfy the inverse-transpose transformation.");
 keys(value.verification,['converted','generators','integralRotations','operationTransport','densityPreserved','covarianceErrorAngstrom','idealizationDisplacementAngstrom','method','spglibVersion','scope','warnings']);
 const v=value.verification;
 if(!Array.isArray(v.warnings)||v.warnings.length>32)error("The warning list in the structure-source summary is invalid.");
 const verification={converted:bool(v.converted),generators:bool(v.generators),integralRotations:bool(v.integralRotations),operationTransport:bool(v.operationTransport),densityPreserved:bool(v.densityPreserved),covarianceErrorAngstrom:finite(v.covarianceErrorAngstrom,0,1e6),idealizationDisplacementAngstrom:finite(v.idealizationDisplacementAngstrom,0,1e6),method:str(v.method,180),spglibVersion:str(v.spglibVersion,80),scope:str(v.scope,1000),warnings:v.warnings.map(w=>str(w,1000))};
 if(!verification.converted||!verification.generators||!verification.integralRotations||!verification.operationTransport||!verification.densityPreserved)error("The structure conversion has not passed all checks, so a verified source handoff cannot be established.");
 const result={schema:SCHEMA,version:1,source,settings,structure,coordinates,verification,doubleValued:bool(value.doubleValued)};
 keys(value.association,['tool','sourceSHA256','groupNumber','hallNumber','symprec','angleTolerance','inputK','bcK','M','q']);
 const expected=associationOf(result);if(Object.keys(expected).some(k=>JSON.stringify(value.association[k])!==JSON.stringify(expected[k])))error("The association fields in the structure-source summary do not match the conversion result.");
 result.association=associationOf(result);return clone(result);
}

/** Hashes the exact UTF-8 source text. Callers must also retire stale promises
 * when the owning source/result changes; isCurrent supports that lifecycle. */
export async function createStructureHandoff({result,input,source={kind:'user-text',filename:''},doubleValued=false,crypto=globalThis.crypto,isCurrent=()=>true}={}){
 if(!obj(input)||typeof input.text!=='string'||!input.text.length||input.text.length>4_000_000)error("Nonempty original structure text is required to establish a traceable source.");
 if(!obj(result)||result.tool!=='structure_bc'||result.verified!==true||result.complete!==true)error("The structure conversion has not passed all checks, so a verified source handoff cannot be established.");
 if(!crypto?.subtle||typeof crypto.subtle.digest!=='function'||typeof TextEncoder!=='function')error("This browser environment cannot compute SHA-256. Geometry exports remain available; retry the source handoff in an environment that supports secure digests.");
 if(!isCurrent())error("The structure source has changed; this summary is no longer used.");
 const text=input.text,inputK=vec(input.k),textBytes=new TextEncoder().encode(text);let bytes=textBytes,hashBasis='utf8-text';
 if(source.bytes!==undefined&&source.bytes!==null){
  if(source.kind!=='user-file'||!(source.bytes instanceof Uint8Array||source.bytes instanceof ArrayBuffer))error("Original file bytes are accepted only for a user-file source.");
  bytes=new Uint8Array(source.bytes instanceof Uint8Array?source.bytes:new Uint8Array(source.bytes));
  if(!bytes.length||bytes.length>4_000_000||typeof TextDecoder!=='function')error("The original file bytes exceed the size limit or cannot be checked against the UTF-8 text.");
  let decoded;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{error("The original file is not reliably verifiable UTF-8 text; geometry exports remain available.");}
  if(decoded!==text)error("The original file bytes do not match the structure text parsed for this request.");hashBasis='file-bytes';
 }
 if(!Array.isArray(result.k_input)||result.k_input.length!==3||result.k_input.some((v,i)=>Math.abs(v-inputK[i])>1e-12)||result.symprec!==Number(input.symprec??1e-5)||result.angle_tolerance!==Number(input.angle_tolerance??-1))error("The coordinates or tolerances in the original request do not match the structure result.");
 const proof=result.verification||{},certificate=result.certificate||{};
 const value={schema:SCHEMA,version:1,source:{kind:source.kind,filename:source.filename||'',format:input.format==='vasp'?'poscar':input.format||'poscar',sha256:'0'.repeat(64),byteCount:bytes.byteLength,hashBasis,textSHA256:'0'.repeat(64),textByteCount:textBytes.byteLength},settings:{symprec:result.symprec,angleTolerance:result.angle_tolerance},structure:{groupNumber:result.group_number,international:result.international,hallNumber:result.hall_number,bzType:result.bz_type||'',bravais:result.bravais||'',inputAtomCount:result.input_cell?.atom_count,bcAtomCount:result.atom_count},coordinates:{inputK,bcK:result.k_bc,M:result.transform?.coordinate_matrix,q:result.transform?.origin_shift},verification:{converted:result.verified,generators:proof.original_BC_generators,integralRotations:proof.integral_rotations,operationTransport:proof.input_operation_transport_verified,densityPreserved:proof.atoms_per_volume_preserved,covarianceErrorAngstrom:proof.atom_covariance_max_error_angstrom,idealizationDisplacementAngstrom:proof.idealization_max_atom_displacement_angstrom,method:certificate.method,spglibVersion:certificate.spglib_version,scope:certificate.scope,warnings:result.warnings||[]},doubleValued};
 value.association=associationOf(value);const snapshot=validateStructureHandoff(value);
 const hex=buffer=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
 snapshot.source.sha256=hex(await crypto.subtle.digest('SHA-256',bytes));
 if(!isCurrent())error("The structure source has changed; this summary is no longer used.");
 snapshot.source.textSHA256=hashBasis==='utf8-text'?snapshot.source.sha256:hex(await crypto.subtle.digest('SHA-256',textBytes));
 if(!isCurrent())error("The structure source has changed; this summary is no longer used.");
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
