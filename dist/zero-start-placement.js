const questions=[
 {
  id:'objects',route:'#classroom/start?lesson=objects',title:'检查哪些位置要重合',
  prompt:'两端分别放一个 A 类球和一个 B 类球。绕中点转 180° 后，两个位置仍有球，但 A 和 B 换了位置。这是带类型对象的对称操作吗？',
  choices:[['no','不是，A 和 B 的位置都变了'],['yes','是，只要两个位置上仍然有球']],correct:'no',
  review:'比较位置时也要比较类型。转动后，原来放 A 的位置现在放的是 B。',
 },
 {
  id:'repeat',route:'#classroom/start?lesson=repeat',title:'区分操作的阶与不动点',
  prompt:'将等边三角形在平面内绕中心转 120°，中心每次都不动。整个转动最少重复几次，才能让每一个点回到原处？',
  choices:[['1','1 次'],['2','2 次'],['3','3 次']],correct:'3',
  review:'先跟踪任意一个顶点。它要经过三个顶点才返回，中心每一步都保持原位。',
 },
 {
  id:'matrix',route:'#classroom/start?lesson=matrix',title:'从单位箭头读矩阵',
  prompt:'取向右为 +x、向上为 +y。顺时针转 90° 会把向右的单位箭头转到下方，把向上的单位箭头转到右方。矩阵的两列依次是什么？',
  choices:[['reverse','(0, 1) 和 (−1, 0)'],['clockwise','(0, −1) 和 (1, 0)'],['reflection','(0, −1) 和 (−1, 0)']],correct:'clockwise',
  review:'第一列写向右单位箭头的像，第二列写向上单位箭头的像。顺时针转动时，向右的箭头变为 (0, −1)。',
 },
 {
  id:'trace',route:'#classroom/start?lesson=trace',title:'确定作用空间再求迹',
  prompt:'半转把 (x, y, z) 变成 (x, −y, −z)。在 xy 平面中，矩阵对角线是 1, −1。在 xyz 空间中，对角线是 1, −1, −1。两个迹分别是多少？',
  choices:[['1,1','1 和 1'],['0,0','0 和 0'],['0,-1','0 和 −1'],['2,3','2 和 3']],correct:'0,-1',
  review:'迹把所有对角元按原来的正负号相加。xyz 空间比 xy 平面多一个 −1，所以三维矩阵的迹比二维少 1。',
 },
];
const destinations=[
 ['#classroom/foundations?lesson=group-basics','打开基础第一课'],
 ['#classroom/foundations?module=demos&amp;experiment=water','看水分子与光谱'],
 ['#compute','进入计算中心'],
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
  return `<p><strong>可以从这一小步开始</strong></p><p>${question.review}</p><p><a href="${question.route}">${question.title} →</a></p>`;
 }
 if(result.kind==='continue')return `<p>你的四个判断都与核对结果一致。可以直接进入群、操作与复合。</p><p><a href="${result.route}">打开基础第一课 →</a></p>`;
 if(result.kind==='partial')return '<p>已回答的题都与核对结果一致。你可以继续作答，也可以直接选下面的学习入口。</p>';
 return '<p>你可以先选一题作答，也可以直接选择学习入口。</p>';
}

export function bindZeroStartPlacement({root,isCurrent=()=>true,stateStore={}}){
 if(!root||!isCurrent())return ()=>{};
 const answers=stateStore.answers??={};
 root.innerHTML=`<p>这四道小题帮你选择从哪里开始。可以跳过任何一题，直接进入想学的内容。</p>
 ${questions.map(question=>`<div class="zs-controls"><label for="zp-${question.id}">${question.prompt}</label><select id="zp-${question.id}">
 <option value="">暂时跳过</option><option value="unsure">不确定</option>${question.choices.map(([id,text])=>`<option value="${id}">${text}</option>`).join('')}
 </select></div>`).join('')}
 <p><button id="zp-check" type="button" class="primary">核对并查看建议</button></p>
 <div id="zp-advice" role="status"></div>
 <details><summary>自由选择学习入口</summary><ul>${[...questions.map(q=>[q.route,q.title]),...destinations].map(([route,title])=>`<li><a href="${route}">${title}</a></li>`).join('')}</ul></details>`;

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
