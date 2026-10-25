import {renderPointgroupView,getPointgroupResult} from './pointgroup-ui.js?v=20261025-ninej3';
import {renderSymmetryCourseView,getSymmetryCourseResult} from './symmetry-course-ui.js?v=20261025-ninej3';
import {renderLieGroupView,getLieGroupResult} from './lie-group-ui.js?v=20261025-ninej3';

export const classroomSections = [
  {id:'pointgroups',slug:'pointgroups',title:'32 点群',summary:'从有限对称操作、特征标与选择定则入门。'},
  {id:'academy',slug:'crystal',title:'空间群 · 双群 · 磁群',summary:'加入平移、自旋与时间反演，在材料模型中验证。'},
  {id:'lie',slug:'lie',title:'李群基础 · SU(2) / SU(3)',summary:'从连续变换走向生成元、对易关系和基本表示。'}
];
export const isClassroomView = view => classroomSections.some(section=>section.id===view);
export function resolveClassroomRoute(route,last='pointgroups') {
  if(route==='classroom')return isClassroomView(last)?last:'pointgroups';
  return classroomSections.find(section=>route===section.id||route==='classroom/'+section.slug)?.id||null;
}
export const classroomHash = section => '#classroom/'+(classroomSections.find(item=>item.id===section)||classroomSections[0]).slug;
const renderers={pointgroups:renderPointgroupView,academy:renderSymmetryCourseView,lie:renderLieGroupView};
const results={pointgroups:getPointgroupResult,academy:getSymmetryCourseResult,lie:getLieGroupResult};
export function getClassroomResult(section) {
  const course=results[section]?.();
  return course?{kind:'group-theory-classroom',section,course}:null;
}

export function renderClassroomView({container,section='pointgroups',onSection=()=>{},run,cancelRun,toast,download,openGroup,courseRenderers=renderers}) {
  if(!isClassroomView(section))section='pointgroups';
  container.innerHTML=`<div class="classroom-page"><nav class="classroom-tabs" role="tablist" aria-label="群论课堂课程分区">${classroomSections.map(item=>`<button type="button" role="tab" id="classroom-tab-${item.id}" aria-selected="${item.id===section}" aria-controls="classroom-course" tabindex="${item.id===section?0:-1}" data-classroom-section="${item.id}"><strong>${item.title}</strong><span>${item.summary}</span></button>`).join('')}</nav><section id="classroom-course" role="tabpanel" aria-labelledby="classroom-tab-${section}"></section></div>`;
  const root=container.firstElementChild;
  const current=()=>root.parentNode===container&&container.isConnected!==false;
  const choose=id=>{if(current()&&id!==section)onSection(id);};
  root.querySelectorAll('[data-classroom-section]').forEach(button=>{
    button.onclick=()=>choose(button.dataset.classroomSection);
    button.onkeydown=event=>{
      const index=classroomSections.findIndex(item=>item.id===section);
      let next;
      if(event.key==='ArrowRight')next=(index+1)%3;
      else if(event.key==='ArrowLeft')next=(index+2)%3;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=2;
      else return;
      if(!current())return;
      event.preventDefault();
      const id=classroomSections[next].id;choose(id);
      container.querySelector('#classroom-tab-'+id)?.focus();
    };
  });
  return courseRenderers[section]({container:root.querySelector('#classroom-course'),run,cancelRun,toast,download,
    openGroup:selection=>openGroup?.(typeof selection==='number'?{mode:'sg',id:selection,k:[0,0,0],doubleValued:false}:selection)});
}
