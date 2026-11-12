// Optional, choice-specific explanations. Remediation never updates course progress.
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validQuestion=q=>q&&Array.isArray(q.choices)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length;
const prefixFor=value=>typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(value)?value:'learning-feedback';
const validRemediation=r=>r&&typeof r.id==='string'&&r.id.trim()&&typeof r.prompt==='string'&&r.prompt.trim()&&Array.isArray(r.choices)&&r.choices.length>=2&&r.choices.every(c=>typeof c==='string'&&c.trim())&&Number.isInteger(r.answer)&&r.answer>=0&&r.answer<r.choices.length&&typeof r.explanation==='string'&&r.explanation.trim();

export function getChoiceFeedback(question,selected){
 if(!validQuestion(question)||!Number.isInteger(selected)||selected<0||selected>=question.choices.length||!Array.isArray(question.feedback)||question.feedback.length!==question.choices.length)return null;
 const item=question.feedback[selected];
 if(!item||typeof item.message!=='string'||!item.message.trim())return null;
 return {message:item.message,...(selected!==question.answer&&validRemediation(item.remediation)?{remediation:item.remediation}:{})};
}

export function renderChoiceFeedback(question,selected,{prefix='learning-feedback'}={}){
 const item=getChoiceFeedback(question,selected);if(!item)return '';
 const id=prefixFor(prefix),r=item.remediation,label=question.question||question.prompt||"Current question";
 return `<section class="learning-feedback" id="${id}-feedback" data-learning-feedback="${id}" aria-label="${escapeHTML(label)}: Feedback for this choice"><p>${escapeHTML(item.message)}</p>${r?`<div class="learning-remediation"><fieldset><legend id="${id}-remediation-prompt">Change a condition and check again: ${escapeHTML(r.prompt)}</legend>${r.choices.map((choice,index)=>`<label><input type="radio" name="${id}-remediation" value="${index}" data-feedback-choice="${index}"><span>${escapeHTML(choice)}</span></label>`).join('')}</fieldset><button type="button" class="secondary" data-feedback-check aria-describedby="${id}-remediation-prompt" disabled>Check this variation</button><button type="button" class="secondary" data-feedback-reset aria-describedby="${id}-remediation-prompt">Try this variation again</button><p id="${id}-remediation-result" data-feedback-result role="status" aria-live="polite"></p></div>`:''}</section>`;
}

export function bindChoiceFeedback(container,question,selected,{prefix='learning-feedback',onResult,isCurrent}={}){
 const item=getChoiceFeedback(question,selected),r=item?.remediation;
 const id=prefixFor(prefix),panel=container?.querySelector?.('#'+id+'-feedback');
 if(!r||!panel)return ()=>{};
 const inputs=[...panel.querySelectorAll('[data-feedback-choice]')],check=panel.querySelector('[data-feedback-check]'),reset=panel.querySelector('[data-feedback-reset]'),result=panel.querySelector('[data-feedback-result]');
 if(!check||!result||inputs.length!==r.choices.length)return ()=>{};
 let active=true,choice=null;
 const current=()=>active&&container.isConnected!==false&&panel.isConnected!==false&&container.querySelector('#'+id+'-feedback')===panel&&(typeof isCurrent!=='function'||isCurrent());
 const handlers=inputs.map(input=>{
  const change=()=>{if(!current())return;const value=Number(input.dataset.feedbackChoice);if(!Number.isInteger(value)||value<0||value>=r.choices.length)return;choice=value;inputs.forEach(control=>{control.checked=control===input;});check.disabled=false;result.textContent='';result.removeAttribute?.('data-correct');};
  input.onchange=change;return [input,change];
 });
 const evaluate=()=>{if(!current()||choice===null)return;const correct=choice===r.answer;result.textContent=(correct?"The check agrees for this variation.":"Check this condition again.")+' '+r.explanation;result.setAttribute('data-correct',String(correct));if(typeof onResult==='function')onResult({id:r.id,selected:choice,correct});};
 const clear=()=>{if(!current())return;choice=null;inputs.forEach(input=>{input.checked=false;});check.disabled=true;result.textContent='';result.removeAttribute?.('data-correct');};
 check.onclick=evaluate;
 if(reset)reset.onclick=clear;
 return ()=>{active=false;for(const [input,change]of handlers)if(input.onchange===change)input.onchange=null;if(check.onclick===evaluate)check.onclick=null;if(reset?.onclick===clear)reset.onclick=null;};
}
