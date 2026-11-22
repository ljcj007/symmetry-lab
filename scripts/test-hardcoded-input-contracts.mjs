import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const catalogs=Object.fromEntries(['response-materials','spectroscopy-materials','coupled-materials','electronic-materials','quantum-materials','material-research'].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'))]));
let runs=0,writes=0;
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag)};
globalThis.requestAnimationFrame=()=>0;
globalThis.fetch=async url=>{const name=String(url).split('?')[0];return{ok:true,json:async()=>structuredClone(catalogs[name.replace(/^data\//,'').replace(/\.json$/,'')]),text:async()=>fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8')};};
const renderers=[
 ['response-materials',(await import('../dist/response-materials-ui.js')).renderResponseMaterialsView,'rp'],
 ['spectroscopy-materials',(await import('../dist/spectroscopy-ui.js')).renderSpectroscopyView,'spx'],
 ['coupled-materials',(await import('../dist/coupled-materials-ui.js')).renderCoupledMaterialsView,'cm'],
 ['electronic-materials',(await import('../dist/electronic-materials-ui.js')).renderElectronicMaterialsView,'em'],
 ['quantum-materials',(await import('../dist/quantum-materials-ui.js')).renderQuantumMaterialsView,'qm'],
 ['material-research',(await import('../dist/material-research-ui.js')).renderMaterialResearchView,'mr']
];
const internal={
 'coupled-materials':{distortion:[['cm-preset','srtio3'],['cm-preset','custom']],magnons:[['cm-model','afm']],qha:[['cm-source','matrix'],['cm-source','thermal']]},
 'material-research':{modes:[['mr-preset','gaas'],['mr-preset','nacl'],['mr-preset','custom']],bands:[['mr-model','rashba']],thermo:[['mr-source','einstein'],['mr-source','debye'],['mr-source','mesh'],['mr-source','dos'],['mr-source','thermal']]}
};
const expectedSteps={
 'cm-spin':'0.5','cm-natom':'1','em-sites':'1','em-size':'1','em-defectSite':'1','em-band':'1',
 'qm-selected_level':'1','qm-mesh':'1','qm-chemicalPotential':'any','mr-qi':'1','mr-bi':'1','mr-samples':'1','mr-natom':'1',
 'rp-mass':'any','rp-mesh':'1','rp-scanPoints':'1','spx-sites':'1','spx-frequencyPoints':'1','spx-fieldPoints':'1','spx-samples':'1'
};
const seen=new Set();let contexts=0,inputs=0,hallExact=false;
for(const[name,render,prefix]of renderers)for(const module of catalogs[name].modules){
 const variants=[{id:'default'},...(module.presets||[]),...(internal[name]?.[module.id]||[]).map(selection=>({id:'internal:'+selection.join('='),selection}))];
 for(const preset of variants){
  const container=new Container(),label=name+'/'+module.id+'/'+preset.id;
  await render({container,selection:{module:module.id,calculationOnly:true,...(preset.id==='default'?{}:{preset:preset.id})},run:()=>{runs++;throw Error('Contract inspection does not calculate');}});
  if(preset.selection){const node=container.querySelector('#'+preset.selection[0]);node.value=preset.selection[1];await node.onchange({target:node});}
  const form=container.querySelector('#'+prefix+'-form');assert.ok(form,label);
  for(const tag of form.innerHTML.matchAll(/<input\b[^>]*>/g)){
   if(!/\btype="number"/.test(tag[0]))continue;
   assert.equal([...tag[0].matchAll(/\bstep="[^"]*"/g)].length,1,'Exactly one numeric step attribute: '+label+' '+tag[0]);
  }
  for(const node of form.querySelectorAll('input')){
   if(!['number','range'].includes(node.type))continue;
   inputs++;const attr=node.attributes;
   if(Object.hasOwn(expectedSteps,node.id)){assert.equal(attr.step,expectedSteps[node.id],label+' '+node.id);seen.add(node.id);}
   if(node.value==='')continue;
   const value=Number(node.value);assert.ok(Number.isFinite(value),label+' '+node.id);
   const minimum=attr.min!==undefined&&Number.isFinite(Number(attr.min))?Number(attr.min):node.type==='range'?0:null;
   const maximum=attr.max!==undefined&&Number.isFinite(Number(attr.max))?Number(attr.max):node.type==='range'?100:null;
   if(minimum!==null)assert.ok(value>=minimum,label+' '+node.id+' minimum');
   if(maximum!==null)assert.ok(value<=maximum,label+' '+node.id+' maximum');
   if(attr.step!=='any'){
    const step=Number(attr.step)>0?Number(attr.step):1,base=minimum??Number(attr.value??0),q=(value-base)/step;
    assert.ok(Math.abs(q-Math.round(q))<=1e-7*Math.max(1,Math.abs(q)),label+' '+node.id+' exact preset step alignment');
   }
  }
  if(preset.id==='hall-unresolved'){assert.equal(form.querySelector('#rp-mass').value,'-1.99','Near-gap preset must retain its exact physical parameter');hallExact=true;}
  contexts++;
 }
}
for(const key of Object.keys(expectedSteps))assert.ok(seen.has(key),'Expected discrete/continuous control was inspected: '+key);
assert.ok(hallExact);assert.equal(contexts,104);assert.equal(runs,0);assert.equal(writes,0);
console.log('Hardcoded input contracts: '+contexts+' actual renderer contexts, '+inputs+' number/range inputs, unique step attributes, exact Hall mass, discrete/half-integer controls and continuous chemical potential passed; no automatic calculation or mastery writes. Native-browser validity is checked separately.');
