/* Exact rational verifier for the declared finite real affine profile.
 * Every result is recomputed from input coefficients. No stored PASS is accepted.
 * Browser engine is an independent implementation of the Python receiver.
 */
const MAX_DIGITS = 128;
class InputError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new InputError(code, message); };
const abs = n => n < 0n ? -n : n;
const gcd = (a,b) => { a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a||1n; };
export class Rational {
  constructor(n,d=1n){ if(d===0n) fail('INVALID_RATIONAL','分母不能为零'); if(d<0n){n=-n;d=-d;}const g=gcd(n,d);this.n=n/g;this.d=d/g;if(this.n.toString().length>20000||this.d.toString().length>20000)fail('ARITHMETIC_LIMIT','有理数规模超出本工作台预算'); }
  static from(v){
    if(typeof v==='number'){if(!Number.isSafeInteger(v)) fail('INVALID_RATIONAL','JSON 数值必须是安全整数；分数和小数请用字符串');return new Rational(BigInt(v));}
    if(typeof v!=='string'||v.length>MAX_DIGITS||!/^[-+]?\d+(?:\/\d+|\.\d+)?$/.test(v))fail('INVALID_RATIONAL','需要整数、分数或有限小数字符串');
    if(v.includes('/')){const [n,d]=v.split('/');return inputRational(new Rational(BigInt(n),BigInt(d)));}
    if(v.includes('.')){const negative=v.startsWith('-'),s=v.replace(/^[-+]/,''),[a,b]=s.split('.');return inputRational(new Rational(BigInt(a+b)*(negative?-1n:1n),10n**BigInt(b.length)));}
    return inputRational(new Rational(BigInt(v)));
  }
  add(b){return new Rational(this.n*b.d+b.n*this.d,this.d*b.d);}
  sub(b){return new Rational(this.n*b.d-b.n*this.d,this.d*b.d);}
  mul(b){return new Rational(this.n*b.n,this.d*b.d);}
  div(b){if(!b.n)fail('ARITHMETIC_ZERO_DIVISION','除数为零');return new Rational(this.n*b.d,this.d*b.n);}
  neg(){return new Rational(-this.n,this.d);}
  eq(b){return this.n===b.n&&this.d===b.d;}
  gt(b){return this.n*b.d>b.n*this.d;}
  toString(){return this.d===1n?String(this.n):`${this.n}/${this.d}`;}
}
function inputRational(v){if(abs(v.n).toString(2).length>512||v.d.toString(2).length>512)fail('RATIONAL_LIMIT','归约后的输入分子和分母不得超过 512 bits');return v;}
const Z = () => new Rational(0n), O = () => new Rational(1n);
const mat = (a,n,m,label) => {if(!Array.isArray(a)||a.length!==n||!a.every(r=>Array.isArray(r)&&r.length===m)) fail('MATRIX_DIMENSION',`${label} 必须是 ${n} × ${m} 完整矩阵`);return a.map(r=>r.map(Rational.from));};
const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?O():Z()));
const transpose=a=>a[0].map((_,j)=>a.map(r=>r[j]));
const product=(a,b)=>a.map(r=>b[0].map((_,j)=>r.reduce((s,v,k)=>s.add(v.mul(b[k][j])),Z())));
const equals=(a,b)=>a.length===b.length&&a.every((r,i)=>r.length===b[i].length&&r.every((v,j)=>v.eq(b[i][j])));
const add=(a,b)=>a.map((r,i)=>r.map((v,j)=>v.add(b[i][j])));
const subtract=(a,b)=>a.map((r,i)=>r.map((v,j)=>v.sub(b[i][j])));
const scale=(a,f)=>a.map(r=>r.map(v=>v.mul(f)));
const shifted=(h,c)=>h.map((r,i)=>r.map((v,j)=>i===j?v.sub(c):v));
const projected=(q,h)=>product(product(transpose(q),h),q);
const keys=(o,required,optional,label)=>{
  if(o===null||typeof o!=='object'||Array.isArray(o))fail('INVALID_OBJECT',`${label} 必须是对象`);
  for(const k of required)if(!Object.hasOwn(o,k))fail('MISSING_FIELD',`${label} 缺少 ${k}`);
  for(const k of Object.keys(o))if(!required.includes(k)&&!optional.includes(k))fail('UNKNOWN_FIELD',`${label} 含未支持字段 ${k}`);
};
const int=(v,lo,hi,label)=>{if(!Number.isInteger(v)||v<lo||v>hi)fail('INTEGER_RANGE',`${label} 必须在 ${lo} 至 ${hi} 之间`);return v;};
function fullRank(a){
  const v=a.map(r=>r.slice());let row=0;
  for(let col=0;col<v[0].length&&row<v.length;col++){
    let pivot=row;while(pivot<v.length&&!v[pivot][col].n)pivot++;
    if(pivot===v.length)continue;[v[row],v[pivot]]=[v[pivot],v[row]];
    const d=v[row][col];for(let j=col;j<v[row].length;j++)v[row][j]=v[row][j].div(d);
    for(let i=row+1;i<v.length;i++){const f=v[i][col];for(let j=col;j<v[i].length;j++)v[i][j]=v[i][j].sub(f.mul(v[row][j]));}row++;
  }
  return row===a[0].length;
}
function positivePivots(a){
  const n=a.length,L=identity(n),D=[];
  for(let j=0;j<n;j++){
    let d=a[j][j];for(let k=0;k<j;k++)d=d.sub(L[j][k].mul(L[j][k]).mul(D[k]));
    D.push(d);if(!d.gt(Z()))return {pass:false,pivots:D.map(String),failed_pivot:j};
    for(let i=j+1;i<n;i++){
      let v=a[i][j];for(let k=0;k<j;k++)v=v.sub(L[i][k].mul(L[j][k]).mul(D[k]));L[i][j]=v.div(d);
    }
  }
  return {pass:true,pivots:D.map(String)};
}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
export async function sha256(value){const bytes=new TextEncoder().encode(typeof value==='string'?value:canonical(value));const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export async function verify(packet){
  const receipt={schema:'source-bound-receipt-v1',status:'REJECTED',source:null,request:null,checks:{},conclusion:null,reason_codes:[],scope:'Declared finite real symmetric affine source on the closed unit cube; exact rational arithmetic. A source identifier is a label and its hash binds the submitted descriptor, not physical provenance. No continuum, self-consistent DFT or topological assignment.'};
  const check=(name,status,detail={})=>receipt.checks[name]={status,...detail};
  try{
    keys(packet,['schema','source','request'],['symmetry','periodic_axes'],'packet');
    if(packet.schema!=='source-bound-affine-v1')fail('UNSUPPORTED_SCHEMA','不支持的描述版本');
    const s=packet.source;keys(s,['id','dimension','parameters','H0','H_affine'],[],'source');
    if(typeof s.id!=='string'||!s.id.trim()||Array.from(s.id).length>120||Array.from(s.id).some(c=>{const x=c.codePointAt(0);return x>=0xD800&&x<=0xDFFF;}))fail('SOURCE_ID','源标识必须为 1–120 字符');
    const n=int(s.dimension,2,12,'dimension');
    if(!Array.isArray(s.parameters)||s.parameters.length>3||s.parameters.some(x=>typeof x!=='string'||!(/^[A-Za-z][A-Za-z0-9_]{0,31}$/).test(x))||new Set(s.parameters).size!==s.parameters.length)fail('PARAMETERS','参数名称须唯一，最多三个');
    const d=s.parameters.length;
    if(!Array.isArray(s.H_affine)||s.H_affine.length!==d)fail('COEFFICIENT_COUNT','仿射系数数量与参数数量不符');
    const H=[mat(s.H0,n,n,'H0'),...s.H_affine.map((v,i)=>mat(v,n,n,`H_affine[${i}]`))];
    if(!H.every(h=>equals(h,transpose(h))))fail('SOURCE_NOT_SYMMETRIC','每个源系数必须严格实对称');
    receipt.input_sha256=await sha256(packet);
    receipt.source={id:s.id,dimension:n,parameters:s.parameters,canonical_sha256:await sha256(s)};
    check('source_dimensions_and_symmetry','PASS',{dimension:n,affine_coefficients:d+1});
    check('complete_carrier','PASS',{dimension:n,all_rows_present:true});
    const r=packet.request;keys(r,['rank','cuts','Q_minus','Q_plus'],[],'request');const rank=int(r.rank,1,n-1,'rank');keys(r.cuts,['lower','upper'],[],'cuts');
    const a=Rational.from(r.cuts.lower),b=Rational.from(r.cuts.upper);if(!b.gt(a))fail('INVALID_CUTS','上切口必须严格高于下切口');
    const qm=mat(r.Q_minus,n,rank,'Q_minus'),qp=mat(r.Q_plus,n,n-rank,'Q_plus');
    receipt.request={rank,cuts:{lower:String(a),upper:String(b)}};
    const Q=qm.map((row,i)=>[...row,...qp[i]]),rankPass=fullRank(Q);check('trial_full_rank',rankPass?'PASS':'FAIL',{dimension:n});
    let identityFailure=false;
    if(Object.hasOwn(packet,'symmetry')){
      keys(packet.symmetry,['V','D'],[],'symmetry');const V=mat(packet.symmetry.V,n,n,'V'),D=mat(packet.symmetry.D,rank,rank,'D');
      const orthogonal=equals(product(transpose(V),V),identity(n));const embedding_orthonormal=equals(product(transpose(qm),qm),identity(rank));
      const source_commutation=H.every(h=>equals(product(V,h),product(h,V)));const intertwiner=equals(product(V,qm),product(qm,D));
      const representation_orthogonal=equals(product(transpose(D),D),identity(rank));
      const pass=orthogonal&&embedding_orthonormal&&source_commutation&&intertwiner&&representation_orthogonal;
      check('symmetry',pass?'PASS':'FAIL',{ambient_orthogonal:orthogonal,embedding_orthonormal,coefficient_commutation:source_commutation,intertwiner,representation_orthogonal,profile:'constant real orthogonal action; parameter fixed'});
      if(!pass){identityFailure=true;receipt.reason_codes.push('SYMMETRY_BINDING_INVALID');}
    }else check('symmetry','NOT_REQUESTED');
    if(Object.hasOwn(packet,'periodic_axes')){
      const axes=packet.periodic_axes;
      if(!Array.isArray(axes)||axes.length>d||new Set(axes).size!==axes.length||axes.some(i=>!Number.isInteger(i)||i<0||i>=d))fail('PERIODIC_AXES','周期轴索引无效');
      const pass=axes.every(i=>H[i+1].every(row=>row.every(v=>v.n===0n)));
      check('periodicity',axes.length?(pass?'PASS':'FAIL'):'NOT_REQUESTED',{axes,profile:'identity gluing; affine coefficient must vanish along each periodic axis'});
      if(!pass){identityFailure=true;receipt.reason_codes.push('PERIODICITY_IDENTITY_FAILED');}
    }else check('periodicity','NOT_REQUESTED');
    const negative=[],positive=[],vertices=[];let spectralPass=rankPass,checked=0,failed=[];
    for(let k=0;k<(1<<d);k++){
      let h=H[0];const coordinates=[];
      for(let axis=0;axis<d;axis++){const t=(k>>(d-1-axis))&1;coordinates.push(t);if(t)h=add(h,H[axis+1]);}
      const lo=positivePivots(scale(projected(qm,shifted(h,a)),new Rational(-1n)));
      const hi=positivePivots(projected(qp,shifted(h,b)));
      negative.push(lo.pivots);positive.push(hi.pivots);vertices.push({vertex:coordinates,negative_form:{status:lo.pass?'PASS':'FAIL',ldl_pivots:lo.pivots},positive_form:{status:hi.pass?'PASS':'FAIL',ldl_pivots:hi.pivots}});checked++;
      if(!lo.pass||!hi.pass){spectralPass=false;failed.push({vertex:coordinates,negative_pass:lo.pass,positive_pass:hi.pass});}
    }
    check('spectral_counts',spectralPass?'PASS':'FAIL',{vertices_checked:checked,expected_vertices:1<<d,negative_form_pivots:negative,positive_form_pivots:positive,vertices,failed_vertices:failed,argument:'Affine signed forms positive at every closed-cube vertex are positive throughout the cube; min–max counts all n directions.'});
    if(!rankPass)receipt.reason_codes.push('TRIAL_NOT_FULL_RANK');
    if(!spectralPass)receipt.reason_codes.push('SIGNED_FORMS_UNRESOLVED');
    receipt.status=identityFailure?'REJECTED':spectralPass?'CERTIFIED':'UNRESOLVED';
    if(receipt.status==='CERTIFIED')receipt.conclusion={rank,complement_rank:n-rank,common_interval:{lower:String(a),upper:String(b)},gap_lower_bound:String(b.sub(a)),domain:{parameters:s.parameters,box:Array.from({length:d},()=>['0','1']),closed:true},spectral_statement:`lambda_${rank}(t) < ${a} < ${b} < lambda_${rank+1}(t) throughout the closed unit cube; indirect separation >= ${b.sub(a)}`,topology_certified:false};
  }catch(error){
    receipt.status=error.code==='ARITHMETIC_LIMIT'?'UNRESOLVED':'REJECTED';receipt.reason_codes.push(error.code||'INVALID_INPUT');receipt.error=error instanceof Error?error.message:String(error);receipt.message=receipt.error;
    if(!receipt.checks.source_dimensions_and_symmetry)check('source_dimensions_and_symmetry','FAIL',{message:receipt.error});
  }
  return receipt;
}

// Parse JSON with duplicate-key, depth and non-integer-number checks before JS
// can erase those distinctions. Rational decimals must be quoted strings.
export function parsePacketJSON(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>1000000)fail('INPUT_TOO_LARGE','输入超过 1 MB');
  let i=0;
  const ws=()=>{while(i<text.length&&/\s/.test(text[i]))i++;};
  const string=()=>{const start=i++;let escaped=false;while(i<text.length){const c=text[i++];if(c==='"'&&!escaped){let v;try{v=JSON.parse(text.slice(start,i));}catch{fail('JSON_INVALID','无效的 JSON 字符串');}for(let j=0;j<v.length;j++){const code=v.charCodeAt(j);if(code>=0xD800&&code<=0xDBFF){const next=v.charCodeAt(++j);if(!(next>=0xDC00&&next<=0xDFFF))fail('JSON_INVALID','字符串含未配对 Unicode 代理项');}else if(code>=0xDC00&&code<=0xDFFF)fail('JSON_INVALID','字符串含未配对 Unicode 代理项');}return v;}if(c==='\\'&&!escaped)escaped=true;else escaped=false;}fail('JSON_INVALID','未闭合的 JSON 字符串');};
  const value=depth=>{
    if(depth>48)fail('JSON_DEPTH_LIMIT','JSON 嵌套过深');ws();const c=text[i];
    if(c==='"')return string();
    if(c==='{'){i++;const o={};const seen=new Set();ws();if(text[i]==='}'){i++;return o;}while(true){ws();if(text[i]!=='"')fail('JSON_INVALID','对象字段需要引号');const k=string();if(seen.has(k))fail('DUPLICATE_KEY','重复的 JSON 字段：'+k);seen.add(k);ws();if(text[i++]!==':')fail('JSON_INVALID','字段后缺少冒号');const v=value(depth+1);Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});ws();const end=text[i++];if(end==='}')return o;if(end!==',')fail('JSON_INVALID','对象字段分隔符无效');}}
    if(c==='['){i++;const a=[];ws();if(text[i]===']'){i++;return a;}while(true){a.push(value(depth+1));ws();const end=text[i++];if(end===']')return a;if(end!==',')fail('JSON_INVALID','数组分隔符无效');}}
    for(const [token,v] of [['true',true],['false',false],['null',null]])if(text.startsWith(token,i)){i+=token.length;return v;}
    const m=text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);if(m){i+=m[0].length;if(/[.eE]/.test(m[0]))fail('JSON_NONINTEGER_NUMBER','JSON 数字只支持安全整数；有理数小数请加引号');const v=Number(m[0]);if(!Number.isSafeInteger(v))fail('JSON_UNSAFE_INTEGER','大整数请用字符串表示');return v;}
    fail('JSON_INVALID','无法识别的 JSON 值');
  };
  const result=value(0);ws();if(i!==text.length)fail('JSON_INVALID','JSON 末尾含额外内容');return result;
}
