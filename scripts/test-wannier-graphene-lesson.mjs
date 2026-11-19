import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Element,Container} from './test-material-research-ui.mjs';
import {createProjectNavigator} from '../dist/project-navigation.js';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {parseClassroomRoute,renderClassroomView}=await import(new URL('classroom-ui.js',edition));
const {renderMaterialResearchView}=await import(new URL('material-research-ui.js',edition));
const catalog=JSON.parse(readFileSync(new URL('data/material-research.json',edition),'utf8'));
const classroom='classroom/crystal?module=bands&tab=learn&lesson=band-crossing';
const atlas='atlas/research?material=graphene-wannier';
const modelCase='atlas/research?material=square-model';
const imports=[];
const fetchBefore=globalThis.fetch,documentBefore=globalThis.document,storageBefore=globalThis.localStorage;

Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
const focusBefore=Element.prototype.focus,insertBefore=Element.prototype.insertAdjacentHTML;
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.insertAdjacentHTML=function(position,markup){
 const fragment=new Element();
 fragment.innerHTML=markup;
 if(position==='afterbegin'){
  for(const child of fragment.children)child.parentNode=this;
  this.children.unshift(...fragment.children);
 }else{
  assert.equal(position,'afterend');
  const siblings=this.parentNode.children;
  for(const child of fragment.children)child.parentNode=this.parentNode;
  siblings.splice(siblings.indexOf(this)+1,0,...fragment.children);
 }
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('The exercise uses in-memory progress without marking course mastery')};
globalThis.fetch=async resource=>{
 const path=String(resource);
 imports.push(path);
 assert.equal(path.split('?')[0],'data/material-research.json');
 return {ok:true,json:async()=>structuredClone(catalog)};
};

const app=readFileSync(new URL('app.js',edition),'utf8').replaceAll('\r\n','\n');
const start=app.indexOf('function setView('),end=app.indexOf('\nfunction updateBreadcrumb(',start);
assert.ok(start>=0&&end>start);
const state={view:'home',route:'home',primary:'home'},shell={textContent:'',innerHTML:'',classList:{toggle(){}}};
const context={
 state,parseClassroomRoute,projectNavigation:createProjectNavigator(),URLSearchParams,
 location:{hash:''},history:{pushState(){},replaceState(){}},
 $:()=>shell,$$:()=>[],knownTool:()=>null,
 labels:{'material-research':['Material Research','']},esc:String,rememberRoute(){},updateBreadcrumb(){},
 validateStructureHandoff:value=>value,withClassroomNavigationContext:value=>value,phonopyScatteringVisit:()=>null
};
const setView=vm.runInNewContext('('+app.slice(start,end)+')',context);
const container=new Container();
let dispose=()=>{};
async function visit(route){
 dispose();
 setView(route,{render:false});
 const cleanup=await renderClassroomView({
  container,route:state.courseRoute,
  loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
  courseRenderers:{'material-research':renderMaterialResearchView},
  run:()=>assert.fail('Prediction and navigation cannot launch a calculation'),
  onNavigate(){},download:()=>assert.fail('Prediction cannot create a downloaded file')
 });
 dispose=typeof cleanup==='function'?cleanup:()=>{};
}
const element=id=>container.querySelector('#mr-graphene-'+id);
const choose=(stage,choice)=>container.querySelectorAll(`[name="mr-graphene-${stage}"]`).forEach(radio=>{radio.checked=radio.value===choice;});
const click=stage=>element('check-'+stage).onclick();
const links=node=>node.querySelectorAll('a').map(link=>link.getAttribute('href')?.replaceAll('&amp;','&'));
const localized=(zh,en)=>english?en:zh;

try{
 await visit(classroom);
 assert.equal(state.courseRoute.lesson,'band-crossing');
 assert.equal(element('compare').hidden,true);
 assert.equal(element('explanation').hidden,true);
 assert.match(element('activity').innerHTML,/class="katex"/,'The phase factors use the site math renderer');
 assert.ok(container.querySelector('#mr-to-lab'),'The existing classroom model link is present');
 click('ideal');
 assert.ok(element('ideal-status').textContent.includes(localized('请先选择','Choose an answer')));
 choose('ideal','split');
 click('ideal');
 assert.ok(element('ideal-status').textContent.includes(localized('首尾相接','tip to tail')));
 assert.equal(element('compare').hidden,true);
 choose('interpretation','point');
 click('interpretation');
 assert.equal(element('explanation').hidden,true,'The result needs a completed prediction');
 choose('ideal','equal');
 const departedPrediction=element('check-ideal').onclick;
 await visit('classroom/crystal?module=bands&tab=learn&lesson=band-restriction');
 assert.equal(element('activity'),null);
 departedPrediction();
 await visit(classroom);
 assert.equal(element('compare').hidden,true,'A stale lesson handler cannot advance progress');

 choose('ideal','equal');
 click('ideal');
 assert.equal(element('compare').hidden,false);
 assert.equal(element('ideal-question').disabled,true);
 assert.equal(document.activeElement,element('import-heading'));
 assert.ok(links(element('compare')).includes('#magnetictb'));

 await visit(atlas);
 assert.equal(state.primary,'atlas');
 assert.equal(state.courseRoute.atlasOnly,true);
 assert.equal(state.courseRoute.material,'graphene-wannier');
 const cases=container.querySelector('.obs-case-grid').children;
 assert.equal(cases.length,catalog.cases.length,'The full material catalog remains available');
 const graphene=cases[0];
 assert.ok(graphene.innerHTML.includes(localized('石墨烯的 K 点','Graphene at K')));
 assert.ok(links(graphene).includes('#'+classroom));
 assert.ok(links(graphene).includes('#magnetictb'));
 assert.equal(links(graphene).filter(path=>/362171ce35450118828c6960a882e3a6d08c73f5.*\/Graphene\/(Graphene_hr\.dat|wt\.in-bands)$/.test(path)).length,2);
 assert.ok(!links(graphene).some(path=>path.includes('band-connectivity')));
 await visit(modelCase);
 const square=container.querySelector('.obs-case-grid').children[0];
 assert.ok(links(square).includes('#compute/band-connectivity?material=square-model'));

 await visit(classroom);
 assert.equal(element('activity').getAttribute('open'),'','A return from the laboratory keeps the prediction ready');
 assert.equal(element('compare').hidden,false);
 assert.equal(element('explanation').hidden,true);
 choose('interpretation','zero');
 click('interpretation');
 assert.equal(element('explanation').hidden,true);
 assert.ok(element('interpretation-status').textContent.includes(localized('差值和单位','difference of the two energies')));
 choose('interpretation','point');
 click('interpretation');
 assert.equal(element('explanation').hidden,false);
 assert.equal(document.activeElement,element('explanation'));
 assert.match(element('explanation').innerHTML,/−1\.2621987299 eV/);
 assert.match(element('explanation').innerHTML,/2\.946 meV/);
 assert.ok(links(element('explanation')).includes('docs/wannier-graphene-example.md'));
 assert.ok(links(element('explanation')).includes('#'+atlas));
 assert.equal(imports.length,1,'Course and atlas reads share the catalogue, without fetching either original file');
}finally{
 dispose();
 Element.prototype.focus=focusBefore;
 Element.prototype.insertAdjacentHTML=insertBefore;
 globalThis.fetch=fetchBefore;
 globalThis.document=documentBefore;
 globalThis.localStorage=storageBefore;
}
console.log(`Graphene lesson (${english?'English':'Chinese'}): verified route, ordered prediction and interpretation, focus, stale guards, two pinned sources and intact legacy atlas cases.`);
