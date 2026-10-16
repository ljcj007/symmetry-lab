import assert from 'node:assert/strict';
import {renderStructureView, getStructureResult} from '../dist/structure-ui.js';

// Exercise actual async file handlers with controlled read/compute completion.
class Container {
  dataset = {researchView:'structure'};
  elements = new Map();
  register(html) {
    for(const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
      const owner=this;
      this.elements.set('#'+match[2], {
        tag:match[1],disabled:false,value:'',html:'',
        set innerHTML(value){this.html=value;owner.register(value);},
        get innerHTML(){return this.html;}
      });
    }
  }
  set innerHTML(html){this.html=html;this.elements=new Map();this.register(html);}
  querySelector(selector){return this.elements.get(selector)||null;}
  querySelectorAll(){return [...this.elements.values()].filter(e=>['input','textarea','select'].includes(e.tag));}
}
const container=new Container(), calls=[], opened=[], downloads=[];
const identity=[[1,0,0],[0,1,0],[0,0,1]];
const fixture={group_number:225,international:'Fm-3m',hall_number:523,bravais:'CubiFace',bz_type:'CubiFace',
  bc_primitive:{lattice:identity,positions:[[0,0,0]],species:['Na']},
  transform:{coordinate_matrix:identity,origin_shift:[0,0,0]},
  k_bc:[.1234564,.2345674,.3580238],verified:true,verification:{verified:true},
  exports:{bc_poscar:'BC',bc_cif:'CIF',standard_poscar:'ITA',unidealized_poscar:'RAW'}};
const options={container,run:async(tool,payload)=>{calls.push({tool,payload});return fixture;},
  toast:()=>{},download:(...args)=>downloads.push(args),openGroup:(...args)=>opened.push(args)};
renderStructureView(options);
let finishRead;
const reading=container.querySelector('#structure-file').onchange({target:{files:[
  {name:'new.cif',size:10,text:()=>new Promise(resolve=>{finishRead=resolve;})}
]}});
assert.equal(container.querySelector('#structure-run').disabled,true);
assert.equal(container.querySelector('#structure-text').disabled,true);
await container.querySelector('#structure-run').onclick();
assert.equal(calls.length,0,'A pending file read must block both native and programmatic Run');
finishRead('data_new');await reading;
assert.equal(container.querySelector('#structure-run').disabled,false);
await container.querySelector('#structure-run').onclick();
assert.equal(calls[0].payload.text,'data_new');
assert.equal(calls[0].payload.format,'cif');
assert.equal(getStructureResult(),fixture);
container.querySelector('#structure-open-group').onclick();
assert.deepEqual(opened,[[225,[.1234564,.2345674,.3580238],'CubiFace']]);
container.querySelector('#structure-poscar').onclick();
assert.equal(downloads[0][0],'BC');

const failed=container.querySelector('#structure-file').onchange({target:{files:[
  {name:'failed.cif',size:10,text:async()=>{throw Error('read failed');}}
]}});
await failed;
assert.equal(container.querySelector('#structure-run').disabled,false);
assert.equal(getStructureResult(),null,'A failed new input must not retain a previous result');
assert.match(container.querySelector('#structure-error').innerHTML,/read failed/);

const background=container.querySelector('#structure-file').onchange({target:{files:[
  {name:'background.poscar',size:20,text:()=>new Promise(resolve=>{finishRead=resolve;})}
]}});
container.dataset.researchView='docs';container.innerHTML='<p>Other view</p>';
finishRead('Background structure');await background;
assert.equal(container.html,'<p>Other view</p>','A completed file read must not replace another view');
container.dataset.researchView='structure';renderStructureView(options);
await container.querySelector('#structure-run').onclick();
assert.equal(calls.at(-1).payload.text,'Background structure');
console.log('Structure UI: file-read lock, correct input dispatch, read-error recovery, navigation and exact k/BZ handoff passed.');
