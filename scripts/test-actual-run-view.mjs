import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actualRunView,renderActualRun,loadActualRun} from '../dist/end-to-end/actual-run-view.js';

const published=JSON.parse(readFileSync(new URL('../dist/end-to-end/data/one-click-run-result.json',import.meta.url),'utf8'));
const original=actualRunView(published);
assert.equal(original.passed,true);
assert.ok(original.intro.includes(published.elapsed_seconds.toFixed(3)));

// A newer portable run replaces the previous duration and uses Beijing time,
// including a UTC date that crosses midnight in the reader's time zone.
const portable={...published,id:'portable-example',started_at:'2026-11-23T16:01:00Z',elapsed_seconds:12.34567,
 independent_client:true,installed_python_required:false,local_project_required:false};
const zh=actualRunView(portable),en=actualRunView(portable,true);
assert.equal(zh.dateLabel,'2026-11-24 · 北京时间');
assert.equal(en.dateLabel,'24 November 2026 · Beijing time');
assert.ok(zh.intro.includes('12.346 秒')&&zh.intro.includes('独立程序'));
assert.ok(en.intro.includes('12.346 seconds')&&en.intro.includes('bundled runtime'));
assert.ok(!zh.intro.includes(published.elapsed_seconds.toFixed(3)));
assert.equal(actualRunView({...portable,independent_client:false}).standalone,false);

const nodes=new Map();
for(const selector of ['[data-i18n="actualDate"]','[data-i18n="actualIntro"]','.native-stages','.run-scope'])
 nodes.set(selector,{textContent:'old record',hidden:false,setAttribute(k,v){this[k]=v;}});
const card={dataset:{},querySelector:s=>nodes.get(s)},document={querySelector:s=>s==='.actual-run'?card:null};
renderActualRun(document,portable);
assert.equal(card.dataset.runId,portable.id);
assert.equal(nodes.get('[data-i18n="actualDate"]').datetime,'2026-11-23T16:01:00.000Z');
assert.equal(nodes.get('.native-stages').hidden,false);

// A failed or incomplete later task cannot inherit the preceding success marks.
for(const record of [{...portable,full_chain_certified:false},
 {...portable,status:'RUNNING'},
 {...portable,stages:portable.stages.filter(s=>s.id!=='infinite-scf')}]){
 assert.equal(renderActualRun(document,record).passed,false);
 assert.equal(nodes.get('.native-stages').hidden,true);
 assert.equal(nodes.get('.run-scope').hidden,true);
 assert.ok(nodes.get('[data-i18n="actualIntro"]').textContent.includes('尚未获得完整证书'));
}
assert.throws(()=>actualRunView({...portable,started_at:'not a date'}));
assert.throws(()=>actualRunView({...portable,elapsed_seconds:-1}));

// A missing or malformed response preserves the clearly labelled HTML fallback.
const before=nodes.get('[data-i18n="actualIntro"]').textContent;
assert.equal(await loadActualRun(document,false,async()=>{throw Error('offline');}),null);
assert.equal(nodes.get('[data-i18n="actualIntro"]').textContent,before);
await loadActualRun(document,false,async(url,options)=>{
 assert.equal(url,'./data/one-click-run-result.json');assert.equal(options.cache,'no-cache');
 return {ok:true,json:async()=>portable};
});
assert.equal(nodes.get('.native-stages').hidden,false);
console.log(JSON.stringify({status:'PASS_ACTUAL_RUN_PRESENTATION',publishedRunRead:true,newPortableTiming:true,
 beijingDateRollover:true,incompleteRunCannotInheritSuccess:true,offlineFallbackPreserved:true}));
