// The geometry and optical frame come from the existing GaAs phonons preset.
// Positions use exact quarter units of a. Displacements use hundredths of a.
const BASIS=[[0,2,2],[2,0,2],[2,2,0]];
const SITES=[
 {symbol:'Ga',position:[0,0,0],optical:[0,0,8]},
 {symbol:'As',position:[1,1,1],optical:[0,0,-8]}
];
const ROUTES={
 axis:{label:'沿转轴 a₁ + a₂ − a₃',coefficients:[1,1,-1]},
 a3:{label:'基矢 a₃（垂直于转轴）',coefficients:[0,0,1]},
 a1:{label:'基矢 a₁',coefficients:[1,0,0]},
 a2:{label:'基矢 a₂',coefficients:[0,1,0]}
};
const FIELDS={
 rotation:'绕 z 轴整体微转动',
 shift:'沿 z 整体平移',
 optical:'胞内 Ga 与 As 相对位移'
};
const sum=(a,b)=>a.map((x,index)=>x+b[index]);
const difference=(a,b)=>a.map((x,index)=>x-b[index]);
const scaled=(vector,denominator)=>vector.map(x=>x/denominator);
const latticeShift=coefficients=>BASIS[0].map((_,axis)=>BASIS.reduce((total,column,idx)=>total+column[axis]*coefficients[idx],0));
const zero=value=>value.every(x=>x===0);
const rotationAt=([x,y])=>[y===0?0:-y,x,0];

function displacement(field,position,site){
 if(field==='rotation')return rotationAt(position);
 if(field==='shift')return [0,0,8];
 return [...site.optical];
}

export function gaasGammaPeriodicity(field,route){
 if(!Object.hasOwn(FIELDS,field)||!Object.hasOwn(ROUTES,route))return null;
 const translation=latticeShift(ROUTES[route].coefficients);
 const sites=SITES.map(site=>{
  const nextPosition=sum(site.position,translation);
  const initial=displacement(field,site.position,site),next=displacement(field,nextPosition,site);
  return {symbol:site.symbol,position:scaled(site.position,4),nextPosition:scaled(nextPosition,4),
   displacement:scaled(initial,100),nextDisplacement:scaled(next,100),delta:scaled(difference(next,initial),100)};
 });
 return {field,route,coefficients:[...ROUTES[route].coefficients],translation:scaled(translation,4),sites,
  agreesAcrossCells:sites.every(site=>zero(site.delta)),
  withinCellDelta:scaled(difference(displacement(field,SITES[1].position,SITES[1]),displacement(field,SITES[0].position,SITES[0])),100)};
}

const tuple=vector=>'('+vector.map(value=>String(value).replace('-','−')).join(', ')+')';
const choices=(items,selected)=>items.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
const fieldChoices=Object.entries(FIELDS);
const pathChoices=Object.entries(ROUTES).map(([value,route])=>[value,route.label+' · R/a = '+tuple(scaled(latticeShift(route.coefficients),4))]);

function resultExplanation(result){
 if(result.field==='rotation'){
  const expansion=tuple(result.sites[0].delta);
  const meaning=result.agreesAcrossCells
   ?'这条格矢平行于转轴，所以叉积为零。再选一条带横向分量的基矢，检验这一结果能否推广。'
   :'这条格矢带有横向分量，叉积非零。整体微转动无法在固定晶格上满足 Γ 点的位移周期条件。';
  return `<p>绕 z 微转动的转角向量为 θ = (0,0,1/25) rad。按 Δu = θ × R 计算，Δu/a 为 ${expansion}</p><p>${meaning}</p>`;
 }
 if(result.field==='shift')return '<p>整体平移把同一个位移加给每个原子。换哪条晶格平移，同种原子的位移差都为零，胞内两种原子的位移也相同。</p>';
 return '<p>光学示意采用现有 GaAs 模型 z 分量在四分之一周期处的相对位移。Ga 与 As 在胞内反向移动，同一个元素的位移却在每个原胞中重复，因此满足 Γ 点周期条件。</p>';
}
function comparisonHTML(result){
 const rows=result.sites.map(site=>`<tr><th scope="row">${site.symbol}</th><td>${tuple(site.position)}</td><td>${tuple(site.nextPosition)}</td><td>${tuple(site.displacement)}</td><td>${tuple(site.nextDisplacement)}</td><td>${tuple(site.delta)}</td></tr>`).join('');
 return `<p>本次晶格平移 R/a 为 ${tuple(result.translation)}</p>
 <div class="obs-table" tabindex="0"><table><caption>沿所选格矢比较相邻原胞中的对应位点</caption>
  <thead><tr><th scope="col">原子</th><th scope="col">起点 r/a</th><th scope="col">邻胞 (r+R)/a</th><th scope="col">起点位移 u(r)/a</th><th scope="col">邻胞位移 u(r+R)/a</th><th scope="col">位移差 Δu/a</th></tr></thead>
  <tbody>${rows}</tbody></table></div>
 <p>同一胞内 As 的位移减去 Ga 的位移，再除以 a，得到 ${tuple(result.withinCellDelta)}</p>
 ${resultExplanation(result)}`;
}

export function bindGammaPeriodicity({root,isCurrent=()=>true}){
 if(!root?.querySelector||!isCurrent())return ()=>{};
 root.innerHTML=`<p>固定 GaAs 的 fcc 晶胞后，Γ 点要求沿每条原胞基矢平移，同一基元位点的位移都要重复。这里的长度使用常规胞边长 a 为单位。</p>
 <label for="gp-field">选择位移场</label>
 <select class="form-select" id="gp-field">${choices(fieldChoices,'rotation')}</select>
 <label for="gp-route">选择从本胞到邻胞的晶格平移</label>
 <select class="form-select" id="gp-route">${choices(pathChoices,'axis')}</select>
 <p>先检查沿转轴的平移，再改用有横向分量的格矢。光学示意来自既有模型的相对位移箭头。</p>
 <label for="gp-predict">预测这两个原胞中对应位点的位移是否相同</label>
 <select class="form-select" id="gp-predict" aria-describedby="gp-status">
  <option value="">请选择</option><option value="same">两胞中的位移相同</option><option value="different">两胞中的位移不同</option>
 </select>
 <button class="secondary" type="button" id="gp-check" aria-controls="gp-result">核对预测与位移差</button>
 <p id="gp-status" role="status" aria-atomic="true"></p>
 <div id="gp-result" hidden></div>
 <p>孤立水分子可分离三种整体平移与三种整体转动。晶体 Γ 点的光学子空间只从机械位移中扣除三种声学平移。周期条件也容许重复的胞内相对位移。</p>
 <p><a href="#compute/phonons?material=gaas">用 GaAs 声子计算核对 6、3、3 个自由度 →</a></p>`;
 const field=root.querySelector('#gp-field'),route=root.querySelector('#gp-route'),guess=root.querySelector('#gp-predict');
 const check=root.querySelector('#gp-check'),status=root.querySelector('#gp-status'),output=root.querySelector('#gp-result');
 let active=true;
 const here=()=>active&&isCurrent()&&root.isConnected!==false&&root.querySelector('#gp-check')===check;
 function hide(){
  if(!here())return;
  status.textContent='';output.hidden=true;output.innerHTML='';
 }
 function changeContext(){if(here()){guess.value='';hide();}}
 field.onchange=changeContext;
 route.onchange=changeContext;
 guess.onchange=hide;
 check.onclick=()=>{
  if(!here())return;
  const observed=gaasGammaPeriodicity(field.value,route.value);
  if(!observed||!['same','different'].includes(guess.value)){
   status.textContent='请选择位移场、晶格平移，再提交预测。';
   return;
  }
  output.innerHTML=comparisonHTML(observed);
  output.hidden=false;
  status.textContent=(guess.value==='same')===observed.agreesAcrossCells
   ?'预测与这次两胞比较一致。'
   :'请比较结果中每种原子的位移差，再核对预测。';
 };
 return ()=>{active=false;};
}
