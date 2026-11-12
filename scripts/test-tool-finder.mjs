import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,flush} from './test-material-research-ui.mjs';
import {finderResults,normalizeFinderText,startToolFinder} from '../dist/tool-finder.js';
import {toolsIndex} from '../dist/navigation-ui.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/search-index.json',import.meta.url),'utf8')).entries;
assert.equal(normalizeFinderText(' C₄v / Clebsch–Gordan '),'c4v / clebsch gordan');
assert.equal(finderResults([...toolsIndex,...catalog],'225',{scope:'groups'})[0].route,'atlas/sg?q=225');
assert.equal(finderResults([...toolsIndex,...catalog],'Clebsch-Gordan')[0].route,'compute/lie/su3_cg');
assert.equal(finderResults([...toolsIndex,...catalog],'SU(3) 27')[0].route,'compute/lie/su3_ninej');
assert.ok(finderResults([...toolsIndex,...catalog],'C₄v',{scope:'all'}).length);
assert.equal(finderResults([...toolsIndex,...catalog],'',{scope:'courses'}).length,0);
assert.equal(finderResults([...toolsIndex,...toolsIndex],'',{scope:'tools',limit:100}).length,74);
assert.equal(finderResults(toolsIndex,'U1')[0].route,'compute/lie/u1');
assert.equal(finderResults(toolsIndex,'interferometer')[0].route,'compute/lie/interferometer');
assert.equal(finderResults(toolsIndex,'Rabi')[0].route,'compute/lie/rabi');
assert.equal(finderResults([{route:'javascript:alert(1)',title:'bad',kind:'计算'}],'bad').length,0);
assert.ok(finderResults([...toolsIndex,...catalog],'Young',{scope:'courses'}).every(x=>x.kind==='课程'));

// Extend the shared lightweight DOM adapter only for native dialog/event behavior.
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
const body=new Element('body',{}, {isConnected:true});
const documentEvents={};
globalThis.document={body,activeElement:body,createElement:tag=>new Element(tag),
 addEventListener(name,fn){(documentEvents[name]??=[]).push(fn);},
 removeEventListener(name,fn){documentEvents[name]=(documentEvents[name]||[]).filter(x=>x!==fn);}};
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
let requests=0,reject=true,release;
globalThis.fetch=async url=>{requests++;assert.match(String(url),/search-index/);if(reject)throw Error('offline');if(release===null)await new Promise(r=>release=r);return {ok:true,json:async()=>({entries:[...catalog,{route:'classroom/foundations?lesson=safe',kind:'课程',title:'<img src=x onerror=bad>',summary:'safe text'}]})};};
const button=body.appendChild(new Element('button')),routes=[];
const controller=startToolFinder({button,onNavigate:route=>routes.push(route)});
const dialog=body.querySelector('dialog'),input=dialog.querySelector('input'),status=dialog.querySelector('#tool-finder-status'),list=dialog.querySelector('#tool-finder-results');
const key=(name,options={})=>{let prevented=false;for(const fn of documentEvents.keydown||[])fn({key:name,preventDefault(){prevented=true;},...options});return prevented;};
const scope=id=>dialog.querySelector(`[data-finder-scope="${id}"]`).fire('click');
const type=value=>{input.value=value;input.fire('input');};

assert.equal(requests,0,'Creating the global finder does not fetch a catalog');
button.focus();button.fire('click');assert.equal(dialog.hidden,false);assert.equal(document.activeElement,input);assert.equal(requests,0);
assert.ok(list.querySelectorAll('[data-finder-result]').length);assert.equal(input.getAttribute('aria-activedescendant'),'tool-finder-result-0');
assert.equal(key('ArrowDown'),true);assert.equal(input.getAttribute('aria-activedescendant'),'tool-finder-result-1');
type('Clebsch-Gordan');assert.match(list.innerHTML,/CG/);assert.equal(requests,0,'Tool-only search uses the local tool catalog');
key('Enter');assert.equal(routes[0],'compute/lie/su3_cg');assert.equal(dialog.hidden,true);assert.equal(document.activeElement,button);
assert.equal(key('k',{metaKey:true}),true);assert.equal(dialog.hidden,false);
type('225');scope('groups');await flush();assert.equal(requests,1);assert.ok(status.querySelector('[data-finder-retry]'));assert.match(status.innerHTML,/工具/);
type('225.1');await flush();assert.equal(requests,1,'Failed requests wait for explicit retry');
reject=false;release=null;type('225');status.querySelector('[data-finder-retry]').fire('click');await flush();assert.equal(requests,2);assert.match(status.textContent,/正在读取/);
key('Escape');assert.equal(dialog.hidden,true);release();await flush();assert.equal(dialog.hidden,true,'A late catalog response never reopens the finder');assert.equal(document.activeElement,button);
key('k',{ctrlKey:true});type('225');scope('groups');await flush();assert.equal(requests,2);assert.match(list.innerHTML,/空间群 225/);
key('Enter');assert.equal(routes.at(-1),'atlas/sg?q=225');
key('k',{ctrlKey:true});type('Young');scope('courses');await flush();assert.equal(requests,2,'A loaded shared catalog is reused');assert.match(list.innerHTML,/Young/);
type('<img');assert.match(list.innerHTML,/&lt;img/);assert.doesNotMatch(list.innerHTML,/<img /);
const first=dialog.querySelector('[data-finder-close]'),last=dialog.querySelector('[data-finder-scope="materials"]');
last.focus();key('Tab');assert.equal(document.activeElement,first);first.focus();key('Tab',{shiftKey:true});assert.equal(document.activeElement,last);
key('Escape');assert.equal(dialog.hidden,true);assert.equal(document.activeElement,button);
controller.destroy();assert.equal(body.querySelector('dialog'),null);assert.equal(documentEvents.keydown.length,0);
console.log('Tool finder: 74 tools including all previous tools, normalized queries, exact groups, scopes, lazy/retry/cached catalogs, keyboard selection, focus restoration/trap, safe output and cleanup passed.');
