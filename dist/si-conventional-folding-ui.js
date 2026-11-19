import {siFoldingStructureRoute,siFoldingWaves as waves} from './si-folding-route.js?v=20261120-si-fold-handoff1';

// All positions are in exact eighths of the conventional lattice vectors.
// The two seed sites and the order of their F-centering copies match the pinned Si POSCAR-0.
const translations=[[0,0,0],[0,4,4],[4,0,4],[4,4,0]];
const seeds=[[7,7,7],[1,1,1]];
const basisLabels=['A','B'];
const translationsLabels=['0','t₁','t₂','t₃'];
const mod8=value=>value%8;
const fractions=values=>values.map(value=>value/8);
const add=(left,right)=>left.map((value,axis)=>value+right[axis]);
const indexOfTranslation=values=>translations.findIndex(vector=>vector.every((value,axis)=>value===values[axis]));
const position=(seed,translation)=>fractions(add(seed,translations[translation]).map(mod8));
const validIndex=index=>Number.isInteger(index)&&index>=0&&index<4;

export function siConventionalFolding(waveIndex,translationIndex){
 if(!validIndex(waveIndex)||!validIndex(translationIndex))return null;
 const wave=waves[waveIndex];
 const phases=translations.map(t=>mod8(wave.reduce((dot,value,axis)=>dot+value*t[axis],0))===0?1:-1);
 const movedIndices=translations.map(site=>indexOfTranslation(add(site,translations[translationIndex]).map(mod8)));
 const sites=seeds.flatMap((seed,basis)=>movedIndices.map((to,from)=>({
  basis:basisLabels[basis],from,to,beforePosition:position(seed,from),afterPosition:position(seed,to),
  beforeSign:phases[from],afterSign:phases[to],
 })));
 return {wave:[...wave],translation:fractions(translations[translationIndex]),phases,sites,
  translationSign:phases[translationIndex],isPrimitiveGamma:phases.every(sign=>sign===1)};
}

const asTuple=values=>`(${values.join(', ')})`;
const asSign=value=>value===1?'+':'−';
const phaseRow=phase=>phase.map(asSign).join(' ');
const translationOptions=translations.slice(1).map((value,index)=>`<option value="${index+1}">${translationsLabels[index+1]} = ${asTuple(fractions(value))}</option>`).join('');
const questionOptions=`<option value="">请选择…</option><option value="primitive">常规胞 Γ，也是原胞 Γ</option><option value="folded">常规胞 Γ，来自非零原胞波矢</option>`;

function explain(result){
 if(result.isPrimitiveGamma)return '<p>三个原胞平移的相位全是 +1。同一个基元位点在每个原胞中的位移都相同，这一行确实属于原胞 Γ。</p>';
 return '<p>这个整数波矢沿常规胞的三条基矢平移时相位都为 +1，因此折叠到常规胞 Γ。原胞还允许常规胞内的 F 格心平移。相位行包含 −1，至少一条原胞基矢会翻转位移，即使当前选中的平移恰好让位移不变。这一行属于原胞的 X 星。</p>';
}

export function bindSiConventionalFolding({root,isCurrent=()=>true}){
 if(!root||!isCurrent())return ()=>{};
 let waveIndex=0,translationIndex=1;
 root.innerHTML=`<p>Si 的立方常规胞含八个原子，分成四份两原子基元。下面使用原始 Si 结构的分数坐标。设每个基元的位移沿同一个方向，用 + 或 − 表示箭头方向，然后比较四份基元的位移。</p>
 <div class="obs-choices" role="group" aria-label="选择一个相位行">
 ${waves.map((wave,index)=>`<button type="button" class="secondary" data-si-fold-wave="${index}" aria-pressed="${index===waveIndex}">k = ${asTuple(wave)} · ${phaseRow(siConventionalFolding(index,1).phases)}</button>`).join('')}
 </div>
 <p>k 使用常规胞倒易分数坐标。相位行的四列依次对应 0、t₁、t₂、t₃。四个 k 都具有常规胞周期。</p>
 <label for="si-fold-translation">沿哪条原胞基矢平移？</label>
 <select id="si-fold-translation">${translationOptions}</select>
 <p id="si-fold-phase" class="obs-formula" role="status"></p>
 <div class="obs-table"><table><caption>同一个基元位点在平移前后的坐标与位移符号</caption><thead><tr><th scope="col">基元位点</th><th scope="col">平移前的坐标与位移</th><th scope="col">平移后的坐标与位移</th></tr></thead><tbody id="si-fold-sites"></tbody></table></div>
 <p>A 和 B 是原胞中两个 Si 基元位点。坐标超出常规胞时按周期折回。</p>
 <label for="si-fold-choice">所选相位行也属于原胞 Γ 吗？</label>
 <select id="si-fold-choice" aria-describedby="si-fold-feedback">${questionOptions}</select>
 <div class="obs-links"><button type="button" class="primary" id="si-fold-check">核对预测</button></div>
 <div id="si-fold-feedback" class="obs-feedback" role="status"></div>
 <details><summary>核对 24 个位移自由度</summary>
 <p>四个格心位置上的相位行两两正交。每行可分别乘上两原子各三个方向的位移，所以常规胞 Γ 的 24 个坐标分成四组六维。全同相的一组是原胞 Γ，另三组对应同一个 X 星的三条臂。每组六维由平移对称性和位移自由度决定，频率则要用动力学矩阵求得。</p>
 <p>先选一行，再用下面的链接打开结构转换。完成原文件核验后检查输入波矢，用现有按钮手动转换并打开表示工作台。比较 Γ 行与任一 X 行的小群阶和星臂数。</p>
 <p><a id="si-fold-structure" href="${siFoldingStructureRoute(waveIndex)}">用官方 Si 文件核对所选波矢 →</a> · <a href="docs/si-structure-example.md#si-folding-check">查看四行的波矢换基与结果</a></p>
 </details>`;

 const events=new AbortController();
 const translation=root.querySelector('#si-fold-translation');
 const phases=root.querySelector('#si-fold-phase');
 const sites=root.querySelector('#si-fold-sites');
 const choice=root.querySelector('#si-fold-choice');
 const feedback=root.querySelector('#si-fold-feedback');
 const structureLink=root.querySelector('#si-fold-structure');
 const rowButtons=root.querySelectorAll('[data-si-fold-wave]');

 function draw(){
  const result=siConventionalFolding(waveIndex,translationIndex);
  structureLink.setAttribute('href',siFoldingStructureRoute(waveIndex));
  const sign=result.translationSign===1?'+1':'−1';
  phases.textContent=`exp(2πi k·${translationsLabels[translationIndex]}) = ${sign}`;
  sites.innerHTML=result.sites.map(site=>`<tr><th scope="row">${site.basis} · ${translationsLabels[site.from]} → ${translationsLabels[site.to]}</th><td>${asTuple(site.beforePosition)} · ${asSign(site.beforeSign)}</td><td>${asTuple(site.afterPosition)} · ${asSign(site.afterSign)}</td></tr>`).join('');
 }

 function clearPrediction(){
  choice.value='';
  feedback.textContent='';
 }

 for(const button of rowButtons)button.addEventListener('click',()=>{
  const selected=Number(button.dataset.siFoldWave);
  if(!isCurrent()||selected===waveIndex)return;
  waveIndex=selected;
  for(const other of rowButtons)other.setAttribute('aria-pressed',String(other===button));
  clearPrediction();
  draw();
 },{signal:events.signal});
 translation.addEventListener('change',()=>{
  if(!isCurrent())return;
  translationIndex=Number(translation.value);
  draw();
 },{signal:events.signal});
 choice.addEventListener('change',()=>{
  if(isCurrent())feedback.textContent='';
 },{signal:events.signal});
 root.querySelector('#si-fold-check').addEventListener('click',()=>{
  if(!isCurrent())return;
  const result=siConventionalFolding(waveIndex,translationIndex);
  if(!choice.value){
   feedback.textContent='先选择一个判断。';
   choice.focus();
   return;
  }
  const correct=choice.value===(result.isPrimitiveGamma?'primitive':'folded');
  if(!correct){
   feedback.textContent='再试一次。原胞 Γ 必须在三条原胞基矢的平移下都保持同号。试着换一条基矢，或者检查相位行。';
   return;
  }
  feedback.innerHTML=explain(result);
 },{signal:events.signal});
 draw();
 return ()=>events.abort();
}
