import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseClassroomRoute,buildClassroomHash} from '../dist/classroom-ui.js';

const root=new URL('../',import.meta.url);
// This index is factual routing metadata. Its array order does not define prerequisites.
export const progressionCatalogDefinitions=[
 ['pointgroup-lessons','pointgroups','基础与点群','foundations'],
 ['symmetry-course-lessons','academy','晶体对称与内部自由度','crystal'],
 ['lie-group-lessons','lie','连续群与张量积','continuous'],
 ['material-observables','observables','材料物性与光谱','observables'],
 ['structure-dynamics','dynamics','结构、相变与实验','structure-dynamics'],
 ['material-research','material-research','材料分析专题','structure-dynamics'],
 ['coupled-materials','coupled-materials','畸变、磁激发与热膨胀','structure-dynamics'],
 ['electronic-materials','electronic-materials','配对、非线性光学与能带展开','spin'],
 ['quantum-materials','quantum-materials','轨道、量子几何与输运','spin'],
 ['response-materials','response-materials','横向响应、器件与多电子态','observables'],
 ['spectroscopy-materials','spectroscopy','磁共振与多重态光谱','spin'],
 ['pathways-materials','pathways','位点、散射、畴壁与关联','crystal'],
 ['bridges-materials','bridges','多体谱、极化子与量子态','observables'],
 ['principles-materials','principles','对称性、破缺与守恒','structure-dynamics'],
 ['construction-materials','construction','表示构造、超胞与能带连接','foundations'],
 ['connections-materials','connections','同粒子、缺陷与互易响应','foundations'],
 ['frontiers-materials','frontiers','层群、手性与多体拓扑','crystal']
];
const lieTrack=id=>id.startsWith('su3-ninej')?'ninej':id.startsWith('su3-racah')?'racah':id.startsWith('su3-cg')?'cg':['representations','su2-coupling-representations','singlet-triplet-exchange','su3-dynkin-representations','su3-octet-selection'].includes(id)?'representations':'continuous';

export function buildProgressionIndex(){
 const catalogs=[],lessons=[];
 for(const[catalog,section,title,pathway]of progressionCatalogDefinitions){
  const data=JSON.parse(fs.readFileSync(new URL('dist/data/'+catalog+'.json',root),'utf8'));
  let indexRoute='#classroom/'+pathway;
  for(const lesson of data.lessons){
   let selection={section,pathway,tab:'learn',lesson:lesson.id};
   if(section==='academy')selection={...selection,track:lesson.track,pathway:lesson.track==='space'?'crystal':'spin'};
   else if(section==='lie'){const track=lieTrack(lesson.id);selection={...selection,track,pathway:track==='continuous'?'continuous':'coupling'};}
   else if(lesson.module){
    const destination=parseClassroomRoute('#classroom/'+pathway+'?module='+encodeURIComponent(lesson.module));
    if(destination?.section!==section)throw Error('Module route does not resolve to its catalogue: '+catalog+'/'+lesson.id);
    selection={...destination,tab:'learn',lesson:lesson.id};
   }
   const route=buildClassroomHash(selection);
   const params=new URLSearchParams(route.split('?')[1]);
   params.delete('lesson');
   const lessonIndex=route.split('?')[0]+(params.size?'?'+params.toString():'');
   if(lessons.filter(item=>item.catalog===catalog).length===0)indexRoute=lessonIndex;
   lessons.push({catalog,lessonId:lesson.id,title:lesson.title,route,indexRoute:lessonIndex,
    module:lesson.module||null,track:section==='lie'?lieTrack(lesson.id):lesson.track||null,
    symmetryLevel:lesson.symmetryLevel||null,labPreset:lesson.lab?.preset||null,
    exerciseIds:(data.exercises||[]).filter(item=>item.lesson===lesson.id).map(item=>item.id)});
  }
  catalogs.push({catalog,section,title,route:indexRoute,modules:(data.modules||[]).map(item=>item.id)});
 }
 return{catalogs,lessons};
}

export function progressionIndexSource(){
 const{catalogs,lessons}=buildProgressionIndex();
 return '// Generated factual index; learning dependencies are reviewed separately in lesson-progression.js.\n'+
  'export const progressionCatalogs = '+JSON.stringify(catalogs,null,1)+';\n'+
  'export const progressionLessons = [\n'+lessons.map(x=>' '+JSON.stringify(x)).join(',\n')+'\n];\n';
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
 const path=new URL('dist/lesson-progression-index.js',root),expected=progressionIndexSource();
 if(process.argv.includes('--check')){
  if(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n')!==expected)throw Error('Lesson progression index is stale');
  console.log('Lesson progression routing index is current.');
 }else{fs.writeFileSync(path,expected);console.log('Built '+buildProgressionIndex().lessons.length+' qualified lesson routes.');}
}
