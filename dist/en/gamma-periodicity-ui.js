// The geometry and optical frame come from the existing GaAs phonons preset.
// Positions use exact quarter units of a. Displacements use hundredths of a.
const BASIS=[[0,2,2],[2,0,2],[2,2,0]];
const SITES=[
 {symbol:'Ga',position:[0,0,0],optical:[0,0,8]},
 {symbol:'As',position:[1,1,1],optical:[0,0,-8]}
];
const ROUTES={
 axis:{label:"Along the rotation axis a₁ + a₂ − a₃",coefficients:[1,1,-1]},
 a3:{label:"Basis vector a₃ (perpendicular to the rotation axis)",coefficients:[0,0,1]},
 a1:{label:"Basis vector a₁",coefficients:[1,0,0]},
 a2:{label:"Basis vector a₂",coefficients:[0,1,0]}
};
const FIELDS={
 rotation:"Small rigid rotation about z",
 shift:"Translation of all atoms along z",
 optical:"Relative displacement of Ga and As within the cell"
};
const sum=(a,b)=>a.map((x,index)=>x+b[index]);
const difference=(a,b)=>a.map((x,index)=>x-b[index]);
const scaled=(vector,denominator)=>vector.map(x=>x/denominator);
const latticeShift=coefficients=>BASIS[0].map((_,axis)=>BASIS.reduce((total,column,idx)=>total+column[axis]*coefficients[idx],0));
const zero=value=>value.every(x=>x===0);
const rotationAt=([x,y])=>[y===0?0:-y,x,0];

function displacement(field,position,site){
 if(field==='rotation')return rotationAt(position);
 if(field==='shift')return [0,0,8];
 return [...site.optical];
}

export function gaasGammaPeriodicity(field,route){
 if(!Object.hasOwn(FIELDS,field)||!Object.hasOwn(ROUTES,route))return null;
 const translation=latticeShift(ROUTES[route].coefficients);
 const sites=SITES.map(site=>{
  const nextPosition=sum(site.position,translation);
  const initial=displacement(field,site.position,site),next=displacement(field,nextPosition,site);
  return {symbol:site.symbol,position:scaled(site.position,4),nextPosition:scaled(nextPosition,4),
   displacement:scaled(initial,100),nextDisplacement:scaled(next,100),delta:scaled(difference(next,initial),100)};
 });
 return {field,route,coefficients:[...ROUTES[route].coefficients],translation:scaled(translation,4),sites,
  agreesAcrossCells:sites.every(site=>zero(site.delta)),
  withinCellDelta:scaled(difference(displacement(field,SITES[1].position,SITES[1]),displacement(field,SITES[0].position,SITES[0])),100)};
}

const tuple=vector=>'('+vector.map(value=>String(value).replace('-','−')).join(', ')+')';
const choices=(items,selected)=>items.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
const fieldChoices=Object.entries(FIELDS);
const pathChoices=Object.entries(ROUTES).map(([value,route])=>[value,route.label+' · R/a = '+tuple(scaled(latticeShift(route.coefficients),4))]);

function resultExplanation(result){
 if(result.field==='rotation'){
  const expansion=tuple(result.sites[0].delta);
  const meaning=result.agreesAcrossCells
   ?"The lattice vector is parallel to the rotation axis, so the cross product vanishes. Try a basis vector with a transverse component to see whether the result holds."
   :"The lattice vector has a transverse component, so the cross product is nonzero. A small rigid rotation fails the Γ-point displacement periodicity condition for this fixed lattice.";
  return `<p>For the small rotation about z, the rotation vector is θ = (0,0,1/25) rad. Using Δu = θ × R gives Δu/a =  ${expansion}</p><p>${meaning}</p>`;
 }
 if(result.field==='shift')return "<p>A rigid translation adds the same displacement to every atom. Every lattice translation gives zero displacement difference between corresponding sites, and the two atoms within one cell also move together.</p>";
 return "<p>The optical illustration uses the relative displacement of the existing GaAs model’s z component at a quarter period. Ga and As move in opposite directions within the cell. Each basis site has the same displacement in every primitive cell, which satisfies Γ-point periodicity.</p>";
}
function comparisonHTML(result){
 const rows=result.sites.map(site=>`<tr><th scope="row">${site.symbol}</th><td>${tuple(site.position)}</td><td>${tuple(site.nextPosition)}</td><td>${tuple(site.displacement)}</td><td>${tuple(site.nextDisplacement)}</td><td>${tuple(site.delta)}</td></tr>`).join('');
 return `<p>Selected lattice translation R/a =  ${tuple(result.translation)}</p>
 <div class="obs-table" tabindex="0"><table><caption>Corresponding sites in neighboring primitive cells along the selected lattice vector</caption>
  <thead><tr><th scope="col">Atom</th><th scope="col">Original position r/a</th><th scope="col">Neighboring position (r+R)/a</th><th scope="col">Original displacement u(r)/a</th><th scope="col">Neighboring displacement u(r+R)/a</th><th scope="col">Displacement difference Δu/a</th></tr></thead>
  <tbody>${rows}</tbody></table></div>
 <p>Within one cell, the As displacement minus the Ga displacement, divided by a, is  ${tuple(result.withinCellDelta)}</p>
 ${resultExplanation(result)}`;
}

export function bindGammaPeriodicity({root,isCurrent=()=>true}){
 if(!root?.querySelector||!isCurrent())return ()=>{};
 root.innerHTML=`<p>For the fixed fcc lattice of GaAs, a Γ-point displacement repeats at each basis site under translation along every primitive basis vector. Lengths are in units of the conventional cubic cell edge a.</p>
 <label for="gp-field">Choose a displacement field</label>
 <select class="form-select" id="gp-field">${choices(fieldChoices,'rotation')}</select>
 <label for="gp-route">Choose a lattice translation to a neighboring cell</label>
 <select class="form-select" id="gp-route">${choices(pathChoices,'axis')}</select>
 <p>First check a translation along the rotation axis. Then switch to a lattice vector with a transverse component. The optical illustration uses the relative-displacement arrows of the existing model.</p>
 <label for="gp-predict">Predict whether corresponding sites in these two cells have the same displacement</label>
 <select class="form-select" id="gp-predict" aria-describedby="gp-status">
  <option value="">Choose an answer</option><option value="same">The displacements agree across the two cells</option><option value="different">The displacements differ across the two cells</option>
 </select>
 <button class="secondary" type="button" id="gp-check" aria-controls="gp-result">Check the prediction and displacement difference</button>
 <p id="gp-status" role="status" aria-atomic="true"></p>
 <div id="gp-result" hidden></div>
 <p>For an isolated water molecule, remove three whole-molecule translations and three rigid rotations to isolate the internal vibrations. At the crystal Γ point, remove the three acoustic translations to obtain the optical displacement space. The periodicity condition also admits repeating relative displacements within the cell.</p>
 <p><a href="#compute/phonons?material=gaas">Check the 6, 3 and 3 degrees of freedom in the GaAs phonon calculation →</a></p>`;
 const field=root.querySelector('#gp-field'),route=root.querySelector('#gp-route'),guess=root.querySelector('#gp-predict');
 const check=root.querySelector('#gp-check'),status=root.querySelector('#gp-status'),output=root.querySelector('#gp-result');
 let active=true;
 const here=()=>active&&isCurrent()&&root.isConnected!==false&&root.querySelector('#gp-check')===check;
 function hide(){
  if(!here())return;
  status.textContent='';output.hidden=true;output.innerHTML='';
 }
 function changeContext(){if(here()){guess.value='';hide();}}
 field.onchange=changeContext;
 route.onchange=changeContext;
 guess.onchange=hide;
 check.onclick=()=>{
  if(!here())return;
  const observed=gaasGammaPeriodicity(field.value,route.value);
  if(!observed||!['same','different'].includes(guess.value)){
   status.textContent="Choose a displacement field and a lattice translation, then submit a prediction.";
   return;
  }
  output.innerHTML=comparisonHTML(observed);
  output.hidden=false;
  status.textContent=(guess.value==='same')===observed.agreesAcrossCells
   ?"Your prediction agrees with the comparison for these two cells."
   :"Check the displacement difference for each atom and compare it with your prediction.";
 };
 return ()=>{active=false;};
}
