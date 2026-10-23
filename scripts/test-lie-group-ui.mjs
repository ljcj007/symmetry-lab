import assert from 'node:assert/strict';

// Exercise production event handlers with an inert DOM. No browser or math
// implementation is substituted for the Python engine: its supplied output is
// used solely to verify rendering, API payloads and asynchronous isolation.
const fixture={sources:[{id:'fixture',title:'Fixture source',url:'https://example.org/lecture'}],lessons:[{id:'fixture',title:'01 · Fixture lesson',summary:'Fixture introduction',objectives:['Objective'],sections:[{title:'Section',paragraphs:['Original text'],formula:'U = exp(−iθT)'}],example:{title:'Worked example',steps:['First step','Second step','Third step'],result:'Conclusion'},pitfall:'Pitfall',references:[{sourceId:'fixture'}],lab:'su2',quiz:Array.from({length:8},(_,i)=>({question:`Question ${i}`,choices:['Correct','Incorrect'],answer:0,explanation:'Fixture explanation'}))}]};
const response=()=>({ok:true,json:async()=>fixture});
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element{
  constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [name,value] of Object.entries(attributes))if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=value;this.value=attributes.value||'';this.checked=attributes.checked!==undefined;}
  get isConnected(){return !!this.parentNode&&this.parentNode.isConnected!==false;}
  set innerHTML(value){
    for(const child of this.children)child.parentNode=null;this.html=value;this.children=[];const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link','source','wbr','area','base','col','embed','param','track']);
    for(const match of value.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){const tag=match[2].toLowerCase();if(match[1]){while(stack.length>1){const closed=stack.pop();if(closed.tag===tag)break;}continue;}const attributes={};for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[attr[1]]=attr[2]??'';const parent=stack.at(-1),child=new Element(tag,attributes,parent);parent.children.push(child);if(!voidTags.has(tag)&&!match[3].endsWith('/'))stack.push(child);}
    for(const select of this.querySelectorAll('select')){const options=select.querySelectorAll('option');select.value=(options.find(item=>Object.hasOwn(item.attributes,'selected'))||options[0])?.value||'';}
  }
  get innerHTML(){return this.html||'';}
  matches(selector){if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const match=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!match&&(!match[1]||match[1]===this.tag)&&Object.hasOwn(this.attributes,match[2])&&(match[3]===undefined||this.attributes[match[2]]===match[3]);}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){}scrollIntoView(){}
}
class Container{constructor(){this.isConnected=true;}set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=value;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}}
const $=(container,selector)=>container.firstElementChild.querySelector(selector);
const submit=container=>$(container,'#lg-lab-form').onsubmit({preventDefault(){}});
const experiment=(container,id)=>container.firstElementChild.querySelectorAll('[data-lg-experiment]').find(button=>button.dataset.lgExperiment===id).onclick();
const c=(re,im=0)=>({re,im});
const su2={lab:'lie',experiment:'su2',group:'su2',title:'SU(2) fixture',generatorConvention:'U = exp(−iθσ/2)',generatorLabel:'T3 = σz/2',matrix:[[c(-1),c(0)],[c(0),c(-1)]],generatorMatrix:[[c(.5),c(0)],[c(0),c(-.5)]],initialState:[c(1),c(0)],state:[c(-1),c(0)],probabilities:[1,0],blochVector:[0,0,1],overlap:c(-1),determinant:c(1),residuals:{norm:0,unitarity:2e-16,determinant:0},periodExplanation:'矩阵经过 4π 恢复。',notes:['整体相位与射线不同。']};
const su3={...su2,experiment:'su3',group:'su3',title:'SU(3) fixture',generatorLabel:'T8',matrix:[[c(1),c(0),c(0)],[c(0),c(1),c(0)],[c(0),c(0),c(1)]],generatorMatrix:[[c(.5),c(0),c(0)],[c(0),c(-.5),c(0)],[c(0),c(0),c(0)]],initialState:[c(1),c(0),c(0)],state:[c(1),c(0),c(0)],probabilities:[1,0,0],cartanWeights:[{label:'e1',weight:[.5,1/(2*Math.sqrt(3))]},{label:'e2',weight:[-.5,1/(2*Math.sqrt(3))]},{label:'e3',weight:[0,-1/Math.sqrt(3)]}],cartanExpectation:[.5,1/(2*Math.sqrt(3))],periodExplanation:'T₈ 的矩阵周期是 4π√3。'};
const commutator={lab:'lie',experiment:'commutator',group:'su3',title:'Commutator fixture',generatorConvention:'T = λ/2',generatorA:su3.matrix,generatorB:su3.matrix,commutator:su3.matrix,expansion:'[T4,T5] = i(0.5T3 + 0.866025T8)',commutatorNorm:1,residuals:{closure:1e-16,antiHermitian:0,coefficientImaginary:0},notes:['Fixture note']};

globalThis.localStorage={getItem:()=>'{bad',setItem:()=>{}};
const pendingFetch=[];globalThis.fetch=url=>new Promise(resolve=>pendingFetch.push({url,resolve}));
const race=await import('../dist/lie-group-ui.js?race');assert.equal(race.getLieGroupResult(),null);
const detached=new Container(),loading=race.renderLieGroupView({container:detached});assert.equal(pendingFetch.length,1);assert.match(pendingFetch[0].url,/lie-group-lessons.json\?v=20261023-lie1/);
const detachedRoot=detached.firstElementChild,loadingHTML=detachedRoot.innerHTML;detached.isConnected=false;assert.equal(detachedRoot.parentNode,detached,'Hub detaches the whole container, not its root');pendingFetch[0].resolve(response());await loading;
assert.equal(detachedRoot.innerHTML,loadingHTML,'Detached course containers must not render a late loader result');

globalThis.fetch=async()=>({ok:false,status:503});
const retry=await import('../dist/lie-group-ui.js?retry'),retryContainer=new Container();await retry.renderLieGroupView({container:retryContainer});assert.match(retryContainer.firstElementChild.innerHTML,/503/);const retryButton=$(retryContainer,'#lg-retry');let fetches=0;globalThis.fetch=async()=>{fetches++;return response();};await retryButton.onclick();assert.equal(fetches,1,'Retry clears a rejected cached promise');assert.ok($(retryContainer,'#lg-tab-learn'));retryButton.onclick();assert.equal(fetches,1,'Detached retry handlers cannot restart a loaded course');

globalThis.fetch=async()=>response();
for(const [index,saved] of ['null','[]','"bad"','12','{bad'].entries()){
  globalThis.localStorage={getItem:()=>saved,setItem:()=>{}};const module=await import(`../dist/lie-group-ui.js?malformed-${index}`),page=new Container();await module.renderLieGroupView({container:page});$(page,'#lg-tab-quiz').onclick();assert.match($(page,'#lg-content').innerHTML,/<strong>0<small> \/ 8<\/small>/);
}
let savedKey,savedProgress;
globalThis.localStorage={getItem:()=>JSON.stringify({'fixture:0':{selected:0,checked:true},'fixture:1':{selected:'0',checked:true},'fixture:2':{selected:0,checked:'true'},'fixture:3':{selected:10,checked:true},'fixture:4':{selected:-1,checked:true},'fixture:5':{selected:.5,checked:true},'fixture:6':{selected:0,checked:false},'fixture:7':{selected:1,checked:true},'unknown:0':{selected:0,checked:true}}),setItem:(key,value)=>{savedKey=key;savedProgress=JSON.parse(value);}};
const progress=await import('../dist/lie-group-ui.js?progress'),progressPage=new Container();await progress.renderLieGroupView({container:progressPage});$(progressPage,'#lg-tab-quiz').onclick();assert.match($(progressPage,'#lg-content').innerHTML,/<strong>1<small> \/ 8<\/small>/);const answers=progressPage.firstElementChild.querySelectorAll('[data-lg-answer]');answers[1].onchange();assert.equal(savedKey,'symmetry-lab.lie.progress.v1');assert.deepEqual(Object.keys(savedProgress).sort(),['fixture:0','fixture:6','fixture:7']);assert.deepEqual(savedProgress['fixture:0'],{selected:1,checked:false});assert.match($(progressPage,'#lg-content').innerHTML,/<strong>0<small> \/ 8<\/small>/,'Changing a correct answer removes its checked status');
progressPage.firstElementChild.querySelectorAll('[data-lg-answer]')[0].onchange();progressPage.firstElementChild.querySelectorAll('[data-lg-check]')[0].onclick();assert.match($(progressPage,'#lg-content').innerHTML,/判断正确/);assert.match($(progressPage,'#lg-content').innerHTML,/<strong>1<small> \/ 8<\/small>/);

globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const module=await import('../dist/lie-group-ui.js?experiments'),page=new Container(),calls=[],downloads=[];let reply=su2;
await module.renderLieGroupView({container:page,run:async(api,payload)=>{calls.push({api,payload});return reply;},download:(content,name)=>downloads.push({content:JSON.parse(content),name})});
const lessonNav=$(page,'.lg-lesson-nav');assert.ok(lessonNav.querySelectorAll('[data-lg-lesson]').length);assert.doesNotMatch($(page,'#lg-content').innerHTML,/<span>01 · Fixture lesson<\/span>/,'Sidebar titles omit the data prefix beside their own index');assert.match($(page,'#lg-content').innerHTML,/<h2>01 · Fixture lesson<\/h2>/,'The full lesson heading retains its number');
$(page,'#lg-tab-lab').onclick();await page.firstElementChild.querySelectorAll('[data-lg-preset]').find(button=>button.dataset.lgPreset==='720').onclick();assert.equal(calls[0].api,'teaching_labs');assert.deepEqual(calls[0].payload,{lab:'lie',experiment:'su2',axis:'z',state:'plus',angle:4*Math.PI});assert.match($(page,'#lg-lab-output').innerHTML,/Bloch 球|2\.00e-16/);$(page,'#lg-export').onclick();assert.equal(downloads[0].name,'lie-group-su2.json');assert.deepEqual(downloads[0].content.experiment.input,calls[0].payload);assert.deepEqual(downloads[0].content.sources,fixture.sources);
$(page,'#lg-angle').value='2000';await submit(page);assert.equal(calls.length,1,'An invalid angle must never reach Python');assert.match($(page,'#lg-lab-output').innerHTML,/范围内的有效参数/);assert.equal(module.getLieGroupResult().experiment,null);
$(page,'#lg-angle').value='-30';reply={...su2,blochVector:[Math.sqrt(3)/2,-.5,0]};await submit(page);const circles=$(page,'#lg-lab-output').querySelectorAll('circle'),tip=circles.find(element=>element.attributes.fill==='#bd823a');assert.ok(Math.hypot(Number(tip.attributes.cx)-190,Number(tip.attributes.cy)-165)<=115+1e-10,'An orthographic projection cannot place a unit Bloch vector outside its sphere');
$(page,'#lg-angle').value='60';$(page,'#lg-angle').oninput();assert.equal(module.getLieGroupResult().experiment,null,'Editing inputs invalidates the previous export');

experiment(page,'su3');reply=su3;await $(page,'#lg-center-preset').onclick();const center=calls.at(-1).payload;assert.equal(center.generator,8);assert.equal(center.state,1);assert.ok(Math.abs(center.angle-4*Math.PI*Math.sqrt(3)/3)<1e-12);assert.match($(page,'#lg-lab-output').innerHTML,/Cartan|不是三维空间旋转/);assert.match($(page,'#lg-content').innerHTML,/415.692/);const polygon=$(page,'#lg-lab-output').querySelector('polygon'),points=polygon.attributes.points.split(' ').map(p=>p.split(',').map(Number)),lengths=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%3][0],p[1]-points[(i+1)%3][1]));assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-10,'Equal Cartan-axis scales preserve the equilateral weight diagram');
await $(page,'#lg-period-preset').onclick();assert.equal(calls.at(-1).payload.generator,8);assert.ok(Math.abs(calls.at(-1).payload.angle-4*Math.PI*Math.sqrt(3))<1e-12,'The T8 full-period preset fits the Python-supported angle range');
experiment(page,'commutator');$(page,'#lg-group').value='su3';$(page,'#lg-group').onchange();assert.equal($(page,'#lg-a').querySelectorAll('option').length,8);$(page,'#lg-a').value='4';$(page,'#lg-b').value='5';reply=commutator;await submit(page);assert.deepEqual(calls.at(-1).payload,{lab:'lie',experiment:'commutator',group:'su3',a:4,b:5});assert.match($(page,'#lg-lab-output').innerHTML,/\[T4,T5\]/);
$(page,'#lg-tab-lab').onkeydown({key:'ArrowRight',preventDefault(){}});assert.ok($(page,'#lg-quiz-lesson'),'Keyboard tabs select and render the next panel');

const delayed=await import('../dist/lie-group-ui.js?delayed'),latePage=new Container();let resolveRun;
await delayed.renderLieGroupView({container:latePage,run:()=>new Promise(resolve=>{resolveRun=resolve;})});$(latePage,'#lg-tab-lab').onclick();const running=submit(latePage);assert.equal(typeof resolveRun,'function');$(latePage,'#lg-tab-quiz').onclick();resolveRun(su2);await running;assert.ok($(latePage,'#lg-quiz-lesson'));assert.equal(delayed.getLieGroupResult().experiment,null,'A late calculation must not enter exports after leaving the experiment');
$(latePage,'#lg-tab-lab').onclick();const detachedRun=submit(latePage);const priorRoot=latePage.firstElementChild;latePage.isConnected=false;const priorHTML=priorRoot.innerHTML;resolveRun(su2);await detachedRun;assert.equal(priorRoot.innerHTML,priorHTML,'Results must not redraw a detached hub child');assert.equal(delayed.getLieGroupResult().experiment,null);

const failed=await import('../dist/lie-group-ui.js?python-failure'),failurePage=new Container();await failed.renderLieGroupView({container:failurePage,run:async()=>{throw Error('<script>unsafe</script>');}});$(failurePage,'#lg-tab-lab').onclick();await submit(failurePage);assert.match($(failurePage,'#lg-lab-output').innerHTML,/&lt;script&gt;/);assert.doesNotMatch($(failurePage,'#lg-lab-output').innerHTML,/<script>/);
console.log('Lie UI: loader retry, detached hub races, validated independent progress, Python input contracts, presets, exports, parameter edits, projection geometry, keyboard navigation and escaped failures passed.');
