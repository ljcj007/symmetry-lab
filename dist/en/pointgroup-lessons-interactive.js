// The lesson models use small, explicit Cartesian actions. The full 32-group
// atlas and its identification engine remain the source for the advanced tools.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tidy = x => Math.abs(x) < 1e-10 ? 0 : Number(x.toFixed(6));
const num = x => String(tidy(x)).replace(/-/g, '−');
const vec = v => '(' + v.map(num).join(', ') + ')';
export const identity = n => Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => Number(i === j)));
export const matVec = (a,v) => a.map(row => tidy(row.reduce((s,x,j) => s+x*v[j],0)));
export const matMul = (a,b) => a.map(row => b[0].map((_,j) => tidy(row.reduce((s,x,k) => s+x*b[k][j],0))));
export const transpose = a => a[0].map((_,j) => a.map(row => row[j]));
const equal = (a,b) => JSON.stringify(a.map(row => Array.isArray(row) ? row.map(tidy) : tidy(row))) === JSON.stringify(b.map(row => Array.isArray(row) ? row.map(tidy) : tidy(row)));
const trace = a => tidy(a.reduce((s,row,i) => s+row[i],0));
const norm = v => Math.sqrt(v.reduce((s,x) => s+x*x,0));
const zero = n => Array(n).fill(0);
const add = (a,b) => a.map((x,i) => tidy(x+b[i]));
const scaled = (v,s) => v.map(x => tidy(s*x));
const matrixKey = a => JSON.stringify(a.map(row => row.map(tidy)));
const E = identity(3), C4 = [[0,-1,0],[1,0,0],[0,0,1]], MXZ = [[1,0,0],[0,-1,0],[0,0,1]], MXY = [[1,0,0],[0,1,0],[0,0,-1]], INV = [[-1,0,0],[0,-1,0],[0,0,-1]];
const power = (a,n) => { let b=identity(a.length); for(let i=0;i<n;i++)b=matMul(a,b); return b; };
const op = (label,matrix,translation=[0,0,0]) => ({label,matrix,translation});
const rotations = Array.from({length:4},(_,i) => op(['E','R','R²','R³'][i],power(C4,i)));
const d4 = [...rotations,...rotations.map((r,i) => op(['m(xz)','m(y=x)','m(yz)','m(y=−x)'][i],matMul(r.matrix,MXZ)))];
const action = (g,p) => add(matVec(g.matrix,p),g.translation);
const compose = (a,b) => op(a.label+'·'+b.label,matMul(a.matrix,b.matrix),add(matVec(a.matrix,b.translation),a.translation));
const sameOp = (a,b) => equal(a.matrix,b.matrix)&&equal(a.translation,b.translation);
const order = a => { let b=op('E',E); for(let n=1;n<=48;n++){b=compose(a,b);if(sameOp(b,op('E',E)))return n;}return Infinity; };

export const operationSets = [
  {id:'incomplete',label:"Set to test {E, R}: only two operations listed",operations:rotations.slice(0,2)},
  {id:'c4',label:"C₄: four rotations about z",operations:rotations},
  {id:'square',label:"C₄ᵥ: four square rotations and four vertical mirrors",operations:d4},
  {id:'translations',label:"Integer translations: Tₖ(x,y,z)=(x+k,y,z)",infinite:true,operations:[-2,-1,0,1,2].map(k=>op('T'+(k<0?'₋'+Math.abs(k):k),E,[k,0,0]))}
];

export function operationSetModel(id='c4',indices=[1,1,2],probe=[.8,.35,.6]) {
  const set=operationSets.find(s=>s.id===id)||operationSets[1],ops=set.operations;
  const [a,b,c]=indices.map(i=>ops[Math.max(0,Math.min(ops.length-1,Number(i)||0))]);
  const product=compose(a,b),member=ops.find(x=>sameOp(x,product));
  const failures=[]; if(!set.infinite)for(const x of ops)for(const y of ops){const result=compose(x,y);if(!ops.some(z=>sameOp(z,result)))failures.push({a:x.label,b:y.label,result});}
  const inverse=ops.find(x=>sameOp(compose(x,a),op('E',E))&&sameOp(compose(a,x),op('E',E)));
  const left=compose(compose(a,b),c),right=compose(a,compose(b,c));
  const p1=action(c,probe),p2=action(b,p1),p3=action(a,p2);
  return {set,a,b,c,product,productLabel:member?.label||(set.infinite?'T'+num(product.translation[0]):"outside the set: "+(equal(product.matrix,power(C4,2))?'R²':"composite operation")),
    closure:set.infinite||failures.length===0,failures,inverseLabel:inverse?.label||(set.infinite?'T'+num(-a.translation[0]):null),
    identityLeft:compose(op('E',E),a),identityRight:compose(a,op('E',E)),left,right,associative:sameOp(left,right),probe,steps:[probe,p1,p2,p3],
    leftGrouped:action(compose(a,b),p1),rightGrouped:action(a,action(compose(b,c),probe)),order:order(a),
    groupOrder:set.infinite?Infinity:ops.length,productPoint:action(product,probe),reversePoint:action(compose(b,a),probe),originImage:action(a,[0,0,0]),originFixedByAll:!set.infinite&&ops.every(x=>equal(action(x,[0,0,0]),[0,0,0]))};
}

export const coordinateOperations = [
  op("C₄(z): 90° counterclockwise",C4),op('C₂(z)：180°',power(C4,2)),op("m(xz): reflection across xz",MXZ),
  op("m(xy): reflection across xy",MXY),op("i: inversion through the origin",INV),
  op("S₄: rotate 90°, then reflect across xy",matMul(MXY,C4)),op("4̄: rotate 90°, then invert",matMul(INV,C4))
];
export function coordinateModel(index=0,probe=[1,.5,.8]) {
  const operation=coordinateOperations[index]||coordinateOperations[0];
  return {operation,before:probe.slice(),after:action(operation,probe),rotation180:matVec(power(C4,2),probe),inversion:matVec(INV,probe)};
}

export function crystalRotationModel(n) {
  const theta=2*Math.PI/n,value=1+2*Math.cos(theta),integral=Math.abs(value-Math.round(value))<1e-9;
  return {n,angle:360/n,trace:tidy(value),integral,allowed:[1,2,3,4,6].includes(n)};
}

const closure = generators => {
  const matrices=[E];for(let cursor=0;cursor<matrices.length;cursor++)for(const g of generators){const next=matMul(g,matrices[cursor]);if(!matrices.some(a=>equal(a,next)))matrices.push(next);if(matrices.length>48)throw Error('Unbounded teaching example');}return matrices;
};
export const guidedGroups = [
  {hm:'2',name:"Twofold rotation",generators:[power(C4,2)],clue:"The only nonidentity operation preserves z and reverses x and y: a twofold rotation about z."},
  {hm:'m',name:"One mirror plane",generators:[MXZ],clue:"The mirror fixes every point in xz and reverses only y. An operation of order two is not necessarily a twofold rotation."},
  {hm:'−1',name:"Inversion center",generators:[INV],clue:"The only nonidentity operation reverses x, y and z. No nonzero vector remains fixed."},
  {hm:'222',name:"Three mutually perpendicular twofold axes",generators:[power(C4,2),[[1,0,0],[0,-1,0],[0,0,-1]]],clue:"All three nonidentity operations are proper rotations. Twofold axes along x, y and z give 222."},
  {hm:'mm2',name:"Two vertical mirrors and one twofold axis",generators:[power(C4,2),MXZ],clue:"This group also has order four, but two nonidentity operations are mirrors. The mirrors intersect along z, giving mm2."},
  {hm:'4',name:"A principal fourfold axis only",generators:[C4],clue:"The highest proper rotation is fourfold. All four operations are rotations; there is no mirror or inversion."},
  {hm:'4mm',name:"A fourfold axis and vertical mirrors",generators:[C4,MXZ],clue:"The fourfold rotations are accompanied by mirrors containing z. There is no horizontal mirror, so a vector along z can remain unchanged."},
  {hm:'4/mmm',name:"A fourfold axis, horizontal and vertical mirrors",generators:[C4,MXZ,MXY],clue:"Add a mirror perpendicular to z to 4mm. Closure also introduces inversion, giving 4/mmm."}
].map(g=>({...g,matrices:closure(g.generators)}));

const det3 = a => a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
export function guidedGroupModel(index=0) {
  const group=guidedGroups[index]||guidedGroups[0];
  const proper=group.matrices.filter(a=>det3(a)>0),mirrors=group.matrices.filter(a=>det3(a)<0&&trace(a)===1);
  return {...group,order:group.matrices.length,maxRotation:Math.max(...proper.map(a=>order(op('',a)))),mirrors:mirrors.length,
    inversion:group.matrices.some(a=>equal(a,INV)),horizontal:mirrors.some(a=>equal(a,MXY)),
    vertical:mirrors.filter(a=>equal(matVec(a,[0,0,1]),[0,0,1])).length,
    perpendicularTwofold:proper.filter(a=>order(op('',a))===2&&equal(matVec(a,[0,0,1]),[0,0,-1])).length};
}

const sub2 = a => a.slice(0,2).map(row=>row.slice(0,2));
export const representationFamilies = [
  {id:'plane',label:"2D arrow: basis (eₓ,eᵧ)",basis:['eₓ','eᵧ'],operations:[{label:"90° rotation",matrix:sub2(C4)},{label:"180° rotation",matrix:sub2(power(C4,2))},{label:"Reflection across the x axis",matrix:sub2(MXZ)}],seed:[2,1]},
  {id:'space',label:"3D arrow: basis (eₓ,eᵧ,e_z)",basis:['eₓ','eᵧ','e_z'],operations:coordinateOperations.map(g=>({label:g.label,matrix:g.matrix})),seed:[2,1,3]},
  {id:'water',label:"Scalar amplitudes on the two H atoms of water: basis (s₁,s₂)",basis:['s₁','s₂'],operations:[{label:"E: both H atoms stay in place",matrix:[[1,0],[0,1]]},{label:"C₂(z): exchange H₁ and H₂",matrix:[[0,1],[1,0]]},{label:"σ(xz): each H stays in place",matrix:[[1,0],[0,1]]},{label:"σ(yz): exchange H₁ and H₂",matrix:[[0,1],[1,0]]}],seed:[2,1]}
];
export function representationModel(familyId='plane',index=0,coefficients) {
  const family=representationFamilies.find(f=>f.id===familyId)||representationFamilies[0],operation=family.operations[index]||family.operations[0],v=coefficients||family.seed;
  const columns=transpose(operation.matrix),result=matVec(operation.matrix,v);
  return {family,operation,columns,coefficients:v,result,contributions:columns.map((column,i)=>scaled(column,v[i])),diagonal:operation.matrix.map((row,i)=>row[i]),trace:trace(operation.matrix)};
}

export const c4vClasses = ['E','2C₄','C₂','2σᵥ','2σᵈ'];
export const c4vSizes = [1,2,1,2,2];
export const c4vIrreps = [
  {name:'A₁',id:'A1',dimension:1,characters:[1,1,1,1,1]},
  {name:'A₂',id:'A2',dimension:1,characters:[1,1,1,-1,-1]},
  {name:'B₁',id:'B1',dimension:1,characters:[1,-1,1,1,-1]},
  {name:'B₂',id:'B2',dimension:1,characters:[1,-1,1,-1,1]},
  {name:'E',id:'E',dimension:2,characters:[2,0,-2,0,0]}
];
export const reductionPresets = [
  {id:'vector',label:"3D polar vector (x,y,z)",characters:[3,1,-1,1,1]},
  {id:'vertices',label:"Scalar amplitudes at four square vertices",characters:[4,0,0,0,2]},
  {id:'quadratic',label:"Six quadratic functions",characters:[6,0,2,2,2]},
  {id:'product',label:"Tensor product of two 3D vectors",characters:[9,1,1,1,1]}
];
export function reductionModel(characters) {
  const rows=c4vIrreps.map(ir=>{const terms=characters.map((x,i)=>tidy(c4vSizes[i]*ir.characters[i]*x)),sum=tidy(terms.reduce((a,b)=>a+b,0));return {...ir,terms,sum,multiplicity:tidy(sum/8)};});
  const reconstructed=characters.map((_,i)=>tidy(rows.reduce((s,row)=>s+row.multiplicity*row.characters[i],0)));
  const dimension=tidy(rows.reduce((s,row)=>s+row.multiplicity*row.dimension,0));
  return {characters,rows,reconstructed,dimension,valid:characters.every(Number.isFinite)&&characters[0]>=0&&rows.every(row=>row.multiplicity>=0&&Number.isInteger(row.multiplicity)),dimensionMatches:Math.abs(dimension-characters[0])<1e-9};
}

const quadraticPairs = [[0,0],[1,1],[2,2],[0,1],[0,2],[1,2]];
export function quadraticRepresentation(r) {
  // Active function action f(r) -> f(R^-1 r), with coefficient columns.
  return quadraticPairs.map(([a,b])=>quadraticPairs.map(([j,k])=>tidy(a===b?r[a][j]*r[a][k]:r[a][j]*r[b][k]+r[b][j]*r[a][k])));
}
const vertices = [[1,1,0],[-1,1,0],[-1,-1,0],[1,-1,0]];
function permutationRepresentation(r) {
  return vertices.map(target=>vertices.map(source=>Number(equal(matVec(r,source),target))));
}
const c4vOperations = d4.map((g,i)=>({...g,classIndex:i===0?0:i===2?2:i<4?1:i%2===0?3:4}));
export function cartesianOperationLabel(r) {
  const known=[['E',E],['C₄(z)+',C4],['C₂(z)',power(C4,2)],['C₄(z)−',power(C4,3)],
    ['m(xz)',MXZ],['m(yz)',matMul(power(C4,2),MXZ)],['m(x=y)',matMul(C4,MXZ)],['m(x=−y)',matMul(power(C4,3),MXZ)],
    ['m(xy)',MXY],['i',INV],['C₂(x)',[[1,0,0],[0,-1,0],[0,0,-1]]],['C₂(y)',[[-1,0,0],[0,1,0],[0,0,-1]]],
    ['C₂(x=y)',[[0,1,0],[1,0,0],[0,0,-1]]],['C₂(x=−y)',[[0,-1,0],[-1,0,0],[0,0,-1]]],
    ['S₄(z)+',matMul(MXY,C4)],['S₄(z)−',matMul(MXY,power(C4,3))]];
  return known.find(([,matrix])=>equal(matrix,r))?.[0]||'R';
}
export const projectionFamilies = [
  {id:'vector',label:"Three-dimensional vector space",basis:['x','y','z'],matrices:c4vOperations.map(g=>g.matrix),seeds:[{label:'z',v:[0,0,1]},{label:'x',v:[1,0,0]},{label:'y',v:[0,1,0]},{label:'x+y+z',v:[1,1,1]}]},
  {id:'quadratic',label:"Six-dimensional quadratic-function space",basis:['x²','y²','z²','xy','xz','yz'],matrices:c4vOperations.map(g=>quadraticRepresentation(g.matrix)),seeds:[{label:'x²',v:[1,0,0,0,0,0]},{label:'z²',v:[0,0,1,0,0,0]},{label:'xy',v:[0,0,0,1,0,0]},{label:'xz+yz',v:[0,0,0,0,1,1]}]},
  {id:'vertices',label:"Scalar-amplitude space on four vertices",basis:['s₁','s₂','s₃','s₄'],matrices:c4vOperations.map(g=>permutationRepresentation(g.matrix)),seeds:[{label:"Unit amplitude at vertex 1 only",v:[1,0,0,0]},{label:"Equal signs at all four vertices",v:[1,1,1,1]},{label:"Alternating signs around the square",v:[1,-1,1,-1]}]}
];
const independentColumns = columns => {
  const orthonormal=[],chosen=[];
  columns.forEach((column,index)=>{let v=column.slice();for(const q of orthonormal){const d=v.reduce((s,x,i)=>s+x*q[i],0);v=v.map((x,i)=>x-d*q[i]);}const length=norm(v);if(length>1e-8){orthonormal.push(v.map(x=>x/length));chosen.push({index,vector:column});}});return chosen;
};
export function projectionModel(familyId='vector',irrepId='A1',seedIndex=0) {
  const family=projectionFamilies.find(f=>f.id===familyId)||projectionFamilies[0],irrep=c4vIrreps.find(ir=>ir.id===irrepId)||c4vIrreps[0],seed=family.seeds[seedIndex]||family.seeds[0],n=family.basis.length;
  const terms=family.matrices.map((matrix,i)=>{const character=irrep.characters[c4vOperations[i].classIndex],image=matVec(matrix,seed.v),weight=irrep.dimension*character/8;return {label:c4vOperations[i].label,character,weight,image,weighted:scaled(image,weight)};});
  const projector=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>tidy(family.matrices.reduce((s,m,k)=>s+irrep.dimension*irrep.characters[c4vOperations[k].classIndex]*m[i][j]/8,0))));
  const result=matVec(projector,seed.v),columns=transpose(projector),independent=independentColumns(columns);
  return {family,irrep,seed,terms,projector,result,columns,independent,rank:independent.length,zero:norm(result)<1e-8,multiplicity:independent.length/irrep.dimension};
}

export const propertyGroups = [
  {hm:'4mm',label:"4mm (C₄ᵥ): polar tetragonal",generators:[C4,MXZ],constraint:"p=(0,0,p_z); T=diag(a,a,c). The fourfold rotation equates x and y; vertical mirrors remove cross components."},
  {hm:'4/mmm',label:"4/mmm (D₄ₕ): centrosymmetric tetragonal",generators:[C4,MXZ,MXY],constraint:"p=0; T=diag(a,a,c). The horizontal mirror also removes p_z, while the second-rank tensor may remain nonzero."},
  {hm:'222',label:"222 (D₂): three twofold axes only",generators:[power(C4,2),[[1,0,0],[0,-1,0],[0,0,-1]]],constraint:"p=0; T=diag(a,b,c). A group can lack a polar direction even without any mirror."},
  {hm:'mm2',label:"mm2 (C₂ᵥ): twofold axis along z",generators:[power(C4,2),MXZ],constraint:"p=(0,0,p_z); T=diag(a,b,c). Without a fourfold axis, T_xx and T_yy may differ."},
  {hm:'−1',label:"−1 (Cᵢ): inversion only",generators:[INV],constraint:"p=0; any symmetric second-rank tensor is allowed. Inversion reverses a polar vector, but its two minus signs cancel for a second-rank tensor."},
  {hm:'1',label:"1 (C₁): identity only",generators:[],constraint:"Any p and any symmetric T are allowed; this group adds no constraint."}
].map(g=>({...g,matrices:closure(g.generators)}));

export function propertyModel(groupIndex=0,p=[1,2,3],tensor=[[1,1,2],[1,2,3],[2,3,4]]) {
  const group=propertyGroups[groupIndex]||propertyGroups[0],n=group.matrices.length;
  const checks=group.matrices.map(r=>{const vectorImage=matVec(r,p),tensorImage=matMul(matMul(r,tensor),transpose(r));return {matrix:r,label:cartesianOperationLabel(r),vectorImage,tensorImage,vectorInvariant:equal(vectorImage,p),tensorInvariant:equal(tensorImage,tensor)};});
  const vectorAverage=p.map((_,i)=>tidy(checks.reduce((s,c)=>s+c.vectorImage[i]/n,0)));
  const tensorAverage=tensor.map((row,i)=>row.map((_,j)=>tidy(checks.reduce((s,c)=>s+c.tensorImage[i][j]/n,0))));
  return {group,p,tensor,checks,vectorAverage,tensorAverage,vectorInvariant:checks.every(c=>c.vectorInvariant),tensorInvariant:checks.every(c=>c.tensorInvariant)};
}

const option = (value,label,selected) => `<option value="${esc(value)}"${String(value)===String(selected)?' selected':''}>${esc(label)}</option>`;
const select = (id,label,options) => `<label for="${id}">${label}<select id="${id}">${options}</select></label>`;
const matrix = (a,label="Matrix") => `<span class="pgl-matrix" role="img" aria-label="${esc(label+': '+a.map(row=>row.map(num).join(', ')).join('; '))}" style="--pgl-cols:${a[0].length}">${a.map(row=>row.map(x=>`<span>${esc(num(x))}</span>`).join('')).join('')}</span>`;
const equation = html => `<div class="pgl-equation">${html}</div>`;
const table = (heads,rows,caption) => `<div class="pgl-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<${i===0?'th scope="row"':'td'}>${x}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const flow = (title,body) => `<section class="pgl-step"><h4>${title}</h4>${body}</section>`;
const result = body => `<div class="pgl-result" role="status" aria-live="polite">${body}</div>`;
const shell = (title,intro,body) => `<section class="pgl-workshop" data-pgl-workshop><span class="pg-kicker">Work through this lesson yourself</span><h3>${title}</h3><p>${intro}</p>${body}</section>`;

function graphic(before,after,{object='cube',caption="Before and after in the same coordinate system"}={}) {
  const scale=Math.min(1,1.4/Math.max(1,...before.map(Math.abs),...after.map(Math.abs)));
  const project=([x,y,z])=>[160+67*scale*(x-.6*y),143+55*scale*(.35*x+.45*y-z)],point=v=>project(v).map(num).join(',');
  const origin=project([0,0,0]);
  const axes=[[1.65,0,0],[0,1.65,0],[0,0,1.65]].map((v,i)=>{const p=project(v);return `<line class="pgl-axis" x1="${origin[0]}" y1="${origin[1]}" x2="${p[0]}" y2="${p[1]}"/><text x="${p[0]+5}" y="${p[1]}">${['x','y','z'][i]}</text>`;}).join('');
  const nodes=object==='cube'?[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z]))):vertices;
  const edges=nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>a.filter((x,k)=>x!==b[k]).length===1).map(b=>`<polyline class="pgl-object" points="${point(a)} ${point(b)}"/>`)).join('');
  const marker=(p,kind,label)=>{const q=project(p);return `<line class="pgl-${kind}" x1="${origin[0]}" y1="${origin[1]}" x2="${q[0]}" y2="${q[1]}"/><circle class="pgl-${kind}" cx="${q[0]}" cy="${q[1]}" r="5"/><text class="pgl-${kind}-text" x="${q[0]+8}" y="${q[1]-6}">${label}</text>`;};
  return `<figure class="pgl-graphic"><svg viewBox="0 0 340 285" role="img" aria-label="${esc(caption+". Blue, before: "+vec(before)+"; orange, after: "+vec(after))}">${edges}${axes}<circle cx="${origin[0]}" cy="${origin[1]}" r="3"/>${marker(before,'before','p')}${marker(after,'after','Rp')}</svg><figcaption><span class="pgl-blue">Blue, before: ${esc(vec(before))}</span><span class="pgl-orange">Orange, after: ${esc(vec(after))}</span></figcaption></figure>`;
}

const lessonIds = ['group-basics','operations-notation','thirty-two','representations','character-reduction','projection','selection-rules'];
export function pointgroupLessonInteractionHTML(lessonId) {
  return lessonIds.includes(lessonId)?`<div data-pointgroup-lesson-interaction="${esc(lessonId)}"></div>`:'';
}

/** Bind one lesson, retaining its choices when the learner changes chapters. */
export function bindPointgroupLessonInteraction({root,lessonId,stateStore=new Map(),isCurrent=()=>true}) {
  let alive=true,revision=0;
  const state=stateStore.get(lessonId)||{};stateStore.set(lessonId,state);
  const active=()=>alive&&isCurrent()&&root.isConnected!==false;
  const $=s=>root.querySelector(s);
  const on=(id,event,fn)=>{const node=$('#'+id),version=revision;if(node)node[event]=e=>{if(active()&&version===revision&&$('#'+id)===node)fn(e);};};
  const choose=(id,key,cast=String,after=()=>{})=>on(id,'onchange',e=>{state[key]=cast(e.target.value);after();draw();});
  function basics() {
    state.set??='c4';state.indices??=[1,1,2];const m=operationSetModel(state.set,state.indices),infinite=m.set.infinite;
    const ops=m.set.operations,opSelect=['A','B','C'].map((label,i)=>select('pgl-basic-'+i,"Operation "+label+" (products act from right to left)",ops.map((g,j)=>option(j,g.label,state.indices[i])).join(''))).join('');
    const failed=m.failures[0],closureText=infinite?"TₐTᵦ=Tₐ₊ᵦ. The sum of any two integers is an integer, so the full integer-translation set is closed.":m.closure?"Every product appears in the table. For example:"+m.a.label+'·'+m.b.label+'='+m.productLabel+'。':failed.a+'·'+failed.b+"  produces an operation outside the set. For example, R·R=R², but the list contains only E and R, so it is not closed.";
    const assoc=`Use the same three operations: A=${m.a.label}，B=${m.b.label}，C=${m.c.label}. Both expressions start at p=${vec(m.probe)}  and apply C, then B, then A.`;
    root.innerHTML=shell("Test the group rules on four operation sets", "Start with an operation set and ask whether it satisfies all four rules. R is a 90° rotation about z. All four mirrors in this example contain z, so the three-dimensional point group is C₄ᵥ. Restricted to the square's plane, these eight actions have the abstract multiplication of the dihedral group D₄. Their spatial action differs from that of the three-dimensional point group D₄, which contains only proper rotations.",
      `<div class="pgl-controls">${select('pgl-basic-set',"Choose an actual operation set",operationSets.map(s=>option(s.id,s.label,state.set)).join(''))}</div><p class="pgl-set">${infinite?"The full set is {Tₖ | k∈ℤ}; the selector shows five examples only.":esc('{'+ops.map(g=>g.label).join(', ')+'}')}</p><div class="pgl-controls pgl-three">${opSelect}</div>`+
      (infinite?`<p>Translate the infinite integer-point chain …,−2,−1,0,1,2,… by an integer distance along x. The whole chain coincides with itself. The five selectable examples do not truncate the group to five elements.</p>`:`<div class="pgl-two">${graphic(m.probe,m.productPoint,{object:'square',caption:"Apply B, then A, to a probe beside the square"})}<div><p>The gray lines form a square. The blue and orange arrows track an external probe. First apply B=${esc(m.b.label)}, then A=${esc(m.a.label)}。</p>${equation(`ABp=${esc(vec(m.productPoint))}<br>BAp=${esc(vec(m.reversePoint))}`)}<p>${equal(m.productPoint,m.reversePoint)?"These two orders currently give the same result.":"The two orders give different results: compositions involving mirrors need not commute."} Associativity keeps the order fixed. Compare the same three-operation action below.</p></div></div>`)+
      flow("1 · Closure: is the product still in the set?",`<p>${esc(closureText)}</p>${equation(`${esc(m.a.label)}·${esc(m.b.label)} → <strong>${esc(m.productLabel)}</strong>`)}${!infinite?table(['A\\B',...ops.map(g=>esc(g.label))],ops.map(a=>[esc(a.label),...ops.map(b=>{const found=ops.find(g=>sameOp(g,compose(a,b)));return found?esc(found.label):"<strong class=\"pgl-outside\">Outside the set</strong>";})]),"Composition table: row A, column B; apply B before A"):''}`)+
      flow("2 · Identity: inserting E on either side changes nothing",equation(`E·${esc(m.a.label)} = ${esc(m.a.label)}·E = ${esc(m.a.label)}`)+`<p>${esc(infinite?"For translations, E is T₀.":"E leaves every point in place. It is a definite member of the set, rather than an unselected control.")}</p>`)+
      flow("3 · Inverse: return every point to its starting position",m.inverseLabel?equation(`${esc(m.inverseLabel)}·${esc(m.a.label)} = ${esc(m.a.label)}·${esc(m.inverseLabel)} = E`):`<p>The selected operation  ${esc(m.a.label)}  has no inverse listed in this set. The inverse of R is R³; without it, the set cannot undo R.</p>`)+
      flow("4 · Associativity: regroup the same three actions without reordering them",`<p>${esc(assoc)}</p><ol class="pgl-action-path"><li>Cp=${esc(vec(m.steps[1]))}</li><li>B(Cp)=${esc(vec(m.steps[2]))}</li><li>A(B(Cp))=${esc(vec(m.steps[3]))}</li></ol>${equation(`(AB)(Cp)=${esc(vec(m.leftGrouped))}<br>A((BC)p)=${esc(vec(m.rightGrouped))}`)}<p>The left expression combines A and B first; the right combines B and C first. The grouping changes, but the order A, B, C does not. Exchanging A and B is a different question.</p>`)+
      result(`<p><strong>${infinite?"This is a group, but it is not a point group.":m.closure?"This set forms a group under composition.":"This set is not yet a group."}</strong> ${infinite?"The group has infinite order. No finite repetition of a nonzero Tₖ becomes E.":`The set lists  ${ops.length}  distinct operations${m.closure?", giving group order |G|="+ops.length:", but it does not satisfy all the group conditions"}. The selected A=${esc(m.a.label)}  has operation order  ${Number.isFinite(m.order)?m.order:"Infinite"}。`}</p><p>${infinite?"Every nonzero translation moves even the origin, so no point is fixed by all operations.":"All these operations fix the origin (0,0,0). A common fixed point means the same point is fixed by every operation; other points may move."} ${!infinite&&m.closure?"Group order counts distinct operations. Operation order counts repetitions of one operation until it becomes E. Keep these two counts separate.":''}</p>`));
    choose('pgl-basic-set','set',String,()=>{state.indices=state.set==='translations'?[3,4,1]:state.set==='square'?[1,4,2]:[1,1,0];});
    for(let i=0;i<3;i++)on('pgl-basic-'+i,'onchange',e=>{state.indices[i]=Number(e.target.value);draw();});
  }

  function coordinates() {
    state.operation??=0;state.probe??='general';const probes={general:[1,.5,.8],axis:[0,0,1],plane:[1,.5,0]},m=coordinateModel(state.operation,probes[state.probe]);
    root.innerHTML=shell("Track the same probe beside the cube","The gray wireframe is one unmarked cube. Blue and orange points show an external probe before and after the action. The probe tracks the operation; it is not a distinguished mark on the cube. Permanently coloring one corner would change the symmetry group.",
      `<div class="pgl-controls">${select('pgl-coordinate-op',"Which operation acts on the entire object?",coordinateOperations.map((g,i)=>option(i,g.label,state.operation)).join(''))}${select('pgl-coordinate-probe',"Select the probe p",option('general',"General position (1,0.5,0.8)",state.probe)+option('axis',"On the z axis (0,0,1)",state.probe)+option('plane',"In the xy plane (1,0.5,0)",state.probe))}</div><div class="pgl-two">${graphic(m.before,m.after)}<div>${equation(`r′=Rr<br>${matrix(m.operation.matrix)} ${esc(vec(m.before))} = ${esc(vec(m.after))}`)}${table(["Coordinate","Before","After"],['x','y','z'].map((x,i)=>[x,num(m.before[i]),num(m.after[i])]),"Three coordinates of the same probe")}</div></div>`+
      result(`<p><strong>${esc(m.operation.label)}</strong> maps ${esc(vec(m.before))} to ${esc(vec(m.after))}; the origin remains (0,0,0).</p><p>Inversion i reverses all three coordinates, giving  ${esc(vec(m.inversion))}. C₂(z) reverses only x and y, giving  ${esc(vec(m.rotation180))}。${equal(m.inversion,m.rotation180)?"The probe lies in xy, so the two results happen to coincide. Choose a general position to reveal the difference in z.":"The different z components show directly that inversion is not a 180° rotation about z."}</p><p>S₄=σ(xy)C₄; 4̄=iC₄. These are different compositions; compare them on the same probe.</p>`));
    choose('pgl-coordinate-op','operation',Number);choose('pgl-coordinate-probe','probe');
  }

  function identify() {
    state.n??=4;state.case??=6;state.answer??='';state.checked??=false;const r=crystalRotationModel(state.n),g=guidedGroupModel(state.case);
    root.innerHTML=shell("Learn what is possible, then classify by evidence","The restriction on rotation order comes from a periodic lattice, rather than a list to memorize. Test a rotation angle first, then identify a type from a complete operation set.",
      flow("1 · Why can a periodic lattice have only 1-, 2-, 3-, 4- and 6-fold rotations?",`<p>In a primitive lattice basis, an operation mapping lattice points onto lattice points is an integer matrix, so its trace is an integer. A 3D proper rotation by θ also has tr R=1+2cosθ. Changing the basis does not change the trace of the same linear map.</p><div class="pgl-controls">${select('pgl-rotation-n',"Try an n-fold proper rotation",[1,2,3,4,5,6,8].map(n=>option(n,n+" heavy",state.n)).join(''))}</div>${equation(`θ=360°/${r.n}=${num(r.angle)}°<br>tr R=1+2cosθ=${num(r.trace)}`)}<p><strong>${r.allowed?"It satisfies the necessary integer-trace condition.":"The trace is not an integer, so this rotation cannot preserve a 3D periodic lattice."}</strong> ${r.n===5?"An isolated pentagonal molecule need not preserve a translation lattice, so its fivefold axis causes no contradiction.":"For finite-order proper rotations, the allowed values are n=1,2,3,4,6."} This condition restricts rotation orders. The full classification into 32 types also requires mirrors, inversion and closure.</p>`)+
      flow("2 · Identify in order: rotations → mirror directions → inversion → complete count",`<ol><li>Find the highest-order proper rotation. A mirror or inversion has operation order two, but is not a twofold rotation.</li><li>Take z as the principal axis. Check whether mirrors contain z (vertical) or are perpendicular to z (horizontal), then check twofold axes perpendicular to z.</li><li>Check whether −I belongs to the complete set. Having a mirror does not automatically imply inversion.</li><li>Check all operations and the group order. With partial evidence, an operation not yet observed may still exist.</li></ol>`)+
      flow("3 · Guided comparisons: name a group from complete evidence",`<div class="pgl-controls">${select('pgl-identify-case',"Choose a geometric situation to inspect",guidedGroups.map((group,i)=>option(i,group.name,state.case)).join(''))}</div><p>This example uses fixed Cartesian coordinates. Read the complete list and criteria before choosing a name. These eight examples teach the criteria; use the atlas to continue through all 32 types.</p>${table(["Evidence","This example"],[["Total number of distinct operations",g.order],["Highest proper rotation order",g.maxRotation],["Number of mirror planes",g.mirrors],["Vertical mirrors / horizontal mirror",g.vertical+' / '+(g.horizontal?"Yes":"None")],["Twofold axes perpendicular to z",g.perpendicularTwofold],["Inversion −I",g.inversion?"Yes":"None"]],"Identification evidence derived from the operations")}<details><summary>Expand all  ${g.order}  operation matrices</summary><div class="pgl-matrix-list">${g.matrices.map((m,i)=>`<div><span>${i===0?'E':'R'+i}</span>${matrix(m)}</div>`).join('')}</div></details><p class="pgl-clue"><strong>Reasoning hint:</strong>${esc(g.clue)}</p><div class="pgl-controls">${select('pgl-identify-answer',"Choose a point group using the evidence above",option('',"Read the evidence, then choose",state.answer)+guidedGroups.map(group=>option(group.hm,group.hm,state.answer)).join(''))}</div><button type="button" class="secondary" id="pgl-identify-check"${state.answer?'':' disabled'}>Explain my answer</button>${state.checked?result(`<p>${state.answer===g.hm?"Your name agrees with the complete operation set.":"The selected  "+esc(state.answer)+"  does not agree with this example's evidence."} This example is  <strong>${esc(g.hm)}</strong>, with group order  ${g.order}。${esc(g.clue)}</p><p>Next time, state which operation rules out a similar group before naming the group.</p>`):''}`));
    choose('pgl-rotation-n','n',Number);choose('pgl-identify-case','case',Number,()=>{state.answer='';state.checked=false;});choose('pgl-identify-answer','answer',String,()=>{state.checked=false;});on('pgl-identify-check','onclick',()=>{state.checked=true;draw();});
  }

  function representations() {
    state.family??='plane';state.operation??=0;const family=representationFamilies.find(f=>f.id===state.family)||representationFamilies[0];state.coefficients??=family.seed.slice();
    const m=representationModel(state.family,state.operation,state.coefficients),n=family.basis.length;
    root.innerHTML=shell("Build the matrix: each column is the image of one basis vector","Fix an ordered basis and transform its first, second and remaining vectors in turn. Arrange their new coordinates as columns in that same order. The resulting matrix then acts on any linear combination.",
      `<div class="pgl-controls">${select('pgl-rep-family',"First choose what transforms",representationFamilies.map(f=>option(f.id,f.label,state.family)).join(''))}${select('pgl-rep-operation',"Then choose the visible operation",family.operations.map((g,i)=>option(i,g.label,state.operation)).join(''))}</div>`+
      (state.family==='water'?`<p>Place water in xz, with z along the H—O—H angle bisector. H₁ is on the x&gt;0 side and H₂ on the x&lt;0 side. Here s₁ and s₂ are one scalar amplitude at each site; this example concerns exchanging sites. Full atomic displacements also require transforming the x, y and z directions.</p><div class="pgl-water-sites"><span>H₂ · s₂</span><span>O · z↑</span><span>H₁ · s₁</span></div>`:graphic(n===2?[...m.coefficients,0]:m.coefficients,n===2?[...m.result,0]:m.result,{object:'square',caption:"Arrow direction before and after the selected operation"}))+
      flow("1 · Transform each basis vector",table(["Input basis vector","New coordinates: one matrix column"],family.basis.map((basis,i)=>[basis,esc(vec(m.columns[i]))]),"Arrange basis-vector images as columns"))+
      flow("2 · Assemble these images into a matrix",equation(`D(g)=[${family.basis.map(b=>'D(g)'+esc(b)).join('　')}]=${matrix(m.operation.matrix)}`)+`<p>Column j answers: where does basis vector j go? Do not arrange these images as rows.</p>`)+
      flow("3 · For any vector, combine the columns with its original coefficients",`<div class="pgl-coefficients">${m.coefficients.map((x,i)=>`<label>${esc(family.basis[i])}  coefficient<input type="number" step="0.5" min="-4" max="4" id="pgl-rep-coeff-${i}" value="${esc(x)}"></label>`).join('')}</div>${equation(`D(g)${esc(vec(m.coefficients))} = ${m.contributions.map((v,i)=>`${num(m.coefficients[i])}·${esc(vec(m.columns[i]))}`).join(' + ')} = <strong>${esc(vec(m.result))}</strong>`)}<p>Changing one coefficient changes the output along the corresponding matrix column. The matrix is fixed by the operation and basis, not by this particular input vector.</p>`)+
      flow("4 · Take the trace to obtain this operation's character",equation(`χ(g)=tr D(g)=${m.diagonal.map(num).join(' + ')}=<strong>${num(m.trace)}</strong>`)+`<p>${state.family==='plane'?"For a 90° rotation, both diagonal entries are zero, so χ=0. The matrix itself is not zero.":state.family==='space'?"The same rotation about z preserves one additional z direction, so its 3D vector trace exceeds the (x,y) trace by one.":`A permutation trace counts basis functions that stay at their own sites. Exchanging the two H atoms gives a nonzero matrix with zero trace. This is not the full nine-dimensional atomic-displacement representation.`}</p>`)+
      `<p class="pgl-next"><a href="#classroom/foundations?module=demos&amp;experiment=characters">Continue from operations to characters →</a> <a href="#classroom/foundations?module=demos&amp;experiment=water">Combine site permutations and direction changes: water vibrations →</a></p>`);
    choose('pgl-rep-family','family',String,()=>{state.operation=0;state.coefficients=representationFamilies.find(f=>f.id===state.family).seed.slice();});choose('pgl-rep-operation','operation',Number);
    for(let i=0;i<n;i++)on('pgl-rep-coeff-'+i,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.coefficients[i]=x;draw();}});
  }

  function reduction() {
    state.preset??='vector';state.characters??=reductionPresets[0].characters.slice();const m=reductionModel(state.characters),sum=m.rows.filter(row=>row.multiplicity!==0).map(row=>(row.multiplicity===1?'':num(row.multiplicity))+row.name).join(' ⊕ ')||"Zero representation";
    root.innerHTML=shell("Reduce actual characters one term at a time","Use C₄ᵥ throughout this lesson. The columns are E, 2C₄, C₂, 2σᵥ, 2σᵈ. Each entry is the trace of one operation in that class; class sizes provide separate weights. You can edit all five inputs below.",
      `${table(["Irreducible representation",...c4vClasses],c4vIrreps.map(ir=>[ir.name,...ir.characters.map(num)]),"C₄ᵥ character table: group order 8")}<div class="pgl-controls">${select('pgl-reduce-preset',"Choose a representation with an explicit origin",reductionPresets.map(p=>option(p.id,p.label,state.preset)).join('')+option('custom',"Edit the characters yourself",state.preset))}</div><div class="pgl-character-inputs">${c4vClasses.map((name,i)=>`<label>${name}<small>class size ${c4vSizes[i]}</small><input id="pgl-character-${i}" type="number" step="1" value="${esc(state.characters[i])}" aria-label="${esc(name+"  character")}"></label>`).join('')}</div>`+
      flow("Compute aα=(1/8)Σ n_c χᵅ(C_c)χ(C_c) term by term",table(['α',"E term","2C₄ term","C₂ term","2σᵥ term","2σᵈ term","Sum ÷ 8","Multiplicity aα"],m.rows.map(row=>[row.name,...row.terms.map((term,i)=>`${c4vSizes[i]}×${num(row.characters[i])}×${num(state.characters[i])}=${num(term)}`),num(row.sum)+' ÷ 8',`<strong>${num(row.multiplicity)}</strong>`]),"Class size × irreducible character × input character, summed term by term"))+
      result(`<p><strong>${m.valid?"Decomposition: Γ = "+esc(sum):"This input is not the character of an ordinary C₄ᵥ representation."}</strong></p><p>${m.valid?"Every multiplicity is a nonnegative integer.":"For a negative or noninteger multiplicity, check operation traces and column order. Rounding the numbers does not produce a valid decomposition."}</p>${equation(`χ(E)=${num(state.characters[0])}<br>Σ aαdα=${m.rows.map(row=>num(row.multiplicity)+'×'+row.dimension).join(' + ')}=${num(m.dimension)}`)}<p>The left side is the original dimension. The right sums each irreducible dimension multiplied by its multiplicity.${m.valid&&m.dimensionMatches?"Both sides agree: the irreducible blocks account for the original dimension.":"The dimension equality alone does not establish validity; multiplicities must also be nonnegative integers."}</p><p>${state.preset==='quadratic'?"The six basis functions are x², y², z², xy, xz and yz. A₁ occurs twice, accommodating x²+y² and z² separately.":state.preset==='vertices'?"The corners are (1,1), (−1,1), (−1,−1), (1,−1). Count fixed vertices for the trace: σᵥ fixes none, while each σᵈ fixes two. The character is (4,0,0,0,2).":state.preset==='product'?"Tensor-product characters multiply entry by entry: (3,1,−1,1,1)²=(9,1,1,1,1). Its dimension is 3×3=9.":"The 3D polar vector splits into A₁ on z and E on (x,y). The next lesson constructs these subspaces by projecting seeds."}</p>`));
    choose('pgl-reduce-preset','preset',String,()=>{const preset=reductionPresets.find(p=>p.id===state.preset);if(preset)state.characters=preset.characters.slice();});
    for(let i=0;i<5;i++)on('pgl-character-'+i,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.characters[i]=x;state.preset='custom';draw();}});
  }

  function projection() {
    state.family??='vector';state.irrep??='A1';state.seed??=0;const m=projectionModel(state.family,state.irrep,state.seed),family=m.family;
    const combination=v=>v.map((x,i)=>Math.abs(x)>1e-9?(x===1?'':num(x)+'·')+family.basis[i]:null).filter(Boolean).join(' + ')||'0';
    root.innerHTML=shell("From how many blocks to what spans them","The previous lesson used characters to find multiplicities. Now apply the same C₄ᵥ operations to a seed and sum with character weights. A character projector selects the whole isotypic subspace. For the multidimensional E representation, find two independent basis vectors.",
      `<div class="pgl-controls pgl-three">${select('pgl-proj-family',"Which space are you projecting in?",projectionFamilies.map(f=>option(f.id,f.label,state.family)).join(''))}${select('pgl-proj-irrep',"Which symmetry type should be selected?",c4vIrreps.map(ir=>option(ir.id,ir.name+" (irreducible dimension  "+ir.dimension+'）',state.irrep)).join(''))}${select('pgl-proj-seed',"Which seed should you start with?",family.seeds.map((seed,i)=>option(i,seed.label,state.seed)).join(''))}</div><p>Ordered basis: (${family.basis.join(', ')}). Input f=${esc(combination(m.seed.v))}, coefficients  ${esc(vec(m.seed.v))}。</p>${state.family==='vertices'?"<p>Vertex assignments: s₁ at (1,1), s₂ at (−1,1), s₃ at (−1,−1), s₄ at (1,−1), all in xy.</p>":''}`+
      flow("1 · Apply each operation, then weight by its character",equation(`P${m.irrep.name}f = (${m.irrep.dimension}/8) Σg χ${m.irrep.name}(g)D(g)f`)+`<details><summary>Expand all eight terms to see which contributions cancel</summary>${table(['g','χ(g)','D(g)f','(d/8)χ(g)D(g)f'],m.terms.map(term=>[esc(term.label),num(term.character),esc(vec(term.image)),esc(vec(term.weighted))]),"The eight actual terms in the projection sum")}</details>${equation(`P${m.irrep.name}f = ${esc(vec(m.result))} = <strong>${esc(combination(m.result))}</strong>`)}`)+
      result(`<p><strong>${m.zero?"This seed projects to zero.":"The result is a nonzero function of  "+esc(m.irrep.name)+"  symmetry."}</strong> ${m.zero?(m.rank===0?"This action space contains no  "+esc(m.irrep.name)+"  block; changing the seed cannot produce one.":"The space contains the selected symmetry, but this seed has no component in it. Try another seed."):"Projecting it again leaves it unchanged because P²=P."}</p><p>The projected space has dimension  <strong>${m.rank}</strong>  = multiplicity  ${m.multiplicity}  × irreducible dimension  ${m.irrep.dimension}。${m.irrep.id==='E'&&m.rank?"One vector supplies only one direction. The two-dimensional E space needs two independent vectors.":m.irrep.id==='A1'&&m.multiplicity===2?"These are two copies of one-dimensional A₁, rather than one two-dimensional irreducible representation.":''}</p>`)+
      flow("2 · Try each original basis vector and retain independent nonzero images",table(["Original basis seed","Projected coefficients","Does it supply a new direction?"],m.columns.map((column,i)=>[family.basis[i],esc(vec(column)),m.independent.some(b=>b.index===i)?"Retain as an independent basis vector":norm(column)<1e-8?"Zero: this component is absent":"Linearly dependent on preceding results"]),"Use every basis vector as a seed to find a complete E basis")+`<p>${m.rank?"One possible independent basis: "+m.independent.map(b=>esc(combination(b.vector))).join('；')+'。':"There is no independent nonzero image, so this representation has multiplicity zero in the chosen space."}</p><p>Compare A₁ and E in the vector space, then A₁, B₁, B₂ and E in the quadratic space. The selectors change the actual action space or character weights, so the projected results and their independent dimensions change too.</p>`));
    choose('pgl-proj-family','family',String,()=>{state.seed=0;});choose('pgl-proj-irrep','irrep');choose('pgl-proj-seed','seed',Number);
  }

  function properties() {
    state.group??=0;state.p??=[1,2,3];state.tensor??=[[1,1,2],[1,2,3],[2,3,4]];state.operation??=1;const m=propertyModel(state.group,state.p,state.tensor);if(state.operation>=m.checks.length)state.operation=0;const c=m.checks[state.operation];
    root.innerHTML=shell("Use the matrices to constrain physical properties","A polar vector p has one spatial index and transforms as p′=Rp. A symmetric second-rank polar tensor T has two spatial indices and transforms as T′=RTRᵀ. A material is equivalent after every point-group operation, so its allowed property components must satisfy invariance under all of them.",
      `<div class="pgl-controls">${select('pgl-property-group',"Choose a real point-group operation set",propertyGroups.map((g,i)=>option(i,g.label,state.group)).join(''))}${select('pgl-property-operation',"Inspect one operation in the set",m.checks.map((item,i)=>option(i,item.label,state.operation)).join(''))}</div><div class="pgl-coefficients">${state.p.map((x,i)=>`<label>p_${['x','y','z'][i]}<input type="number" step="1" value="${esc(x)}" id="pgl-property-p-${i}"></label>`).join('')}</div><details><summary>Edit the six independent symmetric-tensor components</summary><div class="pgl-coefficients">${[[0,0],[1,1],[2,2],[0,1],[0,2],[1,2]].map(([i,j])=>`<label>T_${['x','y','z'][i]}${['x','y','z'][j]}<input type="number" step="1" value="${esc(state.tensor[i][j])}" id="pgl-property-t-${i}-${j}"></label>`).join('')}</div></details>`+
      flow("1 · Transform both objects with the same R",equation(`p=${esc(vec(m.p))}<br>T=${matrix(m.tensor)}<br>R=${matrix(c.matrix)}<br>Rp=${esc(vec(c.vectorImage))} ${c.vectorInvariant?'= p':'≠ p'}<br>RTRᵀ=${matrix(c.tensorImage)} ${c.tensorInvariant?'= T':'≠ T'}`)+`<p>This operation ${c.vectorInvariant?"keep":"change"} the current vector and ${c.tensorInvariant?"keep":"change"} the current tensor. The input is compatible with the group only if every operation preserves it.</p>`)+
      flow("2 · Check the complete group operation by operation",table(["Operation",'Rp=p？','RTRᵀ=T？'],m.checks.map(item=>[item.label,item.vectorInvariant?"equal":"Unequal",item.tensorInvariant?"equal":"Unequal"]),"The same input must satisfy every operation's invariance condition"))+
      result(`<p><strong>Form allowed by this group:</strong>${esc(m.group.constraint)}</p><p>Your input vector ${m.vectorInvariant?"satisfied":"Not satisfied"} all operations; your input tensor ${m.tensorInvariant?"satisfied":"Not satisfied"} all operations.</p>`)+
      flow("3 · Group averaging: extract the compatible part of any input",equation(`p̄=(1/|G|)Σ Rp=${esc(vec(m.vectorAverage))}<br>T̄=(1/|G|)Σ RTRᵀ=${matrix(m.tensorAverage)}`)+`<p>Substitute these averages into every operation: Rp̄=p̄ and RT̄Rᵀ=T̄. Averaging extracts the invariant part; it does not predict numerical property values in a real material.</p><p>A polar point group permits a nonzero polar vector, but does not guarantee spontaneous polarization in a sample. Inversion removes polar vectors, but does not remove all even-rank tensors. Inversion symmetry does not mean that physical properties vanish.</p>`));
    choose('pgl-property-group','group',Number,()=>{state.operation=1;});choose('pgl-property-operation','operation',Number);
    for(let i=0;i<3;i++)on('pgl-property-p-'+i,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.p[i]=x;draw();}});
    for(const [i,j] of [[0,0],[1,1],[2,2],[0,1],[0,2],[1,2]])on('pgl-property-t-'+i+'-'+j,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.tensor[i][j]=x;state.tensor[j][i]=x;draw();}});
  }
  function draw() {if(!active())return;revision++;({ 'group-basics':basics,'operations-notation':coordinates,'thirty-two':identify,representations,'character-reduction':reduction,projection,'selection-rules':properties })[lessonId]?.();}
  draw();return ()=>{alive=false;revision++;};
}
