import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderClassroomView}=await import(new URL('classroom-ui.js',edition));
const catalogs=new Map(['pointgroup-lessons','pointgroup-atlas','symmetry-course-lessons','symmetry-course-atlas']
 .map(name=>[name,JSON.parse(fs.readFileSync(new URL('data/'+name+'.json',edition),'utf8'))]));
globalThis.fetch=async url=>{
 const name=String(url).split('?')[0].split('/').at(-1).replace(/\.json$/u,'');
 assert.ok(catalogs.has(name),String(url));
 return {ok:true,json:async()=>catalogs.get(name)};
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
globalThis.localStorage={getItem:()=>null,setItem(){}};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]??null;}});
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};

const run=()=>assert.fail('Course navigation must not run Python');
const mount=async route=>{
 const page=new Container();
 await renderClassroomView({container:page,route,run,loadProgression:async()=>({progressionForSelection:()=>({current:null})})});
 return page;
};
const link=(root,href)=>root.querySelectorAll('a').find(anchor=>anchor.getAttribute('href')?.replaceAll('&amp;','&')===href);
const label=(root,href,expected)=>assert.equal(link(root,href)?.textContent,expected);
const pgTitle=(page,id)=>assert.equal(page.querySelector('.pg-lesson-heading').querySelector('h2').textContent,catalogs.get('pointgroup-lessons').lessons.find(lesson=>lesson.id===id).title);
const sgTitle=(page,id)=>assert.equal(page.querySelector('.sc-lesson').querySelector('h2').textContent,catalogs.get('symmetry-course-lessons').lessons.find(lesson=>lesson.id===id).title);
const basicsRoute='#classroom/foundations?lesson=group-basics';
const pgAtlasRoute='#classroom/foundations?tab=atlas';
const identifyRoute='#classroom/foundations?tab=learn&lesson=thirty-two';
const bridgeRoute='#classroom/foundations?lesson=from-point-to-space';
const prefix='#classroom/crystal?tab=learn&lesson=';
const spaceRoute=prefix+'space-01&track=space';
const blochRoute=prefix+'space-05&track=space';

const zero=await mount('#classroom/start?lesson=next');
const starterLinks=zero.querySelector('.zs-next-grid');
assert.ok(link(starterLinks,basicsRoute));
assert.ok(link(starterLinks,'#classroom/foundations?module=demos&experiment=water'));
assert.ok(link(starterLinks,'#classroom/crystal?track=space'));
const basics=await mount(basicsRoute);
pgTitle(basics,'group-basics');
const sidebar=basics.querySelector('.classroom-topics');
label(sidebar,pgAtlasRoute,english?'Look up the 32 point groups and character tables':'查 32 个点群与特征标表');
assert.ok(link(sidebar,identifyRoute));
const atlas=await mount(pgAtlasRoute);
assert.equal(atlas.querySelectorAll('[data-pg-group]').length,32);
assert.ok(atlas.querySelector('.pg-character-table'));
assert.equal(atlas.querySelector('.pg-lesson-heading'),null);
const identification=await mount(identifyRoute);
pgTitle(identification,'thirty-two');
assert.ok(identification.querySelector('[data-pointgroup-identify-entry]'));

const space=await mount(spaceRoute);
sgTitle(space,'space-01');
const crystalSidebar=space.querySelector('.classroom-topics');
label(crystalSidebar,spaceRoute,english?'First space-group lesson · From lattices to 230 space-group types':'空间群第一课 · 从晶格到 230 个空间群');
label(crystalSidebar,blochRoute,english?'Little groups of k and Bloch phases':'k 小群与 Bloch 相位');
assert.ok(link(crystalSidebar,'#classroom/crystal?tab=lab&experiment=seitz'));
assert.ok(link(space.querySelector('[data-seitz-quotient-entry]'),identifyRoute));
label(space.querySelector('.sc-lesson'),bridgeRoute,english?'Review how point groups connect to space groups →':'复习点群如何连接空间群 →');
sgTitle(await mount(blochRoute),'space-05');
const bridge=await mount(bridgeRoute);
pgTitle(bridge,'from-point-to-space');
assert.ok(link(bridge.querySelector('[data-si-structure-practice]'),'#classroom/crystal?track=space&lesson=space-01'));
sgTitle(await mount('#classroom/crystal?track=space'),'space-01');

console.log('Beginner course links ('+(english?'EN':'CN')+'): 32 atlas cards and a character table, two distinct crystal lessons, the point-group return, and all existing zero-start choices.');
