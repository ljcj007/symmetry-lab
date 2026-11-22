import {phonopyDerivationLessonHTML,bindPhonopyDerivationHost} from './phonopy-derivation-host.js?v=20261117-derive1';
import {learningBridgeHTML,bindLearningBridge} from './learning-bridge-host.js?v=20261117-derive1';
import {scatteringReplayLessonHTML,scatteringReplayResultHTML,bindScatteringReplayHost} from './scattering-replay-host.js?v=20261117-derive1';
import {projectInputFor,projectInputStatusHTML} from './project-input.js?v=20261117-phonopy1';
import {courseFlowRoute,courseFlowActions,bindCourseFlowActions,renderCourseFlowSteps,createCourseFlowDrafts} from './course-flow.js?v=20261113-flow1';
import {captureCalculation,RELEASE} from './material-notebook.js?v=20261117-derive1';
import {esc,num,table,notes,sources,controlsHTML,readControls,resultHTML,bindResult} from './pathways-views.js?v=20261122-classroom-drafts1';
import {renderResponseProjects} from './response-projects.js?v=20261117-derive1';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const options=(rows,v)=>rows.map(([id,title])=>`<option value="${esc(id)}" ${String(id)===String(v)?'selected':''}>${esc(title)}</option>`).join('');
let catalogPromise,lastResult=null;
const catalog=()=>catalogPromise??=fetch('data/pathways-materials.json?v=20261122-classroom-drafts1').then(r=>{if(!r.ok)throw Error('位点、散射、畴壁与关联电子课程暂未载入');return r.json();}).catch(e=>{catalogPromise=null;throw e;});
export const getPathwaysResult=()=>lastResult;
export const pathwaysCourseRoute=(id,query='')=>'#classroom/'+({bandrep:'crystal',scattering:'observables',domainwall:'structure-dynamics',hubbard:'spin'}[id]||'crystal')+'?module='+id+(query?'&'+query:'');
const select=(label,key,rows,value)=>`<label>${esc(label)}<select id="pw-${key}">${options(rows,value)}</select></label>`;

export async function renderPathwaysView({container,selection={},run,cancelRun,download,onOpenProjectLab,canOpenProjectInput,onNavigate=()=>{},onLocation=()=>{},loadScatteringReplay,loadScatteringReferences,loadPhonopyDerivation,onNavigateTeaching}={}){
 container.innerHTML='<div class="obs-page qm-page response-page pathways-page"><p role="status">正在准备位点、散射、畴壁与关联电子课程…</p></div>';
 let alive=true,request=null,disposeScatteringReplay=()=>{},disposePhonopyDerivation=()=>{},observer=null;
 const root=container.firstElementChild,$=s=>root.querySelector(s),current=()=>alive&&root.parentNode===container&&container.isConnected!==false;lastResult=null;
 // A rejected or completed request cannot own the shared worker any longer.
 // Automatic edits and teardown use its scoped cancel, never a global fallback.
 const retireRequest=()=>{const owned=request;request=null;owned?.cancel?.();};
 const cleanup=()=>{if(!alive)return;disposeScatteringReplay();disposePhonopyDerivation();disposeOscillatorBridge();disposeHubbardBridge();retireRequest();alive=false;observer?.disconnect();};
 let disposeOscillatorBridge=()=>{},disposeHubbardBridge=()=>{};
 if(typeof MutationObserver==='function'){observer=new MutationObserver(()=>{if(!current())cleanup();});observer.observe(container,{childList:true,subtree:true});}
 let data;try{data=await catalog();}catch(e){if(current())root.innerHTML=`<p role="alert">${esc(e.message)}</p>`;return cleanup;}if(!current())return cleanup;
 const flowSteps=new Map(),flowDrafts=createCourseFlowDrafts();
 const oscillatorBridgeStates=new Map(),hubbardBridgeStates=new Map();
 const scatteringLessonStates=new Map();let scatteringResultStates=new Map();
 let module=data.modules.find(m=>m.id===selection.module)||data.modules[0],lesson=data.lessons.find(l=>l.id===selection.lesson&&l.module===module.id)||data.lessons.find(l=>l.module===module.id),exercise=data.exercises.find(e=>e.id===selection.exercise&&e.module===module.id)||data.exercises.find(e=>e.lesson===lesson.id),tab=selection.calculationOnly?'lab':selection.atlasOnly?'cases':['learn','lab','derive','cases','project'].includes(selection.tab)?selection.tab:'learn';
 if(selection.exercise)lesson=data.lessons.find(l=>l.id===exercise.lesson)||lesson;
 const defaults=Object.fromEntries(data.modules.map(m=>[m.id,Object.fromEntries(m.fields.map(f=>[f.key,f.default]))]));
 const forms=structuredClone(defaults),material=data.cases.find(c=>c.id===selection.material&&c.module===module.id);let preset=selection.preset||material?.preset||'';
 const applyPreset=id=>{const p=module.presets.find(p=>p.id===id);if(p){forms[module.id]={...structuredClone(defaults[module.id]),...structuredClone(p.input)};if(p.input.data)forms[module.id].content=JSON.stringify(p.input.data,null,2);preset=p.id;}};applyPreset(preset);
 const projectLoad=projectInputFor(selection,module.action,forms[module.id]);if(projectLoad.status==='loaded'){forms[module.id]=projectLoad.input;preset='';tab='lab';}
 let result=null,busy=false,ticket=0,progress={};try{const p=JSON.parse(localStorage.getItem('symmetry-lab.pathways.progress.v1')||'{}');if(object(p))progress=p;}catch{}
 const sync=()=>onNavigate({module:module.id,tab,lesson:lesson.id,exercise:exercise.id,material:selection.material,preset});
 const context=()=>new URLSearchParams({module:module.id,...(selection.material?{material:selection.material}:{}),...(preset?{preset}:{})}).toString();
 const links=()=>`<div class="obs-links"><a data-course-flow-learn href="${esc(courseFlowRoute(pathwaysCourseRoute(module.id),{module:module.id,lesson:lesson.id,exercise:exercise.id,material:selection.material,preset:preset}))}">回到本课讲解 →</a><a href="#atlas/pathways?${esc(context())}">材料与模型案例 →</a><a href="#atlas/projects?module=${module.id}">跨模块项目作业 →</a><a href="#atlas/notebook">保存材料研究记录 →</a></div>`;
 function invalidate(message='参数已改变，请运行计算以更新图形。'){ticket++;disposeScatteringReplay();disposePhonopyDerivation();retireRequest();result=null;lastResult=null;scatteringResultStates=new Map();busy=false;if($('#pw-result'))$('#pw-result').innerHTML=`<p role="status">${esc(message)}</p>`;if($('#pw-run'))$('#pw-run').disabled=false;}
 function leaveTab(){if(module.id!=='scattering'||busy){invalidate();return;}ticket++;retireRequest();}
 function readLabControls(){const values=readControls(module,root,forms[module.id]);if(module.id==='scattering'){const checked=$('#pw-includeAmplitudeReplay')?.checked===true;if(checked||Object.hasOwn(forms[module.id],'includeAmplitudeReplay'))values.includeAmplitudeReplay=checked;}return values;}
 function draw(){if(!current())return;disposeScatteringReplay();disposePhonopyDerivation();disposeOscillatorBridge();disposeHubbardBridge();onLocation((selection.calculationOnly?'计算中心 / ':selection.atlasOnly?'群与材料图谱 / ':'学习中心 / ')+module.title);root.innerHTML=`<header class="obs-header"><span class="obs-eyebrow">SITES · SCATTERING · INTERFACES · CORRELATIONS</span><h2>${selection.atlasOnly?'从局域结构走向能带、实验信号与关联态':esc(module.title)}</h2><p>${selection.atlasOnly?'真实材料背景与可验证教学模型相互连接。':esc(module.summary)}</p></header>${projectInputStatusHTML(projectLoad)}${selection.calculationOnly||selection.atlasOnly?'':`<nav class="obs-tabs" aria-label="位点、散射、畴壁与关联电子课堂">${[['learn','课程讲解'],['lab','交互实验'],['derive','分步练习'],['cases','材料案例'],['project','项目作业']].map(([id,t])=>`<button type="button" data-pw-tab="${id}" class="${tab===id?'active':''}" aria-pressed="${tab===id}">${t}</button>`).join('')}</nav>`}<div id="pw-content"></div>`;root.querySelectorAll('[data-pw-tab]').forEach(b=>b.onclick=()=>{if(!current()||![...root.querySelectorAll('[data-pw-tab]')].includes(b))return;rememberLabDraft();leaveTab();tab=b.dataset.pwTab;draw();sync();});if(tab==='learn')learn();else if(tab==='derive')derive();else if(tab==='cases')cases();else if(tab==='project')renderResponseProjects({container:$('#pw-content'),selection:{project:selection.project,projectInstance:selection.projectInstance,projectStep:selection.projectStep,module:module.id},download,onOpenLab:onOpenProjectLab,canOpenCurrent:canOpenProjectInput});else {lab();flowDrafts.restore($('#pw-form'),module.id);}bindCourseFlowActions({root,prefix:'pw',isCurrent:current,onLearn:openLessonLearn,onLab:openLessonLab,labButtonId:'pw-to-lab'});}
 function learn(){$('#pw-content').innerHTML=`${select('选择主题','lesson',data.lessons.filter(l=>l.module===module.id).map(l=>[l.id,l.title]),lesson.id)}<article class="obs-lesson"><h2>${esc(lesson.title)}</h2><p class="obs-lead">${esc(lesson.summary)}</p>${learningBridgeHTML('oscillator',lesson.id)}${learningBridgeHTML('hubbard',lesson.id)}${scatteringReplayLessonHTML(lesson.id)}${phonopyDerivationLessonHTML(lesson.id)}${['scattering-chain','scattering-phase'].includes(lesson.id)?'<aside class="obs-model-note"><p>已有真实声子数据？可在三维工具中逐原子追踪 Q 投影与相位；理想链预设不能代替导入数据。</p><a href="#compute/phonopy-scattering">打开 Phonopy 三维中子散射 →</a></aside>':''}${lesson.sections.map(s=>`<section><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.formula?`<div class="obs-formula">${esc(s.formula)}</div>`:''}</section>`).join('')}<div class="obs-links"><button id="pw-to-lab" class="primary">打开对应实验 →</button><button id="pw-to-derive" class="secondary">分步推导 →</button></div>${links()}${sources(data.sources.filter(s=>lesson.references.includes(s.id)))}</article>`;const bridgeLesson=lesson.id;disposePhonopyDerivation=bindPhonopyDerivationHost({root,lessonId:bridgeLesson,run,download,isCurrent:current,loadModule:loadPhonopyDerivation,onNavigateTeaching});disposeScatteringReplay=bindScatteringReplayHost({root,lessonId:bridgeLesson,stateStore:scatteringLessonStates,onOpenLab:openScatteringReplayLab,download,isCurrent:current,loadModule:loadScatteringReplay,loadReferences:loadScatteringReferences});disposeOscillatorBridge=bindLearningBridge({root,family:'oscillator',lessonId:bridgeLesson,isCurrent:current,stateStore:oscillatorBridgeStates,onOpenLab:openOscillatorBridgeLab});disposeHubbardBridge=bindLearningBridge({root,family:'hubbard',lessonId:bridgeLesson,isCurrent:current,stateStore:hubbardBridgeStates});$('#pw-lesson').onchange=e=>{lesson=data.lessons.find(l=>l.id===e.target.value);exercise=data.exercises.find(e=>e.lesson===lesson.id);draw();sync();};$('#pw-to-derive').onclick=()=>{exercise=data.exercises.find(e=>e.lesson===lesson.id);tab='derive';draw();sync();};}
 function cases(){$('#pw-content').innerHTML=`<div class="obs-case-grid">${data.cases.filter(c=>selection.atlasOnly||c.module===module.id).sort((a,b)=>(b.id===selection.material)-(a.id===selection.material)).map(c=>{const m=data.modules.find(m=>m.id===c.module),q=new URLSearchParams({material:c.id,preset:c.preset}).toString();return `<article><span class="obs-eyebrow">${esc(c.kind)}</span><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p>${notes([c.assumption])}<div class="obs-links"><a href="${pathwaysCourseRoute(c.module,q)}">学习与推导 →</a><a href="#compute/${m.route}?${q}">打开对应计算 →</a>${c.links.filter(([,url])=>url!=='#atlas/notebook').map(([title,url])=>`<a href="${esc(url)}">${esc(title)} →</a>`).join('')}<a href="#atlas/notebook">研究记录 →</a></div></article>`;}).join('')}</div>`;}
 function rememberLabDraft(){if(tab==='lab'){let draftError='';try{forms[module.id]=readLabControls();}catch(error){draftError=error?.message||'请检查当前输入';}flowDrafts.remember($('#pw-form'),module.id,draftError);}}
 function openOscillatorBridgeLab(request){
  if(!current()||module.id!=='scattering'||request?.action!=='dynamic_scattering_lab'||request?.module!=='scattering')return false;
  flowDrafts.discard(module.id);forms[module.id]={...structuredClone(defaults[module.id]),...structuredClone(request.input)};preset='';
  invalidate();tab='lab';draw();sync();return true;
 }
 function openScatteringReplayLab(next){
  if(!current()||module.id!=='scattering'||next?.action!=='dynamic_scattering_lab'||next?.module!=='scattering'||next.input?.includeAmplitudeReplay!==true)return false;
  if(module.fields.some(field=>!Object.hasOwn(next.input,field.key)))return false;
  flowDrafts.discard(module.id);forms[module.id]=structuredClone(next.input);preset='';
  invalidate();tab='lab';draw();sync();return true;
 }
 function openLessonLearn(){if(!current())return;rememberLabDraft();leaveTab();tab='learn';draw();sync();}
 function openLessonLab(){if(!current())return;if(!module.presets.some(p=>p.id===lesson.preset))throw Error('本课预设暂不可用，请返回课程目录检查。');flowDrafts.discard(module.id);applyPreset(lesson.preset);invalidate();tab='lab';draw();sync();}
 function derive(){const list=data.exercises.filter(e=>e.module===module.id);$('#pw-content').innerHTML=`${select('选择分步练习','exercise',list.map(e=>[e.id,(progress[e.id]?'✓ ':'')+e.title]),exercise.id)}<article class="obs-lesson"><h2>${esc(exercise.title)}</h2><p>${esc(exercise.prompt)}</p><div id="pw-steps"></div><p id="pw-progress" role="status"></p>${courseFlowActions('pw')}${links()}</article>`;const exerciseSelect=$('#pw-exercise');exerciseSelect.onchange=e=>{if(!current()||$('#pw-exercise')!==exerciseSelect)return;exercise=list.find(x=>x.id===e.target.value);lesson=data.lessons.find(l=>l.id===exercise.lesson);draw();sync();};

 const stepRoot=$('#pw-steps'),exerciseId=exercise.id;
 renderCourseFlowSteps({container:stepRoot,exercise,prefix:'pw',answerAttribute:'data-pw-answer',choicesClass:'mr-choices',completedSteps:flowSteps.get(exerciseId)||0,isCurrent:()=>current()&&$('#pw-steps')===stepRoot&&exercise.id===exerciseId,onStep:count=>flowSteps.set(exerciseId,count),onComplete:()=>{progress[exerciseId]=true;try{localStorage.setItem('symmetry-lab.pathways.progress.v1',JSON.stringify(progress));}catch{}$('#pw-progress').textContent='✓ 推导完成。请到实验中改变参数，检验这个结论。';}});
 }

 function lab(){
  $('#pw-content').innerHTML=`<div class="qm-lab"><form id="pw-form" class="obs-controls">${select('教学预设','preset',[['','自定义 / 当前参数'],...module.presets.map(p=>[p.id,p.title])],preset)}${controlsHTML(module,forms[module.id])}${module.id==='scattering'?`<label><input type="checkbox" id="pw-includeAmplitudeReplay"${forms.scattering.includeAmplitudeReplay===true?' checked':''}>附带逐原子振幅推导</label><p class="obs-small">勾选后，手动计算会同时保存本次振幅的分步数据。不会改变原有谱图或计算条件。</p>`:''}<button id="pw-run" type="submit" class="primary">计算并更新演示</button><button id="pw-cancel" type="button" class="secondary">取消计算</button><p id="pw-status" role="status">Python 在浏览器本地运行。</p></form><section id="pw-result" class="qm-results" aria-live="polite"><div class="qm-welcome"><h3>从一个预设开始</h3><p>调整参数，比较物理响应与数值校验，再把结果收录到项目作业。</p></div></section></div>${links()}`;
  const form=$('#pw-form');form.onsubmit=e=>{e.preventDefault();if(current()&&$('#pw-form')===form)calculate();};
  form.oninput=e=>{if(!current()||$('#pw-form')!==form||e.target.id==='pw-preset')return;invalidate();
   try{forms[module.id]=readLabControls();}catch{}preset='';$('#pw-preset').value='';if(e.target.id==='pw-experiment')draw();
  };
  const presetControl=$('#pw-preset'),cancelButton=$('#pw-cancel');
  presetControl.onchange=e=>{if(!current()||$('#pw-preset')!==presetControl)return;invalidate();applyPreset(e.target.value);draw();sync();};
  cancelButton.onclick=()=>{if(!current()||$('#pw-cancel')!==cancelButton)return;invalidate('计算已取消，可以修改参数后重新运行。');$('#pw-status').textContent='已取消';};
  if(result)renderResult();
 }
 async function calculate(){if(busy||!current())return;let input;
  try{input=structuredClone(readLabControls());forms[module.id]=structuredClone(input);}catch(e){$('#pw-result').textContent=e.message;return;}
  const id=++ticket;busy=true;disposeScatteringReplay();scatteringResultStates=new Map();result=null;lastResult=null;$('#pw-run').disabled=true;$('#pw-status').textContent='正在计算…';$('#pw-result').innerHTML='<p role="status">正在运行 Python 并检查数值结果…</p>';
  let owned;try{owned=run(module.action,input);request=owned;const output=await owned;if(!current()||id!==ticket||tab!=='lab')return;result=output;lastResult={module:module.id,input:structuredClone(input),result:output};
   const route=selection.calculationOnly?'compute/'+module.route+(context()?'?'+context():''):pathwaysCourseRoute(module.id).slice(1);captureCalculation(module.action,input,output,{route,title:module.title,material:selection.material||''});
   $('#pw-status').textContent='计算完成 · 可导出或收录到项目作业';renderResult();
  }catch(e){if(current()&&id===ticket){$('#pw-result').textContent=e.message;$('#pw-status').textContent='计算未完成，请检查参数';}}
  finally{if(request===owned)request=null;if(current()&&id===ticket){busy=false;if($('#pw-run'))$('#pw-run').disabled=false;}}
 }
 function renderResult(){$('#pw-result').innerHTML=`<div class="qm-result-heading"><span class="tag">浏览器 Python 结果</span><button id="pw-export" type="button" class="secondary">导出完整 JSON</button></div>${resultHTML(module.id,result)}${module.id==='scattering'?scatteringReplayResultHTML(result):''}<a href="#atlas/projects?module=${module.id}">收录计算到跨模块项目 →</a>`;bindResult(module.id,result,root);if(module.id==='scattering')disposeScatteringReplay=bindScatteringReplayHost({root,result,input:lastResult?.input,stateStore:scatteringResultStates,download,isCurrent:current,loadModule:loadScatteringReplay});const exportButton=$('#pw-export'),exportRecord=lastResult;exportButton.onclick=()=>{if(current()&&$('#pw-export')===exportButton&&lastResult===exportRecord)download?.(JSON.stringify(exportRecord,null,2),module.id+'-result.json','application/json');};}
 draw();return cleanup;
}
