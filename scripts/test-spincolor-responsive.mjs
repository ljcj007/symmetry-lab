import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
import {createSpinColorViewer} from '../dist/spincolor-viewer.js';
import {jsStrings,textUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';

// The real renderer runs against measured element widths. No camera or
// symmetry formula is reproduced here: assertions inspect its actual SVG.
Object.defineProperty(Element.prototype,'clientWidth',{configurable:true,get(){let n=this;while(n){if(Number.isFinite(n.measuredWidth))return n.measuredWidth;n=n.parentNode;}return 0;}});
Element.prototype.getBoundingClientRect=function(){return{width:this.clientWidth};};
Element.prototype.focus=function(){};
const resizeObservers=[],mutationObservers=[];
class ResizeObserverMock{constructor(callback){this.callback=callback;this.disconnects=0;resizeObservers.push(this);}observe(target){this.target=target;}disconnect(){this.disconnects++;}}
class MutationObserverMock{constructor(callback){this.callback=callback;this.disconnects=0;mutationObservers.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.disconnects++;}}
globalThis.ResizeObserver=ResizeObserverMock;globalThis.MutationObserver=MutationObserverMock;
const read=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
const spin=read('./fixtures/spin-actions.json'),legacy=read('./fixtures/group-extensions-ui.json');
const fixtures=[...spin.cases.filter(x=>x.result.viewer).map(x=>({id:x.id,data:x.result.viewer})),...legacy.cases.map((x,i)=>({id:'legacy-'+i,data:x.result}))];
assert.equal(fixtures.length,49);
function mount(data,{width=240,initialView={},isCurrent=()=>true}={}){
 const page=new Container();page.innerHTML='<div data-view></div>';const host=page.querySelector('[data-view]');host.measuredWidth=width;host.ownerDocument={body:new Element('body')};
 const camera=createSpinColorViewer({container:host,data,initialView,isCurrent}),stage=host.querySelector('[data-gx="stage"]'),svg=stage.querySelector('svg');
 let captured=null,releases=0;stage.setPointerCapture=id=>{captured=id;};stage.hasPointerCapture=id=>captured===id;stage.releasePointerCapture=()=>{captured=null;releases++;};
 return{page,host,camera,stage,svg,resize:resizeObservers.at(-1),mutation:mutationObservers.at(-1),$:name=>host.querySelector('[data-gx="'+name+'"]'),get captured(){return captured;},get releases(){return releases;}};
}
const box=v=>v.svg.getAttribute('viewBox').split(' ').map(Number);
const sites=(v,pattern)=>v.svg.querySelectorAll('[data-gx-pattern="'+pattern+'"]');
const coordinates=nodes=>nodes.map(n=>[n.getAttribute('cx'),n.getAttribute('cy')]);
const input=(v,name,value)=>{v.$(name).value=String(value);v.$(name).oninput();};
const key=(v,name)=>{let prevented=false;v.stage.onkeydown({key:name,preventDefault(){prevented=true;}});return prevented;};
const mode=(v,value)=>{v.$('drag-mode').value=value;v.$('drag-mode').onchange();};
const pose=v=>Object.fromEntries(['yaw','pitch','zoom','showReference','showLabels'].map(k=>[k,v[k]]));
const sameCenter=(a,b)=>{for(const axis of ['x','y'])assert.ok(Math.abs(a[axis]-b[axis])<1e-12,'The normalized figure center is preserved');};
function geometry(v){
 const[,,width,height]=box(v),points=[];assert.ok(width>0&&height>0);
 assert.match(v.svg.getAttribute('style'),new RegExp('width:'+width+'px;height:'+height+'px'));
 for(const n of v.svg.querySelectorAll('circle')){const x=Number(n.getAttribute('cx')),y=Number(n.getAttribute('cy')),r=Number(n.getAttribute('r'));assert.ok(x-r>=0&&x+r<=width&&y-r>=0&&y+r<=height,'Every initial/current site fits the actual canvas');points.push([x,y]);}
 for(const n of v.svg.querySelectorAll('line'))for(const end of [1,2]){const x=Number(n.getAttribute('x'+end)),y=Number(n.getAttribute('y'+end));assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=width&&y>=0&&y<=height,'Cell edges, axes, and every arrow endpoint stay on the canvas');points.push([x,y]);}
 for(const n of v.svg.querySelectorAll('text')){const x=Number(n.getAttribute('x')),y=Number(n.getAttribute('y'));assert.ok(x>=0&&x<=width&&y>=19&&y<=height,'Visible labels have room for their original font size');}
 assert.doesNotMatch(v.svg.innerHTML,/NaN|Infinity|undefined/);return points;
}
for(const row of fixtures){
 const before=structuredClone(row.data);
 for(const width of [240,390,760]){
  const v=mount(row.data,{width}),view=v.camera.getView(),refs=coordinates(sites(v,'reference')),all=[];
  assert.equal(box(v)[2],width,'SVG units equal CSS pixels, so a 17px label is not reduced to 5px');
  for(let i=0;i<row.data.frames.length;i++){
   v.camera.setFrame(i);all.push(...geometry(v));assert.deepEqual(v.camera.getView(),view,'All returned frames share one camera');assert.deepEqual(coordinates(sites(v,'reference')),refs,'The reference never jumps or rescales between frames');
   assert.equal(sites(v,'current').length,row.data.frames[i].sites.length);assert.equal(sites(v,'reference').length,row.data.referenceSites.length);
   for(const [pattern,sourceSites]of [['current',row.data.frames[i].sites],['reference',row.data.referenceSites]]){assert.deepEqual(sites(v,pattern).map(n=>n.dataset.gxSite).sort(),sourceSites.map(s=>String(s.id)).sort(),'Every supplied site keeps its full identity');assert.equal(v.svg.querySelectorAll('[data-gx-spin="'+pattern+'"]').length,sourceSites.filter(s=>Array.isArray(s.spin)&&s.spin.some(x=>Math.abs(x)>1e-10)).length,'No nonzero supplied moment is hidden to fit the scene');}
   if(row.data.dimension==='space')assert.equal(v.svg.querySelectorAll('.gx-cell-edge').length,12,'The complete cell remains visible');
   assert.equal(v.svg.querySelectorAll('.gx-axis-label').length,row.data.latticeAxes?.length||3);
   if(width<420){assert.equal(v.$('site-key').hidden,false);for(const s of row.data.frames[i].sites)assert.ok(v.$('site-key').textContent.includes(s.id));assert.equal(v.svg.querySelectorAll('.gx-site-label').length,row.data.frames[i].sites.length);}
  }
  const beforeToggle=coordinates(sites(v,'current'));v.$('reference').checked=false;v.$('reference').onchange();assert.deepEqual(coordinates(sites(v,'current')),beforeToggle,'Reference visibility does not recalibrate the scene');assert.equal(sites(v,'reference').length,0);
  v.$('labels').checked=false;v.$('labels').onchange();assert.equal(v.$('site-key').hidden,true);assert.equal(v.svg.querySelectorAll('.gx-site-label').length,0);assert.deepEqual(coordinates(sites(v,'current')),beforeToggle);
  if(width===240){const spanX=Math.max(...all.map(p=>p[0]))-Math.min(...all.map(p=>p[0])),spanY=Math.max(...all.map(p=>p[1]))-Math.min(...all.map(p=>p[1]));assert.ok(Math.max(spanX/(240-68),spanY/(340-68))>.95,'The union of real frames uses the mobile drawing area');}
  v.camera.destroy();assert.equal(v.resize.disconnects,1);assert.equal(v.mutation.disconnects,1);
 }
 assert.deepEqual(row.data,before,'Projection never mutates supplied Python geometry or moments');
}

// Large supplied moments, remote unwrapped translations, axis endpoints and
// long labels must all remain available. Equal position fields are not wrapped.
const model={lab:'spin_group',dimension:'space',title:'Unwrapped fixture',cellVertices:[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],latticeAxes:[{label:'a',start:[0,0,0],end:[2,0,0]},{label:'b',start:[0,0,0],end:[0,2,0]},{label:'c',start:[0,0,0],end:[0,0,2]}],referenceSites:[{id:'完整标签 <site & one>',position:[0,0,0],spin:[0,0,15]}],frames:[{step:0,sites:[{id:'完整标签 <site & one>',position:[0,0,0],spin:[0,0,15]}]},{step:1,sites:[{id:'完整标签 <site & one>',position:[8,-3,5],spin:[2,4,-15]}]}]};
const v=mount(model);const before=coordinates(sites(v,'current'));v.camera.setFrame(1);geometry(v);assert.notDeepEqual(coordinates(sites(v,'current')),before,'Unwrapped translation remains spatially visible');assert.equal(v.svg.querySelectorAll('[data-gx-spin="current"]').length,1);assert.equal(v.$('site-key').querySelector('bdi').textContent,model.frames[1].sites[0].id);
for(const [yaw,pitch]of [[0,0],[90,85],[-180,-85],[45,35]]){input(v,'yaw',yaw);input(v,'pitch',pitch);geometry(v);}
let saved=v.camera.getView();v.host.measuredWidth=390;v.resize.callback();assert.equal(box(v)[2],390);assert.deepEqual(v.camera.getView(),saved,'Resize changes layout, never the requested camera');const unchanged=v.svg.innerHTML;v.resize.callback();assert.equal(v.svg.innerHTML,unchanged,'Height-only observer notifications do not create draw loops');
input(v,'zoom',2);assert.equal(box(v)[2],780);assert.match(v.svg.getAttribute('style'),/width:780px/);assert.ok(v.stage.scrollLeft>0);geometry(v);
saved=v.camera.getView();mode(v,'pan');assert.match(v.stage.getAttribute('aria-label'),/平移/);const oldScroll=v.stage.scrollLeft;assert.equal(key(v,'ArrowRight'),true);assert.ok(v.stage.scrollLeft>oldScroll);assert.deepEqual(pose(v.camera.getView()),pose(saved),'Pan keys never rotate the model');
v.stage.onpointerdown({button:0,pointerId:7,clientX:100,clientY:100,preventDefault(){}});assert.equal(v.captured,7);const panStart=v.stage.scrollLeft;v.stage.onpointermove({pointerId:7,clientX:140,clientY:130});assert.notEqual(v.stage.scrollLeft,panStart,'Dragging in pan mode moves the enlarged canvas');assert.deepEqual(pose(v.camera.getView()),pose(saved));v.stage.onpointercancel();assert.equal(v.captured,null);
mode(v,'rotate');v.stage.onpointerdown({button:0,pointerId:8,clientX:20,clientY:20,preventDefault(){}});v.stage.onpointermove({pointerId:8,clientX:60,clientY:40});assert.notEqual(v.camera.getView().yaw,saved.yaw);const afterDrag=v.camera.getView();v.stage.onlostpointercapture();v.stage.onpointermove({pointerId:8,clientX:100,clientY:100});assert.deepEqual(v.camera.getView(),afterDrag);
v.stage.onpointerdown({button:0,pointerId:9,clientX:20,clientY:20,preventDefault(){}});v.host.measuredWidth=240;v.resize.callback();assert.equal(v.captured,null,'A resize releases an in-progress drag');
v.$('reset').onclick();assert.deepEqual(v.camera.getView(),{yaw:-28,pitch:24,zoom:1,showReference:true,showLabels:true,dragMode:'rotate',panCenter:{x:.5,y:.5}});assert.equal(v.stage.scrollLeft,0);assert.equal(v.$('drag-mode').value,'rotate');assert.equal(key(v,'ArrowRight'),true);assert.equal(v.camera.getView().yaw,-23);assert.equal(key(v,'?'),false);
const retired={yaw:v.$('yaw').oninput,resize:v.resize.callback,key:v.stage.onkeydown},snapshot=v.svg.innerHTML,view=v.camera.getView();v.camera.destroy();v.$('yaw').value='120';retired.yaw();retired.resize();retired.key({key:'ArrowRight',preventDefault(){}});v.camera.setFrame(0);assert.equal(v.svg.innerHTML,snapshot);assert.deepEqual(v.camera.getView(),view);assert.equal(v.resize.disconnects,1);assert.equal(v.mutation.disconnects,1);assert.equal(v.stage.onpointermove,null);assert.equal(v.$('reset').onclick,null);
const detached=mount(model);detached.stage.onpointerdown({button:0,pointerId:3,clientX:0,clientY:0,preventDefault(){}});detached.page.isConnected=false;detached.mutation.callback();assert.equal(detached.captured,null);assert.equal(detached.resize.disconnects,1);assert.equal(detached.stage.onpointerdown,null);
const replaced=mount(model);replaced.host.innerHTML='<p>New lesson content</p>';replaced.mutation.callback();assert.equal(replaced.resize.disconnects,1,'Replacing the scene inside a still-connected host destroys the retired viewer');assert.equal(replaced.stage.onpointerdown,null);
const reused=mount(model),retiredYaw=reused.$('yaw');const successor=createSpinColorViewer({container:reused.host,data:model});reused.mutation.callback();assert.equal(retiredYaw.oninput,null);const newYaw=reused.$('yaw');assert.equal(typeof newYaw.oninput,'function','Old observer cleanup cannot disable a replacement viewer in the same host');newYaw.value='32';newYaw.oninput();assert.equal(successor.getView().yaw,32);successor.destroy();
const separate1=mount(model),separate2=mount(model);assert.notEqual(separate1.svg.querySelector('marker').id,separate2.svg.querySelector('marker').id,'Multiple viewers have independent marker references');separate1.camera.destroy();separate2.camera.destroy();
const persisted=mount(model);input(persisted,'zoom',2);mode(persisted,'pan');key(persisted,'ArrowRight');key(persisted,'ArrowDown');const panSnapshot=persisted.camera.getView();assert.equal(panSnapshot.dragMode,'pan');assert.ok(panSnapshot.panCenter.x>.5&&panSnapshot.panCenter.y>.5);persisted.camera.destroy();
const rehydrated=mount(model,{width:390,initialView:panSnapshot});assert.equal(rehydrated.$('drag-mode').value,'pan');assert.deepEqual(pose(rehydrated.camera.getView()),pose(panSnapshot));sameCenter(rehydrated.camera.getView().panCenter,panSnapshot.panCenter);const unaliased=rehydrated.camera.getView();unaliased.panCenter.x=0;assert.notEqual(rehydrated.camera.getView().panCenter.x,0,'Saved camera snapshots do not alias live center state');rehydrated.host.measuredWidth=760;rehydrated.resize.callback();sameCenter(rehydrated.camera.getView().panCenter,panSnapshot.panCenter);assert.equal(rehydrated.camera.getView().dragMode,'pan');rehydrated.$('reset').onclick();assert.deepEqual(rehydrated.camera.getView().panCenter,{x:.5,y:.5});assert.equal(rehydrated.camera.getView().dragMode,'rotate');rehydrated.camera.destroy();
const invalidCenter=mount(model,{initialView:{zoom:2,dragMode:'other',panCenter:{x:Infinity,y:-1}}});assert.equal(invalidCenter.camera.getView().dragMode,'rotate');assert.deepEqual(invalidCenter.camera.getView().panCenter,{x:.5,y:.5});invalidCenter.camera.destroy();
const invalidView=mount(model,{initialView:null});assert.deepEqual(invalidView.camera.getView(),{yaw:-28,pitch:24,zoom:1,showReference:true,showLabels:true,dragMode:'rotate',panCenter:{x:.5,y:.5}});invalidView.camera.destroy();

// Environments without ResizeObserver still release their window listener.
delete globalThis.ResizeObserver;let fallback=null,removed=0;globalThis.addEventListener=(name,fn)=>{assert.equal(name,'resize');fallback=fn;};globalThis.removeEventListener=(name,fn)=>{if(name==='resize'&&fn===fallback)removed++;};
const legacyResize=mount(model);legacyResize.host.measuredWidth=330;fallback();assert.equal(box(legacyResize)[2],330);legacyResize.camera.destroy();assert.equal(removed,1);delete globalThis.addEventListener;delete globalThis.removeEventListener;

const source=fs.readFileSync(new URL('../dist/spincolor-viewer.js',import.meta.url),'utf8'),locale=read('../locales/en-spincolor-responsive.json'),translations={...loadEnglishCatalog(),...locale};
for(const item of jsStrings(source))for(const unit of textUnits(item.value))if(HAN.test(unit))assert.ok(translations[unit.trim()],'Missing responsive viewer translation: '+unit);
for(const [s,t]of Object.entries(locale)){assert.ok(source.includes(s));assert.ok(t.trim()&&!HAN.test(t));}
const css=fs.readFileSync(new URL('../dist/symmetry-course.css',import.meta.url),'utf8');assert.match(css,/\.gx-viewer \.gx-stage\{[^}]*max-width:100%[^}]*overflow:auto/);assert.match(css,/\.gx-viewer \.gx-site-label\{font-size:17px/);assert.match(css,/\.gx-viewer \.gx-stage svg\{[^}]*min-height:0/);assert.match(css,/\.gx-site-key bdi\{overflow-wrap:anywhere/);
console.log('Responsive spin/color viewer: 49 actual Python scenes, all frames at 240/390/760px, full geometry and arrow/axis bounds, pixel-sized labels and complete site keys, fixed frame envelope, unwrapped displacement, pan/zoom/keyboard/drag/reset, resize and observer cleanup, stale callbacks and English coverage passed.');
