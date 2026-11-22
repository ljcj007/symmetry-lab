import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,flush} from './test-material-research-ui.mjs';
import {renderResearchView,setResearchInput,getResearchResult} from '../dist/en/research-ui.js';

const {cases}=JSON.parse(readFileSync(new URL('./fixtures/crystkit-sg2-orbit-terms.json',import.meta.url),'utf8'));
const container=new Container();
container.dataset={};
for(const [id,order] of [['general',1],['center',2]]){
 const {input,result}=cases[id];
 const calls=[];
 setResearchInput('crystkit',input);
 const dispose=renderResearchView('crystkit',{
  container,context:{mode:'sg',group:{number:2}},toast:message=>assert.fail(message),download(){},
  async run(action,payload){
   assert.equal(action,'crystkit');
   assert.deepEqual(payload,input);
   calls.push(payload);
   return structuredClone(result);
  }
 });
 assert.equal(calls.length,0);
 await container.querySelector('#run-research').onclick();
 await flush();
 assert.equal(calls.length,1);
 const results=container.querySelector('.result-content');
 const orbitNote=results.querySelector('.form-note');
 assert.equal(orbitNote.textContent,`Stabilizer order ${order} · Orbit–stabilizer relation verified.`);
 const stats=results.querySelectorAll('.stat');
 const quotient=stats.find(card=>card.querySelector('.stat-label').textContent==='Order of the finite quotient by translations');
 assert.equal(quotient.querySelector('strong').textContent,'2');
 assert.ok(stats.some(card=>card.querySelector('.stat-label').textContent==='Point-group order'));
 const derived=results.querySelectorAll('tr').find(row=>row.querySelector('td')?.textContent==='Orders in the derived series');
 assert.deepEqual(derived.querySelectorAll('td').map(cell=>cell.textContent),['Orders in the derived series','2 → 1']);
 const orbit=orbitNote.parentNode;
 const rows=orbit.querySelector('tbody').querySelectorAll('tr').map(row=>row.querySelectorAll('td').slice(1).map(cell=>cell.textContent));
 assert.deepEqual(rows,result.orbit.points.map(point=>point.map(String)));
 assert.deepEqual(getResearchResult('crystkit'),result);
 dispose();
}
console.log('English CrystKit result cells: exact SG 2 general point and inversion-center fixtures passed.');
