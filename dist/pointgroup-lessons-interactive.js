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
  {id:'incomplete',label:'待检集合 {E, R}：只列出两个动作',operations:rotations.slice(0,2)},
  {id:'c4',label:'C₄：四个绕 z 轴的旋转',operations:rotations},
  {id:'square',label:'C₄ᵥ：正方形的四个旋转与四个竖直镜面',operations:d4},
  {id:'translations',label:'整数平移群：Tₖ(x,y,z)=(x+k,y,z)',infinite:true,operations:[-2,-1,0,1,2].map(k=>op('T'+(k<0?'₋'+Math.abs(k):k),E,[k,0,0]))}
];

export function operationSetModel(id='c4',indices=[1,1,2],probe=[.8,.35,.6]) {
  const set=operationSets.find(s=>s.id===id)||operationSets[1],ops=set.operations;
  const [a,b,c]=indices.map(i=>ops[Math.max(0,Math.min(ops.length-1,Number(i)||0))]);
  const product=compose(a,b),member=ops.find(x=>sameOp(x,product));
  const failures=[]; if(!set.infinite)for(const x of ops)for(const y of ops){const result=compose(x,y);if(!ops.some(z=>sameOp(z,result)))failures.push({a:x.label,b:y.label,result});}
  const inverse=ops.find(x=>sameOp(compose(x,a),op('E',E))&&sameOp(compose(a,x),op('E',E)));
  const left=compose(compose(a,b),c),right=compose(a,compose(b,c));
  const p1=action(c,probe),p2=action(b,p1),p3=action(a,p2);
  return {set,a,b,c,product,productLabel:member?.label||(set.infinite?'T'+num(product.translation[0]):'集合外的 '+(equal(product.matrix,power(C4,2))?'R²':'复合动作')),
    closure:set.infinite||failures.length===0,failures,inverseLabel:inverse?.label||(set.infinite?'T'+num(-a.translation[0]):null),
    identityLeft:compose(op('E',E),a),identityRight:compose(a,op('E',E)),left,right,associative:sameOp(left,right),probe,steps:[probe,p1,p2,p3],
    leftGrouped:action(compose(a,b),p1),rightGrouped:action(a,action(compose(b,c),probe)),order:order(a),
    groupOrder:set.infinite?Infinity:ops.length,productPoint:action(product,probe),reversePoint:action(compose(b,a),probe),originImage:action(a,[0,0,0]),originFixedByAll:!set.infinite&&ops.every(x=>equal(action(x,[0,0,0]),[0,0,0]))};
}

export const coordinateOperations = [
  op('C₄(z)：逆时针 90°',C4),op('C₂(z)：180°',power(C4,2)),op('m(xz)：关于 xz 面反射',MXZ),
  op('m(xy)：关于 xy 面反射',MXY),op('i：关于原点反演',INV),
  op('S₄：90° 旋转后关于 xy 面反射',matMul(MXY,C4)),op('4̄：90° 旋转后反演',matMul(INV,C4))
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
  {hm:'2',name:'二重旋转',generators:[power(C4,2)],clue:'唯一非平凡操作保持 z，反转 x、y；这是绕 z 的二重旋转。'},
  {hm:'m',name:'一个镜面',generators:[MXZ],clue:'镜面固定整个 xz 平面，只让 y 变号。不要把二阶操作一律叫二重旋转。'},
  {hm:'−1',name:'反演中心',generators:[INV],clue:'唯一非平凡操作让 x、y、z 全部变号，没有非零的固定方向。'},
  {hm:'222',name:'三个互相垂直的二重轴',generators:[power(C4,2),[[1,0,0],[0,-1,0],[0,0,-1]]],clue:'三个非平凡操作全是正旋转；沿 x、y、z 的二重轴构成 222。'},
  {hm:'mm2',name:'两个竖直镜面与一个二重轴',generators:[power(C4,2),MXZ],clue:'同样是四阶群，但两个非平凡操作是镜面。两镜面交于 z 轴，得到 mm2。'},
  {hm:'4',name:'只有主四重轴',generators:[C4],clue:'最高正旋转为四重，四个操作全是旋转，没有镜面或反演。'},
  {hm:'4mm',name:'四重轴与竖直镜面',generators:[C4,MXZ],clue:'四重旋转之外还有包含 z 轴的镜面。没有水平镜面，故沿 z 的箭头仍可保持不变。'},
  {hm:'4/mmm',name:'四重轴、水平与竖直镜面',generators:[C4,MXZ,MXY],clue:'在 4mm 上加入垂直 z 轴的水平镜面，闭合后也包含反演，成为 4/mmm。'}
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
  {id:'plane',label:'二维箭头：基底 (eₓ,eᵧ)',basis:['eₓ','eᵧ'],operations:[{label:'90° 旋转',matrix:sub2(C4)},{label:'180° 旋转',matrix:sub2(power(C4,2))},{label:'关于 x 轴反射',matrix:sub2(MXZ)}],seed:[2,1]},
  {id:'space',label:'三维箭头：基底 (eₓ,eᵧ,e_z)',basis:['eₓ','eᵧ','e_z'],operations:coordinateOperations.map(g=>({label:g.label,matrix:g.matrix})),seed:[2,1,3]},
  {id:'water',label:'水分子两 H 的标量振幅：基底 (s₁,s₂)',basis:['s₁','s₂'],operations:[{label:'E：两个 H 都不动',matrix:[[1,0],[0,1]]},{label:'C₂(z)：交换 H₁、H₂',matrix:[[0,1],[1,0]]},{label:'σ(xz)：H₁、H₂各自不动',matrix:[[1,0],[0,1]]},{label:'σ(yz)：交换 H₁、H₂',matrix:[[0,1],[1,0]]}],seed:[2,1]}
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
  {id:'vector',label:'三维极矢量 (x,y,z)',characters:[3,1,-1,1,1]},
  {id:'vertices',label:'正方形四角的标量振幅',characters:[4,0,0,0,2]},
  {id:'quadratic',label:'六个二次函数',characters:[6,0,2,2,2]},
  {id:'product',label:'两个三维矢量的张量积',characters:[9,1,1,1,1]}
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
  {id:'vector',label:'三维矢量空间',basis:['x','y','z'],matrices:c4vOperations.map(g=>g.matrix),seeds:[{label:'z',v:[0,0,1]},{label:'x',v:[1,0,0]},{label:'y',v:[0,1,0]},{label:'x+y+z',v:[1,1,1]}]},
  {id:'quadratic',label:'六维二次函数空间',basis:['x²','y²','z²','xy','xz','yz'],matrices:c4vOperations.map(g=>quadraticRepresentation(g.matrix)),seeds:[{label:'x²',v:[1,0,0,0,0,0]},{label:'z²',v:[0,0,1,0,0,0]},{label:'xy',v:[0,0,0,1,0,0]},{label:'xz+yz',v:[0,0,0,0,1,1]}]},
  {id:'vertices',label:'四个顶点的标量振幅空间',basis:['s₁','s₂','s₃','s₄'],matrices:c4vOperations.map(g=>permutationRepresentation(g.matrix)),seeds:[{label:'只在顶点 1 取 1',v:[1,0,0,0]},{label:'四角同号',v:[1,1,1,1]},{label:'相邻顶点异号',v:[1,-1,1,-1]}]}
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
  {hm:'4mm',label:'4mm (C₄ᵥ)：极性四方',generators:[C4,MXZ],constraint:'p=(0,0,p_z)；T=diag(a,a,c)。四重旋转把 x、y 等同，竖直镜面消去交叉分量。'},
  {hm:'4/mmm',label:'4/mmm (D₄ₕ)：中心对称四方',generators:[C4,MXZ,MXY],constraint:'p=0；T=diag(a,a,c)。水平镜面再消去 p_z；二阶张量仍可非零。'},
  {hm:'222',label:'222 (D₂)：只有三个二重轴',generators:[power(C4,2),[[1,0,0],[0,-1,0],[0,0,-1]]],constraint:'p=0；T=diag(a,b,c)。没有镜面也可以没有极性方向。'},
  {hm:'mm2',label:'mm2 (C₂ᵥ)：二重轴取 z',generators:[power(C4,2),MXZ],constraint:'p=(0,0,p_z)；T=diag(a,b,c)。没有四重轴，因此 T_xx 与 T_yy 可以不同。'},
  {hm:'−1',label:'−1 (Cᵢ)：只有反演',generators:[INV],constraint:'p=0；任意对称二阶张量都允许。反演让极矢量变号，却让二阶张量的两个负号抵消。'},
  {hm:'1',label:'1 (C₁)：只有恒等操作',generators:[],constraint:'任意 p 与任意对称 T 都允许；这个群不施加额外约束。'}
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
const matrix = (a,label='矩阵') => `<span class="pgl-matrix" role="img" aria-label="${esc(label+': '+a.map(row=>row.map(num).join(', ')).join('; '))}" style="--pgl-cols:${a[0].length}">${a.map(row=>row.map(x=>`<span>${esc(num(x))}</span>`).join('')).join('')}</span>`;
const equation = html => `<div class="pgl-equation">${html}</div>`;
const table = (heads,rows,caption) => `<div class="pgl-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<${i===0?'th scope="row"':'td'}>${x}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const flow = (title,body) => `<section class="pgl-step"><h4>${title}</h4>${body}</section>`;
const result = body => `<div class="pgl-result" role="status" aria-live="polite">${body}</div>`;
const shell = (title,intro,body) => `<section class="pgl-workshop" data-pgl-workshop><span class="pg-kicker">这一课，亲手推到结果</span><h3>${title}</h3><p>${intro}</p>${body}</section>`;

function graphic(before,after,{object='cube',caption='同一个坐标系中的操作前后'}={}) {
  const scale=Math.min(1,1.4/Math.max(1,...before.map(Math.abs),...after.map(Math.abs)));
  const project=([x,y,z])=>[160+67*scale*(x-.6*y),143+55*scale*(.35*x+.45*y-z)],point=v=>project(v).map(num).join(',');
  const origin=project([0,0,0]);
  const axes=[[1.65,0,0],[0,1.65,0],[0,0,1.65]].map((v,i)=>{const p=project(v);return `<line class="pgl-axis" x1="${origin[0]}" y1="${origin[1]}" x2="${p[0]}" y2="${p[1]}"/><text x="${p[0]+5}" y="${p[1]}">${['x','y','z'][i]}</text>`;}).join('');
  const nodes=object==='cube'?[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z]))):vertices;
  const edges=nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>a.filter((x,k)=>x!==b[k]).length===1).map(b=>`<polyline class="pgl-object" points="${point(a)} ${point(b)}"/>`)).join('');
  const marker=(p,kind,label)=>{const q=project(p);return `<line class="pgl-${kind}" x1="${origin[0]}" y1="${origin[1]}" x2="${q[0]}" y2="${q[1]}"/><circle class="pgl-${kind}" cx="${q[0]}" cy="${q[1]}" r="5"/><text class="pgl-${kind}-text" x="${q[0]+8}" y="${q[1]-6}">${label}</text>`;};
  return `<figure class="pgl-graphic"><svg viewBox="0 0 340 285" role="img" aria-label="${esc(caption+'。蓝色操作前 '+vec(before)+'；橙色操作后 '+vec(after))}">${edges}${axes}<circle cx="${origin[0]}" cy="${origin[1]}" r="3"/>${marker(before,'before','p')}${marker(after,'after','Rp')}</svg><figcaption><span class="pgl-blue">蓝：操作前 ${esc(vec(before))}</span><span class="pgl-orange">橙：操作后 ${esc(vec(after))}</span></figcaption></figure>`;
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
    const ops=m.set.operations,opSelect=['A','B','C'].map((label,i)=>select('pgl-basic-'+i,'操作 '+label+'（乘积从右往左作用）',ops.map((g,j)=>option(j,g.label,state.indices[i])).join(''))).join('');
    const failed=m.failures[0],closureText=infinite?'TₐTᵦ=Tₐ₊ᵦ，任意两个整数相加仍是整数，所以完整整数平移集合封闭。':m.closure?'逐对复合都能在表中找到。例：'+m.a.label+'·'+m.b.label+'='+m.productLabel+'。':failed.a+'·'+failed.b+' 得到集合外的动作。例如 R·R=R²，而列表只有 E 与 R，故不封闭。';
    const assoc=`同一组三个动作：A=${m.a.label}，B=${m.b.label}，C=${m.c.label}。两边都从 p=${vec(m.probe)} 出发，先 C，再 B，最后 A。`;
    root.innerHTML=shell('用四个操作集合检查“群”', '先看动作集合，再问它是否满足四条规则。R 表示绕 z 的 90° 旋转。本例的四个镜面都包含 z 轴，作为三维点群记为 C₄ᵥ；若只看正方形平面内的作用，这八个动作的抽象乘法构成二面体群 D₄。它与只含正旋转的三维点群 D₄ 具有不同的空间作用。',
      `<div class="pgl-controls">${select('pgl-basic-set','选择一个实际操作集合',operationSets.map(s=>option(s.id,s.label,state.set)).join(''))}</div><p class="pgl-set">${infinite?'完整集合是 {Tₖ | k∈ℤ}；下拉只取其中五个例子。':esc('{'+ops.map(g=>g.label).join(', ')+'}')}</p><div class="pgl-controls pgl-three">${opSelect}</div>`+
      (infinite?`<p>把无限整数点列 …,−2,−1,0,1,2,… 沿 x 轴平移整数步，整列仍与自身重合；下拉显示其中有限几个动作，不代表把群截断成五个。</p>`:`<div class="pgl-two">${graphic(m.probe,m.productPoint,{object:'square',caption:'正方形旁的探针先经 B 再经 A'})}<div><p>灰线是正方形，蓝橙箭头追踪一个外加探针。现在先做 B=${esc(m.b.label)}，再做 A=${esc(m.a.label)}。</p>${equation(`ABp=${esc(vec(m.productPoint))}<br>BAp=${esc(vec(m.reversePoint))}`)}<p>${equal(m.productPoint,m.reversePoint)?'当前两个顺序给出相同结果。':'两个顺序给出不同结果：有镜面时，复合一般不能交换。'} 结合律始终保持原顺序，见下面同一组三重作用。</p></div></div>`)+
      flow('1 · 封闭性：动作做完，结果还在集合中吗？',`<p>${esc(closureText)}</p>${equation(`${esc(m.a.label)}·${esc(m.b.label)} → <strong>${esc(m.productLabel)}</strong>`)}${!infinite?table(['A\\B',...ops.map(g=>esc(g.label))],ops.map(a=>[esc(a.label),...ops.map(b=>{const found=ops.find(g=>sameOp(g,compose(a,b)));return found?esc(found.label):'<strong class="pgl-outside">集合外</strong>';})]),'复合表：每行 A，每列 B，先 B 后 A'):''}`)+
      flow('2 · 单位元：前后放入 E，动作都不变',equation(`E·${esc(m.a.label)} = ${esc(m.a.label)}·E = ${esc(m.a.label)}`)+`<p>${esc(infinite?'平移群的 E 就是 T₀。':'E 不移动任何点；它不是“没有选择动作”，而是集合里一个确定的操作。')}</p>`)+
      flow('3 · 逆元：必须把每个点送回去',m.inverseLabel?equation(`${esc(m.inverseLabel)}·${esc(m.a.label)} = ${esc(m.a.label)}·${esc(m.inverseLabel)} = E`):`<p>当前选中的 ${esc(m.a.label)} 没有列在集合中的逆元。R 的逆元是 R³；漏掉它就无法撤销 R。</p>`)+
      flow('4 · 结合律：改变分组，不改变同一三重作用的顺序',`<p>${esc(assoc)}</p><ol class="pgl-action-path"><li>Cp=${esc(vec(m.steps[1]))}</li><li>B(Cp)=${esc(vec(m.steps[2]))}</li><li>A(B(Cp))=${esc(vec(m.steps[3]))}</li></ol>${equation(`(AB)(Cp)=${esc(vec(m.leftGrouped))}<br>A((BC)p)=${esc(vec(m.rightGrouped))}`)}<p>左边先把 A、B 合为一个动作，右边先把 B、C 合成。括号改变，A、B、C 的次序没有改变。交换 A、B 是另一个问题。</p>`)+
      result(`<p><strong>${infinite?'这是群，但不是点群。':m.closure?'这个集合在复合下构成群。':'这个集合还不是群。'}</strong> ${infinite?'群阶为无限；非零 Tₖ 重复任意有限次都回不到 E。':`集合列出 ${ops.length} 个不同动作${m.closure?'，所以群阶 |G|='+ops.length:'，但它不满足全部群条件'}。选中 A=${esc(m.a.label)} 的操作阶为 ${Number.isFinite(m.order)?m.order:'无限'}。`}</p><p>${infinite?'任意非零平移连原点也移动，因此不存在所有操作共有的不动点。':'这些动作都固定原点 (0,0,0)。共同不动点指每个动作都固定同一个点；不要求所有其他点也不动。'} ${!infinite&&m.closure?'群阶数动作，操作阶数“某个动作做几次才成为 E”，二者不能混用。':''}</p>`));
    choose('pgl-basic-set','set',String,()=>{state.indices=state.set==='translations'?[3,4,1]:state.set==='square'?[1,4,2]:[1,1,0];});
    for(let i=0;i<3;i++)on('pgl-basic-'+i,'onchange',e=>{state.indices[i]=Number(e.target.value);draw();});
  }

  function coordinates() {
    state.operation??=0;state.probe??='general';const probes={general:[1,.5,.8],axis:[0,0,1],plane:[1,.5,0]},m=coordinateModel(state.operation,probes[state.probe]);
    root.innerHTML=shell('始终追踪立方体旁的同一个探针','灰线是同一个无标记立方体；蓝点与橙点标出一个外加探针的前后位置。探针用于跟踪动作，不是立方体上的特殊标记。若把一个角永久涂色，对称群就会改变。',
      `<div class="pgl-controls">${select('pgl-coordinate-op','对整个对象施加什么操作？',coordinateOperations.map((g,i)=>option(i,g.label,state.operation)).join(''))}${select('pgl-coordinate-probe','选中探针 p',option('general','一般位置 (1,0.5,0.8)',state.probe)+option('axis','z 轴上 (0,0,1)',state.probe)+option('plane','xy 面内 (1,0.5,0)',state.probe))}</div><div class="pgl-two">${graphic(m.before,m.after)}<div>${equation(`r′=Rr<br>${matrix(m.operation.matrix)} ${esc(vec(m.before))} = ${esc(vec(m.after))}`)}${table(['坐标','操作前','操作后'],['x','y','z'].map((x,i)=>[x,num(m.before[i]),num(m.after[i])]),'同一探针的三个坐标')}</div></div>`+
      result(`<p><strong>${esc(m.operation.label)}</strong> 把 ${esc(vec(m.before))} 送到 ${esc(vec(m.after))}，原点仍为 (0,0,0)。</p><p>反演 i：三个坐标全变号，结果 ${esc(vec(m.inversion))}。C₂(z)：只反转 x、y，结果 ${esc(vec(m.rotation180))}。${equal(m.inversion,m.rotation180)?'这次探针恰在 xy 面内，两个结果重合；换到一般位置，z 分量会揭示区别。':'z 分量的不同直接说明：反演不是绕 z 轴转 180°。'}</p><p>S₄=σ(xy)C₄；4̄=iC₄。两种复合定义不同，可以在同一个探针上逐项比较。</p>`));
    choose('pgl-coordinate-op','operation',Number);choose('pgl-coordinate-probe','probe');
  }

  function identify() {
    state.n??=4;state.case??=6;state.answer??='';state.checked??=false;const r=crystalRotationModel(state.n),g=guidedGroupModel(state.case);
    root.innerHTML=shell('先知道能出现什么，再按证据分类','旋转的阶约束来自周期晶格，不来自一张需要背诵的名单。下面先检验旋转角，再用一组已经完整列出的操作辨认类型。',
      flow('1 · 为什么周期晶格只允许 1、2、3、4、6 重旋转？',`<p>在晶格原始基底里，把格点送回格点的操作由整数矩阵表示，因此迹是整数。绕一根轴转 θ 的三维正旋转又有 tr R=1+2cosθ；同一线性变换换基不改变迹。</p><div class="pgl-controls">${select('pgl-rotation-n','试一个 n 重正旋转',[1,2,3,4,5,6,8].map(n=>option(n,n+' 重',state.n)).join(''))}</div>${equation(`θ=360°/${r.n}=${num(r.angle)}°<br>tr R=1+2cosθ=${num(r.trace)}`)}<p><strong>${r.allowed?'它满足整数迹这个必要条件。':'迹不是整数，因此不能保持三维周期晶格。'}</strong> ${r.n===5?'孤立五边形分子不需要保持平移晶格，因此有五重轴并不矛盾。':'对有限阶正旋转继续列举，只有 n=1、2、3、4、6。'} 此条件筛选旋转次数；完整的 32 类还需要镜面、反演及闭合性分类。</p>`)+
      flow('2 · 识别顺序：旋转 → 镜面方向 → 反演 → 完整操作数',`<ol><li>找最高阶正旋转；不要把镜面或反演的“操作阶为 2”叫成二重旋转。</li><li>以 z 为主轴，看镜面包含 z（竖直）还是垂直 z（水平），再看垂直主轴的二重轴。</li><li>检查 −I 是否在完整集合里；有镜面不自动等于有反演。</li><li>用全部操作及群阶核对。只有部分证据时，未出现不等于不存在。</li></ol>`)+
      flow('3 · 有提示的对照：用完整证据选择名称',`<div class="pgl-controls">${select('pgl-identify-case','选择要观察的几何情形',guidedGroups.map((group,i)=>option(i,group.name,state.case)).join(''))}</div><p>此例采用固定笛卡尔坐标。先读下面的完整清单与判据，再选名称；这一组八个例子用于学习判据，完整 32 类可在图谱继续检查。</p>${table(['证据','本例'],[['全部不同操作数',g.order],['最高阶正旋转',g.maxRotation],['镜面总数',g.mirrors],['竖直镜面 / 水平镜面',g.vertical+' / '+(g.horizontal?'有':'无')],['垂直 z 的二重轴',g.perpendicularTwofold],['反演 −I',g.inversion?'有':'无']],'从操作逐项得到的识别证据')}<details><summary>展开全部 ${g.order} 个操作矩阵</summary><div class="pgl-matrix-list">${g.matrices.map((m,i)=>`<div><span>${i===0?'E':'R'+i}</span>${matrix(m)}</div>`).join('')}</div></details><p class="pgl-clue"><strong>解题线索：</strong>${esc(g.clue)}</p><div class="pgl-controls">${select('pgl-identify-answer','根据上述证据选择点群',option('','读完证据后选择',state.answer)+guidedGroups.map(group=>option(group.hm,group.hm,state.answer)).join(''))}</div><button type="button" class="secondary" id="pgl-identify-check"${state.answer?'':' disabled'}>解释我的判断</button>${state.checked?result(`<p>${state.answer===g.hm?'你的名称与完整操作吻合。':'所选 '+esc(state.answer)+' 与本例证据不吻合。'} 本例是 <strong>${esc(g.hm)}</strong>，群阶 ${g.order}。${esc(g.clue)}</p><p>下一次先说清哪一条操作证据排除了相似群，再给出名字。</p>`):''}`));
    choose('pgl-rotation-n','n',Number);choose('pgl-identify-case','case',Number,()=>{state.answer='';state.checked=false;});choose('pgl-identify-answer','answer',String,()=>{state.checked=false;});on('pgl-identify-check','onclick',()=>{state.checked=true;draw();});
  }

  function representations() {
    state.family??='plane';state.operation??=0;const family=representationFamilies.find(f=>f.id===state.family)||representationFamilies[0];state.coefficients??=family.seed.slice();
    const m=representationModel(state.family,state.operation,state.coefficients),n=family.basis.length;
    root.innerHTML=shell('矩阵不是猜出来的：每一列都是一根基向量的像','固定一套有序基底，依次操作第一、第二……根基向量。把它们的新坐标按原来的顺序排成列，就得到这个动作的表示矩阵。之后才用它作用于任意线性组合。',
      `<div class="pgl-controls">${select('pgl-rep-family','先选“什么对象在变换”',representationFamilies.map(f=>option(f.id,f.label,state.family)).join(''))}${select('pgl-rep-operation','再选可见操作',family.operations.map((g,i)=>option(i,g.label,state.operation)).join(''))}</div>`+
      (state.family==='water'?`<p>水分子放在 xz 平面，z 为 H—O—H 的角平分线。H₁在 x&gt;0 一侧，H₂在 x&lt;0 一侧。这里的 s₁、s₂ 是两处各一个标量振幅，只讨论“交换位置”；完整原子位移还要考虑 x、y、z 方向的旋转。</p><div class="pgl-water-sites"><span>H₂ · s₂</span><span>O · z↑</span><span>H₁ · s₁</span></div>`:graphic(n===2?[...m.coefficients,0]:m.coefficients,n===2?[...m.result,0]:m.result,{object:'square',caption:'箭头在选定操作前后的方向'}))+
      flow('1 · 逐根操作基向量',table(['输入基向量','操作后的坐标（矩阵的一列）'],family.basis.map((basis,i)=>[basis,esc(vec(m.columns[i]))]),'基向量的像按列排列'))+
      flow('2 · 把这些像排成矩阵',equation(`D(g)=[${family.basis.map(b=>'D(g)'+esc(b)).join('　')}]=${matrix(m.operation.matrix)}`)+`<p>第 j 列回答“第 j 根基向量被送到哪里”。不能把这些像误排成行。</p>`)+
      flow('3 · 对任意向量：按原系数相加这些列',`<div class="pgl-coefficients">${m.coefficients.map((x,i)=>`<label>${esc(family.basis[i])} 的系数<input type="number" step="0.5" min="-4" max="4" id="pgl-rep-coeff-${i}" value="${esc(x)}"></label>`).join('')}</div>${equation(`D(g)${esc(vec(m.coefficients))} = ${m.contributions.map((v,i)=>`${num(m.coefficients[i])}·${esc(vec(m.columns[i]))}`).join(' + ')} = <strong>${esc(vec(m.result))}</strong>`)}<p>改变任一系数，结果会按矩阵相应一列变化；操作矩阵由动作与基底决定，不随这次输入向量改变。</p>`)+
      flow('4 · 最后取迹，得到这项操作的特征标',equation(`χ(g)=tr D(g)=${m.diagonal.map(num).join(' + ')}=<strong>${num(m.trace)}</strong>`)+`<p>${state.family==='plane'?'90° 旋转时对角两项都是 0，所以 χ=0；这不表示整个矩阵是零。':state.family==='space'?'同一个绕 z 的旋转多保留一个 z 方向，因此三维矢量的迹比 (x,y) 子空间多 1。':`置换表示的迹数“各自留在原处”的基函数；交换两个 H 时矩阵非零，但迹为 0。它不是完整九维原子位移表示。`}</p>`)+
      `<p class="pgl-next"><a href="#classroom/foundations?module=demos&amp;experiment=characters">继续把操作对应到特征标 →</a> <a href="#classroom/foundations?module=demos&amp;experiment=water">把置换与方向变化合起来：水分子的振动 →</a></p>`);
    choose('pgl-rep-family','family',String,()=>{state.operation=0;state.coefficients=representationFamilies.find(f=>f.id===state.family).seed.slice();});choose('pgl-rep-operation','operation',Number);
    for(let i=0;i<n;i++)on('pgl-rep-coeff-'+i,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.coefficients[i]=x;draw();}});
  }

  function reduction() {
    state.preset??='vector';state.characters??=reductionPresets[0].characters.slice();const m=reductionModel(state.characters),sum=m.rows.filter(row=>row.multiplicity!==0).map(row=>(row.multiplicity===1?'':num(row.multiplicity))+row.name).join(' ⊕ ')||'零表示';
    root.innerHTML=shell('用真正的字符逐项约化，而不是只读一个答案','本课统一使用 C₄ᵥ。列顺序为 E、2C₄、C₂、2σᵥ、2σᵈ；每列写的是该类中“一个操作”的迹，类大小另列计权。下面五个输入可以直接修改。',
      `${table(['不可约表示',...c4vClasses],c4vIrreps.map(ir=>[ir.name,...ir.characters.map(num)]),'C₄ᵥ 字符表（群阶 8）')}<div class="pgl-controls">${select('pgl-reduce-preset','选择一种有明确来源的表示',reductionPresets.map(p=>option(p.id,p.label,state.preset)).join('')+option('custom','自行修改字符',state.preset))}</div><div class="pgl-character-inputs">${c4vClasses.map((name,i)=>`<label>${name}<small>类大小 ${c4vSizes[i]}</small><input id="pgl-character-${i}" type="number" step="1" value="${esc(state.characters[i])}" aria-label="${esc(name+' 的字符')}"></label>`).join('')}</div>`+
      flow('逐项算 aα=(1/8)Σ n_c χᵅ(C_c)χ(C_c)',table(['α','E 项','2C₄ 项','C₂ 项','2σᵥ 项','2σᵈ 项','相加 ÷ 8','重数 aα'],m.rows.map(row=>[row.name,...row.terms.map((term,i)=>`${c4vSizes[i]}×${num(row.characters[i])}×${num(state.characters[i])}=${num(term)}`),num(row.sum)+' ÷ 8',`<strong>${num(row.multiplicity)}</strong>`]),'类大小 × 不可约字符 × 输入字符，逐项求和'))+
      result(`<p><strong>${m.valid?'分解：Γ = '+esc(sum):'这组输入不是一个普通 C₄ᵥ 表示的字符。'}</strong></p><p>${m.valid?'所有重数都是非负整数。':'出现负重数或非整数时，应回查操作的迹与列顺序；不能把数字四舍五入当成分解。'}</p>${equation(`χ(E)=${num(state.characters[0])}<br>Σ aαdα=${m.rows.map(row=>num(row.multiplicity)+'×'+row.dimension).join(' + ')}=${num(m.dimension)}`)}<p>左边是原空间的维数；右边把各不可约块的维数乘以出现次数后相加。${m.valid&&m.dimensionMatches?'两边相等，说明这些块覆盖了原来的维数。':'维数等式本身不足以证明输入有效，还必须满足重数的非负整数条件。'}</p><p>${state.preset==='quadratic'?'六个基函数是 x²、y²、z²、xy、xz、yz；A₁ 出现两次，分别容纳 x²+y² 与 z²。':state.preset==='vertices'?'四角取 (1,1)、(−1,1)、(−1,−1)、(1,−1)。迹数留在原位的顶点：σᵥ没有固定角，σᵈ各固定两角，得到 (4,0,0,0,2)。':state.preset==='product'?'张量积的字符逐项相乘：(3,1,−1,1,1)²=(9,1,1,1,1)；它的维数为 3×3=9。':'三维极矢量分成 z 的 A₁ 与 (x,y) 的 E。下一课会从种子真正构造这些子空间。'}</p>`));
    choose('pgl-reduce-preset','preset',String,()=>{const preset=reductionPresets.find(p=>p.id===state.preset);if(preset)state.characters=preset.characters.slice();});
    for(let i=0;i<5;i++)on('pgl-character-'+i,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.characters[i]=x;state.preset='custom';draw();}});
  }

  function projection() {
    state.family??='vector';state.irrep??='A1';state.seed??=0;const m=projectionModel(state.family,state.irrep,state.seed),family=m.family;
    const combination=v=>v.map((x,i)=>Math.abs(x)>1e-9?(x===1?'':num(x)+'·')+family.basis[i]:null).filter(Boolean).join(' + ')||'0';
    root.innerHTML=shell('从“有几个块”走到“这些块由什么构成”','上一课用字符求重数；这一课用同一套 C₄ᵥ 操作作用于种子，再加权求和。字符投影算符选出某类表示的整个等型子空间，多维 E 还需要寻找两根独立基向量。',
      `<div class="pgl-controls pgl-three">${select('pgl-proj-family','在哪个作用空间里投影？',projectionFamilies.map(f=>option(f.id,f.label,state.family)).join(''))}${select('pgl-proj-irrep','选出哪种对称性？',c4vIrreps.map(ir=>option(ir.id,ir.name+'（不可约维数 '+ir.dimension+'）',state.irrep)).join(''))}${select('pgl-proj-seed','从什么种子开始？',family.seeds.map((seed,i)=>option(i,seed.label,state.seed)).join(''))}</div><p>有序基底：(${family.basis.join(', ')})。输入 f=${esc(combination(m.seed.v))}，系数 ${esc(vec(m.seed.v))}。</p>${state.family==='vertices'?'<p>四角的对应关系：s₁在(1,1)，s₂在(−1,1)，s₃在(−1,−1)，s₄在(1,−1)，均在xy面内。</p>':''}`+
      flow('1 · 每个操作先作用，再按字符加权',equation(`P${m.irrep.name}f = (${m.irrep.dimension}/8) Σg χ${m.irrep.name}(g)D(g)f`)+`<details><summary>展开全部八项，观察哪些贡献相消</summary>${table(['g','χ(g)','D(g)f','(d/8)χ(g)D(g)f'],m.terms.map(term=>[esc(term.label),num(term.character),esc(vec(term.image)),esc(vec(term.weighted))]),'实际投影求和的八项')}</details>${equation(`P${m.irrep.name}f = ${esc(vec(m.result))} = <strong>${esc(combination(m.result))}</strong>`)}`)+
      result(`<p><strong>${m.zero?'这次种子投影为零。':'得到了 '+esc(m.irrep.name)+' 对称性的非零函数。'}</strong> ${m.zero?(m.rank===0?'这个作用空间根本没有 '+esc(m.irrep.name)+' 块；换种子也无法得到它。':'这个空间含有所选对称性，但当前种子在其中没有分量。换一根种子再试。'):'再次投影不会改变它，因为 P²=P。'}</p><p>该投影空间维数为 <strong>${m.rank}</strong> = 重数 ${m.multiplicity} × 不可约维数 ${m.irrep.dimension}。${m.irrep.id==='E'&&m.rank?'一根向量只给出一个方向；E 的二维空间需要两根独立向量。':m.irrep.id==='A1'&&m.multiplicity===2?'这里有两份一维 A₁，不是一份二维不可约表示。':''}</p>`)+
      flow('2 · 逐根尝试原基底，保留独立的非零结果',table(['原基底种子','投影后的系数','是否提供新的方向'],m.columns.map((column,i)=>[family.basis[i],esc(vec(column)),m.independent.some(b=>b.index===i)?'保留为独立基向量':norm(column)<1e-8?'零：没有此分量':'与前面结果线性相关']),'把所有基底作为种子，防止只得到一根 E 向量')+`<p>${m.rank?'可取的独立基向量：'+m.independent.map(b=>esc(combination(b.vector))).join('；')+'。':'没有独立非零结果，因此该表示在当前空间中的重数为零。'}</p><p>建议对照：三维矢量的 A₁ 与 E；六维二次函数的 A₁、B₁、B₂、E。下拉改变的是实际操作空间或权重，结果与独立维数都会随之改变。</p>`));
    choose('pgl-proj-family','family',String,()=>{state.seed=0;});choose('pgl-proj-irrep','irrep');choose('pgl-proj-seed','seed',Number);
  }

  function properties() {
    state.group??=0;state.p??=[1,2,3];state.tensor??=[[1,1,2],[1,2,3],[2,3,4]];state.operation??=1;const m=propertyModel(state.group,state.p,state.tensor);if(state.operation>=m.checks.length)state.operation=0;const c=m.checks[state.operation];
    root.innerHTML=shell('把前面的矩阵变成物性约束','极矢量 p 有一个空间指标，按 p′=Rp 变换；对称二阶极张量 T 有两个空间指标，按 T′=RTRᵀ 变换。材料在群的每个操作后都等价，因此允许的物性分量必须满足全部操作的不变条件。',
      `<div class="pgl-controls">${select('pgl-property-group','选一组真实点群操作',propertyGroups.map((g,i)=>option(i,g.label,state.group)).join(''))}${select('pgl-property-operation','观察其中一项操作',m.checks.map((item,i)=>option(i,item.label,state.operation)).join(''))}</div><div class="pgl-coefficients">${state.p.map((x,i)=>`<label>p_${['x','y','z'][i]}<input type="number" step="1" value="${esc(x)}" id="pgl-property-p-${i}"></label>`).join('')}</div><details><summary>修改对称张量的六个独立分量</summary><div class="pgl-coefficients">${[[0,0],[1,1],[2,2],[0,1],[0,2],[1,2]].map(([i,j])=>`<label>T_${['x','y','z'][i]}${['x','y','z'][j]}<input type="number" step="1" value="${esc(state.tensor[i][j])}" id="pgl-property-t-${i}-${j}"></label>`).join('')}</div></details>`+
      flow('1 · 用同一个 R 分别变换矢量和张量',equation(`p=${esc(vec(m.p))}<br>T=${matrix(m.tensor)}<br>R=${matrix(c.matrix)}<br>Rp=${esc(vec(c.vectorImage))} ${c.vectorInvariant?'= p':'≠ p'}<br>RTRᵀ=${matrix(c.tensorImage)} ${c.tensorInvariant?'= T':'≠ T'}`)+`<p>这项操作${c.vectorInvariant?'保持':'改变'}当前矢量，${c.tensorInvariant?'保持':'改变'}当前张量。只有每项操作都保持，输入才与这个点群相容。</p>`)+
      flow('2 · 把完整群逐项检查',table(['操作','Rp=p？','RTRᵀ=T？'],m.checks.map(item=>[item.label,item.vectorInvariant?'相等':'不相等',item.tensorInvariant?'相等':'不相等']),'同一个输入必须通过全部操作的不变条件'))+
      result(`<p><strong>该群允许的形式：</strong>${esc(m.group.constraint)}</p><p>你的输入矢量${m.vectorInvariant?'满足':'不满足'}全部操作；输入张量${m.tensorInvariant?'满足':'不满足'}全部操作。</p>`)+
      flow('3 · 群平均：从任意输入中提取相容的部分',equation(`p̄=(1/|G|)Σ Rp=${esc(vec(m.vectorAverage))}<br>T̄=(1/|G|)Σ RTRᵀ=${matrix(m.tensorAverage)}`)+`<p>把这些平均值代回每个操作，都有 Rp̄=p̄、RT̄Rᵀ=T̄。平均是找不变部分的方法；它不预测真实材料各分量的数值。</p><p>极性点群允许某个非零极矢量，但不保证样品实际出现自发极化。反演会消掉极矢量，却不消掉所有偶阶张量；“有反演就没有物性”并不成立。</p>`));
    choose('pgl-property-group','group',Number,()=>{state.operation=1;});choose('pgl-property-operation','operation',Number);
    for(let i=0;i<3;i++)on('pgl-property-p-'+i,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.p[i]=x;draw();}});
    for(const [i,j] of [[0,0],[1,1],[2,2],[0,1],[0,2],[1,2]])on('pgl-property-t-'+i+'-'+j,'onchange',e=>{const x=Number(e.target.value);if(Number.isFinite(x)){state.tensor[i][j]=x;state.tensor[j][i]=x;draw();}});
  }
  function draw() {if(!active())return;revision++;({ 'group-basics':basics,'operations-notation':coordinates,'thirty-two':identify,representations,'character-reduction':reduction,projection,'selection-rules':properties })[lessonId]?.();}
  draw();return ()=>{alive=false;revision++;};
}
