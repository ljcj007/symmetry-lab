import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lessonProgression,lessonProgressionHTML,lessonProgressionEdges,lessonProgressionInventory,lessonProgressionCatalogs,progressionForSelection} from '../dist/lesson-progression.js';
import {parseClassroomRoute} from '../dist/classroom-ui.js';
import {progressionIndexSource} from './build-lesson-progression-index.mjs';

const path=new URL('../dist/lesson-progression-index.js',import.meta.url);
assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),progressionIndexSource(),'The factual route index is rebuilt from current production catalogues');
const inventory=new Map(lessonProgressionInventory.map(item=>[item.key,item]));
assert.equal(inventory.size,197);
assert.equal(lessonProgressionCatalogs.length,17);
assert.equal(lessonProgressionEdges.length,44);
const reviewed=new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to]));
assert.equal(reviewed.size,42,'The remaining indexed lessons are not automatically assigned dependencies');

for(const definition of lessonProgressionCatalogs){
 const actual=JSON.parse(fs.readFileSync(new URL('../dist/data/'+definition.catalog+'.json',import.meta.url),'utf8'));
 const indexed=lessonProgressionInventory.filter(item=>item.catalog===definition.catalog);
 assert.deepEqual(indexed.map(item=>item.lessonId),actual.lessons.map(item=>item.id));
 for(const lesson of actual.lessons){
  const key=definition.catalog+'::'+lesson.id,entry=inventory.get(key);
  assert.equal(entry.title,lesson.title,key);
  const parsed=parseClassroomRoute(entry.route);
  assert.equal(parsed?.section,definition.section,key);
  assert.equal(parsed.lesson,lesson.id,key);
  assert.equal(parsed.tab,'learn',key);
  if(lesson.module)assert.equal(parsed.module,lesson.module,key);
  if(lesson.track)assert.equal(parsed.track,lesson.track,key);
  assert.equal(new URLSearchParams(entry.indexRoute.split('?')[1]).has('lesson'),false,key);
  assert.equal(parseClassroomRoute(entry.indexRoute)?.section,definition.section,key);
  const response=lessonProgression({catalog:definition.catalog,lessonId:lesson.id});
  assert.equal(response.current.lessonId,lesson.id);
  assert.deepEqual(response,lessonProgression({catalog:definition.section,lessonId:lesson.id}));
  assert.equal(response.status,reviewed.has(key)?'reviewed':'index-only');
 }
}

const visited=new Set(),inPath=new Set();
function visit(identity){
 assert.ok(!inPath.has(identity),'A cycle would make the proposed prerequisite order contradictory: '+identity);
 if(visited.has(identity))return;
 inPath.add(identity);
 for(const edge of lessonProgressionEdges.filter(edge=>edge.from===identity))visit(edge.to);
 inPath.delete(identity);visited.add(identity);
}
const pairs=new Set();
for(const edge of lessonProgressionEdges){
 assert.ok(inventory.has(edge.from),edge.from);assert.ok(inventory.has(edge.to),edge.to);
 assert.notEqual(edge.from,edge.to);assert.ok(edge.reason.length>20,'Each link identifies a concrete transferable operation');
 assert.ok(!pairs.has(edge.from+'>'+edge.to),'No duplicate dependency');pairs.add(edge.from+'>'+edge.to);
 const current=inventory.get(edge.to),prior=inventory.get(edge.from);
 const response=lessonProgression(current);
 assert.ok(response.prerequisites.some(item=>item.catalog===prior.catalog&&item.lessonId===prior.lessonId&&item.reason===edge.reason));
 assert.ok(lessonProgression(prior).next.some(item=>item.catalog===current.catalog&&item.lessonId===current.lessonId&&item.reason===edge.reason));
 visit(edge.from);
}

const pg=lessonProgression({catalog:'pointgroups',lessonId:'representations'});
const lie=lessonProgression({catalog:'lie',lessonId:'representations'});
assert.notEqual(pg.current.route,lie.current.route);
assert.equal(parseClassroomRoute(pg.current.route).section,'pointgroups');
assert.equal(parseClassroomRoute(lie.current.route).section,'lie');
assert.equal(parseClassroomRoute(lie.current.route).track,'representations');
assert.equal(lessonProgression({lessonId:'representations'}).status,'unknown','A naked duplicated ID must not select a catalogue');

for(const[catalog,lessonId,priorCatalog,priorId]of[
 ['bridges','manybody-lehmann','pathways-materials','hubbard-basis'],
 ['frontiers','spt-schmidt','bridges-materials','density-pure-mixed'],
 ['frontiers','spt-aklt-parent','lie-group-lessons','su2-coupling-representations'],
 ['material-research','thermal-oscillator','material-observables','acoustic-optical'],
 ['connections','reciprocity-onsager','material-observables','neumann']
])assert.ok(lessonProgression({catalog,lessonId}).prerequisites.some(item=>item.catalog===priorCatalog&&item.lessonId===priorId));

const unspecified=lessonProgression({catalog:'lie',lessonId:'su3-ninej-27-input-exact'});
assert.equal(unspecified.status,'index-only');
assert.deepEqual(unspecified.prerequisites,[]);assert.deepEqual(unspecified.next,[]);
assert.match(lessonProgressionHTML({catalog:'lie',lessonId:'su3-ninej-27-input-exact'}),/本主题目录/);
assert.equal(lessonProgressionHTML({catalog:'lie',lessonId:'future-not-in-catalogue'}),'');
assert.equal(lessonProgression({catalog:'__proto__',lessonId:'representations'}).status,'unknown');

const linkHTML=lessonProgressionHTML({catalog:'frontiers',lessonId:'spt-schmidt'});
assert.match(linkHTML,/data-progression-kind="prerequisite"/);
assert.match(linkHTML,/lesson=density-pure-mixed/);
assert.match(linkHTML,/data-progression-kind="next"/);
assert.match(linkHTML,/lesson=spt-protection/);
assert.match(linkHTML,/href="#classroom\/start"/);
assert.ok(!/\sonclick=|\sdisabled\b|javascript:/.test(linkHTML),'Learning links remain native, optional destinations');

const editable=lessonProgression({catalog:'bridges',lessonId:'manybody-lehmann'});
editable.current.title='changed';editable.prerequisites[0].title='changed';editable.index.route='#changed';
const unaffected=lessonProgression({catalog:'bridges',lessonId:'manybody-lehmann'});
assert.notEqual(unaffected.current.title,'changed');assert.notEqual(unaffected.prerequisites[0].title,'changed');assert.notEqual(unaffected.index.route,'#changed');

for(const route of ['#classroom/pointgroups?lesson=representations','#classroom/lie?track=representations&lesson=representations','#classroom/bridges?module=manybody&lesson=manybody-lehmann','#classroom/crystal?track=double&lesson=double-04']){
 const parsed=parseClassroomRoute(route);assert.ok(parsed?.lesson,'Existing deep link still resolves: '+route);
}

// These are actual initial UI choices, rather than inferred pedagogical order.
for(const[route,expected]of[
 ['#classroom/foundations','group-basics'],
 ['#classroom/crystal','space-01'],
 ['#classroom/spin?track=double','double-01'],
 ['#classroom/spin?track=magnetic','magnetic-01'],
 ['#classroom/spin?track=color','color-01'],
 ['#classroom/spin?track=spin','spin-01'],
 ['#classroom/continuous','continuous-symmetry'],
 ['#classroom/coupling','representations'],
 ['#classroom/coupling?track=cg','su3-cg-change-basis'],
 ['#classroom/coupling?track=racah','su3-racah-coupling-paths'],
 ['#classroom/coupling?track=ninej','su3-ninej-paired-trees'],
 ['#classroom/observables','mechanical-modes'],
 ['#classroom/structure-dynamics','landau-stability'],
 ['#classroom/spin?module=hubbard','hubbard-basis'],
 ['#classroom/observables?module=manybody','manybody-lehmann'],
 ['#classroom/spin?module=spt','spt-aklt-parent'],
 ['#classroom/structure-dynamics?module=distortion&material=srtio3','distortion-projection'],
 ['#classroom/structure-dynamics?module=distortion&material=srtio3&preset=batio3','distortion-reference'],
 ['#classroom/spin?track=color&lesson=color-01&level=space','color-02']
])assert.equal(progressionForSelection(parseClassroomRoute(route)).current?.lessonId,expected,route);

// All module defaults resolve within that actual module; a missing or unknown
// module cannot silently inherit the first module of a catalogue.
for(const definition of lessonProgressionCatalogs){
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/'+definition.catalog+'.json',import.meta.url),'utf8'));
 for(const module of definition.modules){
  const result=progressionForSelection({section:definition.section,module,tab:'learn'});
  assert.equal(result.current?.lessonId,data.lessons.find(item=>item.module===module).id,definition.catalog+'/'+module);
  assert.equal(result.resolution,'module-default');
 }
 if(definition.modules.length){
  assert.equal(progressionForSelection({section:definition.section}).current,null,definition.catalog);
  assert.equal(progressionForSelection({section:definition.section,module:'future-not-registered'}).current,null,definition.catalog);
 }
}

assert.equal(progressionForSelection({section:'pointgroups',lesson:'representations'}).current?.catalog,'pointgroup-lessons');
assert.equal(progressionForSelection({section:'lie',lesson:'representations'}).current?.catalog,'lie-group-lessons');
assert.equal(progressionForSelection({section:'pointgroups',lesson:'su2-spinor'}).current,null,'An explicit lesson must belong to its selected catalogue');
assert.equal(progressionForSelection({section:'frontiers',module:'layers',lesson:'spt-schmidt'}).current,null,'A module mismatch does not guess the intended lesson');
assert.equal(progressionForSelection({section:'lie',track:'future-stage'}).current,null);
assert.equal(progressionForSelection({section:'academy',track:'future-track'}).current,null);
assert.equal(progressionForSelection({section:'unregistered'}).index.route,'#classroom');
assert.equal(progressionForSelection({section:'frontiers',module:'spt',lesson:'spt-aklt-parent',exercise:'spt-schmidt-steps',tab:'learn'}).current?.lessonId,'spt-schmidt','An exercise deep link has the same explicit priority as the topic UI');
assert.equal(progressionForSelection({section:'frontiers',module:'spt',exercise:'future-exercise',tab:'learn'}).current,null);
assert.equal(progressionForSelection({section:'observables',lesson:'neumann',exercise:'count-optical',tab:'learn'}).current?.lessonId,'neumann','Observables only lets an exercise override the lesson in its derive tab');
const changed=progressionForSelection({section:'frontiers',module:'spt',tab:'learn'});
changed.current.exerciseIds.push('mutated');
assert.ok(!progressionForSelection({section:'frontiers',module:'spt',tab:'learn'}).current.exerciseIds.includes('mutated'));
console.log('Lesson progression: 197 qualified routes in 17 catalogues, 44 reasoned optional edges over 42 lessons, exact targets, duplicate-ID isolation, acyclic recommendations, honest index fallback, native links, scoped initial module/stage/material/exercise choices and fresh API results passed.');
