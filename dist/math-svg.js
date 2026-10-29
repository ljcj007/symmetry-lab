// Presentation-only script layout for SVG labels. No expression evaluation.
// Keep the original label in data-math-source / aria-label when calling this on DOM text.
const escapeXML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const superMap=Object.fromEntries(Array.from('⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵀᵗᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵘᵛʷˣʸᶻ').map((c,i)=>[c,Array.from('0123456789+−=()niTtabcdefghjklmoprsuvwxyz')[i]]));
const subMap={...Object.fromEntries(Array.from('₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎').map((c,i)=>[c,Array.from('0123456789+−=()')[i]])),...'ₐa ₑe ₕh ᵢi ⱼj ₖk ₗl ₘm ₙn ₒo ₚp ᵣr ₛs ₜt ᵤu ᵥv ₓx ᵧy ᵨρ ᵩφ ᵦβ ᵪχ'.split(' ').reduce((out,pair)=>(out[pair[0]]=pair[1],out),{})};
Object.assign(superMap,{'ᴴ':'H','ᵅ':'α','ᵝ':'β','ᵞ':'γ','ᵟ':'δ','ᵋ':'ε','ᶿ':'θ','ᶥ':'ι','ᵠ':'φ','ᵡ':'χ'});
Object.assign(subMap,{'꜀':'c'});
// Existing physics labels omit the separator in a small set of tensor/Pauli
// components. Never infer subscripts from ordinary English or data keys.
const greekComponents=/^([στ])([xyz]{1,3})(?![A-Za-z_])/u;
// Files and input/column identifiers are data, even when they contain underscores.
const isPath=text=>/(?:\b[\w-]+_[\w.-]+\.(?:json|ya?ml|csv|txt|py|js|cif|xml)\b|(?:https?:\/\/|[A-Za-z]:\\|\.\.\/))/i.test(text);
const atom=/[A-Za-z\dα-ωΑ-Ωℏ]/u;

function scriptArgument(text,start){
 const opener=text[start],closer=opener==='{'?'}':opener==='('?')':null;
 if(closer){let depth=1;for(let i=start+1;i<text.length;i++){if(text[i]===opener)depth++;else if(text[i]===closer&&!--depth)return {text:text.slice(start+1,i),end:i+1};}return null;}
 let end=start;while(end<text.length&&atom.test(text[end]))end++;
 // Unbraced signs are meaningful scripts (S^+, R^-), not an empty argument.
 if(end===start&&/[+−-]/.test(text[start]||''))end++;
 return end>start?{text:text.slice(start,end),end}:null;
}

/** Text runs in their display order; script=null means the baseline. */
export function svgMathSegments(value){
 const text=String(value??'');if(isPath(text))return [{text,script:null}];
 const segments=[];const add=(value,script=null)=>{if(!value)return;const last=segments.at(-1);if(last?.script===script)last.text+=value;else segments.push({text:value,script});};
 for(let i=0;i<text.length;){
  const c=text[i];
  const component=text.slice(i).match(greekComponents);
  if(component){add(component[1]);add(component[2],'sub');i+=component[0].length;continue;}
  if(superMap[c]!==undefined){add(superMap[c],'super');i++;continue;}
  if(subMap[c]!==undefined){add(subMap[c],'sub');i++;continue;}
  if(c==='†'&&i>0&&/[\p{L}\d)}\]]/u.test(text[i-1])){add(c,'super');i++;continue;}
  if((c==='_'||c==='^')&&i>0&&/[\p{L}\d)}\]′†]/u.test(text[i-1])){const argument=scriptArgument(text,i+1);if(argument){add(argument.text,c==='_'?'sub':'super');i=argument.end;continue;}}
  add(c);i++;
 }
 return segments.length?segments:[{text:'',script:null}];
}

export const needsSvgMath=value=>svgMathSegments(value).some(run=>run.script!==null);

/** Safe markup for the children of an SVG <text>, never for an attribute. */
export function svgMathText(value){
 const parts=svgMathSegments(value);let html='';
 for(let i=0;i<parts.length;i++){
  const run=parts[i];if(!run.script){html+=escapeXML(run.text);continue;}
  const next=parts[i+1];
  if(next?.script&&next.script!==run.script){
   // Fixed script metrics let sub/superscripts share a column (k_x^2), while
   // advancing by the wider script before the following baseline text.
   const first=Array.from(run.text).length*.6,second=Array.from(next.text).length*.6;
   html+=`<tspan font-size="75%" font-family="monospace"><tspan baseline-shift="${run.script}" textLength="${first}em" lengthAdjust="spacingAndGlyphs">${escapeXML(run.text)}</tspan><tspan baseline-shift="${next.script}" dx="-${first}em" textLength="${second}em" lengthAdjust="spacingAndGlyphs">${escapeXML(next.text)}</tspan>${first>second?`<tspan dx="${first-second}em"></tspan>`:''}</tspan>`;i++;
  }else html+=`<tspan baseline-shift="${run.script}" font-size="75%">${escapeXML(run.text)}</tspan>`;
 }
 return parts.some(part=>part.script)?`<tspan data-svg-math-source="${escapeXML(value)}">${html}</tspan>`:html;
}
