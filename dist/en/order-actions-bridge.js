import {mathHTML} from './math-display.js?v=20261113-prose2';
import {ORDER_ACTIONS_REFERENCE} from './order-actions-reference.js?v=20261115-actions1';

// Finite teaching actions over captured production matrices, not a solver.
export const ORDER_ACTIONS_BRIDGE_HOOKS=Object.freeze({
 'order-isotropy':Object.freeze(['orbit-actions']),
 'order-invariants':Object.freeze(['reynolds-actions']),
 'order-field-convention':Object.freeze(['field-coordinate-actions'])
});
const clone=x=>JSON.parse(JSON.stringify(x));
const records=clone(ORDER_ACTIONS_REFERENCE.records);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const choice=(x,values)=>{if(!values.includes(x))throw Error('Unknown bounded order action reference.');return x;};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-12?'0':Number(x.toFixed(8)).toString();
const tr=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const mv=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}';
const vector=x=>matrix(x.map(v=>[v]));
const formula=s=>'<div class="oab-formula" tabindex="0">'+mathHTML(s,true)+'</div>';
const inline=s=>mathHTML(s);
const p=s=>'<p>'+esc(s)+'</p>';
const h=s=>'<h4>'+esc(s)+'</h4>';
const table=(caption,headers,rows)=>'<div class="oab-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const opById=(r,id)=>{const op=r.order.operations.find(x=>String(x.id)===String(id));if(!op)throw Error('Unknown production operation identifier.');return op;};
const operationLabel=op=>'<span data-math-ignore>g'+op.id+'</span>';

/** All operations and image buckets come from the actual Oh request. */
export function orderIsotropyReference(kind='axis',operation='0'){
 choice(kind,['axis','zero']);const r=clone(records[kind]),op=opById(r,operation),buckets=[];
 for(const row of r.order.operations){let bucket=buckets.find(b=>b.vector.every((x,i)=>Math.abs(x-row.image[i])<1e-12));if(!bucket){bucket={vector:row.image.slice(),operations:[]};buckets.push(bucket);}bucket.operations.push(row.id);}
 return{record:r,operation:op,buckets,products:op.matrix.map(row=>row.map((x,i)=>x*r.order.vector[i]))};
}
const seeds={x2:{powers:[2,0],basis:'a2',tex:'x^2',normalization:2},xy:{powers:[1,1],basis:null,tex:'xy',normalization:0},x4:{powers:[4,0],basis:'b4',tex:'x^4',normalization:2}};
const etaChoices={axis:[1,0],diagonal:[1,1],zero:[0,0]};
/** The three declared seeds are averaged over the genuine eight C4v matrices. */
export function orderReynoldsReference({seed='x2',eta='axis',coefficient='2'}={}){
 choice(seed,Object.keys(seeds));choice(eta,Object.keys(etaChoices));choice(String(coefficient),['-2','2']);
 const definition=seeds[seed],v=etaChoices[eta].slice(),terms=records.reynolds.order.operations.map(op=>{
  const powers=[0,0];let sign=1;
  definition.powers.forEach((power,i)=>{const j=op.matrix[i].findIndex(x=>x!==0);powers[j]+=power;sign*=op.matrix[i][j]**power;});
  const image=mv(op.matrix,v);return{id:op.id,matrix:clone(op.matrix),powers,sign,image,value:image[0]**definition.powers[0]*image[1]**definition.powers[1]};
 });
 const sum=terms.reduce((s,t)=>s+t.value,0),average=sum/terms.length,basis=definition.basis?clone(records.reynolds.order.invariants.find(x=>x.id===definition.basis)):null;
 const primitive=basis?basis.terms.reduce((s,t)=>s+t.coefficient*v.reduce((a,x,i)=>a*x**t.powers[i],1),0):0,c=Number(coefficient),primitiveCoefficient=definition.normalization?c/definition.normalization:0;
 return{seed,eta,coefficient:c,vector:v,definition:clone(definition),terms,sum,average,basis,primitive,primitiveCoefficient,energy:c*average,primitiveEnergy:primitiveCoefficient*primitive};
}
/** Energies are for the six parent-orbit vectors at fixed radius. */
export function orderFieldReference(field='on'){
 choice(field,['off','on']);const r=clone(records[field==='on'?'field':'fieldZero']),fieldVector=[r.parameters.fieldX,0,0];
 return{record:r,field:fieldVector,rows:r.order.domains.map(d=>{const fieldEnergy=-dot(fieldVector,d.vector);return{vector:d.vector,F0:d.energy-fieldEnergy,fieldEnergy,F:d.energy};})};
}
export function orderConventionReference(operation='1'){
 const r=clone(records.convention),op=opById(r,operation),Q=r.order.convention.rotation,Qt=tr(Q),eta=r.order.vector,field=[r.parameters.fieldX,0,0],etaPrime=mv(Qt,eta),fieldPrime=mv(Qt,field),matrixPrime=mm(mm(Qt,op.matrix),Q),left=mv(matrixPrime,etaPrime),right=mv(Qt,mv(op.matrix,eta));
 const near=(a,b)=>a.every((x,i)=>Math.abs(x-b[i])<1e-12),count=(operations,v,h)=>{
  const fixed=operations.filter(g=>near(mv(g,v),v)),fieldFixed=operations.filter(g=>near(mv(g,h),h)),intersection=fieldFixed.filter(g=>near(mv(g,v),v)),orbit=[];
  for(const g of fieldFixed){const image=mv(g,v);if(!orbit.some(x=>near(x,image)))orbit.push(image);}
  return{group:operations.length,state:fixed.length,field:fieldFixed.length,intersection:intersection.length,fieldOrbit:orbit.length};
 };
 const originalMatrices=r.order.operations.map(g=>g.matrix),newMatrices=originalMatrices.map(g=>mm(mm(Qt,g),Q)),counts=count(originalMatrices,eta,field),transformedCounts=count(newMatrices,etaPrime,fieldPrime);
 const naiveEnergy=r.order.invariants.reduce((sum,b)=>sum+b.coefficient*b.terms.reduce((s,t)=>s+t.coefficient*etaPrime.reduce((v,x,i)=>v*x**t.powers[i],1),0),0)-dot(fieldPrime,etaPrime);
 return{record:r,operation:op,Q,eta,field,etaPrime,fieldPrime,matrixPrime,left,right,counts,transformedCounts,naiveEnergy,fieldEnergy:-dot(field,eta),fieldEnergyPrime:-dot(fieldPrime,etaPrime)};
}
/** Complete supported inputs only; copying never starts Python. */
export function orderActionsLabRequest(lessonId,state={}){
 if(!own(ORDER_ACTIONS_BRIDGE_HOOKS,lessonId))throw Error('Unknown order action lesson.');
 let input;
 if(lessonId==='order-isotropy'){choice(state.case??'axis',['axis','zero']);input=clone(records[state.case??'axis'].input);}
 else if(lessonId==='order-invariants'){
  const r=orderReynoldsReference(state);if(!r.basis)return null;
  input={...clone(records.reynolds.input),etaX:r.vector[0],etaY:r.vector[1],etaZ:0,a2:0,b4:0,c4:0,d6:0,e6:0,f6:0,fieldX:0};input[r.basis.id]=r.primitiveCoefficient;
 }else{choice(state.stage??'field',['field','coordinates']);choice(state.field??'on',['off','on']);input=clone(records[state.stage==='coordinates'?'convention':state.field==='off'?'fieldZero':'field'].input);}
 return{action:'order_parameter_lab',module:'order',input};
}
const questionData={
 'order-isotropy':[
  {prompt:"Predict: how many distinct vectors do 48 operations produce from a cubic polar state along a coordinate axis?",answer:'six',options:[['six',"Six; each equal-image bucket contains eight operations"],['fortyeight',"Forty-eight; every operation produces a new state"],['eight',"Eight; the stabilizer order is the domain count"]],feedback:{six:"Correct. Combining equal images gives six vectors: 48/8=6.",fortyeight:"Different operations can produce the same vector. Combine equal-image buckets before counting the orbit.",eight:"Eight counts operations that retain the current vector; the orbit size is 48/8."}},
  {prompt:"Counterexample: what follows when the order parameter is the zero vector?",answer:'full',options:[['full',"All forty-eight operations retain the zero vector"],['six',"Six distinct domains remain"],['minimum',"The zero vector must minimize the free energy"]],feedback:{full:"Correct. Every linear operation maps zero to zero, so its stabilizer is the full parent group. This does not establish an energy minimum.",six:"Every image of zero is identical, so the orbit contains one vector.",minimum:"The stabilizer test asks whether an operation retains the specified vector. Energy minimization is a separate calculation."}}
 ],
 'order-invariants':[
  {prompt:"Predict: what is the C4v Reynolds average of x²?",answer:'half',options:[['half','(x²+y²)/2'],['sum','x²+y²'],['x','x²']],feedback:{half:"Correct. Four of the eight terms are x² and four are y². Dividing by the group order eight gives the factor one-half.",sum:"This is the primitive integer-coefficient basis I. The normalized group average also carries 1/2.",x:"A fourfold rotation interchanges x² and y². The polynomial x² alone is not invariant under this group."}},
  {prompt:"If the invariant basis changes from R to I=2R, how must its coefficient c change?",answer:'inverse',options:[['inverse',"Use c/2 to preserve the same free energy"],['same',"Keep c; the energy is unchanged"],['double',"Use 2c"]],feedback:{inverse:"Correct. cR=(c/2)I. The basis and coefficient scale reciprocally to preserve the numerical energy.",same:"If I=2R and the coefficient is unchanged, this energy term doubles. Group symmetry does not automatically adjust the coefficient.",double:"Doubling both the basis and coefficient quadruples the energy. They must scale reciprocally."}}
 ],
 'order-field-convention':[
  {prompt:"Predict: at h=0.3 x̂, which fixed-radius domain has lower energy, +x or −x?",answer:'plus',options:[['plus',"The +x domain; its field term is −0.3"],['minus',"The −x domain; its field term is −0.3"],['equal',"Equal energy; they belong to the same parent-group orbit"]],feedback:{plus:"Correct. For +x the field term is −0.3 and the total is −0.2; for −x the field term is +0.3 and the total is 0.4.",minus:"The field term is −h·η. The opposite domain has a negative dot product and therefore a positive field energy.",equal:"The parent group gives equal zero-field energies. A fixed field retains a smaller group, and −h·η distinguishes directions within the parent orbit."}},
  {prompt:"After a passive 37° basis change, how do you evaluate the free energy of the same physical state?",answer:'joint',options:[['joint',"Transform η, h, and the operation matrices together; use F′(η′)=F(Qη′)"],['bare',"Insert the new coordinates directly into the original anisotropic polynomial"],['etaonly',"Rotate only η, keeping the field and operation matrices fixed"]],feedback:{joint:"Correct. Coordinates, field, and representation matrices change basis together, preserving energy and the covariance of the group action.",bare:"The coordinate expression of the anisotropic polynomial must also transform. Inserting new components into the unchanged polynomial generally describes another physical state.",etaonly:"Changing η while retaining the field and crystal axes changes the physical direction; it does not rewrite the same state in new coordinates."}}
 ]
};
const initial=()=>({open:false,case:'axis',operation:'1',seed:'x2',eta:'axis',coefficient:'2',stage:'field',field:'on',revealed:0,choices:['',''],checked:[false,false],note:'',native:{},copyOutcome:''});
const stateFrom=(value,id)=>{
 const s=initial(),q=value&&typeof value==='object'?value:{};
 for(const [key,values]of Object.entries({case:['axis','zero'],operation:records.axis.order.operations.map(g=>String(g.id)),seed:['x2','xy','x4'],eta:['axis','diagonal','zero'],coefficient:['-2','2'],stage:['field','coordinates'],field:['off','on'],copyOutcome:['','success','error']}))if(values.includes(q[key]))s[key]=q[key];
 s.open=q.open===true;s.revealed=Number.isInteger(q.revealed)&&q.revealed>=0&&q.revealed<=3?q.revealed:0;s.note=typeof q.note==='string'?q.note.slice(0,2000):'';
 s.native={operations:q.native?.operations===true};s.choices=questionData[id].map((question,i)=>question.options.some(([v])=>v===q.choices?.[i])?q.choices[i]:'');s.checked=s.choices.map((v,i)=>!!v&&q.checked?.[i]===true);return s;
};
const titles={'order-isotropy':"From parent-group operations to an orbit and stabilizer",'order-invariants':"Average polynomials and track their normalization",'order-field-convention':"Separate field selection of domains from coordinate changes"};
const optionHTML=(options,value)=>options.map(([key,label])=>'<option value="'+esc(key)+'"'+(String(value)===String(key)?' selected':'')+'>'+esc(label)+'</option>').join('');
const select=(prefix,key,label,options,value)=>'<label for="'+prefix+'-'+key+'">'+esc(label)+'<select id="'+prefix+'-'+key+'">'+optionHTML(options,value)+'</select></label>';
const native=(prefix,key,label,content,s)=>'<details data-oab-native="'+key+'"'+(s.native[key]?' open':'')+'><summary>'+esc(label)+'</summary>'+content+'</details>';
const opsOptions=r=>r.order.operations.map(op=>[String(op.id),'g'+op.id]);
const seedTeX=r=>r.powers.map((n,i)=>n?(i?'y':'x')+(n===1?'':'^{'+n+'}'):'').join('')||'1';
function isotropyOutput(s){
 const r=orderIsotropyReference(s.case,s.operation),a=r.record.order,op=r.operation;
 let out=h("Step one: apply the matrix row by row")+formula('D(g_{'+op.id+'})\\eta='+matrix(op.matrix)+vector(a.vector)+'='+vector(op.image));
 out+=table("Row dot products for the selected operation",["Matrix row","Three products","Row sum"],r.products.map((row,i)=>[String(i+1),row.map(fmt).join(' + '),fmt(op.image[i])]))+p(op.retained?"This operation retains the current order parameter and belongs to its stabilizer.":"This operation changes the current order parameter and is outside its stabilizer.");
 if(s.revealed>=2){out+=h("Step two: group equal images into buckets")+table("Equal-image buckets of the actual 48 operations",["Order-parameter image","Operation count","Operation identifiers"],r.buckets.map(b=>[inline(vector(b.vector)),String(b.operations.length),'<span data-math-ignore>'+b.operations.map(x=>'g'+x).join(', ')+'</span>']));
  out+=native('', 'operations',"Show all forty-eight actual matrices and images",table("Actual production operation table",["Operation","Matrix","Image","Retains this state"],a.operations.map(g=>[operationLabel(g),inline(matrix(g.matrix)),inline(vector(g.image)),g.retained?"yes":"no"])),s);
 }
 if(s.revealed>=3)out+=h("Step three: apply the orbit–stabilizer theorem")+formula('|G|=48,\\quad |H_\\eta|='+a.stabilizerOrder+',\\quad |G\\eta|=\\frac{48}{'+a.stabilizerOrder+'}='+r.buckets.length)+p("This reference uses a polar order parameter. Inversion −I maps nonzero η to −η; an axial vector follows a different inversion rule.")+p("Counterexample: every image of zero coincides, giving a stabilizer of order 48. Specifying a direction defines its state symmetry without establishing a free-energy minimum.");
 return out;
}
function reynoldsOutput(s){
 const r=orderReynoldsReference(s),tex=seeds[s.seed].tex;
 let out=h("Step one: apply each operation to the same seed")+formula('f(x,y)='+tex+',\\quad \\eta='+vector(r.vector))+table("Eight-term direct average using the original C4v operations",["Operation","Matrix","Polynomial f(D(g)η)","Current value"],r.terms.map(t=>[operationLabel(t),inline(matrix(t.matrix)),inline((t.sign<0?'-':'')+seedTeX(t)),fmt(t.value)]));
 if(s.revealed>=2){const symbolic=s.seed==='xy'?'0':s.seed==='x2'?'\\frac{x^2+y^2}{2}':'\\frac{x^4+y^4}{2}';out+=h("Step two: retain the group-average factor 1/|G|")+formula('\\mathcal R[f]=\\frac1{8}\\sum_{g\\in C_{4v}} f(D(g)\\eta)='+symbolic)+formula('\\mathcal R[f](\\eta)=\\frac{'+fmt(r.sum)+'}{8}='+fmt(r.average))+p("These eight terms directly average the original core group operations. They illustrate the selected seed rather than define a separate invariant classifier.");}
 if(s.revealed>=3){out+=h("Step three: match the original experiment's integer-coefficient basis");
  if(r.basis)out+=formula('I=2\\mathcal R[f],\\quad c_{\\mathcal R}='+fmt(r.coefficient)+',\\quad c_I=\\frac{c_{\\mathcal R}}2='+fmt(r.primitiveCoefficient))+formula('c_{\\mathcal R}\\mathcal R[f]='+fmt(r.energy)+'=c_I I')+p("The original experiment removes the common factor and uses an integer-coefficient basis. Copying below transfers a one-term teaching model with the same energy, without determining equilibrium or global stability.");
  else out+=formula('\\mathcal R[xy]=0')+p("Counterexample: a mirror sends xy to −xy, so the average cancels. The zero polynomial cannot be an independent basis term and has no nonzero coefficient to copy.");
  out+=p("Counterexample: doubling the basis without halving its coefficient doubles this energy term. Symmetry constrains allowed forms without determining material coefficients.");
 }
 return out;
}
function fieldOutput(s){
 if(s.stage==='coordinates'){
  const r=orderConventionReference(s.operation),c=r.record.order.convention;
  let out=h("Step one: declare the physical state used for the coordinate comparison")+p("This switches to the separate original convention preset: η=(0.6,0.8,0.4), h=(0.2,0,0), and angle 37°. It does not re-minimize the six axial domains from the previous stage.")+formula('Q='+matrix(r.Q)+',\\quad \\eta^\\prime=Q^T\\eta='+vector(r.etaPrime)+',\\quad h^\\prime=Q^Th='+vector(r.fieldPrime));
  if(s.revealed>=2)out+=h("Step two: transform the selected operation matrix consistently")+formula('D^\\prime(g_{'+r.operation.id+'})=Q^TD(g_{'+r.operation.id+'})Q='+matrix(r.matrixPrime))+formula('D^\\prime(g)\\eta^\\prime='+vector(r.left)+'=Q^TD(g)\\eta')+p("A basis change rewrites the operation matrices, although some operation matrices can remain unchanged. Their action on the same physical vector remains consistent. All 48 original operations satisfy this relation.");
  if(s.revealed>=3)out+=h("Step three: rewrite the free energy in the new coordinates")+formula('F^\\prime(\\eta^\\prime)=F(Q\\eta^\\prime)='+fmt(c.energy)+'=F(\\eta)')+formula('-h^T\\eta='+fmt(r.fieldEnergy)+'=-(h^\\prime)^T\\eta^\\prime')+table("Group orders and orbit counts before and after a basis change of the same state",["Count","Original coordinates","New coordinates"],[['G',r.counts.group,r.transformedCounts.group],['H(η)',r.counts.state,r.transformedCounts.state],['G(h)',r.counts.field,r.transformedCounts.field],['H(η) ∩ G(h)',r.counts.intersection,r.transformedCounts.intersection],['G(h)η',r.counts.fieldOrbit,r.transformedCounts.fieldOrbit]].map(row=>row.map(String)))+p("Covariance residuals for every operation and the energy residual are below 2×10⁻¹², the check tolerance for this finite floating-point reference.")+p("Counterexample: even with the field correctly transformed, inserting the new components into the old anisotropic zero-field polynomial gives the different energy below.")+formula('F_{0,\\mathrm{old}}(\\eta^\\prime)-(h^\\prime)^T\\eta^\\prime='+fmt(r.naiveEnergy)+'\\ne '+fmt(c.energy))+p("The correct new function is F(Qη′). A passive basis change preserves the physical state; rotating the order parameter without the crystal axes and field changes that state.");
  return out;
 }
 const r=orderFieldReference(s.field),a=r.record.order;
 let out=h("Step one: list the parent orbit at fixed radius")+formula('\\|\\eta\\|=1,\\quad h='+vector(r.field)+',\\quad F=F_0-h^T\\eta')+p("Use the six axial vectors of the cubic parent group. The zero-field polynomial gives every vector the same F₀=0.1; only the field term changes.");
 if(s.revealed>=2)out+=h("Step two: account for each domain without re-optimizing its amplitude")+table("Dimensionless energy ledger for the six fixed orbit vectors",["Fixed domain vector",'F₀','−h·η','F'],r.rows.map(row=>[inline(vector(row.vector)),fmt(row.F0),fmt(row.fieldEnergy),fmt(row.F)]));
 if(s.revealed>=3)out+=h("Step three: distinguish the parent group, field-preserving group, and state stabilizer")+formula('|G|='+a.groupOrder+',\\quad |H_\\eta|='+a.stabilizerOrder+',\\quad |G_h|='+a.fieldGroupOrder+',\\quad |H_\\eta\\cap G_h|='+a.physicalStabilizerOrder)+formula('|G_h\\eta|='+a.fieldOrbitSize)+p("The field separates the energies of parent-equivalent directions. The lowest table entry is the minimum among these fixed vectors; equilibrium amplitude and direction still require free-energy minimization.")+p("Counterexample: at h=0 all six energies coincide again. This does not make −x and +x equal in a finite field. Switch to the joint 37° basis change to compare coordinate changes with physical field changes.");
 return out;
}
function bodyHTML(prefix,id,s,canCopy){
 let controls='';
 if(id==='order-isotropy')controls=select(prefix,'case',"Reference order parameter",[['axis',"Cubic polar state along an axis η=(0,0,1)"],['zero',"Counterexample: zero vector η=(0,0,0)"]],s.case)+select(prefix,'operation',"Select an actual group operation",opsOptions(records.axis),s.operation);
 if(id==='order-invariants')controls=select(prefix,'seed',"Polynomial seed",[['x2','x²'],['xy',"xy: cancellation counterexample"],['x4','x⁴']],s.seed)+select(prefix,'eta',"Fixed vector to evaluate",[['axis','(1,0)'],['diagonal','(1,1)'],['zero','(0,0)']],s.eta)+select(prefix,'coefficient',"Coefficient of the averaged basis",[['2','c = 2'],['-2','c = −2']],s.coefficient);
 if(id==='order-field-convention')controls=select(prefix,'stage',"Physical comparison",[['field',"Field-energy ledger for six fixed domains"],['coordinates',"Separate reference: joint 37° basis change"]],s.stage)+select(prefix,'field',"Field for the axial-domain ledger",[['on','h=(0.3,0,0)'],['off',"Counterexample: h=(0,0,0)"]],s.field)+select(prefix,'operation',"Actual operation to track through the basis change",opsOptions(records.convention),s.operation);
 return p("Predict, then reveal the steps. All matrices and fixed references correspond to real inputs of the original experiment. This card does not start a calculation automatically.")+'<div class="oab-controls">'+controls+'</div>'+questionData[id].map((q,i)=>'<section class="oab-question"><label for="'+prefix+'-q'+i+'">'+esc(q.prompt)+'<select id="'+prefix+'-q'+i+'">'+optionHTML([['',"Choose a prediction"],...q.options],s.choices[i])+'</select></label><button id="'+prefix+'-check'+i+"\" type=\"button\">Check this answer</button><p id=\""+prefix+'-feedback'+i+'" class="oab-feedback" aria-live="polite"></p></section>').join('')+'<div class="oab-buttons"><button id="'+prefix+'-observe" type="button">'+esc("Reveal step one")+'</button><button id="'+prefix+'-next" type="button">'+esc("Reveal the next step")+'</button></div><div id="'+prefix+'-output" class="oab-output"></div><label for="'+prefix+'-note">'+esc("My derivation and unresolved questions")+'<textarea id="'+prefix+'-note" maxlength="2000" rows="3">'+esc(s.note)+'</textarea></label>'+p("Predictions, notes, and disclosure state are retained only in this page's memory.")+'<div class="oab-buttons">'+(canCopy?'<button id="'+prefix+'-copy" type="button">'+esc("Copy this reference to the original experiment")+'</button>':'')+'<button id="'+prefix+'-reset" type="button">'+esc("Reset this action card")+'</button></div><p id="'+prefix+'-copy-description"></p><p id="'+prefix+'-copy-status" aria-live="polite"></p><p class="oab-source">'+esc("Reference source: the original Oh / C4v matrices, orbits, invariants, and convention presets of order_parameter_lab. These finite references do not start calculations or write learning scores.")+'</p>';
}
export function orderActionsBridgeHTML(lessonId){
 if(!own(ORDER_ACTIONS_BRIDGE_HOOKS,lessonId))return'';
 const prefix='oab-'+lessonId;
 return'<details class="oab-card" id="'+prefix+'"><summary>'+esc(titles[lessonId])+'</summary><div id="'+prefix+'-body"></div></details>';
}
const owners=new WeakMap();
const isOpen=detail=>typeof detail.open==='boolean'?detail.open:detail.getAttribute('open')!==null;
export function bindOrderActionsBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 if(!root||!own(ORDER_ACTIONS_BRIDGE_HOOKS,lessonId)){const no=()=>{};no.snapshot=()=>({});return no;}
 const key='oab:'+lessonId,prefix='oab-'+lessonId,token={},s=stateFrom(stateStore.get(key),lessonId);owners.set(root,token);
 let alive=true,ticket=0,busy=false;const detail=root.querySelector('#'+prefix),body=root.querySelector('#'+prefix+'-body'),$=name=>body?.querySelector('#'+prefix+'-'+name);
 const owned=()=>alive&&owners.get(root)===token&&root.isConnected!==false&&root.querySelector('#'+prefix)===detail&&root.querySelector('#'+prefix+'-body')===body;
 const current=()=>owned()&&isCurrent();
 const save=()=>{if(owned())stateStore.set(key,clone(s));};
 function capture(){if(!owned()||!body)return;if(detail)s.open=isOpen(detail);for(const field of ['case','operation','seed','eta','coefficient','stage','field'])if($(field))s[field]=$(field).value;for(let i=0;i<2;i++)if($('q'+i)){if(s.choices[i]!==$('q'+i).value)s.checked[i]=false;s.choices[i]=$('q'+i).value;}if($('note'))s.note=String($('note').value).slice(0,2000);for(const d of body.querySelectorAll('[data-oab-native]'))s.native[d.dataset.oabNative]=isOpen(d);save();}
 function update(){
  if(!current())return;capture();
  const signature=JSON.stringify([s.case,s.operation,s.seed,s.eta,s.coefficient,s.stage,s.field,s.revealed]);
  if($('output').dataset.oabSignature!==signature){$('output').innerHTML=s.revealed?(lessonId==='order-isotropy'?isotropyOutput(s):lessonId==='order-invariants'?reynoldsOutput(s):fieldOutput(s)):p("Choose a prediction before revealing operations and the ledger. After changing the physical reference, reveal the steps again; notes and unsubmitted predictions remain.");$('output').dataset.oabSignature=signature;}
  for(const d of $('output').querySelectorAll('[data-oab-native]')){if(s.native[d.dataset.oabNative])d.open=true;d.ontoggle=()=>{if(current()&&$('output').querySelector('[data-oab-native="'+d.dataset.oabNative+'"]')===d){s.native[d.dataset.oabNative]=isOpen(d);save();}};}
  $('observe').disabled=!s.choices[0];$('next').disabled=!s.revealed||s.revealed>=3;
  for(let i=0;i<2;i++){const q=questionData[lessonId][i],f=$('feedback'+i);$('check'+i).disabled=!s.choices[i]||!s.revealed;f.textContent=s.checked[i]?(q.feedback[s.choices[i]]||''):'';f.setAttribute('class','oab-feedback'+(s.checked[i]?(s.choices[i]===q.answer?' oab-correct':' oab-retry'):''));}
  const request=orderActionsLabRequest(lessonId,s);if($('copy'))$('copy').disabled=busy||!request;
  $('copy-description').textContent=!request?"The selected seed averages to zero, so no independent nonzero term can be copied.":lessonId==='order-invariants'?"Copy the complete one-term teaching model with coefficient c/2 for the integer-coefficient basis. Review the input in the original experiment and run it manually.":lessonId==='order-field-convention'&&s.stage==='coordinates'?"Copy the complete original convention preset: η=(0.6,0.8,0.4), h=(0.2,0,0), and 37°. Run it manually in the original experiment.":"Copy the complete input of the current fixed reference above. Review the parameters in the original experiment and run it manually.";
  $('copy-status').textContent=s.copyOutcome==='success'?"Input copied. Review the parameters in the original experiment and run it manually.":s.copyOutcome==='error'?"The input was not copied. You can try again.":'';
  if($('field'))$('field').disabled=s.stage==='coordinates';if($('operation')&&lessonId==='order-field-convention')$('operation').disabled=s.stage!=='coordinates';save();
 }
 function draw(){
  if(!current()||!body)return;body.innerHTML=bodyHTML(prefix,lessonId,s,typeof onOpenLab==='function');
  const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();action(node);update();};};
  for(const field of ['case','operation','seed','eta','coefficient','stage','field'])bind(field,'onchange',()=>{ticket++;busy=false;s.checked=[false,false];s.copyOutcome='';if(field!=='operation')s.revealed=0;});
  for(let i=0;i<2;i++){bind('q'+i,'onchange',()=>{s.checked[i]=false;});bind('check'+i,'onclick',()=>{s.checked[i]=true;});}
  bind('observe','onclick',()=>{s.revealed=1;s.checked=[false,false];});bind('next','onclick',()=>{s.revealed=Math.min(3,s.revealed+1);});
  const note=$('note');note.oninput=()=>{if(current()&&$('note')===note){s.note=String(note.value).slice(0,2000);save();}};
  bind('reset','onclick',()=>{ticket++;busy=false;const open=s.open;Object.assign(s,initial(),{open});draw();$('q0')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy)copy.onclick=async()=>{
   if(!current()||$('copy')!==copy||busy||copy.disabled)return;capture();const request=orderActionsLabRequest(lessonId,s);if(!request)return;const job=++ticket;busy=true;s.copyOutcome='';copy.disabled=true;$('copy-status').textContent='';save();
   try{const accepted=await onOpenLab(clone(request));if(current()&&job===ticket){if(accepted===false)throw Error('Input was not accepted.');s.copyOutcome='success';update();}}
   catch(error){if(current()&&job===ticket){s.copyOutcome='error';update();}}
   finally{if(job===ticket){busy=false;if(current()&&$('copy')===copy)copy.disabled=!orderActionsLabRequest(lessonId,s);}}
  };
  update();
 }
 if(detail&&body){if(s.open){detail.open=true;detail.setAttribute?.('open','');}detail.ontoggle=()=>{if(current()){s.open=isOpen(detail);save();}};draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;if(owners.get(root)!==token)return;if(detail)detail.ontoggle=null;if(body)for(const tag of ['button','select','input','textarea','details'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;node.ontoggle=null;}};
 cleanup.snapshot=()=>{capture();return{[ORDER_ACTIONS_BRIDGE_HOOKS[lessonId][0]]:clone(s)};};return cleanup;
}
