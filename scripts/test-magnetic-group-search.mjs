import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Element,flush} from './test-material-research-ui.mjs';

const groups=JSON.parse(readFileSync(new URL('../dist/data/magnetic-groups.json',import.meta.url))).groups;
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

for(const edition of ['../dist/','../dist/en/']){
 const address=file=>new URL(edition+file,import.meta.url);
 const {toolsIndex}=await import(address('navigation-ui.js'));
 const {finderResults,startToolFinder}=await import(address('tool-finder.js'));
 const {isFullMagneticGroupQuery,matchMagneticGroupQuery}=await import(address('magnetic-group-query.js'));
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

 const source=readFileSync(address('app.js'),'utf8');
 const renderSource=source.slice(source.indexOf('function renderDatabase('),source.indexOf('\nfunction activeContext('));
 const atlasBranch=source.match(/else if\(\/\^atlas.*?state\.dbType='all';\}/u)?.[0];
 assert.ok(atlasBranch,'Atlas navigation restores the catalog from the route');
 const state={};
 let rows,calculations=0;
 const host={};
 const render=vm.runInNewContext('('+renderSource.trim()+')',{state,matchMagneticGroupQuery,list:()=>groups,gid:g=>g.id,esc:String,modeButtons:()=>'',
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
 assert.equal(calculations,0,'Search and atlas navigation alone never calculate');
 console.log(`Magnetic group search (${edition.includes('/en/')?'English':'Chinese'}): exact catalog IDs, partial searches, canonical navigation and no calculation passed.`);
}
