const questions=[
 {
  id:'objects',route:'#classroom/start?lesson=objects',title:"Check which positions must match",
  prompt:"Place one ball of type A at one end and a ball of type B at the other. A 180° turn about the midpoint leaves both positions occupied and swaps the balls. Is this a symmetry of the object when the types matter?",
  choices:[['no',"No. A and B each changed position"],['yes',"Yes. Both positions are still occupied"]],correct:'no',
  review:"Compare the types as well as the positions. After the turn, B sits where A started.",
 },
 {
  id:'repeat',route:'#classroom/start?lesson=repeat',title:"Distinguish operation order from a fixed point",
  prompt:"Rotate an equilateral triangle 120° in its plane about its center. The center stays fixed. What is the fewest number of turns needed to return every point to its starting position?",
  choices:[['1',"1 turn"],['2',"2 turns"],['3',"3 turns"]],correct:'3',
  review:"Follow any vertex. It returns after three turns. The center stays in place at every step.",
 },
 {
  id:'matrix',route:'#classroom/start?lesson=matrix',title:"Read a matrix from unit arrows",
  prompt:"Take +x to the right and +y upward. A 90° clockwise turn sends the right-pointing unit arrow downward and the upward unit arrow to the right. What are the two matrix columns, in order?",
  choices:[['reverse',"(0, 1) and (−1, 0)"],['clockwise',"(0, −1) and (1, 0)"],['reflection',"(0, −1) and (−1, 0)"]],correct:'clockwise',
  review:"The first column is the image of the right-pointing unit arrow. The second is the image of the upward one. A clockwise turn sends the right-pointing arrow to (0, −1).",
 },
 {
  id:'trace',route:'#classroom/start?lesson=trace',title:"Identify the action space and find the trace",
  prompt:"A half-turn sends (x, y, z) to (x, −y, −z). The matrix in the xy plane has diagonal entries 1, −1. In xyz space the entries are 1, −1, −1. What are the two traces, in order?",
  choices:[['1,1',"1 and 1"],['0,0',"0 and 0"],['0,-1',"0 and −1"],['2,3',"2 and 3"]],correct:'0,-1',
  review:"Add the diagonal entries with their signs. The extra −1 in xyz space makes the three-dimensional trace one less than the planar trace.",
 },
];
const destinations=[
 ['#classroom/foundations?lesson=group-basics',"Open the first foundations lesson"],
 ['#classroom/foundations?module=demos&amp;experiment=water',"Explore water and spectroscopy"],
 ['#compute',"Open the calculation center"],
];

export function placementAdvice(answers={}){
 const attempted=questions.filter(q=>answers?.[q.id]==='unsure'||q.choices.some(([id])=>id===answers?.[q.id]));
 const gap=attempted.find(q=>answers[q.id]!==q.correct);
 if(gap)return {kind:'review',question:gap.id,route:gap.route};
 if(attempted.length===questions.length)return {kind:'continue',route:destinations[0][0]};
 return {kind:attempted.length?'partial':'unanswered',route:null};
}

function adviceHTML(result){
 if(result.kind==='review'){
  const question=questions.find(q=>q.id===result.question);
  return `<p><strong>A suggested starting point</strong></p><p>${question.review}</p><p><a href="${question.route}">${question.title} →</a></p>`;
 }
 if(result.kind==='continue')return `<p>All four answers check out. You can go straight to groups, operations and composition.</p><p><a href="${result.route}">Open the first foundations lesson →</a></p>`;
 if(result.kind==='partial')return "<p>Your answers so far check out. You can answer more questions or choose an entry point below.</p>";
 return "<p>Answer any question or choose a learning entry point.</p>";
}

export function bindZeroStartPlacement({root,isCurrent=()=>true,stateStore={}}){
 if(!root||!isCurrent())return ()=>{};
 const answers=stateStore.answers??={};
 root.innerHTML=`<p>Use these four short questions to choose where to start. You can skip any question and go straight to the material you want.</p>
 ${questions.map(question=>`<div class="zs-controls"><label for="zp-${question.id}">${question.prompt}</label><select id="zp-${question.id}">
 <option value="">Skip for now</option><option value="unsure">Unsure</option>${question.choices.map(([id,text])=>`<option value="${id}">${text}</option>`).join('')}
 </select></div>`).join('')}
 <p><button id="zp-check" type="button" class="primary">Check answers and see suggestions</button></p>
 <div id="zp-advice" role="status"></div>
 <details><summary>Choose any learning entry point</summary><ul>${[...questions.map(q=>[q.route,q.title]),...destinations].map(([route,title])=>`<li><a href="${route}">${title}</a></li>`).join('')}</ul></details>`;

 const check=root.querySelector('#zp-check'),advice=root.querySelector('#zp-advice');
 const controls=questions.map(question=>[question,root.querySelector('#zp-'+question.id)]);
 const show=()=>{advice.innerHTML=adviceHTML(placementAdvice(answers));};
 for(const [question,select] of controls){
  const value=answers[question.id];
  if(value==='unsure'||question.choices.some(([id])=>id===value))select.value=value;
  select.onchange=()=>{
   if(!isCurrent())return;
   answers[question.id]=select.value;
   stateStore.checked=false;
   advice.textContent='';
  };
 }
 check.onclick=()=>{if(isCurrent()){stateStore.checked=true;show();}};
 if(stateStore.checked)show();
 return ()=>{check.onclick=null;for(const [,select] of controls)select.onchange=null;};
}
