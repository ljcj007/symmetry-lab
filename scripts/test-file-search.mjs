import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Element,Container} from './test-material-research-ui.mjs';

const sourceOnly=process.argv.includes('--source-only');
const expectations={
 'POSCAR-0':['structure'],
 'band.yaml':['compute/phonopy','compute/phonon-modes','compute/phonopy-scattering'],
 'qpoints.yaml':['compute/phonopy','compute/phonon-modes','compute/phonopy-scattering'],
 'mesh.yaml':['compute/phonopy','compute/phonon-modes','compute/phonon-thermo','compute/phonopy-scattering'],
 'thermal_properties.yaml':['compute/phonon-thermo','compute/qha-lab'],
 'phonopy.yaml':['compute/phonopy','compute/phonopy-scattering'], 'phonopy_disp.yaml':['compute/phonopy','compute/phonopy-scattering'],
 'total_dos.dat':['compute/phonopy','compute/phonon-thermo'],
 'projected_dos.dat':['compute/phonopy'], 'partial_dos.dat':['compute/phonopy']
};
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
// Use existing complete genuine results and their actual parser inputs rather
// than inventing a filename-to-tool contract disconnected from scientific data.
const zno=read('./fixtures/phonopy-zno.json');
const parser=fs.readFileSync(new URL('../dist/python/phonopy_import.py',import.meta.url),'utf8').replace(/\r\n/g,'\n');
assert.equal(crypto.createHash('sha256').update(parser).digest('hex'),zno.coreSHA256);
assert.equal(zno.result.kind,'phonon-data');
assert.equal(zno.result.synthetic,false);
assert.equal(zno.result.structure.natom,4);
assert.equal(zno.result.qpoints.length,4);
assert.equal(zno.result.qpoints[0].frequencies.length,12);
const materials=read('./fixtures/material-research.json');
assert.equal(materials.requests.thermoMesh.input.source,'mesh');
assert.match(materials.requests.thermoMesh.input.content,/mesh:[\s\S]*weight:/);
assert.equal(materials.requests.thermoThermal.input.source,'thermal');
assert.match(materials.requests.thermoThermal.input.content,/thermal_properties:/);
assert.equal(materials.requests.thermoDOS.input.dos_complete,true);
assert.equal(materials.requests.thermoDOS.input.dos_normalization,'3n');
const qha=read('./fixtures/coupled-materials/contracts.json').requests.qhaThermal.input.data;
assert.equal(qha.thermalFiles.length,qha.volumes.length);
assert.equal(qha.staticEnergies.length,qha.volumes.length);
assert.ok(qha.volumes.length>1);
const thermoSource=fs.readFileSync(new URL('../dist/python/phonon_thermo.py',import.meta.url),'utf8');
assert.match(thermoSource,/segment_nqpoint[\s\S]*band\.yaml[\s\S]*不能据此计算体热容/);
assert.match(thermoSource,/weights != total_weight/);
assert.match(thermoSource,/dos_complete/);

// Keep the pre-existing DOM adapter, extending only native dialog/event/focus
// behavior needed to exercise the actual quick-finder handlers.
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){return selector.includes(',')?this.children.flatMap(child=>[...(selector.split(',').some(s=>child.matches(s))?[child]:[]),...child.querySelectorAll(selector)]):queryAll.call(this,selector);};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Element.prototype.addEventListener=function(name,handler){(this.events??={})[name]??=[];this.events[name].push(handler);};
Element.prototype.removeEventListener=function(name,handler){this.events[name]=(this.events?.[name]||[]).filter(x=>x!==handler);};
Element.prototype.fire=function(name,event={}){for(const fn of this.events?.[name]||[])fn({target:this,preventDefault(){},...event});};
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.closest=function(selector){return this.matches(selector)?this:this.parentNode?.closest?.(selector)||null;};
Element.prototype.remove=function(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;};
Element.prototype.showModal=function(){this.setAttribute('open','');};
Element.prototype.close=function(){this.removeAttribute('open');};

const observations=[];
for(const prefix of sourceOnly?['']:['','en/']){
 const {toolsIndex,renderNavigationHub}=await import(new URL('../dist/'+prefix+'navigation-ui.js',import.meta.url));
 const {finderResults,startToolFinder}=await import(new URL('../dist/'+prefix+'tool-finder.js',import.meta.url));
 const {filterToolDirectory}=await import(new URL('../dist/'+prefix+'tool-directory.js',import.meta.url));
 const {matchingInputFormats,inputFormatSummary}=await import(new URL('../dist/'+prefix+'tool-search.js',import.meta.url));
 const {toolInputFormats}=await import(new URL('../dist/'+prefix+'tool-capabilities.js',import.meta.url));
 assert.equal(toolsIndex.length,75);
 assert.equal(Object.keys(toolInputFormats).length,6);
 for(const [query,expected] of Object.entries(expectations)){
  for(const variant of [query,query.toUpperCase(),'import '+query,'/tmp/phonons/'+query,'C:\\runs\\'+query,'"C:\\my results\\'+query+'"']){
   const finder=finderResults(toolsIndex,variant).map(x=>x.route);
   const directory=filterToolDirectory(toolsIndex,{query:variant}).map(x=>x.route);
   assert.deepEqual(finder,expected,prefix+' finder '+variant);
   assert.deepEqual(directory,expected,prefix+' directory '+variant);
  }
  const rows=finderResults(toolsIndex,query);
  for(const row of rows){
   const formats=matchingInputFormats(row,query);
   assert.ok(formats.length && formats.every(x=>Object.isFrozen(x)&&Object.isFrozen(x.files)));
   assert.ok(inputFormatSummary(row,query).includes(query));
   if(prefix)assert.doesNotMatch(inputFormatSummary(row,query),/[\u3400-\u9fff]/);
  }
  observations.push({edition:prefix?'en':'zh',query,routes:expected});
 }
 for(const query of ['FORCE_SETS','force_constants.hdf5','force_constants.yaml','unsupported.xyz'])assert.deepEqual(finderResults(toolsIndex,query),[],prefix+' unsupported file '+query);
 assert.equal(finderResults(toolsIndex,'Clebsch-Gordan')[0].route,'compute/lie/su3_cg');
 assert.equal(finderResults(toolsIndex,'POSCAR')[0].route,'structure');
 assert.equal(finderResults(toolsIndex,'Si-QHA/POSCAR-0')[0].route,'structure');
 assert.deepEqual(filterToolDirectory(toolsIndex,{query:'mesh.yaml',category:'structure'}),[]);
 assert.deepEqual(filterToolDirectory(toolsIndex,{query:'mesh.yaml',arithmetic:'exact'}),[]);
 assert.deepEqual(filterToolDirectory(toolsIndex,{query:'mesh.yaml',favorites:['compute/phonon-thermo']}).map(x=>x.route),['compute/phonon-thermo']);
 const byRoute=route=>toolsIndex.find(x=>x.route===route);
 const scopeText=(route,file)=>inputFormatSummary(byRoute(route),file);
 if(prefix){
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/complete three-dimensional.*complex eigenvectors/);
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/matching negative q/);
  assert.match(scopeText('compute/phonon-thermo','mesh.yaml'),/weights.*units[\s\S]*cannot replace a bulk integration mesh/);
  assert.match(scopeText('compute/phonopy','phonopy.yaml'),/only the structure[\s\S]*do not generate a phonon spectrum/);
  assert.match(scopeText('compute/phonopy','projected_dos.dat'),/cannot substitute for a complete total DOS/);
  assert.match(scopeText('compute/qha-lab','thermal_properties.yaml'),/Each volume[\s\S]*static energies[\s\S]*single file is not/);
 }else{
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/完整三维复本征矢.*原胞/);
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/湮灭通道.*负 q/);
  assert.match(scopeText('compute/phonon-thermo','mesh.yaml'),/整数权重.*频率单位.*路径.*不能代替体积分网格/);
  assert.match(scopeText('compute/phonopy','phonopy.yaml'),/没有频率.*只显示结构.*不会生成声子谱/);
  assert.match(scopeText('compute/phonopy','projected_dos.dat'),/不能冒充完整总 DOS/);
  assert.match(scopeText('compute/qha-lab','thermal_properties.yaml'),/每个体积.*顺序.*静态能.*单独一份/);
 }

 const stored=new Map(),body=new Element('body',{}, {isConnected:true}),documentEvents={};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.document={body,activeElement:body,createElement:tag=>new Element(tag),addEventListener(name,fn){(documentEvents[name]??=[]).push(fn);},removeEventListener(name,fn){documentEvents[name]=(documentEvents[name]||[]).filter(x=>x!==fn);}};
 let network=0;globalThis.fetch=async()=>{network++;throw Error('Filename tool lookup must use its local catalog');};
 const container=new Container();await renderNavigationHub({container,view:'compute'});
 const input=container.querySelector('#site-search');
 input.value='mesh.yaml';input.oninput();
 const matched=container.querySelectorAll('.nav-file-purpose');
 assert.equal(matched.length,4,'The actual directory displays distinct purposes without opening each card');
 assert.ok(matched.every(row=>row.innerHTML.includes('mesh.yaml')));
 assert.equal(container.querySelectorAll('[data-favorite]').length,4);
 input.value='band.yaml';input.oninput();
 assert.equal(container.querySelectorAll('.nav-file-purpose').length,3);
 assert.doesNotMatch(container.querySelector('#tools-filtered').innerHTML,/data-route="compute\/phonon-thermo"/);

 const button=body.appendChild(new Element('button')),opened=[];
 const controller=startToolFinder({button,onNavigate:route=>opened.push(route)});
 button.fire('click');
 const dialog=body.querySelector('dialog'),query=dialog.querySelector('#tool-finder-query'),list=dialog.querySelector('#tool-finder-results');
 query.value='thermal_properties.yaml';query.fire('input');
 assert.equal(list.querySelectorAll('.tool-finder-file-purpose').length,2);
 assert.ok(list.innerHTML.includes(prefix?'Each volume':'每个体积'));
 for(const fn of documentEvents.keydown||[])fn({key:'Enter',preventDefault(){}});
 assert.deepEqual(opened,['compute/phonon-thermo'],'Enter opens the primary import; there is no automatic computation or file access');
 assert.equal(dialog.hidden,true);
 assert.equal(network,0,'Tools-only filename filtering does not fetch catalogs or read files');
 controller.destroy();assert.equal(body.querySelector('dialog'),null);
}
console.log('Scientific file search: '+JSON.stringify({editions:sourceOnly?1:2,queries:observations.length,routes:75,observations})+'; actual finder/directory handlers, purpose and scientific-input boundaries, path/case/import queries, unsupported files, filters, manual navigation and lazy catalog behavior passed.');
