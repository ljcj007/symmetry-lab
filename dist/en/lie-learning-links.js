// Bind existing examples to the matching existing derivations. These identifiers
// are stable data keys, not translated display labels or mathematical results.
export const lieLessonDerivations={
 'su2-coupling-representations':'su2-spin-addition',
 'singlet-triplet-exchange':'exchange-splitting',
 'su3-dynkin-representations':'su3-dynkin-dimension',
 'su3-flavor-color':'meson-singlet',
 'su3-octet-selection':'octet-multiplicity',
 'su3-ninej-exact-normalization':'su3-ninej-weighted-normalization'
};

export function resolveLieDerivation(lesson,exercises=[]){
 if(!lesson||!Array.isArray(exercises))return {index:-1,matchedBy:null};
 const declared=lesson.derivationId;
 if(declared){const index=exercises.findIndex(exercise=>exercise.id===declared);return {index,matchedBy:index>=0?'lesson':null};}
 const bound=exercises.findIndex(exercise=>exercise.lessonId===lesson.id||(Array.isArray(exercise.lessonIds)&&exercise.lessonIds.includes(lesson.id)));
 if(bound>=0)return {index:bound,matchedBy:'lesson'};
 const legacy=Object.hasOwn(lieLessonDerivations,lesson.id)?lieLessonDerivations[lesson.id]:null;
 if(legacy){const index=exercises.findIndex(exercise=>exercise.id===legacy);return {index,matchedBy:index>=0?'lesson':null};}
 if(lesson.labPreset){
  const index=exercises.findIndex(exercise=>exercise.lab===lesson.lab&&exercise.labPreset===lesson.labPreset);
  if(index>=0)return {index,matchedBy:'preset'};
 }
 // A lab alone is not a lesson association when it has several different tasks.
 // An unmatched preset must not silently select another preset's problem.
 if(lesson.lab&&!lesson.labPreset){
  const matches=exercises.map((exercise,index)=>({exercise,index})).filter(({exercise})=>exercise.lab===lesson.lab);
  if(matches.length===1)return {index:matches[0].index,matchedBy:'lab'};
 }
 return {index:-1,matchedBy:null};
}
