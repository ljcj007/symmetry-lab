import assert from 'node:assert/strict';
import {customMaterialView,renderCustomMaterial}from '../dist/end-to-end/custom-material-view.js';

const actual={schema:'custom-qe-public-result.v1',id:'custom-carbon-actual',material_name:'diamond C',status:'COMPLETED',started_at:'2026-11-23T23:30:00Z',elapsed_seconds:123.4567,calculation_completed:true,numerical_scf_completed:true,native_operator_received:true,finite_point_spectrum_certified:true,finite_proof_recomputed:true,finite_kpoint_common_gap_certified:true,infinite_scf_certified:false,full_chain_certified:false,points_requested:5,points_certified:5,common_gap_lower_eV:0.123456};
const result=customMaterialView(actual);
assert.equal(result.completed,true);assert.equal(result.spectral,true);assert.equal(result.rows.length,4);assert.equal(result.rows[3].passed,false);assert.match(result.dateLabel,/2026\/11\/24/);assert.equal(result.gap,'0.123');assert.match(result.intro,/123\.457/);
assert.match(customMaterialView(actual,true).rows[3].state,/separate proof/);
const numerical=customMaterialView({...actual,native_operator_received:false});assert.equal(numerical.completed,true);assert.equal(numerical.spectral,false);assert.equal(numerical.showGap,false);
assert.equal(customMaterialView({...actual,finite_proof_recomputed:false}).spectral,false);
const partial=customMaterialView({...actual,points_certified:4});assert.equal(partial.partial,true);assert.equal(partial.spectral,false);assert.equal(partial.showGap,false);assert.equal(partial.rows[2].passed,false);
assert.equal(customMaterialView({...actual,points_certified:4,finite_point_spectrum_certified:false}).partial,true);
assert.equal(customMaterialView({...actual,finite_point_spectrum_certified:false}).partial,false);
assert.equal(customMaterialView({...actual,status:'RUNNING'}).rows.filter(v=>v.passed).length,0);
assert.throws(()=>customMaterialView({...actual,infinite_scf_certified:true}),/unsupported/);
assert.throws(()=>customMaterialView({...actual,full_chain_certified:true}),/unsupported/);
assert.throws(()=>customMaterialView({...actual,points_certified:6}),/coverage/);
assert.equal(customMaterialView({schema:'custom-qe-public-result.v1',status:'AWAITING_ACTUAL_RUN'}).rows.length,0);
class Element{constructor(){this.children=[];this.dataset={};this.hidden=false;this.textContent='';}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}setAttribute(){}querySelector(s){return this.nodes[s];}}
const card=new Element();card.nodes=Object.fromEntries(['material','intro','date','levels','gap','downloads'].map(k=>[`[data-custom="${k}"]`,new Element()]));const document={querySelector:()=>card,createElement:()=>new Element()};
renderCustomMaterial(document,{...actual,material_name:'<img src=x onerror=alert(1)>'});assert.equal(card.nodes['[data-custom="material"]'].textContent,'<img src=x onerror=alert(1)>');assert.equal(card.nodes['[data-custom="material"]'].children.length,0);assert.equal(card.nodes['[data-custom="levels"]'].children.length,4);
assert.match(card.nodes['[data-custom="gap"]'].textContent,/约 0\.123 eV/);assert.doesNotMatch(card.nodes['[data-custom="gap"]'].textContent,/下界/);
renderCustomMaterial(document,{schema:'custom-qe-public-result.v1',status:'AWAITING_ACTUAL_RUN'});assert.equal(card.nodes['[data-custom="levels"]'].children.length,0);assert.equal(card.nodes['[data-custom="downloads"]'].hidden,true);
console.log(JSON.stringify({status:'PASS_CUSTOM_MATERIAL_VIEW',calculationSeparateFromProof:true,infiniteSiClaimCannotLeak:true,completeRequestedPointCoverageRequired:true,safeTextRendering:true,beijingDate:true,threeDigitNumberDisplay:true}));
