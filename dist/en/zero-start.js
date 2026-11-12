// A small geometric bridge before the existing representation courses.
export const ZERO_START_KEY='symmetry-lab.zero-start.progress.v1';
export const ZERO_START_STEPS=[
 {id:'objects',title:"What does symmetry mean?",goal:"Check the whole object, not just its outline."},
 {id:'repeat',title:"Repeat an action",goal:"Distinguish an operation's order from a point's period."},
 {id:'coordinates',title:"Describe a position with two numbers",goal:"Read a rotation from an arrow and its coordinates."},
 {id:'matrix',title:"A matrix describes an action",goal:"Read matrix columns using two unit arrows."},
 {id:'trace',title:"From matrices to characters",goal:"Add the diagonal entries in a specified space."},
 {id:'next',title:"Choose your next path",goal:"Choose a lesson, demonstration, or tool for your question."}
];
const ids=ZERO_START_STEPS.map(step=>step.id),own=(object,key)=>Object.hasOwn(object,key);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fresh=()=>({version:1,answers:{}});
let memory=fresh(),latestResult=null;
const copy=value=>JSON.parse(JSON.stringify(value));
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const exactKeys=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&keys.every(key=>own(value,key));
const integer=(value,low,high)=>Number.isInteger(value)&&value>=low&&value<=high;
const clean=value=>Object.is(value,-0)?0:value;

export function rotateQuarter(point,turns=1){
 if(!Array.isArray(point)||![2,3].includes(point.length)||!point.every(Number.isFinite)||!Number.isInteger(turns))throw Error('A rotation needs a finite 2D or 3D point and an integer number of quarter turns.');
 let [x,y]=point;for(let i=0,n=((turns%4)+4)%4;i<n;i++)[x,y]=[-y,x];
 return [clean(x),clean(y),...(point.length===3?[point[2]]:[])];
}
export function cartesianQuarterMatrix(space='xy'){
 if(space==='xy')return [[0,-1],[1,0]];
 if(space==='xyz')return [[0,-1,0],[1,0,0],[0,0,1]];
 throw Error('Unknown Cartesian space');
}
export const matrixTrace=matrix=>matrix.reduce((sum,row,i)=>sum+row[i],0);
export function zeroStartExpectedAnswer(step,context){
 if(!plain(context))return null;
 if(step==='objects'&&exactKeys(context,['marked','turns'])&&typeof context.marked==='boolean'&&integer(context.turns,1,4))return !context.marked||context.turns===4?'same':'changed';
 if(step==='repeat'&&exactKeys(context,['point','turns'])&&['general','axis'].includes(context.point)&&integer(context.turns,1,4))return context.point==='axis'?'4,1':'4,4';
 if(step==='coordinates'&&exactKeys(context,['x','y','applied'])&&integer(context.x,-2,2)&&integer(context.y,-2,2)&&context.applied===true)return 'ccw';
 if(step==='matrix'&&exactKeys(context,['shown'])&&context.shown==='both')return 'correct';
 if(step==='trace'&&exactKeys(context,['space','applied'])&&['xy','xyz'].includes(context.space)&&context.applied===true)return String(matrixTrace(cartesianQuarterMatrix(context.space)));
 if(step==='next'&&exactKeys(context,['goal'])&&['geometry','spectra','tools'].includes(context.goal))return {geometry:'foundations',spectra:'water',tools:'compute'}[context.goal];
 return null;
}
export function normalizeZeroStartProgress(raw){
 let value;try{value=typeof raw==='string'?JSON.parse(raw):raw;}catch{return fresh();}
 const result=fresh();if(!exactKeys(value,['version','answers'])||value.version!==1||!plain(value.answers))return result;
 for(const step of ids){const saved=value.answers[step];if(exactKeys(saved,['choice','context'])&&typeof saved.choice==='string'&&zeroStartExpectedAnswer(step,saved.context)===saved.choice)result.answers[step]=copy(saved);}
 return result;
}
export function updateZeroStartProgress(progress,step,context,choice){
 const result=normalizeZeroStartProgress(progress);if(!ids.includes(step))return result;
 delete result.answers[step];if(typeof choice==='string'&&zeroStartExpectedAnswer(step,context)===choice)result.answers[step]={choice,context:copy(context)};
 return result;
}
function load(){try{const raw=globalThis.localStorage?.getItem(ZERO_START_KEY);memory=raw?normalizeZeroStartProgress(raw):fresh();}catch{/* An in-memory record remains usable when storage is unavailable. */}return copy(memory);}
function save(progress){memory=normalizeZeroStartProgress(progress);try{globalThis.localStorage?.setItem(ZERO_START_KEY,JSON.stringify(memory));}catch{/* No other course records are touched. */}}
export function getZeroStartResult(){return latestResult?copy(latestResult):null;}

const defaults={objects:{marked:false,turns:0},repeat:{point:'general',turns:0},coordinates:{x:1,y:0,applied:false},matrix:{shown:'x'},trace:{space:'xy',applied:false},next:{goal:''}};
const option=(value,label,selected)=>`<option value="${esc(value)}" ${selected===value?'selected':''}>${label}</option>`;
const select=(id,values,value,label)=>`<label for="${id}">${label}</label><select id="${id}">${values.map(([id,text])=>option(id,text,value)).join('')}</select>`;
const matrixHTML=matrix=>`<span class="zs-matrix" role="img" aria-label="${esc(matrix.map(row=>row.join(', ')).join('; '))}">${matrix.map(row=>`<span class="zs-matrix-row">${row.map(n=>`<span>${n===-1?'−1':n}</span>`).join('')}</span>`).join('')}</span>`;
const xyText=point=>'('+point.map(n=>n<0?'−'+Math.abs(n):n).join(', ')+')';
function svg(title,body,viewBox='0 0 520 270'){return `<svg xmlns="http://www.w3.org/2000/svg" class="zs-svg" viewBox="${viewBox}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;}
const svgText=(x,y,text,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(text)}</text>`;
const arrow=(x1,y1,x2,y2,color='#28628d',width=4)=>{const a=Math.atan2(y2-y1,x2-x1),size=10;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/><path d="M${x2},${y2} L${x2-size*Math.cos(a-.45)},${y2-size*Math.sin(a-.45)} L${x2-size*Math.cos(a+.45)},${y2-size*Math.sin(a+.45)} Z" fill="${color}"/>`;};
function objectDiagram(context){
 const points=[[-1,1],[1,1],[1,-1],[-1,-1]],draw=(cx,turns)=>{const result=points.map(p=>rotateQuarter(p,turns)),screen=p=>[cx+p[0]*54,140-p[1]*54];return `<polygon points="${result.map(p=>screen(p).join(',')).join(' ')}" fill="#eef4f8" stroke="#637789" stroke-width="3"/>`+result.map((p,i)=>{const [x,y]=screen(p);return `<circle cx="${x}" cy="${y}" r="14" fill="${context.marked&&i===0?'#a3611c':'#28628d'}"/>`+(context.marked&&i===0?svgText(x,y+6,'B','text-anchor="middle" fill="white"'):'');}).join('');};
 return svg("Compare a square with four equivalent sites and a square with one distinct site, before and after rotation",draw(130,0)+draw(390,context.turns)+svgText(130,38,"Original object",'text-anchor="middle"')+svgText(390,38,"After the operation",'text-anchor="middle"')+svgText(260,246,context.marked?"Blue sites are type A; the brown site is type B. Types must also match.":"All four blue sites have the same type.",'text-anchor="middle"'));
}
function rotationDiagram(context){
 const point=context.point==='axis'?[0,0,1]:[1,0,1],last=rotateQuarter(point,context.turns),cx=260,cy=135,r=75;
 let body=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#c7d2da" stroke-dasharray="5 5"/>`+arrow(130,cy,390,cy,'#83929d',1)+arrow(cx,235,cx,35,'#83929d',1)+svgText(401,cy+6,'x')+svgText(cx+9,30,'y');
 for(let n=0;n<=context.turns;n++){const p=rotateQuarter(point,n);body+=`<circle cx="${cx+r*p[0]}" cy="${cy-r*p[1]}" r="${n===context.turns?10:5}" fill="${n===context.turns?'#a3611c':'#28628d'}"/>`;}
 return svg("A quarter-turn of a point at fixed z=1, projected onto the xy plane",body+svgText(24,28,"Only the xy projection is shown; z = 1 is unchanged.")+svgText(260,263,"Current 3D coordinates "+xyText(last),'text-anchor="middle"'));
}
function coordinateDiagram(context){
 const cx=260,cy=135,s=40,p=[context.x,context.y],out=rotateQuarter(p),shown=context.applied?out:p;
 let body=arrow(120,cy,400,cy,'#83929d',1)+arrow(cx,245,cx,25,'#83929d',1)+svgText(408,cy+6,'x')+svgText(cx+8,23,'y');
 for(let n=-2;n<=2;n++)if(n){body+=svgText(cx+n*s,cy+22,String(n),'text-anchor="middle"')+svgText(cx-15,cy-n*s+6,String(n),'text-anchor="end"');}
 if(context.applied)body+=arrow(cx,cy,cx+s*p[0],cy-s*p[1],'#b4c3ce',3);
 body+=arrow(cx,cy,cx+s*shown[0],cy-s*shown[1],context.applied?'#a3611c':'#28628d');
 return svg("Coordinate arrow: positive x points right and positive y points up; compare before and after a counterclockwise rotation",body+svgText(260,268,(context.applied?"After rotation:":"Before rotation:")+xyText(shown),'text-anchor="middle"'));
}
function basisDiagram(shown){
 const cx=260,cy=145,s=85;let body=arrow(105,cy,410,cy,'#83929d',1)+arrow(cx,252,cx,25,'#83929d',1);
 if(shown==='x'||shown==='both')body+=arrow(cx,cy,cx+s,cy,'#b8cbd9',3)+arrow(cx,cy,cx,cy-s,'#28628d')+svgText(cx+12,cy-s,'(1,0) → (0,1)');
 if(shown==='y'||shown==='both')body+=arrow(cx,cy,cx,cy-s,'#ddcbb5',3)+arrow(cx,cy,cx-s,cy,'#a3611c')+svgText(25,cy+34,'(0,1) → (−1,0)');
 return svg("The first and second matrix columns record the rotated coordinates of the two unit arrows",body+svgText(260,267,"Light: original arrows. Dark: after rotation.",'text-anchor="middle"'));
}
const continuations=[
 ['#classroom/foundations?lesson=group-basics',"Point groups and representations · Continue with the first lesson","Organize the actions using group rules, then study representations and reduction."],
 ['#classroom/foundations?module=demos&experiment=water',"Water, infrared, and Raman","With matrices and characters in place, connect displacements to spectroscopic channels."],
 ['#classroom/foundations?module=theorems&experiment=rearrangement',"Theorem proofs and applications","With a foundation in representations, use S₃ to examine rearrangement, Schur's lemma, and orthogonality."],
 ['#classroom/crystal?track=space',"Crystals and space groups","Extend point groups with periodic translations, screw axes, and glide planes."],
 ['#compute',"Calculation center","For a specific task, find the tool and enter its parameters directly."]
];

export function renderZeroStart({container,selection={},onNavigate=()=>{},download,toast=()=>{}}){
 let progress=load(),step=ids.includes(selection.lesson)?selection.lesson:ids[0],drafts=copy(defaults),answers={},feedback={};
 for(const id of ids)if(progress.answers[id]){drafts[id]=copy(progress.answers[id].context);answers[id]=progress.answers[id].choice;}
 container.innerHTML='<div class="zs-course"></div>';const host=container.firstElementChild,current=()=>host.parentNode===container&&container.isConnected!==false,$=selector=>host.querySelector(selector);
 function report(){return {kind:'zero-foundation-learning-record',schemaVersion:1,steps:ids,checkedSteps:ids.filter(id=>own(progress.answers,id)),answers:copy(progress.answers),note:'These checks record answers to six introductory tasks; they are not a grade or certification of readiness.'};}
 function remember(){save(progress);latestResult=report();}
 function invalidate(id){delete progress.answers[id];delete answers[id];delete feedback[id];remember();}
 function change(patch){if(!current())return;Object.assign(drafts[step],patch);invalidate(step);draw();}
 function advance(id){if(!current()||!ids.includes(id))return;step=id;draw();onNavigate({lesson:id});$('#zs-heading')?.focus?.({preventScroll:true});}
 function body(){const c=drafts[step];
  if(step==='objects')return `<p>Rotate the object. If all sites coincide with original sites of the same type, the action is a symmetry operation of that object. Color denotes type here: a type-A site and a type-B site are distinct.</p><div class="zs-controls">${select('zs-marked',[['same',"Four equivalent sites"],['different',"Change one site to type B"]],c.marked?'different':'same',"Choose an object")}<button type="button" id="zs-action" class="primary">Rotate 90° counterclockwise</button><button type="button" id="zs-reset-example" class="secondary">Return to the start</button></div><p class="zs-observation">Rotated ${c.turns} times, by 90° each time.</p>${objectDiagram(c)}<p>The outline alone omits site types. When examining molecules or crystals, retain element types and internal labels too.</p>`;
  if(step==='repeat')return `<p>The action that changes nothing is the identity operation. Four successive 90° rotations return the entire coordinate space to its original state, so this rotation has order 4. A point on the rotation axis, however, remains fixed after every turn.</p><div class="zs-controls">${select('zs-point',[['general',"Off-axis point (1,0,1)"],['axis',"On-axis point (0,0,1)"]],c.point,"Which point will you track?")}<button type="button" id="zs-action" class="primary">Apply another 90° rotation</button><button type="button" id="zs-reset-example" class="secondary">Restart tracking</button></div><p class="zs-observation">Applied ${c.turns} times. How many applications return every point? What is the fewest needed to return your selected point?</p>${rotationDiagram(c)}<p>Here, the point period is the smallest positive number of applications that returns that point. It can be smaller than the operation's order without changing that order.</p>`;
  if(step==='coordinates')return `<p>Represent an arrow from the origin with the two numbers at its tip: x first (positive to the right), then y (positive upward). These numbers are the arrow's coordinates.</p><div class="zs-controls"><label for="zs-x">x coordinate</label><input id="zs-x" type="number" min="-2" max="2" step="1" value="${c.x}"><label for="zs-y">y coordinate</label><input id="zs-y" type="number" min="-2" max="2" step="1" value="${c.y}"><button type="button" id="zs-action" class="primary">Rotate the arrow 90° counterclockwise</button></div>${coordinateDiagram(c)}${c.applied?`<p class="zs-calculation">${xyText([c.x,c.y])} → ${xyText(rotateQuarter([c.x,c.y]))}; new x = −old y, and new y = old x.</p>`:''}<p>The arrow rotates while the axes stay fixed: this is an active operation. The zero arrow remains zero, but that single point cannot determine the full operation.</p>`;
  if(step==='matrix')return `<p>Start with the rightward unit arrow (1,0), then the upward unit arrow (0,1). Their images determine the rotated coordinates of any arrow.</p><div class="zs-controls">${select('zs-basis',[['x',"Show the first unit arrow"],['y',"Show the second unit arrow"],['both',"Show both unit arrows"]],c.shown,"Choose unit arrows to track")}</div>${basisDiagram(c.shown)}<div class="zs-formula-row">${matrixHTML(cartesianQuarterMatrix('xy'))}<span>The first column is (0,1); the second is (−1,0).<br>Each column records the new coordinates of its corresponding unit arrow.</span></div><p>Any (x,y) is x times the first unit arrow plus y times the second. Combining the two image columns gives (−y,x). Matrix columns depend on the chosen basis.</p>`;
  if(step==='trace')return `<p>The sum of the main diagonal entries is the trace. The trace of a representation matrix is the character of that representation for the operation. Specify the action space before assigning a character.</p><div class="zs-controls">${select('zs-space',[['xy',"Planar arrows only (x,y)"],['xyz',"Three-dimensional arrows (x,y,z)"]],c.space,"Choose the action space")}<button type="button" id="zs-action" class="primary">Show the 90° operation in this space</button></div>${c.applied?`<div class="zs-formula-row">${matrixHTML(cartesianQuarterMatrix(c.space))}<span>Diagonal sum:${c.space==='xy'?'0 + 0 = 0':'0 + 0 + 1 = 1'}</span></div><p>The same spatial rotation:${c.space==='xy'?"The two planar components contribute 0.":"The unchanged z component contributes an additional 1."}</p>`:"<p class=\"zs-empty\">Choose a space, then display the matrix.</p>"}<p>Character 0 does not mean no action: (1,0) still rotates to (0,1). Nor does it generally mean zero fixed sites; take the trace of the full matrix in the chosen representation.</p>`;
  return `<p>Six short checks connect geometry, coordinates, matrices, and characters. Continue according to your question; every path opens directly, without a progress lock.</p><div class="zs-controls">${select('zs-goal',[['',"Choose your goal first"],['geometry',"I want a systematic course on point groups and representations"],['spectra',"I want to understand water vibrations and spectroscopy"],['tools',"I have specific inputs and need a calculation tool"]],c.goal,"What would you like to do next?")}</div><div class="zs-next-grid">${continuations.map(([route,title,summary])=>`<a href="${route}"><strong>${title}</strong><span>${summary}</span></a>`).join('')}</div><p>If matrices still feel unfamiliar, revisit steps 3–5 before the first foundations lesson. The spectroscopy demonstration uses displacement representations; the theorem and space-group paths gradually introduce further prerequisites.</p>`;
 }
 function assessment(){const c=drafts[step],question={objects:"After the current operation, does the whole object coincide with its original state?",repeat:"What are the operation's order and the selected point's shortest return period?",coordinates:"Which coordinate rule describes a 90° counterclockwise rotation of any planar arrow?",matrix:"Which matrix has columns that correctly record the two unit arrows' new coordinates?",trace:"What is the character of this 90° operation in the selected action space?",next:"Which entry best matches the goal you selected?"}[step];
  const choices={objects:[['same',"All sites coincide with sites of the same type"],['changed',"At least one type or position does not match"]],repeat:[['4,4',"Operation order 4; point period 4"],['4,1',"Operation order 4; point period 1"],['1,1',"Operation order 1; point period 1"]],coordinates:[['ccw','(x,y) → (−y,x)'],['cw','(x,y) → (y,−x)'],['half','(x,y) → (−x,−y)']],matrix:[['correct',"First row 0, −1; second row 1, 0"],['reverse',"First row 0, 1; second row −1, 0"],['identity',"First row 1, 0; second row 0, 1"]],trace:[['0','0'],['1','1'],['2','2'],['3','3']],next:[['foundations',"Point groups and representations · First foundations lesson"],['water',"Water, infrared, and Raman"],['compute',"Calculation center"]]}[step];
  return `<section class="zs-check" aria-labelledby="zs-check-heading"><h3 id="zs-check-heading">Pause and check your explanation</h3>${select('zs-answer',[['',"Please select"],...choices],answers[step]||'',question)}<button type="button" id="zs-check" class="primary">Check this step</button><p id="zs-feedback" role="status" aria-live="polite" class="${progress.answers[step]?'zs-success':''}">${esc(feedback[step]||(progress.answers[step]?"This step's answer has been checked and saved on this device.":''))}</p></section>`;
 }
 function explanation(correct){const c=drafts[step];if(zeroStartExpectedAnswer(step,c)===null)return {objects:"Rotate the object first, then judge using its current colors and positions.",repeat:"Apply a rotation first, then compare the off-axis and on-axis points.",coordinates:"Display the rotated arrow first.",matrix:"Select Show both unit arrows first, then check the columns one at a time.",trace:"Display the operation matrix in the selected space first.",next:"Choose your current goal first."}[step];
  const reason={objects:!c.marked?"The four equivalent sites match one-to-one after any integer multiple of 90°.":c.turns===4?"Four 90° rotations return everything, including the type-B site, to the start.":"The outline matches, but the type-B site has moved to a different corner. This is not a symmetry of the typed object.",repeat:c.point==='axis'?"The operation still has order 4. The on-axis point stays fixed after every application, so its point period is 1.":"The off-axis point returns after four applications; the rotation's order is also 4.",coordinates:"The rightward (1,0) must rotate to the upward (0,1), giving the general rule (−y,x).",matrix:"The first column records the image (0,1) of (1,0); the second records the image (−1,0) of (0,1). Do not interchange rows and columns.",trace:c.space==='xy'?"The planar matrix has trace 0 + 0 = 0. It still rotates arrows; zero trace is not a zero transformation.":"The 3D matrix has trace 0 + 0 + 1 = 1. The final 1 comes from the unchanged z component.",next:"For systematic study, start with the first foundations lesson. For spectroscopy, open the water demonstration. For specific inputs, go to the calculation center."}[step];return (correct?"Your answer matches.":"Try again.")+reason;
 }
 function draw(){if(!current())return;const activeId=globalThis.document?.activeElement?.id;remember();const index=ids.indexOf(step),completed=ids.filter(id=>progress.answers[id]).length;
  host.innerHTML=`<header class="zs-intro"><span class="zs-kicker">Start from Zero · No prior matrices needed</span><h2 id="zs-heading" tabindex="-1">Explore first, then read the language of symmetry.</h2><p>Start with a square and an arrow. Six short steps connect you to the group-theory classroom. Jump freely; progress records checked answers, not course grades.</p><p class="zs-progress" role="status">Checked ${completed} / 6 steps · Current step ${index+1} / 6</p></header><nav class="zs-step-nav" aria-label="Introductory steps">${ZERO_START_STEPS.map((item,i)=>`<button type="button" data-zs-step="${item.id}" ${item.id===step?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span><strong>${item.title}</strong><small>${progress.answers[item.id]?"✓ Checked":"Open directly"}</small></button>`).join('')}</nav><article class="zs-panel"><h3>${index+1} · ${ZERO_START_STEPS[index].title}</h3><p class="zs-goal">This step: ${ZERO_START_STEPS[index].goal}</p>${body()}${assessment()}<div class="zs-step-actions">${index?"<button type=\"button\" id=\"zs-previous\" class=\"secondary\">← Previous step</button>":''}${index<5?"<button type=\"button\" id=\"zs-next\" class=\"primary\">Next step →</button>":"<a class=\"primary\" href=\"#classroom/foundations?lesson=group-basics\">Continue with the first foundations lesson →</a>"}</div></article><footer class="zs-footer"><p>Learning records stay in this browser. You can still use this page when storage is unavailable, and export a copy for yourself.</p><button type="button" id="zs-export" class="secondary">Export this path's check record</button><button type="button" id="zs-clear" class="secondary">Clear this path's record</button><a href="#classroom">View all lessons</a></footer>`;
  host.querySelectorAll('[data-zs-step]').forEach(button=>button.onclick=()=>advance(button.dataset.zsStep));
  if($('#zs-previous'))$('#zs-previous').onclick=()=>advance(ids[index-1]);if($('#zs-next'))$('#zs-next').onclick=()=>advance(ids[index+1]);
  $('#zs-answer').onchange=event=>{if(!current())return;const value=event.target.value;delete progress.answers[step];answers[step]=value;feedback[step]="Your answer changed; please check it again.";remember();draw();};
  $('#zs-check').onclick=()=>{if(!current())return;const c=drafts[step],choice=answers[step]||'',expected=zeroStartExpectedAnswer(step,c),correct=expected!==null&&choice===expected;progress=updateZeroStartProgress(progress,step,c,choice);feedback[step]=explanation(correct);remember();draw();};
  const c=drafts[step];
  if(step==='objects'){$('#zs-marked').onchange=e=>change({marked:e.target.value==='different',turns:0});$('#zs-action').onclick=()=>change({turns:c.turns===4?1:c.turns+1});$('#zs-reset-example').onclick=()=>change({turns:0});}
  if(step==='repeat'){$('#zs-point').onchange=e=>change({point:e.target.value,turns:0});$('#zs-action').onclick=()=>change({turns:c.turns===4?1:c.turns+1});$('#zs-reset-example').onclick=()=>change({turns:0});}
  if(step==='coordinates'){for(const key of ['x','y'])$('#zs-'+key).onchange=e=>{const value=Number(e.target.value);if(e.target.value.trim()===''||!integer(value,-2,2)){toast("Enter an integer from −2 to 2.");draw();return;}change({[key]:value,applied:false});};$('#zs-action').onclick=()=>change({applied:true});}
  if(step==='matrix')$('#zs-basis').onchange=e=>change({shown:e.target.value});
  if(step==='trace'){$('#zs-space').onchange=e=>change({space:e.target.value,applied:false});$('#zs-action').onclick=()=>change({applied:true});}
  if(step==='next')$('#zs-goal').onchange=e=>change({goal:e.target.value});
  $('#zs-export').onclick=()=>{if(!current())return;if(download)download(JSON.stringify({...report(),generatedAt:new Date().toISOString()},null,2),'symmetry-zero-start-record.json','application/json');else toast("Downloading is not available on this page.");};
  $('#zs-clear').onclick=()=>{if(!current())return;progress=fresh();drafts=copy(defaults);answers={};feedback={};remember();draw();};
  if(/^zs-[a-z0-9-]+$/.test(activeId||''))$('#'+activeId)?.focus?.({preventScroll:true});
 }
 draw();
}
