import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const HAN=/[\u3400-\u9fff]/u;
export const sharedCode=new Set(['math-notation.js','math-svg.js','crystal-notation.js','crystal-symbol-data.js','language-switch.js','english-results.js']);
export const opaqueKeys=new Set(['id','module','action','model','route','url','path','filename','file','sha256','sourceHashes','catalogSHA256','input','inputs','parameters','defaults','default','value','schema','schemaVersion','release','version','format','code','poscar','cif','trace','rotations','operations','generators','matrix','matrices','arithmetic','sourceId','sourceIds','references','exerciseIds','materialIds','lesson','lessonId','exercise','preset','presetId','tool','function','api','implementation','symbols','formulaAliases','aliases','contexts']);
export function walkAST(node,fn){if(!node||typeof node!=='object')return;if(node.type)fn(node);for(const [key,value]of Object.entries(node)){if(['start','end','loc'].includes(key))continue;if(Array.isArray(value))value.forEach(x=>walkAST(x,fn));else if(value&&typeof value==='object')walkAST(value,fn);}}
export function jsStrings(source){const strings=[];walkAST(parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=>{if(node.type==='Literal'&&typeof node.value==='string')strings.push({start:node.start,end:node.end,value:node.value,type:'literal'});else if(node.type==='TemplateElement')strings.push({start:node.start,end:node.end,value:node.value.cooked??node.value.raw,type:'template'});});return strings;}
export function replaceUnits(source,translate){
 // Template quasis can begin inside an HTML attribute. Localize complete
 // accessibility attributes first, then shield them from prose translation.
 const attributes=[];
 const shielded=String(source).replace(/((?:title|aria-label|placeholder|alt|content)=)(['"])(.*?)\2/gs,(all,key,quote,value)=>{
  const translated=HAN.test(value)?key+quote+translate(value.trim()).replaceAll(quote,quote==='"'?'&quot;':'&#39;')+quote:all;
  const marker='ZZHTMLATTRIBUTE'+attributes.length+'ZZ';attributes.push(translated);return marker;
 });
 const output=shielded.split(/(<[^>]+>)/g).map(piece=>{
  if(piece.startsWith('<')&&piece.endsWith('>')||!HAN.test(piece))return piece;
  const partial=piece.match(/^(["'][^<>]*>)([\s\S]*)$/);const prefix=partial?.[1]||'',body=partial?partial[2]:piece;
  if(!HAN.test(body))return piece;
  const m=body.match(/^(\s*)([\s\S]*?)(\s*)$/);return prefix+m[1]+translate(m[2])+m[3];
 }).join('');
 return output.replace(/ZZHTMLATTRIBUTE(\d+)ZZ/g,(_,n)=>attributes[+n]);
}
export function textUnits(source){const units=[];replaceUnits(source,text=>{units.push(text);return text;});return units;}
export function jsonTexts(value,fn,key='',pointer=''){
 if(opaqueKeys.has(key)&&!['aliases','contexts','formulaAliases'].includes(key)){
  if(['model','operations','references'].includes(key)&&value&&typeof value==='object'){
   const display=new Set(key==='references'?['chapter','title','note','label','description']:['label','explanation','convention']);
   const metadata=(node,field='',at=pointer)=>{
    if(typeof node==='string')return display.has(field)&&HAN.test(node)?fn(node,{key:field,pointer:at}):node;
    if(Array.isArray(node))return node.map((x,i)=>metadata(x,field,at+'/'+i));
    if(node&&typeof node==='object')return Object.fromEntries(Object.entries(node).map(([k,v])=>[k,metadata(v,k,at+'/'+k)]));
    return node;
   };
   return metadata(value);
  }
  return value;
 }
 if(typeof value==='string')return HAN.test(value)?fn(value,{key,pointer}):value;
 if(Array.isArray(value))return value.map((x,i)=>{
  if(key==='options'&&Array.isArray(x)&&x.length===2)return [x[0],typeof x[1]==='string'&&HAN.test(x[1])?fn(x[1],{key:'label',pointer:pointer+'/'+i+'/1'}):x[1]];
  return jsonTexts(x,fn,key,pointer+'/'+i);
 });
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,jsonTexts(v,fn,k,pointer+'/'+k)]));
 return value;
}
export function markdownUnits(source){let fence=false;return source.split('\n').filter(line=>{if(/^\s*```/.test(line)){fence=!fence;return false;}return !fence&&HAN.test(line);});}
export function collectEnglishSources(){
 const map=new Map();const add=(text,origin)=>{if(!HAN.test(text))return;const key=text.trim();if(!key)return;const item=map.get(key)||{source:key,origins:[]};if(item.origins.length<5)item.origins.push(origin);map.set(key,item);};
 for(const name of fs.readdirSync(path.join(ROOT,'dist')).filter(x=>x.endsWith('.js')&&!sharedCode.has(x))){const source=fs.readFileSync(path.join(ROOT,'dist',name),'utf8');for(const s of jsStrings(source))for(const unit of textUnits(s.value))add(unit,'js/'+name);}
 for(const name of fs.readdirSync(path.join(ROOT,'dist/data')).filter(x=>x.endsWith('.json'))){const data=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/data',name),'utf8'));jsonTexts(data,(text,meta)=>{add(text,'data/'+name+meta.pointer);return text;});}
 for(const name of fs.readdirSync(path.join(ROOT,'dist/docs')).filter(x=>x.endsWith('.md')))for(const line of markdownUnits(fs.readFileSync(path.join(ROOT,'dist/docs',name),'utf8')))add(line,'docs/'+name);
 for(const unit of textUnits(fs.readFileSync(path.join(ROOT,'dist/index.html'),'utf8')))add(unit,'index.html');
 return [...map.values()];
}
