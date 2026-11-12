import assert from 'node:assert/strict';
import fs from 'node:fs';
import {studyStages,studyMapHTML} from '../dist/learning-map.js';
import {classroomPathways,parseClassroomRoute,buildClassroomHash} from '../dist/classroom-ui.js';
import {knownTool} from '../dist/navigation-ui.js';
assert.equal(studyStages.length,6);
assert.equal(studyStages[0].links[0][1],'classroom/start');
for(const stage of studyStages){assert.ok(stage.prior&&stage.goal);for(const [,route]of stage.links){if(route.startsWith('classroom')){const parsed=parseClassroomRoute(route);assert.ok(parsed,route);assert.deepEqual(parseClassroomRoute(buildClassroomHash(parsed)),parsed,route);}else assert.ok(['compute','atlas','atlas/projects','atlas/notebook'].includes(route)||knownTool(route),route);}}
for(const [id,first]of [['foundations','lesson=group-basics'],['crystal','track=space'],['observables','lesson=mechanical-modes'],['spin','track=double'],['continuous','track=continuous']])assert.equal(classroomPathways.find(p=>p.id===id).links[0][1],first);
assert.equal(classroomPathways.length,7,'Preserve the established seven-pathway structure');
assert.match(studyMapHTML(),/所有课程与工具都可直接进入/);
const entry=fs.readFileSync(new URL('../dist/entry-home.js',import.meta.url),'utf8');assert.match(entry,/'classroom\/start','开始零基础导学'/);
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/startToolFinder\(\{button:/);assert.match(app,/labels\['zero-start'\]/);
const page=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');for(const file of ['zero-start.css','tool-finder.css','learning-map.css'])assert.ok(page.includes(file));
console.log('Entry paths: zero-prerequisite home action, six learning stages, canonical deep links, ordered topic starts, seven preserved pathways and global finder integration passed.');
