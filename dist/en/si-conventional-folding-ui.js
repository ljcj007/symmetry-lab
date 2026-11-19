import {siFoldingStructureRoute,siFoldingWaves as waves} from './si-folding-route.js?v=20261120-si-fold-handoff1';

// All positions are in exact eighths of the conventional lattice vectors.
// The two seed sites and the order of their F-centering copies match the pinned Si POSCAR-0.
const translations=[[0,0,0],[0,4,4],[4,0,4],[4,4,0]];
const seeds=[[7,7,7],[1,1,1]];
const basisLabels=['A','B'];
const translationsLabels=['0','t₁','t₂','t₃'];
const mod8=value=>value%8;
const fractions=values=>values.map(value=>value/8);
const add=(left,right)=>left.map((value,axis)=>value+right[axis]);
const indexOfTranslation=values=>translations.findIndex(vector=>vector.every((value,axis)=>value===values[axis]));
const position=(seed,translation)=>fractions(add(seed,translations[translation]).map(mod8));
const validIndex=index=>Number.isInteger(index)&&index>=0&&index<4;

export function siConventionalFolding(waveIndex,translationIndex){
 if(!validIndex(waveIndex)||!validIndex(translationIndex))return null;
 const wave=waves[waveIndex];
 const phases=translations.map(t=>mod8(wave.reduce((dot,value,axis)=>dot+value*t[axis],0))===0?1:-1);
 const movedIndices=translations.map(site=>indexOfTranslation(add(site,translations[translationIndex]).map(mod8)));
 const sites=seeds.flatMap((seed,basis)=>movedIndices.map((to,from)=>({
  basis:basisLabels[basis],from,to,beforePosition:position(seed,from),afterPosition:position(seed,to),
  beforeSign:phases[from],afterSign:phases[to],
 })));
 return {wave:[...wave],translation:fractions(translations[translationIndex]),phases,sites,
  translationSign:phases[translationIndex],isPrimitiveGamma:phases.every(sign=>sign===1)};
}

const asTuple=values=>`(${values.join(', ')})`;
const asSign=value=>value===1?'+':'−';
const phaseRow=phase=>phase.map(asSign).join(' ');
const translationOptions=translations.slice(1).map((value,index)=>`<option value="${index+1}">${translationsLabels[index+1]} = ${asTuple(fractions(value))}</option>`).join('');
const questionOptions=`<option value="">Choose an answer…</option><option value="primitive">Conventional-cell Γ and primitive-cell Γ</option><option value="folded">Conventional-cell Γ, folded from a nonzero primitive-cell wavevector</option>`;

function explain(result){
 if(result.isPrimitiveGamma)return "<p>All three primitive translations have phase +1. Each basis site has the same displacement in every primitive cell, so this row is primitive-cell Γ.</p>";
 return "<p>This integer wavevector has phase +1 under every conventional-cell basis translation, so it folds to conventional-cell Γ. The primitive cell also permits the F-centering translations within the conventional cell. The phase row contains −1, so at least one primitive translation reverses the displacement even if the currently selected translation preserves it. This row belongs to the primitive-cell X star.</p>";
}

export function bindSiConventionalFolding({root,isCurrent=()=>true}){
 if(!root||!isCurrent())return ()=>{};
 let waveIndex=0,translationIndex=1;
 root.innerHTML=`<p>The cubic conventional cell of Si has eight atoms, arranged in four copies of a two-atom basis. The exercise uses fractional coordinates from the original Si structure. Pick a common displacement axis, mark the arrow direction with + or −, and compare the four copies of the basis.</p>
 <div class="obs-choices" role="group" aria-label="Choose a row of translation phases">
 ${waves.map((wave,index)=>`<button type="button" class="secondary" data-si-fold-wave="${index}" aria-pressed="${index===waveIndex}">k = ${asTuple(wave)} · ${phaseRow(siConventionalFolding(index,1).phases)}</button>`).join('')}
 </div>
 <p>The wavevector k uses conventional-cell reciprocal coordinates. The four entries in each phase row correspond to 0, t₁, t₂, and t₃. All four wavevectors have conventional-cell periodicity.</p>
 <label for="si-fold-translation">Which primitive basis vector should the translation follow?</label>
 <select id="si-fold-translation">${translationOptions}</select>
 <p id="si-fold-phase" class="obs-formula" role="status"></p>
 <div class="obs-table"><table><caption>Coordinates and displacement signs for the same basis site before and after translation</caption><thead><tr><th scope="col">Basis site</th><th scope="col">Coordinates and displacement before translation</th><th scope="col">Coordinates and displacement after translation</th></tr></thead><tbody id="si-fold-sites"></tbody></table></div>
 <p>A and B are the two Si basis sites in a primitive cell. Coordinates outside the conventional cell wrap back periodically.</p>
 <label for="si-fold-choice">Does the selected phase row also belong to primitive-cell Γ?</label>
 <select id="si-fold-choice" aria-describedby="si-fold-feedback">${questionOptions}</select>
 <div class="obs-links"><button type="button" class="primary" id="si-fold-check">Check prediction</button></div>
 <div id="si-fold-feedback" class="obs-feedback" role="status"></div>
 <details><summary>Account for all 24 displacement degrees of freedom</summary>
 <p>The phase rows on the four centering positions are pairwise orthogonal. Each row can multiply independent displacements along three directions for each of the two atoms, so the 24 coordinates at conventional-cell Γ split into four six-dimensional sectors. The all-in-phase sector is primitive-cell Γ. The other three correspond to the three arms of one X star. The six dimensions follow from translation symmetry and the displacement degrees of freedom. Computing frequencies requires the dynamical matrix.</p>
 <p>Choose a row and follow the link to the structure tool. Verify the original file and check the input wavevector, then run the conversion and open the representation workbench. Compare the little-group order and number of star arms for Γ and any X row.</p>
 <p><a id="si-fold-structure" href="${siFoldingStructureRoute(waveIndex)}">Check the selected wavevector with the official Si file →</a> · <a href="docs/si-structure-example.md#si-folding-check">See the basis changes and results for all four rows</a></p>
 </details>`;

 const events=new AbortController();
 const translation=root.querySelector('#si-fold-translation');
 const phases=root.querySelector('#si-fold-phase');
 const sites=root.querySelector('#si-fold-sites');
 const choice=root.querySelector('#si-fold-choice');
 const feedback=root.querySelector('#si-fold-feedback');
 const structureLink=root.querySelector('#si-fold-structure');
 const rowButtons=root.querySelectorAll('[data-si-fold-wave]');

 function draw(){
  const result=siConventionalFolding(waveIndex,translationIndex);
  structureLink.setAttribute('href',siFoldingStructureRoute(waveIndex));
  const sign=result.translationSign===1?'+1':'−1';
  phases.textContent=`exp(2πi k·${translationsLabels[translationIndex]}) = ${sign}`;
  sites.innerHTML=result.sites.map(site=>`<tr><th scope="row">${site.basis} · ${translationsLabels[site.from]} → ${translationsLabels[site.to]}</th><td>${asTuple(site.beforePosition)} · ${asSign(site.beforeSign)}</td><td>${asTuple(site.afterPosition)} · ${asSign(site.afterSign)}</td></tr>`).join('');
 }

 function clearPrediction(){
  choice.value='';
  feedback.textContent='';
 }

 for(const button of rowButtons)button.addEventListener('click',()=>{
  const selected=Number(button.dataset.siFoldWave);
  if(!isCurrent()||selected===waveIndex)return;
  waveIndex=selected;
  for(const other of rowButtons)other.setAttribute('aria-pressed',String(other===button));
  clearPrediction();
  draw();
 },{signal:events.signal});
 translation.addEventListener('change',()=>{
  if(!isCurrent())return;
  translationIndex=Number(translation.value);
  draw();
 },{signal:events.signal});
 choice.addEventListener('change',()=>{
  if(isCurrent())feedback.textContent='';
 },{signal:events.signal});
 root.querySelector('#si-fold-check').addEventListener('click',()=>{
  if(!isCurrent())return;
  const result=siConventionalFolding(waveIndex,translationIndex);
  if(!choice.value){
   feedback.textContent="Choose an answer first.";
   choice.focus();
   return;
  }
  const correct=choice.value===(result.isPrimitiveGamma?'primitive':'folded');
  if(!correct){
   feedback.textContent="Try again. At primitive-cell Γ, the displacement sign must stay the same under all three primitive basis translations. Try another basis vector or check the phase row.";
   return;
  }
  feedback.innerHTML=explain(result);
 },{signal:events.signal});
 draw();
 return ()=>events.abort();
}
