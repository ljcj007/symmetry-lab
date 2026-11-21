import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const groups=JSON.parse(readFileSync(new URL('../dist/data/magnetic-groups.json',import.meta.url))).groups;
const spaceGroups=JSON.parse(readFileSync(new URL('../dist/data/space-groups.json',import.meta.url))).groups;
const routeFor=id=>'atlas/msg?q='+id;
const expectedOg=new Map(groups.map(group=>[routeFor(group.id),group.ogId]));
assert.equal(expectedOg.size,1651);
assert.equal(new Set(expectedOg.values()).size,expectedOg.size);

Element.prototype.showModal=function(){this.setAttribute('open','');};
Element.prototype.close=function(){this.removeAttribute('open');};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Element.prototype.addEventListener=function(name,handler){(this.events??={})[name]??=[];this.events[name].push(handler);};
Element.prototype.removeEventListener=function(name,handler){this.events[name]=this.events[name].filter(fn=>fn!==handler);};
Element.prototype.fire=function(name){for(const handler of this.events?.[name]??[])handler({target:this,preventDefault(){}});};
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.remove=function(){this.parentNode.children=this.parentNode.children.filter(child=>child!==this);};

for(const edition of process.argv.includes('--source-only')?['../dist/']:['../dist/','../dist/en/']){
 const address=file=>new URL(edition+file,import.meta.url);
 const {toolsIndex,renderNavigationHub}=await import(address('navigation-ui.js'));
 const {finderResults,startToolFinder}=await import(address('tool-finder.js'));
 const {isFullMagneticGroupQuery,matchMagneticGroupQuery}=await import(address('magnetic-group-query.js'));
 const {spaceGroupNumberForQuery,spaceGroupSymbolKey,canMatchExactGroup,matchExactGroups}=await import(address('tool-search.js'));
 const index=JSON.parse(readFileSync(address('data/search-index.json')));
 const indexedGroups=index.entries.filter(item=>item.route.startsWith('atlas/msg?q='));
 assert.equal(indexedGroups.length,expectedOg.size);
 assert.deepEqual(new Map(indexedGroups.map(item=>[item.route,item.summary.match(/^OG (\d+\.\d+\.\d+)$/u)?.[1]])),expectedOg);
 const entries=[...toolsIndex,...index.entries];
 const msgRoutes=(query,scope='groups')=>finderResults(entries,query,{scope})
  .map(item=>item.route).filter(route=>route.startsWith('atlas/msg?q='));
 for(const [query,id]of [
  ['BNS 62.448','62.448'],['BNS No. 62.448','62.448'],['ＢＮＳ：６２．４４８','62.448'],
  ['BNS 编号 62.448','62.448'],['62.448','62.448'],['OG 62.8.509','62.448'],
  ['BNS 1.3','1.3'],['OG 1.3.3','1.3'],['1.3.3','1.3'],['OG 3.7.14','4.11']
 ]){
  const route=routeFor(id);
  assert.deepEqual(msgRoutes(query),[route],query);
  assert.equal(finderResults(entries,query,{scope:'all'})[0]?.route,route,query);
 }
 for(const query of ['BNS 999.999','OG 1.3.9999','BNS 1.3.3'])assert.deepEqual(msgRoutes(query),[],query);
 assert.ok(msgRoutes('BNS 62.').every(route=>route.startsWith('atlas/msg?q=62.')));
 assert.ok(msgRoutes('BNS 62.').length>1);
 assert.ok(msgRoutes('OG 1.3.').includes('atlas/msg?q=1.3'));
 assert.ok(msgRoutes('P_s1').includes('atlas/msg?q=1.3'));
 assert.equal(finderResults(entries,'BNS 1.3')[0]?.route,'compute/advanced/symbolic_spacegroups');
 assert.equal(finderResults(entries,'225',{scope:'groups'})[0]?.route,'atlas/sg?q=225');
 for(const query of ['SG 225','Space group No. 225','空间群编号 225']){
  assert.equal(finderResults(entries,query,{scope:'groups'})[0]?.route,'atlas/sg?q=225',query);
 }
 const symbolQueries=[['C222','21'],['P 4','75'],['P4_1','76'],['P 4₃','78'],['P2_1/c','14'],['Fm3̅m','225']];
 for(const [query,id]of symbolQueries){
  for(const scope of ['groups','all'])assert.equal(finderResults(entries,query,{scope})[0]?.route,'atlas/sg?q='+id,query);
  assert.ok(canMatchExactGroup(query),query);
  assert.deepEqual(matchExactGroups(entries,query).map(item=>item.route),['atlas/sg?q='+id],query);
 }
 for(const group of index.entries.filter(item=>item.route.startsWith('atlas/sg?q='))){
  for(const query of group.symbols){
   assert.ok(canMatchExactGroup(query),edition+' matches every indexed HM alias before load: '+query);
   assert.ok(matchExactGroups(entries,query).some(item=>item.route===group.route),edition+' exact HM: '+query);
  }
 }
 for(const [query,route]of [['SG 225','atlas/sg?q=225'],['230','atlas/sg?q=230'],['BNS 62.448',routeFor('62.448')],['OG 62.8.509',routeFor('62.448')]]){
  assert.ok(canMatchExactGroup(query),query);
  assert.deepEqual(matchExactGroups(entries,query).map(item=>item.route),[route],query);
 }
 assert.ok(canMatchExactGroup('BNS 999.999'),'A complete magnetic identifier still needs an index lookup');
 assert.deepEqual(matchExactGroups(entries,'BNS 999.999'),[],'Unknown identifier never falls back to tool keywords');
 for(const query of ['SG 231','BNS 62.','OG 62.8.','band','band.yaml','CIF','P4 P41 P43',"P4_1'"]){
  assert.equal(canMatchExactGroup(query),false,query);
  assert.deepEqual(matchExactGroups(entries,query),[],query);
 }
 assert.ok(finderResults(entries,'P4',{scope:'groups'}).some(item=>item.route==='atlas/sg?q=76'),'Exact symbols retain related partial results');
 assert.ok(finderResults(entries,"P4_1'",{scope:'groups'}).every(item=>item.route!=='atlas/sg?q=76'),'A prime must not disappear from the symbol');
 for(const query of ['P4 P41 P43','P4 P4_1 P4_3','P4 P4₁ P4₃']){
  assert.equal(finderResults(entries,query,{scope:'courses'})[0]?.route,'classroom/crystal?lesson=space-01&track=space',query);
 }

 for(const query of ['BNS 62.448','62.448','OG 62.8.509','62.8.509','ＢＮＳ：６２．４４８'])assert.equal(isFullMagneticGroupQuery(query),true,query);
 for(const query of ['BNS 62.','OG 62.8.','225','BNS 1.3.3','CG 1.3'])assert.equal(isFullMagneticGroupQuery(query),false,query);

 const body=new Element('body'),documentEvents=new Map();
 globalThis.document={body,activeElement:body,createElement:tag=>new Element(tag),
  addEventListener(type,listener){documentEvents.set(type,listener);},
  removeEventListener(type){documentEvents.delete(type);}};
 let fetches=0,resolveCatalog,rejectCatalog;
 globalThis.fetch=url=>{
  assert.match(String(url),/search-index\.json/);
  fetches++;
  return new Promise((resolve,reject)=>{resolveCatalog=resolve;rejectCatalog=reject;});
 };
 const launches=[];
 const button=body.appendChild(new Element('button'));
 const finder=startToolFinder({button,onNavigate:route=>launches.push(route)});
 button.fire('click');
 const dialog=body.querySelector('dialog');
 const input=dialog.querySelector('#tool-finder-query');
 const setQuery=value=>{input.value=value;input.fire('input');};
 const setScope=scope=>dialog.querySelector(`[data-finder-scope="${scope}"]`).fire('click');
 const results=()=>dialog.querySelectorAll('[data-finder-result]');
 const enter=()=>documentEvents.get('keydown')({key:'Enter',preventDefault(){}});
 setScope('tools');
 setQuery('BNS 1.3');
 assert.equal(fetches,0);
 assert.ok(results().length>0,'The explicit tools scope retains its ordinary tool candidates');
 setScope('all');
 await flush();
 assert.equal(fetches,1);
 for(const value of ['BNS 1.3','1.3','OG 1.3.3','1.3.3']){
  setQuery(value);
  assert.equal(results().length,0,`Hold the result list until the catalog is available: ${value}`);
  enter();
  assert.deepEqual(launches,[]);
 }
 setQuery('DMI');
 assert.ok(results().length>0,'Ordinary discovery continues during the catalog load');
 setQuery('BNS 1.3');
 rejectCatalog(Error('Catalog unavailable'));
 await flush();
 assert.equal(results().length,0,'Failure preserves the intent rather than substituting a tool');
 enter();
 assert.deepEqual(launches,[]);
 setScope('tools');
 assert.ok(results().length>0,'Users can still explicitly search tools after a catalog failure');
 setScope('all');
 dialog.querySelector('[data-finder-retry]').fire('click');
 await flush();
 assert.equal(fetches,2);
 assert.equal(results().length,0);
 resolveCatalog({ok:true,json:async()=>index});
 await flush();
 assert.equal(results()[0].querySelector('small').textContent,'OG 1.3.3');
 enter();
 assert.deepEqual(launches,['atlas/msg?q=1.3']);
 button.fire('click');
 setQuery('OG 1.3.3');
 setScope('groups');
 await flush();
 assert.equal(fetches,2,'The warmed catalog does not request a second copy');
 assert.equal(results().length,1);
 enter();
 assert.deepEqual(launches,['atlas/msg?q=1.3','atlas/msg?q=1.3']);
 finder.destroy();

 const mountSearch=async view=>{
  const container=new Container();
  await renderNavigationHub({container,view});
  const field=container.querySelector('#site-search');
  return {
   container,
   search(value){field.value=value;field.oninput();},
   routes(){return container.querySelector('#site-search-results').querySelectorAll('a').map(a=>a.dataset.route);}
  };
 };
 const home=await mountSearch('home');
 assert.equal(fetches,2,'The in-page catalog waits for interaction');
 home.search('BNS 1.3');
 await flush();
 assert.equal(fetches,3);
 assert.deepEqual(home.routes(),[],'The homepage does not offer substitute tools for a complete group number while loading');
 home.search('DMI');
 assert.ok(home.routes().includes('compute/exchange-symmetry-lab'),'Ordinary tool search is available during loading');
 home.search('BNS 62.448');
 rejectCatalog(Error('Catalog unavailable'));
 await flush();
 assert.deepEqual(home.routes(),[]);
 const retry=home.container.querySelector('#search-retry').onclick();
 await flush();
 assert.equal(fetches,4);
 resolveCatalog({ok:true,json:async()=>index});
 await retry;
 const atlas=await mountSearch('atlas');
 for(const page of [home,atlas]){
  for(const [query,expected]of [['BNS 62.448','62.448'],['OG 1.3.3','1.3'],['BNS 编号 62.448','62.448']]){
   page.search(query);
   await flush();
   assert.deepEqual(page.routes().filter(route=>route.startsWith('atlas/msg?q=')),[routeFor(expected)],query);
   assert.equal(page.routes()[0],routeFor(expected),query);
  }
  for(const query of ['225','SG 225','Space group No. 225','空间群编号 225']){
   page.search(query);
   assert.equal(page.routes()[0],'atlas/sg?q=225',query);
  }
  for(const [query,id]of symbolQueries){
   page.search(query);
   assert.equal(page.routes()[0],'atlas/sg?q='+id,query);
  }
  page.search('BNS 62.');
  assert.ok(page.routes().filter(route=>route.startsWith('atlas/msg?q=62.')).length>1);
 }
 assert.equal(fetches,4,'Homepage and atlas share the warmed catalog');

 const source=readFileSync(address('app.js'),'utf8');
 const renderSource=source.slice(source.indexOf('function renderDatabase('),source.indexOf('\nfunction activeContext('));
 const atlasBranch=source.match(/else if\(\/\^atlas.*?state\.dbType='all';\}/u)?.[0];
 assert.ok(atlasBranch,'Atlas navigation restores the catalog from the route');
 const state={};
 let rows,calculations=0;
 const host={};
 const render=vm.runInNewContext('('+renderSource.trim()+')',{state,matchMagneticGroupQuery,spaceGroupNumberForQuery,spaceGroupSymbolKey,
  list:()=>state.dbMode==='sg'?spaceGroups:groups,gid:g=>state.dbMode==='sg'?String(g.number):g.id,esc:String,modeButtons:()=>'',
  tableHTML(_,values){rows=values;return '';},crystalSpan:String,gtitle:g=>g.bcSymbol||g.symbol,lattices:{},$:()=>host,$$:()=>[],
  calculate(){calculations++;},history:{replaceState(){}}});
 const open=vm.runInNewContext(`route=>{let view,primary;const [path,query]=route.split('?');const params=new URLSearchParams(query);if(false){}${atlasBranch}return [view,primary];}`,{state,URLSearchParams});
 assert.deepEqual(Array.from(open(launches[0])),['database','atlas']);
 render();
 assert.deepEqual(Array.from(rows,row=>[row[0],row[3]]),[['1.3','1.3.3']]);
 open('atlas/msg?q='+encodeURIComponent('BNS 62.448'));
 render();
 assert.deepEqual(Array.from(rows,row=>[row[0],row[3]]),[['62.448','62.8.509']]);
 state.dbType='4';
 render();
 assert.equal(rows.length,0,'Type filtering still applies to the exact result');
 open('atlas/msg?q='+encodeURIComponent('OG 999.9.9999'));
 render();
 assert.equal(rows.length,0);
 open('atlas/msg?q='+encodeURIComponent('BNS 62.'));
 render();
 assert.ok(rows.length>1);
 assert.ok(rows.every(row=>row[0].startsWith('62.')));
 for(const [query,id]of [['4','4'],['SG 22','22'],['Space group No. 225','225'],['空间群编号 225','225']]){
  open('atlas/sg?q='+encodeURIComponent(query));
  render();
  assert.deepEqual(Array.from(rows,row=>row[0]),[id],query);
 }
 for(const [query,id]of symbolQueries){
  open('atlas/sg?q='+encodeURIComponent(query));
  render();
  assert.deepEqual(Array.from(rows,row=>row[0]),[id],query);
  assert.equal(host.innerHTML.includes('href="#classroom/crystal?track=space&amp;lesson=space-01"'),['75','76','78'].includes(id),query);
 }
 open('atlas/sg?q='+encodeURIComponent('Pnma'));
 render();
 assert.ok(Array.from(rows,row=>row[0]).includes('62'),'Symbol text still searches the ordinary catalog');
 assert.equal(calculations,0,'Search and atlas navigation alone never calculate');
 console.log(`Group search (${edition.includes('/en/')?'English':'Chinese'}): exact catalog IDs, partial searches, home and atlas searches, canonical navigation and no calculation passed.`);
}
