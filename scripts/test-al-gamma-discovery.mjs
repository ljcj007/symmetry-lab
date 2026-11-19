import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const read=name=>readFileSync(new URL(name,edition),'utf8');
const catalog=JSON.parse(read('data/material-research.json'));
const dynamics=JSON.parse(read('data/structure-dynamics.json'));
const {parseClassroomRoute,buildClassroomHash}=await import(new URL('classroom-ui.js',edition));
const {renderStructureDynamicsView}=await import(new URL('structure-dynamics-ui.js',edition));
const {renderMaterialResearchView}=await import(new URL('material-research-ui.js',edition));
const lab='#compute/phonon-modes?preset=al-gamma';
const lesson='#classroom/structure-dynamics?tab=learn&lesson=phonopy-files';

const labSelection=parseClassroomRoute(lab);
assert.equal(labSelection.calculationOnly,true);
assert.equal(labSelection.preset,'al-gamma');
assert.deepEqual(parseClassroomRoute(buildClassroomHash(labSelection)),labSelection);

const fetched=[];
globalThis.fetch=async url=>{
 const path=String(url).split('?')[0];
 fetched.push(path);
 const data={
  'data/structure-dynamics.json':dynamics,
  'data/material-research.json':catalog
 }[path];
 assert.ok(data,'Discovery pages only fetch their catalogues: '+path);
 return {ok:true,json:async()=>structuredClone(data)};
};
const callbacks={
 run:()=>assert.fail('Opening the discovery route must not run Python'),
 download:()=>assert.fail('Opening the discovery route must not trigger a download'),
 onNavigate:()=>{}
};
const classroom=new Container();
let dispose=await renderStructureDynamicsView({container:classroom,selection:parseClassroomRoute(lesson),...callbacks});
assert.equal(classroom.querySelector('#dyn-al-gamma-route').getAttribute('href'),lab);
assert.match(classroom.querySelector('#dyn-al-gamma').textContent,english?/Compare two Γ coordinates/:/比较两个 Γ 坐标/);
const hrefs=node=>node.querySelectorAll('a').map(link=>link.getAttribute('href').replaceAll('&amp;','&'));
assert.ok(hrefs(classroom.querySelector('#dyn-al-gamma')).includes('docs/phonopy-import.md#official-al-gamma'));
assert.ok(classroom.querySelector('#dyn-zno-route'),'Existing ZnO learning route remains available');
dispose?.();
const anotherLesson=new Container();
dispose=await renderStructureDynamicsView({container:anotherLesson,selection:parseClassroomRoute(lesson.replace('phonopy-files','imaginary-modes')),...callbacks});
assert.equal(anotherLesson.querySelector('#dyn-al-gamma-route'),null,'The Al entry belongs to the file-import lesson');
dispose?.();

const atlas=new Container();
const materialSelection={...parseClassroomRoute('#classroom/structure-dynamics?module=modes&tab=cases&material=al-phonopy-gamma'),atlasOnly:true};
dispose=await renderMaterialResearchView({container:atlas,selection:materialSelection,...callbacks});
const cards=atlas.querySelector('.obs-case-grid').querySelectorAll('article');
assert.equal(cards.length,catalog.cases.length);
const al=cards[0];
assert.match(al.querySelector('h2').textContent,english?/Acoustic modes and finite-q freezing/:/铝的声学子空间与有限 q 冻结/);
assert.deepEqual(hrefs(al).filter(href=>href.startsWith('#')),[lesson,lab,'#atlas/notebook']);
assert.equal(hrefs(al).filter(href=>/18cad919af8fe8aad349e04f101887fa19b051a0\/example\/Al-ABACUS\/abacus-pw\/(?:band|phonopy)\.yaml$/.test(href)).length,2);
dispose?.();

const docs=read('docs/phonopy-import.md');
const added=docs.split('<a id="official-al-gamma"></a>')[1]?.split('<a id="zno-derived-example"></a>')[0];
assert.ok(added?.includes('../'+lab));
assert.equal([...added.matchAll(/^[123]\. \*\*([^\n]+?)\*\*/gm)].length,3);
for(const term of ['0.0008274596 THz','T₁ᵤ','[1,1,1]','[2,2,2]','q_i n_i','au','Å','[111]','9.7063938967 THz','4.1396545728 THz']){
 assert.ok(added.includes(term),term);
}
assert.match(added,english?/smallest compatible diagonal supercell/:/相容的最小对角超胞/);
assert.ok(fetched.includes('data/material-research.json'));
console.log('Al discovery ('+(english?'English':'Chinese')+'): classroom, atlas, exact paired sources, documentation and manual calculation route passed.');
