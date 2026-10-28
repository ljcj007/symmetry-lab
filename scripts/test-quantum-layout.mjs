import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {test,before,after} from 'node:test';
import {chromium} from 'playwright';
const results=JSON.parse(readFileSync(new URL('./fixtures/quantum-materials.json',import.meta.url))).results;
const modules=[
 ['orbitals','classroom/spin?module=orbitals&tab=lab','orbitals','#qm-orbital svg'],
 ['geometry','classroom/crystal?module=geometry&tab=lab','qwz','#qm-geometry-map svg'],
 ['transport','classroom/observables?module=transport&tab=lab','transport','#qm-transport-curves svg']
];
const sizes=[['desktop',1440,900],['compact',1024,768],['tablet',820,900],['mobile',390,844]];
let server,browser,url;
before(async()=>{
 const {createServer}=await import('node:net');
 const probe=createServer();
 await new Promise(r=>probe.listen(0,'127.0.0.1',r));
 const port=probe.address().port;
 await new Promise(r=>probe.close(r));
 url='http://127.0.0.1:'+port;
 server=spawn(process.execPath,[new URL('./serve.mjs',import.meta.url).pathname],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(url+'/index.html')).ok){ready=true;break;}}catch{}
  await delay(100);
 }
 assert.ok(ready,'local static server did not start');
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();server?.kill();});
const box=async(page,selector)=>page.locator(selector).first().evaluate(el=>{
 const r=el.getBoundingClientRect(),c=getComputedStyle(el);
 return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height,position:c.position};
});
function fit(r,width,name){assert.ok(r.width>0&&r.height>0,name+' collapsed');assert.ok(r.x>=-2&&r.right<=width+2,name+' overflows viewport: '+JSON.stringify(r));}
async function noOverflow(page,name){const o=await page.evaluate(()=>[innerWidth,document.body.scrollWidth,document.documentElement.scrollWidth]);assert.ok(Math.max(o[1],o[2])<=o[0]+2,name+': document overflow '+o.join('/'));}
async function uncovered(page,locator,label){
 await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const hit=await locator.evaluate(el=>{
  const b=el.getBoundingClientRect();
  const x=Math.min(innerWidth-8,Math.max(8,b.x+b.width/2));
  const y=Math.min(innerHeight-8,Math.max(8,b.y+Math.min(b.height/2,innerHeight/3)));
  const top=document.elementFromPoint(x,y);
  return {result:!!top?.closest('#qm-result'),controls:!!top?.closest('#qm-form')};
 });
 assert.ok(hit.result&&!hit.controls,label+' covered: '+JSON.stringify(hit));
}
for(const [device,width,height] of sizes)for(const [module,route,fixture,figure] of modules){
 test(device+' '+module+' responsive layout and scroll',async()=>{
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=690,hasTouch:width<=690});
  const page=await context.newPage();
  try{
   // Real shipped HTML, CSS and classroom renderer; deterministic Python result fixture.
   // Disable only the full application bootstrap, which otherwise starts unrelated data loaders.
   await page.route(/\\/app\\.js(?:\\?.*)?$/,r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
   await page.goto(url+'/index.html',{waitUntil:'load'});
   await page.evaluate(async ({route,result})=>{
    const {renderClassroomView}=await import('/classroom-ui.js');
    window.__layoutNav=[];
    await renderClassroomView({container:document.querySelector('#app'),route,
      onNavigate:hash=>window.__layoutNav.push(hash),run:async()=>structuredClone(result),
      cancelRun:()=>{},download:()=>{},onLocation:()=>{}});
   },{route,result:results[fixture]});
   fit(await box(page,'.sidebar'),width,'main navigation');
   fit(await box(page,'.classroom-directory'),width,'course directory');
   assert.equal(await page.locator('.sidebar .nav-item').count(),5);
   assert.equal(await page.locator('.classroom-path').count(),7);
   await page.locator('.classroom-all').click();
   assert.deepEqual(await page.evaluate(()=>window.__layoutNav),['#classroom']);
   const controls=await box(page,'#qm-form'),result=await box(page,'#qm-result');
   fit(controls,width,'parameter controls');fit(result,width,'result panel');
   assert.equal(controls.position,'static','parameter controls must not cover scrolling results');
   assert.ok(result.y>=controls.bottom-2,'result should follow controls');
   if(width>=1024)assert.ok(result.width>=350,'result panel too narrow');
   await noOverflow(page,'before computation');
   await page.locator('#qm-run').click();
   await page.locator('#qm-export').waitFor();
   if(module==='geometry')await page.locator('#qm-field').selectOption('berryCurvature');
   const svg=page.locator(figure).first();await svg.waitFor();
   const chart=await box(page,figure);
   assert.ok(chart.width>=(width<=690?240:270)&&chart.height>=150,'chart unreadably small: '+JSON.stringify(chart));
   const detail=await svg.evaluate(el=>({label:el.getAttribute('aria-label'),viewBox:el.getAttribute('viewBox'),texts:el.querySelectorAll('text').length}));
   assert.ok(detail.label&&detail.viewBox&&detail.texts>0,'figure labels missing');
   if(module==='geometry')assert.match(detail.label,/Berry/);
   if(module==='transport'){
    assert.ok(await page.locator('#qm-transport-curves svg').count()>=3);
    assert.ok(await page.locator('#qm-transport-tensors .obs-table').count()>=3);
   }
   for(const table of await page.locator('#qm-result .obs-table').all()){
    const t=await table.evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth,overflow:getComputedStyle(e).overflowX}));
    if(t.scroll>t.client+2)assert.ok(['auto','scroll'].includes(t.overflow),'wide table must scroll locally');
   }
   await noOverflow(page,'after computation');
   await uncovered(page,svg,'scientific plot');
   await uncovered(page,page.locator('#qm-result .obs-table').last(),'numeric result');
  }finally{await context.close();}
 });
}
