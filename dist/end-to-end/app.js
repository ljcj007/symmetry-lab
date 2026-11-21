import {verifyReceipt} from './verify.js';

const en=new URLSearchParams(location.search).get('lang')==='en';
const messages={
brandSub:'Electronic-structure verification',navChain:'Evidence chain',navVerify:'One-click review',navAffine:'Finite operator workbench',
heroScope:'Model and proof scope',caseLabel:'Completed case · Quantum ESPRESSO · Two-atom silicon cell',
figureTitle:'One potential. The whole Brillouin zone.',figureTag:'Schematic',figureCaption:'A common energy window across the Brillouin zone. These surfaces are schematic, not Si dispersion data.',
gapLabel:'Certified common gap',gapScope:'Infinite-plane-wave frozen spectrum at the enclosed finite-reference SCF potential.',
metricK:'irreducible k points',metricResponse:'active SCF response directions',metricDomains:'accepted closed domains',metricCoverage:'coverage and boundary obligations',
chainTitle:'Carry every error into the next step.',chainIntro:'Select a stage to see what it contributes to the final claim. Each stage refers to the accepted results for this Si case.',
verifyTitle:'Recompute the conclusion<br>from the published receipt.',verifyIntro:'Exact integer fractions check the contraction condition, potential-error transfer and final spectral window for this fixed case. Download a report after running.',
run:'Verify the published scalar composition',verifyNote:'This is a scalar composition of received proofs. The point-response and 925-domain matrix proofs are received as premises; this button does not rerun QE.',
downloadBundle:'Download independent replay (Python)',downloadReceipt:'Download machine-readable receipt',reportTitle:'This verification',waiting:'Ready to run',empty:'Load the fixed case, check each condition and produce a fresh report.',downloadReport:'Download this report',
scopeTitle:'What does this evidence chain establish?',scopeYesTitle:'The completed mathematical result',scopeYes:'The specified finite reference SCF equation has a unique local root within the symmetric ball. At this potential, the infinite-plane-wave Bloch operator has a common rank-four Fermi window throughout the Brillouin zone.',
model:'Reference model: 80 Ry orbital carriers · 48³ charge grid · canonical 12³ k quadrature · ideal crystal symmetry · specified C¹ Hermite radial projectors · analytic reference PBE energy.',
scopeNextTitle:'The next mathematical targets',scopeNext:'The infinite-orbital nonlinear SCF equation, continuous charge grid, continuous Brillouin-zone integration and global ground state each require further error control and existence arguments.',
adapter:'The native-data chain currently supports this QE–Si case. VASP input and automatic certification of arbitrary materials remain future work. Use the existing workbench for finite affine models.',openAffine:'Open the finite operator workbench',
replayTitle:'What is actually recomputed in each mode?',replayMode:'Mode',replayWork:'Recomputed',replayNeeds:'Received prerequisites',
browserMode:'This page / downloadable Python package',browserWork:'Receipt identity, exact scalar contraction condition, potential-error budget and spectral composition',browserNeeds:'Matrix-proof results in the published projection; source hashes identify records but do not replay their proofs',
localMode:'Research-workspace one-click entry',localWork:'72-point aggregation, full inverse verification, finite SCF acceptance and same-potential spectral composition',localNeeds:'Original workspace, fixed runtime, point-response and domain proof packets',
fullMode:'Full scientific replay',fullWork:'From-scratch SCF, native export, response and closed-domain matrices (target workflow)',fullNeeds:'Complete scientific inputs, environment and resources; the current public runner does not yet implement this full workflow',
historyTitle:'How was the last domain included?',history:'One subblock was unresolved at the original upper cut; that record is preserved. A new receiver narrowed the upper cut for the same operator and remainder budget, strictly accepted the remaining subblock, and intersected the intervals across all 925 domains. The final result uses this new composition.',
footer:'An identified source. Errors carried through. A checkable conclusion.'
};
Object.assign(messages,{
  "navNative": "Actual DFT jobs",
  "navVerify": "Receipt review",
  "heroAction": "Get the native-run companion",
  "caseLabel": "Fresh SCF to native source connected · Infinite-orbital SCF proof in progress",
  "chainIntro": "These five stages concern the fixed existing reference source. The fresh-SCF run and its source/proof status are shown separately below.",
  "adapter": "Complete native-source support currently targets this QE–Si case. VASP XML/OUTCAR metadata can be imported; full PAW-operator verification and arbitrary-material certification remain open. The finite affine workbench remains available.",
  "nativeTitle": "Start from native output. Continue with one click.",
  "nativeOverall": "Infinite-orbital SCF: in progress · UNRESOLVED",
  "nativeLead": "The new companion solves a fresh numerical SCF problem, runs Gamma and complete 72-point native exports, downloads raw sources and compares operator identities. Matching identities can continue through the reference proofs; changed sources do not inherit them. Infinite-orbital nonlinear SCF validation remains in progress.",
  "launchTitle": "Install the local run companion",
  "launchIntro": "Download the launcher, fresh-SCF and native-export drivers, and job portal. After local setup, one click continues the available calculations and receivers. Numerical convergence and strict root certification are recorded separately.",
  "downloadCompanion": "Download the local companion",
  "packageScope": "Code and license only, about 74 KB. Scientific inputs, the fixed environment and matrix-proof packets come from the complete research workspace.",
  "setupTitle": "Setup and launch",
  "setupWorkspace": "Place the archive’s web and native directories under paper/work/a-new-run-directory/ in the complete project. Preserve the scientific sources and fixed runtime.",
  "setupConfig": "Download the example, fill in verified server information, the SCF input, and SCF/export executable paths, then save it locally as server_profile.json. Enter the password at launch.",
  "downloadConfig": "Download server configuration example",
  "downloadInputList": "Download explicit input-list example",
  "setupRegister": "Register the local source directory and reference-model chain. Registration pins the inputs and receivers. Missing scientific sources or receivers leave the result unresolved.",
  "setupStart": "Open web/start_server.cmd, enter the server password, then select the registered QE–Si reference model in the local portal and run it.",
  "setupRequirements": "Requires Python, Paramiko, the workspace numerical environment, a working SCF executable and the complete NC source exporter. Ordinary stdout/XML does not contain the complete operator.",
  "downloadGuide": "Download installation and registration instructions",
  "localBoundary": "The local launcher connects to your server. This public page provides the entry and records. Passwords stay in the local launch process; server configuration is not published.",
  "actualTitle": "An actual run from fresh SCF",
  "actualDate": "22 Nov 2026 · China Standard Time",
  "actualIntro": "One click completed fresh numerical SCF, Gamma and 72-point native export, and complete source reception. The new source differs from the reference, so old proof inheritance stopped.",
  "actualNative": "Fresh numerical SCF and complete source",
  "actualNativeDetail": "Converged from atomic initialization; input, UPFs, logs and the complete new save checked before and after",
  "actualRounding": "Gamma and 72-point NC native export",
  "actualRoundingDetail": "Uses this run’s new SCF parent; complete operator sources downloaded and structurally received",
  "actualFinite": "Connect the new source to reference proofs",
  "actualFiniteDetail": "All 72 points contain changed operator fields. Exact identity failed; a new-source proof bridge is pending",
  "actualSpectrum": "Strict root and spectrum for this source",
  "actualSpectrumDetail": "Finite SCF, basis-tail and global-spectrum proofs were not inherited; new-source validation is pending",
  "actualInfinite": "Infinite-orbital nonlinear SCF root",
  "actualInfiniteDetail": "The strict receiver is still under study. A complete end-to-end certificate has not been obtained.",
  "freshMode": "Fresh compute",
  "receivedMode": "Proof composition",
  "actualScope": "This run received fresh numerical SCF and complete native sources. The existing reference-source gap above 0.081 eV is retained separately and is not a gap certificate for this new source.",
  "downloadActual": "Download the public fresh-SCF run summary",
  "localMode": "Local companion after setup",
  "localWork": "Fresh numerical SCF, native export and source comparison; construction/rounding and reference SCF/frozen-spectrum proof composition continue only after exact operator identity",
  "localNeeds": "Original workspace, fixed runtime, point-response and 925-domain proof packets; infinite-orbital nonlinear SCF remains unresolved",
  "gapLabel": "Accepted gap of the existing reference source",
  "gapScope": "Infinite frozen spectrum at the existing finite-reference SCF potential. A new calculation needs its own source bridge.",
  "downloadReferenceRun": "View the earlier reference-source run summary",
  "awaitingSource": "New source pending",
  "navInfinite": "Infinite SCF progress",
  "infiniteTitle": "The infinite spectrum is enclosed. Nonlinear SCF is next.",
  "infiniteIntro": "A separate 256 Ry, 72-point reference-equation study has strict infinite frozen-spectrum bounds at a new candidate potential and throughout its complete potential ball. It is received separately from the fresh QE-source task below, with the declared 48³ charge grid and 12³ quadrature.",
  "proposalTag": "Numerical proposal · not a certificate",
  "proposalTitle": "6 Anderson iterations",
  "proposalText": "Numerical self-consistency residual of the candidate potential. It locates a validation center; it is not a rigorous root enclosure.",
  "frozenTag": "Strictly received · infinite frozen spectrum",
  "centerTitle": "Exact symmetric center",
  "centerText": "After exact symmetry projection and gauge fixing, the complete infinite-plane-wave operator retains a common gap over the entire Brillouin zone.",
  "ballTitle": "Uniform throughout the potential ball",
  "ballText": "All 2,618 invariant mean-zero potential directions. Normalized grid L² radius: 4.000 × 10⁻⁶ Ry.",
  "infiniteRemainingTitle": "The remaining link",
  "infiniteRemaining": "The whole-ball nonlinear self-consistency inclusion condition is not closed. Rigorous control of the density and potential returned by every candidate is needed to connect the frozen-spectrum bounds to an infinite-orbital SCF root. Infinite SCF remains UNRESOLVED.",
  "downloadInfiniteProgress": "Download progress summary and original-receipt SHA-256 hashes"
});
if(en){
 document.documentElement.lang='en';document.title='QE–Si · End-to-end evidence | Symmetry Lab';
 for(const node of document.querySelectorAll('[data-i18n]')){const value=messages[node.dataset.i18n];if(value!==undefined){if(node.dataset.i18n==='verifyTitle')node.innerHTML=value;else node.textContent=value;}}
 document.querySelector('h1').innerHTML='Connect native DFT sources<br>to a verified global gap.';
 document.querySelector('.lead').textContent='Connect source identity, operator construction, rounding, basis truncation and self-consistency error to one mathematical statement about the complete spectrum.';
 document.querySelector('.hero-actions .primary').textContent=messages.heroAction;
 document.querySelector('#language').textContent='中文';document.querySelector('#language').href='./';document.querySelector('#language').lang='zh-CN';
 document.querySelector('footer .brand').href='../en/';
 document.querySelector('#spectrum-title').textContent='Schematic common Fermi window';document.querySelector('#spectrum-desc').textContent='A common energy interval separates four occupied spatial bands from the upper spectrum over the entire Brillouin zone. This is not actual Si dispersion data.';
 document.querySelector('#stage-tabs').setAttribute('aria-label','Evidence stages');
}

const stages=en?[
 ['Native source','IDENTIFY THE CALCULATION','Keep the operator attached to its source.','The 72 irreducible k points retain native plane-wave indices, kinetic terms, nonlocal factors and potential fields. These identities bind later receipts to the same Si calculation.','72 k points','Native data and operator source identities received'],
 ['Construction & rounding','ENCLOSE THE OPERATOR','Turn finite files into a specified operator.','The target fixes the ionic potential grid and the radial-projector convention. Arithmetic and source-reconstruction errors receive explicit bounds, so printed or reconstructed data are not silently identified with the target.','48³ grid','Specified C¹ Hermite radial projectors and reference PBE'],
 ['Finite reference SCF root','ENCLOSE THE SELF-CONSISTENT POTENTIAL','A small residual becomes a root enclosure.','The full active response, inverse verification and nonlinear bound establish a contraction on the specified symmetric ball. The remaining invariant outputs and gauge reconstruct a full-grid potential radius.','q < 4.080 × 10⁻³','Full-grid mean-L² potential radius < 5.426 × 10⁻⁹ Ry'],
 ['Infinite basis & BZ','CONTROL THE OMITTED STATES','Cover the spectrum beyond the calculation.','Schur-tail bounds control all omitted plane waves and their couplings. The accepted closed domains, affine symmetries and boundary obligations extend the spectral separation over the complete Brillouin zone.','925 closed domains','960 coverage obligations; common raw interval 0.006 Ry'],
 ['Same-potential transfer','COMPOSE THE FINAL CLAIM','Move both gap edges inward by the error budget.','The enclosed SCF potential and the continuous frozen operator are compared using the full source-and-potential budget. Moving both spectral cuts inward preserves a strictly positive common window.','gap > 0.081 eV','Total operator difference < 1.047 × 10⁻⁵ Ry']
]:[
 ['原生数据与源身份','IDENTIFY THE CALCULATION','让算符，始终对应这一次计算。','72 个不可约 k 点保留原生平面波索引、动能、非局域因子与势场。后续证明由这些身份绑定到同一个 Si 数据源。','72 个 k 点','原生数据与算符源身份已接收'],
 ['算符构造与舍入','ENCLOSE THE OPERATOR','把有限文件，接成一个明确的算符。','目标固定离子势网格与径向投影子约定。算术和源重构误差分别给出界，使打印值、重构值与目标算符之间的差异进入证明。','48³ 电荷网格','指定 C¹ Hermite 径向投影子与参考 PBE'],
 ['有限参考自洽根','ENCLOSE THE SELF-CONSISTENT POTENTIAL','从小残差，走到自洽解的严格包围。','完整活跃响应、逆矩阵检验和非线性界，在指定对称球内建立收缩映射。其余不变方向输出与规范分量共同重构完整势半径。','q < 4.080 × 10⁻³','完整势的网格均方根半径 < 5.426 × 10⁻⁹ Ry'],
 ['无限基组与全域覆盖','CONTROL THE OMITTED STATES','把计算中省略的态，也纳入结论。','Schur 尾项界控制全部遗漏平面波及其耦合。接收闭域、仿射对称性和边界义务共同将谱隔离延伸到整个布里渊区。','925 个闭域','960 项覆盖义务；原共同区间宽度 0.006 Ry'],
 ['同势传递与带隙','COMPOSE THE FINAL CLAIM','两端都让出误差，带隙仍然成立。','合并完整自洽势包围与连续源比较的误差预算，将两条谱切口分别向内移动，得到同一个被包围自洽势下的共同能量区间。','带隙 > 0.081 eV','总算符差 < 1.047 × 10⁻⁵ Ry']
];
const tabs=document.querySelector('#stage-tabs'),panel=document.querySelector('#stage-panel');
function selectStage(i,focus=false){
 for(const [j,tab]of [...tabs.children].entries()){tab.setAttribute('aria-selected',String(i===j));tab.tabIndex=i===j?0:-1;}
 const s=stages[i];panel.setAttribute('aria-labelledby',`stage-${i}`);
 panel.replaceChildren();
 const kicker=document.createElement('div');kicker.className='stage-kicker';kicker.textContent=s[1];
 const title=document.createElement('h3');title.textContent=s[2];const text=document.createElement('p');text.textContent=s[3];
 const bound=document.createElement('div');bound.className='stage-bound';const number=document.createElement('strong');number.textContent=s[4];const note=document.createElement('span');note.textContent=s[5];bound.append(number,note);panel.append(kicker,title,text,bound);
 if(focus)tabs.children[i].focus();
}
stages.forEach((s,i)=>{const b=document.createElement('button');b.className='chain-tab';b.id=`stage-${i}`;b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-controls','stage-panel');const check=document.createElement('span');check.textContent='✓';check.setAttribute('aria-hidden','true');b.append(check,document.createTextNode(s[0]));b.onclick=()=>selectStage(i);b.onkeydown=e=>{let next=i;if(['ArrowDown','ArrowRight'].includes(e.key))next=(i+1)%stages.length;else if(['ArrowUp','ArrowLeft'].includes(e.key))next=(i-1+stages.length)%stages.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=stages.length-1;else return;e.preventDefault();selectStage(next,true);};tabs.append(b);});selectStage(0);

const run=document.querySelector('#run'),status=document.querySelector('#status'),body=document.querySelector('#report-body'),download=document.querySelector('#download-report');
let receipt,report;
try{const response=await fetch('./data/si-reference-receipt.json',{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);receipt=await response.json();run.disabled=false;}
catch(error){status.textContent=en?'Load failed':'载入失败';status.className='badge failure';const p=document.querySelector('#load-error');p.hidden=false;p.textContent=(en?'Could not load the case. Reload this page. ':'无法载入案例，请刷新页面。 ')+error.message;}
const checkNames={source:en?'Source identities match the published case':'源身份匹配已发布案例',scf:en?'Exact contraction condition holds':'精确收缩条件成立',transfer:en?'Potential-error budget is carried through':'势误差预算已接续',gap:en?'Inward spectral cuts leave a positive gap':'两端内移后仍有正的共同区间',projection:en?'Public receipt identity matches':'公开摘要身份一致'};
run.onclick=async()=>{
 run.disabled=true;download.hidden=true;status.textContent=en?'Checking…':'正在复核…';status.className='badge';body.replaceChildren();
 try{
  const start=performance.now();const result=await verifyReceipt(receipt);const elapsed=performance.now()-start;
  if(result.status!=='VERIFIED_PUBLISHED_SCALAR_COMPOSITION'||result.checks.some(c=>!c.passed))throw new Error('Scalar verification did not pass.');
  report={...result,generatedAt:new Date().toISOString(),elapsedMilliseconds:Math.round(elapsed),execution:'Browser exact scalar composition; received matrix proofs not replayed'};
  const list=document.createElement('ul');list.className='check-list';for(const check of result.checks){const li=document.createElement('li');const icon=document.createElement('span');icon.className='check-icon';icon.textContent='✓';li.append(icon,document.createTextNode(checkNames[check.id]??check.label));list.append(li);}body.append(list);
  const conclusion=document.createElement('div');conclusion.className='report-result';const label=document.createElement('span');label.textContent=en?'Certified common gap at the specified potential':'指定势下的共同带隙';const value=document.createElement('strong');value.textContent='> 0.081 eV';conclusion.append(label,value);body.append(conclusion);
  const time=document.createElement('p');time.className='report-time';time.textContent=(en?'Fresh exact-scalar recomputation · ':'本次已重新执行精确标量计算 · ')+Math.ceil(elapsed)+' ms';body.append(time);status.textContent=en?'Composition verified':'合成复核通过';status.className='badge success';download.hidden=false;
 }catch(error){report=null;status.textContent=en?'Verification failed':'复核失败';status.className='badge failure';const p=document.createElement('p');p.textContent=error.message;body.append(p);}
 finally{run.disabled=false;}
};
download.onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='qe-si-scalar-verification.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
