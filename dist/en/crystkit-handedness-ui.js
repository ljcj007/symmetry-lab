import {crystalSpan} from './crystal-notation.js?v=20261111-demos1';

const sameHandBasis = [[1,0,0],[0,1,0],[0,0,1]];
const reversedHandBasis = [[-1,0,0],[0,-1,0],[0,0,-1]];

function compareRequest(left,right,positive_only){
 return {
  action:'compare',
  left:{group_number:left},
  right:{group_number:right},
  bases:structuredClone([sameHandBasis,reversedHandBasis]),
  positive_only
 };
}

export function handednessExample(example){
 if(!['positive','both','control'].includes(example))return null;
 const control=example==='control';
 return compareRequest(control?207:212,control?207:213,example!=='both');
}

export function handednessExerciseHTML(open) {
 return `<details id="crystkit-handedness" class="notice research-intro" ${open?'open':''}>
  <summary>Experiment: Can a basis change reverse a space group's handedness?</summary>
  <p>Space groups 212 (${crystalSpan('P4_332','hm')}) and 213 (${crystalSpan('P4_132','hm')}) have the same rotation point group, 432. Predict whether the full operation sets can match using the listed bases and origin shifts when orientation must be preserved.</p>
  <div class="controls-row">
   <button type="button" class="secondary small" data-crystkit-hand="positive">212 → 213 · Preserve orientation</button>
   <button type="button" class="secondary small" data-crystkit-hand="both">212 → 213 · Allow orientation reversal</button>
   <button type="button" class="secondary small" data-crystkit-hand="control">207 → 207 · Control</button>
  </div>
  <p>Loading replaces the current JSON. Run each input manually and compare the verification status and basis determinant. The search uses the listed bases and exact rational arithmetic for compatible origin shifts.</p>
  <p><a href="#classroom/observables?module=chirality&amp;lesson=chiral-mirror">Return to the chirality lesson →</a> · <a href="docs/frontiers.md#crystkit-handedness">Derivation and sources →</a></p>
 </details>`;
}

const quartzCases=[
 ['quartz-positive',152,true,"Original → active mirror · preserve orientation"],
 ['quartz-both',152,false,"Original → active mirror · allow orientation reversal"],
 ['quartz-passive',154,true,"Standardized passive basis change · 154 → 154"]
];

export function quartzHandednessExample(example){
 const scenario=quartzCases.find(([id])=>id===example);
 return scenario?compareRequest(154,scenario[1],scenario[2]):null;
}

export function quartzHandednessHTML(open){
 return `<details id="crystkit-quartz-handedness" class="notice research-intro" ${open?'open':''}>
  <summary>Active reflection and passive basis change in quartz</summary>
  <p>Compare the identified settings for original α-quartz, its active mirror, and the standardized passive change of basis. Here the group numbers select complete operation sets from the fixed catalogue.</p>
  <p>Original and standardized passive basis change · 154 (${crystalSpan('P3_221','hm')})<br>Active mirror · 152 (${crystalSpan('P3_121','hm')})</p>
  <div class="controls-row">${quartzCases.map(([id,,,label])=>`<button type="button" class="secondary small" data-crystkit-hand="${id}">${label}</button>`).join('')}</div>
  <p>Predict which candidate bases can match the full operation sets. The search enumerates I and −I and tests compatible origin shifts exactly. Loading replaces the current JSON. Run the calculation manually afterwards.</p>
  <p><a href="#structure?quartz-hand=practice">Return to the quartz structure exercise →</a> · <a href="#classroom/observables?module=chirality&amp;lesson=chiral-mirror">Return to the chirality lesson →</a></p>
 </details>`;
}

export function affineComparisonHTML(result, payload, {cards,table}) {
 if(result.action!=='compare')return '';
 const verified=result.status==='verified'&&result.identityVerified===true;
 const differentOrders=result.status==='different_quotient_orders';
 const status=verified?"Full operation set verified":differentOrders?"Different translation quotient orders":"No match within the basis search";
 const orientation=verified?(result.orientationPreserved?"Orientation preserved":"Orientation reversed"):'—';
 const scope=payload?.positive_only?"Orientation-preserving only":"Orientation reversal allowed";
 return `<section aria-labelledby="crystkit-comparison-title">
  <h3 id="crystkit-comparison-title">Affine comparison</h3>
  ${cards([["Verification",status],["Orientation constraint",scope],["Matched orientation",orientation]])}
  ${verified?table(["Matching evidence","Exact value"],[["Basis determinant",result.determinant],["Origin shift",result.origin.join(', ')]]) : ''}
  ${!verified&&!differentOrders?"<p>The result is limited to the searched bases and their compatible origin shifts.</p>":''}
 </section>`;
}
