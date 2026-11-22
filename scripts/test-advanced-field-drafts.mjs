import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const readJSON=url=>JSON.parse(fs.readFileSync(url,'utf8'));
const {buildClassroomHash,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.fetch=async url=>({ok:true,json:async()=>readJSON(new URL(String(url).split('?')[0],edition))});

const cases=[
 {section:'principles',host:'Principles',module:'order',lesson:'order-isotropy',next:'order-invariants',key:'etaX',edit:'0.7'},
 {section:'construction',host:'Construction',module:'salc',lesson:'salc-build',next:'salc-selection',key:'polarizationAngle',edit:'30'},
 {section:'connections',host:'Connections',module:'defects',lesson:'defects-manifold',next:'defects-winding',key:'radius',edit:'1.3'}
];

for(const scenario of cases){
 const {section,host,module,lesson,next,key,edit}=scenario;
 const data=readJSON(new URL(`data/${section}-materials.json`,edition));
 const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL(`fixtures/${section}.json.gz`,import.meta.url))));
 const field=data.modules.find(item=>item.id===module).fields.find(item=>item.key===key);
 const lessons=[lesson,next].map(id=>data.lessons.find(item=>item.id===id));
 const selection=parseClassroomRoute(buildClassroomHash({section,module,lesson,tab:'learn'}));
 const render=(await import(new URL(`${section}-ui.js`,edition)))[`render${host}View`];
 const container=new Container(),calls=[];
 const $=selector=>container.querySelector(selector);
 const run=async(action,input)=>{
  calls.push({action,input:structuredClone(input)});
  throw Error('The test records the request without starting Python.');
 };
 await render({container,selection,run});

 const input=()=>$('#pw-'+key);
 const form=()=>$('#pw-form');
 const warning=()=>form().querySelector('[role="alert"]');
 const change=value=>{
  const control=input();
  control.value=value;
  form().oninput({target:control});
 };
 const click=async selector=>{
  const button=$(selector);
  assert.ok(button,`${section}: ${selector} is available`);
  await button.onclick();
  await flush();
 };
 const roundTrip=async()=>{
  await click('[data-pw-tab="learn"]');
  assert.equal(form(),null,`${section}: returned to the lesson`);
  await click('[data-pw-tab="lab"]');
 };
 const checkWarning=message=>{
  assert.ok(warning(),`${section}: invalid draft needs a field warning`);
  assert.ok(warning().textContent.startsWith(field.label+message),warning().textContent);
  assert.match(warning().textContent,english?/Your input has been retained/:/原输入已保留/);
 };
 const submit=async()=>{
  form().onsubmit({preventDefault(){}});
  await flush();
 };

 await click('#pw-to-lab');
 const first=fixture.requests[lessons[0].preset];
 assert.equal($('#pw-preset').value,lessons[0].preset);
 assert.equal(input().value,String(first.input[key]));
 await roundTrip();
 assert.equal(warning()?.textContent??'', '',`${section}: valid preset returns without a warning`);

 change(edit);
 await roundTrip();
 assert.equal(input().value,edit,`${section}: valid edit survives tab changes`);
 assert.equal($('#pw-preset').value,'');
 assert.equal(warning()?.textContent??'', '',`${section}: valid edit returns without a warning`);
 assert.equal(calls.length,0,`${section}: rendering, editing and tab switches do not calculate`);
 await submit();
 assert.deepEqual(calls,[{action:first.action,input:{...first.input,[key]:Number(edit)}}]);

 change('');
 await roundTrip();
 assert.equal(input().value,'',`${section}: incomplete input stays blank`);
 checkWarning(english?' cannot be left blank':'不能留空');
 await submit();
 assert.equal(calls.length,1,`${section}: blank field prevents submission`);

 const outside=String(field.max+1);
 change(outside);
 await roundTrip();
 assert.equal(input().value,outside,`${section}: out-of-range value is kept as entered`);
 checkWarning(english?' exceeds the allowed range':'超出允许范围');
 await submit();
 assert.equal(calls.length,1,`${section}: out-of-range field prevents submission`);

 await click('[data-pw-tab="learn"]');
 const topics=$('#pw-lesson');
 topics.value=next;
 topics.onchange({target:topics});
 await click('#pw-to-derive');
 await click('#pw-flow-lab');
 const nextExercise=data.exercises.find(exercise=>exercise.lesson===next);
 const nextPreset=nextExercise.labStages?.[0]?.preset||lessons[1].preset;
 const second=fixture.requests[nextPreset];
 assert.equal($('#pw-preset').value,nextPreset);
 assert.equal(input().value,String(second.input[key]));
 assert.equal(warning()?.textContent??'', '',`${section}: explicitly loading the new preset clears the old draft warning`);
 assert.equal(calls.length,1,`${section}: loading the next lesson preset still waits for Run`);
 await submit();
 assert.deepEqual(calls[1],second);
 assert.equal(calls.length,2);
}

console.log(`Advanced lesson draft round trips passed in ${english?'English':'Chinese'} for all three course hosts.`);
