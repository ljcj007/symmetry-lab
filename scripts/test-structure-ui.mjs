import assert from 'node:assert/strict';
import {Element,Container,flush} from './test-material-research-ui.mjs';
import {renderStructureView,getStructureResult} from '../dist/structure-ui.js';
import {validateStructureHandoff} from '../dist/structure-provenance.js';
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(s){return s.includes(',')?[...new Set(s.split(',').flatMap(x=>queryAll.call(this,x.trim())))]:queryAll.call(this,s);};
const container=new Container();container.dataset={researchView:'structure'};
const calls=[],opened=[],downloads=[],identity=[[1,0,0],[0,1,0],[0,0,1]];
const base={tool:'structure_bc',complete:true,group_number:225,international:'Fm-3m',hall_number:523,bravais:'CubiFace',bz_type:'CubiFace',symprec:1e-5,angle_tolerance:-1,input_cell:{atom_count:8},atom_count:2,
 bc_primitive:{lattice:identity,positions:[[0,0,0]],species:['Na']},transform:{coordinate_matrix:identity,origin_shift:[0,0,0]},verified:true,
 verification:{original_BC_generators:true,integral_rotations:true,input_operation_transport_verified:true,atoms_per_volume_preserved:true,atom_covariance_max_error_angstrom:0,idealization_max_atom_displacement_angstrom:0},certificate:{method:'test geometry',spglib_version:'test',scope:'DOM fixture, not an independent structure conversion'},warnings:[],exports:{bc_poscar:'BC',bc_cif:'CIF',standard_poscar:'ITA',unidealized_poscar:'RAW'}};
const options={container,run:async(tool,payload)=>{calls.push({tool,payload});return {...structuredClone(base),k_input:[...payload.k],k_bc:[...payload.k],symprec:payload.symprec,angle_tolerance:payload.angle_tolerance};},toast:()=>{},download:(...args)=>downloads.push(args),openGroup:(...args)=>opened.push(args)};
renderStructureView(options);const $=s=>container.querySelector(s);
let finishRead;
const reading=$('#structure-file').onchange({target:{files:[{name:'new.cif',size:10,text:()=>new Promise(r=>{finishRead=r;})}]}});
assert.equal($('#structure-run').disabled,true);assert.equal($('#structure-text').disabled,true);
await $('#structure-run').onclick();assert.equal(calls.length,0);
finishRead('data_new');await reading;assert.equal($('#structure-run').disabled,false);
const k=[.1234564,.2345674,1.3580238];k.forEach((x,i)=>{$('#structure-k-'+i).oninput({target:{value:String(x)}});});
await $('#structure-run').onclick();assert.equal(calls[0].payload.text,'data_new');assert.equal(calls[0].payload.format,'cif');assert.equal(getStructureResult().group_number,225);
assert.match($('#structure-result').innerHTML,/<annotation encoding="application\/x-tex">x_\{\\mathrm\{BC\}\}=M x_\{\\mathrm\{input\}\}\+q<\/annotation>/);
assert.equal($('#structure-open-group').disabled,false);
await $('#structure-open-group').onclick();assert.deepEqual(opened[0].slice(0,3),[225,k,'CubiFace']);const source=validateStructureHandoff(opened[0][3]);assert.equal(source.source.kind,'user-file');assert.equal(source.source.hashBasis,'utf8-text');assert.deepEqual(source.coordinates.bcK,k);assert.equal(source.doubleValued,false);
$('#structure-spin').value='true';$('#structure-spin').onchange();await $('#structure-open-group').onclick();assert.equal(opened[1][3].doubleValued,true);assert.deepEqual(opened[1][3].coordinates.bcK,k);
$('#structure-poscar').onclick();assert.equal(downloads[0][0],'BC');$('#structure-handoff-card').querySelector('[data-structure-handoff-download]').onclick();assert.equal(JSON.parse(downloads[1][0]).structureHandoff.source.textByteCount,8);assert.equal(downloads[1][0].includes('data_new'),false);
const staleButton=$('#structure-open-group');$('#structure-k-0').oninput({target:{value:'.5'}});assert.equal(getStructureResult(),null);await staleButton.onclick();assert.equal(opened.length,2);
await $('#structure-file').onchange({target:{files:[{name:'failed.cif',size:10,text:async()=>{throw Error('read failed');}}]}});assert.equal($('#structure-run').disabled,false);assert.equal(getStructureResult(),null);assert.match($('#structure-error').innerHTML,/read failed/);
// A second file read supersedes an old read without old-finally unlocking it.
let first,second;const one=$('#structure-file').onchange({target:{files:[{name:'first.cif',size:10,text:()=>new Promise(r=>{first=r;})}]}});const two=$('#structure-file').onchange({target:{files:[{name:'second.cif',size:10,text:()=>new Promise(r=>{second=r;})}]}});first('data_first');await one;assert.equal($('#structure-run').disabled,true);second('data_second');await two;assert.equal($('#structure-text').value,'data_second');
const background=$('#structure-file').onchange({target:{files:[{name:'background.poscar',size:20,text:()=>new Promise(r=>{finishRead=r;})}]}});container.dataset.researchView='docs';container.innerHTML='<p>Other view</p>';finishRead('Background structure');await background;assert.equal(container.html,'<p>Other view</p>');container.dataset.researchView='structure';renderStructureView(options);await $('#structure-run').onclick();assert.equal(calls.at(-1).payload.text,'Background structure');
let canceledRead;const beforeCancel=$('#structure-text').value;const canceled=$('#structure-file').onchange({target:{files:[{name:'cancel.cif',size:10,text:()=>new Promise(r=>{canceledRead=r;})}]}});assert.equal($('#structure-file').disabled,false,'A replacement file can be selected during a pending read');assert.equal($('#structure-file-cancel').hidden,false);$('#structure-file-cancel').onclick();assert.equal($('#structure-run').disabled,false);canceledRead('must not replace current text');await canceled;assert.equal($('#structure-text').value,beforeCancel);assert.equal($('#structure-file-cancel').hidden,true);
// File bytes, including a UTF-8 BOM, are identified separately from parsed text.
const bytes=new Uint8Array([239,187,191,...new TextEncoder().encode('data_exact')]);await $('#structure-file').onchange({target:{files:[{name:'exact.cif',size:bytes.length,arrayBuffer:async()=>bytes.buffer,text:async()=>'data_exact'}]}});await $('#structure-run').onclick();await $('#structure-open-group').onclick();const exact=opened.at(-1)[3];assert.equal(exact.source.hashBasis,'file-bytes');assert.notEqual(exact.source.sha256,exact.source.textSHA256);assert.equal(exact.source.byteCount,bytes.length);assert.equal(exact.source.textByteCount,10);
console.log('Structure UI: pending/replaced/failed/background file guards, exact file/text hashes, single/double selection, full-precision unfolded k and explicit source handoff, and stale-button isolation passed.');
