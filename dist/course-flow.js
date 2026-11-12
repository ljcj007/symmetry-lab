import {renderChoiceFeedback,bindChoiceFeedback} from './learning-feedback.js?v=20261113-flow1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const contextKeys=['module','lesson','exercise','material','preset','experiment'];
const safePrefix=prefix=>{if(!/^[a-z][a-z0-9-]*$/.test(prefix))throw Error('Invalid classroom control prefix');return prefix;};

// Course continuation and material browsing are separate links. Existing query
// parameters are retained unless an explicit context value replaces them.
export function courseFlowRoute(base,context={}){
 if(typeof base!=='string'||!base.startsWith('#classroom/'))throw Error('Invalid classroom continuation route');
 const [path,query='']=base.split('?'),params=new URLSearchParams(query);
 for(const key of contextKeys)if(Object.hasOwn(context,key)){
  const value=context[key];if(value===undefined||value===null||value==='')params.delete(key);else params.set(key,String(value));
 }
 params.set('tab',['learn','lab','derive'].includes(context.tab)?context.tab:'learn');
 return path+'?'+params.toString();
}

export function courseFlowActions(prefix){
 safePrefix(prefix);
 return `<div class="obs-links"><button type="button" class="secondary" id="${prefix}-flow-learn">回到本课讲解</button><button type="button" class="primary" id="${prefix}-flow-lab">用本课预设检验</button></div><p id="${prefix}-flow-status" role="alert"></p>`;
}

export function bindCourseFlowActions({root,prefix,isCurrent,onLearn,onLab,labButtonId}){
 safePrefix(prefix);
 const actions=[['#'+prefix+'-flow-learn',onLearn],['#'+prefix+'-flow-lab',onLab]];
 if(labButtonId)actions.push(['#'+safePrefix(labButtonId),onLab]);
 for(const [id,action]of actions){
  const button=root.querySelector(id);if(!button)continue;
  const active=()=>isCurrent()&&root.querySelector(id)===button;
  let busy=false;
  button.onclick=async()=>{
   if(busy||!active())return;
   busy=true;
   try{return await action();}
   catch(error){if(active()){
    let status=root.querySelector('#'+prefix+'-flow-status');
    if(!status){status=document.createElement('p');status.setAttribute('id',prefix+'-flow-status');status.setAttribute('role','alert');root.appendChild(status);}
    status.textContent=error?.message||'本课操作暂未完成，请重试。';
   }}
   finally{busy=false;}
  };
 }
 for(const link of root.querySelectorAll('[data-course-flow-learn]'))link.onclick=event=>{
  if(event?.ctrlKey||event?.metaKey||event?.shiftKey||event?.altKey||(event?.button!==undefined&&event.button!==0))return;
  if(!isCurrent()||![...root.querySelectorAll('[data-course-flow-learn]')].includes(link))return;
  event?.preventDefault?.();event?.stopPropagation?.();return onLearn();
 };
}

// Ordinary tab switches preserve editable text, including incomplete JSON or
// blank numeric controls. A lesson-preset action explicitly discards its draft.
export function createCourseFlowDrafts(){
 const drafts=new Map();
 return {
  remember(form,key,error=''){
   if(!form)return;
   const fields=['input','select','textarea'].flatMap(tag=>[...form.querySelectorAll(tag)]).filter(el=>el.id&&el.type!=='file').map(el=>({id:el.id,value:el.value,checked:el.checked}));
   drafts.set(key,{fields,outputs:[...form.querySelectorAll('output')].map(el=>el.textContent),error});
  },
  restore(form,key){
   const draft=drafts.get(key);if(!form||!draft)return;drafts.delete(key);
   for(const field of draft.fields){const el=form.querySelector('#'+field.id);if(el){el.value=field.value;if(typeof field.checked==='boolean')el.checked=field.checked;}}
   [...form.querySelectorAll('output')].forEach((el,i)=>{if(draft.outputs[i]!==undefined)el.textContent=draft.outputs[i];});
   if(draft.error){const status=document.createElement('p');status.setAttribute('role','alert');status.textContent=draft.error+' 原输入已保留，请修改后重新检查。';form.appendChild(status);}
  },
  discard(key){drafts.delete(key);}
 };
}

// The remembered count belongs to the current page session. Permanent completion
// records remain owned by each classroom and keep their existing storage keys.
export function renderCourseFlowSteps({container,exercise,prefix,answerAttribute='data-'+prefix+'-answer',completedSteps=0,isCurrent,onStep=()=>{},onComplete=()=>{},choicesClass='mr-choices'}){
 safePrefix(prefix);
 if(!/^data-[a-z][a-z0-9-]*$/.test(answerAttribute))throw Error('Invalid classroom answer attribute');
 const restored=Number.isInteger(completedSteps)?Math.max(0,Math.min(completedSteps,exercise.steps.length)):0;
 let step=0;
 const active=()=>isCurrent()&&container.isConnected!==false;
 function next(){
  if(!active())return;
  if(step>=exercise.steps.length){onComplete();return;}
  const index=step,s=exercise.steps[index],el=document.createElement('section');el.className='obs-exercise-step';
  el.innerHTML=`<h3>第 ${index+1} / ${exercise.steps.length} 步</h3><p>${esc(s.prompt)}</p><details><summary>查看提示</summary><p>${esc(s.hint)}</p></details><div class="${esc(choicesClass)}">${s.choices.map((choice,i)=>`<button type="button" class="secondary" ${answerAttribute}="${i}">${esc(choice)}</button>`).join('')}</div><div class="obs-feedback" role="status"></div>`;
  container.appendChild(el);
  let disposeFeedback=()=>{};
  const feedback=(selected,correct)=>{
   disposeFeedback();
   const target=el.querySelector('.obs-feedback'),feedbackPrefix=prefix+'-'+exercise.id+'-'+index;
   const html=renderChoiceFeedback(s,selected,{prefix:feedbackPrefix});
   if(html)target.innerHTML=html;else target.textContent=(correct?'✓ ':'再想一想：')+(correct?s.explanation:s.hint);
   disposeFeedback=bindChoiceFeedback(target,s,selected,{prefix:feedbackPrefix,isCurrent:()=>active()&&step===index&&el.parentNode===container});
  };
  const advance=(remember=true)=>{
   if(!active()||step!==index||el.parentNode!==container)return;
   feedback(s.answer,true);
   el.querySelectorAll('button').forEach(button=>button.disabled=true);
   step++;if(remember)onStep(step);next();
  };
  el.querySelectorAll('['+answerAttribute+']').forEach(button=>button.onclick=()=>{
   if(!active()||step!==index||button.disabled||el.parentNode!==container)return;
   const selected=Number(button.getAttribute?.(answerAttribute)??button.attributes?.[answerAttribute]);
   if(selected!==s.answer){feedback(selected,false);return;}
   advance();
  });
  if(index<restored)advance(false);
 }
 next();
}
