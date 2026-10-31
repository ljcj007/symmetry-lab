// Context-specific crystallographic notation. Raw identifiers stay in data attributes.
import {hmAliases,knownHmSymbols,knownOperations} from './crystal-symbol-data.js?v=20261031-entry1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sub={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ᵢ':'i','ᵥ':'v','ₕ':'h','ₛ':'s'};
const sup={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','ᵀ':'T'};
const roman=s=>'\\mathrm{'+s+'}';
const barred=(s,bar)=>bar?'\\overline{'+s+'}':s;
const nfd=s=>String(s??'').normalize('NFD').replace(/[−–]/g,'-');
const inlinePrime=s=>s.replace(/[′']/g,'\\prime ').replace(/″/g,'\\prime\\prime ');
const valid=s=>s.length<=400&&!/[\\<>&$%#]/.test(s);
export function crystalSpan(source,kind='hm',options={}){
 const raw=String(source??'');return `<span class="crystal-symbol" data-crystal-kind="${esc(kind)}" data-math-source="${esc(raw)}"${options.fullbar?' data-crystal-fullbar="true"':''}>${esc(raw)}</span>`;
}

export function hmTex(source){
 let s=nfd(source).trim();if(!valid(s))return null;
 // Boundary information comes from the explicit type-I symbols, never from digits.
 const plain=s.replace(/([0-9])\u030[45]/g,'-$1').replace(/\s+/g,'');
 s=hmAliases[plain]||s;let out='',i=0;
 if(/^[PABCIFRH]/.test(s)){
  out+=roman(s[i++]);
  if(s[i]==='_'){
   const match=s.slice(i+1).match(/^(?:\d?[A-Za-z])/);if(!match)return null;
   out+='_{'+roman(match[0])+'}';i+=match[0].length+1;
  }
 }
 while(i<s.length){
  const c=s[i];if(/\s/.test(c)){out+='\\,';i++;continue;}
  if(c==='/'||c===':'||c==='('||c===')'||c==='.') {out+=c;i++;continue;}
  let bar=false;if(c==='-'){bar=true;i++;if(!/[1346]/.test(s[i]||''))return null;}
  const base=s[i++];if(!/[12346mabcdn eghrs]/.test(base)||base===' ')return null;
  if(/[\u0304\u0305]/.test(s[i]||'!')){bar=true;i++;}
  let atom=barred(/[a-z]/.test(base)?roman(base):base,bar);
  if(s[i]==='_'){
   const m=s.slice(i+1).match(/^(?:\{([1-5])\}|([1-5]))/);if(!m)return null;
   atom+='_{'+(m[1]||m[2])+'}';i+=m[0].length+1;
  }else if(sub[s[i]]){atom+='_{'+sub[s[i++]]+'}';}
  let primes='';while(/[′'″]/.test(s[i]||'!'))primes+=inlinePrime(s[i++]);
  if(primes)atom+='^{'+primes+'}';out+=atom;
 }
 return out||null;
}

export function schoenfliesTex(source){
 let s=nfd(source).trim();if(!valid(s))return null;
 let bar=false;if(s.startsWith('bar')){bar=true;s=s.slice(3);}
 const base=s[0];if(!/[CDSOTI]/.test(base||''))return null;s=s.slice(1);
 if(/[\u0304\u0305]/.test(s[0]||'!')){bar=true;s=s.slice(1);}
 let power='';const caret=s.indexOf('^');
 if(caret>=0){power=s.slice(caret+1).replace(/^\{|\}$/g,'');s=s.slice(0,caret);if(!/^[0-9+-]+$/.test(power))return null;}
 const tail=s.match(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/);if(tail){power=Array.from(tail[0]).map(c=>sup[c]).join('');s=s.slice(0,-tail[0].length);}
 s=Array.from(s).map(c=>sub[c]||({'ᵥ':'v','ᵢ':'i','ʰ':'h'}[c])||c).join('').replace(/^_/,'').replace(/[{}]/g,'');
 if(!/^(?:[1-9]\d*[vhdsi]?|[hdis]?)$/.test(s))return null;
 return barred(roman(base),bar)+(s?'_{'+roman(s)+'}':'')+(power?'^{'+power+'}':'');
}

export function operationTex(source,{fullbar=false}={}){
 let s=nfd(source).trim();if(!valid(s))return null;
 if(s[0]==='{')return seitzTex(s,{fullbar:true});
 let bar=false;if(s.startsWith('bar')){bar=true;s=s.slice(3);}
 s=Array.from(s).map(c=>sub[c]||c).join('');
 let explicit='';const caret=s.indexOf('^');if(caret>=0){explicit=s.slice(caret+1).replace(/^[({]|[)}]$/g,'');s=s.slice(0,caret);if(!/^[0-9+\-′']+$/.test(explicit))return null;}
 let superscript='';while(s.length&&sup[s.at(-1)]){superscript=sup[s.at(-1)]+superscript;s=s.slice(0,-1);}
 if(s.endsWith('pp')){superscript='\\prime\\prime '+superscript;s=s.slice(0,-2);}
 else if(s.endsWith('p')){superscript='\\prime '+superscript;s=s.slice(0,-1);}
 else if(/[+-]$/.test(s)){superscript=s.at(-1)+superscript;s=s.slice(0,-1);}
 while(/[′'″]$/.test(s)){superscript=inlinePrime(s.at(-1))+superscript;s=s.slice(0,-1);}
 if(explicit)superscript+=inlinePrime(explicit);
 const numeric=s.match(/^(-?)([12346])([\u0304\u0305]?)([xyz]?)$/);
 if(numeric){const atom=barred(numeric[2],!!numeric[1]||!!numeric[3])+(numeric[4]?'_{'+numeric[4]+'}':'');return atom+(superscript?'^{'+superscript+'}':'');}
 const base=s[0];if(!/[CEISmRT]/.test(base||''))return null;let rest=s.slice(1);
 if(/[\u0304\u0305]/.test(rest[0]||'!')){bar=true;rest=rest.slice(1);}
 rest=rest.replace(/^_/,'').replace(/[{}]/g,'');if(!/^[0-9xyzabcdefhvd]*$/.test(rest))return null;
 let atom=base==='R'?'R':roman(base);if(bar&&!fullbar)atom=barred(atom,true);
 atom+=(rest?'_{'+roman(rest)+'}':'')+(superscript?'^{'+superscript+'}':'');
 return bar&&fullbar?barred(atom,true):atom;
}

export function seitzTex(source,options={}){
 const m=String(source).match(/^\{([^|]+)\|([^{}]+)\}$/);if(!m)return null;
 const r=operationTex(m[1].trim(),options);if(!r)return null;
 const raw=m[2];if(!/^[\s0-9xyzXYZtabc,;().+\-−/₀₁₂₃_{}]+$/.test(raw))return null;
 const t=raw.replace(/−/g,'-').replace(/[₀₁₂₃]/g,c=>'_{'+sub[c]+'}').replace(/_([0-9a-z])/g,'_{$1}');
 return '\\{'+r+'\\mid '+t+'\\}';
}

export function irrepTex(source){
 let s=nfd(source).trim();if(!valid(s))return null;
 const legacy={Bbp:'B\u0305′',Bbpp:'B\u0305″',Bbgp:'B\u0305g′',Bbgpp:'B\u0305g″',Bbup:'B\u0305u′',Bbupp:'B\u0305u″'};
 s=legacy[s]||s;
 // Minus-prefixed Bilbao IDs are opaque identifiers, not rotoinversion symbols.
 if(/^-[A-Za-z]+\d/.test(s))return roman(s);
 let left='';while(sup[s[0]]){left+=sup[s[0]];s=s.slice(1);}
 const m=s.match(/^([A-ZΓΔΛΣΠΞΩ]+)([\u0304\u0305]?)(.*)$/u);if(!m)return null;
 const base=m[1]==='Γ'?'\\Gamma ':m[1]==='Δ'?'\\Delta ':m[1]==='Λ'?'\\Lambda ':roman(m[1]);
 let rest=m[3],power='';
 if(/^[′']\d/.test(rest)){power='\\prime ';rest=rest.slice(1);}
 const caret=rest.indexOf('^');if(caret>=0){power+=rest.slice(caret+1).replace(/^[{(]|[})]$/g,'');rest=rest.slice(0,caret);}
 while(/[′'″+\-]$/.test(rest)){power=inlinePrime(rest.at(-1))+power;rest=rest.slice(0,-1);}
 rest=Array.from(rest).map(c=>sub[c]||c).join('').replace(/^_/,'').replace(/[{}]/g,'');
 if(!/^[0-9guhijabef]*$/.test(rest)||!/^([0-9+\-]|\\prime\s*)*$/.test(power))return null;
 return (left?'{}^{'+left+'}':'')+barred(base,!!m[2])+(rest?'_{'+roman(rest)+'}':'')+(power?'^{'+power+'}':'');
}

export function crystalTex(source,kind='hm',options={}){
 if(kind==='hm')return hmTex(source);if(kind==='schoenflies')return schoenfliesTex(source);if(kind==='operation')return operationTex(source,options);if(kind==='irrep')return irrepTex(source);return null;
}

const allHm=new Set(knownHmSymbols);
// Compact operation tokens and lattice-prefixed HM are recognized separately.
const operationPattern=/^(?:bar)?(?:[CS][\u0304\u0305]?[2346₂₃₄₆](?:[xyzabcdehf]|[1-4](?:pp|p)?)?(?:pp|p|[+\-′'])?|m[xyzvhd][1-4]?)/;
const hmTerms=[...allHm].filter(s=>/^[PIFRABHC]/.test(s)&&s.length>2&&!/^[ABC][12346]$/.test(s)).sort((a,b)=>b.length-a.length);
const hmPattern=new RegExp('^(?:'+hmTerms.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')');
export function crystalTokenAt(source,index=0){
 if(source[index]==='{'){
  const end=source.indexOf('}',index+1);if(end>index){const raw=source.slice(index,end+1),tex=seitzTex(raw,{fullbar:true});if(tex)return {type:'math',kind:'seitz',source:raw,tex,end:end+1};}
 }
 if(index&&/[A-Za-z0-9_]/.test(source[index-1]))return null;
 const tail=source.slice(index);let m=null,kind='hm';
 const raw=tail.match(/^[PIFRABHC][A-Za-z0-9_/'′\-\u0304\u0305₀-₉]+/);
 if(raw){const key=raw[0].replace(/[₀-₉]/g,c=>'_'+sub[c]).replace(/([0-9])[\u0304\u0305]/g,'-$1');if((allHm.has(key)||hmAliases[key])&&!/^[ABC][12346]$/.test(key))m=raw;}
 if(!m)m=tail.match(hmPattern);
 if(!m){m=tail.match(operationPattern);kind='operation';}
 if(!m)return null;const token=m[0],next=tail[token.length]||'';
 if(/[A-Za-z0-9_\u0300-\u036f]/u.test(next))return null;
 const tex=crystalTex(token,kind);if(!tex)return null;
 const result={type:'math',kind,source:token,tex,end:index+token.length};
 if(kind==='operation'){
  const cut=tex.search(/[_^]\{/);result.atomBase=cut<0?tex:tex.slice(0,cut);
  let pos=cut;while(pos>=0&&pos<tex.length){const key=tex[pos]==='_'?'atomSub':'atomSup';let depth=1,end=pos+2;for(;end<tex.length;end++){if(tex[end]==='{')depth++;if(tex[end]==='}'&&!--depth)break;}result[key]=tex.slice(pos+2,end);pos=end+1;}
 }
 return result;
}

export function findCrystalTokens(source){
 source=String(source??'');const out=[];let start=0;
 for(let i=0;i<source.length;i++){const token=crystalTokenAt(source,i);if(!token)continue;if(i>start)out.push({type:'text',source:source.slice(start,i)});out.push(token);i=token.end-1;start=token.end;}
 if(start<source.length)out.push({type:'text',source:source.slice(start)});return out.length?out:[{type:'text',source}];
}
