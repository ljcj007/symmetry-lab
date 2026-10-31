import {latestCalculation,makeProject,addRecord,validateJSON,saveProject,RELEASE,safeRecordRoute} from './material-notebook.js?v=20261031-entry1';
import {esc,num,table} from './response-views.js?v=20261031-entry1';
import {quantumCurveSVG} from './quantum-plots.js?v=20261031-entry1';
const KEY='symmetry-lab.comparison.v1',MAX_BYTES=3*1024*1024;
const clone=x=>JSON.parse(JSON.stringify(x));
const print=x=>typeof x==='number'?num(x):x===undefined?'未提供':typeof x==='string'?x:JSON.stringify(x);
let memory=null,memoryDirty=false;
export const newComparison=()=>({format:'symmetry-lab-comparison',version:1,release:RELEASE,a:null,b:null,prediction:'',predictionSavedAt:'',explanation:''});
export function validateComparison(value){
 validateJSON(value);if(!value||value.format!=='symmetry-lab-comparison'||value.version!==1)throw Error('不是参数对照文件（版本1）。');
 for(const key of ['prediction','explanation','predictionSavedAt','release'])if(typeof value[key]!=='string'||value[key].length>12000)throw Error('预测或解释格式不正确。');
 for(const key of ['a','b'])if(value[key]!==null)addRecord(makeProject(),value[key]);
 if(value.b&&!value.a)throw Error('对照B需要先固定A。');
 if(value.a&&value.b&&value.a.action!==value.b.action)throw Error('A和B必须来自同一计算工具；跨模型讨论请使用项目作业。');
 if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_BYTES)throw Error('对照文件超过3 MiB，请用材料项目保存较大的结果。');
 return value;
}
export function comparisonDifferences(a,b){
 const out=[];
 function walk(x,y,path=''){for(const key of new Set([...Object.keys(x||{}),...Object.keys(y||{})])){const p=path?path+'.'+key:key,v=x?.[key],w=y?.[key];if(v&&w&&typeof v==='object'&&typeof w==='object'&&!Array.isArray(v)&&!Array.isArray(w))walk(v,w,p);else if(JSON.stringify(v)!==JSON.stringify(w))out.push({key:p,a:v,b:w});}}
 walk(a,b);return out;
}
export function comparablePlots(a,b){
 if(!a||!b||a.action!==b.action||a.release!==b.release)return [];
 const parameters=['model','experiment','probe','responseKind','spin','pointGroup'];
 if(parameters.some(k=>JSON.stringify(a.input[k])!==JSON.stringify(b.input[k])))return [];
 const pa=Array.isArray(a.result.plots)?a.result.plots:[],pb=Array.isArray(b.result.plots)?b.result.plots:[];
 return pa.flatMap((p,i)=>{const q=pb.find((r,j)=>(p.id&&r.id?p.id===r.id:i===j)&&p.title===r.title&&p.xLabel===r.xLabel&&p.yLabel===r.yLabel);if(!q||!Array.isArray(p.series)||!Array.isArray(q.series))return [];const series=[...p.series.map(s=>({...s,label:'A · '+s.label})),...q.series.map(s=>({...s,label:'B · '+s.label}))];if(series.some(s=>!Array.isArray(s.points)||s.points.length>5000))return [];return [{...p,series}];});
}
export function setComparisonSlot(value,slot,record){
 if(!['a','b'].includes(slot))throw Error('未知对照位置。');
 if(!record)throw Error('请先在计算中心或课堂完成一次计算，再返回固定结果。');
 const next=clone(value);if(slot==='a'){next.a=clone(record);next.b=null;next.prediction='';next.predictionSavedAt='';next.explanation='';}else{if(!next.a)throw Error('请先固定A。');if(next.a.action!==record.action)throw Error('请选择与A相同的计算工具。');next.b=clone(record);}
 return validateComparison(next);
}
function load(){if(memoryDirty&&memory)return clone(memory);try{const raw=localStorage.getItem(KEY);if(raw)return clone(validateComparison(JSON.parse(raw)));}catch{}return memory?clone(memory):newComparison();}
function persist(data){validateComparison(data);memory=clone(data);try{localStorage.setItem(KEY,JSON.stringify(data));memoryDirty=false;return '';}catch{memoryDirty=true;return '当前浏览器存储空间不足，本页暂存于内存；请导出JSON备份。';}}
export function renderComparisonLab({container,download}){
 let state=load(),message='',busy=false;
 container.innerHTML='<section class="obs-page comparison-lab"></section>';const root=container.firstElementChild,$=s=>root.querySelector(s),current=()=>root.parentNode===container;
 const save=()=>{message=persist(state)||'已保存在本机；可以返回原工具继续实验。';};
 function draw(){if(!current())return;const recent=latestCalculation(),diff=state.a&&state.b?comparisonDifferences(state.a.input,state.b.input):[],plots=comparablePlots(state.a,state.b);
  root.innerHTML=`<header class="obs-header"><span class="obs-eyebrow">PREDICT · COMPARE · EXPLAIN</span><h2>参数对照实验</h2><p>先运行一次计算并固定A，写下预测，再回到同一工具改变参数并固定B。原始结果与版本随JSON导出。</p></header><div class="compare-controls"><a href="#compute">选择计算工具 →</a><a href="#atlas/notebook">材料研究记录 →</a><button id="cmp-a" class="primary" ${recent?'':'disabled'}>将最近计算固定为A</button><button id="cmp-b" class="secondary" ${state.a&&recent?'':'disabled'}>将最近计算固定为B</button></div><p role="status" id="cmp-status">${esc(message||'最近计算：'+(recent?.title||'尚无计算结果'))}</p><div class="compare-grid">${['a','b'].map(key=>{const r=state[key];return `<article class="compare-card"><h3>${key.toUpperCase()} · ${esc(r?.title||'等待固定结果')}</h3>${r?`<p>${esc(r.release)} · ${esc(r.created)}</p><a href="#${esc(safeRecordRoute(r.route))}">返回对应工具 →</a><details><summary>原始输入参数</summary><pre>${esc(JSON.stringify(r.input,null,2))}</pre></details>${Array.isArray(r.result.summary)?table(['结果','数值'],r.result.summary.map(x=>[x.label,print(x.value)+(x.unit?' '+x.unit:'')])):'<p>完整结果保存在导出文件及材料项目中。</p>'}`:'<p>计算后返回这里固定结果。</p>'}</article>`;}).join('')}</div><section class="br-predict"><h3>先预测，再解释</h3><label>运行B之前的预测<textarea id="cmp-prediction" maxlength="12000" ${state.b?'disabled':''}>${esc(state.prediction)}</textarea></label><button id="cmp-save-prediction" class="secondary" ${!state.a||state.b?'disabled':''}>保存预测</button><p>${state.predictionSavedAt?'预测记录时间：'+esc(state.predictionSavedAt):'尚未记录预测；也可以直接使用普通参数对照。'}${state.b?'；B已固定，预测锁定。':''}</p><label>观察B后写下解释<textarea id="cmp-explanation" maxlength="12000">${esc(state.explanation)}</textarea></label><button id="cmp-save" class="secondary">保存解释</button><p>保存和完成计数不代表文字解释已自动批改。</p></section>${state.a&&state.b?`<section><h3>输入参数差异（${diff.length}项）</h3>${table(['参数','A','B'],diff.map(d=>[d.key,print(d.a),print(d.b)]))}<p>${diff.length===1?'只有一个输入参数改变，适合进行受控对照。':diff.length===0?'输入参数相同，可比较版本或重复计算。':'多个输入参数同时改变；解释时请区分各因素，或重新做单参数对照。'}</p>${state.a.release!==state.b.release?'<p>两个结果版本不同，未自动叠加曲线。</p>':''}<h3>可比曲线叠加</h3>${plots.length?plots.map(p=>`<h4>${esc(p.title)}</h4>${quantumCurveSVG(p.series,{xLabel:p.xLabel,yLabel:p.yLabel})}`).join(''):'<p>当前结果缺少相同模型、坐标标签和单位的通用曲线，保留两组原始结果，不自动叠加。</p>'}</section>`:''}<div class="compare-controls"><button id="cmp-export" class="secondary">导出完整对照JSON</button><button id="cmp-notebook" class="secondary" ${state.a?'':'disabled'}>另存为材料研究项目</button><label>导入对照副本<input id="cmp-import" type="file" accept=".json"></label></div>`;
  $('#cmp-a').onclick=()=>{try{state=setComparisonSlot(state,'a',latestCalculation());save();message='已固定A并开始新的对照；请先写预测，再返回工具改变参数。'+message;}catch(e){message=e.message;}draw();};
  $('#cmp-b').onclick=()=>{try{state=setComparisonSlot(state,'b',latestCalculation());save();}catch(e){message=e.message;}draw();};
  $('#cmp-save-prediction').onclick=()=>{if(!current()||!state.a||state.b)return;state.prediction=$('#cmp-prediction').value.slice(0,12000);state.predictionSavedAt=new Date().toISOString();save();draw();};
  $('#cmp-save').onclick=()=>{state.explanation=$('#cmp-explanation').value.slice(0,12000);save();draw();};
  $('#cmp-export').onclick=()=>download?.(JSON.stringify(state,null,2),'symmetry-parameter-comparison.json','application/json');
  $('#cmp-import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>MAX_BYTES)throw Error('对照文件超过3 MiB。');state=clone(validateComparison(JSON.parse(await file.text())));save();message='已载入独立对照副本。'+message;}catch(error){message=error.message;}draw();};
  $('#cmp-notebook').onclick=async()=>{if(busy||!current()||!state.a)return;busy=true;try{let project=makeProject({title:'参数对照 · '+state.a.title,material:'A/B 受控对照',notes:'完整预测与时间保存在A记录解释中；完整实验解释保存在B记录解释中。\n预测：'+state.prediction+'\n预测时间：'+state.predictionSavedAt+'\n解释：'+state.explanation});for(const key of ['a','b'])if(state[key])project=addRecord(project,{...state[key],title:(key.toUpperCase()+' · '+state[key].title).slice(0,160),notes:key==='a'?'A 对照结果\n预测：'+state.prediction+'\n预测时间：'+state.predictionSavedAt:'B 对照结果\n解释：'+state.explanation});await saveProject(project);message='已另存新的材料研究项目，原对照保留。';}catch(e){message=e.message;}finally{busy=false;draw();}};
 }
 draw();
}
