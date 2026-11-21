import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const english=process.argv.includes('--english');
const edition=english?'../dist/en/':'../dist/';
const url=file=>new URL(edition+file,import.meta.url);
const app=readFileSync(url('app.js'),'utf8');
const read=(file,field)=>JSON.parse(readFileSync(new URL('../dist/data/'+file+'.json',import.meta.url),'utf8'))[field];
const groups={sg:read('space-groups','groups'),msg:read('magnetic-groups','groups'),mpg:read('points','points')};
const {matchMagneticGroupQuery,isFullMagneticGroupQuery}=await import(url('magnetic-group-query.js'));
const {spaceGroupNumberForQuery}=await import(url('tool-search.js'));
const id=(group,mode)=>mode==='sg'?String(group.number):group.id;
const title=group=>group.bcSymbol||group.symbol;
const chosenK=[.125,-.25,.375];
const noop=()=>{};
const section=(start,end)=>{
 const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from,start);
 return app.slice(from,to);
};
const code=[
 section('function selectGroup(', '\nlet dictionaryController'),
 section('function bindWorkbench(){','\nfunction matrixHTML')
].join('\n');

function workbench(mode,initialId=id(groups[mode][0],mode)){
 const group=groups[mode].find(g=>id(g,mode)===initialId);
 const state={mode,group,view:'workbench',k:chosenK.slice(),busy:false,doubleValued:true,calculationTicket:0,labelK:'X',bzType:'representative'};
 const gid=(g=state.group,m=state.mode)=>id(g,m);
 const gtitle=(g=state.group)=>title(g);
 const selectedLabel=()=>gid()+'   '+gtitle();
 const input={value:selectedLabel(),events:{},addEventListener(name,handler){this.events[name]=handler;},select:noop};
 const coordinates=chosenK.map(value=>({value:String(value)}));
 const requests=[],errors=[];
 let buttons=[];
 const popup={hidden:true,html:'',
  classList:{add(){popup.hidden=true;},remove(){popup.hidden=false;},contains(){return popup.hidden;}},
  set innerHTML(html){this.html=html;buttons=Array.from(html.matchAll(/data-select="([^"]+)"/g),match=>({
   dataset:{select:match[1]},click(){this.onclick();}
  }));}
 };
 const other={onclick:null};
 const context={
  state,gid,gtitle,list:m=>groups[m],esc:String,crystalSpan:String,lattices:{},parseNumber:Number,
  matchMagneticGroupQuery,isFullMagneticGroupQuery,spaceGroupNumberForQuery,
  $:selector=>selector==='#group-search'?input:selector==='#group-options'?popup:
   selector==='#group-options button'?buttons[0]:selector.startsWith('#k-')?coordinates[Number(selector.at(-1))]:other,
  $$:selector=>selector==='button'?buttons:[],
  render(){input.value=selectedLabel();popup.hidden=true;},renderResults:noop,exportJSON:noop,exportCSV:noop,
  showError:error=>errors.push(error),cancelPython:noop,workbenchSource:noop,toast:noop,
  runPythonTask(action,payload){requests.push({action,payload,id:gid()});return {};}
 };
 vm.createContext(context);
 vm.runInContext(code,context);
 context.bindWorkbench();
 return {state,popup,requests,errors,input,calculate:context.calculate,
  focus:()=>input.events.focus(),
  type(query){input.value=query;input.events.input();return buttons.map(b=>b.dataset.select);},
  key(key){input.events.keydown({key,preventDefault:noop});},
  chooseSuggestion(index,idOverride){const button=buttons[index];if(idOverride!==undefined)button.dataset.select=idOverride;button.click();}
 };
}

for(const [mode,query,expected] of [
 ['sg','21','21'],['sg','222','222'],['sg','SG 4','4'],['sg','Space group No. 4','4'],['sg','空间群编号 21','21'],
 ['msg','4.11','4.11'],['msg','BNS No. 62.448','62.448'],['msg','OG 62.8.509','62.448'],['msg','ＯＧ：６２．８．５０９','62.448'],['msg','1.3.3','1.3']
]){
 const byKey=workbench(mode);
 assert.deepEqual(byKey.type(query),[expected],query);
 if(mode==='msg')assert.match(byKey.popup.html,/ · OG \d+\.\d+\.\d+/);
 byKey.key('Enter');
 assert.equal(id(byKey.state.group,mode),expected,query+' keyboard');
 assert.deepEqual(Array.from(byKey.state.k),[0,0,0],query+' changing the group keeps the established Gamma reset');
 assert.equal(byKey.state.doubleValued,true);
 assert.deepEqual(byKey.requests,[]);

 const direct=workbench(mode);
 direct.type(query);
 assert.equal(await direct.calculate(),true,query+' calculation');
 assert.equal(direct.requests[0]?.action,'analyze');
 assert.equal(direct.requests[0]?.id,expected);
 assert.equal(direct.requests[0]?.payload.operations,groups[mode].find(g=>id(g,mode)===expected).operations);
 assert.deepEqual(Array.from(direct.requests[0]?.payload.k),chosenK);
 assert.equal(direct.requests[0]?.payload.doubleValued,true);
 assert.equal(direct.state.labelK,null);
 assert.equal(direct.state.bzType,'');
}

for(const [mode,query] of [
 ['sg','OG 62.8.509'],['msg','SG 21'],['mpg','OG 62.8.509'],['sg','SG 999'],['msg','BNS 999.999']
]){
 const page=workbench(mode);
 assert.deepEqual(page.type(query),[]);
 assert.equal(await page.calculate(),false);
 assert.equal(page.errors.length,1);
 assert.deepEqual(page.requests,[]);
 assert.equal(page.state.mode,mode);
}
const partial=workbench('msg');
const suggestions=partial.type('BNS 62.');
assert.ok(suggestions.length>1&&suggestions.every(g=>g.startsWith('62.')));
assert.equal(await partial.calculate(),false,'A BNS prefix is a suggestion, not a completed calculation input');
assert.deepEqual(partial.requests,[]);

const keyboard=workbench('sg','21');
keyboard.focus();
keyboard.key('Enter');
assert.equal(id(keyboard.state.group,'sg'),'21','Enter on untouched selected text must not pick the first catalog row');
assert.deepEqual(Array.from(keyboard.state.k),chosenK);
keyboard.type('4');
keyboard.key('Escape');
keyboard.key('Enter');
assert.equal(id(keyboard.state.group,'sg'),'21','Enter must not activate a dismissed suggestion list');

const current=workbench('msg','62.448');
current.type('OG 62.8.509');
current.key('Enter');
assert.equal(id(current.state.group,'msg'),'62.448');
assert.deepEqual(Array.from(current.state.k),chosenK);
assert.equal(current.state.doubleValued,true);
assert.equal(current.state.bzType,'representative');
assert.equal(current.state.labelK,'X');
assert.equal(current.popup.hidden,true);

const exactSymbol=workbench('sg');
const exactSuggestions=exactSymbol.type('C222');
assert.equal(exactSuggestions[0],'21','An exact symbol must outrank longer symbols in the menu');
assert.ok(exactSuggestions.includes('20'),'The menu still shows longer matching symbols');
exactSymbol.key('Enter');
assert.equal(id(exactSymbol.state.group,'sg'),'21');

const directSymbol=workbench('sg');
directSymbol.type('C222');
assert.equal(await directSymbol.calculate(),true);
assert.equal(directSymbol.requests[0].id,'21','Exact symbols resolve identically for Enter and Calculate');
assert.ok(workbench('sg').type('C22').includes('20'),'Partial symbols remain browseable');

const stale=workbench('msg');
stale.type('1.3');
stale.chooseSuggestion(0,'unavailable');
assert.equal(id(stale.state.group,'msg'),'1.1','An option whose ID no longer exists cannot clear the selected group');
stale.type('1.3');
stale.state.mode='mpg';
stale.state.group=groups.mpg[0];
stale.chooseSuggestion(0);
assert.equal(id(stale.state.group,'mpg'),id(groups.mpg[0],'mpg'),'A stale MSG option cannot select a matching MPG ID');

const bySymbol=workbench('sg');
const SG4=groups.sg.find(g=>g.number===4);
assert.ok(bySymbol.type(title(SG4)).includes('4'),'Symbol suggestions remain supported');
assert.equal(await bySymbol.calculate(),true);
assert.equal(bySymbol.requests[0].id,'4');

console.log(`Workbench group numbers (${english?'English':'Chinese'}): exact SG, BNS and OG calculations; keyboard, origin and spin preservation; scoped prefix and symbol lookups.`);
