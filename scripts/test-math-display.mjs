import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {mathHTML,mathSourceText,layoutMathOverflow} from '../dist/math-display.js';

assert.equal(mathSourceText({childNodes:[{nodeType:3,nodeValue:'精确 '},{dataset:{mathSource:'SU(3)'},childNodes:[{nodeType:3,nodeValue:'duplicated display'}]},{nodeType:3,nodeValue:' 换基'}]}),'精确 SU(3) 换基');
assert.equal(mathSourceText({dataset:{mathSource:'选择 k_x 与 χ_{ij} 的约定'},childNodes:[{nodeType:3,nodeValue:'duplicated visual math'}]}),'选择 k_x 与 χ_{ij} 的约定');

// A long formula inside an inline wrapper has an indefinite percentage width.
// It must fit the nearest content box and stay reachable by keyboard, while
// short symbols keep their original inline baseline and tab order.
const box={clientWidth:290,parentElement:null},style=globalThis.getComputedStyle;
globalThis.getComputedStyle=()=>({display:'block',paddingLeft:'0',paddingRight:'0'});
function measured(natural){const classes=new Set(),attrs={};return {dataset:{},parentElement:box,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},classes,closest:()=>null,get clientWidth(){return classes.has('sl-math-scroll')?box.clientWidth:natural;},scrollWidth:natural,getBoundingClientRect:()=>({width:natural}),hasAttribute:k=>Object.hasOwn(attrs,k),removeAttribute:k=>delete attrs[k],set tabIndex(x){attrs.tabindex=x;},get tabIndex(){return attrs.tabindex;}};}
const long=measured(400),short=measured(30),elements=[long,short],layoutRoot={querySelectorAll:selector=>selector==='.sl-math'?elements:elements.filter(e=>e.classes.has('sl-math-scroll')||selector.includes('[data-math-overflow]')&&e.dataset.mathOverflow)};
assert.equal(layoutMathOverflow(layoutRoot),1);assert.equal(long.tabIndex,0);assert.equal(long.dataset.mathOverflow,'true');assert.equal(short.tabIndex,undefined);assert.equal(short.classes.size,0);
assert.equal(layoutMathOverflow(layoutRoot),1,'Repeated layout keeps one scroller');
box.clientWidth=500;assert.equal(layoutMathOverflow(layoutRoot),0);assert.equal(long.classes.size,0);assert.equal(long.tabIndex,undefined);
globalThis.getComputedStyle=style;

const html=mathHTML('x_{i+1}^{-2}+\\frac{1}{2}');
assert.match(html,/<msubsup>/);
assert.match(html,/<mfrac>/);
assert.match(html,/application\/x-tex/,'MathML retains the original accessible expression');
assert.match(mathHTML('\\begin{bmatrix}1&0\\\\0&-1\\end{bmatrix}'),/<mtable\b/);
assert.throws(()=>mathHTML('x_{'),/ParseError/);
assert.doesNotMatch(mathHTML('\\href{javascript:alert(1)}{x}'),/href=/i);
assert.doesNotMatch(mathHTML('\\htmlStyle{background:url(javascript:alert(1))}{x}'),/style="[^"]*background:/i);
const root=new URL('../dist/vendor/katex/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('provenance.json',root),'utf8'));
assert.equal(manifest.version,'0.19.1');
assert.equal(manifest.license,'MIT');
assert.ok(fs.readFileSync(new URL('LICENSE',root),'utf8').includes('Permission is hereby granted'));
for(const file of manifest.files){const bytes=fs.readFileSync(new URL(file.path,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);if(file.path.endsWith('.woff2'))assert.equal(bytes.subarray(0,4).toString(),'wOF2');}
const css=fs.readFileSync(new URL('katex.min.css',root),'utf8');
for(const [,path]of css.matchAll(/url\(([^)]+)\)/g)){assert.ok(!/^https?:/.test(path),'Math fonts must be hosted with the website');assert.ok(fs.existsSync(new URL(path,root)),path);}
assert.equal([...css.matchAll(/url\(/g)].length,20);
const entry=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
assert.ok(entry.includes('vendor/katex/katex.min.css')&&entry.includes('math-display.css'));
console.log('Math display: structured scripts/fractions/matrices, accessible source, inert unsafe commands and 20 verified local font assets passed.');
