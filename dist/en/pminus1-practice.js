import {crystalSpan} from './crystal-notation.js?v=20261110-en1';

const routes={orbit:'#crystkit?preset=pminus1-orbit',origin:'#crystkit?preset=pminus1-origin'};
const examples={
 general:{action:'analyze',group_number:2,point:['1/5','3/10','2/5']},
 center:{action:'analyze',group_number:2,point:[0,0,0]},
 shifted:{action:'analyze',group_number:2,origin:['1/4',0,0],point:['-1/4',0,0]}
};

export function pMinusOnePracticeFromRoute(route){
 return Object.keys(routes).find(key=>routes[key].slice(1)===route)||null;
}

export function pMinusOneLessonHTML(lesson){
 const group=crystalSpan('P-1','hm');
 if(lesson==='space-04')return `<aside class="sc-worked" data-pminus1-lesson="orbit">
  <h3>Check the orbits of a general point and an inversion center · ${group}</h3>
  <p>Use (1/5, 3/10, 2/5) and (0, 0, 0). Predict the orbit size and which operations fix the point. Compare both results modulo translations of the same primitive cell.</p>
  <a href="${routes.orbit}">Compare the two points in Crystal Group Tools →</a>
 </aside>`;
 if(lesson==='space-06')return `<aside class="sc-worked" data-pminus1-lesson="origin">
  <h3>Describe the same inversion center from two origins</h3>
  <p>Keep the basis fixed. The new origin has old coordinates (1/4, 0, 0). The original inversion center has new coordinates (−1/4, 0, 0). Predict the inversion translation before reduction, then check the reduced result in the tool.</p>
  <a href="${routes.origin}">Compare the original and shifted origins in Crystal Group Tools →</a>
 </aside>`;
 return '';
}

export function pMinusOnePracticeHTML(practice){
 if(practice==='orbit')return `<section class="notice" id="crystkit-pminus1" aria-labelledby="crystkit-pminus1-title">
  <h2 id="crystkit-pminus1-title">General point and inversion center</h2>
  <p>Load and run each input. In the orbit table, check that the general point has two equivalent points and stabilizer order 1, while the inversion center has one equivalent point and stabilizer order 2.</p>
  <div class="controls-row">
   <button type="button" class="secondary small" data-pminus1-input="general">Load the general point <code>(1/5, 3/10, 2/5)</code></button>
   <button type="button" class="secondary small" data-pminus1-input="center">Load the inversion center <code>(0, 0, 0)</code></button>
  </div>
  <p>Loading an example replaces the current input. Run each case to compare results.</p>
 </section>`;
 if(practice==='origin')return `<section class="notice" id="crystkit-pminus1" aria-labelledby="crystkit-pminus1-title">
  <h2 id="crystkit-pminus1-title">Shift the coordinate origin</h2>
  <p>Compare two coordinate descriptions of the same physical inversion center. After shifting, set origin = (1/4, 0, 0) and use point = (−1/4, 0, 0) in the new coordinates.</p>
  <div class="controls-row">
   <button type="button" class="secondary small" data-pminus1-input="center">Load the original setting</button>
   <button type="button" class="secondary small" data-pminus1-input="shifted">Load the shifted setting</button>
  </div>
  <p>Loading an example replaces the current input. Run each case to compare results.</p>
 </section>`;
 return '';
}

export function pMinusOnePracticeInput(practice,id){
 const allowed=practice==='orbit'?['general','center']:practice==='origin'?['center','shifted']:[];
 return allowed.includes(id)?structuredClone(examples[id]):null;
}

function matchesInput(input,example){
 return input&&Object.keys(input).length===Object.keys(example).length&&
  Object.entries(example).every(([key,value])=>JSON.stringify(input[key])===JSON.stringify(value));
}

export function pMinusOneOriginResultHTML(result,input){
 if(result?.action!=='analyze')return '';
 const moved=matchesInput(input,examples.shifted);
 if(!moved&&!matchesInput(input,examples.center))return '';
 const inversion=result.operations?.find(op=>JSON.stringify(op.rotation)==='[[-1,0,0],[0,-1,0],[0,0,-1]]');
 const folded=moved?'1/2':0;
 if(JSON.stringify(inversion?.translation)!==JSON.stringify([folded,0,0]))return '';
 return `<aside class="notice" id="crystkit-pminus1-inversion">
  <h3>Read the inversion translation</h3>
  <p>${moved?"The coordinate transformation gives the translation before reduction as":"With the origin at the inversion center, the translation before reduction is"} <code>(${moved?'−1/2':'0'}, 0, 0)</code>。</p>
  <p>Python returns this translation reduced modulo the primitive cell: <code data-pminus1-folded>(${inversion.translation.join(', ')})</code>。</p>
 </aside>`;
}
