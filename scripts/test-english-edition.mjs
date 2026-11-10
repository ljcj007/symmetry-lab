import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
import {fileURLToPath} from 'node:url';
import {loadEnglishCatalog} from './english-catalog.mjs';
import {collectEnglishSources,walkAST} from './english-source.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist'),en=path.join(dist,'en');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const translations=loadEnglishCatalog(),report=json(path.join(en,'translation-report.json'));
const structureOnly=process.argv.includes('--structure-only');
if(!structureOnly){assert.equal(report.missing.length,0,'An English release must have complete local translation coverage');assert.equal(report.sourceUnits,report.translatedUnits);}
let prose=0;
for(const row of collectEnglishSources()){
 if(structureOnly)continue;
 assert.equal(typeof translations[row.source],'string',row.origins.join(', ')+': '+row.source);
 assert.doesNotMatch(translations[row.source],/ZXQP\d+PQXZ|ZXQI\d+IQXZ/,'Unrestored translation marker');
 assert.doesNotMatch(translations[row.source],/[\u3400-\u9fff]/u,'Untranslated prose/math annotation: '+row.source);
 prose++;
}
// Traverse every catalog independently of the translation visitor. Identifiers,
// enums, defaults and all numerical/scalar values must remain identical.
const opaque=new Set('id module action model route url path filename file sha256 sourceHashes catalogSHA256 input inputs parameters defaults default value schema schemaVersion release version format code poscar cif trace rotations operations generators matrix matrices arithmetic sourceId sourceIds references exerciseIds materialIds lesson lessonId exercise preset presetId tool function api implementation symbols formulaAliases aliases contexts'.split(' '));
let files=0,numbers=0,protectedTrees=0;
function compare(a,b,pointer='',key=''){
 if(opaque.has(key)&&!['aliases','contexts','formulaAliases'].includes(key)){
  if(['model','operations','references'].includes(key)&&a&&typeof a==='object'){
   const display=key==='references'?['chapter','title','note','label','description']:['label','explanation','convention'];
   const strip=node=>Array.isArray(node)?node.map(strip):node&&typeof node==='object'?Object.fromEntries(Object.entries(node).filter(([k])=>!display.includes(k)).map(([k,v])=>[k,strip(v)])):node;
   assert.deepEqual(strip(b),strip(a),pointer+' computational model changed');
  }else assert.deepEqual(b,a,pointer+' protected data changed');
  protectedTrees++;return;
 }
 assert.equal(typeof b,typeof a,pointer+' type changed');
 if(Array.isArray(a)){
  assert.ok(Array.isArray(b),pointer);assert.equal(b.length,a.length,pointer);
  a.forEach((v,i)=>{if(key==='options'&&Array.isArray(v)&&v.length===2){assert.deepEqual(b[i][0],v[0],pointer+'/'+i+' enum value changed');compare(v[1],b[i][1],pointer+'/'+i+'/1','label');}else compare(v,b[i],pointer+'/'+i,key);});
 }else if(a&&typeof a==='object'){
  assert.deepEqual(Object.keys(b),Object.keys(a),pointer+' schema keys changed');
  for(const[k,v]of Object.entries(a))compare(v,b[k],pointer+'/'+k,k);
 }else if(typeof a!=='string'){assert.deepEqual(b,a,pointer+' scalar changed');if(typeof a==='number')numbers++;}
}
for(const name of fs.readdirSync(path.join(en,'data')).filter(x=>x.endsWith('.json')&&x!=='python-messages.json')){
 compare(json(path.join(dist,'data',name)),json(path.join(en,'data',name)),name);files++;
}
let rawExamples=0;
for(const folder of ['examples','data/examples']){
 const check=relative=>{for(const entry of fs.readdirSync(path.join(dist,relative),{withFileTypes:true})){const name=relative+'/'+entry.name;if(entry.isDirectory())check(name);else{assert.ok(fs.readFileSync(path.join(en,name)).equals(fs.readFileSync(path.join(dist,name))),name+' raw example was modified');rawExamples++;}}};check(folder);
}
const original=fs.readFileSync(path.join(dist,'index.html'),'utf8'),index=fs.readFileSync(path.join(en,'index.html'),'utf8');
assert.match(index,/<html[^>]+lang="en"/);assert.match(original,/<html[^>]+lang="zh-CN"/);
for(const source of [original,index]){assert.match(source,/language-switch\.js/);assert.match(source,/language-switch\.css/);}
const htmlIds=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.deepEqual(htmlIds(index),htmlIds(original),'HTML control IDs changed');
let modules=0,imports=0;
for(const name of fs.readdirSync(en).filter(x=>x.endsWith('.js'))){
 const source=fs.readFileSync(path.join(en,name),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});modules++;
 assert.doesNotMatch(source,/\r/,'English JavaScript must have reproducible LF line endings: '+name);
 walkAST(ast,node=>{const specifier=node.type==='ImportDeclaration'||node.type==='ExportNamedDeclaration'||node.type==='ExportAllDeclaration'?node.source?.value:node.type==='ImportExpression'&&node.source.type==='Literal'?node.source.value:null;
  if(typeof specifier==='string'&&specifier.startsWith('.')){const target=path.resolve(en,specifier.split('?')[0]);assert.ok(fs.existsSync(target),name+' missing module '+specifier);imports++;}
 });
 assert.doesNotMatch(source,/translate\.google|translate_a\/single/,'Runtime translation service is forbidden');
 for(const match of source.matchAll(/href="([^"$#]+)"/g)){
  const href=match[1].split(/[?#]/)[0];if(/^(?:https?:|mailto:|blob:|data:)/.test(href)||href==='../source.zip')continue;
  if(!href.includes('\\')&&!href.includes('{'))assert.ok(fs.existsSync(path.resolve(en,href)),name+' broken local link '+href);
 }
}
assert.match(fs.readFileSync(path.join(en,'python-worker.js'),'utf8'),/new URL\('\.\.\/', import\.meta\.url\)/,'Worker resources must use the shared Python tree');
for(const name of ['style.css','language-switch.css','language-switch.js','english-results.js','icon.svg','vendor/katex/katex.min.css','vendor/katex/katex.mjs','python/browser_api.py','data/space-groups.json','data/magnetic-groups.json','data/points.json'])assert.ok(fs.existsSync(path.join(dist,name)),name);
assert.equal(fs.readdirSync(path.join(en,'docs')).filter(x=>x.endsWith('.md')).length,fs.readdirSync(path.join(dist,'docs')).filter(x=>x.endsWith('.md')).length,'All documentation must be available in English');
// These are scientific distinctions that a fluent but incorrect translation
// previously reversed. Pin their meanings independently of numeric fixtures.
assert.match(translations['为什么 w 的第二项必须与第一项异号？'],/opposite sign/i);
assert.match(translations['所以三维向量表示把中心元素看成恒等操作，而二分量旋量表示仍保留它；向量表示不是 SU(2) 的忠实表示。'],/not a faithful representation/i);
assert.match(translations['对照 V=diag(i,1)：V†V=I，但 det V=i，所以 V∈U(2) 且 V∉SU(2)。'],/det V=i/);
assert.doesNotMatch(translations['对照 V=diag(i,1)：V†V=I，但 det V=i，所以 V∈U(2) 且 V∉SU(2)。'],/not det V/i);
assert.match(translations['3⊗3=6⊕3̄ 没有单态；夸克—夸克与夸克—反夸克的反表示不能省略。近似味对称也不等于色规范对称被夸克质量破坏。'],/no singlet/i);
console.log('English edition:',JSON.stringify({proseUnits:prose,catalogs:files,unchangedNumbers:numbers,protectedTrees,rawExamples,modules,resolvedLocalImports:imports,missing:report.missing.length,structureOnly}));
