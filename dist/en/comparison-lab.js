import {latestCalculation,makeProject,addRecord,validateJSON,saveProject,RELEASE,safeRecordRoute} from './material-notebook.js?v=20261114-evidence1';
import {esc,num,table} from './response-views.js?v=20261110-en1';
import {quantumCurveSVG} from './quantum-plots.js?v=20261110-en1';
const KEY='symmetry-lab.comparison.v1',MAX_BYTES=3*1024*1024;
const clone=x=>JSON.parse(JSON.stringify(x));
const print=x=>typeof x==='number'?num(x):x===undefined?"Not provided":typeof x==='string'?x:JSON.stringify(x);
let memory=null,memoryDirty=false;
export const newComparison=()=>({format:'symmetry-lab-comparison',version:1,release:RELEASE,a:null,b:null,prediction:'',predictionSavedAt:'',explanation:''});
export function validateComparison(value){
 validateJSON(value);if(!value||value.format!=='symmetry-lab-comparison'||value.version!==1)throw Error("is not a parameter comparison file (version 1).");
 for(const key of ['prediction','explanation','predictionSavedAt','release'])if(typeof value[key]!=='string'||value[key].length>12000)throw Error("The prediction or interpretation format is incorrect.");
 for(const key of ['a','b'])if(value[key]!==null)addRecord(makeProject(),value[key]);
 if(value.b&&!value.a)throw Error("To compare B, A needs to be fixed first.");
 if(value.a&&value.b&&value.a.action!==value.b.action)throw Error("A and B must be from the same calculation tool; please use project assignments for cross-model discussions.");
 if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_BYTES)throw Error("The comparison file exceeds 3 MiB, please use the material project to save larger results.");
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
 if(!['a','b'].includes(slot))throw Error("Unknown control position.");
 if(!record)throw Error("Please complete a calculation in the computing center or classroom before returning the fixed result.");
 const next=clone(value);if(slot==='a'){next.a=clone(record);next.b=null;next.prediction='';next.predictionSavedAt='';next.explanation='';}else{if(!next.a)throw Error("Please fix A first.");if(next.a.action!==record.action)throw Error("Please select the same calculation tool as A.");next.b=clone(record);}
 return validateComparison(next);
}
function load(){if(memoryDirty&&memory)return clone(memory);try{const raw=localStorage.getItem(KEY);if(raw)return clone(validateComparison(JSON.parse(raw)));}catch{}return memory?clone(memory):newComparison();}
function persist(data){validateComparison(data);memory=clone(data);try{localStorage.setItem(KEY,JSON.stringify(data));memoryDirty=false;return '';}catch{memoryDirty=true;return "The current browser storage space is insufficient, this page is temporarily stored in memory; please export JSON backup.";}}
export function renderComparisonLab({container,download}){
 let state=load(),message='',busy=false;
 container.innerHTML='<section class="obs-page comparison-lab"></section>';const root=container.firstElementChild,$=s=>root.querySelector(s),current=()=>root.parentNode===container;
 const save=()=>{message=persist(state)||"has been saved in this machine; you can return to the original tool to continue the experiment.";};
 function draw(){if(!current())return;const recent=latestCalculation(),diff=state.a&&state.b?comparisonDifferences(state.a.input,state.b.input):[],plots=comparablePlots(state.a,state.b);
  root.innerHTML=`<header class="obs-header"><span class="obs-eyebrow">PREDICT · COMPARE · EXPLAIN</span><h2>parameter control experiment</h2><p>First run the calculation and fix A, write down the prediction, then return to the same tool to change the parameters and fix B. The original results and versions are exported with JSON.</p></header><div class="compare-controls"><a href="#compute">Select calculation tool →</a><a href="#atlas/notebook">Materials Research Record →</a><button id="cmp-a" class="primary" ${recent?'':'disabled'}> Fixed the most recent calculation to A</button><button id="cmp-b" class="secondary" ${state.a&&recent?'':'disabled'}> Fixed last calculation to B</button></div><p role="status" id="cmp-status">${esc(message||"recent calculations:"+(recent?.title||"No calculation result yet"))}</p><div class="compare-grid">${['a','b'].map(key=>{const r=state[key];return `<article class="compare-card"><h3>${key.toUpperCase()} · ${esc(r?.title||"Waiting for fixed result")}</h3>${r?`<p>${esc(r.release)} · ${esc(r.created)}</p><a href="#${esc(safeRecordRoute(r.route))}">Return to corresponding tools →</a><details><summary>Original input parameters</summary><pre>${esc(JSON.stringify(r.input,null,2))}</pre></details>${Array.isArray(r.result.summary)?table(["Result","Value"],r.result.summary.map(x=>[x.label,print(x.value)+(x.unit?' '+x.unit:'')])):"<p>Complete results are saved in the export file and the material project.</p>"}`:"<p>calculation.</p>"}</article>`;}).join('')}</div><section class="br-predict"><h3>Predict first, explain later</h3><label>Prediction before running B<textarea id="cmp-prediction" maxlength="12000" ${state.b?'disabled':''}>${esc(state.prediction)}</textarea></label><button id="cmp-save-prediction" class="secondary" ${!state.a||state.b?'disabled':''}> Save prediction</button><p>${state.predictionSavedAt?"Predicted recording time:"+esc(state.predictionSavedAt):"has not recorded the prediction; you can also directly use the normal parameter comparison."}${state.b?"; B is fixed, prediction locked.":''}</p><label>Write an explanation after observing B<textarea id="cmp-explanation" maxlength="12000">${esc(state.explanation)}</textarea></label><button id="cmp-save" class="secondary">Save explanation</button><p>Saving and completing the count does not mean that the text explanation has been automatically corrected.</p></section>${state.a&&state.b?`<section><h3>input parameter difference (${diff.length}items)</h3>${table(["parameters",'A','B'],diff.map(d=>[d.key,print(d.a),print(d.b)]))}<p>${diff.length===1?"has only one input parameter change and is suitable for controlled control.":diff.length===0?"The input parameters are the same, so you can compare versions or repeat calculations.":"Multiple input parameters change at the same time; please distinguish each factor when explaining, or make a single parameter comparison again."}</p>${state.a.release!==state.b.release?"<p>The two result versions are different and the curves are not automatically superimposed.</p>":''}<h3>Comparable curve superposition</h3>${plots.length?plots.map(p=>`<h4>${esc(p.title)}</h4>${quantumCurveSVG(p.series,{xLabel:p.xLabel,yLabel:p.yLabel})}`).join(''):"<p>The current result lacks a common curve with the same model, coordinate label and unit. The two sets of original results are retained and are not automatically superimposed.</p>"}</section>`:''}<div class="compare-controls"><button id="cmp-export" class="secondary">Export complete comparison JSON</button><button id="cmp-notebook" class="secondary" ${state.a?'':'disabled'}> Save as Materials Research Project</button><label>Import control copy<input id="cmp-import" type="file" accept=".json"></label></div>`;
  $('#cmp-a').onclick=()=>{try{state=setComparisonSlot(state,'a',latestCalculation());save();message="A has been fixed and a new comparison has been started; please write the prediction first and then return to the tool to change parameters."+message;}catch(e){message=e.message;}draw();};
  $('#cmp-b').onclick=()=>{try{state=setComparisonSlot(state,'b',latestCalculation());save();}catch(e){message=e.message;}draw();};
  $('#cmp-save-prediction').onclick=()=>{if(!current()||!state.a||state.b)return;state.prediction=$('#cmp-prediction').value.slice(0,12000);state.predictionSavedAt=new Date().toISOString();save();draw();};
  $('#cmp-save').onclick=()=>{state.explanation=$('#cmp-explanation').value.slice(0,12000);save();draw();};
  $('#cmp-export').onclick=()=>download?.(JSON.stringify(state,null,2),'symmetry-parameter-comparison.json','application/json');
  $('#cmp-import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>MAX_BYTES)throw Error("reference file exceeds 3 MiB.");state=clone(validateComparison(JSON.parse(await file.text())));save();message="Independent control copy loaded."+message;}catch(error){message=error.message;}draw();};
  $('#cmp-notebook').onclick=async()=>{if(busy||!current()||!state.a)return;busy=true;try{let project=makeProject({title:"parameter comparison · "+state.a.title,material:"A/B controlled control",notes:"The complete prediction and time are saved in the A record explanation; the complete experimental explanation is saved in the B record explanation.\nPrediction:"+state.prediction+"\nPredicted time:"+state.predictionSavedAt+"\nExplanation:"+state.explanation});for(const key of ['a','b'])if(state[key])project=addRecord(project,{...state[key],title:(key.toUpperCase()+' · '+state[key].title).slice(0,160),notes:key==='a'?"A comparison results\nPrediction:"+state.prediction+"\nPredicted time:"+state.predictionSavedAt:"B comparison results\nExplanation:"+state.explanation});await saveProject(project);message="A new material research project has been saved, and the original control is retained.";}catch(e){message=e.message;}finally{busy=false;draw();}};
 }
 draw();
}
