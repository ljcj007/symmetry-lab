import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Element,Container} from './test-material-research-ui.mjs';

const sourceOnly=process.argv.includes('--source-only');
const expectations={
 'POSCAR-0':['structure'],
 'CONTCAR':['structure'],
 'band.yaml':['compute/phonopy','compute/phonon-modes','compute/phonopy-scattering'],
 'qpoints.yaml':['compute/phonopy','compute/phonon-modes','compute/phonopy-scattering'],
 'mesh.yaml':['compute/phonopy','compute/phonon-modes','compute/phonon-thermo','compute/phonopy-scattering'],
 'thermal_properties.yaml':['compute/phonon-thermo','compute/qha-lab'],
 'phonopy.yaml':['compute/phonopy','compute/phonopy-scattering'], 'phonopy_disp.yaml':['compute/phonopy','compute/phonopy-scattering'],
 'total_dos.dat':['compute/phonopy','compute/phonon-thermo'],
 'projected_dos.dat':['compute/phonopy'], 'partial_dos.dat':['compute/phonopy'],
 'wannier90_hr.dat':['magnetictb'], 'Graphene_hr.dat':['magnetictb'], 'wt.in-bands':['magnetictb'],
 'trace.txt':['bands']
};
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const quartz=read('../dist/data/examples/quartz-298k/source.json');
const quartzCif=fs.readFileSync(new URL('../dist/data/examples/quartz-298k/9005017.cif',import.meta.url),'utf8');
assert.match(quartzCif,/^data_9005017\b/m);
assert.match(JSON.stringify(quartz),/9005017\.cif/);
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
 assert.equal(Object.keys(toolInputFormats).length,8);
 const {parseTrace}=await import(new URL('../dist/'+prefix+'trace-parser.js',import.meta.url));
 const magneticTrace=parseTrace(fs.readFileSync(new URL('../dist/'+prefix+'examples/trace-msg.txt',import.meta.url),'utf8'));
 const ordinaryTrace=parseTrace(fs.readFileSync(new URL('./fixtures/trace-sg186.txt',import.meta.url),'utf8'));
 assert.equal(magneticTrace.format,'magvasp2trace');
 assert.equal(magneticTrace.soc,1);
 assert.deepEqual(magneticTrace.kpoints[0].k,[0,0,0]);
 assert.equal(ordinaryTrace.format,'vasp2trace');
 for(const query of ['VASP2Trace','MagVasp2trace']){
  assert.equal(finderResults(toolsIndex,query)[0]?.route,'bands');
  assert.equal(filterToolDirectory(toolsIndex,{query})[0]?.route,'bands');
 }
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
 for(const query of ['FORCE_SETS','force_constants.hdf5','force_constants.yaml','unsupported.xyz','wannier90.wout','OUTCAR','WAVECAR'])assert.deepEqual(finderResults(toolsIndex,query),[],prefix+' unsupported file '+query);
 for(const [query,pattern] of [
  ['9005017.cif','*.cif'],['import 9005017.CIF','*.cif'],['quartz-sample.cif','*.cif'],
  ['"C:\\runs experiment\\9005017.CIF"','*.cif'],['C:\\runs experiment\\9005017.CIF','*.cif'],
  ['/tmp/quartz samples/9005017.cif','*.cif'],
  ['"quartz with spaces.cif"','*.cif'],['Si_cell.VASP','*.vasp'],['/tmp/Si-primitive.vasp','*.vasp'],
  ['relative/CONTCAR','CONTCAR'],['C:\\runs\\Si.poscar','*.poscar']
 ]) {
  assert.deepEqual(finderResults(toolsIndex,query).map(row=>row.route),['structure'],prefix+' finder '+query);
  assert.deepEqual(filterToolDirectory(toolsIndex,{query}).map(row=>row.route),['structure'],prefix+' directory '+query);
  const [structure]=finderResults(toolsIndex,query);
  assert.equal(matchingInputFormats(structure,query).length,1);
  assert.ok(inputFormatSummary(structure,query).includes(pattern));
  assert.match(inputFormatSummary(structure,query),prefix?/BC (?:cell|primitive cell)/:/BC 晶胞/);
  if(prefix)assert.doesNotMatch(inputFormatSummary(structure,query),/[\u3400-\u9fff]/);
 }
 for(const query of ['quartz.mcif','/tmp/structure.txt','9005017.cif.backup','quartz.xyz','SAMPLE.POSCAR.zip']){
  assert.deepEqual(finderResults(toolsIndex,query),[],prefix+' unsupported file '+query);
  assert.deepEqual(filterToolDirectory(toolsIndex,{query}),[],prefix+' unsupported file in directory '+query);
 }
 const qualifiedFiles=[
  ['compute/phonopy-scattering',['band.yaml neutron scattering','band.yaml 中子散射','mesh.yaml 非弹性散射']],
  ['compute/phonon-thermo',['mesh.yaml thermodynamics','mesh.yaml 热容','./mesh.yaml heat capacity','./mesh.yaml "heat capacity"',
   '/tmp/phonon results/mesh.yaml heat capacity','C:\\My Results\\mesh.yaml heat capacity','"C:\\My Results\\mesh.yaml" heat capacity','data/mesh.yaml heat capacity']],
  ['bands',['trace.txt irrep','trace.txt DFT bands','trace.txt 不可约表示']],
  ['magnetictb',['wannier90_hr.dat band structure','/tmp/Graphene Trial/wannier90_hr.dat 能带结构']],
  ['structure',['POSCAR space group','./quartz-sample.cif space group','./quartz-sample.cif 空间群']]
 ];
 for(const [route,queries] of qualifiedFiles){
  const item=toolsIndex.find(entry=>entry.route===route);
  for(const query of queries){
   assert.equal(finderResults(toolsIndex,query)[0]?.route,route,prefix+' qualified file '+query);
   assert.equal(filterToolDirectory(toolsIndex,{query})[0]?.route,route,prefix+' directory qualified file '+query);
   assert.equal(matchingInputFormats(item,query).length,1,prefix+' keep declared file purpose '+query);
  }
 }
 for(const query of ['band.yaml heat capacity','trace.txt Wannier','trace.txt irrep unsupportedword','/tmp/xxx.xyz heat capacity']){
  assert.deepEqual(finderResults(toolsIndex,query),[],prefix+' keep file and purpose constraints '+query);
  assert.deepEqual(filterToolDirectory(toolsIndex,{query}),[],prefix+' directory keeps constraints '+query);
 }
 for(const query of ['irrep product','direct product irreps','"tensor product of irreps"','不可约表示 直积']){
  assert.equal(finderResults(toolsIndex,query)[0]?.route,'products',prefix+' irrep product '+query);
  assert.equal(filterToolDirectory(toolsIndex,{category:'coupling',query})[0]?.route,'products',prefix+' directory irrep product '+query);
  assert.deepEqual(filterToolDirectory(toolsIndex,{category:'structure',query}),[],prefix+' product keeps category filter '+query);
 }
 assert.deepEqual(finderResults(toolsIndex,'irrep product unsupportedword'),[],prefix+' product phrase keeps extra constraints');
 assert.equal(finderResults(toolsIndex,'SU ( 3 ) 27')[0]?.route,'compute/lie/su3_ninej',prefix+' preserve spaced group notation');
 assert.equal(finderResults(toolsIndex,'Clebsch-Gordan')[0].route,'compute/lie/su3_cg');
 assert.equal(finderResults(toolsIndex,'POSCAR')[0].route,'structure');
 assert.equal(finderResults(toolsIndex,'CIF Hall')[0]?.route,'structure');
 assert.equal(filterToolDirectory(toolsIndex,{query:'CIF Hall'})[0]?.route,'structure');
 assert.deepEqual(matchingInputFormats(toolsIndex.find(row=>row.route==='structure'),'CIF Hall'),[],'Ordinary keywords keep their usual search behavior');
 assert.equal(finderResults(toolsIndex,'Si-QHA/POSCAR-0')[0].route,'structure');
 assert.deepEqual(filterToolDirectory(toolsIndex,{query:'mesh.yaml',category:'structure'}),[]);
 assert.deepEqual(filterToolDirectory(toolsIndex,{query:'mesh.yaml',arithmetic:'exact'}),[]);
 assert.deepEqual(filterToolDirectory(toolsIndex,{query:'mesh.yaml',favorites:['compute/phonon-thermo']}).map(x=>x.route),['compute/phonon-thermo']);
 const byRoute=route=>toolsIndex.find(x=>x.route===route);
 const scopeText=(route,file)=>inputFormatSummary(byRoute(route),file);
 for(const path of ['examples/Graphene/wt.in-bands','import examples/Graphene/wt.in-bands','/tmp/project/wannier90_hr.dat']){
  assert.equal(finderResults(toolsIndex,path)[0]?.route,'magnetictb');
  assert.ok(scopeText('magnetictb',path));
 }
 if(prefix){
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/complete three-dimensional.*complex eigenvectors/);
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/matching negative q/);
  assert.match(scopeText('compute/phonon-thermo','mesh.yaml'),/weights.*units[\s\S]*cannot replace a bulk integration mesh/);
  assert.match(scopeText('compute/phonopy','phonopy.yaml'),/only the structure[\s\S]*do not generate a phonon spectrum/);
  assert.match(scopeText('compute/phonopy','projected_dos.dat'),/cannot substitute for a complete total DOS/);
  assert.match(scopeText('compute/qha-lab','thermal_properties.yaml'),/Each volume[\s\S]*static energies[\s\S]*single file is not/);
  assert.match(scopeText('magnetictb','wannier90_hr.dat'),/real-space Hamiltonian[\s\S]*10 MiB[\s\S]*fractional reciprocal[\s\S]*Å⁻¹/);
  assert.match(scopeText('magnetictb','wt.in-bands'),/pinned Graphene_hr\.dat[\s\S]*verify both files[\s\S]*run the calculation/);
  assert.match(scopeText('bands','trace.txt'),/VASP2Trace or MagVasp2trace[\s\S]*10 MiB[\s\S]*20 columns[\s\S]*21[\s\S]*BC primitive cell, wave vector, and spin frame[\s\S]*manually/);
 }else{
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/完整三维复本征矢.*原胞/);
  assert.match(scopeText('compute/phonopy-scattering','qpoints.yaml'),/湮灭通道.*负 q/);
  assert.match(scopeText('compute/phonon-thermo','mesh.yaml'),/整数权重.*频率单位.*路径.*不能代替体积分网格/);
  assert.match(scopeText('compute/phonopy','phonopy.yaml'),/没有频率.*只显示结构.*不会生成声子谱/);
  assert.match(scopeText('compute/phonopy','projected_dos.dat'),/不能冒充完整总 DOS/);
  assert.match(scopeText('compute/qha-lab','thermal_properties.yaml'),/每个体积.*顺序.*静态能.*单独一份/);
  assert.match(scopeText('magnetictb','wannier90_hr.dat'),/实空间哈密顿量.*10 MiB.*倒格分数坐标.*Å⁻¹/);
  assert.match(scopeText('magnetictb','wt.in-bands'),/固定版本的 Graphene_hr\.dat.*核验两份文件.*手动运行/);
  assert.match(scopeText('bands','trace.txt'),/VASP2Trace 或 MagVasp2trace.*10 MiB.*20 列.*21 列.*BC 原胞、波矢和自旋框架.*手动匹配/);
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
 input.value='band.yaml 中子散射';input.oninput();
 assert.equal(container.querySelectorAll('.nav-file-purpose').length,1);
 assert.equal(container.querySelector('[data-favorite]').dataset.favorite,'compute/phonopy-scattering');
 input.value='/tmp/project/wannier90_hr.dat';input.oninput();
 assert.equal(container.querySelectorAll('.nav-file-purpose').length,1);
 assert.match(container.querySelector('.nav-file-purpose').textContent,/wannier90_hr\.dat/);
 assert.equal(container.querySelector('[data-favorite]').dataset.favorite,'magnetictb');
 input.value='/tmp/project/trace.txt';input.oninput();
 assert.equal(container.querySelectorAll('.nav-file-purpose').length,1);
 assert.match(container.querySelector('.nav-file-purpose').textContent,/trace\.txt/);
 assert.equal(container.querySelector('[data-favorite]').dataset.favorite,'bands');
 input.value='"C:\\runs experiment\\9005017.CIF"';input.oninput();
 assert.equal(container.querySelectorAll('.nav-file-purpose').length,1);
 assert.match(container.querySelector('.nav-file-purpose').textContent,/\*\.cif/);
 assert.equal(container.querySelector('[data-favorite]').dataset.favorite,'structure');

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
 button.fire('click');
 query.value='/tmp/project/wannier90_hr.dat';query.fire('input');
 assert.equal(list.querySelectorAll('.tool-finder-file-purpose').length,1);
 assert.match(list.querySelector('.tool-finder-file-purpose').textContent,/wannier90_hr\.dat/);
 for(const fn of documentEvents.keydown||[])fn({key:'Enter',preventDefault(){}});
 assert.deepEqual(opened,['compute/phonon-thermo','magnetictb']);
 assert.equal(dialog.hidden,true);
 button.fire('click');
 query.value='/tmp/project/trace.txt';query.fire('input');
 assert.equal(list.querySelectorAll('.tool-finder-file-purpose').length,1);
 assert.match(list.querySelector('.tool-finder-file-purpose').textContent,/trace\.txt/);
 for(const fn of documentEvents.keydown||[])fn({key:'Enter',preventDefault(){}});
 assert.deepEqual(opened,['compute/phonon-thermo','magnetictb','bands']);
 assert.equal(dialog.hidden,true);
 button.fire('click');
 query.value='"C:\\runs experiment\\9005017.CIF"';query.fire('input');
 assert.equal(list.querySelectorAll('.tool-finder-file-purpose').length,1);
 assert.match(list.querySelector('.tool-finder-file-purpose').textContent,/\*\.cif/);
 assert.deepEqual(opened,['compute/phonon-thermo','magnetictb','bands'],'Typing the filename only shows the route');
 for(const fn of documentEvents.keydown||[])fn({key:'Enter',preventDefault(){}});
 assert.deepEqual(opened,['compute/phonon-thermo','magnetictb','bands','structure']);
 assert.equal(dialog.hidden,true);
 button.fire('click');
 query.value='C:\\My Results\\mesh.yaml heat capacity';query.fire('input');
 assert.equal(list.querySelectorAll('.tool-finder-file-purpose').length,1);
 assert.deepEqual(opened,['compute/phonon-thermo','magnetictb','bands','structure'],'Typing the qualified path only presents the tool');
 for(const fn of documentEvents.keydown||[])fn({key:'Enter',preventDefault(){}});
 assert.deepEqual(opened,['compute/phonon-thermo','magnetictb','bands','structure','compute/phonon-thermo']);
 assert.equal(dialog.hidden,true);
 assert.equal(network,0,'Tools-only filename filtering does not fetch catalogs or read files');
 controller.destroy();assert.equal(body.querySelector('dialog'),null);
}
console.log('Scientific file search: '+JSON.stringify({editions:sourceOnly?1:2,queries:observations.length,routes:75,observations})+'; actual finder/directory handlers, purpose and scientific-input boundaries, path/case/import queries, unsupported files, filters, manual navigation and lazy catalog behavior passed.');
