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
const barMarks=/[\u0304\u0305]/u;
const boundedOperation=/^([CDS])([1-6₁-₆])([xyzvhdi])(?![A-Za-z0-9_])/u;

function scriptArgument(text,start){
 const opener=text[start],closer=opener==='{'?'}':opener==='('?')':null;
 if(closer){let depth=1;for(let i=start+1;i<text.length;i++){if(text[i]===opener)depth++;else if(text[i]===closer&&!--depth)return {text:text.slice(start+1,i),end:i+1};}return null;}
 let end=start;while(end<text.length&&atom.test(text[end]))end++;
 // Unbraced signs are meaningful scripts (S^+, R^-), not an empty argument.
 if(end===start&&/[+−-]/.test(text[start]||''))end++;
 return end>start?{text:text.slice(start,end),end}:null;
}

/** Text runs in display order. Accent belongs to a base, never its scripts. */
export function svgMathSegments(value){
 const text=String(value??'');if(isPath(text))return [{text,script:null}];
 const segments=[];
 const add=(value,script=null,accent=null)=>{if(!value)return;const last=segments.at(-1);if(!accent&&last?.script===script&&!last.accent)last.text+=value;else segments.push({text:value,script,...(accent?{accent}:{})});};
 for(let i=0;i<text.length;){
  const named=(i===0||!/[\p{L}\d_]/u.test(text[i-1]))?text.slice(i).match(/^(bar)?([CS])([2346](?:[xyzabcdefh]|[1-4])?)(pp|p|[+-])?(?![A-Za-z0-9_])/):null;
  if(named){add(named[2],null,named[1]?'bar':null);add(named[3],'sub');if(named[4])add(named[4]==='pp'?'″':named[4]==='p'?'′':named[4],'super');i+=named[0].length;continue;}
  const c=text[i],operation=(i===0||!/[\p{L}\d_]/u.test(text[i-1]))?text.slice(i).match(boundedOperation):null;
  if(operation){add(operation[1]);add((subMap[operation[2]]||operation[2])+operation[3],'sub');i+=operation[0].length;continue;}
  const component=text.slice(i).match(greekComponents);
  if(component){add(component[1]);add(component[2],'sub');i+=component[0].length;continue;}
  if(superMap[c]!==undefined){add(superMap[c],'super');i++;continue;}
  if(subMap[c]!==undefined){add(subMap[c],'sub');i++;continue;}
  if((c==='†'||c==='′'||c==='″'||c==='‴')&&i>0&&(/[\p{L}\d)}\]\u0304\u0305]/u.test(text[i-1])||superMap[text[i-1]]!==undefined||subMap[text[i-1]]!==undefined)){add(c,'super');i++;continue;}
  if((c==='_'||c==='^')&&i>0&&/[\p{L}\d)}\]′†\u0304\u0305]/u.test(text[i-1])){const argument=scriptArgument(text,i+1);if(argument){add(argument.text,c==='_'?'sub':'super');i=argument.end;continue;}}
  // A combining overline is attached to the adjacent glyph (or full numeric
  // representation such as 10-bar). It is not raised together with an inverse.
  const number=text.slice(i).match(/^\d+/),base=number?number[0]:String.fromCodePoint(text.codePointAt(i));
  let end=i+base.length;
  if(barMarks.test(text[end]||'')){
   while(barMarks.test(text[end]||''))end++;
   add(base,null,'bar');i=end;
   // C-bar with an existing digit script and Cartesian axis is one operation.
   const suffix=text.slice(i).match(/^([₁-₆])([xyz])(?![A-Za-z0-9_])/u);
   if(/^[CDS]$/.test(base)&&suffix){add(subMap[suffix[1]]+suffix[2],'sub');i+=suffix[0].length;}
   continue;
  }
  add(base);i=end;
 }
 return segments.length?segments:[{text:'',script:null}];
}

export const needsSvgMath=value=>svgMathSegments(value).some(run=>run.script!==null||run.accent);

/** Safe markup for SVG <text> children. Widths are measured after insertion. */
export function svgMathText(value){
 const parts=svgMathSegments(value);let html='';
 // Numeric dy values are relative to the 75% script font. Every script
 // restores the parent baseline; UA-dependent baseline-shift is not used.
 const offsets={sub:.28,super:-.5},em=n=>String(Number(n.toFixed(4)))+'em';
 for(let i=0;i<parts.length;i++){
  const run=parts[i];
  if(!run.script){html+=run.accent==='bar'?`<tspan text-decoration="overline" data-svg-overline="true">${escapeXML(run.text)}</tspan>`:escapeXML(run.text);continue;}
  const next=parts[i+1];
  if(next?.script&&next.script!==run.script){
   // No guessed character widths, forced monospace, or textLength distortion.
   // layoutSvgMath aligns these using the font's actual SVG text advances.
   html+=`<tspan data-svg-script-pair="true" font-size="75%"><tspan data-svg-script-first="true" data-svg-script="${run.script}" dy="${em(offsets[run.script])}">${escapeXML(run.text)}</tspan><tspan data-svg-script-second="true" data-svg-script="${next.script}" dy="${em(offsets[next.script]-offsets[run.script])}">${escapeXML(next.text)}</tspan><tspan data-svg-script-advance="true" dy="${em(-offsets[next.script])}" aria-hidden="true">&#8203;</tspan></tspan>`;i++;
  }else html+=`<tspan font-size="75%"><tspan data-svg-script="${run.script}" dy="${em(offsets[run.script])}">${escapeXML(run.text)}</tspan><tspan data-svg-script-reset="true" dy="${em(-offsets[run.script])}" aria-hidden="true">&#8203;</tspan></tspan>`;
 }
 return parts.some(part=>part.script||part.accent)?`<tspan data-svg-math-source="${escapeXML(value)}">${html}</tspan>`:html;
}

/** Call after insertion, and again when document.fonts.ready resolves.
 * SVG user units from getComputedTextLength match numeric dx units exactly.
 * Repeated calls reset prior offsets before measuring, so they are idempotent.
 */
export function layoutSvgMath(root){
 if(!root?.querySelectorAll)return 0;
 const pairs=[...(root.matches?.('[data-svg-script-pair]')?[root]:[]),...root.querySelectorAll('[data-svg-script-pair]')];
 let count=0;
 for(const pair of pairs){
  const first=pair.querySelector('[data-svg-script-first]'),second=pair.querySelector('[data-svg-script-second]'),advance=pair.querySelector('[data-svg-script-advance]');
  if(!first||!second||!advance||!first.getComputedTextLength||!second.getComputedTextLength)continue;
  second.removeAttribute('dx');advance.removeAttribute('dx');
  const a=first.getComputedTextLength(),b=second.getComputedTextLength();
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0){pair.removeAttribute('data-svg-layout');continue;}
  second.setAttribute('dx',String(-a));advance.setAttribute('dx',String(Math.max(0,a-b)));pair.setAttribute('data-svg-layout','measured');count++;
 }
 return count;
}
