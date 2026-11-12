// A small geometric bridge before the existing representation courses.
export const ZERO_START_KEY='symmetry-lab.zero-start.progress.v1';
export const ZERO_START_STEPS=[
 {id:'objects',title:'什么叫对称？',goal:'检查整个对象，而不只看外轮廓。'},
 {id:'repeat',title:'重复一个动作',goal:'区分操作的阶和一个点的周期。'},
 {id:'coordinates',title:'用两个数说清位置',goal:'从箭头和坐标读出一次旋转。'},
 {id:'matrix',title:'矩阵是动作说明书',goal:'用两个单位箭头读懂矩阵的列。'},
 {id:'trace',title:'从矩阵到特征标',goal:'在指定的空间里，把对角线相加。'},
 {id:'next',title:'选择下一段路线',goal:'按照问题选择课程、演示或工具。'}
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
 return svg('正方形四个同类位置与一个不同类型的位置在旋转前后的比较',draw(130,0)+draw(390,context.turns)+svgText(130,38,'原来的对象','text-anchor="middle"')+svgText(390,38,'操作后的对象','text-anchor="middle"')+svgText(260,246,context.marked?'蓝点是 A 类，棕点是 B 类。类型也必须重合。':'四个蓝点都属于同一类。','text-anchor="middle"'));
}
function rotationDiagram(context){
 const point=context.point==='axis'?[0,0,1]:[1,0,1],last=rotateQuarter(point,context.turns),cx=260,cy=135,r=75;
 let body=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#c7d2da" stroke-dasharray="5 5"/>`+arrow(130,cy,390,cy,'#83929d',1)+arrow(cx,235,cx,35,'#83929d',1)+svgText(401,cy+6,'x')+svgText(cx+9,30,'y');
 for(let n=0;n<=context.turns;n++){const p=rotateQuarter(point,n);body+=`<circle cx="${cx+r*p[0]}" cy="${cy-r*p[1]}" r="${n===context.turns?10:5}" fill="${n===context.turns?'#a3611c':'#28628d'}"/>`;}
 return svg('固定 z=1 的点在 xy 平面投影中的四分之一圈旋转',body+svgText(24,28,'这里只画 xy 投影；z = 1 不变。')+svgText(260,263,'当前三维坐标 '+xyText(last),'text-anchor="middle"'));
}
function coordinateDiagram(context){
 const cx=260,cy=135,s=40,p=[context.x,context.y],out=rotateQuarter(p),shown=context.applied?out:p;
 let body=arrow(120,cy,400,cy,'#83929d',1)+arrow(cx,245,cx,25,'#83929d',1)+svgText(408,cy+6,'x')+svgText(cx+8,23,'y');
 for(let n=-2;n<=2;n++)if(n){body+=svgText(cx+n*s,cy+22,String(n),'text-anchor="middle"')+svgText(cx-15,cy-n*s+6,String(n),'text-anchor="end"');}
 if(context.applied)body+=arrow(cx,cy,cx+s*p[0],cy-s*p[1],'#b4c3ce',3);
 body+=arrow(cx,cy,cx+s*shown[0],cy-s*shown[1],context.applied?'#a3611c':'#28628d');
 return svg('坐标箭头：横向向右为正，纵向向上为正，比较逆时针旋转前后',body+svgText(260,268,(context.applied?'旋转后：':'旋转前：')+xyText(shown),'text-anchor="middle"'));
}
function basisDiagram(shown){
 const cx=260,cy=145,s=85;let body=arrow(105,cy,410,cy,'#83929d',1)+arrow(cx,252,cx,25,'#83929d',1);
 if(shown==='x'||shown==='both')body+=arrow(cx,cy,cx+s,cy,'#b8cbd9',3)+arrow(cx,cy,cx,cy-s,'#28628d')+svgText(cx+12,cy-s,'(1,0) → (0,1)');
 if(shown==='y'||shown==='both')body+=arrow(cx,cy,cx,cy-s,'#ddcbb5',3)+arrow(cx,cy,cx-s,cy,'#a3611c')+svgText(25,cy+34,'(0,1) → (−1,0)');
 return svg('矩阵的第一列和第二列分别记录两个单位箭头旋转后的坐标',body+svgText(260,267,'浅色：原箭头；深色：旋转后。','text-anchor="middle"'));
}
const continuations=[
 ['#classroom/foundations?lesson=group-basics','点群与表示 · 从第一课继续','用群的规则整理刚才的动作，再学习表示与约化。'],
 ['#classroom/foundations?module=demos&experiment=water','水分子、红外与拉曼','已有矩阵和特征标概念后，连接位移与光谱通道。'],
 ['#classroom/foundations?module=theorems&experiment=rearrangement','定理证明与应用','有表示基础后，沿 S₃ 检查重排、Schur 与正交关系。'],
 ['#classroom/crystal?track=space','晶体与空间群','在点群基础上加入周期平移、螺旋轴和滑移面。'],
 ['#compute','计算中心','已有具体任务时，直接检索工具与输入参数。']
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
  if(step==='objects')return `<p>把物体转一下，如果每个同类位置都能与原来重合，这个动作就是它的一个对称操作。颜色在这里表示类型，不能把 A 类位置与 B 类位置当成相同。</p><div class="zs-controls">${select('zs-marked',[['same','四个位置同类'],['different','把一个位置换成 B 类']],c.marked?'different':'same','选择对象')}<button type="button" id="zs-action" class="primary">逆时针转 90°</button><button type="button" id="zs-reset-example" class="secondary">回到原位</button></div><p class="zs-observation">已旋转 ${c.turns} 次，每次 90°。</p>${objectDiagram(c)}<p>只看外轮廓会漏掉类型信息。判断分子或晶体时，也必须保留元素种类和内部标记。</p>`;
  if(step==='repeat')return `<p>“什么也不改变”的动作叫单位操作。连续做四次 90° 旋转，整个坐标空间回到原样，因此这个旋转的阶是 4。一个恰在旋转轴上的点却每次都不动。</p><div class="zs-controls">${select('zs-point',[['general','离开旋转轴的点 (1,0,1)'],['axis','轴上的点 (0,0,1)']],c.point,'跟踪哪一个点？')}<button type="button" id="zs-action" class="primary">再做一次 90° 旋转</button><button type="button" id="zs-reset-example" class="secondary">重新跟踪</button></div><p class="zs-observation">已作用 ${c.turns} 次。比较：操作使所有点复原需要几次？所选这个点回到原处最少需要几次？</p>${rotationDiagram(c)}<p>点的最短返回次数叫这里的点周期。它可以小于操作的阶，不会改变操作本身的阶。</p>`;
  if(step==='coordinates')return `<p>从原点出发的箭头，用终点的两个数表示：先数 x（向右为正），再数 y（向上为正）。这些数叫这个箭头的坐标。</p><div class="zs-controls"><label for="zs-x">x 坐标</label><input id="zs-x" type="number" min="-2" max="2" step="1" value="${c.x}"><label for="zs-y">y 坐标</label><input id="zs-y" type="number" min="-2" max="2" step="1" value="${c.y}"><button type="button" id="zs-action" class="primary">把箭头逆时针转 90°</button></div>${coordinateDiagram(c)}${c.applied?`<p class="zs-calculation">${xyText([c.x,c.y])} → ${xyText(rotateQuarter([c.x,c.y]))}；新 x = −原 y，新 y = 原 x。</p>`:''}<p>旋转时转的是箭头，坐标轴不动。这叫主动操作。原点的零箭头旋转后仍是零，但不能只用这一个点判断整个操作。</p>`;
  if(step==='matrix')return `<p>先看向右的单位箭头 (1,0)，再看向上的单位箭头 (0,1)。只要知道它们各自转到哪里，就能拼出任意箭头旋转后的坐标。</p><div class="zs-controls">${select('zs-basis',[['x','查看第一个单位箭头'],['y','查看第二个单位箭头'],['both','同时查看两个单位箭头']],c.shown,'选择要跟踪的单位箭头')}</div>${basisDiagram(c.shown)}<div class="zs-formula-row">${matrixHTML(cartesianQuarterMatrix('xy'))}<span>第一列是 (0,1)，第二列是 (−1,0)。<br>每一列记录对应单位箭头的新坐标。</span></div><p>任意 (x,y) 都可以拆成 x 倍第一个单位箭头加 y 倍第二个。按这两列相加，就得到 (−y,x)。矩阵的列也随你选择的基底而定。</p>`;
  if(step==='trace')return `<p>矩阵左上到右下的数相加，叫“迹”。描述一个操作的表示矩阵，其迹叫该表示在这个操作上的特征标。先说明矩阵作用在哪个空间，才有确定的特征标。</p><div class="zs-controls">${select('zs-space',[['xy','只看平面箭头 (x,y)'],['xyz','看三维箭头 (x,y,z)']],c.space,'选择作用空间')}<button type="button" id="zs-action" class="primary">显示这个空间中的 90° 操作</button></div>${c.applied?`<div class="zs-formula-row">${matrixHTML(cartesianQuarterMatrix(c.space))}<span>对角线总和：${c.space==='xy'?'0 + 0 = 0':'0 + 0 + 1 = 1'}</span></div><p>同一个空间旋转：${c.space==='xy'?'平面中的两个分量贡献 0。':'z 分量保持不变，多贡献 1。'}</p>`:'<p class="zs-empty">选择一个空间，再显示矩阵。</p>'}<p>特征标 0 不等于没有动作：平面的 (1,0) 仍被转成 (0,1)。它也不等于“固定了零个位置”；一般要对所选表示的整个矩阵求迹。</p>`;
  return `<p>六个小检查把几何、坐标、矩阵和特征标连在一起。接下来可以按问题继续；任何路线都可直接打开，不需要等待进度解锁。</p><div class="zs-controls">${select('zs-goal',[['','先选择你的目标'],['geometry','我想系统学习点群与表示'],['spectra','我想看懂水分子的振动和光谱'],['tools','我已有具体输入，要找计算工具']],c.goal,'现在最想做什么？')}</div><div class="zs-next-grid">${continuations.map(([route,title,summary])=>`<a href="${route}"><strong>${title}</strong><span>${summary}</span></a>`).join('')}</div><p>如果矩阵还不熟，先回看第 3–5 步，再进入基础第一课。光谱演示需要位移表示；定理工坊和空间群路线还会逐步引入新的前置概念。</p>`;
 }
 function assessment(){const c=drafts[step],question={objects:'当前这次操作后，整个对象与原来是否重合？',repeat:'操作的阶、所选点的最短返回周期分别是多少？',coordinates:'对任意平面箭头，逆时针 90° 的坐标规则是哪一条？',matrix:'哪一个矩阵的两列正确记录了两个单位箭头的新坐标？',trace:'当前所选作用空间中，这个 90° 操作的特征标是多少？',next:'哪一个入口最符合你刚才选的目标？'}[step];
  const choices={objects:[['same','同类位置全部重合'],['changed','至少一个类型或位置不重合']],repeat:[['4,4','操作阶 4；点周期 4'],['4,1','操作阶 4；点周期 1'],['1,1','操作阶 1；点周期 1']],coordinates:[['ccw','(x,y) → (−y,x)'],['cw','(x,y) → (y,−x)'],['half','(x,y) → (−x,−y)']],matrix:[['correct','第一行 0, −1；第二行 1, 0'],['reverse','第一行 0, 1；第二行 −1, 0'],['identity','第一行 1, 0；第二行 0, 1']],trace:[['0','0'],['1','1'],['2','2'],['3','3']],next:[['foundations','点群与表示 · 基础第一课'],['water','水分子、红外与拉曼'],['compute','计算中心']]}[step];
  return `<section class="zs-check" aria-labelledby="zs-check-heading"><h3 id="zs-check-heading">停一下，核对你的解释</h3>${select('zs-answer',[['','请选择'],...choices],answers[step]||'',question)}<button type="button" id="zs-check" class="primary">核对这一步</button><p id="zs-feedback" role="status" aria-live="polite" class="${progress.answers[step]?'zs-success':''}">${esc(feedback[step]||(progress.answers[step]?'这一步的答案已核对并保存在本机。':''))}</p></section>`;
 }
 function explanation(correct){const c=drafts[step];if(zeroStartExpectedAnswer(step,c)===null)return {objects:'请先转动一次对象，再根据当前颜色和位置判断。',repeat:'请先作用一次旋转，再比较一般点与轴上的点。',coordinates:'请先显示箭头旋转后的结果。',matrix:'请先选择“同时查看两个单位箭头”，再逐列核对。',trace:'请先显示所选空间中的操作矩阵。',next:'请先选择你现在的目标。'}[step];
  const reason={objects:!c.marked?'四个同类位置经过 90° 的整数倍旋转可以一一重合。':c.turns===4?'四次 90° 回到原位，B 类位置也回到原处。':'外轮廓重合，但 B 类位置移动到了另一个角，所以不是这个带类型对象的对称。',repeat:c.point==='axis'?'整个操作的阶仍是 4；轴上的这个点每次都不动，点周期是 1。':'一般点做四次才返回；这个旋转操作的阶也是 4。',coordinates:'向右的 (1,0) 应转到向上的 (0,1)，所以一般规则是 (−y,x)。',matrix:'第一列记录 (1,0) 的像 (0,1)，第二列记录 (0,1) 的像 (−1,0)；不要把列和行对调。',trace:c.space==='xy'?'平面矩阵的迹是 0 + 0 = 0；矩阵仍将箭头旋转，零迹不是零变换。':'三维矩阵的迹是 0 + 0 + 1 = 1，最后的 1 来自不变的 z 分量。',next:'系统学习从基础第一课开始；光谱问题进入水分子演示；已有明确输入时进入计算中心。'}[step];return (correct?'核对一致。':'再试一次。')+reason;
 }
 function draw(){if(!current())return;const activeId=globalThis.document?.activeElement?.id;remember();const index=ids.indexOf(step),completed=ids.filter(id=>progress.answers[id]).length;
  host.innerHTML=`<header class="zs-intro"><span class="zs-kicker">零基础起步 · 无需先学矩阵</span><h2 id="zs-heading" tabindex="-1">先动手，再读懂对称性的语言。</h2><p>从一个正方形和一支箭头出发，用六个短步骤接上现有群论课堂。可以自由跳转；进度只记录已核对的答案，不代表课程成绩。</p><p class="zs-progress" role="status">已核对 ${completed} / 6 步 · 当前 ${index+1} / 6</p></header><nav class="zs-step-nav" aria-label="零基础起步步骤">${ZERO_START_STEPS.map((item,i)=>`<button type="button" data-zs-step="${item.id}" ${item.id===step?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span><strong>${item.title}</strong><small>${progress.answers[item.id]?'✓ 已核对':'可直接进入'}</small></button>`).join('')}</nav><article class="zs-panel"><h3>${index+1} · ${ZERO_START_STEPS[index].title}</h3><p class="zs-goal">这一小步：${ZERO_START_STEPS[index].goal}</p>${body()}${assessment()}<div class="zs-step-actions">${index?'<button type="button" id="zs-previous" class="secondary">← 上一步</button>':''}${index<5?'<button type="button" id="zs-next" class="primary">下一步 →</button>':'<a class="primary" href="#classroom/foundations?lesson=group-basics">继续基础第一课 →</a>'}</div></article><footer class="zs-footer"><p>学习记录只保存在当前浏览器；存储不可用时仍可操作本页。你可以导出记录自行保留。</p><button type="button" id="zs-export" class="secondary">导出这条路线的核对记录</button><button type="button" id="zs-clear" class="secondary">清空这条路线的记录</button><a href="#classroom">查看全部课程</a></footer>`;
  host.querySelectorAll('[data-zs-step]').forEach(button=>button.onclick=()=>advance(button.dataset.zsStep));
  if($('#zs-previous'))$('#zs-previous').onclick=()=>advance(ids[index-1]);if($('#zs-next'))$('#zs-next').onclick=()=>advance(ids[index+1]);
  $('#zs-answer').onchange=event=>{if(!current())return;const value=event.target.value;delete progress.answers[step];answers[step]=value;feedback[step]='答案已更改，请重新核对。';remember();draw();};
  $('#zs-check').onclick=()=>{if(!current())return;const c=drafts[step],choice=answers[step]||'',expected=zeroStartExpectedAnswer(step,c),correct=expected!==null&&choice===expected;progress=updateZeroStartProgress(progress,step,c,choice);feedback[step]=explanation(correct);remember();draw();};
  const c=drafts[step];
  if(step==='objects'){$('#zs-marked').onchange=e=>change({marked:e.target.value==='different',turns:0});$('#zs-action').onclick=()=>change({turns:c.turns===4?1:c.turns+1});$('#zs-reset-example').onclick=()=>change({turns:0});}
  if(step==='repeat'){$('#zs-point').onchange=e=>change({point:e.target.value,turns:0});$('#zs-action').onclick=()=>change({turns:c.turns===4?1:c.turns+1});$('#zs-reset-example').onclick=()=>change({turns:0});}
  if(step==='coordinates'){for(const key of ['x','y'])$('#zs-'+key).onchange=e=>{const value=Number(e.target.value);if(e.target.value.trim()===''||!integer(value,-2,2)){toast('请输入 −2 到 2 之间的整数。');draw();return;}change({[key]:value,applied:false});};$('#zs-action').onclick=()=>change({applied:true});}
  if(step==='matrix')$('#zs-basis').onchange=e=>change({shown:e.target.value});
  if(step==='trace'){$('#zs-space').onchange=e=>change({space:e.target.value,applied:false});$('#zs-action').onclick=()=>change({applied:true});}
  if(step==='next')$('#zs-goal').onchange=e=>change({goal:e.target.value});
  $('#zs-export').onclick=()=>{if(!current())return;if(download)download(JSON.stringify({...report(),generatedAt:new Date().toISOString()},null,2),'symmetry-zero-start-record.json','application/json');else toast('当前页面未提供下载功能。');};
  $('#zs-clear').onclick=()=>{if(!current())return;progress=fresh();drafts=copy(defaults);answers={};feedback={};remember();draw();};
  if(/^zs-[a-z0-9-]+$/.test(activeId||''))$('#'+activeId)?.focus?.({preventScroll:true});
 }
 draw();
}
