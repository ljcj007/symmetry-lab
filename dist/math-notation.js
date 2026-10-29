import {crystalTokenAt,findCrystalTokens} from './crystal-notation.js?v=20261029-pathways1';
/** Presentation-only conversion of the site's plain scientific notation.
 * Never use these strings as computational input. Unknown syntax stays text.
 */
const greek={'α':'alpha','β':'beta','γ':'gamma','δ':'delta','ε':'varepsilon','ζ':'zeta','η':'eta','θ':'theta','ι':'iota','κ':'kappa','λ':'lambda','μ':'mu','µ':'mu','ν':'nu','ξ':'xi','π':'pi','ρ':'rho','σ':'sigma','ς':'varsigma','τ':'tau','υ':'upsilon','φ':'varphi','ϕ':'phi','χ':'chi','ψ':'psi','ω':'omega','Γ':'Gamma','Δ':'Delta','Θ':'Theta','Λ':'Lambda','Ξ':'Xi','Π':'Pi','Υ':'Upsilon','Φ':'Phi','Ψ':'Psi','Ω':'Omega','ℓ':'ell','ℏ':'hbar','ℑ':'Im','ℜ':'Re','ℂ':'mathbb{C}','ℝ':'mathbb{R}','ℤ':'mathbb{Z}','ℕ':'mathbb{N}'};
const symbols={'½':'\\frac{1}{2}','¼':'\\frac{1}{4}','¾':'\\frac{3}{4}','⅓':'\\frac{1}{3}','⅔':'\\frac{2}{3}','≪':'\\ll ','≫':'\\gg ','⊃':'\\supset ','⊇':'\\supseteq ','⋊':'\\rtimes ','−':'-','–':'-','×':'\\times ','·':'\\cdot ','⋅':'\\cdot ','⊗':'\\otimes ','⊕':'\\oplus ','∝':'\\propto ','≈':'\\approx ','≃':'\\simeq ','≅':'\\cong ','≠':'\\ne ','≤':'\\le ','≥':'\\ge ','→':'\\to ','↔':'\\leftrightarrow ','⇒':'\\Rightarrow ','⇔':'\\Leftrightarrow ','∈':'\\in ','∉':'\\notin ','⊂':'\\subset ','⊆':'\\subseteq ','∩':'\\cap ','∪':'\\cup ','∞':'\\infty ','∂':'\\partial ','∇':'\\nabla ','∫':'\\int ','∮':'\\oint ','∑':'\\sum ','∏':'\\prod ','±':'\\pm ','∓':'\\mp ','↑':'\\uparrow ','↓':'\\downarrow ','⊥':'\\perp ','∥':'\\parallel ','…':'\\ldots ','⋯':'\\cdots ','⋮':'\\vdots ','⋱':'\\ddots ','⟨':'\\langle ','〈':'\\langle ','⟩':'\\rangle ','〉':'\\rangle ','∅':'\\varnothing ','≡':'\\equiv ','∼':'\\sim ','°':'^{\\circ}','∧':'\\wedge ','∨':'\\vee ','¬':'\\neg ','∀':'\\forall ','∃':'\\exists ','↦':'\\mapsto '};
const subs={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','₌':'=','₍':'(','₎':')','ₐ':'a','ₑ':'e','ₕ':'h','ᵢ':'i','ⱼ':'j','ₖ':'k','ₗ':'l','ₘ':'m','ₙ':'n','ₒ':'o','ₚ':'p','ᵣ':'r','ₛ':'s','ₜ':'t','ᵤ':'u','ᵥ':'v','ₓ':'x','ᵦ':'β','ᵧ':'y','ᵨ':'ρ','ᵩ':'φ','ᵪ':'χ','꜀':'c'};
const supers={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')','ᵀ':'T','ᴴ':'H','ᵃ':'a','ᵇ':'b','ᶜ':'c','ᵈ':'d','ᵉ':'e','ᶠ':'f','ᵍ':'g','ʰ':'h','ⁱ':'i','ʲ':'j','ᵏ':'k','ˡ':'l','ᵐ':'m','ⁿ':'n','ᵒ':'o','ᵖ':'p','ʳ':'r','ˢ':'s','ᵗ':'t','ᵘ':'u','ᵛ':'v','ʷ':'w','ˣ':'x','ʸ':'y','ᶻ':'z','†':'\\dagger ','‡':'\\ddagger ','′':'\\prime ','″':'\\prime\\prime ','‴':'\\prime\\prime\\prime ','ᵅ':'α','ᵝ':'β','ᵞ':'γ','ᵟ':'δ','ᵋ':'ε','ᶿ':'θ','ᶥ':'ι','ᵠ':'φ','ᵡ':'χ'};
const scriptLabels=new Set(['SOC','BdG','NS','CF','JT','ACBD','eff','static','vib','total','in','out','max','min','pair','orb','spin','device','rel','group']);
const functions=new Set(['sin','cos','tan','sinh','cosh','tanh','arcsin','arccos','arctan','exp','log','ln','lim','min','max','det','dim','ker','gcd','arg']);
const operators=new Set(['SU','SO','O','U','GL','SL','Sp','Tr','tr','Re','Im','rank','diag','sgn','Var','Sym','span','mod','FWHM','XMCD','XLD']);
const groups=new Set(['SU','SO','O','U','GL','SL','Sp']);
const cjk=/[\u3400-\u9fff\uf900-\ufaff]/u;
const combining=/[\u0300-\u036f\u20d0-\u20ff]/u;
const escapeText=s=>String(s).replace(/[\\{}%$&#_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','$':'\\$','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c]));
const text=s=>'\\text{'+escapeText(s)+'}';
function closeAt(s,start){const pairs={'(':')','[':']','{':'}'},stack=[pairs[s[start]]];if(!stack[0])return -1;for(let i=start+1;i<s.length;i++){const c=s[i];if(pairs[c])stack.push(pairs[c]);else if(')]}'.includes(c)){if(c!==stack.pop())return -1;if(!stack.length)return i;}}return -1;}
function splitTop(s,delimiter=','){const out=[];let begin=0,depth=0;for(let i=0;i<s.length;i++){if('([{'.includes(s[i]))depth++;else if(')]}'.includes(s[i]))depth--;else if(s[i]===delimiter&&!depth){out.push(s.slice(begin,i));begin=i+1;}}out.push(s.slice(begin));return out;}
function preprocess(s){return s.normalize('NFD').replace(/Σᵅ/g,'∑_(α)').replace(/Σ2(?=t)/g,'∑2').replace(/ΣJ(?=\()/g,'∑_(J)').replace(/ΣRαμ(?=\|)/g,'∑_(Rαμ)').replace(/Σ([μα])/g,'∑_($1)').replace(/Σarg(?=\()/g,'∑ arg').replace(/Σif(?=\s)/g,'∑_(if)').replace(/Σjα(?=\s)/g,'∑_(jα)').replace(/([στ])([xyz]{1,3})(?![A-Za-z_])/g,'$1_{$2}').replace(/(?<![A-Za-z_])kB(?![a-z_])/g,'k_B').replace(/μB(?![a-z_])/g,'μ_B').replace(/dₓ²₋ᵧ²/g,'d_{x^2-y^2}').replace(/E_x²[−-]y²/g,'E_{x^2-y^2}').replace(/E_z²/g,'E_{z^2}').replace(/(?<![A-Za-z0-9_])([CD])([1-6])([vhdi]?)(?![A-Za-z0-9_])/g,'$1_{$2$3}').replace(/(?<![A-Za-z0-9_])([CD])([₀-₉]+)([vhdiᵢᵥₕ])?(?![A-Za-z₀-₉])/g,(_,g,n,a)=>g+'_{'+Array.from(n).map(c=>subs[c]).join('')+(subs[a]||a||'')+'}').replace(/(?<![A-Za-z0-9_])([OTI])([hd])(?![A-Za-z0-9_])/g,'$1_{$2}').replace(/Σ([ijkmnrcab]+(?:[₀-₉₊₋ᵢⱼₖₗₘₙᵣₛₜₓ]*))(,\s*[ijkmnrcab]+[₀-₉₊₋ᵢⱼₖₗₘₙᵣₛₜₓ]*)?/g,(_,a,b)=>'Σ_{'+a+(b||'')+'}').replace(/\r\n?/g,'\n');}

function convert(source,depth=0){
 if(depth>24)throw Error('Notation nesting limit');
 const s=source;let out='',i=0,previousAtom=false,lastAtom=null;const frames=[];
 const inner=x=>convert(x,depth+1);const scriptTex=x=>scriptLabels.has(x)?'\\mathrm{'+x+'}':inner(x);
 const accented=(atom,mark)=>{
  if(mark==='̄'||mark==='̅')return '\\overline{'+atom+'}';
  if(mark==='̿')return '\\overline{\\overline{'+atom+'}}';
  const command={'̂':'hat','⃗':'vec','̃':'tilde','̇':'dot','̈':'ddot','̸':'not'}[mark];
  if(!command)throw Error('Unsupported combining mark');
  return '\\'+command+'{'+atom+'}';
 };

 // Scripts belong to the preceding mathematical atom, not to a free string
 // suffix. One sub/sup pair also handles mixed ASCII and Unicode notation.
 const atomText=a=>a.base+(a.sub===null?'':'_{'+a.sub+'}')+(a.sup===null?'':'^{'+a.sup+'}');
 const emit=(atom,start=out.length)=>{out+=atom;lastAtom={start,base:out.slice(start),sub:null,sup:null,parentheticalSup:false};};
 const attach=(kind,value,parenthetical=false)=>{
  if(!previousAtom||!lastAtom)throw Error('Script without a base');
  const key=kind==='_'?'sub':'sup';
  if(key==='sup'&&lastAtom.sup!==null&&(lastAtom.parentheticalSup||/^(?:[+-]|(?:\\(?:prime|dagger|ddagger)\s*)+)$/.test(lastAtom.sup)&&/^[+−-]?\d/.test(value))){
   // (T^(A))² is a power of a labelled operator; never flatten it to T^(A2).
   const labelled={...lastAtom,sup:lastAtom.parentheticalSup?'('+lastAtom.sup+')':lastAtom.sup};
   lastAtom={start:lastAtom.start,base:'\\left('+atomText(labelled)+'\\right)',sub:null,sup:null,parentheticalSup:false};
  }
  lastAtom[key]=(lastAtom[key]??'')+value;
  if(key==='sup')lastAtom.parentheticalSup=parenthetical;
  out=out.slice(0,lastAtom.start)+atomText(lastAtom);previousAtom=true;
 };
 function script(start){let j=start;while(/\s/.test(s[j]||'')&&j<s.length)j++;if(j>=s.length)throw Error('Missing script');if('({'.includes(s[j])){const end=closeAt(s,j);if(end<0)throw Error('Unclosed script');return{tex:scriptTex(s.slice(j+1,end)),end:end+1,parenthetical:s[j]==='('};}let match=s.slice(j).match(/^(?:SOC|BdG|NS|CF|JT|ACBD|AC|BD|AB|CD|EF|C[1-6][xyz]|[A-Z]|[a-z]+|[+−-]?\d+)/);if(!match&&cjk.test(s[j]))match=s.slice(j).match(/^[\u3400-\u9fff\uf900-\ufaff]+/u);if(match){let end=j+match[0].length;while(combining.test(s[end]||''))end++;if(s[end]===','){const continuation=s.slice(end).match(/^,[a-z]+(?![A-Za-z†‡′_₀-₉])/);if(continuation)end+=continuation[0].length;}return{tex:scriptTex(s.slice(j,end)),end};}let end=j+(s.codePointAt(j)>65535?2:1);while(combining.test(s[end]||''))end++;return{tex:inner(s.slice(j,end)),end};}
 while(i<s.length){
  const crystal=crystalTokenAt(s,i);if(crystal){emit(crystal.atomBase??('{'+crystal.tex+'}'));previousAtom=true;if(crystal.atomSub)attach('_',crystal.atomSub);if(crystal.atomSup)attach('^',crystal.atomSup);i=crystal.end;continue;}
  let c=s[i];
  if(c==='\n'){out+=' \\\\ ';i++;previousAtom=false;lastAtom=null;continue;}
  if(/\s/.test(c)){out+=' ';i++;continue;}
  if(c==='\\')throw Error('Literal TeX is not accepted by the plain-notation converter');
  if(cjk.test(c)){let j=i+1;while(j<s.length&&(cjk.test(s[j])||/\s/.test(s[j])))j++;emit(text(s.slice(i,j)));i=j;previousAtom=true;continue;}
  if(s.startsWith('[[',i)){
   const end=closeAt(s,i);if(end<0)throw Error('Unclosed matrix');const raw=s.slice(i+1,end),rows=splitTop(raw).map(x=>x.trim());
   if(rows.length&&rows.every(x=>x[0]==='['&&closeAt(x,0)===x.length-1)){
    const cells=rows.map(r=>splitTop(r.slice(1,-1)));if(cells.every(r=>r.length===cells[0].length)&&cells[0].length){emit('\\begin{bmatrix}'+cells.map(r=>r.map(inner).join('&')).join('\\\\')+'\\end{bmatrix}');i=end+1;previousAtom=true;continue;}
   }
  }
  if(c==='_'||c==='^'){
   const value=script(i+1);attach(c,value.tex,Boolean(value.parenthetical));i=value.end;continue;
  }
  if(subs[c]||supers[c]){
   const kind=subs[c]?'_':'^',map=subs[c]?subs:supers,decoration=/[†‡′″‴]/.test(c);let value='';while(i<s.length&&map[s[i]]&&(kind==='_'||/[†‡′″‴]/.test(s[i])===decoration))value+=map[s[i++]];let marks='';while(combining.test(s[i]||''))marks+=s[i++];const tex=value.includes('\\')?Array.from(marks).reduce(accented,value):inner(value+marks);attach(kind,tex);continue;
  }
  if(c==="'"&&previousAtom){attach('^','\\prime ');i++;continue;}
  if(c==='√'){
   let j=i+1;while(s[j]===' ')j++;if('([{'.includes(s[j]||'!')){const end=closeAt(s,j);if(end<0)throw Error('Unclosed root');emit('\\sqrt{'+inner(s.slice(j+1,end))+'}');i=end+1;}
   else {const m=s.slice(j).match(/^\d+(?:\.\d+)?/);const value=m?m[0]:s[j];if(!value)throw Error('Missing root');emit('\\sqrt{'+inner(value)+'}');i=j+value.length;}previousAtom=true;continue;
  }
  let atom='',atomStart=out.length;
  if(/[A-Za-z]/.test(c)){
   const m=s.slice(i).match(/^[A-Za-z]+/)[0],isFunction=functions.has(m),isOperator=operators.has(m)&&(!groups.has(m)||s[i+m.length]==='(');
   if((isFunction||isOperator)&&!(m.length>1&&combining.test(s[i+m.length]||''))){atom=isFunction?'\\'+m+' ':'\\operatorname{'+m+'}';}
   else {out+=m.slice(0,-1);atom=m.at(-1);atomStart=out.length;}
   i+=m.length;
  }else if(/[0-9]/.test(c)){const m=s.slice(i).match(/^\d+(?:\.\d+)?/)[0];atom=m;i+=m.length;}
  else if(greek[c]){atom='\\'+greek[c]+' ';i++;}
  else if(c==='Σ'){
   const next=s[i+1]||'',isSum=next==='('&&/[Ssx]/.test(s[i+2]||'')||next==='∑'||next==='_'&&!/[LR]/.test(s[i+2]||'')||/[a-zS꜀]/.test(next)||Boolean(subs[next]&&/[a-zαβγ]/u.test(subs[next]));
   atom=isSum?'\\sum ':'\\Sigma ';i++;
  }else if(symbols[c]){atom=symbols[c];i++;}
  else if(c==='{'||c==='}') {atom='\\'+c;i++;}
  else if('%&#$'.includes(c)){atom='\\'+c;i++;}
  else if(c==='~'){atom='\\sim ';i++;}
  else if(c==='；'||c===';'){atom='\\ ;\\quad ';i++;}
  else if(c==='，'||c==='、'){atom=',\\quad ';i++;}
  else if(c==='：'){atom=':\\quad ';i++;}
  else if(c==='（'){atom='(';i++;}
  else if(c==='）'){atom=')';i++;}
  else if(c==='。'){atom='\\ .\\quad ';i++;}
  else if(c==='['||c==='('||c===']'||c===')'||'+-=,.:/|!*<>'.includes(c)){atom=c;i++;}
  else if(combining.test(c)){throw Error('Combining mark without a supported base');}
  else if(s.codePointAt(i)>65535){const glyph=String.fromCodePoint(s.codePointAt(i)),base=glyph.normalize('NFKD');if(/^[A-Za-z0-9]$/.test(base)){const cp=glyph.codePointAt(0),style=cp>=0x1d49c&&cp<=0x1d4cf?'mathcal':cp>=0x1d504&&cp<=0x1d537?'mathfrak':cp>=0x1d538&&cp<=0x1d56b?'mathbb':cp>=0x1d400&&cp<=0x1d433?'mathbf':'mathit';atom='\\'+style+'{'+base+'}';}else atom=text(glyph);i+=glyph.length;}else if(c.codePointAt(0)>127){atom=text(c);i++;}
  else throw Error('Unsupported notation');
  // A Unicode combining accent binds to this atom. In an ordinary Latin word
  // the atom is its final letter; a numeral such as the SU(3) label 10 stays whole.
  while(i<s.length&&combining.test(s[i]))atom=accented(atom,s[i++]);
  const open=c==='('||c==='['||c==='{',close=c===')'||c===']'||c==='}';
  if(open)frames.push({character:c,start:atomStart});
  if(close){const frame=frames.at(-1);if(frame&&({'(':')','[':']','{':'}'})[frame.character]===c){atomStart=frame.start;frames.pop();}}
  emit(atom,atomStart);previousAtom=!/^[=+,:;<>\-]$/.test(c)&&!open;
 }
 return out.trim();
}

/** Convert a single plain formula to TeX. null means preserve the original text. */
export function normalizeMath(source){
 if(typeof source!=='string'||!source.trim()||source.length>30000||/<(?:img|script|iframe|style|div|span)\b/i.test(source))return null;
 try{const s=preprocess(source);const tex=convert(s).replace(/k_\{B\}/g,'k_{\\mathrm{B}}').replace(/\\mu _\{B\}/g,'\\mu _{\\mathrm{B}}');return s.includes('\n')?'\\begin{gathered}'+tex+'\\end{gathered}':tex;}catch{return null;}
}

const scriptCharacters=new RegExp('['+Object.keys(subs).join('')+Object.keys(supers).join('')+']','u');
const physicalComponents=/(?:[στ][xyz]{1,3}(?![A-Za-z_])|(?<![A-Za-z_])kB(?![a-z_])|μB(?![a-z_]))/u;
const explicitMath=/[_^₀-₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵀ†′̄̅̿̂̇̈⃗⊗⊕∑Σ∫∂√⟨⟩〈〉ℏ]|(?:SU|SO|U)\(\d+\)|\b(?:[CD][1-6][vhdi]?|[OTI][hd])\b|[=<>≈≠≤≥⇒∝]/u;
function append(rows,row){if(!row.source)return;const prev=rows.at(-1);if(prev&&prev.type===row.type&&row.type==='text')prev.source+=row.source;else rows.push(row);}
function part(source,force=false){const tex=normalizeMath(source);return tex&&(force||explicitMath.test(source)||scriptCharacters.test(source)||physicalComponents.test(source)||findCrystalTokens(source).some(p=>p.kind))?{type:'math',source,tex}:{type:'text',source};}

/** A formula block may contain prose. Keep prose and separators readable. */
export function segmentFormula(source){
 source=String(source??'');const rows=[];let begin=0,depth=0;
 // Matrices can contain newlines; retain them as one complete expression.
 if(!cjk.test(source)&&source.includes('[[')){const row=part(source,true);return[row];}
 for(let i=0;i<source.length;i++){
  const c=source[i];if(cjk.test(c)&&'_^'.includes(source[i-1]||'!')){while(cjk.test(source[i+1]||''))i++;continue;}if('([{'.includes(c))depth++;else if(')]}'.includes(c))depth=Math.max(0,depth-1);
  if(!depth&&(c==='\n'||c==='；'||c==='，'||c==='：'||c==='。'||c==='、'||cjk.test(c))){
   append(rows,part(source.slice(begin,i),true));let j=i+1;
   if(cjk.test(c))while(j<source.length&&(cjk.test(source[j])||/[\s，：。；、]/.test(source[j])&&source[j]!=='\n'))j++;
   append(rows,{type:'text',source:source.slice(i,j)});i=j-1;begin=j;
  }
 }
 append(rows,part(source.slice(begin),true));return rows.length?rows:[{type:'text',source}];
}

/** Conservative inline discovery: skip file paths, URLs, and source identifiers. */
export function findInlineMath(source){
 source=String(source??'');const rows=[];
 // Explicit $...$ / \(...\) delimiters are intentionally not executed as TeX.
 const chunks=source.split(/(\b[a-z][a-z0-9]+(?:_[A-Za-z0-9]{2,})+\b|https?:\/\/[^\s，。；]+|[A-Za-z0-9_./-]+\.(?:py|js|mjs|json|csv|yaml|yml|cif|md|tex|zip|html|css)\b|[A-Za-z]:[\\/][^\s，。；]+)/g);
 for(const chunk of chunks){
  if(/^[a-z][a-z0-9]+(?:_[A-Za-z0-9]{2,})+$/.test(chunk)||/^(?:https?:\/\/|[A-Za-z]:[\\/])/.test(chunk)||/\.(?:py|js|mjs|json|csv|yaml|yml|cif|md|tex|zip|html|css)$/.test(chunk)){append(rows,{type:'text',source:chunk});continue;}
  const bits=chunk.split(/([\u3400-\u9fff\uf900-\ufaff，。；：、！？]+|\s{2,}|\n)/u);
  for(const bit of bits){if(!bit)continue;if(cjk.test(bit)||/^[，。；：、！？\s]+$/.test(bit)){append(rows,{type:'text',source:bit});continue;}
   // Do not italicize a long English sentence just because it contains a subscript.
   const pieces=bit.split(/(\s+)/);let run='';const flush=()=>{if(!run)return;if(!run.trim()){append(rows,{type:'text',source:run});run='';return;}const leading=run.match(/^\s*/)[0],trailing=run.match(/\s*$/)[0],body=run.slice(leading.length,run.length-trailing.length||undefined);append(rows,{type:'text',source:leading});append(rows,part(body));append(rows,{type:'text',source:trailing});run='';};
   for(const p of pieces){if(/^[A-Za-z]{4,}$/.test(p)&&!functions.has(p)&&!operators.has(p)){flush();append(rows,{type:'text',source:p});}else run+=p;}flush();
  }
 }
 return rows;
}

export const mathNotationVersion='20261029-pathways1';
