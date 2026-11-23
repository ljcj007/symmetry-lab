/* Display only the published actual-run summary, without inventing a new run. */
export function actualRunView(record,en=false){
 if(!record||typeof record.id!=='string'||!record.id||record.id.length>100)throw Error('Actual run is missing');
 const started=new Date(record.started_at),seconds=record.elapsed_seconds;
 if(!Number.isFinite(started.getTime())||typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)throw Error('Actual run timing is missing');
 const ids=['native-dft','ionic-input','infinite-scf'];
 const passed=['COMPLETED','SUCCEEDED'].includes(record.status)&&record.full_chain_certified===true&&Array.isArray(record.stages)&&ids.every(id=>record.stages.some(s=>s.id===id&&s.state==='SUCCEEDED'));
 const standalone=record.independent_client===true&&record.installed_python_required===false&&record.local_project_required===false;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(started);
 const date=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 const dateLabel=en?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',day:'numeric',month:'long',year:'numeric'}).format(started)+' · Beijing time':`${date.year}-${date.month}-${date.day} · 北京时间`;
 const elapsed=seconds.toFixed(3);
 const intro=passed?(en?
  `${standalone?'The standalone program, using its bundled runtime without a local project or installed Python,':'The latest completed workflow'} reran QE from atomic guesses and continued through native exports to the final certificate. All three stages passed in ${elapsed} seconds.`:
  `${standalone?'独立程序已使用自带环境，在无需本机项目和 Python 的运行条件下，':'最近一次完整流程已'}从原子初猜重新计算 QE，接续原生输出与最终证书；三个阶段全部通过，用时 ${elapsed} 秒。`):
  (en?'The latest published run has not obtained a complete certificate. Open its result summary for the stage status.':'最近公开运行尚未获得完整证书；请打开运行摘要查看各阶段状态。');
 return {passed,standalone,dateLabel,datetime:started.toISOString(),intro};
}

export function renderActualRun(document,record,en=false){
 const view=actualRunView(record,en),card=document.querySelector('.actual-run');
 if(!card)return view;
 const time=card.querySelector('[data-i18n="actualDate"]');time.textContent=view.dateLabel;time.setAttribute('datetime',view.datetime);
 card.querySelector('[data-i18n="actualIntro"]').textContent=view.intro;
 card.dataset.runId=record.id;
 card.querySelector('.native-stages').hidden=!view.passed;
 card.querySelector('.run-scope').hidden=!view.passed;
 return view;
}

export async function loadActualRun(document,en=false,fetcher=globalThis.fetch){
 try{
  const response=await fetcher('./data/one-click-run-result.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Published run could not be loaded');
  return renderActualRun(document,await response.json(),en);
 }catch{
  // The HTML retains the last independently completed record as a fallback.
  return null;
 }
}
