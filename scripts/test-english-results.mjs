import assert from 'node:assert/strict';
import {createResultLocalizer,collectResultDisplayMessages} from '../dist/english-results.js';

const translations={
 '标题':'Title','说明':'Description','稳定':'Stable','filename.cif':'SHOULD NEVER REPLACE A CAPTURE',
 '维数 ZXQD0DQXZ 超过限制':'Dimension ZXQD0DQXZ exceeds the limit',
 '文件 ZXQD0DQXZ：形状 ZXQD1DQXZ 无效':'Invalid shape ZXQD1DQXZ in file ZXQD0DQXZ',
 '维数 3 超过限制':'Three dimensions exceed the exact preset limit',
 '值 ZXQD0DQXZ；复核 ZXQD0DQXZ':'Value ZXQD0DQXZ; verified ZXQD0DQXZ',
 'H_副本 = H⊗I':'H_copy = H⊗I',
 'H_副本 = ZXQD0DQXZ':'MUST NOT APPLY A DYNAMIC TEMPLATE TO A FORMULA ZXQD0DQXZ',
 '数组 [ZXQD0DQXZ] (eV/Å²)':'Array [ZXQD0DQXZ] (eV/Å²)',
};
const templates=['维数 ZXQD0DQXZ 超过限制','文件 ZXQD0DQXZ：形状 ZXQD1DQXZ 无效','值 ZXQD0DQXZ；复核 ZXQD0DQXZ','数组 [ZXQD0DQXZ] (eV/Å²)','H_副本 = ZXQD0DQXZ'];
const localize=createResultLocalizer({translations,templates});
assert.equal(localize.text('标题'),'Title');assert.equal(localize.text('维数 3 超过限制'),'Three dimensions exceed the exact preset limit','Exact messages take precedence over dynamic templates');
assert.equal(localize.text('维数 27 超过限制'),'Dimension 27 exceeds the limit');
assert.equal(localize.text('文件 filename.cif：形状 (3, 4) 无效'),'Invalid shape (3, 4) in file filename.cif','Captured filenames are not themselves translated');
assert.equal(localize.text('文件 <script>用户文件</script>：形状 [2,3] 无效'),'Invalid shape [2,3] in file <script>用户文件</script>','Captures stay literal strings; this module emits no markup');
assert.equal(localize.text('值 a\nb；复核 a\nb'),'Value a\nb; verified a\nb');assert.equal(localize.text('值 a；复核 b'),'值 a；复核 b','Repeated markers must carry the same captured value');
assert.equal(localize.text('数组 [5] (eV/Å²)'),'Array [5] (eV/Å²)','Regular-expression punctuation is escaped');
for(const value of [null,undefined,13,false,{},'任意未知文本','Prefix 维数 27 超过限制','维数 27 超过限制 trailing'])assert.equal(localize.text(value),value);

const invalid=createResultLocalizer({templates:{'ZXQD0DQXZ':'Replace arbitrary text ZXQD0DQXZ','数字 ZXQD0DQXZ':'Dropped marker','连续 ZXQD0DQXZZXQD1DQXZ':'Two ZXQD0DQXZ ZXQD1DQXZ'}});
assert.equal(invalid.text('用户笔记'),'用户笔记');assert.equal(invalid.text('数字 7'),'数字 7');assert.equal(invalid.text('连续 123'),'连续 123');
const moreSpecific=createResultLocalizer({templates:[['ZXQD0DQXZ 失败','ZXQD0DQXZ failed'],{source:'文件 ZXQD0DQXZ 失败',target:'File ZXQD0DQXZ failed'}]});assert.equal(moreSpecific.text('文件 x.cif 失败'),'File x.cif failed');
assert.equal(createResultLocalizer({translations:new Map([['说明','Description']])}).text('说明'),'Description');

const original={title:'标题',kind:'标题',model:'标题',name:'标题',parameters:{name:'标题',input:'说明'},input:{title:'标题',filename:'说明'},units:{name:'标题',convention:'说明'},formula:'H_副本 = H⊗I',formulas:['H_副本 = H⊗I','H_副本 = 7'],matrix:[['说明','标题'],[1,{re:3,im:4}]],matrices:[{label:'说明',value:[['标题']]}],tensor:{basis:[{id:'标题',label:'说明',value:{re:2,im:0}}],coefficientConvention:'说明'},geometry:{beamConvention:'说明'},symmetry:{inversionExplanation:'说明'},warnings:['说明','维数 27 超过限制'],steps:[{title:'标题',detail:'说明',formula:'H_副本 = H⊗I',notes:'说明'},'说明'],sources:[{title:'标题',url:'标题',note:'说明'}],derivation:[{title:'标题',text:'说明',formula:'x=1'}],notes:'说明',exports:{poscar:'标题',cif:'说明',filename:'标题'},data:{label:'标题',text:'说明'},learningEvidence:{title:'标题',notes:'说明'},checks:{reason:'说明',status:'稳定',count:2},opaqueString:'说明'};
const before=structuredClone(original),translated=localize.result(original);
assert.deepEqual(original,before,'Localization must not mutate a Python result');assert.notEqual(translated,original);
assert.equal(translated.title,'Title');assert.equal(translated.name,'Title');assert.equal(translated.tensor.basis[0].label,'Description');assert.equal(translated.tensor.basis[0].id,'标题');assert.deepEqual(translated.tensor.basis[0].value,{re:2,im:0});
for(const key of ['kind','model','parameters','input','matrix','matrices','notes','exports','data','learningEvidence','opaqueString'])assert.deepEqual(translated[key],original[key],key+' must remain computational/user data');
assert.deepEqual(translated.units,{name:'Title',convention:'Description'},'Only exact Chinese unit descriptions may be localized');
assert.equal(translated.formula,'H_copy = H⊗I');assert.deepEqual(translated.formulas,['H_copy = H⊗I','H_副本 = 7'],'Math annotations only permit a complete exact translation');assert.deepEqual(translated.warnings,['Description','Dimension 27 exceeds the limit']);
assert.equal(translated.geometry.beamConvention,'Description');assert.equal(translated.symmetry.inversionExplanation,'Description');assert.equal(translated.tensor.coefficientConvention,'Description');assert.deepEqual(translated.steps,[{title:'Title',detail:'Description',formula:'H_copy = H⊗I',notes:'说明'},'Description']);assert.deepEqual(translated.sources,[{title:'Title',url:'标题',note:'说明'}]);assert.deepEqual(translated.derivation,[{title:'Title',text:'Description',formula:'x=1'}]);assert.deepEqual(translated.checks,{reason:'Description',status:'稳定',count:2});
const hostile=JSON.parse('{"__proto__":{"polluted":"说明"},"title":"标题"}'),safe=localize.result(hostile);assert.equal(Object.getPrototypeOf(safe),Object.prototype);assert.equal(Object.hasOwn(safe,'__proto__'),true);assert.equal({}.polluted,undefined);assert.equal(safe.title,'Title');
const cycle={title:'标题'};cycle.self=cycle;const copied=localize.result(cycle);assert.equal(copied.title,'Title');assert.equal(copied.self,copied);
const shared={label:'说明'},aliased=localize.result({steps:[shared],parameters:shared});assert.equal(aliased.steps[0].label,'Description');assert.equal(aliased.parameters.label,'说明','A display alias must not contaminate a protected subtree');
const nested=localize.result({summary:{phase:'稳定',energyUnit:'说明',id:'说明',computed:7},checks:{status:'稳定'},bands:{mirrorLabels:['说明']},instructions:['说明'],tensor:{intrinsicPermutation:'H_副本 = H⊗I'}});assert.deepEqual(nested.summary,{phase:'Stable',energyUnit:'Description',id:'说明',computed:7});assert.equal(nested.checks.status,'稳定');assert.deepEqual(nested.bands.mirrorLabels,['Description']);assert.deepEqual(nested.instructions,['Description']);assert.equal(nested.tensor.intrinsicPermutation,'H_copy = H⊗I');
const scientific=createResultLocalizer({translations:{eV:'MUST NOT CHANGE','Å²':'MUST NOT CHANGE','x^2':'MUST NOT CHANGE','任意单位':'arbitrary units'},templates:{'单位 ZXQD0DQXZ':'Units ZXQD0DQXZ'}}).result({units:{energy:'eV',area:'Å²',intensity:'任意单位',unknown:'单位 3'},formula:'x^2'});assert.deepEqual(scientific,{units:{energy:'eV',area:'Å²',intensity:'arbitrary units',unknown:'单位 3'},formula:'x^2'});
const tabular=localize.result({tables:[{columns:['标题','说明'],rows:[['说明',7,{re:2,im:0}]]}],headers:['标题'],choices:['说明'],checks:{'数值方法':'说明','T₂ 约定':'说明'},gapFormula:'H_副本 = H⊗I'});assert.deepEqual(tabular.tables,[{columns:['Title','Description'],rows:[['Description',7,{re:2,im:0}]]}]);assert.deepEqual(tabular.headers,['Title']);assert.deepEqual(tabular.choices,['Description']);assert.deepEqual(tabular.checks,{'数值方法':'Description','T₂ 约定':'Description'},'Display localization must never rename result keys');assert.equal(tabular.gapFormula,'H_copy = H⊗I');
const messages=collectResultDisplayMessages(original);assert.ok(messages.some(x=>x.path.join('.')==='title'&&x.source==='标题'));assert.ok(messages.some(x=>x.path.join('.')==='tensor.basis.0.label'));assert.ok(messages.some(x=>x.path.join('.')==='units.name'&&x.mode==='math'));assert.ok(messages.every(x=>!x.path.some(k=>['notes','parameters','input','matrix','matrices','data','learningEvidence','exports'].includes(k))),'Extraction shares the same protected-data boundaries');
console.log('English Python display: exact and dynamic messages, verbatim filenames, strict display-field cloning, protected calculation/user data, mathematical annotations, immutable numeric results and inert object keys passed.');
const annotations=createResultLocalizer({translations:{'说明':'Description','稳定':'Stable'},nativeAnnotations:true}).result({notes:['说明'],operations:[{name:'说明',matrix:[[1]]}],workshop:{generators:['说明']},summary:[{label:'说明',value:'稳定'}],kind:'稳定',userNotes:'说明',learningEvidence:{notes:'说明'},input:{notes:'说明',operations:[{name:'说明'}]}});
assert.deepEqual(annotations.notes,['Description']);assert.equal(annotations.operations[0].name,'Description');assert.deepEqual(annotations.operations[0].matrix,[[1]]);assert.deepEqual(annotations.workshop.generators,['Description']);assert.equal(annotations.summary[0].value,'Stable');assert.equal(annotations.kind,'稳定','Computational enum values stay unchanged');assert.equal(annotations.userNotes,'说明');assert.deepEqual(annotations.learningEvidence,{notes:'说明'});assert.deepEqual(annotations.input,{notes:'说明',operations:[{name:'说明'}]});
