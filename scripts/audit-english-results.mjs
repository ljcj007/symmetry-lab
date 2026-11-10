// Verify actual repository translations against real Python outputs. This
// audit does not create guessed translations or contact a translation service.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createResultLocalizer,collectResultDisplayMessages} from '../dist/english-results.js';
import {loadEnglishCatalog} from './english-catalog.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'locales',name),'utf8'));
const translations=loadEnglishCatalog();
const localizer=createResultLocalizer({translations,templates:read('en-python-templates.json'),nativeAnnotations:true});
const files=['electronic-materials.json','material-research.json','quantum-materials.json','response-materials.json','spectroscopy.json','structure-dynamics.json','bridges.json.gz','construction.json.gz','principles.json.gz','connections.json.gz','frontiers.json.gz'];
const han=/[\u3400-\u9fff]/u,residuals=[];let examined=0,numbers=0;
function identicalStructure(before,after,pointer=''){
 assert.equal(typeof after,typeof before,pointer+' type changed');
 if(typeof before==='number'){assert.ok(Object.is(before,after),pointer+' numerical value changed');numbers++;}
 else if(Array.isArray(before)){assert.ok(Array.isArray(after),pointer);assert.equal(after.length,before.length,pointer+' array size changed');before.forEach((value,index)=>identicalStructure(value,after[index],pointer+'/'+index));}
 else if(before&&typeof before==='object'){assert.deepEqual(Object.keys(after),Object.keys(before),pointer+' result keys changed');for(const [key,value]of Object.entries(before))identicalStructure(value,after[key],pointer+'/'+key);}
 else if(typeof before!=='string')assert.equal(after,before,pointer+' scalar value changed');
}
for(const file of files){
 const raw=fs.readFileSync(new URL('./fixtures/'+file,import.meta.url)),fixture=JSON.parse((file.endsWith('.gz')?gunzipSync(raw):raw).toString()),original=fixture;
 const translated=localizer.result(original);identicalStructure(original,translated,file);
 for(const row of collectResultDisplayMessages(original,{nativeAnnotations:true})){
  examined++;const displayed=row.path.reduce((value,key)=>value?.[key],translated);
  if(han.test(displayed))residuals.push({file,path:row.path.join('.'),source:row.source,displayed,mode:row.mode,hasExact:Object.hasOwn(translations,row.source)});
 }
}
const unique=[...new Map(residuals.map(row=>[row.source,row])).values()];
const report={files:files.length,examinedDisplayStrings:examined,checkedNumbers:numbers,untranslatedOccurrences:residuals.length,untranslatedUnique:unique.length,residuals:unique};
fs.mkdirSync(path.join(root,'.openai'),{recursive:true});fs.writeFileSync(path.join(root,'.openai/english-result-translation-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,residuals:unique.slice(0,12)},null,2));
if(process.argv.includes('--check')&&unique.length)process.exitCode=1;
