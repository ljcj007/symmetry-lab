/* QE numerical spectra and separately received certificate boundaries.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * No numerical eigenvalue is promoted to a certified eigenvalue interval.
 */
const words={
 zh:{eyebrow:'能带与验证结果',title:'哪些区间确定没有能级？',intro:'蓝色显示 QE 数值能带；绿色只标记证书已经排除全部能级的区间。选择材料、能带和 k 点，查看结论对应的实际数据。',language:'English',run:'材料 / 本次运行',band:'数值带序号',allBands:'全部能带',view:'视图',energy3d:'3D 能带点图',spectrum:'2D 逐点谱图',coverage:'3D k 点覆盖',slice:'k₃ 切片',allSlices:'全部记录切片',zero:'以本次费米能为零点',fermiMissing:'未记录费米能，显示原始能量',recorded:'记录 k 点',printed:'已输出数值带',strictPoints:'严格点谱',common:'记录点共同无谱窗',approx:'约',noWindow:'未取得严格窗',separate:'另层证明',numericalTitle:'数值计算与严格验证分开看',certTitle:'证书排除了有限计算载体中的漏态',certIntro:'绿色区间在已获证的记录点内不含任何本征值，包括图上没有逐条画出的深层或高能态。蓝点仍是数值结果。',partialIntro:'只有标绿的记录点获得了谱计数证书；其他点仍按数值结果展示。',numIntro:'这次能带可以用于观察数值趋势，但当前没有可显示的严格谱排除窗。',siIntro:'这组参考模型已接收无限轨道自洽证书。蓝色能带仍是 QE 数值；本视图没有逐带严格误差区间。',plotTitle:'数值能带与严格排除窗',spectrumTitle:'每个记录点的能级与排除窗',coverageTitle:'实际计算覆盖了哪些 k 点？',plotHelp:'拖动旋转，滚轮或按钮缩放。横轴为倒格矢分数坐标 k₁、k₂，竖轴为能量；k₃ 由切片选择和点颜色保留。',spectrumHelp:'横向顺序只是记录编号，不是高对称路径。每一列对应一个实际计算点；不在相邻点之间作认证插值。',coverageHelp:'三个轴为倒格矢分数坐标。这里只画原始记录点，不把空白空间解释为已验证，也不绘制假想的布里渊区边界。',numericLegend:'QE 数值能级',strictLegend:'记录点的严格排除区间',notLegend:'数值 / 未获点谱证书',coverageLegend:'该点的有限谱计数已获证',k3Color:'数值点颜色：k₃',onePoint:'本次只有一个 k 点；点图不会生成虚构的能带曲面。',pointOnly:'显示实际记录点，不生成插值曲面。',caption:'图形与 eV 小数是显示近似；绿色边界来自接收记录。',selected:'选中 k 点',point:'点',coords:'倒格矢分数坐标',cartesian:'笛卡尔坐标 / bohr⁻¹',energy:'能量 / eV',rawEnergy:'原始能量 / eV',relativeEnergy:'E − E_F / eV',occupation:'占据数',bandNumber:'带序号',pointNumerical:'本点数值结果',pointCertified:'本点有限谱计数已获证',pointUnproven:'本点没有严格点谱证书',countMeaning:'严格切口以下的态数',numericalGap:'第 r 与 r+1 带的数值间隔',certWindow:'严格无谱窗宽（显示近似）',lower:'排除窗下边界 L',upper:'排除窗上边界 U',notAvailable:'本次数据未提供',bandMeaning:'这里按能量排序选择第 n 条数值带，不自动给出跨 k 点连续的带连接关系。',why:'这个验证有什么用？',whyOne:'看见数值带隙：第 r 和 r+1 条数值能带之间有多远。',whyTwo:'排除漏态：完整有限载体的严格谱计数可保证绿色窗内没有未画出的能级。',whyThree:'确定覆盖范围：结论只用于实际获证的点和明确模型；连续 k 空间及无限自洽是另外的证明。',countSentence:'L 以下严格有 {r} 个本征值；U 以上为其余本征值。因此开区间 (L, U) 没有谱。',calculation:'QE 计算',native:'原生 NC 算符接收',finite:'完整有限载体的点谱计数',infinite:'无限轨道自洽',completed:'已完成',received:'已接收',certified:'已获证',unproven:'未获证',notApplicable:'不适用 / 未接收',scopeTitle:'本次模型与范围',scopeDefault:'有限点谱不等于连续布里渊区的能隙证明。数值 SCF 收敛不等于严格自洽根存在性。',scopeSingle:'本视图不提供单条能带的严格本征值区间。',local:'数据在当前浏览器本地处理，不上传。',csv:'导出当前数据 CSV',svg:'导出当前视图 SVG',reset:'重置视角',zoomIn:'放大',zoomOut:'缩小',noPoints:'当前切片没有数值点。',badData:'无法读取这份能带数据',visible:'当前显示',all:'全部',records:'个点',numericalLabel:'数值能带',noSingle:'数值位置；未逐带认证',singleBand:'只显示第 {n} 带',none:'无',cutScope:'绿色区间针对该点的完整有限载体。',recordOrder:'记录点编号（非路径距离）'},
 en:{eyebrow:'BANDS AND VERIFICATION',title:'Which intervals contain no energy levels?',intro:'Blue shows numerical QE bands. Green marks only intervals where a received certificate excludes every eigenvalue. Choose a run, band and k point to inspect the actual result.',language:'中文',run:'Material / run',band:'Numerical band index',allBands:'All bands',view:'View',energy3d:'3D band points',spectrum:'2D point spectra',coverage:'3D k-point coverage',slice:'k₃ slice',allSlices:'All recorded slices',zero:'Set this run’s Fermi energy to zero',fermiMissing:'No Fermi energy recorded; original energies shown',recorded:'Recorded k points',printed:'Numerical bands output',strictPoints:'Certified point spectra',common:'Common window at recorded points',approx:'≈',noWindow:'No certified window',separate:'Separate theorem',numericalTitle:'Separate numerical results from rigorous verification',certTitle:'The certificate excludes missed states in the finite carrier',certIntro:'At each certified recorded point, the green interval contains no eigenvalue, including states that are not plotted individually. Blue points remain numerical results.',partialIntro:'Only the green recorded points have a spectral-count certificate. Other points remain numerical results.',numIntro:'These bands show numerical trends. No rigorous spectral exclusion window is available for this run.',siIntro:'An infinite-orbital SCF certificate has been received for this reference model. Blue bands remain numerical QE values; no band-by-band rigorous error intervals are supplied here.',plotTitle:'Numerical bands and rigorous exclusion windows',spectrumTitle:'Levels and exclusion windows at recorded points',coverageTitle:'Which k points were actually covered?',plotHelp:'Drag to rotate; scroll or use the buttons to zoom. Horizontal axes are reciprocal fractional coordinates k₁ and k₂; height is energy. The slice selector and point colours retain k₃.',spectrumHelp:'Horizontal order is the record index, not a high-symmetry path. Each column is an actual calculated point. No certified interpolation joins neighbouring points.',coverageHelp:'All three axes are reciprocal fractional coordinates. Only original recorded points are shown. Blank space is not certified; no Brillouin-zone boundary is invented.',numericLegend:'Numerical QE level',strictLegend:'Rigorous exclusion at a recorded point',notLegend:'Numerical / no point-spectrum certificate',coverageLegend:'Finite spectral count certified at this point',k3Color:'Numerical point colour: k₃',onePoint:'This run has one k point. No artificial band surface is generated.',pointOnly:'Actual recorded points; no interpolated surface.',caption:'Plots and eV decimals are display approximations; green cuts come from the received records.',selected:'Selected k point',point:'Point',coords:'Reciprocal fractional coordinates',cartesian:'Cartesian coordinates / bohr⁻¹',energy:'Energy / eV',rawEnergy:'Original energy / eV',relativeEnergy:'E − E_F / eV',occupation:'Occupation',bandNumber:'Band index',pointNumerical:'Numerical result at this point',pointCertified:'Finite spectral count certified here',pointUnproven:'No rigorous point-spectrum certificate here',countMeaning:'Strict number of states below the lower cut',numericalGap:'Numerical separation of bands r and r+1',certWindow:'Certified window width (display approximation)',lower:'Lower exclusion cut L',upper:'Upper exclusion cut U',notAvailable:'Not supplied by this result',bandMeaning:'Band n is ordered by energy at each point. This does not establish a continuous band connection across k points.',why:'What does verification add?',whyOne:'See a numerical gap: inspect the separation between numerical bands r and r+1.',whyTwo:'Exclude missed states: complete finite-carrier spectral counts guarantee that no unplotted eigenvalue lies in the green window.',whyThree:'Identify coverage: use each conclusion only at its certified points and declared model. Continuous k space and infinite-orbital SCF require separate theorems.',countSentence:'Exactly {r} eigenvalues lie below L, and the remaining eigenvalues lie above U. The open interval (L, U) therefore contains no spectrum.',calculation:'QE calculation',native:'Native NC operator reception',finite:'Complete finite-carrier spectral count',infinite:'Infinite-orbital SCF',completed:'Completed',received:'Received',certified:'Certified',unproven:'Not certified',notApplicable:'Not applicable / not received',scopeTitle:'Model and scope',scopeDefault:'A finite-point spectrum is not a continuous-Brillouin-zone gap theorem. Numerical SCF convergence is not a rigorous SCF existence theorem.',scopeSingle:'This view supplies no rigorous eigenvalue interval for an individual band.',local:'Processed locally in this browser; no upload.',csv:'Export current data CSV',svg:'Export current view SVG',reset:'Reset view',zoomIn:'Zoom in',zoomOut:'Zoom out',noPoints:'No numerical points in this slice.',badData:'Cannot read these band data',visible:'Showing',all:'All',records:'points',numericalLabel:'Numerical band',noSingle:'Numerical position; not individually certified',singleBand:'Band {n} only',none:'None',cutScope:'The green interval concerns the complete finite carrier at this point.',recordOrder:'Record index (not path distance)'}
};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const f3=v=>finite(v)?v.toFixed(3).replace(/^-0\.000$/,'0.000'):'—';
const escapeXml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

export function selectedBandIndices(data,band='all'){
 if(band==='all')return Array.from({length:data.nbands},(_,i)=>i);
 if(band==='frontier')return Number.isInteger(data.spectral_index)&&data.spectral_index>0?[data.spectral_index-1,data.spectral_index].filter(i=>i<data.nbands):[];
 const i=Number(band);return Number.isInteger(i)&&i>=0&&i<data.nbands?[i]:[];
}

export function normalizeDataset(raw){
 if(!raw||raw.schema!=='qe-band-visualization.v1'||!Array.isArray(raw.points)||!raw.points.length||raw.points.length>10000)throw Error('Unknown or empty band dataset');
 const points=raw.points.map((p,i)=>{
  if(!Array.isArray(p.energies_eV)||!p.energies_eV.length||p.energies_eV.length>2048||!p.energies_eV.every(finite))throw Error('Invalid numerical energies');
  const k=p.k_fractional??p.k;
  if(!vector(k))throw Error('Missing reciprocal fractional coordinates');
  const c=p.certificate??p.proof??{};
  const dimensionOK=c.dimension===undefined||(Number.isInteger(c.dimension)&&c.dimension>=c.rank&&(!('negative_count_at_lower_cut'in c)||c.negative_count_at_lower_cut===c.rank)&&(!('positive_count_at_upper_cut'in c)||c.positive_count_at_upper_cut===c.dimension-c.rank));
  const certified=String(c.status).toLowerCase()==='certified'&&finite(c.lower_cut_eV)&&finite(c.upper_cut_eV)&&c.lower_cut_eV<c.upper_cut_eV&&Number.isInteger(c.rank)&&c.rank>0&&dimensionOK;
  const status=String(c.status??'unresolved').toLowerCase();
  return {...p,index:p.index??i+1,k_fractional:[...k],energies_eV:[...p.energies_eV],occupations:Array.isArray(p.occupations)?p.occupations:[],certificate:certified?{...c,status:'certified'}:{status:status==='certified'?'unresolved':status,reason:c.reason}};
 });
 return {...raw,id:String(raw.id??raw.run_id??raw.label??raw.name??'run'),label:String(raw.label??raw.name??raw.run_id??'QE'),points,nbands:Math.max(...points.map(p=>p.energies_eV.length)),scope:raw.scope??{},verification:raw.verification??{}};
}

export function sliceValues(data){
 const values=[];
 for(const p of data.points){const z=p.k_fractional[2];if(!values.some(v=>Math.abs(v-z)<1e-8))values.push(z);}
 return values.sort((a,b)=>a-b);
}

export function filterPoints(data,slice='all'){
 if(slice==='all')return data.points.map((p,position)=>({p,position}));
 const z=Number(slice);return data.points.map((p,position)=>({p,position})).filter(({p})=>Math.abs(p.k_fractional[2]-z)<1e-8);
}

export function proofFacts(data){
 const certified=data.points.filter(p=>p.certificate.status==='certified');
 const common=data.common_certificate;
 const collectionCertified=data.scope.finite_point_spectrum_certified===true&&certified.length===data.points.length;
 const validCommon=collectionCertified&&common&&finite(common.lower_cut_eV)&&finite(common.upper_cut_eV)&&common.lower_cut_eV<common.upper_cut_eV&&certified.every(p=>common.lower_cut_eV>=p.certificate.lower_cut_eV&&common.upper_cut_eV<=p.certificate.upper_cut_eV);
 return {certified:certified.length,total:data.points.length,collectionCertified,common:validCommon?common:null,infinite:data.scope.infinite_scf_certified===true,individuallyCertified:false,continuousCertified:false};
}

export function numericGap(point,rank){
 if(!Number.isInteger(rank)||rank<1||point.energies_eV.length<=rank)return null;
 return point.energies_eV[rank]-point.energies_eV[rank-1];
}

export function energyReferenceLabel(data,relative,lang='zh'){
 if(!relative)return lang==='zh'?'原始能量 / eV':'Original energy / eV';
 const kind=data.energy_reference_kind;
 if(kind==='fermi')return 'E − E_F / eV';
 if(kind==='highest-occupied')return lang==='zh'?'E − 最高占据能 / eV':'E − highest occupied level / eV';
 return lang==='zh'?'E − 记录参考能 / eV':'E − recorded reference / eV';
}

export function modelBudgetFacts(data){
 const m=data.model_certificate;
 if(!m||data.scope.infinite_scf_certified!==true||m.status!=='received'||m.root_exists!==true)return null;
 const ratio=m.closure?.force_to_boundary_ratio??m.force_to_stability_ratio_approx??m.force_to_boundary_ratio;
 if(!finite(ratio)||ratio<0||ratio>=1)return null;
 return {ratio,usedPercent:100*ratio,remainingPercent:100*(1-ratio),responseDirections:m.complete_response_received===true&&Number.isInteger(m.response_directions)&&m.response_directions>0?m.response_directions:null,normalization:String(m.closure?.normalization??m.normalization??'')};
}

export function asCsv(data,options={}){
 const band=options.band??'all',shift=options.relative&&finite(data.energy_reference_eV)?data.energy_reference_eV:0;
 const shown=selectedBandIndices(data,band);
 const rows=[['point_index','k1_fractional','k2_fractional','k3_fractional','band_index','numerical_energy_eV','occupation','point_spectral_count_status','strict_lower_cut_eV','strict_upper_cut_eV','spectral_index','individual_band_interval_certified','continuous_BZ_certified','energy_zero_eV','energy_zero_kind']];
 for(const {p}of filterPoints(data,options.slice??'all'))p.energies_eV.forEach((e,i)=>{
  if(!shown.includes(i))return;
  const c=p.certificate,ok=c.status==='certified';
  rows.push([p.index,...p.k_fractional,i+1,e-shift,p.occupations[i]??'',c.status,ok?c.lower_cut_eV-shift:'',ok?c.upper_cut_eV-shift:'',ok?c.rank:'',false,false,shift,options.relative?data.energy_reference_kind??'recorded-reference':'original']);
 });
 return rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
}

function tag(document,name,className,text){const el=document.createElement(name);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function option(document,value,text){const el=tag(document,'option',null,text);el.value=value;return el;}
function range(values){let lo=Infinity,hi=-Infinity;for(const value of values){if(value<lo)lo=value;if(value>hi)hi=value;}const span=hi-lo;return span>1e-10?[lo,hi]:[lo-.5,hi+.5];}
function palette(root){const s=getComputedStyle(root);const get=(k,fb)=>s.getPropertyValue(k).trim()||fb;return {ink:get('--be-ink','#172f38'),muted:get('--be-muted','#536b74'),line:get('--be-line','#d8e2e6'),blue:get('--be-blue','#286ca9'),green:get('--be-green','#148263'),orange:get('--be-orange','#b36715'),panel:get('--be-panel','#fff'),greenFill:get('--be-soft-green','#e2f4eb')};}
function numericColour(z,values,base){if(values.length<2)return base;const t=(z-values[0])/(values.at(-1)-values[0]||1);return `hsl(${195+62*t} ${57-12*t}% ${44+14*t}%)`;}

export function drawingToSvg(drawing,width,height,title){
 const shapes=drawing.map(s=>{
  const e=escapeXml;
  if(s.kind==='line')return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${e(s.color)}" stroke-width="${s.width??1}" opacity="${s.opacity??1}"/>`;
  if(s.kind==='circle')return `<circle cx="${s.x}" cy="${s.y}" r="${s.radius}" fill="${e(s.fill??'none')}" stroke="${e(s.stroke??'none')}" stroke-width="${s.width??1}" opacity="${s.opacity??1}"/>`;
  if(s.kind==='rect')return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${e(s.fill)}" opacity="${s.opacity??1}"/>`;
  if(s.kind==='text')return `<text x="${s.x}" y="${s.y}" fill="${e(s.color)}" font-family="system-ui,sans-serif" font-size="${s.size??14}" text-anchor="${s.align==='center'?'middle':s.align==='right'?'end':'start'}">${e(s.text)}</text>`;
  return '';
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${escapeXml(title)}</title>${shapes}</svg>`;
}

function paint(canvas,drawing,width,height){
 const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,width,height);
 for(const s of drawing){ctx.save();ctx.globalAlpha=s.opacity??1;ctx.lineWidth=s.width??1;
  if(s.kind==='line'){ctx.strokeStyle=s.color;ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();}
  else if(s.kind==='circle'){ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,2*Math.PI);if(s.fill){ctx.fillStyle=s.fill;ctx.fill();}if(s.stroke){ctx.strokeStyle=s.stroke;ctx.stroke();}}
  else if(s.kind==='rect'){ctx.fillStyle=s.fill;ctx.fillRect(s.x,s.y,s.w,s.h);}
  else if(s.kind==='text'){ctx.fillStyle=s.color;ctx.font=`${s.size??14}px system-ui, "Microsoft YaHei UI", sans-serif`;ctx.textAlign=s.align??'left';ctx.fillText(s.text,s.x,s.y);}
  ctx.restore();
 }
}

export function mountBandExplorer(root,rawDatasets){
 const document=root.ownerDocument;
 let datasets;
 try{datasets=(Array.isArray(rawDatasets)?rawDatasets:rawDatasets?.datasets??[rawDatasets]).map(normalizeDataset);}catch(e){root.replaceChildren(tag(document,'p','be-error','无法读取能带数据 / Cannot read band data: '+e.message));return {error:e.message};}
 if(!datasets.length){root.textContent='没有能带数据 / No band data';return {error:'empty'};}
 root.classList.add('be');
 const state={dataset:0,band:'all',view:'energy3d',slice:'all',selected:0,relative:finite(datasets[0].energy_reference_eV)&&datasets[0].energy_reference_kind==='fermi',lang:document.documentElement.lang.startsWith('en')?'en':'zh',yaw:-.55,pitch:.55,zoom:1};
 let ui={},drawing=[],hits=[],width=1000,height=530,destroyed=false;
 const data=()=>datasets[state.dataset],t=()=>words[state.lang],shift=()=>state.relative&&finite(data().energy_reference_eV)?data().energy_reference_eV:0;
 const text=(key)=>t()[key];
 function field(label,control){const el=tag(document,'label','be-field',label);el.append(control);return el;}
 function button(label,action,className){const b=tag(document,'button',className,label);b.type='button';b.addEventListener('click',action);return b;}
 function select(onChange){const el=tag(document,'select');el.addEventListener('change',()=>onChange(el.value));return el;}
 function build(){
  root.replaceChildren();ui={};
  const modelCertificate=data().scope.infinite_scf_certified===true;
  const headline=state.lang==='zh'?'从能带看懂验证结论':'Understand the bands and the verification';
  const subtitle=modelCertificate?(state.lang==='zh'?(data().scope.full_chain_certified?'数值能带展示候选；模型证书确认邻域内自洽解存在，完整响应已接收。':'数值能带展示候选；参考模型的邻域内自洽解存在性证书已接收。'):'Numerical bands show the candidate. The reference-model certificate establishes a nearby SCF solution'+(data().scope.full_chain_certified?' and receives complete response.':'.')):(state.lang==='zh'?'蓝点是数值能带；绿段是记录点已获证的无谱区间。选择能带查看。':'Blue: numerical bands. Green: certified exclusion windows at recorded k points.');
  const header=tag(document,'header','be-header'),heading=tag(document,'div');heading.append(tag(document,'p','be-eyebrow',text('eyebrow')),tag(document,'h1',null,headline),tag(document,'p','be-subtitle',subtitle));
  header.append(heading,button(text('language'),()=>{state.lang=state.lang==='zh'?'en':'zh';build();}));root.append(header);
  const toolbar=tag(document,'div','be-toolbar');
  ui.run=select(v=>{state.dataset=Number(v);state.band='all';state.slice='all';state.selected=0;state.relative=finite(data().energy_reference_eV)&&data().energy_reference_kind==='fermi';build();});
  datasets.forEach((d,i)=>ui.run.append(option(document,i,d.label)));ui.run.value=state.dataset;
  ui.band=select(v=>{state.band=v;update();});ui.band.append(option(document,'all',`${text('allBands')} (${data().nbands})`));if(Number.isInteger(data().spectral_index)&&data().spectral_index>0&&data().spectral_index<data().nbands)ui.band.append(option(document,'frontier',state.lang==='zh'?`占据边界附近 (${data().spectral_index} / ${data().spectral_index+1})`:`Occupation boundary (${data().spectral_index} / ${data().spectral_index+1})`));for(let i=0;i<data().nbands;i++)ui.band.append(option(document,i,`${state.lang==='zh'?'第 ':''}${i+1}${state.lang==='zh'?' 带':` · ${text('numericalLabel')}`}`));ui.band.value=state.band;
  ui.view=select(v=>{state.view=v;update();});for(const key of ['energy3d','spectrum','coverage'])ui.view.append(option(document,key,text(key)));ui.view.value=state.view;
  ui.slice=select(v=>{state.slice=v;const visible=filterPoints(data(),v);if(!visible.some(v=>v.position===state.selected))state.selected=visible[0]?.position??0;update();});ui.slice.append(option(document,'all',text('allSlices')));for(const z of sliceValues(data()))ui.slice.append(option(document,String(z),`k₃ = ${f3(z)}`));ui.slice.value=state.slice;ui.slice.disabled=sliceValues(data()).length<=1;
  toolbar.append(field(text('run'),ui.run),field(text('band'),ui.band),field(text('view'),ui.view),field(text('slice'),ui.slice));root.append(toolbar);
  const control=tag(document,'div','be-data-control be-chart-reference');ui.zero=tag(document,'input');ui.zero.type='checkbox';ui.zero.checked=state.relative;ui.zero.disabled=!finite(data().energy_reference_eV);ui.zero.addEventListener('change',()=>{state.relative=ui.zero.checked;update();});const zeroLabel=tag(document,'label','be-checkbox');const refText=data().energy_reference_kind==='fermi'?text('zero'):data().energy_reference_kind==='highest-occupied'?(state.lang==='zh'?'以记录的最高占据能为零点（数值参考）':'Set the recorded highest occupied level to zero (numerical reference)'):(state.lang==='zh'?'以记录参考能为零点':'Set the recorded reference to zero');zeroLabel.append(ui.zero,tag(document,'span',null,finite(data().energy_reference_eV)?`${refText} (${f3(data().energy_reference_eV)} eV)`:text('fermiMissing')));control.append(zeroLabel);
  ui.message=tag(document,'section','be-message');ui.message.setAttribute('aria-live','polite');
  ui.metrics=tag(document,'div','be-metrics');
  const stage=tag(document,'section','be-stage'),chartHeader=tag(document,'div','be-chart-header'),chartHeading=tag(document,'div');ui.plotTitle=tag(document,'h2');ui.plotHelp=tag(document,'p','be-chart-help');chartHeading.append(ui.plotTitle);ui.tools=tag(document,'div','be-chart-tools');const reset=button('↺',()=>{state.yaw=-.55;state.pitch=.55;state.zoom=1;render();});reset.title=text('reset');reset.setAttribute('aria-label',text('reset'));const minus=button('−',()=>{state.zoom=Math.max(.55,state.zoom/1.15);render();});minus.title=text('zoomOut');minus.setAttribute('aria-label',text('zoomOut'));const plus=button('+',()=>{state.zoom=Math.min(2.1,state.zoom*1.15);render();});plus.title=text('zoomIn');plus.setAttribute('aria-label',text('zoomIn'));ui.tools.append(reset,minus,plus);chartHeader.append(chartHeading,ui.tools);stage.append(chartHeader);
  const figure=tag(document,'figure','be-figure');ui.canvas=tag(document,'canvas','be-canvas');ui.canvas.setAttribute('role','img');ui.canvas.setAttribute('aria-label',text('plotTitle'));ui.tooltip=tag(document,'div','be-tooltip');ui.tooltip.hidden=true;figure.append(ui.canvas,ui.tooltip);ui.caption=tag(document,'figcaption','be-caption');figure.append(ui.caption);stage.append(figure);ui.legend=tag(document,'div','be-legend');stage.append(ui.legend,control,ui.plotHelp);root.append(stage,ui.message,ui.metrics);ui.modelBudget=tag(document,'section','be-card be-model-budget');root.append(ui.modelBudget);root.append(tag(document,'p','be-energy-note',state.lang==='zh'?'不同材料的零点各自定义，不作绝对能级对齐。':'Energy references are run-specific; different materials are not aligned on an absolute scale.'));
  const details=tag(document,'div','be-details'),pointCard=tag(document,'section','be-card');pointCard.append(tag(document,'h2',null,text('selected')));ui.point=select(v=>{state.selected=Number(v);updatePoint();render();});data().points.forEach((p,i)=>ui.point.append(option(document,i,`${text('point')} ${p.index} · (${p.k_fractional.map(f3).join(', ')})`)));pointCard.append(field(text('point'),ui.point));ui.coordinates=tag(document,'p','be-coords');ui.pointProof=tag(document,'p','be-point-proof');ui.values=tag(document,'dl','be-value-list');ui.tableWrap=tag(document,'div','be-table-wrap');pointCard.append(ui.coordinates,ui.pointProof,ui.values,ui.tableWrap,tag(document,'p','be-scope',text('bandMeaning')));details.append(pointCard);
  const explanation=tag(document,'section','be-card be-explanation');explanation.append(tag(document,'h2',null,text('why')));const ol=tag(document,'ol');
  const uses=modelCertificate?(state.lang==='zh'?[`数值能带展示这次记录的 ${data().points.length} 个 k 点上，已输出能级怎样变化；点的顺序不自动构成高对称路径。`,'模型级证书把一个数值迭代候选提升为存在性结论：在所声明参考方程和邻域内，确有占据自洽解。',data().scope.full_chain_certified?'该参考模型还接收了完整势响应的可逆性；这不等于每条蓝色能带都有严格误差条。':'模型级存在性不自动给出每条数值能带的误差范围，也不证明唯一性或全局基态。']:[`Numerical bands show the output levels at the ${data().points.length} recorded k points; record order does not establish a high-symmetry path.`,'The model certificate turns an iterative candidate into an existence conclusion: an occupied SCF solution exists in the declared reference equation and neighbourhood.',data().scope.full_chain_certified?'Complete potential-response invertibility is also received for this reference model. It does not supply a rigorous error bar for each blue band.':'Model-level existence does not automatically bound individual numerical bands or prove uniqueness or a global ground state.']):['whyOne','whyTwo','whyThree'].map(text);
  for(const value of uses)ol.append(tag(document,'li',null,value));explanation.append(ol);ui.status=tag(document,'div');explanation.append(ui.status,tag(document,'h3','be-scope',text('scopeTitle')));ui.scope=tag(document,'p');explanation.append(ui.scope,tag(document,'p','be-scope',text('scopeSingle')));details.append(explanation);root.append(details);
  const footer=tag(document,'footer','be-footer'),exports=tag(document,'div','be-export');exports.append(button(text('csv'),()=>download(asCsv(data(),state),'text/csv;charset=utf-8','band-values.csv')),button(text('svg'),()=>download(drawingToSvg(drawing,width,height,text('plotTitle')),'image/svg+xml;charset=utf-8','band-view.svg')));footer.append(tag(document,'span',null,text('local')),exports);root.append(footer);
  wireCanvas();update();
 }
 function metric(label,value,note){const el=tag(document,'div','be-metric');el.append(tag(document,'span',null,label),tag(document,'strong',null,value));if(note)el.append(tag(document,'small',null,note));return el;}
 function update(){
  const d=data(),facts=proofFacts(d),L=t(),certified=facts.certified>0;
  ui.message.dataset.kind=certified||facts.infinite?'certified':'numerical';
  let intro=certified?(facts.certified===facts.total?L.certIntro:L.partialIntro):facts.infinite?L.siIntro:L.numIntro;
  const dimensions=d.points.filter(p=>p.certificate.status==='certified').map(p=>p.certificate.dimension??p.full_dimension).filter(v=>Number.isInteger(v)&&v>0);
  let dimensionLabel=null;
  if(dimensions.length){const min=Math.min(...dimensions),max=Math.max(...dimensions);dimensionLabel=min===max?String(min):`${min}–${max}`;intro+=' '+(state.lang==='zh'?`本图输出 ${d.nbands} 条数值带，严格计数覆盖 ${dimensionLabel} 维完整有限载体；因此结论也约束没有逐条画出的能级。`:`The plot outputs ${d.nbands} numerical bands, while the strict count covers the complete ${dimensionLabel}-dimensional finite carrier, including levels not drawn individually.`);}
  if(!certified&&!facts.infinite&&d.verification.reason)intro+=' '+(Array.isArray(d.verification.reason)?d.verification.reason.join(' '):d.verification.reason);
  ui.message.replaceChildren(tag(document,'strong',null,certified?L.certTitle:facts.infinite?(state.lang==='zh'?'参考模型的无限轨道自洽证书已接收':'Infinite-orbital SCF certificate received for the reference model'):L.numericalTitle),tag(document,'p',null,intro));
  const pointMetric=facts.infinite&&facts.certified===0?metric(state.lang==='zh'?'模型级自洽证书':'Model-level SCF certificate',L.received,state.lang==='zh'?'存在性与能带逐点界分开':'Existence is separate from pointwise band bounds'):metric(L.strictPoints,`${facts.certified} / ${facts.total}`);
  const commonMetric=facts.infinite&&!facts.common?metric(state.lang==='zh'?'逐点严格谱窗':'Pointwise rigorous windows',state.lang==='zh'?'本视图未接收':'Not received in this view',L.scopeSingle):metric(L.common,facts.common?`${L.approx} ${f3(facts.common.gap_lower_eV??facts.common.upper_cut_eV-facts.common.lower_cut_eV)} eV`:L.noWindow,facts.common?(state.lang==='zh'?'只覆盖这些记录点':'At these recorded points only'):undefined);
  ui.metrics.replaceChildren(metric(L.recorded,String(d.points.length)),metric(L.printed,String(d.nbands),dimensionLabel?(state.lang==='zh'?`严格计数：全部 ${dimensionLabel} 维`:`Strict count: all ${dimensionLabel} dimensions`):L.noSingle),pointMetric,commonMetric);
  const budget=modelBudgetFacts(d);ui.modelBudget.hidden=!budget;ui.modelBudget.replaceChildren();
  if(budget){
   const zh=state.lang==='zh';ui.modelBudget.append(tag(document,'h2',null,zh?'自洽证书为什么能够闭合？':'Why does the SCF certificate close?'),tag(document,'p',null,zh?'中心误差上界小于边界稳定性预算，因此所声明参考方程在邻域内存在占据自洽解。':'The upper bound on the centre force is below the boundary-stability budget. The declared reference equation therefore has an occupied SCF solution in the neighbourhood.'));
   const labels=tag(document,'div','be-budget-labels'),used=tag(document,'span',null,(zh?'中心误差约 ':'Centre force ≈ ')+budget.usedPercent.toFixed(1)+'%'),remaining=tag(document,'span',null,(zh?'剩余预算约 ':'Remaining budget ≈ ')+budget.remainingPercent.toFixed(1)+'%');labels.append(used,remaining);
   const bar=tag(document,'div','be-budget-bar');bar.setAttribute('role','img');bar.setAttribute('aria-label',labels.textContent);const fill=tag(document,'span','be-budget-used'),spare=tag(document,'span','be-budget-spare');fill.style.width=budget.usedPercent+'%';spare.style.width=budget.remainingPercent+'%';bar.append(fill,spare);
   const ratio=tag(document,'p','be-budget-ratio',zh?`显示近似比值 ${f3(budget.ratio)}；严格小于 1 的不等式已由模型证书接收。`:`Displayed approximate ratio: ${f3(budget.ratio)}. The model certificate receives the strict inequality below 1.`);
   ui.modelBudget.append(labels,bar,ratio);if(budget.responseDirections)ui.modelBudget.append(tag(document,'p',null,zh?`另已接收 ${budget.responseDirections} 个势方向的完整响应可逆性。`:`Complete response invertibility is also received for ${budget.responseDirections} potential directions.`));
   ui.modelBudget.append(tag(document,'p','be-budget-note',zh?'这比较的是 H¹ 图表中的归一化模型量，不是 eV 能带误差，也不是统计置信度。':'These are normalized model quantities in the H¹ chart, not eV band errors or statistical confidence.'));
  }
  ui.plotTitle.textContent=L[state.view==='energy3d'?'plotTitle':state.view==='spectrum'?'spectrumTitle':'coverageTitle'];ui.plotHelp.textContent=L[state.view==='energy3d'?'plotHelp':state.view==='spectrum'?'spectrumHelp':'coverageHelp'];ui.tools.hidden=state.view==='spectrum';ui.band.disabled=state.view==='coverage';
  ui.legend.replaceChildren();const legend=(className,label)=>{const span=tag(document,'span','be-legend-item');span.append(tag(document,'i',className),tag(document,'span',null,label));return span;};
  ui.legend.append(legend('be-dot',L.numericLegend),legend('be-window',state.view==='coverage'?L.coverageLegend:L.strictLegend));
  if(state.view==='coverage')ui.legend.append(legend('be-not-proven',L.notLegend));
  if(state.view==='energy3d'&&state.slice==='all'&&sliceValues(d).length>1){const key=tag(document,'span','be-color-key');key.append(tag(document,'i','be-gradient'),tag(document,'span',null,L.k3Color));ui.legend.append(key);}
  const visible=filterPoints(d,state.slice);ui.caption.textContent=`${d.points.length===1?L.onePoint:L.pointOnly} ${L.visible} ${visible.length} / ${d.points.length} ${L.records}. ${L.caption}`;
  ui.status.replaceChildren();const values=[['calculation',d.verification.calculation_completed===true,'completed'],['native',d.verification.native_operator_received===true,'received'],['finite',facts.collectionCertified,'certified'],['infinite',facts.infinite,'received']];
  for(const [key,ok,pass]of values){const missing=facts.infinite&&key==='finite'?(state.lang==='zh'?'本视图未接收':'Not received in this view'):key==='native'?L.notApplicable:L.unproven;const row=tag(document,'div','be-status-row'),badge=tag(document,'span','be-badge',ok?L[pass]:missing);badge.dataset.kind=ok?'certified':'numerical';row.append(tag(document,'span',null,L[key]),badge);ui.status.append(row);}
  const description=d.scope.description??d.scope.scope??d.scope_description??'';ui.scope.textContent=(typeof description==='string'?description:'')+' '+L.scopeDefault;
  updatePoint();render();
 }
 function updatePoint(){
  const d=data(),p=d.points[state.selected]??d.points[0],c=p.certificate,L=t(),ok=c.status==='certified',rank=ok?c.rank:d.spectral_index;
  ui.point.value=state.selected;ui.coordinates.textContent=`${L.coords}: (${p.k_fractional.map(f3).join(', ')})`+(vector(p.k_cartesian_bohr_inverse)?` · ${L.cartesian}: (${p.k_cartesian_bohr_inverse.map(f3).join(', ')})`:'');
  ui.pointProof.dataset.kind=ok?'certified':'numerical';ui.pointProof.textContent=ok?L.countSentence.replace('{r}',String(c.rank)):d.scope.infinite_scf_certified?(state.lang==='zh'?'此视图未接收该点的逐带严格区间；模型级自洽证书独立显示。':'This view has no received band-by-band rigorous intervals at this point; the model-level SCF certificate is displayed separately.'):L.pointUnproven+(c.reason?' · '+c.reason:'');
  ui.values.replaceChildren();const pair=(k,v)=>{ui.values.append(tag(document,'dt',null,k),tag(document,'dd',null,v));};
  const dimension=c.dimension??p.full_dimension;if(ok&&Number.isInteger(dimension))pair(state.lang==='zh'?'已绘数值带 / 严格计数载体维数':'Bands drawn / rigorously counted dimension',`${p.energies_eV.length} / ${dimension}`);
  pair(L.countMeaning,ok?String(c.rank):L.notAvailable);const gap=numericGap(p,rank);pair(L.numericalGap,finite(gap)?`${f3(gap)} eV`:L.notAvailable);
  pair(L.certWindow,ok?`${L.approx} ${f3(c.gap_lower_eV??c.upper_cut_eV-c.lower_cut_eV)} eV`:L.notAvailable);
  if(ok){pair(L.lower,`${f3(c.lower_cut_eV-shift())} eV`);pair(L.upper,`${f3(c.upper_cut_eV-shift())} eV`);}
  const shown=selectedBandIndices(d,state.band);const table=tag(document,'table'),thead=tag(document,'thead'),head=tag(document,'tr');for(const title of [L.bandNumber,energyReferenceLabel(d,state.relative,state.lang),L.occupation])head.append(tag(document,'th',null,title));thead.append(head);table.append(thead);const tbody=tag(document,'tbody');p.energies_eV.forEach((e,i)=>{const row=tag(document,'tr');row.dataset.selected=String(state.band!=='all'&&shown.includes(i));row.append(tag(document,'td',null,String(i+1)),tag(document,'td',null,f3(e-shift())),tag(document,'td',null,finite(p.occupations[i])?f3(p.occupations[i]):'—'));tbody.append(row);});table.append(tbody);ui.tableWrap.replaceChildren(table);
 }
 function render(){
  if(destroyed||!ui.canvas)return;
  width=Math.max(260,ui.canvas.clientWidth||root.clientWidth||900);height=Math.max(300,ui.canvas.clientHeight||530);drawing=[];hits=[];
  const d=data(),L=t(),col=palette(root),visible=filterPoints(d,state.slice);
  const line=(x1,y1,x2,y2,color=col.line,w=1,opacity=1)=>drawing.push({kind:'line',x1,y1,x2,y2,color,width:w,opacity});
  const label=(x,y,text,color=col.muted,align='left',size=14)=>{size=Math.max(14,size);const approximateWidth=[...String(text)].reduce((n,c)=>n+(c.charCodeAt(0)>255?size:size*.58),0);if(align==='center')x=Math.max(8+approximateWidth/2,Math.min(width-8-approximateWidth/2,x));else if(align==='right')x=Math.max(8+approximateWidth,Math.min(width-8,x));else x=Math.max(8,Math.min(width-8-approximateWidth,x));drawing.push({kind:'text',x,y,text,color,align,size});};
  const dot=(x,y,r,fill,stroke,width=1,opacity=1)=>drawing.push({kind:'circle',x,y,radius:r,fill,stroke,width,opacity});
  if(!visible.length){label(width/2,height/2,L.noPoints,col.muted,'center');paint(ui.canvas,drawing,width,height);return;}
  const shown=selectedBandIndices(d,state.band);const es=visible.flatMap(({p})=>p.energies_eV.filter((_,i)=>shown.includes(i)).map(e=>e-shift()));
  for(const {p}of visible)if(p.certificate.status==='certified'&&state.view!=='coverage')es.push(p.certificate.lower_cut_eV-shift(),p.certificate.upper_cut_eV-shift());
  const er=range(es.length?es:[0]);const epad=(er[1]-er[0])*.09;er[0]-=epad;er[1]+=epad;
  if(state.view==='spectrum'){
   const left=width<500?64:82,right=width-30,top=26,bottom=height-64;
   const x=i=>left+(i+.5)*(right-left)/visible.length,y=e=>bottom-(e-er[0])/(er[1]-er[0])*(bottom-top),cell=(right-left)/visible.length;
   for(let i=0;i<=5;i++){const e=er[0]+(er[1]-er[0])*i/5,yy=y(e);line(left,yy,right,yy);label(left-10,yy+5,f3(e),col.muted,'right',width<500?12:14);}
   line(left,top,left,bottom,col.muted);line(left,bottom,right,bottom,col.muted);
   if(state.relative&&er[0]<0&&er[1]>0){line(left,y(0),right,y(0),col.muted,1.4);label(right,y(0)-7,d.energy_reference_kind==='fermi'?'E_F = 0':state.lang==='zh'?'参考能 = 0':'Reference = 0',col.muted,'right',12);}
   visible.forEach(({p,position},i)=>{
    const xx=x(i),c=p.certificate;
    if(c.status==='certified'){
     const yl=y(c.lower_cut_eV-shift()),yu=y(c.upper_cut_eV-shift()),w=Math.max(3,Math.min(26,cell*.72));drawing.push({kind:'rect',x:xx-w/2,y:yu,w,h:yl-yu,fill:col.greenFill});line(xx-w/2,yu,xx+w/2,yu,col.green,1.6);line(xx-w/2,yl,xx+w/2,yl,col.green,1.6);
    }
    p.energies_eV.forEach((e,b)=>{if(!shown.includes(b))return;const yy=y(e-shift()),r=state.band==='all'?2.3:4;dot(xx,yy,r,col.blue,position===state.selected?col.ink:undefined,position===state.selected?1.2:0,.85);hits.push({x:xx,y:yy,position,band:b,e:e-shift()});});
    if(visible.length<=12||i%Math.ceil(visible.length/(width<500?4:8))===0)label(xx,bottom+24,String(p.index),col.muted,'center');
    if(position===state.selected){line(xx,bottom+3,xx,bottom+10,col.ink,3);}
   });
   label((left+right)/2,height-16,L.recordOrder,col.muted,'center');label(12,16,energyReferenceLabel(d,state.relative,state.lang),col.muted,'left',width<500?12:14);
  }else{
   const xr=range(visible.map(({p})=>p.k_fractional[0])),yr=range(visible.map(({p})=>p.k_fractional[1])),zr=range(visible.map(({p})=>p.k_fractional[2]));
   const norm=(x,r)=>(x-(r[0]+r[1])/2)/(r[1]-r[0])*1.8;
   const s=Math.min(width*.27,height*.31)*state.zoom;
   const project=(x,y,z)=>{const a=x*Math.cos(state.yaw)-y*Math.sin(state.yaw),b=x*Math.sin(state.yaw)+y*Math.cos(state.yaw);return {x:width/2+a*s,y:height*.55+(b*Math.sin(state.pitch)-z*Math.cos(state.pitch))*s,depth:b*Math.cos(state.pitch)+z*Math.sin(state.pitch)};};
   const origin=project(-1.05,-1.05,-.95),axes=[project(1.13,-1.05,-.95),project(-1.05,1.13,-.95),project(-1.05,-1.05,1.15)];
   const zTitle=state.view==='coverage'?'k₃':energyReferenceLabel(d,state.relative,state.lang);
   axes.forEach((a,i)=>{line(origin.x,origin.y,a.x,a.y,col.muted,1.3);label(a.x+(i===0?7:-5),a.y+(i===2?-9:18),['k₁','k₂',zTitle][i],col.ink,i===2?'center':'left',width<500?12:14);});
   for(let j=0;j<=4;j++){const n=-.9+j*.45,a=project(n,-.9,-.95),b=project(n,.9,-.95),c=project(-.9,n,-.95),e=project(.9,n,-.95);line(a.x,a.y,b.x,b.y);line(c.x,c.y,e.x,e.y);}
   const rz=state.view==='coverage'?zr:er;
   for(let i=0;i<=4;i++){const val=rz[0]+(rz[1]-rz[0])*i/4,p=project(-1.05,-1.05,-.9+i*.45);line(p.x-4,p.y,p.x+4,p.y,col.muted);label(p.x-9,p.y+4,f3(val),col.muted,'right',width<500?11:12);}
   const dataDots=[];
   for(const {p,position}of visible){
    const xx=norm(p.k_fractional[0],xr),yy=norm(p.k_fractional[1],yr),c=p.certificate;
    if(state.view==='coverage'){const a=project(xx,yy,norm(p.k_fractional[2],zr));dataDots.push({...a,position,band:null,fill:c.status==='certified'?col.green:col.orange,r:position===state.selected?6:4.5,e:null});}
    else{
     if(c.status==='certified'){const a=project(xx,yy,norm(c.lower_cut_eV-shift(),er)),b=project(xx,yy,norm(c.upper_cut_eV-shift(),er));line(a.x,a.y,b.x,b.y,col.green,5,.40);dot(a.x,a.y,2,col.green);dot(b.x,b.y,2,col.green);}
     p.energies_eV.forEach((e,b)=>{if(!shown.includes(b))return;const a=project(xx,yy,norm(e-shift(),er));dataDots.push({...a,position,band:b,fill:numericColour(p.k_fractional[2],sliceValues(d),col.blue),r:state.band==='all'?3.2:5,e:e-shift()});});
    }
   }
   dataDots.sort((a,b)=>a.depth-b.depth).forEach(p=>{dot(p.x,p.y,p.r,p.fill,p.position===state.selected?col.ink:undefined,p.position===state.selected?1.3:0,.88);hits.push(p);});
   label(width-18,22,state.view==='coverage'?L.coverage:state.band==='all'?`${L.allBands} · ${d.nbands}`:state.band==='frontier'?(state.lang==='zh'?'占据边界附近':'Occupation boundary'):L.singleBand.replace('{n}',String(Number(state.band)+1)),col.muted,'right',14);
   label(18,height-18,`${L.slice}: ${state.slice==='all'?L.allSlices:f3(Number(state.slice))}`,col.muted,'left',width<500?12:14);
  }
  paint(ui.canvas,drawing,width,height);
 }
 function nearest(event){const box=ui.canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;let found=null,distance=15;for(const hit of hits){const dd=Math.hypot(hit.x-x,hit.y-y);if(dd<distance){distance=dd;found=hit;}}return {hit:found,x,y};}
 function wireCanvas(){
  let drag=null,moved=false;
  ui.canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch};moved=false;ui.canvas.setPointerCapture(e.pointerId);});
  ui.canvas.addEventListener('pointermove',e=>{
   if(drag&&state.view!=='spectrum'){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;state.yaw=drag.yaw+dx*.009;state.pitch=Math.max(-1.1,Math.min(1.3,drag.pitch+dy*.008));ui.tooltip.hidden=true;render();return;}
   const {hit,x,y}=nearest(e);ui.canvas.style.cursor=hit?'pointer':state.view==='spectrum'?'default':'grab';ui.tooltip.hidden=!hit;
   if(hit){const p=data().points[hit.position];ui.tooltip.textContent=`${text('point')} ${p.index}`+(hit.band!==null?` · ${text('numericalLabel')} ${hit.band+1}: ${f3(hit.e)} eV`:` · (${p.k_fractional.map(f3).join(', ')})`);ui.tooltip.style.left=Math.max(8,Math.min(width-250,x+13))+'px';ui.tooltip.style.top=Math.max(8,y-46)+'px';}
  });
  ui.canvas.addEventListener('pointerup',e=>{if(!moved){const {hit}=nearest(e);if(hit){state.selected=hit.position;updatePoint();render();}}drag=null;});
  ui.canvas.addEventListener('pointercancel',()=>{drag=null;});ui.canvas.addEventListener('pointerleave',()=>{ui.tooltip.hidden=true;});
  ui.canvas.addEventListener('wheel',e=>{if(state.view==='spectrum')return;e.preventDefault();state.zoom=Math.max(.55,Math.min(2.1,state.zoom*Math.exp(-e.deltaY*.001)));render();},{passive:false});
 }
 function download(content,type,name){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=tag(document,'a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 build();
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>render()):null;observer?.observe(root);
 const theme=window.matchMedia?.('(prefers-color-scheme: dark)');const themeChanged=()=>render();theme?.addEventListener?.('change',themeChanged);
 return {setDatasets(next){datasets=next.map(normalizeDataset);state.dataset=0;state.selected=0;state.band='all';state.slice='all';state.relative=finite(data().energy_reference_eV)&&data().energy_reference_kind==='fermi';build();},getState:()=>({...state}),selectPoint(position){if(Number.isInteger(position)&&position>=0&&position<data().points.length){state.selected=position;updatePoint();render();}},destroy(){destroyed=true;observer?.disconnect();theme?.removeEventListener?.('change',themeChanged);root.replaceChildren();}};
}
