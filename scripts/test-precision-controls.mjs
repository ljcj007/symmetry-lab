import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

// This is an independent constraint check of actual production HTML, not a
// substitute for the native-browser submission checks performed on release.
const families=['pathways','bridges','principles','construction','connections','frontiers'];
const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const integerish=value=>Math.abs(value-Math.round(value))<=1e-7*Math.max(1,Math.abs(value));
let contexts=0,controls=0,ranges=0;
const expectedPreserved={};
for(const family of families){
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/'+family+'-materials.json',import.meta.url),'utf8'));
 const views=await import('../dist/'+family+'-views.js');
 for(const module of data.modules){
  const defaults=Object.fromEntries(module.fields.map(field=>[field.key,field.default]));
  for(const preset of [{id:'__defaults__',input:{}},...module.presets]){
   const values={...structuredClone(defaults),...structuredClone(preset.input)},html=views.controlsHTML(module,values),root=new Container();
   root.innerHTML='<form>'+html+'</form>';contexts++;
   for(const raw of html.matchAll(/<input\b[^>]*>/g))assert.equal([...raw[0].matchAll(/\bstep\s*=/g)].length,1,'Exactly one step attribute per generated numeric/range input');
   for(const control of root.querySelectorAll('input').concat(root.querySelectorAll('select'))){
    controls++;
    const key=control.id.replace(/^pw-/, '')||control.dataset.prControl,expected=values[key];
    if(control.tag==='select'){
     assert.ok(control.querySelectorAll('option').some(x=>x.value===String(expected)),family+'/'+preset.id+'/'+key+' selects the exact supplied option');continue;
    }
    if(!['number','range'].includes(control.type))continue;
    const value=finite(control.value),min=finite(control.getAttribute('min')),max=finite(control.getAttribute('max')),step=control.getAttribute('step');
    assert.notEqual(value,null,family+'/'+preset.id+'/'+key+' is finite');
    if(min!==null)assert.ok(value>=min,family+'/'+preset.id+'/'+key+' >= min');
    if(max!==null)assert.ok(value<=max,family+'/'+preset.id+'/'+key+' <= max');
    const base=min??finite(control.getAttribute('value'))??0;
    if(step!=='any')assert.ok(integerish((value-base)/(finite(step)??1)),`${family}/${preset.id}/${key}: ${value} must be exactly representable by min=${min}, step=${step}`);
    if(control.type==='range'){
     ranges++;const primary=root.querySelector('#pw-'+control.dataset.prControl);assert.ok(primary,'Auxiliary ranges have a corresponding numeric control');
     assert.equal(control.value,primary.value,'Auxiliary range initial value equals the exact numeric value');
     assert.equal(step,primary.getAttribute('step'),'Range and numeric control use the same continuous/discrete semantics');
    }
   }
   if(module.id==='density'&&['exchange','exchange-dephasing'].includes(preset.id)){
    assert.equal(values.duration,2*Math.PI);assert.equal(root.querySelector('#pw-duration').getAttribute('step'),'any');expectedPreserved[preset.id]=values.duration;
   }
   if(family==='pathways'&&module.id==='domainwall'){
    assert.equal(root.querySelector('#pw-gridPoints').getAttribute('step'),'2');assert.equal(root.querySelector('#pw-sites').getAttribute('step'),'2');
   }
   if(module.id==='manybody')for(const key of ['sites','nUp','nDown','site','points'])assert.equal(root.querySelector('#pw-'+key).getAttribute('step'),'1');
   if(module.id==='polaron')for(const key of ['cutoff','scanPoints'])assert.equal(root.querySelector('#pw-'+key).getAttribute('step'),'1');
   if(module.id==='layers')for(const key of ['layers','cut'])assert.equal(root.querySelector('#pw-'+key).getAttribute('step'),'1');
  }
 }
}
assert.equal(contexts,159);assert.equal(controls,1890);assert.ok(ranges>0);
assert.deepEqual(Object.keys(expectedPreserved).sort(),['exchange','exchange-dephasing']);
console.log(`Precision controls: ${contexts} default/preset contexts, ${controls} actual controls, ${ranges} synchronized ranges; exact 2π, native-step arithmetic, select membership and retained discrete counts passed.`);
