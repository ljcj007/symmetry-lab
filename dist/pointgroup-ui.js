import {crystalSpan} from './crystal-notation.js?v=20261030-symmetry1';
// A local, self-contained teaching surface. Calculations below are Cartesian
// matrix operations on the verified atlas, not a second crystallographic engine.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey = 'symmetry-lab.pointgroups.progress.v1';
const tabs = [['learn','学习路线'],['atlas','32 点群图谱'],['lab','对称操作实验'],['quiz','练习与自测']];
const state = {tab:'learn',lesson:0,group:null,search:'',system:'',operation:0,point:[.63,.37,.81],step:0,showOrbit:false,answers:{},quizLesson:'all',revision:0,timer:null};
let dataPromise, loaded;
try { const saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); if(saved&&typeof saved==='object'&&!Array.isArray(saved))state.answers=saved; } catch { /* Private browsing can disable storage. */ }
const persist = () => { try { localStorage.setItem(storageKey,JSON.stringify(state.answers)); } catch { /* Progress remains in memory. */ } };
const fmt = x => { const n=Number(x); return Number.isFinite(n)?(Math.abs(n)<1e-9?'0':Number(n.toFixed(5)).toString()):String(x??'—'); };
const character = value => {
  if(typeof value==='number')return fmt(value);
  if(typeof value==='string')return value;
  const re=Number(value?.re||0),im=Number(value?.im||0);
  if(Math.abs(im)<1e-8)return fmt(re);
  const imaginary=(Math.abs(Math.abs(im)-1)<1e-8?'':fmt(Math.abs(im)))+'i';
  return Math.abs(re)<1e-8?(im<0?'−':'')+imaginary:fmt(re)+(im<0?' − ':' + ')+imaginary;
};
const vector = p => '('+p.map(fmt).join(', ')+')';
const multiply = (m,p) => m.map(row=>row.reduce((v,x,i)=>v+x*p[i],0));
const transformed = (op,p,n) => { let q=p.slice(); for(let i=0;i<n;i++)q=multiply(op.matrix,q); return q; };
const unique = points => [...new Map(points.map(p=>[p.map(x=>Math.round(x*1e7)).join(','),p])).values()];
const orbit = (g,p) => unique(g.operations.map(op=>multiply(op.matrix,p)));
const safeIndex = (n,max) => Number.isInteger(Number(n))&&Number(n)>=0&&Number(n)<max?Number(n):0;
const selected = () => loaded?.atlas.groups.find(g=>String(g.id)===String(state.group))||loaded?.atlas.groups[0];
const stop = () => { if(state.timer!==null)clearTimeout(state.timer);state.timer=null; };
const groupName = g => `${g.hm} · ${g.schoenflies}`;
const irrepName = ir => ir.mulliken ? `${ir.mulliken} · ${ir.bcLabel||ir.label}` : ir.bcLabel||ir.label;
const irrepHTML = ir => ir.mulliken ? crystalSpan(ir.mulliken,'irrep')+' · '+crystalSpan(ir.bcLabel||ir.label,'irrep') : crystalSpan(ir.bcLabel||ir.label,'irrep');
const shortLessonTitle = lesson => String(lesson.title||'').replace(/^\d+\s*·\s*/,'');
const badges = g => `<div class="pg-badges"><span>${esc(g.system)}</span><span>|G| = ${esc(g.order)}</span><span>${g.centrosymmetric?'有反演中心':'无反演中心'}</span>${g.polar?'<span class="pg-badge-strong">极性点群</span>':''}${g.chiral?'<span class="pg-badge-strong">仅含正旋转</span>':''}</div>`;
const matrixHTML = matrix => `<div class="pg-matrix" aria-label="笛卡尔操作矩阵">${matrix.map(row=>row.map(x=>`<span>${esc(fmt(x))}</span>`).join('')).join('')}</div>`;
const questionKey = (lesson,i) => `${lesson.id}:${i}`;
const quizEntries = lessons => lessons.flatMap((lesson,li)=>(lesson.quiz||[]).map((quiz,qi)=>({lesson,li,quiz,qi,key:questionKey(lesson,qi)})));
const correctCount = entries => entries.filter(({quiz,key})=>state.answers[key]?.checked===true&&state.answers[key]?.selected===quiz.answer).length;

async function load() {
  if(!dataPromise)dataPromise=Promise.all(['pointgroup-lessons.json','pointgroup-atlas.json'].map(async file=>{
    const response=await fetch('./data/'+file);
    if(!response.ok)throw Error('教学数据未能载入（HTTP '+response.status+'）。');
    return response.json();
  })).then(([lessons,atlas])=>{
    if(!Array.isArray(lessons.lessons)||!Array.isArray(atlas.groups)||atlas.groups.length!==32)throw Error('教学数据格式不完整，请刷新后重试。');
    loaded={lessons,atlas};
    if(state.group===null){const initial=atlas.groups.find(g=>g.hm==='mm2'||g.schoenflies==='C2v')||atlas.groups[0];state.group=initial.id;state.operation=initial.generators?.[0]??0;}
    return loaded;
  }).catch(error=>{dataPromise=null;throw error;});
  return dataPromise;
}

export function getPointgroupResult() {
  if(!loaded)return null;
  const g=selected(),op=g.operations[safeIndex(state.operation,g.operations.length)];
  return {kind:'point-group-teaching',pointGroup:g,experiment:{coordinateConvention:'orthonormal Cartesian column vectors; r′ = R r',operation:op,initialPoint:state.point.slice(),applications:state.step,result:transformed(op,state.point,state.step),fullGroupOrbit:orbit(g,state.point)},source:loaded.lessons.source};
}

export async function renderPointgroupView({container,toast=()=>{},download=()=>{},openGroup=()=>{},selection={},onNavigate=()=>{},onLocation=()=>{}}) {
  stop();
  const revision=++state.revision;
  container.innerHTML='<div class="pg-page"><div class="pg-loading" role="status"><span class="spinner"></span>正在载入点群课程与图谱…</div></div>';
  const root=container.firstElementChild;
  const current=()=>revision===state.revision&&root.parentNode===container&&container.isConnected!==false;
  const $=selector=>root.querySelector(selector);
  let lessons,atlas;
  try { ({lessons,atlas}=await load()); } catch(error) {
    if(current()){root.innerHTML=`<div class="notice error" role="alert">${esc(error.message)}</div><button class="secondary pg-retry">重新载入</button>`;$('.pg-retry').onclick=()=>{if(current())return renderPointgroupView({container,toast,download,openGroup,selection,onNavigate,onLocation});};}
    return;
  }
  if(!current())return;
  if(selection.pathway||selection.tab){state.tab=tabs.some(([id])=>id===selection.tab)?selection.tab:'learn';state.lesson=Math.max(0,lessons.lessons.findIndex(item=>item.id===selection.lesson));if(selection.group)changeGroup(selection.group);if(state.tab==='quiz'&&selection.lesson)state.quizLesson=String(state.lesson);}
  const sync=()=>{onNavigate({tab:state.tab,lesson:lessons.lessons[state.lesson]?.id,group:String(state.group)});onLocation('学习中心 / 基础与表示 / '+shortLessonTitle(lessons.lessons[state.lesson]||{}));};
  const allQuestions=quizEntries(lessons.lessons);
  const source=lessons.source||{};
  const sourceText=[Array.isArray(source.authors)?source.authors.join('、'):source.authors,source.title,source.edition,source.publisher,source.year].filter(Boolean).join(' · ');
  const sourceDOI=String(source.doi||'').replace(/^https?:\/\/doi\.org\//,'');
  const sourceLink=/^10\.\d{4,9}\/[\w./();:+-]+$/i.test(sourceDOI)?` <a href="https://doi.org/${esc(sourceDOI)}" target="_blank" rel="noreferrer">出版信息 ↗</a>`:'';
  const sourceHTML=()=>`<details class="pg-source"><summary>参考书与使用约定</summary><p>${esc(sourceText)}${sourceLink}</p><p>${esc(source.referenceNote||'教学内容以自己的语言组织，章节页码用于定位参考书；图谱和交互实验由本项目生成。')}</p><p>图谱讲解三维晶体的 32 个普通点群与单值表示，不含磁点群和自旋双群。点群操作没有平移部分；进入工作台时使用代表空间群的 Γ 点。</p></details>`;
  function navigate(tab) { stop();state.tab=tab;if(tab==='quiz')state.quizLesson=String(state.lesson);draw();sync();$('.pg-content')?.focus({preventScroll:true}); }
  function changeGroup(id) { const g=atlas.groups.find(g=>String(g.id)===String(id))||atlas.groups[0];state.group=g.id;state.operation=g.generators?.[0]??0;state.step=0;stop(); }
  function draw() {
    if(!current()){stop();return;}
    const progress=correctCount(allQuestions);
    root.innerHTML=`<section class="pg-intro"><div><span class="pg-kicker">从几何变换到物理选择定则</span><h2>看见对称性，读懂表示。</h2><p>${esc(lessons.subtitle||'以 32 个晶体点群为线索，连接群论、特征标与晶体物理。')}</p></div><div class="pg-intro-stats" aria-label="课程概要"><div><strong>32</strong><span>晶体点群</span></div><div><strong>${lessons.lessons.length}</strong><span>学习单元</span></div><div><strong>${progress}<small> / ${allQuestions.length}</small></strong><span>自测已掌握</span></div></div></section>
      ${selection.embeddedOnly||selection.atlasOnly?'':`<div class="pg-tabs" role="tablist" aria-label="点群教学栏目">${tabs.map(([id,title])=>`<button id="pg-tab-${id}" type="button" role="tab" aria-controls="pg-content" aria-selected="${state.tab===id}" tabindex="${state.tab===id?'0':'-1'}" data-pg-tab="${id}">${title}</button>`).join('')}</div>`}
      ${state.tab!=='learn'&&!selection.embeddedOnly&&!selection.atlasOnly?`<div class="classroom-study-context"><strong>当前单元：${esc(shortLessonTitle(lessons.lessons[state.lesson]))}</strong><button type="button" id="pg-return-lesson">返回讲解</button><button type="button" id="pg-context-quiz">本节练习</button></div>`:''}<div class="pg-content" id="pg-content" role="tabpanel" aria-labelledby="pg-tab-${state.tab}" tabindex="-1"></div>${sourceHTML()}`;
    if($('#pg-return-lesson'))$('#pg-return-lesson').onclick=()=>navigate('learn');if($('#pg-context-quiz'))$('#pg-context-quiz').onclick=()=>navigate('quiz');
    root.querySelectorAll('[data-pg-tab]').forEach(button=>{
      button.onclick=()=>navigate(button.dataset.pgTab);
      button.onkeydown=e=>{
        const index=tabs.findIndex(([id])=>id===state.tab);
        let next;
        if(e.key==='ArrowRight')next=(index+1)%tabs.length;
        if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
        if(e.key==='Home')next=0;
        if(e.key==='End')next=tabs.length-1;
        if(next!==undefined){e.preventDefault();navigate(tabs[next][0]);$('#pg-tab-'+state.tab).focus();}
      };
    });
    if(state.tab==='learn')drawLearn();
    if(state.tab==='atlas')drawAtlas();
    if(state.tab==='lab')drawLab();
    if(state.tab==='quiz')drawQuiz();
  }
  function drawLearn() {
    state.lesson=safeIndex(state.lesson,lessons.lessons.length);
    const lesson=lessons.lessons[state.lesson];
    $('.pg-content').innerHTML=`<div class="classroom-chapter-picker"><label>基础与表示 · 选择单元<select id="pg-chapter-select">${lessons.lessons.map((item,i)=>`<option value="${i}" ${state.lesson===i?'selected':''}>${esc(item.title)}</option>`).join('')}</select></label><button type="button" class="secondary" id="pg-chapter-lab">进入演示 →</button></div><div class="pg-learn-layout"><aside class="pg-lesson-nav" aria-label="课程目录"><p class="pg-label">循序渐进 · 学习路线</p>${lessons.lessons.map((item,i)=>{
      const entries=quizEntries([item]),complete=entries.length>0&&correctCount(entries)===entries.length;
      return `<button type="button" class="${i===state.lesson?'active':''}" data-lesson="${i}" ${i===state.lesson?'aria-current="step"':''}><span class="pg-lesson-number">${String(i+1).padStart(2,'0')}</span><span>${esc(shortLessonTitle(item))}<small>${complete?'✓ 自测已掌握':esc(item.summary||'')}</small></span></button>`;
    }).join('')}</aside><article class="pg-lesson"><div class="pg-lesson-heading"><span class="pg-kicker">单元 ${String(state.lesson+1).padStart(2,'0')} / ${lessons.lessons.length}</span><h2>${esc(lesson.title)}</h2><p>${esc(lesson.summary||'')}</p></div>
      ${(lesson.objectives||[]).length?`<div class="pg-objectives"><h3>学完这一节，你能</h3><ul>${lesson.objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
      ${(lesson.sections||[]).map((section,i)=>`<section class="pg-lesson-section"><h3><span>${String(i+1).padStart(2,'0')}</span>${esc(section.title)}</h3>${(section.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${section.formula?`<pre class="pg-formula">${esc(section.formula)}</pre>`:''}</section>`).join('')}
      ${lesson.example?`<section class="pg-worked"><span class="pg-kicker">一步一步推演</span><h3>${esc(lesson.example.title)}</h3><ol>${(lesson.example.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="pg-example-result">${esc(lesson.example.result)}</p></section>`:''}
      ${lesson.pitfall?`<aside class="pg-pitfall"><strong>容易混淆的地方</strong><p>${esc(lesson.pitfall)}</p></aside>`:''}
      <div class="pg-reference"><strong>参考阅读</strong>${(lesson.references||[]).map(ref=>`<span>${esc(ref.chapter)}${ref.printedPages?' · 书页 '+esc(ref.printedPages):''}${ref.pdfPages?' · PDF 页 '+esc(ref.pdfPages):''}</span>`).join('')}</div>
      <div class="pg-lesson-actions"><button type="button" class="secondary" id="pg-lesson-quiz">本节自测 →</button><button type="button" class="secondary" id="pg-lesson-lab">动手操作对称变换</button>${state.lesson+1<lessons.lessons.length?'<button type="button" class="primary" id="pg-next-lesson">下一单元 →</button>':''}</div></article></div>`;
    $('#pg-chapter-select').onchange=e=>{state.lesson=Number(e.target.value);drawLearn();sync();};$('#pg-chapter-lab').onclick=()=>navigate('lab');
    root.querySelectorAll('[data-lesson]').forEach(button=>button.onclick=()=>{state.lesson=Number(button.dataset.lesson);drawLearn();sync();$('.pg-lesson h2')?.scrollIntoView({block:'nearest'});});
    $('#pg-lesson-quiz').onclick=()=>{state.quizLesson=String(state.lesson);navigate('quiz');};
    $('#pg-lesson-lab').onclick=()=>navigate('lab');
    if($('#pg-next-lesson'))$('#pg-next-lesson').onclick=()=>{state.lesson++;drawLearn();sync();$('.pg-lesson h2')?.scrollIntoView({block:'nearest'});};
  }
  function filteredGroups() {
    const search=state.search.trim().toLowerCase().replace(/[\s_{}]/g,'');
    return atlas.groups.filter(g=>(!state.system||g.system===state.system)&&(!search||[g.hm,g.schoenflies,g.system,g.summary].some(value=>String(value||'').toLowerCase().replace(/[\s_{}]/g,'').includes(search))));
  }
  function drawAtlas() {
    $('.pg-content').innerHTML=`<div class="pg-atlas-controls"><label>按符号或名称查找<input id="pg-search" type="search" placeholder="例如 mm2、C2v、立方" value="${esc(state.search)}" autocomplete="off"></label><label>晶系<select id="pg-system"><option value="">全部晶系</option>${[...new Set(atlas.groups.map(g=>g.system))].map(system=>`<option ${state.system===system?'selected':''}>${esc(system)}</option>`).join('')}</select></label></div><p class="pg-filter-summary" id="pg-filter-summary" role="status"></p><div class="pg-group-cards" id="pg-group-cards"></div><section class="pg-group-detail" id="pg-group-detail" aria-label="所选点群详情"></section>`;
    $('#pg-search').oninput=e=>{state.search=e.target.value;drawCards();};
    $('#pg-system').onchange=e=>{state.system=e.target.value;drawCards();};
    drawCards();
    drawGroupDetail();
  }
  function drawCards() {
    const groups=filteredGroups();
    $('#pg-filter-summary').textContent=`显示 ${groups.length} / 32 个点群 · 点击卡片查看特征标与物理基函数`;
    $('#pg-group-cards').innerHTML=groups.length?groups.map(g=>`<button type="button" class="pg-group-card ${g.id===selected().id?'selected':''}" data-pg-group="${g.id}" aria-pressed="${g.id===selected().id}"><span class="pg-card-top"><strong>${crystalSpan(g.hm,'hm')}</strong><span>${crystalSpan(g.schoenflies,'schoenflies')}</span></span><span class="pg-card-bottom">${esc(g.system)}<span>阶 ${g.order}</span></span></button>`).join(''):'<p class="pg-no-results">没有符合条件的点群。可试试 Hermann–Mauguin 符号（如 4mm）或 Schoenflies 符号（如 C4v）。</p>';
    root.querySelectorAll('[data-pg-group]').forEach(button=>button.onclick=()=>{changeGroup(button.dataset.pgGroup);drawCards();drawGroupDetail();sync();$('#pg-group-detail').scrollIntoView({block:'start',behavior:'instant'});});
  }
  function drawGroupDetail() {
    const g=selected();
    const basis = (ir,kind) => Array.isArray(ir.basis?.[kind])?ir.basis[kind].join(', '):'';
    const generatorLabels=(g.generators||[]).map(index=>g.operations[index]?.label).filter(Boolean);
    $('#pg-group-detail').innerHTML=`<div class="pg-detail-heading"><div><span class="pg-kicker">POINT GROUP ${esc(g.id)}</span><h2>${crystalSpan(g.hm,'hm')} <span>${crystalSpan(g.schoenflies,'schoenflies')}</span></h2><p>${esc(g.summary||'')}</p>${badges(g)}</div><div class="pg-detail-actions"><button type="button" class="primary" id="pg-to-lab">在实验中观察 →</button><button type="button" class="secondary" id="pg-to-workbench">代表空间群 #${g.representativeSG} · Γ →</button><button type="button" class="pg-text-button" id="pg-export">↓ 导出此点群 JSON</button></div></div>
      <h3>特征标表 <span class="pg-inline-note">复不可约表示 · 单值</span></h3><p class="pg-muted">列为共轭类，列名下方给出类中操作数；E 列的特征标就是表示维数。Mulliken 常用名与 BC 的 Γ 标签并列显示；Γ 标签对应代表空间群 #${g.representativeSG} 的 Γ 点，可进入工作台核对。Mulliken 名称采用此 BC 轴设置。</p>
      <div class="pg-table-wrap" tabindex="0" role="region" aria-label="可横向滚动的特征标表"><table class="pg-character-table"><caption class="sr-only">${esc(groupName(g))} 的单值特征标表</caption><thead><tr><th scope="col">Mulliken · BC</th><th scope="col">维数</th>${g.classes.map(c=>`<th scope="col">${crystalSpan(c.label,'operation')}<small>${c.size} 个操作</small></th>`).join('')}<th scope="col">极向量<br><small>(x, y, z)</small></th><th scope="col">轴向量<br><small>(Rₓ, Rᵧ, R𝓏)</small></th><th scope="col">二次函数<br><small>对称二阶张量</small></th></tr></thead><tbody>${g.irreps.map(ir=>`<tr><th scope="row">${irrepHTML(ir)}${ir.conjugateLabel&&ir.conjugateLabel!==ir.label?`<small>共轭 ${crystalSpan(ir.conjugateLabel,'irrep')}</small>`:''}</th><td>${ir.dimension}</td>${ir.characters.map(c=>`<td>${esc(character(c))}</td>`).join('')}<td>${esc(ir.vectorMultiplicity??0)}${basis(ir,'vector')?`<small>${esc(basis(ir,'vector'))}</small>`:''}</td><td>${esc(ir.axialMultiplicity??0)}${basis(ir,'axial')?`<small>${esc(basis(ir,'axial'))}</small>`:''}</td><td>${esc(ir.quadraticMultiplicity??0)}${basis(ir,'quadratic')?`<small>${esc(basis(ir,'quadratic'))}</small>`:''}</td></tr>`).join('')}</tbody></table></div>
      <div class="pg-detail-notes"><div><h4>从表到选择定则</h4><p>后三列的整数是该不可约表示在极向量、轴向量、对称二阶张量中的重数，不是维数。极向量重数大于 0 对应电偶极 IR 对称性允许；二次函数重数大于 0 对应常规非共振 Raman 对称性允许。</p></div><div><h4>“允许”不等于一定有谱峰</h4><p>还需将具体晶体的振动表示约化并排除声学模。谱峰强度取决于偶极矩或极化率对该模的导数。中心对称晶体的 Γ 点振动满足通常的 IR / Raman 互斥规则。</p></div></div>
      <div class="pg-selection-grid">${g.irreps.map(ir=>`<div><strong>${irrepHTML(ir)}</strong><span>${ir.irActive?'IR 允许':'IR 不允许'}</span><span>${ir.ramanActive?'Raman 允许':'Raman 不允许'}</span>${ir.physicalPair?.length?`<small>实物理组合：${Array.isArray(ir.physicalPair)?ir.physicalPair.map(label=>crystalSpan(label,'irrep')).join(' ⊕ '):crystalSpan(ir.physicalPair,'irrep')}</small>`:''}</div>`).join('')}</div>
      ${g.irreps.some(ir=>ir.characters.some(c=>Math.abs(c?.im||0)>1e-8))?'<p class="pg-callout">这张表含复特征标。互为复共轭的表示各占一行；描述实位移等实物理量时通常将它们成对组合。基函数若跨越共轭两行，按完整成对空间理解，不能将两行重复计数为两个独立的实二维空间。</p>':''}
      <details class="pg-class-details"><summary>共轭类、坐标约定与验证</summary><p>${esc(g.coordinateConvention||'操作矩阵在正交笛卡尔坐标中作用于列向量：r′ = Rr。')} 图示使用 r′ = Rr；函数基的表示约定为 f(r) → f(R⁻¹r)，复函数的共轭标签据此区分。不能直接把这里的笛卡尔矩阵当作 BC 分数坐标矩阵。</p><p><strong>一组生成元：</strong>${(generatorLabels.length?generatorLabels:['E']).map(name=>crystalSpan(name,'operation')).join('，')}。重复复合这些操作可得到整个点群。</p><div class="pg-class-list">${g.classes.map(c=>`<span><b>${crystalSpan(c.label,'operation')}</b> · ${c.size} 个操作</span>`).join('')}</div><p>特征标正交性最大误差：${esc(Number(g.characterOrthogonalityError||0).toExponential(2))}。非整数特征标在页面显示到小数点后五位，JSON 保留数据精度。</p></details>`;
    $('#pg-to-lab').onclick=()=>navigate('lab');
    $('#pg-to-workbench').onclick=()=>{stop();openGroup(g.representativeSG);};
    $('#pg-export').onclick=()=>{download(JSON.stringify(getPointgroupResult(),null,2),`pointgroup-${g.id}.json`);toast('已导出点群数据与当前实验');};
  }
  function labSVG(g,op) {
    // Fit every image of the point, including slider extrema, inside the axes.
    const extent=orbit(g,state.point);
    const maxX=Math.max(1.3,...extent.map(p=>Math.abs(.82*p[0]-.57*p[1])));
    const maxY=Math.max(1.1,...extent.map(p=>Math.abs(.31*p[0]+.45*p[1]-.85*p[2])));
    const scale=Math.min(140,230/maxX,145/maxY);
    const projection=p=>[280+scale*(.82*p[0]-.57*p[1]),205+scale*(.31*p[0]+.45*p[1]-.85*p[2])];
    const line=(a,b,attrs)=>{const p=projection(a),q=projection(b);return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" ${attrs}/>`;};
    const dot=(p,r,attrs)=>{const q=projection(p);return `<circle cx="${q[0]}" cy="${q[1]}" r="${r}" ${attrs}/>`;};
    const label=(p,text,attrs='')=>{const q=projection(p);return `<text x="${q[0]+12}" y="${q[1]-10}" ${attrs}>${esc(text)}</text>`;};
    const points=Array.from({length:op.order},(_,i)=>transformed(op,state.point,i));
    const completed=Math.min(state.step,op.order),currentPoint=transformed(op,state.point,state.step);
    let axes='';
    for(let i=0;i<3;i++){const a=[0,0,0],b=[0,0,0];a[i]=-1.2;b[i]=1.28;axes+=line(a,b,'class="pg-axis" marker-end="url(#pg-axis-arrow)"')+label(b,'xyz'[i],'class="pg-axis-label"');}
    return `<svg viewBox="0 0 560 410" role="img" aria-label="${esc(op.label)} 对点的作用，已施加 ${state.step} 次；当前坐标 ${esc(vector(currentPoint))}"><defs><marker id="pg-axis-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#8aa598"/></marker></defs><path d="M${projection([1,1,0]).join(' ')} L${projection([-1,1,0]).join(' ')} L${projection([-1,-1,0]).join(' ')} L${projection([1,-1,0]).join(' ')} Z" class="pg-xy-plane"/>${axes}${state.showOrbit?orbit(g,state.point).map(p=>dot(p,4,'class="pg-orbit-dot"')).join(''):''}${points.map(p=>dot(p,5,'class="pg-cycle-dot"')).join('')}${Array.from({length:completed},(_,i)=>line(points[i%op.order],points[(i+1)%op.order],'class="pg-trail"')).join('')}${line([0,0,0],currentPoint,'class="pg-current-ray"')}${dot(state.point,9,'class="pg-initial-dot"')}${dot(currentPoint,6,'class="pg-current-dot"')}${label(state.point,'p₀','class="pg-point-label"')}${state.step%op.order!==0?label(currentPoint,'p'+state.step,'class="pg-point-label pg-current-label"'):''}<text x="22" y="34" class="pg-svg-caption">正交笛卡尔坐标 · 三维斜投影</text><text x="22" y="386" class="pg-svg-caption">点的连线表示连续作用，不是原子的运动轨迹。</text></svg>`;
  }
  function drawLab() {
    const g=selected();
    state.operation=safeIndex(state.operation,g.operations.length);
    const op=g.operations[state.operation];
    $('.pg-content').innerHTML=`<div class="pg-lab-heading"><div><h2>一个操作，连续做几次？</h2><p>选择操作，观察 r → Rr → R²r。点会回到原处，但点的周期未必等于操作的阶。</p></div><button type="button" class="secondary" id="pg-lab-atlas">查看 ${crystalSpan(g.hm,'hm')} 的特征标表 →</button></div><div class="pg-lab-layout"><section class="pg-lab-controls"><label>点群<select id="pg-lab-group">${atlas.groups.map(item=>`<option value="${item.id}" ${item.id===g.id?'selected':''}>${esc(groupName(item))} · ${esc(item.system)}</option>`).join('')}</select></label><label>对称操作<select id="pg-lab-operation">${g.operations.map((item,i)=>`<option value="${i}" ${i===state.operation?'selected':''}>${esc(item.label)} · 阶 ${item.order}${Number(item.det)<0?' · 反向':''}</option>`).join('')}</select></label><div class="pg-operation-info"><span>当前操作 <b>${crystalSpan(op.label,'operation')}</b></span><span>det R = <b>${esc(fmt(op.det))}</b></span><span>操作阶 <b>${op.order}</b></span><span>${Number(op.det)>0?'保持取向':'改变取向'}</span></div><div class="pg-equation"><span>r′ =</span>${matrixHTML(op.matrix)}<span>r</span></div><p class="pg-small">每一列是相应单位基向量变换后的坐标。det R = −1 可以对应镜面、反演或旋转反演。</p><fieldset class="pg-point-inputs"><legend>初始点 p₀</legend>${state.point.map((value,i)=>`<label><span>${'xyz'[i]} = <output id="pg-point-value-${i}">${fmt(value)}</output></span><input id="pg-point-${i}" type="range" min="-1" max="1" step="0.01" value="${value}" aria-label="初始点 ${'xyz'[i]} 坐标"></label>`).join('')}</fieldset><div class="pg-point-presets"><button type="button" data-point="generic">一般位置</button><button type="button" data-point="axis">x 轴上</button><button type="button" data-point="plane">xy 平面内</button></div><label class="pg-check"><input type="checkbox" id="pg-full-orbit" ${state.showOrbit?'checked':''}> 同时显示整个点群生成的点轨道</label></section><section class="pg-lab-visual"><div class="pg-svg-wrap" id="pg-lab-svg">${labSVG(g,op)}</div><div class="pg-svg-legend"><span><i class="initial"></i>初始点</span><span><i class="current"></i>当前点</span><span><i class="cycle"></i>此操作生成的点</span>${state.showOrbit?'<span><i class="orbit"></i>整个点群的点轨道</span>':''}</div><div class="pg-lab-actions"><button type="button" class="primary" id="pg-apply">施加一次 R →</button><button type="button" class="secondary" id="pg-play">演示完整一周</button><button type="button" class="secondary" id="pg-reset">重置</button></div><div id="pg-lab-status" class="pg-lab-status" aria-live="polite"></div></section></div><aside class="pg-callout"><strong>操作、子群和点轨道是三个概念。</strong> 反复施加一个操作 R 得到循环子群 ⟨R⟩；施加点群的所有操作得到点的完整轨道。落在对称轴或镜面上的特殊点可能被多个操作保持不动，因此轨道中的点数可以小于群阶。</aside>`;
    $('#pg-lab-atlas').onclick=()=>navigate('atlas');
    $('#pg-lab-group').onchange=e=>{changeGroup(e.target.value);drawLab();};
    $('#pg-lab-operation').onchange=e=>{stop();state.operation=Number(e.target.value);state.step=0;drawLab();};
    state.point.forEach((_,i)=>{$('#pg-point-'+i).oninput=e=>{stop();state.point[i]=Number(e.target.value);state.step=0;$('#pg-point-value-'+i).textContent=fmt(state.point[i]);refreshLab();};});
    root.querySelectorAll('[data-point]').forEach(button=>button.onclick=()=>{stop();state.point=button.dataset.point==='axis'?[1,0,0]:button.dataset.point==='plane'?[.63,.37,0]:[.63,.37,.81];state.step=0;drawLab();});
    $('#pg-full-orbit').onchange=e=>{state.showOrbit=e.target.checked;drawLab();};
    $('#pg-apply').onclick=()=>{stop();state.step=(state.step%op.order)+1;refreshLab();};
    $('#pg-reset').onclick=()=>{stop();state.step=0;refreshLab();};
    $('#pg-play').onclick=()=>{
      if(state.timer!==null){stop();refreshLab();return;}
      state.step=0;
      if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches){state.step=op.order;refreshLab();return;}
      const tick=()=>{if(!current()||state.tab!=='lab'){stop();return;}state.step++;if(state.step<op.order)state.timer=setTimeout(tick,750);else state.timer=null;refreshLab();};
      state.timer=setTimeout(tick,550);refreshLab();
    };
    refreshLab();
  }
  function refreshLab() {
    if(!current()||state.tab!=='lab'){stop();return;}
    const g=selected(),op=g.operations[state.operation],p=transformed(op,state.point,state.step);
    const pointPeriod=Array.from({length:op.order},(_,i)=>i+1).find(n=>transformed(op,state.point,n).every((x,i)=>Math.abs(x-state.point[i])<1e-7))||op.order;
    const fullOrbit=orbit(g,state.point);
    $('#pg-lab-svg').innerHTML=labSVG(g,op);
    $('#pg-play').textContent=state.timer!==null?'暂停演示':'演示完整一周';
    $('#pg-lab-status').innerHTML=`<div class="pg-coordinate-line"><span>初始 p₀</span><code>${esc(vector(state.point))}</code></div><div class="pg-coordinate-line"><span>R<sup>${state.step}</sup>p₀</span><code>${esc(vector(p))}</code></div><div class="pg-cycle-stats"><span>已施加 <b>${state.step}</b> 次</span><span>此点周期 <b>${pointPeriod}</b></span><span>完整点轨道 <b>${fullOrbit.length}</b> / |G| = ${g.order}</span></div><p>${state.step>0&&state.step%pointPeriod===0?'✓ 当前点回到了初始位置。':`继续施加操作，观察第 ${pointPeriod} 次是否回到初始位置。`}${pointPeriod<op.order?' 此点处于特殊位置；点的周期小于操作的阶。':''}</p>`;
  }
  function drawQuiz() {
    const entries=state.quizLesson==='all'?allQuestions:allQuestions.filter(x=>String(x.li)===state.quizLesson);
    const score=correctCount(allQuestions);
    $('.pg-content').innerHTML=`<div class="pg-quiz-heading"><div><h2>把“看懂了”变成“会判断”</h2><p>先选答案，再检查推理。进度保存在此浏览器中，可以反复练习。</p></div><div class="pg-progress"><strong>${score} <span>/ ${allQuestions.length}</span></strong><label for="pg-progress-bar">已答对的题目</label><progress id="pg-progress-bar" value="${score}" max="${Math.max(1,allQuestions.length)}"></progress></div></div><div class="pg-quiz-filter"><label>练习范围<select id="pg-quiz-lesson"><option value="all">全部单元</option>${lessons.lessons.map((lesson,i)=>`<option value="${i}" ${state.quizLesson===String(i)?'selected':''}>${i+1}. ${esc(shortLessonTitle(lesson))}</option>`).join('')}</select></label><button type="button" class="pg-text-button" id="pg-clear-progress">重置练习记录</button></div><div class="pg-quizzes">${entries.map(({lesson,li,quiz,qi,key},index)=>{
      const answer=state.answers[key],checked=answer?.checked===true,right=checked&&answer.selected===quiz.answer;
      return `<article class="pg-question ${checked?right?'is-correct':'is-incorrect':''}" id="pg-q-${li}-${qi}"><span class="pg-kicker">${esc(lesson.title)} · 第 ${qi+1} 题</span><fieldset><legend>${esc(quiz.question)}</legend>${quiz.choices.map((choice,ci)=>`<label class="pg-answer ${checked&&ci===quiz.answer?'correct-choice':''}"><input type="radio" name="pg-answer-${li}-${qi}" value="${ci}" data-question="${esc(key)}" ${answer?.selected===ci?'checked':''}><span class="pg-choice-letter">${String.fromCharCode(65+ci)}</span><span>${esc(choice)}</span></label>`).join('')}</fieldset><button type="button" class="secondary pg-check-answer" data-check="${esc(key)}" ${Number.isInteger(answer?.selected)?'':'disabled'}>${checked?'再次检查':'检查答案'}</button><div class="pg-answer-feedback" aria-live="polite">${checked?`<strong>${right?'✓ 回答正确':'再想一想'} · 正确选项 ${String.fromCharCode(65+quiz.answer)}</strong><p>${esc(quiz.explanation)}</p><button type="button" class="pg-text-button" data-review="${li}">返回这一节复习 →</button>`:''}</div></article>`;
    }).join('')}</div>`;
    $('#pg-quiz-lesson').onchange=e=>{state.quizLesson=e.target.value;drawQuiz();};
    $('#pg-clear-progress').onclick=()=>{state.answers={};persist();draw();toast('练习记录已重置');};
    root.querySelectorAll('[data-question]').forEach(input=>input.onchange=e=>{const key=e.target.dataset.question;state.answers[key]={selected:Number(e.target.value),checked:false};persist();const article=e.target.closest('.pg-question');article.classList.remove('is-correct','is-incorrect');article.querySelectorAll('.correct-choice').forEach(el=>el.classList.remove('correct-choice'));article.querySelector('.pg-check-answer').disabled=false;article.querySelector('.pg-check-answer').textContent='检查答案';article.querySelector('.pg-answer-feedback').innerHTML='';});
    root.querySelectorAll('[data-check]').forEach(button=>button.onclick=()=>{const key=button.dataset.check,entry=allQuestions.find(q=>q.key===key);if(!entry||!Number.isInteger(state.answers[key]?.selected))return;state.answers[key].checked=true;persist();const id=`pg-q-${entry.li}-${entry.qi}`;draw();$('#'+id+' .pg-check-answer')?.focus({preventScroll:true});});
    root.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>{state.lesson=Number(button.dataset.review);navigate('learn');});
  }
  draw();
}
