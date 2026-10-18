import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run the production module against an inert DOM. This isolates loader races and
// stored-progress validation without adding a browser or a test dependency.
const atlas=JSON.parse(fs.readFileSync(new URL('../dist/data/symmetry-course-atlas.json',import.meta.url),'utf8'));
const lessons={
  tracks:[{id:'space',title:'Fixture track',summary:'Fixture'}],
  sources:[{id:'fixture',title:'Fixture source',url:'https://example.org/source'}],
  lessons:[{id:'fixture',track:'space',title:'01 Fixture lesson',summary:'Fixture',objectives:[],sections:[],references:[],
    quiz:Array.from({length:8},(_,i)=>({question:`Question ${i}`,choices:['Correct','Incorrect'],answer:0,explanation:'Fixture explanation'}))}]
};

const dataResponse=url=>({ok:true,json:async()=>url.includes('lessons')?lessons:atlas});
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element {
  constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};this.classList={remove:()=>{}};for(const [name,value] of Object.entries(attributes))if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=value;this.value=attributes.value||'';this.checked=attributes.checked!==undefined;}
  set innerHTML(value){
    for(const child of this.children)child.parentNode=null;
    this.html=value;this.children=[];
    for(const match of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
      const attributes={};
      for(const attr of match[2].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[attr[1]]=attr[2]??'';
      this.children.push(new Element(match[1].toLowerCase(),attributes,this));
    }
  }
  get innerHTML(){return this.html||'';}
  matches(selector){
    if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);
    if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));
    const attr=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);
    return !!attr&&(!attr[1]||attr[1]===this.tag)&&Object.hasOwn(this.attributes,attr[2])&&(attr[3]===undefined||this.attributes[attr[2]]===attr[3]);
  }
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){}
  scrollIntoView(){}
}
class Container {
  set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=value;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}
}

globalThis.localStorage={getItem:()=>'{invalid',setItem:()=>{}};
const waiting=[];
globalThis.fetch=url=>new Promise(resolve=>waiting.push({url,resolve}));
const race=await import('../dist/symmetry-course-ui.js?loader-race');
assert.equal(race.getSymmetryCourseResult(),null,'Export is unavailable until the teaching data has loaded');
const container=new Container();
const pending=race.renderSymmetryCourseView({container});
assert.equal(waiting.length,2);
container.innerHTML='<p>Unrelated scientific tool</p>';
for(const item of waiting)item.resolve(dataResponse(item.url));
await pending;
assert.equal(container.html,'<p>Unrelated scientific tool</p>','A completed background fetch must not replace a different active tool');
const exported=race.getSymmetryCourseResult();
assert.equal(exported.kind,'space-double-magnetic-group-teaching');
assert.equal(exported.selectedGroup.mode,'sg');
assert.equal(exported.selectedGroup.data.number,1);
assert.equal(exported.experiment,null);
assert.deepEqual(exported.sources,lessons.sources);

globalThis.fetch=async()=>({ok:false,status:503});
const retry=await import('../dist/symmetry-course-ui.js?loader-retry');
const errorContainer=new Container();
await retry.renderSymmetryCourseView({container:errorContainer});
assert.match(errorContainer.firstElementChild.innerHTML,/503/);
const retryButton=errorContainer.firstElementChild.querySelector('.sc-retry');
assert.equal(typeof retryButton.onclick,'function');
const retries=[];
globalThis.fetch=url=>new Promise(resolve=>retries.push({url,resolve}));
const retried=retryButton.onclick();
assert.equal(retries.length,2,'A failed fetch must clear the rejected cached promise so the button can retry');
errorContainer.innerHTML='<p>Left during retry</p>';
for(const item of retries)item.resolve(dataResponse(item.url));
await retried;
assert.equal(errorContainer.html,'<p>Left during retry</p>','A late successful retry must respect navigation');
assert.equal(retry.getSymmetryCourseResult().selectedGroup.data.number,1);
retryButton.onclick();
assert.equal(retries.length,2,'A detached retry button must not start another load');

globalThis.fetch=async url=>dataResponse(url);
for(const [index,saved] of ['null','[]','"wrong format"','12','{broken'].entries()){
  globalThis.localStorage={getItem:()=>saved,setItem:()=>{}};
  const module=await import(`../dist/symmetry-course-ui.js?bad-progress-${index}`);
  const page=new Container();
  await module.renderSymmetryCourseView({container:page});
  page.firstElementChild.querySelector('#sc-tab-quiz').onclick();
  assert.match(page.firstElementChild.querySelector('#sc-content').innerHTML,/<strong>0<small> \/ 8<\/small>/,'Malformed stored progress must not produce false completion');
}

let savedProgress;
const mixed={
  'fixture:0':{selected:0,checked:true},
  'fixture:1':{selected:'0',checked:true},
  'fixture:2':{selected:0,checked:'true'},
  'fixture:3':{selected:99,checked:true},
  'fixture:4':{selected:-1,checked:true},
  'fixture:5':{selected:.5,checked:true},
  'fixture:6':{selected:0,checked:false},
  'fixture:7':{selected:1,checked:true},
  'unknown:0':{selected:0,checked:true}
};
globalThis.localStorage={getItem:()=>JSON.stringify(mixed),setItem:(_,value)=>{savedProgress=JSON.parse(value);}};
const progress=await import('../dist/symmetry-course-ui.js?validated-progress');
const progressContainer=new Container(),downloads=[];
await progress.renderSymmetryCourseView({container:progressContainer,download:(content,name)=>downloads.push({content,name})});
const root=progressContainer.firstElementChild;
root.querySelector('#sc-tab-quiz').onclick();
const quizHTML=root.querySelector('#sc-content').innerHTML;
assert.match(quizHTML,/<strong>1<small> \/ 8<\/small>/,'Only a checked, correct, well-typed saved answer counts as mastered');
assert.equal((quizHTML.match(/class="sc-question is-correct"/g)||[]).length,1);
assert.equal((quizHTML.match(/class="sc-question is-incorrect"/g)||[]).length,1);
const changedAnswer=root.querySelectorAll('input[name="sc-answer-0-0"]')[1];
changedAnswer.onchange();
assert.deepEqual(Object.keys(savedProgress).sort(),['fixture:0','fixture:6','fixture:7'],'Unknown questions and malformed answer entries must be discarded before progress is saved again');
assert.deepEqual(savedProgress['fixture:0'],{selected:1,checked:false},'Changing an answer clears its checked status');

root.querySelector('#sc-tab-atlas').onclick();
const selectedCard=root.querySelectorAll('[data-sc-group]').find(button=>button.dataset.scGroup==='2');
assert.ok(selectedCard,'The real 230-space-group catalog includes group 2');
selectedCard.onclick();
root.querySelector('#sc-export-group').onclick();
assert.equal(downloads.length,1);
assert.equal(downloads[0].name,'symmetry-course-sg-2.json');
const downloaded=JSON.parse(downloads[0].content);
assert.equal(downloaded.selectedGroup.data.number,2,'Downloaded teaching data must describe the selected card, not the initial selection');
assert.deepEqual(downloaded.selectedGroup.data,atlas.spaceGroups.find(group=>group.number===2));
assert.deepEqual(downloaded.sources,lessons.sources);

console.log('Advanced course UI: late-navigation isolation, 503 recovery, detached retry, malformed/invalid progress filtering, mastery counts, answer invalidation and selected catalog export passed.');
