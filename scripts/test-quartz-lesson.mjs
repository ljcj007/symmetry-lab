import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute} from '../dist/classroom-ui.js';

const edition=process.argv.includes('--english')?'en/':'';
const source=new URL('../dist/'+edition,import.meta.url);
const {renderFrontiersView}=await import(new URL('frontiers-ui.js',source));
const catalog=JSON.parse(fs.readFileSync(new URL('data/frontiers-materials.json',source),'utf8'));
const quartz=catalog.cases.find(record=>record.id==='quartz-analogy');
const polar=catalog.cases.find(record=>record.id==='polar-analogy');
let runs=0,writes=0;
globalThis.fetch=async url=>{
 assert.match(String(url),/^data\/frontiers-materials\.json\?v=/);
 return {ok:true,json:async()=>structuredClone(catalog)};
};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={createElement:tag=>new Element(tag),compatMode:'CSS1Compat'};
async function mount(selection){
 const container=new Container();
 await renderFrontiersView({container,selection,run:()=>{runs++;}});
 await flush();
 return container;
}
const lessonRoute='#classroom/observables?module=chirality&lesson=chiral-mirror';
const atlasRoute='#atlas/frontiers?module=chirality&material=quartz-analogy';
const structureRoute='#structure?quartz-hand=practice';
const compareRoute='#crystkit?preset=quartz-handedness';
const generalCompare='#crystkit?preset=handedness';
const decodeHref=node=>node.getAttribute('href').replaceAll('&amp;','&');
const links=root=>root.querySelectorAll('a').map(decodeHref);
const testPanel=(root,returnRoute)=>{
 const panels=root.querySelectorAll('[data-quartz-handedness-activity]');
 assert.equal(panels.length,1);
 const panel=panels[0],answer=panel.querySelector('[data-quartz-handedness-answer]');
 assert.equal(panel.tag,'details');
 assert.equal(panel.open,false);
 assert.equal(answer.tag,'details');
 assert.equal(answer.open,false);
 assert.deepEqual(links(panel).slice(0,2),[structureRoute,compareRoute]);
 assert.ok(links(panel).includes(returnRoute));
 assert.ok(links(panel).includes('https://doi.org/10.1127/ejm/2/1/0063'));
 const archive=panel.querySelectorAll('a').find(anchor=>anchor.textContent.includes('9005017'));
 assert.match(decodeHref(archive),/0c59e4b1f626a276cd463f3abbcc0fc97376c6d9/);
 assert.match(archive.textContent,/9005017.+291351/);
 assert.match(panel.querySelector('summary').textContent,edition?/mirror image or change of basis/iu:/镜像还是换基/u);
 assert.match(answer.innerHTML,/154、152、154|154, 152, and 154/u);
 assert.match(answer.innerHTML,/I 和 −I|I and −I/u);
 if(edition)for(const tag of ['summary','p','li','a']){
  for(const node of panel.querySelectorAll(tag))assert.doesNotMatch(node.textContent,/[\u3400-\u9fff]/u);
 }
 return panel;
};

const lessonSelection=parseClassroomRoute(lessonRoute);
assert.equal(lessonSelection.section,'frontiers');
assert.equal(lessonSelection.lesson,'chiral-mirror');
const lesson=await mount(lessonSelection);
testPanel(lesson,atlasRoute);
assert.ok(lesson.querySelector('[data-learning-bridge="chiralityActions"]'));
assert.ok(lesson.querySelector('#pw-to-lab'));
assert.ok(links(lesson).includes(generalCompare));

const previousTopic=lesson.querySelector('#pw-lesson');
previousTopic.onchange({target:{value:'chiral-polarity'}});
await flush();
assert.ok(lesson.querySelector('[data-learning-bridge="chiralityActions"]'));
assert.equal(lesson.querySelector('[data-quartz-handedness-activity]'),null);
assert.ok(links(lesson).includes(generalCompare));

// The atlas rewrites its URL to this frontiers course selection in app.js.
const query=new URLSearchParams(atlasRoute.split('?')[1]);
query.set('tab','cases');
const atlas=await mount({...parseClassroomRoute('#classroom/crystal?'+query),embeddedOnly:true,atlasOnly:true});
const panel=testPanel(atlas,lessonRoute);
const quartzCard=panel.parentNode;
assert.equal(quartzCard.querySelector('h2').textContent,quartz.title);
assert.equal(quartzCard.querySelector('.obs-links').querySelector('a').getAttribute('href').includes('preset=chiral-d3'),true);
const polarCard=atlas.querySelectorAll('article').find(card=>card.querySelector('h2').textContent===polar.title);
assert.ok(polarCard);
assert.ok(links(polarCard).some(link=>link.includes('preset=chiral-polar')));
assert.equal(polarCard.querySelector('[data-quartz-handedness-activity]'),null);

assert.equal(runs,0);
assert.equal(writes,0);
console.log('Quartz lesson ('+(edition?'EN':'CN')+'): paired tool entry, folded answer, archive, both original cases, and no run or progress writes verified.');
