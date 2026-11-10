import fs from 'node:fs';
import path from 'node:path';
import {ROOT,HAN} from './english-source.mjs';
import {findInlineMath} from '../dist/math-notation.js';
const sources=JSON.parse(fs.readFileSync(path.join(ROOT,'locales/en-sources.json'),'utf8'));
const pythonPath=path.join(ROOT,'locales/en-python-sources.json');
if(fs.existsSync(pythonPath))for(const row of JSON.parse(fs.readFileSync(pythonPath,'utf8')))if(!sources.some(x=>x.source===row.source))sources.push(row);
const glossaryFile=path.join(ROOT,'locales/en-glossary.json');
const glossary=fs.existsSync(glossaryFile)?Object.entries(JSON.parse(fs.readFileSync(glossaryFile,'utf8'))).sort((a,b)=>b[0].length-a[0].length):[];
export function protectEnglish(source){
 const tokens=[];const save=value=>{const id='ZXQP'+String(tokens.length).padStart(5,'0')+'PQXZ';tokens.push({id,value});return id;};
 let text=source;
 // Protect partial HTML at template boundaries as well as complete markup.
 text=text.replace(/^(?:["'](?:\s+[a-z-]+=(?:"[^"]*"|'[^']*'))*\s*>|["']>)/i,save);
 text=text.replace(/<[^>]+>|`[^`]*`|https?:\/\/[^\s\])，。；]+|#[a-z]+\/[a-zA-Z0-9_/?=&.%-]+/g,save);
 // Keep mathematical expressions byte-for-byte; their variables, phases and
 // tensor indices must not be reinterpreted by a prose translator.
 const parts=findInlineMath(text);text=parts.map(p=>p.type==='math'?save(p.source):p.source).join('');
 for(const [zh,en]of glossary)if(text.includes(zh))text=text.replaceAll(zh,()=>` ${save(' '+en+' ')} `);
 text=text.replace(/ZXQD\d+DQXZ/g,save);
 text=text.replace(/\b(?:SU\([23]\)|SO\([23]\)|U\(1\)|BC|BNS|OG|CIF|POSCAR|Pyodide|Python|NumPy|SymPy|Phonopy|CARAT|SHG|DMI|SOC|JSON|CSV|GT|CG|Racah|Wyckoff|Bloch|Berry|Brillouin|Kramers|Clebsch[–-]Gordan)\b/g,save);
 return {source,text,tokens};
}
const jobs=sources.map((row,id)=>({id,...protectEnglish(row.source),origins:row.origins,glossaryProtected:true}));
fs.writeFileSync(path.join(ROOT,'locales/en-jobs.json'),JSON.stringify(jobs)+'\n');
console.log('Protected English units:',jobs.length,'characters:',jobs.reduce((n,x)=>n+x.text.length,0));
