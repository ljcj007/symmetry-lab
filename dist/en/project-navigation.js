import {PROJECT_INPUT_TARGETS,getProjectInputTarget,projectInputFor} from './project-input.js?v=20261113-support1';

const routeText=value=>String(value||'').replace(/^#/,'');
const routePath=value=>routeText(value).split('?')[0];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value);
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=180&&/^[A-Za-z0-9_.:-]+$/.test(value);
const title=value=>typeof value==='string'?value.slice(0,240):'';
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const normalActivation=event=>!event||!(event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey);
export function projectActionForRoute(route){
 const path=routePath(route);
 return Object.values(PROJECT_INPUT_TARGETS).find(target=>routePath(target.route)===path)?.action||null;
}
export function projectReturnRoute(source){
 if(!source||![source.templateId,source.projectId,source.stepId].every(identifier))throw Error("The project return location is incomplete. Reopen the experiment from the saved assignment.");
 return 'atlas/projects?'+new URLSearchParams({project:source.templateId,projectInstance:source.projectId,projectStep:source.stepId});
}
export function prepareProjectNavigation(request,{route}={}){
 if(!plain(request)||!['preset','current'].includes(request.mode))throw Error("This project navigation mode is invalid.");
 const source={templateId:request.templateId,projectId:request.projectId,stepId:request.stepId,templateTitle:title(request.templateTitle),projectTitle:title(request.projectTitle),stepTitle:title(request.stepTitle)};
 projectReturnRoute(source);
 const requestedRoute=routeText(request.route),action=projectActionForRoute(requestedRoute);
 if(!action)throw Error("This stage's tool entry cannot be restored here. Open it from the calculation center.");
 let target=routeText(route||requestedRoute),projectInput;
 if(request.mode==='current'){
  if(request.record?.action!==action)throw Error("The current record belongs to another tool, so the experiment input was not replaced.");
  const targetInfo=getProjectInputTarget(action,request.record.input),loaded=projectInputFor({projectInput:{action,input:request.record.input}},action,{});
  if(!targetInfo||loaded.status!=='loaded')throw Error(loaded.message||"This tool cannot fully restore the input in the current record.");
  if(!route)target=routeText(targetInfo.route);
  projectInput={action,input:clone(request.record.input)};
 }
 if(projectActionForRoute(target)!==action)throw Error("The experiment does not match the project stage, so the original record was not loaded.");
 return {route:target,context:{kind:'project-calculation',targetRoute:target,action,mode:request.mode,source,...(projectInput?{projectInput}:{})}};
}

// One target-bound visit per app. A new external navigation supplies no context
// and clears it. Raw inputs remain in RAM and are consumed after a successful
// render; they are never serialized to the address, history or saved evidence.
export function createProjectNavigator(){
 let active=null;
 function enter(route,context){
  active=null;
  if(!plain(context)||context.kind!=='project-calculation'||routeText(context.targetRoute)!==routeText(route)||projectActionForRoute(route)!==context.action||!['preset','current'].includes(context.mode))return;
  try{
   projectReturnRoute(context.source);
   if(context.projectInput&&(context.projectInput.action!==context.action||projectInputFor({projectInput:context.projectInput},context.action,{}).status!=='loaded'))return;
   active={...clone(context),targetRoute:routeText(route),identity:{}};
  }catch{}
 }
 function selection(course){
  if(!course||!active)return course;
  return {...course,project:active.source.templateId,projectInstance:active.source.projectId,projectStep:active.source.stepId,...(active.projectInput?{projectInput:clone(active.projectInput)}:{})};
 }
 function optionsFor(route){
  if(!active||projectActionForRoute(route)!==active.action)return {};
  const {identity,...context}=active;
  return {projectContext:{...clone(context),targetRoute:routeText(route)}};
 }
 function consumeInput(){if(active)delete active.projectInput;}
 function html(){
  if(!active)return '';
  const source=active.source,label=[source.projectTitle||source.templateTitle,source.stepTitle].filter(Boolean).join(' / ')||"Current project and stage";
  return `<section class="project-calculation-context" aria-label="Project experiment context"><strong>${esc(label)}</strong><p>${(active.mode==='current'?"This opens a copy of the original input. Edits do not overwrite saved evidence.":"This loads the stage's preset conditions. Existing evidence and notes are retained.")+' '+"Review the conditions, then run the calculation explicitly."}</p><a class="secondary" data-project-return href="#${esc(projectReturnRoute(source))}">Return to this project and stage →</a></section>`;
 }
 function bind(root,onNavigate){
  const link=root?.querySelector?.('[data-project-return]'),visit=active;
  if(!link||!visit)return;
  link.onclick=event=>{
   if(!normalActivation(event)||active!==visit||root.isConnected===false||root.querySelector('[data-project-return]')!==link)return;
   event?.preventDefault();const destination=projectReturnRoute(visit.source);active=null;return onNavigate(destination);
  };
 }
 const snapshot=()=>active?{action:active.action,mode:active.mode,targetRoute:active.targetRoute,source:clone(active.source),hasInput:!!active.projectInput}:null;
 return {enter,selection,optionsFor,consumeInput,html,bind,snapshot};
}
