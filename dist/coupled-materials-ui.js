import {courseFlowRoute,courseFlowActions,bindCourseFlowActions,renderCourseFlowSteps,createCourseFlowDrafts} from './course-flow.js?v=20261113-flow1';
import {multiCurveSVG,frozenStructureSVG} from './material-research-ui.js?v=20261117-derive1';
import {captureCalculation,RELEASE} from './material-notebook.js?v=20261117-derive1';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(x)?Number(x.toPrecision(6)):'—';
const options=(rows,v)=>rows.map(([id,label])=>`<option value="${esc(id)}" ${String(id)===String(v)?'selected':''}>${esc(label)}</option>`).join('');
const table=(heads,rows)=>`<div class="obs-table"><table><thead><tr>${heads.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const notes=rows=>rows?.length?`<aside class="mr-scope"><ul>${rows.map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul></aside>`:'';
const warningPanel=(rows,important)=>{const visible=(rows||[]).filter(important),generic=(rows||[]).filter(x=>!important(x));return notes(visible)+(generic.length?`<details class="cm-model-notes"><summary>模型范围与数据约定（${generic.length} 项）</summary>${notes(generic)}</details>`:'');};
const qhaStatus=value=>({'boundary-minimum':'最小值在采样边界，需补充体积点','no-convex-interior-minimum':'未找到正曲率的内点极小值','inconsistent-local-fit':'局部拟合与采样最小值不一致','interior-minimum':'已找到有效内点极小值','interior-minimum-with-warning':'已找到内点极小值，请核对警告','unavailable':'当前数据不支持求导','endpoint-not-reported':'温度端点缺少两侧数据，不报告导数','invalid-neighbor':'相邻温度无有效极小值，不计算导数','multiple-wells-not-differentiated':'存在多个自由能谷，不跨谷求导','three-point-interior':'已用相邻三个温度求导','disjoint-volume-branches':'体积分支发生跳变，不跨分支求导'}[value]||'状态待核对，详见完整计算数据');
const parseDataObject=text=>{if(typeof text!=='string'||new TextEncoder().encode(text).length>8*1024*1024)throw Error('JSON 数据包最多 8 MiB');const data=JSON.parse(text);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('JSON 数据包必须为对象');return data;};
const sources=rows=>`<div class="obs-sources">${(rows||[]).map(s=>typeof s==='string'?{title:s,url:s}:s).filter(s=>/^https:\/\//.test(s.url||'')).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title||s.url)} ↗</a>`).join('')}</div>`;
const palette=['#247b65','#b17a31','#617caf','#a75f85'];
const distortionSVG=(structure,yaw=-35)=>frozenStructureSVG(structure,yaw).replace('平衡位置','母相分数位置在重构晶胞中的参考位置');
let catalogPromise,lastResult=null,handoff=null;
const loadCuQhaSource=()=>import('./cu-qha-source-ui.js?v=20261119-cu-qha1');
const cuQhaLessonHTML=()=>`<details class="notice"><summary>用官方 Cu 数据检验热膨胀</summary><p>先想一想，单个体积的声子自由能缺少哪项用于判断热膨胀的证据。然后在计算中心核对 Cu 的多体积来源，载入输入并手动比较不同温度的平衡体积。</p><div class="obs-links"><a href="#compute/qha-lab">在计算中心核对并载入 Cu 示例 →</a><a href="docs/cu-qha-example.md">Cu 多体积数据与比较说明 →</a></div></details>`;
const catalog=()=>catalogPromise??=fetch('data/coupled-materials.json?v='+RELEASE).then(r=>{if(!r.ok)throw Error('畸变与激发课程未能载入');return r.json();}).catch(e=>{catalogPromise=null;throw e;});
export const getCoupledMaterialsResult=()=>lastResult;
export function setCoupledMaterialsInput(module,input){const copy=structuredClone(input);if(module==='distortion'&&(copy.parent||copy.distorted||copy.preset==='custom')){copy.content=typeof copy.content==='string'&&copy.content.trim()?copy.content:JSON.stringify(copy);copy.preset='custom';for(const key of ['parent','distorted','modes','data','atom_mapping','image_shifts'])delete copy[key];}if(module==='qha'&&copy.data){copy.content=JSON.stringify(copy.data);delete copy.data;}handoff={module,input:copy};}
export const coupledCourseRoute=(module,query='')=>'#classroom/'+({distortion:'structure-dynamics',magnons:'spin',qha:'observables'}[module]||'structure-dynamics')+'?module='+module+(query?'&'+query:'');

export function landauSVG(landau){
 const g=landau.grid,flat=g.energy.flat(),lo=Math.min(...flat),hi=Math.max(...flat),n=g.resolution,cell=420/n;
 const coord=(q,axis)=>axis===0?110+420*(q+g.range)/(2*g.range):465-420*(q+g.range)/(2*g.range);
 return `<svg class="cm-landau" viewBox="0 0 650 540" role="img" aria-label="双序参量自由能热图，圆圈为全局极小"><title>独立约化 Landau 模型；低能深绿，高能浅黄</title>${g.energy.map((row,j)=>row.map((v,i)=>{const t=Math.pow(Math.max(0,(v-lo)/(hi-lo||1)),.35);return `<rect x="${110+i*cell}" y="${45+(n-j-1)*cell}" width="${cell+.3}" height="${cell+.3}" fill="rgb(${Math.round(35+210*t)},${Math.round(111+124*t)},${Math.round(92+92*t)})"/>`;}).join('')).join('')}<path d="M110 45V465H530" fill="none" stroke="#48614d"/>${(landau.stationaryFamilies||[]).flatMap(f=>f.samples||[]).filter(p=>Math.abs(p.q1)<=g.range&&Math.abs(p.q2)<=g.range).map(p=>`<circle cx="${coord(p.q1,0)}" cy="${coord(p.q2,1)}" r="2" fill="white"/>`).join('')}${(landau.globalMinima||[]).filter(p=>Math.abs(p.q1)<=g.range&&Math.abs(p.q2)<=g.range).map(p=>`<circle cx="${coord(p.q1,0)}" cy="${coord(p.q2,1)}" r="7" fill="none" stroke="white" stroke-width="3"/>`).join('')}<circle cx="${coord(landau.selection.q1,0)}" cy="${coord(landau.selection.q2,1)}" r="5" fill="#ab432e" stroke="white"/><text x="315" y="515" text-anchor="middle">Q₁（约化无量纲）</text><text x="25" y="28">Q₂</text><text x="100" y="485">−${num(g.range)}</text><text x="510" y="485">${num(g.range)}</text><text x="70" y="55">${num(g.range)}</text><text x="65" y="465">−${num(g.range)}</text><text x="550" y="100">低能</text><text x="550" y="130">${num(lo)}</text><text x="550" y="180">高能</text><text x="550" y="210">${num(hi)}</text></svg>`;
}
export function spinWaveSVG(animation,index=0,spin=1,yaw=-35){
 const frame=animation.frames?.[index];if(!animation.available||!frame)return `<p class="mr-scope">${esc(animation.reason||'当前模式不提供有限周期动画。')}</p>`;
 const n=animation.sites.length,a=yaw*Math.PI/180,project=(p,v)=>[65+590*p/(Math.max(1,n-1))+26*(v[0]*Math.cos(a)-v[1]*Math.sin(a))/spin,150-80*v[2]/spin+26*(v[0]*Math.sin(a)+v[1]*Math.cos(a))/spin];
 return `<svg class="cm-spins" viewBox="0 0 720 320" role="img" aria-label="所选磁振子的自旋进动，颜色区分子晶格"><title>自旋长度保持 S；横向幅度按界面输入显示，非散射强度</title><path d="M55 150H670" stroke="#a8bfb0"/>${animation.sites.map((site,i)=>{const p=project(i,[0,0,0]),q=project(i,frame.spins[i]),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1,c=site.sublattice==='B'?'#ad7443':'#267862';return `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#668477"/><path d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}m${-dx/len*10-dy/len*5} ${-dy/len*10+dx/len*5}L${q[0]} ${q[1]}l${-dx/len*10+dy/len*5} ${-dy/len*10-dx/len*5}" fill="none" stroke="${c}" stroke-width="3"/><text x="${p[0]}" y="270" text-anchor="middle">${i}</text>`;}).join('')}<text x="65" y="27">φ = ${num(frame.phase)} rad · t = ${num(frame.timePs)} ps</text><text x="65" y="305">格点 n · A 绿 / B 棕 · 有限显示窗口</text></svg>`;
}
const defaults={
 distortion:{preset:'batio3',remove_translation:true,landau:{a1:-1,b1:1,a2:-.7,b2:1,c:.5,range:1.5,resolution:61,q1:.4,q2:.2},content:''},
 magnons:{model:'fm',exchange:1,spin:1,anisotropy:1.15,field:0,samples:161,q:.25,branch:0,amplitude:.12,sites:16,frames:48},
 qha:{source:'preset',preset:'einstein-volume',pressure:0,fit_degree:3,fit_window:5,gamma:1.5,theta:400,bulk_modulus:100,v0:40,natom:2,t_min:0,t_max:1000,t_step:25,content:''}
};
export async function renderCoupledMaterialsView({container,selection={},run,cancelRun,download,onNavigate=()=>{},onLocation=()=>{},loadCuQhaSourceModule=loadCuQhaSource}){
 let disposed=false;
 container.innerHTML='<div class="obs-page mr-page cm-page"><p role="status">正在准备畸变与激发课程…</p></div>';const root=container.firstElementChild,$=s=>root.querySelector(s),current=()=>!disposed&&root.parentNode===container&&container.isConnected!==false;lastResult=null;
 let data;try{data=await catalog();}catch(e){if(current())root.innerHTML=`<p role="alert">${esc(e.message)}</p>`;return;}if(!current())return;
 const flowSteps=new Map(),flowDrafts=createCourseFlowDrafts();
 let module=data.modules.find(m=>m.id===selection.module)||data.modules[0],lesson=data.lessons.find(l=>l.id===selection.lesson&&l.module===module.id)||data.lessons.find(l=>l.module===module.id),exercise=data.exercises.find(e=>e.id===selection.exercise&&data.lessons.some(l=>l.id===e.lesson&&l.module===module.id))||data.exercises.find(e=>e.lesson===lesson.id),tab=selection.calculationOnly?'lab':selection.atlasOnly?'cases':['learn','lab','derive','cases'].includes(selection.tab)?selection.tab:'learn';
 if(selection.exercise)lesson=data.lessons.find(l=>l.id===exercise.lesson)||lesson;
 const forms=structuredClone(defaults);if(['batio3','srtio3'].includes(selection.material))forms.distortion.preset=selection.material;if(selection.material==='afm-chain')forms.magnons.model='afm';if(['batio3','srtio3'].includes(selection.preset))forms.distortion.preset=selection.preset;
 const mergeLabInput=raw=>{const next=structuredClone(raw||{}),oldLandau=forms.distortion.landau;Object.assign(forms[module.id],next);if(module.id==='distortion')forms.distortion.landau={...oldLandau,...next.landau};};
 if(module.id==='distortion'&&!selection.lesson&&!selection.exercise&&forms.distortion.preset==='srtio3'){lesson=data.lessons.find(l=>l.module==='distortion'&&l.lab?.preset==='srtio3')||lesson;exercise=data.exercises.find(e=>e.lesson===lesson.id)||exercise;}
 if(handoff?.module===module.id){mergeLabInput(handoff.input);handoff=null;tab='lab';}
 let result=null,busy=false,ticket=0,fileTicket=0,cursor=0,quantity='volume',frame=0,playing=false,animationTicket=0,progress={};try{const p=JSON.parse(localStorage.getItem('symmetry-lab.coupled-materials.progress.v1')||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))progress=p;}catch{}
 let activeJob=null,cuProof=null,disposeCuWidget=()=>{};
 const sync=()=>onNavigate({module:module.id,tab,lesson:lesson.id,exercise:exercise.id,material:materialContext()||undefined,preset:forms[module.id].preset||selection.preset});
 const stopAnimation=()=>{playing=false;animationTicket++;if($('#cm-play'))$('#cm-play').textContent='播放进动';};
 const activeForm=()=>tab==='lab'?$('#cm-form'):null;
 function syncRunControls(){const form=activeForm();if(!form)return;form.querySelector('button[type="submit"]').disabled=busy;$('#cm-cancel').hidden=!busy;}
 function cancelOwnJob(fallback=false){
   const job=activeJob;
   if(!job)return;
   activeJob=null;
   busy=false;
   if(typeof job.task?.cancel==='function')job.task.cancel();
   else if(fallback)cancelRun?.();
   if(current())syncRunControls();
 }
 const invalidate=()=>{stopAnimation();ticket++;fileTicket++;if(module.id==='qha')cancelOwnJob();result=null;lastResult=null;if($('#cm-result'))$('#cm-result').innerHTML='<p role="status">参数已改变。运行计算后更新结果和导出文件。</p>';};
 const retireCuWidget=()=>{disposeCuWidget();disposeCuWidget=()=>{};};
 const closeCuWidget=()=>{const entry=$('[data-cm-cu-qha-entry]');if(entry?.open){entry.open=false;entry.ontoggle?.();}};
 const currentCuEvidence=()=>module.id==='qha'&&cuProof&&forms.qha.source==='thermal'&&forms.qha.content===cuProof.content?cuProof.sourceEvidence:null;
 const cuReadyMessage='官方 Cu 数据已核对并载入。请检查压力与拟合参数，再手动运行。';
 const clearCuProof=()=>{cuProof=null;const status=$('#cm-cu-source-status');if(status){status.hidden=true;status.textContent='';}};
 const input=(label,id,value,extra='')=>`<label>${label}<input id="${id}" type="number" ${/\bstep\s*=/.test(extra)?'':'step="any"'} value="${esc(value)}" ${extra}></label>`;
 const materialContext=()=>module.id==='distortion'&&['batio3','srtio3'].includes(forms.distortion.preset)?forms.distortion.preset:module.id==='qha'&&tab==='lab'&&selection.material==='cu-qha'?'':selection.material||'';
 const contextQuery=(withModule=true)=>{const params=new URLSearchParams();if(withModule)params.set('module',module.id);if(materialContext())params.set('material',materialContext());const preset=forms[module.id].preset||selection.preset;if(preset)params.set('preset',preset);return params.toString();};
 const navlinks=()=>`<div class="obs-links"><a data-course-flow-learn href="${esc(courseFlowRoute(coupledCourseRoute(module.id),{module:module.id,lesson:lesson.id,exercise:exercise.id,material:materialContext(),preset:forms[module.id].preset}))}">回到本课讲解 →</a><a href="#atlas/mechanisms?${esc(contextQuery())}">畸变与激发路线 →</a><a href="#atlas/notebook">材料研究记录 →</a></div>`;
 function draw(){if(!current())return;retireCuWidget();onLocation((selection.calculationOnly?'计算中心 / ':selection.atlasOnly?'群与材料图谱 / ':'学习中心 / ')+module.title);root.innerHTML=`<header class="obs-header"><span class="obs-eyebrow">STRUCTURE → EXCITATIONS → THERMODYNAMICS</span><h2>${selection.atlasOnly?'把计算串成一份材料研究':module.title}</h2><p>${selection.atlasOnly?'从一个问题进入课程、计算和可恢复的研究记录。':esc(module.summary)}</p></header>${selection.calculationOnly||selection.atlasOnly?'':`<nav class="obs-tabs" aria-label="畸变与激发课堂">${[['learn','课程讲解'],['lab','交互实验'],['derive','分步练习'],['cases','材料路线']].map(([id,title])=>`<button type="button" data-cm-tab="${id}" class="${tab===id?'active':''}" aria-pressed="${tab===id}">${title}</button>`).join('')}</nav>`}<div id="cm-content"></div>`;root.querySelectorAll('[data-cm-tab]').forEach(b=>b.onclick=()=>{if(!current()||![...root.querySelectorAll('[data-cm-tab]')].includes(b))return;rememberLabDraft();cancelOwnJob(true);invalidate();tab=b.dataset.cmTab;draw();sync();});if(tab==='learn')learn();else if(tab==='derive')derive();else if(tab==='cases')cases();else {lab();flowDrafts.restore($('#cm-form'),module.id);}bindCourseFlowActions({root,prefix:'cm',isCurrent:current,onLearn:openLessonLearn,onLab:openLessonLab,labButtonId:'cm-to-lab'});}
 function learn(){$('#cm-content').innerHTML=`<label class="obs-chapter">选择主题<select id="cm-lesson">${options(data.lessons.filter(l=>l.module===module.id).map(l=>[l.id,l.title]),lesson.id)}</select></label><article class="obs-lesson"><h2>${esc(lesson.title)}</h2><p class="obs-lead">${esc(lesson.summary)}</p>${lesson.id==='qha-free-energy'?cuQhaLessonHTML():''}${lesson.sections.map(s=>`<section><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.formula?`<div class="obs-formula">${esc(s.formula)}</div>`:''}</section>`).join('')}<div class="obs-links"><button id="cm-to-lab" class="primary">打开对应实验 →</button><button id="cm-to-derive" class="secondary">分步推导 →</button></div>${navlinks()}${sources(data.sources.filter(s=>lesson.references.includes(s.id)))}</article>`;$('#cm-lesson').onchange=e=>{lesson=data.lessons.find(l=>l.id===e.target.value);exercise=data.exercises.find(e=>e.lesson===lesson.id);draw();sync();};$('#cm-to-derive').onclick=()=>{exercise=data.exercises.find(e=>e.lesson===lesson.id);tab='derive';draw();sync();};}
 function cases(){const all=[...data.cases].sort((a,b)=>(b.id===selection.material)-(a.id===selection.material));$('#cm-content').innerHTML=`<div class="obs-case-grid">${all.map(c=>`<article><span class="obs-eyebrow">${esc(c.formula)}</span><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p><p class="mr-scope">${esc(c.assumption)}</p><div class="obs-links">${c.modules.map(id=>{const m=data.modules.find(m=>m.id===id);const calculationRoute='#compute/'+m.route+(c.id==='cu-qha'?'':'?material='+encodeURIComponent(c.id));return `<a href="${coupledCourseRoute(id,'material='+encodeURIComponent(c.id))}">${esc(m.title)} · 学习 →</a><a href="${esc(calculationRoute)}">对应计算 →</a>`;}).join('')}${c.links.map(([t,url])=>`<a href="${esc(url)}">${esc(t)} →</a>`).join('')}<a href="#atlas/notebook">保存材料研究记录 →</a></div></article>`).join('')}</div>`;}
 function rememberLabDraft(){if(tab==='lab'){let draftError='';try{read();}catch(error){draftError=error?.message||'请检查当前输入';}flowDrafts.remember($('#cm-form'),module.id,draftError);}}
 function openLessonLearn(){if(!current())return;rememberLabDraft();invalidate();tab='learn';draw();sync();}
 function openLessonLab(){if(!current())return;if(!lesson.lab||typeof lesson.lab!=='object')throw Error('本课实验参数暂不可用，请返回课程目录检查。');flowDrafts.discard(module.id);clearCuProof();mergeLabInput(lesson.lab);tab='lab';invalidate();draw();sync();}
 function derive(){const exercises=data.exercises.filter(e=>data.lessons.some(l=>l.id===e.lesson&&l.module===module.id));$('#cm-content').innerHTML=`<label class="obs-chapter">选择练习<select id="cm-exercise">${options(exercises.map(e=>[e.id,(progress[e.id]?'✓ ':'')+e.title]),exercise.id)}</select></label><article class="obs-lesson"><h2>${esc(exercise.title)}</h2><p>${esc(exercise.prompt)}</p><div id="cm-steps"></div><p id="cm-progress" role="status"></p>${courseFlowActions('cm')}${navlinks()}</article>`;const exerciseSelect=$('#cm-exercise');exerciseSelect.onchange=e=>{if(!current()||$('#cm-exercise')!==exerciseSelect)return;exercise=data.exercises.find(x=>x.id===e.target.value);lesson=data.lessons.find(x=>x.id===exercise.lesson);draw();sync();};

 const stepRoot=$('#cm-steps'),exerciseId=exercise.id;
 renderCourseFlowSteps({container:stepRoot,exercise,prefix:'cm',answerAttribute:'data-cm-answer',choicesClass:'mr-choices',completedSteps:flowSteps.get(exerciseId)||0,isCurrent:()=>current()&&$('#cm-steps')===stepRoot&&exercise.id===exerciseId,onStep:count=>flowSteps.set(exerciseId,count),onComplete:()=>{progress[exerciseId]=true;try{localStorage.setItem('symmetry-lab.coupled-materials.progress.v1',JSON.stringify(progress));}catch{}$('#cm-progress').textContent='✓ 推导完成。回到实验改变参数，检验这个结论。';}});
 }

 const range=(label,id,value,min,max,step)=>`<label>${esc(label)}<input id="${esc(id)}" type="range" min="${esc(min)}" max="${esc(max)}" step="${esc(step)}" value="${esc(value)}"><output>${num(value)}</output></label>`;
 const imported=f=>`<label>导入 JSON 数据包<input id="cm-file" type="file" accept=".json"></label><button id="cm-demo" type="button" class="secondary">载入原创示例 / 格式模板</button><label>数据内容<textarea id="cm-json" rows="9" spellcheck="false">${esc(f.content)}</textarea></label>`;
 function controls(){const f=forms[module.id];
  if(module.id==='distortion')return `<label>结构与模式来源<select id="cm-preset">${options([['batio3','BaTiO₃ · 极性位移'],['srtio3','SrTiO₃ · 2×2×2 反相转动'],['custom','导入对齐结构对与模式']],f.preset)}</select></label>${f.preset==='custom'?imported(f):''}<label><input id="cm-remove-translation" type="checkbox" ${f.remove_translation?'checked':''}> 去除几何平均平移</label><label>重构幅度数组 Q（Å，可留空沿用投影）<input id="cm-amplitudes" value="${esc(f.amplitudes?JSON.stringify(f.amplitudes):'')}"></label><p class="obs-small">同胞、同原点的结构对；模式在母相笛卡尔参考系中归一化，不自动生成标准不可约表示。</p><details open><summary>独立的双序参量 Landau 模型</summary><p>这里的 Q₁、Q₂ 是约化无量纲变量，不与上面的 Å 幅度自动标定。</p>${['a1','b1','a2','b2'].map(k=>input(k,'cm-'+k,f.landau[k])).join('')}${range('模式耦合 c','cm-c',f.landau.c,-3,4,.05)}${input('绘图区间 ±Q','cm-range',f.landau.range,'min="0.1" max="10"')}${range('探针 Q₁','cm-q1',f.landau.q1,-f.landau.range,f.landau.range,.02)}${range('探针 Q₂','cm-q2',f.landau.q2,-f.landau.range,f.landau.range,.02)}</details>`;
  if(module.id==='magnons')return `<label>最近邻 XXZ 链<select id="cm-model">${options([['fm','铁磁 FM'],['afm','双子晶格反铁磁 AFM']],f.model)}</select></label>${input('交换强度 J > 0（meV）','cm-exchange',f.exchange,'min="0.001"')}${input('自旋 S（正半整数）','cm-spin',f.spin,'min="0.5" step="0.5"')}${range('交换各向异性 Δ','cm-anisotropy',f.anisotropy,1,3,.01)}${input('Zeeman 能量 h = gμB B（meV）','cm-field',f.field)}${range('选择波矢 qa/π','cm-q',f.q,f.model==='afm'?-.5:-1,f.model==='afm'?.5:1,.005)}${f.model==='afm'?`<label>模式分支<select id="cm-branch">${options([[0,'ε₋ = ω₀ − h'],[1,'ε₊ = ω₀ + h']],f.branch)}</select></label>`:''}${range('横向自旋幅度 / S','cm-amplitude',f.amplitude,0,.2,.005)}<p class="obs-small">Δ 是 XXZ 交换各向异性。h 为 meV，不是 Tesla。色散是共线参考态附近的线性自旋波；界面另行检查经典基态与局部稳定性。</p>`;
  return `<label>自由能来源<select id="cm-source">${options([['preset','体积依赖 Einstein 教学模型'],['matrix','多体积自由能矩阵 JSON'],['thermal','多体积 Phonopy thermal 数据包']],f.source)}</select></label>${f.source!=='preset'?imported(f):`${input('参考体积 V₀（Å³/输入胞）','cm-v0',f.v0,'min="1"')}${input('输入胞原子数 n','cm-natom',f.natom,'min="1" step="1"')}${input('静态体模量参数 B₀（GPa）','cm-bulk_modulus',f.bulk_modulus,'min="1" max="1000"')}${input('参考 Einstein 温度 θ（K）','cm-theta',f.theta,'min="1" max="3000"')}${range('Grüneisen 参数 γ','cm-gamma',f.gamma,-4,4,.1)}${input('起始温度（K）','cm-t_min',f.t_min,'min="0"')}${input('终止温度（K）','cm-t_max',f.t_max,'min="0"')}${input('温度步长（K）','cm-t_step',f.t_step,'min="1"')}`}${input('静水压力 p（GPa）','cm-pressure',f.pressure,'min="-100" max="1000"')}<label>局部拟合阶数<select id="cm-fit_degree">${options([[2,'二次'],[3,'三次']],f.fit_degree)}</select></label><label>拟合窗口体积点数<select id="cm-fit_window">${options([[5,5],[7,7],[9,9]],f.fit_window)}</select></label><p class="obs-small">至少 5 个体积；E、F、V 须对应相同输入计算胞。thermal 数据包以 thermalFiles 数组携带各体积 YAML 内容，格式见模板。局部多项式拟合不等同于完整状态方程。</p>`;
 }
 function read(){const f=forms[module.id],v=(id,old)=>$('#cm-'+id)?.value??old,n=(id,old)=>Number(v(id,old));
  if(module.id==='distortion'){f.preset=v('preset',f.preset);f.remove_translation=$('#cm-remove-translation')?.checked??f.remove_translation;const a=v('amplitudes',f.amplitudes?JSON.stringify(f.amplitudes):'').trim();if(a)f.amplitudes=JSON.parse(a);else delete f.amplitudes;for(const k of ['a1','b1','a2','b2','c','range','q1','q2'])f.landau[k]=n(k,f.landau[k]);}
  if(module.id==='magnons'){f.model=v('model',f.model);for(const k of ['exchange','spin','anisotropy','field','q','branch','amplitude'])f[k]=n(k,f[k]);if(f.model==='fm')f.branch=0;}
  if(module.id==='qha'){f.source=v('source',f.source);for(const k of ['v0','natom','bulk_modulus','theta','gamma','t_min','t_max','t_step','pressure','fit_degree','fit_window'])f[k]=n(k,f[k]);}
  if($('#cm-json'))f.content=$('#cm-json').value;
 }
 function payload(){
  read();
  const f=structuredClone(forms[module.id]);
  if(module.id==='distortion'&&f.preset==='custom'){
    const out={...parseDataObject(f.content),...f};delete out.content;if(!Object.hasOwn(f,'amplitudes'))delete out.amplitudes;return out;
  }
  if(module.id==='qha'&&f.source!=='preset'){
    const parsed=parseDataObject(f.content);
    f.data=Object.hasOwn(parsed,'data')?parsed.data:parsed;
    if(!f.data||Array.isArray(f.data)||typeof f.data!=='object')throw Error('QHA data 必须为对象');
    if(currentCuEvidence())return {source:f.source,pressure:f.pressure,fit_degree:f.fit_degree,fit_window:f.fit_window,data:f.data};
    delete f.content;
    return f;
  }
  for(const key of ['content','data','parent','distorted','modes','atom_mapping','image_shifts'])delete f[key];
  return f;
 }
 function lab(){
  const cuEntry=module.id==='qha'?'<details class="notice cm-cu-source-entry" data-cm-cu-qha-entry><summary>核对并载入官方 Cu 多体积示例</summary><div data-cm-cu-qha-body></div></details>':'';
  const verified=currentCuEvidence();
  const cuStatus=module.id==='qha'?`<p id="cm-cu-source-status" class="mr-scope" role="status" tabindex="-1"${verified?'':' hidden'}>${verified?esc(cuReadyMessage):''}</p>`:'';
  $('#cm-content').innerHTML=`${cuEntry}<div class="obs-lab-layout"><form class="obs-controls" id="cm-form"><fieldset><legend>实验参数</legend>${cuStatus}${controls()}<button type="submit" class="primary">运行 Python 并更新演示 →</button><button id="cm-cancel" type="button" class="secondary" hidden>取消计算</button></fieldset></form><section id="cm-result" class="mr-result cm-result"><h3>输入 → 计算 → 核对 → 保存</h3><p>计算在浏览器内完成。先运行一个教学预设，再改变参数观察结构、激发或热力学响应。</p></section></div>${navlinks()}`;
  const form=$('#cm-form');
  const formCurrent=()=>current()&&activeForm()===form;
  form.onsubmit=e=>{e.preventDefault();if(formCurrent())return calculate();};
  $('#cm-cancel').onclick=()=>{if(!formCurrent())return;cancelOwnJob(true);invalidate();$('#cm-result').innerHTML='<p role="status">已取消计算。重新运行后生成新的结果。</p>';};
  form.oninput=e=>{
    if(!formCurrent()||e.target.type==='file')return;
    if(module.id==='qha'&&['cm-json','cm-source'].includes(e.target.getAttribute('id'))){closeCuWidget();clearCuProof();}
    if(e.target.type==='range'&&e.target.nextElementSibling)e.target.nextElementSibling.textContent=e.target.value;
    invalidate();
  };
  for(const id of ['preset','model','source'])if($('#cm-'+id))$('#cm-'+id).onchange=()=>{if(!formCurrent())return;try{read();if(id==='source')clearCuProof();if(id==='preset')delete forms.distortion.amplitudes;if(id==='model'){forms.magnons.q=Math.max(forms.magnons.model==='afm'?-.5:-1,Math.min(forms.magnons.model==='afm'?.5:1,forms.magnons.q));forms.magnons.branch=0;}invalidate();draw();}catch(e){$('#cm-result').textContent=e.message;}};
  for(const id of ['q','anisotropy','amplitude','c','q1','q2','gamma'])if($('#cm-'+id))$('#cm-'+id).onchange=()=>{if(formCurrent())return calculate();};
  const context=()=>module.id+':'+(module.id==='distortion'?forms.distortion.preset:forms.qha.source);
  const accept=async getText=>{
    if(!formCurrent())return;
    closeCuWidget();invalidate();
    const request=++fileTicket,key=context(),valid=()=>formCurrent()&&request===fileTicket&&context()===key;
    try{
      const text=await getText();if(!valid())return;
      parseDataObject(text);read();clearCuProof();forms[module.id].content=text;invalidate();draw();
    }catch(e){if(valid())$('#cm-result').textContent=e.message;}
  };
  if($('#cm-file'))$('#cm-file').onchange=e=>{const file=e.target.files?.[0];if(file)accept(async()=>{if(file.size>8*1024*1024)throw Error('JSON 数据包最多 8 MiB');return file.text();});};
  if($('#cm-demo'))$('#cm-demo').onclick=()=>accept(async()=>{const name=module.id==='distortion'?'distortion-batio3.json':forms.qha.source==='thermal'?'qha-thermal-files-demo.json':'qha-multivolume-demo.json',r=await fetch('data/examples/'+name+'?v='+RELEASE);if(!r.ok)throw Error('模板未能载入');return r.text();});
  syncRunControls();
  disposeCuWidget=bindCuQhaWidget(formCurrent);
 }
 function bindCuQhaWidget(formCurrent){
  const detail=$('[data-cm-cu-qha-entry]');
  const body=detail?.querySelector('[data-cm-cu-qha-body]');
  if(!body)return ()=>{};
  let alive=true,attempt=0,pending=null,cleanup=null;
  const here=()=>alive&&formCurrent()&&$('[data-cm-cu-qha-entry]')===detail;
  const reset=()=>{attempt++;pending=null;cleanup?.();cleanup=null;};
  function loadOpen(){
    if(!here()||!detail.open||cleanup)return;
    if(pending)return pending;
    const requested=++attempt;
    const active=()=>here()&&detail.open&&attempt===requested;
    body.innerHTML='<p role="status">正在载入 Cu 数据核对界面…</p>';
    const loading=Promise.resolve().then(async()=>{
      try{
        if(!active())return;
        const module=await loadCuQhaSourceModule();
        if(!active())return;
        const child=module.bindCuQhaSource({root:body,isCurrent:active,onApply:value=>{
          if(!active()||value?.source!=='thermal'||!value.sourceEvidence)return false;
          let parsed;
          try{parsed=parseDataObject(value.content);}catch{return false;}
          const input=parsed.data??parsed;
          if(input.thermalFiles?.length!==11||input.natom!==4||input.volumes?.length!==11)return false;
          read();
          flowDrafts.discard('qha');
          Object.assign(forms.qha,{source:'thermal',content:value.content});
          cuProof={content:value.content,sourceEvidence:structuredClone(value.sourceEvidence)};
          invalidate();draw();
          $('#cm-cu-source-status')?.focus({preventScroll:true});
          return true;
        }});
        const disposeChild=typeof child==='function'?child:()=>{};
        if(active())cleanup=disposeChild;else disposeChild();
      }catch{
        if(!active())return;
        body.innerHTML='<p class="notice error" role="alert">Cu 数据核对界面暂未载入。</p><button type="button" class="secondary" data-cm-cu-qha-retry>重试载入 Cu 数据核对界面</button>';
        body.querySelector('[data-cm-cu-qha-retry]').onclick=loadOpen;
      }finally{
        if(pending===loading)pending=null;
      }
    });
    pending=loading;
    return loading;
  }
  detail.ontoggle=()=>{
    if(!here())return;
    if(detail.open)return loadOpen();
    reset();
    body.innerHTML='';
  };
  return ()=>{alive=false;detail.ontoggle=null;reset();};
 }
 async function calculate(){
  if(busy||!current()||!activeForm())return;
  const form=activeForm();
  let job;
  const ownsJob=()=>current()&&activeForm()===form&&job===activeJob&&job?.id===ticket;
  try{
    const inputValue=payload();
    const sourceEvidence=currentCuEvidence();
    job={id:++ticket,task:null};activeJob=job;busy=true;stopAnimation();lastResult=null;syncRunControls();
    $('#cm-result').innerHTML='<p role="status">Python 正在计算；首次运行需要载入计算环境…</p>';
    job.task=run(module.action,inputValue);
    const value=await job.task;
    if(!ownsJob())return;
    result=value;
    lastResult={tool:module.action,module:module.id,input:inputValue,result:value,release:RELEASE};
    if(sourceEvidence)lastResult.sourceEvidence=structuredClone(sourceEvidence);
    cursor=0;frame=0;output();
  }catch(e){
    if(ownsJob()||(!job&&current()&&activeForm()===form)){
      $('#cm-result').innerHTML=`<p role="alert">${esc(e.message)}</p>`;result=null;lastResult=null;
    }
  }finally{
    if(job&&job===activeJob){activeJob=null;busy=false;if(current())syncRunControls();}
  }
 }
 function output(){if(!result||!$('#cm-result'))return;$('#cm-result').innerHTML=(module.id==='distortion'?distortionOutput():module.id==='magnons'?magnonOutput():qhaOutput())+`<details><summary>本次计算步骤与假设</summary>${(result.steps||[]).map(s=>`<h3>${esc(s.title)}</h3><p>${esc(s.detail)}</p>${s.formula?`<div class="obs-formula">${esc(s.formula)}</div>`:''}`).join('')}${notes(result.assumptions)}</details><div class="obs-links"><button id="cm-download" class="secondary">↓ 输入与完整结果 JSON</button><a id="cm-record" href="#atlas/notebook">保存到材料研究记录 →</a><a href="docs/coupled-materials.md" target="_blank">方法与数据约定 ↗</a></div><details><summary>完整计算数据</summary><pre>${esc(JSON.stringify(result,null,2))}</pre></details>${sources(result.sources)}`;
  const record=lastResult,downloadButton=$('#cm-download'),recordLink=$('#cm-record');
  downloadButton.onclick=()=>{if(current()&&$('#cm-download')===downloadButton&&lastResult===record)download(JSON.stringify(record,null,2),module.route+'.json');};
  recordLink.onclick=()=>{if(current()&&$('#cm-record')===recordLink&&lastResult===record)captureCalculation(module.action,record.input,record.result,{route:'compute/'+module.route+'?'+contextQuery(),title:module.title,material:materialContext()});};
  if(module.id==='distortion')bindDistortion();else if(module.id==='magnons')bindMagnon();else bindQha();
 }
 function distortionOutput(){const r=result,d=r.decomposition,l=r.landau;return `<h2>从模式幅度重构结构</h2><p>${esc(r.description)}</p><div class="mr-metrics"><div>原子 / 模式数<strong>${r.parent.atoms.length} / ${d.modeCount}</strong></div><div>位移拟合残差<strong>${num(d.residualNorm)} Å</strong></div><div>模式矩阵秩<strong>${d.rank} / ${d.modeCount}</strong></div></div>${warningPanel(r.warnings,w=>/线性相关|无下界|高阶项|全局极小|非紧|退化|连续解/.test(w))}${table(['模式','投影 Q / Å','重构 Q / Å'],d.modes.map(m=>[m.label||m.id,num(m.amplitude),num(m.selectedAmplitude)]))}<div id="cm-structure">${distortionSVG(r.reconstruction)}</div>${range('旋转观察方向','cm-yaw',-35,-180,180,1)}<p>空心圆为母相分数坐标在所选重构晶格中的参考位置，实心圆为重构位置。滑块改变重构幅度，不重新定义投影所得的 Q。</p><div class="cm-amplitude-controls">${d.modes.map((m,i)=>range(m.label||m.id,'cm-mode-'+i,m.selectedAmplitude,-Math.max(1,Math.abs(m.selectedAmplitude)*2),Math.max(1,Math.abs(m.selectedAmplitude)*2),.01)).join('')}</div><div class="obs-links"><button id="cm-poscar" class="secondary">↓ 重构 POSCAR</button><button id="cm-cif" class="secondary">↓ 重构 CIF（P1）</button></div><details><summary>原子对应、应变与归一化</summary><pre>${esc(JSON.stringify({mapping:r.mapping,strain:r.strain,gram:d.gram,normalization:d.normalization,removedTranslation:r.displacement.removedTranslation},null,2))}</pre></details><h2>双序参量自由能</h2><div class="obs-formula">${esc(l.formula)}</div><p>${esc(l.boundedness.label)} · 这是独立的约化模型，系数未从上面的结构拟合。</p>${landauSVG(l)}<p>当前探针 F(${num(l.selection.q1)}, ${num(l.selection.q2)}) = ${num(l.selection.energy)}；全局最低能 ${num(l.globalMinimumEnergy)}。圆圈标出绘图区内的离散全局极小，白色点列显示连续简并极小族。</p>${table(['Q₁','Q₂','F','驻点类型'],l.stationaryPoints.map(p=>[num(p.q1),num(p.q2),num(p.energy),p.label]))}${(l.stationaryFamilies||[]).map(f=>`<p class="mr-scope">${esc(f.label)}：${esc(f.equation)}；能量 ${num(f.energy)}</p>`).join('')}`;}
 function bindDistortion(){$('#cm-yaw').oninput=e=>{$('#cm-structure').innerHTML=distortionSVG(result.reconstruction,+e.target.value);e.target.nextElementSibling.textContent=e.target.value;};for(const [id,key,name] of [['cm-poscar','poscar','POSCAR-distortion'],['cm-cif','cif','distortion.cif']])$('#'+id).onclick=()=>download(result.reconstruction.exports[key],name,'text/plain');result.decomposition.modes.forEach((m,i)=>{$('#cm-mode-'+i).oninput=e=>{e.target.nextElementSibling.textContent=e.target.value;};$('#cm-mode-'+i).onchange=e=>{if(busy)return;forms.distortion.amplitudes=result.reconstruction.amplitudes.slice();forms.distortion.amplitudes[i]=+e.target.value;$('#cm-amplitudes').value=JSON.stringify(forms.distortion.amplitudes);invalidate();calculate();};});}
 function magnonOutput(){const r=result,s=r.stability;return `<h2>${esc(r.title)}</h2><div class="obs-formula">${esc(r.hamiltonian.formula)}</div><div class="mr-metrics"><div>最低分支能量<strong>${num(s.gap)} meV</strong></div><div>局部能量稳定<strong>${s.energeticallyStable?'是':'否'}</strong></div><div>经典基态<strong>${esc(s.classicalPhase)}</strong></div></div>${warningPanel(r.warnings,w=>/不是全局经典基态|最低分支出现负值|存在零能软模/.test(w))}${multiCurveSVG(r.bands.map(b=>({label:b.label,points:b.energies.map((e,i)=>[r.path.coordinates[i],e])})),{xLabel:r.path.label,yLabel:'激发能 ε / meV',cursor:r.selection.q})}<p>${esc(r.path.convention)}</p><h3>当前模式：qa/π = ${num(r.selection.q)}，ε = ${num(r.selection.energy)} meV</h3><p>${esc(r.selection.polarization)}</p><p>子晶格横向系数：[${r.selection.sublatticeCoefficients.map(num).join(', ')}]</p><div id="cm-spins">${spinWaveSVG(r.animation,frame,r.parameters.spin)}</div>${r.animation.available?`<div class="mr-slider-row">${range('进动相位帧','cm-frame',0,0,r.animation.frames.length-1,1)}${range('观察方位','cm-spin-yaw',-35,-180,180,1)}</div><button id="cm-play" class="secondary">播放进动</button><p>播放速度便于观察，真实时间标在图中；不是按皮秒实时播放。</p>`:''}<details><summary>稳定性阈值与本征方程检验</summary><pre>${esc(JSON.stringify({stability:r.stability,dynamicMatrix:r.selection.dynamicMatrix,validation:r.validation},null,2))}</pre></details>`;}
 function bindMagnon(){if(!result.animation.available)return;let yaw=-35;const paint=()=>{if(!current()||!result||!$('#cm-spins'))return;$('#cm-spins').innerHTML=spinWaveSVG(result.animation,frame,result.parameters.spin,yaw);$('#cm-frame').value=String(frame);$('#cm-frame').nextElementSibling.textContent=String(frame);};$('#cm-frame').oninput=e=>{stopAnimation();frame=+e.target.value;paint();};$('#cm-spin-yaw').oninput=e=>{yaw=+e.target.value;e.target.nextElementSibling.textContent=e.target.value;paint();};$('#cm-play').onclick=()=>{if(playing){stopAnimation();return;}playing=true;const request=++animationTicket;$('#cm-play').textContent='暂停进动';let previous=0;const tick=time=>{if(!current()||!playing||request!==animationTicket||!result||tab!=='lab')return;if(time-previous>80){frame=(frame+1)%result.animation.frames.length;paint();previous=time;}requestAnimationFrame(tick);};requestAnimationFrame(tick);};}
 function qhaOutput(){const r=result;return `<h2>平衡体积与有限温度响应</h2><div class="mr-metrics"><div>体积 / 温度点<strong>${r.summary.volumeCount} / ${r.summary.temperatureCount}</strong></div><div>有效极小值<strong>${r.summary.validCount} / ${r.rows.length}</strong></div><div>可用温度导数<strong>${r.summary.derivativeCount}</strong></div></div><p>${esc(r.summary.method)}</p>${warningPanel(r.warnings,w=>/没有受采样区间|含拟合或热力学警告|模式比例|非零频率截止/.test(w))}<label>热力学曲线<select id="cm-quantity">${options([['volume','平衡体积 V'],['alphaVolume','体积热膨胀系数 αV'],['heatCapacity','定压热容 Cp'],['bulkModulus','等温体模量 BT'],['gibbsEnergy','Gibbs 自由能 G']],quantity)}</select></label><div id="cm-thermal-plot"></div>${range('选择温度索引','cm-temperature',0,0,r.rows.length-1,1)}<div id="cm-thermal-point"></div><h3>当前温度的自由能—体积曲线</h3><div id="cm-free-energy"></div><div id="cm-qha-fit"></div><details><summary>所有温度的有效性与警告</summary>${table(['T / K','状态','导数状态','警告'],r.rows.map(x=>[x.temperature,qhaStatus(x.status),qhaStatus(x.derivativeStatus),(x.warnings||[]).join('；')]))}</details>`;}
 function bindQha(){const units={volume:'Å³/输入胞',alphaVolume:'K⁻¹',heatCapacity:'J/(mol输入胞 K)',bulkModulus:'GPa',gibbsEnergy:'eV/输入胞'},names={volume:'V',alphaVolume:'αV',heatCapacity:'Cp',bulkModulus:'BT',gibbsEnergy:'G'};const paint=()=>{const r=result,row=r.rows[cursor];const segments=[];let segment=[];for(const x of r.rows){if(Number.isFinite(x[quantity]))segment.push([x.temperature,x[quantity]]);else if(segment.length){segments.push(segment);segment=[];}}if(segment.length)segments.push(segment);$('#cm-thermal-plot').innerHTML=multiCurveSVG(segments.map((p,i)=>({label:names[quantity]+(segments.length>1?' · 有效段 '+(i+1):''),points:p})),{xLabel:'温度 T / K',yLabel:names[quantity]+' / '+units[quantity],cursor:row.temperature,includeZero:!['volume','bulkModulus','gibbsEnergy'].includes(quantity)});$('#cm-thermal-point').innerHTML=`<h3>T = ${num(row.temperature)} K</h3>`+table(['V / Å³','BT / GPa','αV / K⁻¹','Cp / J/(mol输入胞 K)'],[[num(row.volume),num(row.bulkModulus),num(row.alphaVolume),num(row.heatCapacity)]])+`<p>状态：${esc(qhaStatus(row.status))}；导数：${esc(qhaStatus(row.derivativeStatus))}。空值表示当前数据不支持，不等于零。</p>`+notes(row.warnings);const offset=Math.min(...row.samples.map(p=>p.totalFreeEnergy));$('#cm-free-energy').innerHTML=multiCurveSVG([{label:'输入采样（连线仅引导）',points:row.samples.map(p=>[p.volume,p.totalFreeEnergy-offset])},{label:'局部拟合',points:(row.curve||[]).map(p=>[p.volume,p.freeEnergy-offset])}],{xLabel:'体积 V / Å³',yLabel:'Ftotal − 当前最小采样能 / eV',cursor:row.volume});$('#cm-qha-fit').innerHTML=`<p>绘图扣除 ${num(offset)} eV/输入胞以便观察曲率，输出仍保存原始能量。</p>${row.fit?table(['局部阶数','RMS 残差 / eV','最大残差 / eV','二/三次体积差 / Å³'],[[row.fit.degree,num(row.fit.rmsResidual),num(row.fit.maxResidual),num(row.fit.volumeDegreeDifference)]]):'<p class="mr-scope">没有可接受的内点拟合；请扩展体积范围或检查数据。</p>'}`;};$('#cm-quantity').onchange=e=>{quantity=e.target.value;paint();};$('#cm-temperature').oninput=e=>{cursor=+e.target.value;e.target.nextElementSibling.textContent=e.target.value;paint();};paint();}
 if(selection.lesson&&tab==='lab'&&!selection.calculationOnly)mergeLabInput(lesson.lab);
 draw();
 if(module.id==='qha'&&tab==='lab'&&selection.material==='cu-qha')sync();
 return ()=>{if(disposed)return;disposed=true;retireCuWidget();stopAnimation();ticket++;fileTicket++;cancelOwnJob();};
}
