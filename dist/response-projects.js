import {compareProjectConditions,renderProjectConditionFeedback} from './project-conditions.js?v=20261113-support1';
import {frontiersAssignments,frontiersEvidence} from './frontiers-projects.js?v=20261110-en1';
import {connectionsAssignments,connectionsEvidence} from './connections-projects.js?v=20261110-en1';
import {constructionAssignments,constructionEvidence} from './construction-projects.js?v=20261110-en1';
import {principlesAssignments,principlesEvidence} from './principles-projects.js?v=20261110-en1';
import {bridgesAssignments,bridgesEvidence} from './bridges-projects.js?v=20261110-en1';
import {pathwaysAssignments,pathwaysEvidence} from './pathways-projects.js?v=20261110-en1';
import {spectroscopyAssignments,spectroscopyEvidence} from './spectroscopy-projects.js?v=20261110-en1';
import {makeProject,validateProject,addRecord,saveProject,listProjects,latestCalculation,importProject,MAX_PROJECT_BYTES,RELEASE} from './material-notebook.js?v=20261114-evidence1';
import {esc,num,table,notes} from './response-views.js?v=20261110-en1';
export const assignmentTemplates=[
 {id:'geometry-hall',module:'hall',title:'从波函数几何到横向响应',question:'同一个 QWZ 模型，Chern 数、霍尔电导和横向热电系数分别回答什么问题？',rubric:['写出 Berry 联络、电荷和电流方向的约定，解释霍尔平台的符号。','比较绝缘与金属占据，不用 Chern 数直接替代部分占据积分。','报告网格比较；区分 αxy 与开路 Nernst 信号。'],steps:[
  {id:'geometry',title:'先确认绝缘体拓扑',action:'quantum_geometry_lab',route:'#compute/quantum-geometry-lab?preset=geometry-qwz-chern',requires:{model:'qwz',mass:-1,energyScale:1},prompt:'记录 Chern 数与解析能隙，说明两层网格和规范检验各自检查什么。'},
  {id:'plateau',title:'从 Chern 到零温霍尔平台',action:'hall_response_lab',route:'#compute/hall-response-lab?preset=hall-qwz-plateau',requires:{mass:-1,energyScale:1,temperature:0,chemicalPotential:0},prompt:'将 σxy/(e²/h) 与上一阶段的 Chern 数比较；解释符号，写出 σxy 的单位。'},
  {id:'metal',title:'把费米能移入能带',action:'hall_response_lab',route:'#compute/hall-response-lab?preset=hall-project-metal',requires:{mass:-1,energyScale:1,temperature:300,chemicalPotential:1.3},prompt:'比较占据加权热图和 σxy、αxy。指出为什么结果不必量子化，以及为什么 αxy 不能直接叫 Nernst 电压。'}]},
 {id:'ssh-device',module:'device',title:'从 SSH 体相到接触控制的透射',question:'一个有非平庸 Zak 相位的链，连接电极后是否一定有高透射？',rubric:['固定单位胞与终止方式，说明体相和有限器件的区别。','比较同一能量、同一长度、不同接触强度，避免同时改多个条件。','检查 η、反射与通量守恒；区分谱峰与传播通道。'],steps:[
  {id:'bulk',title:'确认 SSH 体相与胞内键约定',action:'quantum_geometry_lab',route:'#compute/quantum-geometry-lab?preset=geometry-ssh-topological',requires:{model:'ssh',t1:.6,t2:1},prompt:'记录 Zak 相位和间隙，画出胞内/胞间键顺序；说明本结果依赖的单位胞约定。'},
  {id:'weak',title:'弱接触下的有限器件',action:'device_transport_lab',route:'#compute/device-transport-lab?preset=device-ssh-weak',requires:{model:'ssh',sites:12,hopping:1,dimerRatio:.6,gate:0,barrier:0,leadHopping:1,leadOnsite:0,spinDegeneracy:1,eta:1e-7,energy:.05,contactLeft:.15,contactRight:.15},prompt:'记录选定能量的 T、LDOS 和左入射通量；标明电极带内外及谱峰位置。'},
  {id:'strong',title:'只增强接触，比较同一能量',action:'device_transport_lab',route:'#compute/device-transport-lab?preset=device-ssh-strong',requires:{model:'ssh',sites:12,hopping:1,dimerRatio:.6,gate:0,barrier:0,leadHopping:1,leadOnsite:0,spinDegeneracy:1,eta:1e-7,energy:.05,contactLeft:.8,contactRight:.8},prompt:'比较透射与共振宽度，解释为什么增强接触不保证在每个固定能量都增大 T。不要把拓扑指标等同于器件电导。'}]},
 {id:'orbital-multiplet',module:'multiplet',title:'从单电子轨道到多电子自旋',question:'晶场能级给定后，为什么还需要电子数与 Hund 相互作用才能讨论局域自旋？',rubric:['明确比较单电子基态与固定电子数多电子态时，状态空间不同。','在同一 N、U、J 下比较弱场与强场，给出占据总和和 S(S+1)。','指出 Kanamori 无 SOC 模型的适用范围，不把结果当作真实材料完整光谱。'],steps:[
  {id:'orbitals',title:'先建立单电子晶场图',action:'crystal_field_lab',route:'#compute/crystal-field-lab?preset=octahedral-d',requires:{coordination:'octahedral',splitting:1,soc:0},prompt:'记录 t₂g/e_g 的能量与简并度，说明这里没有自动指定六个电子或多电子自旋。'},
  {id:'high',title:'六电子弱晶场',action:'local_multiplet_lab',route:'#compute/local-multiplet-lab?preset=multiplet-d6-high',requires:{electrons:6,coordination:'octahedral',coulombU:4,hundJ:.6,splitting:.5},prompt:'记录基态 S、⟨S²⟩与五个轨道的平均占据，检查占据总和是否为6。'},
  {id:'low',title:'六电子强晶场',action:'local_multiplet_lab',route:'#compute/local-multiplet-lab?preset=multiplet-d6-low',requires:{electrons:6,coordination:'octahedral',coulombU:4,hundJ:.6,splitting:6},prompt:'比较弱场结果和 Δ 扫描，解释晶场与 Hund 耦合的竞争；说明成对跃迁使平均占据未必都是整数。'}]}
,...spectroscopyAssignments,...pathwaysAssignments,...bridgesAssignments,...principlesAssignments,...constructionAssignments,...connectionsAssignments,...frontiersAssignments];
const clone=x=>JSON.parse(JSON.stringify(x));
export function assignmentAcceptance(step,record,context){return compareProjectConditions(step,record,context);}
export function collectAssignmentRecord(project,template,stepId,record){validateProject(project);if(project.assignment?.id!==template.id)throw Error('项目与作业模板不匹配');const step=template.steps.find(s=>s.id===stepId);if(!step)throw Error('未知作业阶段');const accepted=assignmentAcceptance(step,record,{templateId:template.id});if(!accepted.ok)throw Error(accepted.reason);const next=addRecord(project,record);next.assignment.steps[stepId]={recordId:next.records.at(-1).id,interpretation:project.assignment.steps[stepId]?.interpretation||''};return validateProject(next);}
export function evidenceSummary(record){const r=record.result,s=r.selection||{};switch(record.action){case'quantum_geometry_lab':return `${r.topology.kind}=${num(r.topology.value)}；间隙=${num(r.topology.analyticDirectGap)}`;case'hall_response_lab':return `σxy=${num(s.sigmaInE2OverH)} e²/h；αxy=${num(s.alphaXY)} A/K；有效性=${s.defined?'已定义':'未定义'}；网格状态=${s.numericallyResolved?'两网格比较已稳定':'需要加密核验'}；σ网格差=${num(r.checks.sigmaAbsoluteDifference)} S；α网格差=${num(r.checks.alphaAbsoluteDifference)} A/K`;case'device_transport_lab':return `T=${num(s.transmission)}；G=${num(s.conductanceQuantum)} e²/h；η吸收=${num(s.regulatorAbsorption)}`;case'local_multiplet_lab':return `N=${r.parameters.electrons}；S=${r.ground.spins.join(', ')}；⟨S²⟩=${num(r.ground.S2)}`;case'crystal_field_lab':return r.groups.map(g=>`${num(g.energy)} eV (${g.degeneracy}重)`).join('；');default:return frontiersEvidence(record)||connectionsEvidence(record)||constructionEvidence(record)||principlesEvidence(record)||bridgesEvidence(record)||pathwaysEvidence(record)||spectroscopyEvidence(record)||record.title;}}
export function assignmentReport(project,template){validateProject(project);const lines=[`# ${project.title}`,'',template.question,'',`软件版本：${project.release}；导出时间：${new Date().toISOString()}`,''];for(const step of template.steps){const saved=project.assignment.steps[step.id],record=project.records.find(r=>r.id===saved?.recordId);lines.push(`## ${step.title}`,'',record?evidenceSummary(record):'尚未收录计算。','',`推导任务：${step.prompt}`,'',`解释：${saved?.interpretation||'尚未填写。'}`,'');if(record)lines.push('输入参数：','```json',JSON.stringify(record.input,null,2),'```',`计算时间：${record.created}；计算版本：${record.release}`,'');}lines.push('## 综合结论','',project.assignment.conclusion||'尚未填写。','','## 自检标准','',...template.rubric.map(x=>'- '+x),'','完整数值数组、原始输入和来源说明保存在同时导出的材料项目 JSON 中。');return lines.join('\n');}
export async function renderResponseProjects({container,selection={},download,onOpenLab,canOpenCurrent}){
 container.innerHTML='<div class="obs-page response-projects"><p>正在读取本机项目作业…</p></div>';
 const root=container.firstElementChild,$=s=>root.querySelector(s),current=()=>root.parentNode===container&&container.isConnected!==false;
 let template=assignmentTemplates.find(t=>t.id===selection.project)||assignmentTemplates.find(t=>t.module===selection.module)||assignmentTemplates[0],projects=[],project=null,busy=false,message='',version=0,pendingStepFocus='';
 try{
  projects=(await listProjects()).filter(p=>assignmentTemplates.some(t=>t.id===p.assignment?.id));
  if(selection.projectInstance){
   project=projects.find(p=>p.id===selection.projectInstance)||null;
   if(project)template=assignmentTemplates.find(t=>t.id===project.assignment.id);
   else message='指定的项目副本未找到，请选择本机已保存的作业；没有自动打开另一份副本。';
  }else project=projects.find(p=>p.assignment?.id===template.id)||null;
  if(template.steps.some(step=>step.id===selection.projectStep))pendingStepFocus=selection.projectStep;
 }catch(error){message=error.message;}
 if(!current())return;
 const matching=()=>projects.filter(p=>p.assignment?.id===template.id);
 function projectOptionLabel(item){
  const peers=matching().filter(p=>p.title===item.title);
  const shortId=id=>{let hash=2166136261;for(const c of String(id))hash=Math.imul(hash^c.codePointAt(0),16777619);return (hash>>>0).toString(36).padStart(7,'0');};
  let suffix='';if(peers.length>1){const code=shortId(item.id),same=peers.filter(p=>shortId(p.id)===code).map(p=>p.id).sort();suffix=' · 副本 '+code+(same.length>1?'-'+(same.indexOf(item.id)+1):'');}
  const saved=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(item.updated)?item.updated.slice(0,19).replace('T',' ')+' UTC':item.updated;
  return item.title+' · '+saved+suffix;
 }
 function readNotes(){
  if(!project)return;
  for(const step of template.steps){const box=$('#pj-note-'+step.id);if(box){const previous=project.assignment.steps[step.id]||{recordId:''};project.assignment.steps[step.id]={...previous,interpretation:box.value.slice(0,8000)};}}
  if($('#pj-conclusion'))project.assignment.conclusion=$('#pj-conclusion').value.slice(0,12000);
  const title=$('#pj-title')?.value;
  if(typeof title!=='string'||!title.trim())throw Error('请为这份项目副本填写非空名称。');
  if(title.length>160)throw Error('项目副本名称最多160个字符。');
  project.title=title.trim();
 }
 async function save(){if(!project)return;readNotes();project.updated=new Date().toISOString();await saveProject(project);projects=(await listProjects()).filter(p=>assignmentTemplates.some(t=>t.id===p.assignment?.id));}
 async function perform(fn,guard=current){
  if(busy||!guard()||!current())return;busy=true;root.querySelectorAll('button,select,textarea,input').forEach(element=>element.disabled=true);
  try{await fn();}catch(error){message=error.message;}finally{busy=false;if(current())draw();}
 }
 function canAdjust(step,record){if(!project||typeof onOpenLab!=='function'||typeof canOpenCurrent!=='function'||record?.action!==step.action)return false;try{return canOpenCurrent(record.action,record.input)===true;}catch{return false;}}
 function normalActivation(event){return !event||!(event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey);}
 function draw(){
  if(!current())return;const view=++version,active=()=>current()&&view===version;
  const recent=latestCalculation(),done=template.steps.filter(step=>{const saved=project?.assignment.steps[step.id];return saved?.recordId&&saved.interpretation?.trim();}).length;
  root.innerHTML=`<header class="obs-header"><span class="obs-eyebrow">QUESTION · EVIDENCE · EXPLANATION</span><h2>跨模块项目作业</h2><p>先在工具中完成计算，再返回收录原始结果与解释。项目保存在此浏览器，可从“材料研究记录”继续查看和重算。</p></header><label>选择研究问题<select id="pj-template">${assignmentTemplates.map(t=>`<option value="${t.id}" ${t.id===template.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></label><article class="obs-lesson"><h2>${esc(template.title)}</h2><p>${esc(template.question)}</p><div class="obs-links"><button class="primary" id="pj-new">新建这份项目作业</button><label class="secondary">导入项目副本<input id="pj-import" type="file" accept=".json"></label><a href="#atlas/notebook">材料研究记录 →</a>${recent?'<button class="secondary" id="pj-keep-exploration">保留当前探索记录</button>':''}</div>${matching().length?`<label>本机已保存的作业<select id="pj-project">${!project?'<option value="" selected>选择一份本机作业</option>':''}${matching().map(p=>`<option value="${esc(p.id)}" ${p.id===project?.id?'selected':''}>${esc(projectOptionLabel(p))}</option>`).join('')}</select></label>`:''}${project?`<label for="pj-title">这份项目副本的名称<input id="pj-title" type="text" maxlength="160" required value="${esc(project.title)}"></label><p class="obs-small">为不同副本取一个便于辨认的名称；研究问题与阶段要求保持不变。</p>`:''}<p id="pj-status" role="status">${esc(message||'完整 JSON 含所有数值结果；报告包含参数、结果摘要和推导笔记。')}</p>${project?`<p><strong>${done} / ${template.steps.length} 阶段已具备计算与解释</strong> · 该计数不代表解释已被自动判为正确。</p>`:'<p>新建项目后可以收录计算。已有工具和作业互相独立，不会覆盖旧记录。</p>'}${template.steps.map((step,index)=>{
   const saved=project?.assignment.steps[step.id],record=project?.records.find(r=>r.id===saved?.recordId),accept=assignmentAcceptance(step,recent,{templateId:template.id}),adjust=canAdjust(step,recent);
   return `<section class="rp-project-step" id="pj-stage-${esc(step.id)}" data-pj-stage="${esc(step.id)}" tabindex="-1"${pendingStepFocus===step.id?' aria-current="step"':''}><h3>${index+1}. ${esc(step.title)}</h3><p>${esc(step.prompt)}</p><div class="obs-links"><a data-pj-open="${esc(step.id)}" aria-label="${esc(step.title)} · 载入本阶段条件" href="${esc(step.route)}">载入本阶段条件 →</a>${adjust?`<button type="button" class="secondary" data-pj-current="${esc(step.id)}" aria-label="${esc(step.title)} · 回到当前计算调整">回到当前计算调整 →</button>`:''}</div>${record?`<div class="rp-evidence"><strong>已收录</strong><p>${esc(evidenceSummary(record))}</p><small>${esc(record.created)} · ${esc(record.release)}</small><details><summary>保存的原始输入</summary><pre>${esc(JSON.stringify(record.input,null,2))}</pre></details></div>`:'<p>尚未收录结果。</p>'}${project?`<button class="secondary" data-pj-collect="${step.id}" ${accept.ok?'':'disabled'}>${record?'收录新计算（保留旧记录）':'收录最近一次计算'}</button>${renderProjectConditionFeedback(step,accept)}<label>本阶段的推导与解释<textarea id="pj-note-${step.id}" rows="4" maxlength="8000" placeholder="结合本次参数、数值与诊断写下解释。">${esc(saved?.interpretation||'')}</textarea></label>`:''}</section>`;
  }).join('')}<h3>提交前自检</h3>${notes(template.rubric)}${project?`<label>综合结论<textarea id="pj-conclusion" rows="5" maxlength="12000">${esc(project.assignment.conclusion)}</textarea></label><div class="obs-links"><button id="pj-save" class="primary">保存全部笔记</button><button id="pj-json" class="secondary">导出完整项目 JSON</button><button id="pj-report" class="secondary">导出研究报告 Markdown</button></div>`:''}</article>`;
  $('#pj-template').onchange=event=>{if(!active())return;const id=event.target.value;return perform(async()=>{await save();template=assignmentTemplates.find(t=>t.id===id);project=projects.find(p=>p.assignment?.id===id)||null;message='';},active);};
  $('#pj-new').onclick=()=>perform(async()=>{await save();project=makeProject({title:template.title,material:'教学项目 · '+template.id});project.assignment={id:template.id,steps:{},conclusion:''};await saveProject(project);projects=(await listProjects()).filter(p=>assignmentTemplates.some(t=>t.id===p.assignment?.id));message='已建立独立项目，完成每次计算后返回收录。';},active);
  if($('#pj-project'))$('#pj-project').onchange=event=>{if(!active())return;const id=event.target.value;return perform(async()=>{await save();project=projects.find(p=>p.id===id);message='已打开保存的作业。';},active);};
  $('#pj-import').onchange=event=>{if(!active())return;const file=event.target.files?.[0];return perform(async()=>{if(!file)return;if(file.size>MAX_PROJECT_BYTES)throw Error('项目超过32 MiB');const copy=importProject(await file.text());const next=assignmentTemplates.find(t=>t.id===copy.assignment?.id);if(!next)throw Error('此文件不是本页的项目作业，请在材料研究记录中导入。');await save();await saveProject(copy);projects=(await listProjects()).filter(p=>assignmentTemplates.some(t=>t.id===p.assignment?.id));template=next;project=copy;message='已导入为独立副本。';},active);};
  if($('#pj-keep-exploration'))$('#pj-keep-exploration').onclick=()=>perform(async()=>{const snapshot=structuredClone(recent);await save();const independent=addRecord(makeProject({title:'独立探索 · '+snapshot.title,material:snapshot.material}),snapshot);await saveProject(independent);message='已另存独立材料记录，当前项目的阶段证据保持原样。请在材料研究记录中查看并导出备份。';},active);
  function openLab(link,mode){
   return event=>{
    if(!normalActivation(event)||!active()||!project)return;
    const id=mode==='current'?link.dataset.pjCurrent:link.dataset.pjOpen,step=template.steps.find(item=>item.id===id);
    if(!step||(mode==='current'&&!canAdjust(step,recent)))return;
    event?.preventDefault?.();
    const request={templateId:template.id,templateTitle:template.title,projectId:project.id,stepId:step.id,stepTitle:step.title,route:step.route,mode,...(mode==='current'?{record:structuredClone(recent)}:{})};
    return perform(async()=>{await save();if(!active())return;if(typeof onOpenLab==='function')await onOpenLab({...request,projectTitle:project.title});else globalThis.location.hash=request.route;},active);
   };
  }
  root.querySelectorAll('[data-pj-open]').forEach(link=>link.onclick=openLab(link,'preset'));
  root.querySelectorAll('[data-pj-current]').forEach(link=>link.onclick=openLab(link,'current'));
  if(project){
   root.querySelectorAll('[data-pj-collect]').forEach(button=>button.onclick=()=>perform(async()=>{readNotes();project=collectAssignmentRecord(project,template,button.dataset.pjCollect,latestCalculation());await save();message='已保存完整输入、结果和版本。可修改参数进行探索，旧记录保留。';},active));
   $('#pj-save').onclick=()=>perform(async()=>{await save();message='全部推导笔记与结论已保存。';},active);
   $('#pj-json').onclick=()=>perform(async()=>{await save();download?.(JSON.stringify(project,null,2),template.id+'-project.json','application/json');message='已导出含完整计算结果的项目。';},active);
   $('#pj-report').onclick=()=>perform(async()=>{await save();download?.(assignmentReport(project,template),template.id+'-report.md','text/markdown');message='研究报告已导出；请同时保留完整项目 JSON。';},active);
  }
  if(pendingStepFocus){const target=$('#pj-stage-'+pendingStepFocus);pendingStepFocus='';target?.focus?.();}
 }
 draw();
}
