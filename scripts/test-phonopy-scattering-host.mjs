import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {Element,Container,flush} from './test-material-research-ui.mjs';
import {toolsIndex,knownTool,searchEntries} from '../dist/navigation-ui.js';
import {getToolCapability} from '../dist/tool-capabilities.js';
import {PROJECT_INPUT_TARGETS,projectInputFor,supportsProjectInput,getProjectInputTarget} from '../dist/project-input.js';
import {createProjectNavigator,prepareProjectNavigation} from '../dist/project-navigation.js';
import {parseClassroomRoute,withClassroomNavigationContext,isClassroomView} from '../dist/classroom-ui.js';
import * as scatteringUI from '../dist/phonopy-scattering-ui.js';

const clone=x=>structuredClone(x),json=x=>JSON.parse(JSON.stringify(x)),prevent={preventDefault(){}};
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/phonopy-scattering.json',import.meta.url),'utf8')),example=fixture.cases[0];
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const fromApp=name=>{const spec=app.match(new RegExp("from '(\\./"+name.replaceAll('.','\\.')+"[^']*)'"))?.[1];assert.ok(spec,name);return import(new URL('../dist/'+spec.slice(2),import.meta.url));};
const notebook=await fromApp('material-notebook.js'),handoff=await fromApp('phonopy-scattering-handoff.js');
const route='compute/phonopy-scattering',entry=knownTool(route),capability=getToolCapability(route);
const retainedToolRoutes=["compute/symmetry-audit","compute/statistics-lab","compute/topological-defects-lab","compute/shg-flagship","compute/chirality-polarity-lab","compute/reciprocity-lab","compute/manybody-spectra-lab","compute/dynamic-scattering-lab","compute/spin-resonance-lab","compute/atomic-spectra-lab","compute/phonons","compute/phonon-modes","compute/phonon-thermo","compute/qha-lab","compute/phonopy","compute/hall-response-lab","compute/electron-transport-lab","compute/shg-lab","compute/tensors","compute/layer-symmetry-lab","compute/wavevector-lab","compute/order-parameter-lab","compute/domain-wall-lab","compute/phase","compute/distortion-modes","compute/diffraction","structure","compute/lie/su2","compute/lie/su3","compute/lie/commutator","compute/lie/u1","compute/lie/representations","compute/lie/interferometer","compute/group-theorems","compute/symmetry-mini-demos","compute/foundations-demos","compute/band-representation-lab","workbench","compute/advanced/symbolic_spacegroups","compute/advanced/symbolic_interfaces","products","compute/lie/su2_coupling","compute/lie/su3_tensor","compute/lie/su3_cg","compute/lie/su3_racah","compute/lie/su3_ninej","compute/lie/rabi","compute/salc-lab","compute/nonsymmorphic-lab","compute/exchange-symmetry-lab","compute/conservation-lab","compute/polaron-lab","compute/density-matrix-lab","compute/symmetry-workshop","compute/manybody-spt-lab","compute/hubbard-cluster-lab","compute/andreev-lab","compute/device-transport-lab","compute/local-multiplet-lab","compute/crystal-field-lab","compute/quantum-geometry-lab","compute/pairing-lab","compute/unfold-lab","compute/band-connectivity","compute/magnon-lab","magnetictb","compute/advanced/symbolic","bands","crystkit","compute/advanced/carat","compute/advanced/carat_integral","compute/advanced/integral_normalizer","compute/advanced/arithmetic_centralizer","compute/advanced/crystkit_ext"];
assert.deepEqual(new Set(toolsIndex.filter(x=>x.route!==route).map(x=>x.route)),new Set(retainedToolRoutes),'Every one of the 74 previous routes remains available');
assert.equal(Object.keys(PROJECT_INPUT_TARGETS).length,34);assert.equal(toolsIndex.length,75);assert.equal(entry.category,'observables');
assert.ok(capability.inputFormats.some(row=>row.files.includes('qpoints.yaml')));assert.match(capability.conditions.join(' '),/64.*3N/);assert.match(capability.conditions.join(' '),/负 q.*时间反演/);
for(const query of ['Phonopy neutron','qpoints.yaml 中子','ZnO'])assert.ok(searchEntries(toolsIndex,query).some(x=>x.route===route),query);
assert.equal(getProjectInputTarget('phonopy_scattering',example.input).route,'#'+route);
for(const key of ['frequency_unit','length_unit','mass_unit','eigenvectorConvention','primitiveOrderConfirmed','qIndex','coherentLengths','scatteringLengthUnit','temperature','debyeWaller']){
 const missing=clone(example.input);delete missing[key];assert.equal(supportsProjectInput('phonopy_scattering',missing),false,'Do not silently supply missing '+key);
}
for(const change of [{unexposedParameter:1},{frequency_unit:'Hz'},{length_unit:'bohr'},{mass_unit:'kg'},{primitiveOrderConfirmed:'true'},{eigenvectorConvention:'cell-periodic'},{channel:'time-reversed'},{QCoordinates:'cartesian-without-2pi'},{debyeWaller:{mode:'generate'}},{debyeWaller:{mode:'provided',temperature:100,unit:'bohr^2',tensors:[]}}])assert.equal(supportsProjectInput('phonopy_scattering',{...example.input,...change}),false,JSON.stringify(change));
const noSource=clone(example.input);delete noSource.content;delete noSource.data;assert.equal(supportsProjectInput('phonopy_scattering',noSource),false);
const noMomentum=clone(example.input);delete noMomentum.G;delete noMomentum.Q;assert.equal(supportsProjectInput('phonopy_scattering',noMomentum),false);

Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'classList',{configurable:true,get(){return {toggle(){},add(){},remove(){}};}});
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const rawFile=name=>fs.readFileSync(new URL('../dist/'+name,import.meta.url));
globalThis.fetch=async url=>{const raw=rawFile(String(url).split('?')[0]);return {ok:true,json:async()=>JSON.parse(raw.toString('utf8')),text:async()=>raw.toString('utf8'),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};};
async function restore(input){
 const page=new Container(),calls=[];const before=clone(input),cleanup=scatteringUI.renderPhonopyScatteringView({container:page,selection:{projectInput:{action:'phonopy_scattering',input}},stateStore:new Map(),run:async(action,value)=>{calls.push({action,input:clone(value)});throw Error('Input captured before invoking Python.');}});
 assert.equal(calls.length,0);assert.ok(page.querySelector('.project-input-notice'));
 await page.querySelector('#ps-form').onsubmit(prevent);assert.deepEqual(calls,[{action:'phonopy_scattering',input:before}]);assert.deepEqual(input,before);cleanup();
}
const aliases=clone(fixture.cases.find(c=>c.input.debyeWaller.mode==='provided').input);
Object.assign(aliases,{frequency_unit:String(aliases.frequency_unit).toLowerCase(),length_unit:'Å',mass_unit:'Da',scatteringLengthUnit:'FM',primitiveOrderConfirmed:false,scatteringLengthSource:'Declared values\r\nwith a retained source note.'});aliases.debyeWaller.unit='Å²';assert.equal(supportsProjectInput('phonopy_scattering',aliases),true);await restore(aliases);
const large={...clone(example.input),content:example.input.content+'\n# '+('x'.repeat(4_100_000))};
assert.equal(projectInputFor({projectInput:{action:'phonopy_scattering',input:large}},'phonopy_scattering',{}).status,'loaded','A complete 4+ MB raw file fits this new action');await restore(large);
assert.equal(projectInputFor({projectInput:{action:'phonon_thermo',input:{source:'mesh',content:large.content}}},'phonon_thermo',{}).status,'rejected','The old 4 MB editable boundary is unchanged');
assert.equal(projectInputFor({projectInput:{action:'phonopy_scattering',input:{...large,content:'x'.repeat(24*1024*1024)}}},'phonopy_scattering',{}).status,'rejected');
const wide={...clone(example.input)};delete wide.content;wide.data={values:Array(300000).fill(0)};
assert.equal(projectInputFor({projectInput:{action:'phonopy_scattering',input:wide}},'phonopy_scattering',{}).status,'loaded');wide.data={values:Array(850001).fill(0)};assert.equal(projectInputFor({projectInput:{action:'phonopy_scattering',input:wide}},'phonopy_scattering',{}).status,'rejected');

// The old importer transfers its last completed ORIGINAL request. It never
// manufactures a complete spectrum from the selected animation or edited text.
const old=await import('../dist/structure-dynamics-ui.js'),zno=JSON.parse(fs.readFileSync(new URL('./fixtures/phonopy-zno.json',import.meta.url),'utf8'));
const imported=new Container(),oldCalls=[];await old.renderStructureDynamicsView({container:imported,selection:{calculationOnly:true,experiment:'phonopy'},run:async(action,input)=>{oldCalls.push({action,input:clone(input)});return clone(zno.result);},download:()=>{}});
await imported.querySelector('#dyn-zno').onclick();assert.equal(oldCalls.length,0);await imported.querySelector('#dyn-form').onsubmit(prevent);
const original=clone(oldCalls[0].input),link=imported.querySelector('#dyn-scattering');assert.ok(link);imported.querySelector('#dyn-file-text').value='Unsubmitted edits';link.onclick(prevent);
const copied=handoff.phonopyScatteringVisit(route);assert.equal(copied.input.content,original.content);assert.equal(copied.input.structure_content,original.structure_content);assert.equal(copied.input.frequency_unit,original.frequency_unit);assert.equal(copied.input.qIndex,original.selected_q);assert.equal(copied.input.primitiveOrderConfirmed,false);
for(const key of ['amplitude','phase','supercell','selected_band','selection','eigenvectors','coherentLengths','mass_unit','length_unit'])assert.equal(Object.hasOwn(copied.input,key),false,key+' must not be inferred from animation');
const draftPage=new Container(),draftCalls=[],draftDispose=scatteringUI.renderPhonopyScatteringView({container:draftPage,selection:{importerInput:copied},stateStore:new Map(),run:(...args)=>draftCalls.push(args)});
assert.equal(draftPage.querySelector('#ps-content').value,original.content);assert.equal(draftPage.querySelector('#ps-structure_content').value,original.structure_content);assert.equal(draftPage.querySelector('#ps-primitiveOrderConfirmed').checked,false);assert.equal(draftCalls.length,0);draftDispose();
assert.equal(handoff.phonopyScatteringVisit(route),null,'A RAM draft is consumed once');handoff.setPhonopyScatteringInput(original);assert.equal(handoff.phonopyScatteringVisit('home'),null);assert.equal(handoff.phonopyScatteringVisit(route),null,'An unrelated visit retires an obsolete draft');
const oldLink=link.onclick;imported.innerHTML='<section>Another view owns this container.</section>';oldLink(prevent);assert.equal(handoff.phonopyScatteringVisit(route),null,'An obsolete importer result cannot install a draft');

// Execute the real route/render/capture/lifecycle functions with the real new UI.
const page=new Container();page.dataset={};page.innerHTML='';const shell={isConnected:true},nodes=new Map(['app','page-title','page-subtitle','export-top','view-context'].map(id=>[id,id==='app'?page:new Element('div',{id},shell)]));
globalThis.document.querySelector=s=>nodes.get(s.slice(1))||page.querySelector(s);
const state={view:'home',route:'home',primary:'home',courseRoute:null},location={hash:''},engine=[],historyWrites=[],loaded=[],projectNavigation=createProjectNavigator(),noop=()=>{};
const context={state,location,renderTicket:0,dictionaryController:null,renderedViewCleanup:null,URLSearchParams,structuredClone,Object,Promise,document:globalThis.document,projectNavigation,phonopyScatteringVisit:handoff.phonopyScatteringVisit,parseClassroomRoute,withClassroomNavigationContext,isClassroomView,labels:{home:['Home',''],['phonopy-scattering']:['Phonopy scattering','']},knownTool,esc:String,validateStructureHandoff:()=>null,$:s=>nodes.get(s.slice(1))||page.querySelector(s),$$:()=>[],history:{pushState:(x,t,url)=>{historyWrites.push(url);location.hash=url;},replaceState:(x,t,url)=>{historyWrites.push(url);location.hash=url;}},rememberRoute:noop,updateBreadcrumb:noop,optionalViews:{get:async key=>{loaded.push(key);assert.equal(key,'phonopyScattering');return scatteringUI;},peek:key=>key==='phonopyScattering'?scatteringUI:null},groupLoader:{peek:()=>true},databases:{},captureCalculation:notebook.captureCalculation,latestCalculationStatus:notebook.latestCalculationStatus,mathSourceText:n=>n?.textContent||'',executePythonTask:async(action,input)=>{engine.push({action,input:clone(input)});return clone(example.result);},toast:noop,download:noop,renderNavigationHub:async({container})=>{container.innerHTML='<section>Home owns the application.</section>';}};
const ast=parse(app,{ecmaVersion:'latest',sourceType:'module'});const functions=['runPythonTask','setView','clearRenderedView','retainRenderedViewCleanup','render'].map(name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n);return app.slice(n.start,n.end);}).join('\n');vm.createContext(context);vm.runInContext(functions,context);
const visit={kind:'project-calculation',targetRoute:route,action:'phonopy_scattering',mode:'current',source:{templateId:'custom',projectId:'record',stepId:'phonopy'},projectInput:{action:'phonopy_scattering',input:clone(example.input)}};
await context.setView(route,{projectContext:visit});assert.deepEqual(loaded,['phonopyScattering']);assert.equal(engine.length,0);assert.equal(typeof context.renderedViewCleanup,'function');assert.equal(state.view,'phonopy-scattering');assert.equal(state.primary,'compute');
await page.querySelector('#ps-form').onsubmit(prevent);await flush();assert.deepEqual(engine,[{action:'phonopy_scattering',input:example.input}]);assert.deepEqual(json(notebook.latestCalculation().input),json(example.input));assert.deepEqual(json(scatteringUI.getPhonopyScatteringResult().result),json(example.result));
assert.ok(historyWrites.every(url=>!url.includes('content')&&!url.includes('structure_content')),'Raw source never enters a URL');await context.setView('home');assert.match(page.firstElementChild.textContent,/Home owns/);assert.equal(scatteringUI.getPhonopyScatteringResult(),null);assert.equal(context.renderedViewCleanup,null);
let cancelled=0,rejectHeld;
context.executePythonTask=()=>{const owned=new Promise((resolve,reject)=>rejectHeld=reject);Object.defineProperty(owned,'cancel',{value:()=>{cancelled++;rejectHeld(Error('Only this request was cancelled.'));return true;}});return owned;};
await context.setView(route,{projectContext:visit});const pending=page.querySelector('#ps-form').onsubmit(prevent);await flush();assert.equal(cancelled,0);await context.setView('home');await pending;assert.equal(cancelled,1,'The new app branch retains the real UI disposer and cancels its scoped request');assert.equal(scatteringUI.getPhonopyScatteringResult(),null);assert.match(page.firstElementChild.textContent,/Home owns/);
const record=notebook.captureCalculation('phonopy_scattering',example.input,example.result,{route,material:'incorrect-background'});assert.ok(record);assert.notEqual(record.material,'incorrect-background');
assert.equal(Boolean(notebook.captureCalculation('phonopy_scattering',{...example.input,content:'x'.repeat(33*1024*1024)},example.result,{route})),false);assert.equal(notebook.latestCalculationStatus().available,false);assert.match(notebook.latestCalculationStatus().reason,/32 MiB/);
console.log('Phonopy scattering host passed: 75 discoverable tools, strict 34th adapter and unaltered old limits, aliases/full source restoration, actual importer-to-tool RAM draft, manual real app route/capture and cleanup, no inferred modes and no raw URL data.');
