// Reproducible static English edition. Original Python/data inputs stay shared.
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';
import {ROOT,HAN,jsStrings,replaceUnits,jsonTexts,sharedCode} from './english-source.mjs';
import {loadEnglishCatalog,catalogFiles} from './english-catalog.mjs';
const dist=path.join(ROOT,'dist'),out=path.join(dist,'en'),locale=path.join(ROOT,'locales');
const readJSON=name=>JSON.parse(fs.readFileSync(path.join(locale,name),'utf8'));
const translations=loadEnglishCatalog();
const missing=new Set(),used=new Set();
const mathWords={'机械':'mech','声学':'ac','光学':'opt','副本':'copy','完整':'full','全对称':'totally symmetric','左':'L','右':'R','分居':'separate','低位点双占据':'lower-site double occupancy','电子':'electrons','能量':'energy','长度':'length'};
function mathLabels(value){return value.replace(/([_^](?:\{|\()?)(机械|声学|光学|副本|完整|全对称|左|右|分居|低位点双占据|电子)(?=[\u3400-\u9fff})\s†⁺⁻=⊗]|$)/gu,(_,prefix,label)=>prefix+mathWords[label]);}
function t(source){
 if(!HAN.test(source))return source;
 const exact=Object.hasOwn(translations,source),key=exact?source:source.trim();
 used.add(key);const value=translations[key];
 if(typeof value!=='string'||!value.trim()){missing.add(key);return source;}
 const translated=mathLabels(value);
 return exact?translated:source.match(/^\s*/)[0]+translated+source.match(/\s*$/)[0];
}
const template=s=>s.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
function paths(value,name){
 let s=value.replaceAll('./vendor/','../vendor/').replaceAll('href="python/','href="../python/').replaceAll('href="source.zip','href="../source.zip').replaceAll('href="licenses/','href="../licenses/').replaceAll('href="data/carat/','href="../data/carat/').replace(/href="data\/([^"/]*provenance\.json)/g,'href="../data/$1');
 if(name==='resource-loader.js')s=s==='data/'?'../data/':s;
 return s;
}
function js(source,name){
 if(sharedCode.has(name))return source.replaceAll('./vendor/','../vendor/');
 const edits=[];for(const item of jsStrings(source)){
  const translated=paths(replaceUnits(item.value,t),name);
  if(translated!==item.value)edits.push({start:item.start,end:item.end,value:item.type==='literal'?JSON.stringify(translated):template(translated)});
 }
 let result=source;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.value+result.slice(edit.end);
 if(name==='bridges-views.js'){
  // These are historical schema keys. Translate their displayed labels without
  // changing the Python result object or downloadable calculation records.
  const labels={'最大迹误差':'Maximum trace error','最大厄米误差':'Maximum Hermiticity error','全轨迹最小本征值':'Minimum eigenvalue over the trajectory','Hamiltonian 厄米误差':'Hamiltonian Hermiticity error','时间步长（ns）':'Time step (ns)','正定性容差':'Positivity tolerance','数值方法':'Numerical method','T₂ 约定':'T₂ convention'};
  result='const englishCheckLabels='+JSON.stringify(labels)+';\n'+result;
  result=result.replace('map(([k,v])=>[k,val(v)])','map(([k,v])=>[englishCheckLabels[k]||k,val(v)])');
 }
 if(name==='principles-views.js'){
  // Keep the classification enum in exported results; only the displayed word
  // in this renderer changes language.
  result='const englishRadialLabels={"径向极大":"Radial maximum","径向极小":"Radial minimum"};\n'+result;
  result=result.replace(':String(x);',':(englishRadialLabels[x]||String(x));');
 }
 if(name==='python-worker.js'){
  result=result.replace('new URL(path, import.meta.url)',"new URL(path, new URL('../', import.meta.url))");
  result="import {createResultLocalizer} from '../english-results.js?v=20261110-en1';\nconst englishMessages=fetch(new URL('./data/python-messages.json?v=20261110-en1',import.meta.url)).then(r=>{if(!r.ok)throw Error('English message catalog could not be loaded');return r.json();}).then(data=>createResultLocalizer({...data,nativeAnnotations:true}));\n"+result;
  const original='self.postMessage({id, status: \'done\', ...JSON.parse(output)});';
  if(!result.includes(original))throw Error('Worker result boundary changed; review localization integration');
  result=result.replace(original,"const localized=JSON.parse(output),messages=await englishMessages;\n    if(localized.result)localized.result=messages.result(localized.result);\n    if(localized.error)localized.error=messages.text(localized.error);\n    self.postMessage({id,status:'done',...localized});");
 }
 result=result.replace(/\n+$/,'\n');parse(result,{ecmaVersion:'latest',sourceType:'module'});return result;
}
const outputs=new Map(),write=(relative,body)=>outputs.set(relative,typeof body==='string'?Buffer.from(body):body);
for(const name of fs.readdirSync(dist).filter(x=>x.endsWith('.js')&&!['language-switch.js','english-results.js'].includes(x)))write(name,js(fs.readFileSync(path.join(dist,name),'utf8'),name));
let index=replaceUnits(fs.readFileSync(path.join(dist,'index.html'),'utf8'),t).replace('lang="zh-CN"','lang="en"');
index=index.replace(/(href|src)="((?:[^"/]+\.css|icon\.svg|language-switch\.js)(?:\?[^" ]*)?)"/g,'$1="../$2"');
index=index.replace('href="vendor/katex/katex.min.css"','href="../vendor/katex/katex.min.css"');
index=index.replace(/(data-view="compute"[\s\S]*?<span class="nav-mobile-label"[^>]*>)[^<]*(<\/span>)/,'$1Tools$2');
write('index.html',index);
const bigGroups=new Set(['space-groups.json','magnetic-groups.json','points.json']);
for(const name of fs.readdirSync(path.join(dist,'data')).filter(x=>x.endsWith('.json')&&!bigGroups.has(x)&&x!=='english-provenance.json')){
 const data=JSON.parse(fs.readFileSync(path.join(dist,'data',name),'utf8'));
 write('data/'+name,JSON.stringify(jsonTexts(data,(text,meta)=>meta.key==='formula'?t(text):t(text)))+'\n');
}
for(const directory of ['examples','data/examples']){
 const walk=folder=>{for(const entry of fs.readdirSync(path.join(dist,folder),{withFileTypes:true})){const name=folder+'/'+entry.name;if(entry.isDirectory())walk(name);else write(name,fs.readFileSync(path.join(dist,name)));}};
 if(fs.existsSync(path.join(dist,directory)))walk(directory);
}
for(const name of fs.readdirSync(path.join(dist,'docs')).filter(x=>x.endsWith('.md'))){
 let fence=false;const source=fs.readFileSync(path.join(dist,'docs',name),'utf8').replace(/\r\n?/g,'\n');
 const markdown=source.split('\n').map(line=>{if(/^\s*```/.test(line)){fence=!fence;return line;}if(fence)return line;return (HAN.test(line)?t(line):line).trimEnd();}).join('\n').replaceAll('](../python/','](../../python/').replaceAll('](../vendor/','](../../vendor/');
 write('docs/'+name,markdown);
}
// Documentation can point to shared archives, validation data and licenses.
// Resolve relative links against actual generated files before sharing a root
// artifact; translated lessons/examples continue to use the English mirrors.
for(const [relative,body]of outputs){
 if(!relative.startsWith('docs/')||!relative.endsWith('.md'))continue;
 const value=body.toString().replace(/(\]\()([^\s)]+)(\))/g,(all,left,href,right)=>{
  if(/^(?:[a-z]+:|#|\/)/i.test(href))return all;
  const at=href.search(/[?#]/),target=at<0?href:href.slice(0,at),suffix=at<0?'':href.slice(at),englishTarget=path.resolve(out,'docs',target),originalTarget=path.resolve(dist,'docs',target);
  if(outputs.has(path.relative(out,englishTarget).replaceAll('\\','/')))return all;
  if(originalTarget.startsWith(dist+path.sep)&&fs.existsSync(originalTarget))return left+path.relative(path.join(out,'docs'),originalTarget).replaceAll('\\','/')+suffix+right;
  return all;
 });
 outputs.set(relative,Buffer.from(value));
}
const pythonSources=readJSON('en-python-sources.json'),templates=readJSON('en-python-templates.json');
const messages={translations:Object.fromEntries(pythonSources.map(row=>[row.source,t(row.source)])),templates};
write('data/python-messages.json',JSON.stringify(messages)+'\n');
const report={release:'20261110-en1',language:'en',sourceUnits:used.size,translatedUnits:[...used].filter(x=>translations[x]).length,missing:[...missing],files:outputs.size+1,shared:{python:'../python/',vendor:'../vendor/',groupDatabases:'../data/'},catalogs:catalogFiles};
write('translation-report.json',JSON.stringify(report,null,2)+'\n');
if(missing.size&&!process.argv.includes('--allow-missing'))throw Error(missing.size+' English units are missing; run the development translation/review workflow. No output was written.');
let changes=0;
const existing=folder=>fs.existsSync(folder)?fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?existing(path.join(folder,entry.name)):[path.relative(out,path.join(folder,entry.name)).replaceAll('\\','/')]):[];
const obsolete=existing(out).filter(name=>!outputs.has(name));
if(obsolete.length)throw Error('Obsolete English output files require review: '+obsolete.join(', '));
for(const [relative,body]of outputs){const target=path.join(out,relative);if(!fs.existsSync(target)||!fs.readFileSync(target).equals(body)){changes++;if(!process.argv.includes('--check')){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);}}}
console.log('English edition:',outputs.size,'files;',report.translatedUnits,'/',report.sourceUnits,'translated units;',missing.size,'missing;',changes,'file changes');
if(process.argv.includes('--check')&&changes)process.exitCode=1;
