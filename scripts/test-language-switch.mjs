import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LANGUAGE_STORAGE_KEY,normalizeLanguage,languageURL,explicitLanguageDestination,readLanguagePreference,writeLanguagePreference,startLanguageSwitch} from '../dist/language-switch.js';

assert.equal(normalizeLanguage('en-US'),'en');assert.equal(normalizeLanguage('zh_Hans'),'zh-CN');assert.equal(normalizeLanguage('fr'),null);
for(const url of ['https://ljcj007.github.io/symmetry-lab/','https://ljcj007.github.io/symmetry-lab/index.html','https://ljcj007.github.io/symmetry-lab/en/','https://ljcj007.github.io/symmetry-lab/en/index.html']){
 const original=new URL(url);original.search='?v=release&material=silicon&note=a%20b';original.hash='classroom/observables?module=shg-story&tab=derive';
 const english=new URL(languageURL(original.href,'en')),chinese=new URL(languageURL(english.href,'zh-CN'));
 assert.equal(english.pathname,'/symmetry-lab/en/');assert.equal(chinese.pathname,'/symmetry-lab/');
 assert.equal(english.hash,original.hash);assert.equal(chinese.hash,original.hash);assert.equal(english.search,original.search);assert.equal(chinese.search,original.search);
}
assert.equal(languageURL('http://127.0.0.1:4318/en?lang=en&v=1#compute/lie/su3_cg','zh'), 'http://127.0.0.1:4318/?lang=zh-CN&v=1#compute/lie/su3_cg');
assert.equal(languageURL('http://localhost:4318/#home','en'),'http://localhost:4318/en/#home');
assert.throws(()=>languageURL('https://example.com/','fr'),RangeError);
assert.equal(explicitLanguageDestination('https://example.com/lab/?lang=en&v=1#classroom/coupling?lesson=su3-generators','zh-CN'),'https://example.com/lab/en/?lang=en&v=1#classroom/coupling?lesson=su3-generators');
assert.equal(explicitLanguageDestination('https://example.com/lab/en/?lang=zh#home','en'),'https://example.com/lab/?lang=zh-CN#home');
assert.equal(explicitLanguageDestination('https://example.com/lab/en/?lang=en#home','en'),null);
assert.equal(explicitLanguageDestination('https://example.com/lab/#home','zh-CN'),null);
assert.equal(explicitLanguageDestination('https://example.com/lab/?lang=fr#home','zh-CN'),null);

const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
assert.equal(readLanguagePreference(storage),null);assert.equal(writeLanguagePreference('en',storage),true);assert.equal(saved.get(LANGUAGE_STORAGE_KEY),'en');assert.equal(readLanguagePreference(storage),'en');assert.equal(writeLanguagePreference('invalid',storage),false);
assert.equal(readLanguagePreference({getItem(){throw Error('blocked');}}),null);assert.equal(writeLanguagePreference('en',{setItem(){throw Error('quota');}}),false);

class Link{constructor(){this.listeners={};this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}remove(){this.removed=true;}}
let current='https://example.com/lab/?v=1#home',replaced=null;const host={appendChild(node){this.child=node;}},document={documentElement:{lang:'zh-CN'},body:host,querySelector:s=>s==='.top-right'?host:null,createElement:()=>new Link()},location={get href(){return current;},replace:url=>{replaced=url;}},window={events:{},addEventListener(k,fn){this.events[k]=fn;},removeEventListener(k){delete this.events[k];}};
const switcher=startLanguageSwitch({document,location,window,storage});assert.equal(switcher.language,'zh-CN');assert.equal(switcher.preferredLanguage,'en');assert.equal(replaced,null,'Saved English preference must not override an explicit Chinese URL');assert.equal(host.child.textContent,'English');assert.equal(host.child.attributes['aria-label'],'切换为英文');
current='https://example.com/lab/?v=2#compute/shg-flagship';host.child.listeners.click();assert.equal(host.child.href,'https://example.com/lab/en/?v=2#compute/shg-flagship');assert.equal(readLanguagePreference(storage),'en');switcher.destroy();assert.equal(host.child.removed,true);assert.deepEqual(window.events,{});
document.documentElement.lang='en';current='https://example.com/lab/en/#classroom/crystal';const reverse=startLanguageSwitch({document,location,window,storage});assert.equal(reverse.element.textContent,'中文');assert.equal(reverse.element.attributes['aria-label'],'Switch to Chinese');assert.equal(reverse.element.href,'https://example.com/lab/#classroom/crystal');reverse.element.listeners.click();assert.equal(readLanguagePreference(storage),'zh-CN');reverse.destroy();
document.documentElement.lang='zh-CN';current='https://example.com/lab/?lang=en#atlas';const explicit=startLanguageSwitch({document,location,window,storage});assert.equal(explicit.redirected,true);assert.equal(replaced,'https://example.com/lab/en/?lang=en#atlas');assert.equal(readLanguagePreference(storage),'en');
const index=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.match(index,/language-switch\.css/);assert.match(index,/language-switch\.js/);
console.log('Language switch: static locale routes, full hash/query preservation, explicit entry selection, preference persistence, no forced stored-language redirect and accessible controls passed.');
