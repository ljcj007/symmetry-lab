import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {renderNavigationHub}=await import(prefix+'navigation-ui.js');
const app=readFileSync(new URL(prefix+'app.js',import.meta.url),'utf8');
const first=app.indexOf('function handleSiteClick(');
const last=app.indexOf("$('#help-button').onclick=",first);
assert.ok(first>=0&&last>first,'App registers its real document click handler');

const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const presetRoute='compute/advanced/arithmetic_centralizer?preset=a5';
const example=directory.querySelector('[data-route="'+presetRoute+'"]');
assert.ok(example?.matches('a'));
assert.equal(example.getAttribute('href'),'#'+presetRoute);
assert.match(example.textContent,english?/Arithmetic centralizer for six-dimensional A₅/:/六维 A₅ 的算术中心化子/);

const listeners=new Map();
let route,hiddenCount;
vm.runInNewContext(app.slice(first,last),{
 document:{addEventListener(type,handler){listeners.set(type,handler);}},
 setView(next){route=next;},
 $:selector=>selector==='#group-options'?{classList:{add(token){assert.equal(token,'hidden');hiddenCount++;}}}:null
});
const handleClick=listeners.get('click');
assert.equal(typeof handleClick,'function');
assert.equal(listeners.has('auxclick'),false,'Middle-click stays native');

function click(element,{insideSearch=false,...overrides}={}){
 route='compute';hiddenCount=0;
 const target={closest(selector){
  if(selector==='[data-route],[data-view]')return element;
  assert.equal(selector,'.search-wrap');
  return insideSearch?target:null;
 }};
 const event={target,button:0,detail:1,defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true;},
  ...overrides};
 handleClick(event);
 return {route,cancelled:event.defaultPrevented,closed:hiddenCount};
}

const native={route:'compute',cancelled:false,closed:1};
const samePage=destination=>({route:destination,cancelled:true,closed:1});
assert.deepEqual(click(example),samePage(presetRoute));
assert.deepEqual(click(example,{detail:0}),samePage(presetRoute),'Enter still navigates in this tab');
for(const key of ['ctrlKey','metaKey','shiftKey','altKey']){
 assert.deepEqual(click(example,{[key]:true}),native,key+' leaves the existing page untouched');
}
for(const button of [1,2])assert.deepEqual(click(example,{button}),native);
assert.deepEqual(click(example,{defaultPrevented:true}),{...native,cancelled:true});

const extraLink=attributes=>new Element('a',{href:'#'+presetRoute,'data-route':presetRoute,...attributes});
assert.deepEqual(click(extraLink({target:'_SELF'})),samePage(presetRoute));
for(const target of ['_blank','_parent','_top','example-window']){
 assert.deepEqual(click(extraLink({target})),native);
}
assert.deepEqual(click(extraLink({download:''})),native);
assert.deepEqual(click(extraLink({href:'data/research-notes.json'})),native);

const legacy=new Element('a',{href:'#','data-view':'docs'});
assert.deepEqual(click(legacy),samePage('docs'));
assert.deepEqual(click(legacy,{ctrlKey:true}),samePage('docs'),'The legacy placeholder retains its button behavior');
const button=new Element('button',{'data-view':'atlas'});
assert.deepEqual(click(button),samePage('atlas'));
assert.deepEqual(click(button,{detail:0}),samePage('atlas'));
assert.deepEqual(click(button,{button:2}),native);
assert.deepEqual(click(null),native,'A normal outside click still closes the group suggestions');
assert.deepEqual(click(example,{ctrlKey:true,insideSearch:true}),{...native,closed:0});

console.log('Native navigation ('+(english?'English':'Chinese')+'): rendered preset link, mouse and keyboard, native link options, legacy controls and group suggestions passed.');
