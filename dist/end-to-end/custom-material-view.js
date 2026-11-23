/* A fresh material has its own calculation and mathematical verification levels. */
const ids=['qe-calculation','native-operator','finite-point-spectrum','infinite-scf'];

function finiteNumber(value){return typeof value==='number'&&Number.isFinite(value);}
function count(value){return Number.isInteger(value)&&value>=0&&value<=100000;}
function dateLabel(value,en){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))throw Error('Missing actual custom-material date');
 return new Intl.DateTimeFormat(en?'en-GB':'zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)+(en?' · Beijing time':' · 北京时间');
}

export function customMaterialView(record,en=false){
 if(!record||record.schema!=='custom-qe-public-result.v1')throw Error('Unknown custom-material result');
 const awaiting=record.status==='AWAITING_ACTUAL_RUN';
 if(awaiting)return {awaiting:true,heading:en?'Custom-material validation':'自定义材料验证',intro:en?'The first published run is awaiting actual verification. No new-material certificate is claimed.':'本次新材料运行尚待实际验收，未赋予新材料证书。',rows:[],showGap:false};
 if(typeof record.id!=='string'||!record.id||record.id.length>100||typeof record.material_name!=='string'||!record.material_name||record.material_name.length>160)throw Error('Custom-material identity missing');
 if(!finiteNumber(record.elapsed_seconds)||record.elapsed_seconds<0)throw Error('Custom-material timing missing');
 if(!count(record.points_requested)||!count(record.points_certified)||record.points_certified>record.points_requested)throw Error('Invalid point coverage');
 // The v16 custom-material route has no generic infinite-SCF theorem receiver.
 // It must never inherit the separate Si certificate, even from a stale flag.
 if(record.infinite_scf_certified===true||record.full_chain_certified===true)throw Error('An unsupported infinite-SCF claim cannot be displayed');
 const completed=['COMPLETED','SUCCEEDED'].includes(record.status)&&record.calculation_completed===true&&record.numerical_scf_completed===true;
 const native=completed&&record.native_operator_received===true;
 const hasPointProof=native&&record.finite_proof_recomputed===true&&record.points_certified>0;
 const partial=hasPointProof&&record.points_certified<record.points_requested;
 const spectral=hasPointProof&&record.finite_point_spectrum_certified===true&&record.points_requested>0&&record.points_certified===record.points_requested;
 const coverage=`${record.points_certified} / ${record.points_requested}`;
 const rows=[
  {id:ids[0],passed:completed,label:en?'QE SCF calculation':'QE 自洽计算',state:completed?(en?'Completed':'计算完成'):(en?'Incomplete':'尚未完成'),detail:en?'Fresh input, pseudopotentials and original output are retained.':'保留本次输入、赝势和原始输出。'},
  {id:ids[1],passed:native,label:en?'Native NC operator reception':'原生 NC 算符接收',state:native?(en?'Received':'已接收'):(en?'Not received':'尚未接收'),detail:en?'The recorded scalar norm-conserving operator is checked independently.':'独立检查本次标量模守恒算符源。'},
  {id:ids[2],passed:spectral,label:en?'Rigorous finite-point spectrum':'严格有限点谱证书',state:spectral?(en?'Certified at the requested points':'请求点全部获证'):partial?(en?'Partly certified':'部分点获证'):(en?'Not certified':'尚未获证'),detail:en?`${coverage} requested k points. Bounds are recomputed for this material.`:`${coverage} 个请求 k 点；为本次材料重新计算严格界。`},
  {id:ids[3],passed:false,label:en?'Infinite-orbital SCF certificate':'无限轨道自洽证书',state:en?'Requires a separate proof':'需要独立证明',detail:en?'Numerical convergence and finite-point spectra do not supply this theorem.':'数值收敛和有限点谱不替代这一证明。'}
 ];
 const intro=completed?(en?`${record.material_name}: a fresh imported QE run completed in ${record.elapsed_seconds.toFixed(3)} seconds. Each verification level is reported separately.`:`${record.material_name}：已从导入的 QE 输入完成新计算，用时 ${record.elapsed_seconds.toFixed(3)} 秒。以下分别列出各层验证结果。`):(en?`${record.material_name}: the run has not completed the requested calculation and validation.`:`${record.material_name}：本次运行尚未完成所请求的计算与验证。`);
 const showGap=spectral&&record.finite_kpoint_common_gap_certified===true&&finiteNumber(record.common_gap_lower_eV)&&record.common_gap_lower_eV>0;
 const gap=showGap?record.common_gap_lower_eV.toPrecision(3):null;
 return {awaiting:false,heading:record.material_name,dateLabel:dateLabel(record.started_at,en),intro,rows,showGap,gap,completed,native,spectral,partial,coverage};
}

export function renderCustomMaterial(document,record,en=false){
 const view=customMaterialView(record,en),card=document.querySelector('#custom-material-result');
 if(!card)return view;
 card.dataset.state=view.awaiting?'awaiting':view.spectral?'finite-point-certified':view.completed?'calculated':'incomplete';
 card.querySelector('[data-custom="material"]').textContent=view.heading;
 card.querySelector('[data-custom="intro"]').textContent=view.intro;
 const time=card.querySelector('[data-custom="date"]');time.textContent=view.dateLabel??'';
 const list=card.querySelector('[data-custom="levels"]');list.replaceChildren();
 for(const row of view.rows){
  const li=document.createElement('li'),icon=document.createElement('span'),text=document.createElement('div'),label=document.createElement('strong'),detail=document.createElement('span'),state=document.createElement('span');
  icon.className=row.passed?'run-check':'run-pending';icon.textContent=row.passed?'✓':'·';icon.setAttribute('aria-hidden','true');label.textContent=row.label;detail.textContent=row.detail;text.append(label,detail);state.className=row.passed?'mode':'mode pending';state.textContent=row.state;li.append(icon,text,state);list.append(li);
 }
 const gap=card.querySelector('[data-custom="gap"]');gap.hidden=!view.showGap;
 gap.textContent=view.showGap?(en?`Common spectral window over these k points: approximately ${view.gap} eV. The strict bounds are the Ry values in the report.`:`这些 k 点的共同谱窗：约 ${view.gap} eV。严格界以报告中的 Ry 数值为准。`):'';
 const links=card.querySelector('[data-custom="downloads"]');links.hidden=view.awaiting;
 return view;
}

export async function loadCustomMaterial(document,en=false,fetcher=globalThis.fetch){
 try{const response=await fetcher('./data/custom-material-run.json',{cache:'no-cache'});if(!response.ok)throw Error('Custom result unavailable');return renderCustomMaterial(document,await response.json(),en);}
 catch{return null;}
}
