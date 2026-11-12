import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {matrixBridgeHTML,bindMatrixBridge} from './matrix-bridges.js?v=20261113-flow1';
import {renderChoiceFeedback,bindChoiceFeedback} from './learning-feedback.js?v=20261113-flow1';
// A local, self-contained teaching surface. Calculations below are Cartesian
// matrix operations on the verified atlas, not a second crystallographic engine.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inlineMath=(tex,source=tex)=>`<span class="sl-math" data-math-source="${esc(source)}">${mathHTML(tex)}</span>`;
const storageKey = 'symmetry-lab.pointgroups.progress.v1';
const tabs = [['learn',"Learning path"],['atlas',"32 point-group atlas"],['lab',"Symmetry operations"],['quiz',"Exercises and self-checks"]];
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
// Native options cannot host TeX; use the equivalent H–M symbol with real bars.
const nativeHm = source => String(source).replace(/[-−]([1346])/g,'$1̄');
const irrepName = ir => ir.mulliken ? `${ir.mulliken} · ${ir.bcLabel||ir.label}` : ir.bcLabel||ir.label;
const irrepHTML = ir => ir.mulliken ? crystalSpan(ir.mulliken,'irrep')+' · '+crystalSpan(ir.bcLabel||ir.label,'irrep') : crystalSpan(ir.bcLabel||ir.label,'irrep');
const shortLessonTitle = lesson => String(lesson.title||'').replace(/^\d+\s*·\s*/,'');
const badges = g => `<div class="pg-badges"><span>${esc(g.system)}</span><span>|G| = ${esc(g.order)}</span><span>${g.centrosymmetric?"has an inversion center":"No inversion center"}</span>${g.polar?"<span class=\"pg-badge-strong\">polarity point group</span>":''}${g.chiral?"<span class=\"pg-badge-strong\">only includes forward rotation</span>":''}</div>`;
const matrixHTML = matrix => `<div class="pg-matrix" aria-label="Cartesian operation matrix">${matrix.map(row=>row.map(x=>`<span>${esc(fmt(x))}</span>`).join('')).join('')}</div>`;
const questionKey = (lesson,i) => `${lesson.id}:${i}`;
const quizEntries = lessons => lessons.flatMap((lesson,li)=>(lesson.quiz||[]).map((quiz,qi)=>({lesson,li,quiz,qi,key:questionKey(lesson,qi)})));
const correctCount = entries => entries.filter(({quiz,key})=>state.answers[key]?.checked===true&&state.answers[key]?.selected===quiz.answer).length;

async function load() {
  if(!dataPromise)dataPromise=Promise.all(['pointgroup-lessons.json','pointgroup-atlas.json'].map(async file=>{
    const response=await fetch('./data/'+file+'?v=20261113-flow1');
    if(!response.ok)throw Error("Teaching data failed to load (HTTP "+response.status+'）。');
    return response.json();
  })).then(([lessons,atlas])=>{
    if(!Array.isArray(lessons.lessons)||!Array.isArray(atlas.groups)||atlas.groups.length!==32)throw Error("The teaching data format is incomplete, please refresh and try again.");
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
  container.innerHTML="<div class=\"pg-page\"><div class=\"pg-loading\" role=\"status\"><span class=\"spinner\"></span>Loading point-group lessons and atlas…</div></div>";
  const root=container.firstElementChild;
  const current=()=>revision===state.revision&&root.parentNode===container&&container.isConnected!==false;
  let disposeBridges=()=>{},disposeFeedback=[];
  const clearLearningSupport=()=>{disposeBridges();disposeBridges=()=>{};for(const dispose of disposeFeedback)dispose();disposeFeedback=[];};
  const $=selector=>root.querySelector(selector);
  let lessons,atlas;
  try { ({lessons,atlas}=await load()); } catch(error) {
    if(current()){root.innerHTML=`<div class="notice error" role="alert">${esc(error.message)}</div><button class="secondary pg-retry">reload</button>`;$('.pg-retry').onclick=()=>{if(current())return renderPointgroupView({container,toast,download,openGroup,selection,onNavigate,onLocation});};}
    return;
  }
  if(!current())return;
  if(selection.pathway||selection.tab){state.tab=tabs.some(([id])=>id===selection.tab)?selection.tab:'learn';state.lesson=Math.max(0,lessons.lessons.findIndex(item=>item.id===selection.lesson));if(selection.group)changeGroup(selection.group);if(state.tab==='quiz'&&selection.lesson)state.quizLesson=String(state.lesson);}
  const sync=()=>{onNavigate({tab:state.tab,lesson:lessons.lessons[state.lesson]?.id,group:String(state.group)});onLocation("Learning Center / Basics and Representation / "+shortLessonTitle(lessons.lessons[state.lesson]||{}));};
  const allQuestions=quizEntries(lessons.lessons);
  const source=lessons.source||{};
  const sourceText=[Array.isArray(source.authors)?source.authors.join('、'):source.authors,source.title,source.edition,source.publisher,source.year].filter(Boolean).join(' · ');
  const sourceDOI=String(source.doi||'').replace(/^https?:\/\/doi\.org\//,'');
  const sourceLink=/^10\.\d{4,9}\/[\w./();:+-]+$/i.test(sourceDOI)?` <a href="https://doi.org/${esc(sourceDOI)}" target="_blank" rel="noreferrer">Publication details ↗</a>`:'';
  const sourceHTML=()=>`<details class="pg-source"><summary>Reference book and conventions</summary><p>${esc(sourceText)}${sourceLink}</p><p>${esc(source.referenceNote||"The teaching content is organized in its own language, and the chapter and page numbers are used to locate the reference book; diagrams and interactive experiments are generated by this project.")}</p><p>The atlas covers the 32 ordinary crystallographic point groups and their single-valued representations. Magnetic point groups and spin double groups are outside its scope. Point-group operations have no translation component. Opening the workbench selects Γ for a representative space group.</p></details>`;
  function navigate(tab) { stop();state.tab=tab;if(tab==='quiz')state.quizLesson=String(state.lesson);draw();sync();$('.pg-content')?.focus({preventScroll:true}); }
  function changeGroup(id) { const g=atlas.groups.find(g=>String(g.id)===String(id))||atlas.groups[0];state.group=g.id;state.operation=g.generators?.[0]??0;state.step=0;stop(); }
  function draw() {
    clearLearningSupport();
    if(!current()){stop();return;}
    const progress=correctCount(allQuestions);
    root.innerHTML=`<section class="pg-intro"><div><span class="pg-kicker">From geometric transformation to physics selection rule</span><h2>See the symmetry, read the representation.</h2><p>${esc(lessons.subtitle||"uses 32 crystals point group as clues to connect group theory, character and crystal physics.")}</p></div><div class="pg-intro-stats" aria-label="Course Overview"><div><strong>32</strong><span>crystal point group</span></div><div><strong>${lessons.lessons.length}</strong><span>Learning Unit</span></div><div><strong>${progress}<small> / ${allQuestions.length}</small></strong><span>self-test mastered</span></div></div></section>
      ${selection.embeddedOnly||selection.atlasOnly?'':`<div class="pg-tabs" role="tablist" aria-label="Point-group classroom sections">${tabs.map(([id,title])=>`<button id="pg-tab-${id}" type="button" role="tab" aria-controls="pg-content" aria-selected="${state.tab===id}" tabindex="${state.tab===id?'0':'-1'}" data-pg-tab="${id}">${title}</button>`).join('')}</div>`}
      ${state.tab!=='learn'&&!selection.embeddedOnly&&!selection.atlasOnly?`<div class="classroom-study-context"><strong>Current unit:${esc(shortLessonTitle(lessons.lessons[state.lesson]))}</strong><button type="button" id="pg-return-lesson">Return to explanation</button><button type="button" id="pg-context-quiz">Exercises in this section</button></div>`:''}<div class="pg-content" id="pg-content" role="tabpanel" aria-labelledby="pg-tab-${state.tab}" tabindex="-1"></div>${sourceHTML()}`;
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
    clearLearningSupport();
    state.lesson=safeIndex(state.lesson,lessons.lessons.length);
    const lesson=lessons.lessons[state.lesson];
    $('.pg-content').innerHTML=`<div class="classroom-chapter-picker"><label>Basics and representation · Select unit<select id="pg-chapter-select">${lessons.lessons.map((item,i)=>`<option value="${i}" ${state.lesson===i?'selected':''}>${esc(item.title)}</option>`).join('')}</select></label><button type="button" class="secondary" id="pg-chapter-lab">Enter the demo →</button></div><div class="pg-learn-layout"><aside class="pg-lesson-nav" aria-label="course catalog"><p class="pg-label">Step by step · Learning route</p>${lessons.lessons.map((item,i)=>{
      const entries=quizEntries([item]),complete=entries.length>0&&correctCount(entries)===entries.length;
      return `<button type="button" class="${i===state.lesson?'active':''}" data-lesson="${i}" ${i===state.lesson?'aria-current="step"':''}><span class="pg-lesson-number">${String(i+1).padStart(2,'0')}</span><span>${esc(shortLessonTitle(item))}<small>${complete?"✓ Self-test mastered":esc(item.summary||'')}</small></span></button>`;
    }).join('')}</aside><article class="pg-lesson"><div class="pg-lesson-heading"><span class="pg-kicker">unit ${String(state.lesson+1).padStart(2,'0')} / ${lessons.lessons.length}</span><h2>${esc(lesson.title)}</h2><p>${esc(lesson.summary||'')}</p></div>
      ${(lesson.objectives||[]).length?`<div class="pg-objectives"><h3>After studying this section, can you</h3><ul>${lesson.objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
      ${matrixBridgeHTML(lesson.id)}
      ${(lesson.sections||[]).map((section,i)=>`<section class="pg-lesson-section"><h3><span>${String(i+1).padStart(2,'0')}</span>${esc(section.title)}</h3>${(section.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${section.formula?`<pre class="pg-formula">${esc(section.formula)}</pre>`:''}</section>`).join('')}
      ${["representations","character-reduction","projection","selection-rules","thirty-two"].includes(lesson.id)?`<aside class="notice"><strong>Related Interactive Demo</strong><p>Explore this lesson's symbols, matrices, and physical pictures together.</p><a href="#classroom/foundations?module=demos&experiment=${({representations:"characters","character-reduction":"characters",projection:"projection","selection-rules":"water","thirty-two":"macro"})[lesson.id]}">Open This Lesson's Demo →</a></aside>`:""}
      ${lesson.example?`<section class="pg-worked"><span class="pg-kicker">step by step deduction</span><h3>${esc(lesson.example.title)}</h3><ol>${(lesson.example.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="pg-example-result">${esc(lesson.example.result)}</p></section>`:''}
      ${lesson.pitfall?`<aside class="pg-pitfall"><strong>Easy to confuse</strong><p>${esc(lesson.pitfall)}</p></aside>`:''}
      ${lesson.id==='from-point-to-space'?`<section class="pg-worked" aria-label="From point groups to crystal calculations"><h3>Continue this lesson with the tools</h3><p>Use a consistent cell and wavevector convention before comparing representations. For SG 99 at Γ, the wavevector is k=(0,0,0) in fractional coordinates of the BC primitive reciprocal basis. Start here with single-valued representations.</p><div class="pg-lesson-actions"><a class="secondary" href="#structure">Import POSCAR / CIF and convert to a BC cell →</a><button class="secondary" type="button" id="pg-open-sg99">SG 99 · Single-valued representations at Γ →</button><a class="primary" href="#classroom/crystal?track=space&amp;lesson=space-01">Continue to the first space-group lesson →</a></div></section>`:''}
      <div class="pg-reference"><strong>References</strong>${(lesson.references||[]).map(ref=>`<span>${esc(ref.chapter)}${ref.printedPages?" · Book page "+esc(ref.printedPages):''}${ref.pdfPages?" · PDF page "+esc(ref.pdfPages):''}</span>`).join('')}</div>
      <div class="pg-lesson-actions"><button type="button" class="secondary" id="pg-lesson-quiz">Self-test in this section →</button><button type="button" class="secondary" id="pg-lesson-lab">Hands-on Symmetry Transformation</button>${state.lesson+1<lessons.lessons.length?"<button type=\"button\" class=\"primary\" id=\"pg-next-lesson\">Next unit →</button>":''}</div></article></div>`;
    disposeBridges=bindMatrixBridge({root:$('.pg-content'),lessonId:lesson.id,isCurrent:()=>current()&&state.tab==='learn'&&lessons.lessons[state.lesson]?.id===lesson.id});
    $('#pg-chapter-select').onchange=e=>{state.lesson=Number(e.target.value);drawLearn();sync();};$('#pg-chapter-lab').onclick=()=>navigate('lab');
    root.querySelectorAll('[data-lesson]').forEach(button=>button.onclick=()=>{state.lesson=Number(button.dataset.lesson);drawLearn();sync();$('.pg-lesson h2')?.scrollIntoView({block:'nearest'});});
    $('#pg-lesson-quiz').onclick=()=>{state.quizLesson=String(state.lesson);navigate('quiz');};
    $('#pg-lesson-lab').onclick=()=>navigate('lab');
    if($('#pg-open-sg99')){const handoff=$('#pg-open-sg99');handoff.onclick=()=>{if(current()&&state.tab==='learn'&&lessons.lessons[state.lesson]?.id==='from-point-to-space'&&$('#pg-open-sg99')===handoff)openGroup({mode:'sg',id:99,k:[0,0,0],doubleValued:false});};}
    if($('#pg-next-lesson'))$('#pg-next-lesson').onclick=()=>{state.lesson++;drawLearn();sync();$('.pg-lesson h2')?.scrollIntoView({block:'nearest'});};
  }
  function filteredGroups() {
    const search=state.search.trim().toLowerCase().replace(/[\s_{}]/g,'');
    return atlas.groups.filter(g=>(!state.system||g.system===state.system)&&(!search||[g.hm,g.schoenflies,g.system,g.summary].some(value=>String(value||'').toLowerCase().replace(/[\s_{}]/g,'').includes(search))));
  }
  function drawAtlas() {
    $('.pg-content').innerHTML=`<div class="pg-atlas-controls"><label>Search by symbol or name<input id="pg-search" type="search" placeholder="such as mm2, C2v, cubic" value="${esc(state.search)}" autocomplete="off"></label><label>crystal system<select id="pg-system"><option value="">All crystal systems</option>${[...new Set(atlas.groups.map(g=>g.system))].map(system=>`<option ${state.system===system?'selected':''}>${esc(system)}</option>`).join('')}</select></label></div><p class="pg-filter-summary" id="pg-filter-summary" role="status"></p><div class="pg-group-cards" id="pg-group-cards"></div><section class="pg-group-detail" id="pg-group-detail" aria-label="Selected point group Details"></section>`;
    $('#pg-search').oninput=e=>{state.search=e.target.value;drawCards();};
    $('#pg-system').onchange=e=>{state.system=e.target.value;drawCards();};
    drawCards();
    drawGroupDetail();
  }
  function drawCards() {
    const groups=filteredGroups();
    $('#pg-filter-summary').textContent=`display ${groups.length} / 32 point group · Click on the card to view character and physical basis functions`;
    $('#pg-group-cards').innerHTML=groups.length?groups.map(g=>`<button type="button" class="pg-group-card ${g.id===selected().id?'selected':''}" data-pg-group="${g.id}" aria-pressed="${g.id===selected().id}"><span class="pg-card-top"><strong>${crystalSpan(g.hm,'hm')}</strong><span>${crystalSpan(g.schoenflies,'schoenflies')}</span></span><span class="pg-card-bottom">${esc(g.system)}<span>Order ${g.order}</span></span></button>`).join(''):"<p class=\"pg-no-results\">There is no matching point group . Try Hermann–Mauguin notation (e.g. 4mm) or Schoenflies notation (e.g. C4v）).</p>";
    root.querySelectorAll('[data-pg-group]').forEach(button=>button.onclick=()=>{changeGroup(button.dataset.pgGroup);drawCards();drawGroupDetail();sync();$('#pg-group-detail').scrollIntoView({block:'start',behavior:'instant'});});
  }
  function drawGroupDetail() {
    const g=selected();
    const basis = (ir,kind) => Array.isArray(ir.basis?.[kind])?ir.basis[kind].join(', '):'';
    const generatorLabels=(g.generators||[]).map(index=>g.operations[index]?.label).filter(Boolean);
    $('#pg-group-detail').innerHTML=`<div class="pg-detail-heading"><div><span class="pg-kicker">POINT GROUP ${esc(g.id)}</span><h2>${crystalSpan(g.hm,'hm')} <span>${crystalSpan(g.schoenflies,'schoenflies')}</span></h2><p>${esc(g.summary||'')}</p>${badges(g)}</div><div class="pg-detail-actions"><button type="button" class="primary" id="pg-to-lab">observed in the experiment →</button><button type="button" class="secondary" id="pg-to-workbench">stands for space group #${g.representativeSG} · Γ →</button><button type="button" class="pg-text-button" id="pg-export">↓ Export this point group JSON</button></div></div>
      <h3>character table <span class="pg-inline-note">Complex irreducible representation · Single value</span></h3><p class="pg-muted">is listed as conjugacy class , and the operands in the class are given below the column name; character in column E is representation dimension . Mulliken common names are displayed side by side with the Γ tag of BC; the Γ tag corresponds to space group #${g.representativeSG} can be checked on the workbench. Mulliken names take this BC axis setting.</p>
      <div class="pg-table-wrap" tabindex="0" role="region" aria-label="Horizontally scrollable character table"><table class="pg-character-table"><caption class="sr-only">${esc(groupName(g))} character table</caption><thead><tr><th scope="col">Mulliken · BC</th><th scope="col">Dimension</th>${g.classes.map(c=>`<th scope="col">${crystalSpan(c.label,'operation')}<small>${c.size} operations</small></th>`).join('')}<th scope="col">polar vector<br><small>(x, y, z)</small></th><th scope="col">axial vector<br><small>(Rₓ, Rᵧ, R_z)</small></th><th scope="col">quadratic function<br><small>symmetric second-order tensor</small></th></tr></thead><tbody>${g.irreps.map(ir=>`<tr><th scope="row">${irrepHTML(ir)}${ir.conjugateLabel&&ir.conjugateLabel!==ir.label?`<small>conjugate ${crystalSpan(ir.conjugateLabel,'irrep')}</small>`:''}</th><td>${ir.dimension}</td>${ir.characters.map(c=>`<td>${esc(character(c))}</td>`).join('')}<td>${esc(ir.vectorMultiplicity??0)}${basis(ir,'vector')?`<small>${esc(basis(ir,'vector'))}</small>`:''}</td><td>${esc(ir.axialMultiplicity??0)}${basis(ir,'axial')?`<small>${esc(basis(ir,'axial'))}</small>`:''}</td><td>${esc(ir.quadraticMultiplicity??0)}${basis(ir,'quadratic')?`<small>${esc(basis(ir,'quadratic'))}</small>`:''}</td></tr>`).join('')}</tbody></table></div>
      <div class="pg-detail-notes"><div><h4>from table to selection rule</h4><p>are the irreducible representation in polar vector , axial vector , and multiplicity in the symmetric second-order tensors, not the dimensions. polar vector multiplicity greater than 0 corresponds to electric dipole IR symmetry allowed; quadratic function multiplicity greater than 0 corresponds to conventional non-resonant Raman symmetry allowed.</p></div><div><h4>“Allow” does not mean that there must be spectral peaks</h4><p>It is also necessary to reduce the vibration representation of specific crystals and exclude acoustic modes. The intensity of the spectral peak depends on the derivative of the dipole moment or polarizability to this mode. The Γ point vibrations of centrosymmetric crystals satisfy the usual IR/Raman mutual exclusion rules.</p></div></div>
      <div class="pg-selection-grid">${g.irreps.map(ir=>`<div><strong>${irrepHTML(ir)}</strong><span>${ir.irActive?"IR allowed":"IR not allowed"}</span><span>${ir.ramanActive?"Raman allowed":"Raman not allowed"}</span>${ir.physicalPair?.length?`<small>real physical combination:${Array.isArray(ir.physicalPair)?ir.physicalPair.map(label=>crystalSpan(label,'irrep')).join(' ⊕ '):crystalSpan(ir.physicalPair,'irrep')}</small>`:''}</div>`).join('')}</div>
      ${g.irreps.some(ir=>ir.characters.some(c=>Math.abs(c?.im||0)>1e-8))?"<p class=\"pg-callout\">This table contains the complex character . Representations that are complex conjugation each occupy one line; they are usually combined in pairs when describing real physical quantities such as real displacements. If the basis function spans two conjugate rows, it is understood as a complete pair space, and the two rows cannot be repeatedly counted as two independent real two-dimensional spaces.</p>":''}
      <details class="pg-class-details"><summary>Conjugacy classes, coordinate conventions and verification</summary><p>${esc(g.coordinateConvention||"operation matrix operates on column vectors in orthogonal Cartesian coordinates : r′ = Rr.")} diagram uses r′ = Rr; the representation convention of the function base is f(r) → f(R⁻¹r), and the conjugate labels of complex functions are distinguished accordingly. The Cartesian matrix here cannot be directly regarded as the BC fractional coordinates matrix.</p><p><strong>one set generator :</strong>${(generatorLabels.length?generatorLabels:['E']).map(name=>crystalSpan(name,'operation')).join('，')}. Repeating these operations together results in the entire point group .</p><div class="pg-class-list">${g.classes.map(c=>`<span><b>${crystalSpan(c.label,'operation')}</b> · ${c.size} operations</span>`).join('')}</div><p>character orthogonality Maximum error:${esc(Number(g.characterOrthogonalityError||0).toExponential(2))}. Non-integer character is displayed to five decimal places on the page, and JSON retains data accuracy.</p></details>`;
    $('#pg-to-lab').onclick=()=>navigate('lab');
    $('#pg-to-workbench').onclick=()=>{stop();openGroup(g.representativeSG);};
    $('#pg-export').onclick=()=>{download(JSON.stringify(getPointgroupResult(),null,2),`pointgroup-${g.id}.json`);toast("has exported point group data and current experiment");};
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
    return `<svg viewBox="0 0 560 410" role="img" aria-label="${esc(op.label)} Effect on point, applied ${state.step} times; current coordinates ${esc(vector(currentPoint))}"><defs><marker id="pg-axis-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#8aa598"/></marker></defs><path d="M${projection([1,1,0]).join(' ')} L${projection([-1,1,0]).join(' ')} L${projection([-1,-1,0]).join(' ')} L${projection([1,-1,0]).join(' ')} Z" class="pg-xy-plane"/>${axes}${state.showOrbit?orbit(g,state.point).map(p=>dot(p,4,'class="pg-orbit-dot"')).join(''):''}${points.map(p=>dot(p,5,'class="pg-cycle-dot"')).join('')}${Array.from({length:completed},(_,i)=>line(points[i%op.order],points[(i+1)%op.order],'class="pg-trail"')).join('')}${line([0,0,0],currentPoint,'class="pg-current-ray"')}${dot(state.point,9,'class="pg-initial-dot"')}${dot(currentPoint,6,'class="pg-current-dot"')}${label(state.point,'p₀','class="pg-point-label"')}${state.step%op.order!==0?label(currentPoint,'p'+state.step,'class="pg-point-label pg-current-label"'):''}<text x="22" y="34" class="pg-svg-caption">Orthogonal Cartesian coordinates · Three-dimensional oblique projection</text><text x="22" y="386" class="pg-svg-caption">points represents continuous action, not the movement trajectory of atoms.</text></svg>`;
  }
  function drawLab() {
    const g=selected();
    state.operation=safeIndex(state.operation,g.operations.length);
    const op=g.operations[state.operation];
    $('.pg-content').innerHTML=`<div class="pg-lab-heading"><div><h2>How many times should an operation be performed in a row?</h2><p>Select operation and observe r → Rr → R²r. The point will return to its original position, but the period of the point may not be equal to the order of the operation.</p></div><button type="button" class="secondary" id="pg-lab-atlas">View ${crystalSpan(g.hm,'hm')} of character table →</button></div><div class="pg-lab-layout"><section class="pg-lab-controls"><label>point group (international symbol)<select id="pg-lab-group">${atlas.groups.map(item=>`<option value="${item.id}" ${item.id===g.id?'selected':''}>${esc(nativeHm(item.hm))} · ${esc(item.system)}</option>`).join('')}</select></label><label>Symmetric operation<select id="pg-lab-operation">${g.operations.map((item,i)=>`<option value="${i}" ${i===state.operation?'selected':''}>${esc(item.label)} · level ${item.order}${Number(item.det)<0?" · Reverse":''}</option>`).join('')}</select></label><div class="pg-operation-info"><span>Current operation <b>${crystalSpan(op.label,'operation')}</b></span><span>det R = <b>${esc(fmt(op.det))}</b></span><span>order of an operation <b>${op.order}</b></span><span>${Number(op.det)>0?"maintain orientation":"Change orientation"}</span></div><div class="pg-equation"><span>r′ =</span>${matrixHTML(op.matrix)}<span>r</span></div><p class="pg-small">Each column is the coordinates transformed by the corresponding unit basis vector. det R = −1 can correspond to mirror, inversion or rotoinversion .</p><fieldset class="pg-point-inputs"><legend>initial point p₀</legend>${state.point.map((value,i)=>`<label><span>${'xyz'[i]} = <output id="pg-point-value-${i}">${fmt(value)}</output></span><input id="pg-point-${i}" type="range" min="-1" max="1" step="0.01" value="${value}" aria-label="Initial point ${'xyz'[i]} coordinates"></label>`).join('')}</fieldset><div class="pg-point-presets"><button type="button" data-point="generic">general position</button><button type="button" data-point="axis">on x axis</button><button type="button" data-point="plane">in xy plane</button></div><label class="pg-check"><input type="checkbox" id="pg-full-orbit" ${state.showOrbit?'checked':''}> Display the entire point group simultaneously generated point orbit</label></section><section class="pg-lab-visual"><div class="pg-svg-wrap" id="pg-lab-svg">${labSVG(g,op)}</div><div class="pg-svg-legend"><span><i class="initial"></i>initial point</span><span><i class="current"></i>current point</span><span><i class="cycle"></i>Points generated by this operation</span>${state.showOrbit?"<span><i class=\"orbit\"></i>point orbit throughout point group</span>":''}</div><div class="pg-lab-actions"><button type="button" class="primary" id="pg-apply">Apply once R →</button><button type="button" class="secondary" id="pg-play">Demo Complete Week</button><button type="button" class="secondary" id="pg-reset">reset</button></div><div id="pg-lab-status" class="pg-lab-status" aria-live="polite"></div></section></div><aside class="pg-callout"><strong>operation, subgroup and point orbit are three concepts.</strong> repeatedly applies an operation R to obtain the cyclic subgroup ⟨R⟩; applying all operations of point group obtains the complete orbit of the point. Special points falling on the symmetry axis or mirror plane may be held constant by multiple operations, so the number of points in the orbit can be less than group order .</aside>`;
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
    $('#pg-play').textContent=state.timer!==null?"Pause demonstration":"Demo Complete Week";
    $('#pg-lab-status').innerHTML=`<div class="pg-coordinate-line"><span>initial ${inlineMath('p_0','p₀')}</span><code>${esc(vector(state.point))}</code></div><div class="pg-coordinate-line"><span>${inlineMath('R^{'+state.step+'}p_0','R^'+state.step+' p₀')}</span><code>${esc(vector(p))}</code></div><div class="pg-cycle-stats"><span>applied <b>${state.step}</b> times</span><span>This point period <b>${pointPeriod}</b></span><span>Complete point orbit <b>${fullOrbit.length}</b> / |G| = ${g.order}</span></div><p>${state.step>0&&state.step%pointPeriod===0?"✓ The current point has returned to the initial position.":`Continue applying operations; step  ${pointPeriod} times.`}${pointPeriod<op.order?" This point is at special position ; the period of the point is less than the order of the operation.":''}</p>`;
  }
  function drawQuiz() {
    clearLearningSupport();
    const entries=state.quizLesson==='all'?allQuestions:allQuestions.filter(x=>String(x.li)===state.quizLesson);
    const score=correctCount(allQuestions);
    $('.pg-content').innerHTML=`<div class="pg-quiz-heading"><div><h2>Change "understand" into "can judge"</h2><p>Choose the answer first, then check the reasoning. Progress is saved in this browser and can be practiced over and over again.</p></div><div class="pg-progress"><strong>${score} <span>/ ${allQuestions.length}</span></strong><label for="pg-progress-bar">Correctly answered questions</label><progress id="pg-progress-bar" value="${score}" max="${Math.max(1,allQuestions.length)}"></progress></div></div><div class="pg-quiz-filter"><label>practice range<select id="pg-quiz-lesson"><option value="all">All units</option>${lessons.lessons.map((lesson,i)=>`<option value="${i}" ${state.quizLesson===String(i)?'selected':''}>${i+1}. ${esc(shortLessonTitle(lesson))}</option>`).join('')}</select></label><button type="button" class="pg-text-button" id="pg-clear-progress">Reset practice records</button></div><div class="pg-quizzes">${entries.map(({lesson,li,quiz,qi,key},index)=>{
      const answer=state.answers[key],checked=answer?.checked===true,right=checked&&answer.selected===quiz.answer;
      return `<article class="pg-question ${checked?right?'is-correct':'is-incorrect':''}" id="pg-q-${li}-${qi}"><span class="pg-kicker">${esc(lesson.title)} · No. ${qi+1} question</span><fieldset><legend>${esc(quiz.question)}</legend>${quiz.choices.map((choice,ci)=>`<label class="pg-answer ${checked&&ci===quiz.answer?'correct-choice':''}"><input type="radio" name="pg-answer-${li}-${qi}" value="${ci}" data-question="${esc(key)}" ${answer?.selected===ci?'checked':''}><span class="pg-choice-letter">${String.fromCharCode(65+ci)}</span><span>${esc(choice)}</span></label>`).join('')}</fieldset><button type="button" class="secondary pg-check-answer" data-check="${esc(key)}" ${Number.isInteger(answer?.selected)?'':'disabled'}>${checked?"Check again":"Check answers"}</button><div class="pg-answer-feedback" aria-live="polite">${checked?`<strong>${right?"✓ The answer is correct":"Think again"} · Correct option ${String.fromCharCode(65+quiz.answer)}</strong>${renderChoiceFeedback(quiz,answer.selected,{prefix:`pg-${li}-${qi}`})||`<p>${esc(quiz.explanation)}</p>`}<button type="button" class="pg-text-button" data-review="${li}">Return to this section for review →</button>`:''}</div></article>`;
    }).join('')}</div>`;
    $('#pg-quiz-lesson').onchange=e=>{state.quizLesson=e.target.value;drawQuiz();};
    $('#pg-clear-progress').onclick=()=>{state.answers={};persist();draw();toast("practice record has been reset");};
    root.querySelectorAll('[data-question]').forEach(input=>input.onchange=e=>{const key=e.target.dataset.question;state.answers[key]={selected:Number(e.target.value),checked:false};persist();const article=e.target.closest('.pg-question');article.classList.remove('is-correct','is-incorrect');article.querySelectorAll('.correct-choice').forEach(el=>el.classList.remove('correct-choice'));article.querySelector('.pg-check-answer').disabled=false;article.querySelector('.pg-check-answer').textContent="Check answers";article.querySelector('.pg-answer-feedback').innerHTML='';});
    root.querySelectorAll('[data-check]').forEach(button=>button.onclick=()=>{const key=button.dataset.check,entry=allQuestions.find(q=>q.key===key);if(!entry||!Number.isInteger(state.answers[key]?.selected))return;state.answers[key].checked=true;persist();const id=`pg-q-${entry.li}-${entry.qi}`;draw();$('#'+id+' .pg-check-answer')?.focus({preventScroll:true});});
    for(const {li,qi,quiz,key} of entries){const answer=state.answers[key];if(answer?.checked){const article=$('#pg-q-'+li+'-'+qi);disposeFeedback.push(bindChoiceFeedback(article,quiz,answer.selected,{prefix:`pg-${li}-${qi}`,isCurrent:()=>current()&&state.tab==='quiz'}));}}
    root.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>{state.lesson=Number(button.dataset.review);navigate('learn');});
  }
  draw();
}
