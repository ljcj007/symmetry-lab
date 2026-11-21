export const ninejRoute='compute/lie/su3_ninej';
const ninejExperiment='su3_ninej';
export const ninejDefaultExample='su3-ninej-four-octets-singlet';
export const repSize=([p,q])=>(p+1)*(q+1)*(p+q+2)/2;

const basisInput=(factors,target,index=0)=>({factors,target,direction:'left_to_right',state:{index}});
const octets=[[1,1],[1,1],[1,1],[1,1]];
const high27=basisInput([[2,2],[1,0],[0,1],[1,0]],[3,2]);
export const ninejDefault=basisInput([[1,0],[1,0],[1,0],[1,0]],[2,1]);

const amplitudeVector=length=>Array.from({length},(_,i)=>({re:i===0?'sqrt(2)/2':'0',im:i===1?'sqrt(2)/2':'0'}));
const vectorInput=(input,amplitudes)=>({...structuredClone(input),state:{amplitudes}});
export const ninejPresets=Object.fromEntries(Object.entries({
 'su3-ninej-four-fundamentals':structuredClone(ninejDefault),
 'su3-ninej-color-octet':basisInput([[1,0],[0,1],[1,0],[0,1]],[1,1]),
 'su3-ninej-mixed':basisInput([[2,0],[1,0],[0,1],[0,0]],[2,0]),
 'su3-ninej-complex':vectorInput(ninejDefault,[{re:'sqrt(2)/2',im:'0'},{re:'0',im:'sqrt(2)/2'},{re:'0',im:'0'}]),
 [ninejDefaultExample]:basisInput(octets,[0,0],7),
 'su3-ninej-four-octets-adjoint':basisInput(octets,[1,1]),
 'su3-ninej-four-octets-27':basisInput(octets,[2,2]),
 'su3-ninej-four-octets-complex':vectorInput(basisInput(octets,[0,0]),amplitudeVector(8)),
 'su3-ninej-decuplet-four':basisInput([[3,0],[1,0],[1,0],[0,1]],[2,1]),
 'su3-ninej-decuplet-standard':basisInput([[3,0],[1,0],[1,0],[1,0]],[1,1]),
 'su3-ninej-fifteen-four':basisInput([[2,1],[1,0],[0,1],[1,0]],[3,1]),
 'su3-ninej-27-four':high27,
 'su3-ninej-high-complex':vectorInput(high27,amplitudeVector(5)),
}).map(([id,input])=>[id,{experiment:ninejExperiment,input}]));

function representationLabel([p,q]){
 const magnitude=repSize([p,q]);
 return `${magnitude}${p<q?'̄':''}${p+q===4&&p*q===0?'′':''}`;
}

// A product expression describes a recoupling case, without specifying a vector state.
export const ninejBasisExamples=Object.entries(ninejPresets).flatMap(([id,{input}])=>{
 if(!Object.hasOwn(input.state,'index'))return [];
 const factors=input.factors.map(representationLabel).join('⊗'),target=representationLabel(input.target);
 return [{id,factors,target,expression:`${factors.replaceAll('⊗',' ⊗ ')} → ${target}`}];
});

const dimension=/^\d+[\u0304]?(?:′)?$/u;
export function matchNinejExamples(query){
 const expression=String(query??'').replaceAll('⁴','^4').normalize('NFKC').trim().toLowerCase()
  .replace(/^(?:su\s*\(\s*3\s*\)|su3)\s*(?:·\s*)?/u,'')
  .replace(/^9j\s*(?:·\s*)?/u,'').replace(/[\u0305]/gu,'\u0304').replace(/['’]/gu,'′');
 const [product,target,...rest]=expression.split(/\s*(?:→|->)\s*/u);
 if(rest.length||target!==undefined&&!dimension.test(target))return null;
 const repeated=product.match(/^(\d+\u0304?′?)\s*\^\s*4$/u);
 const factors=repeated?Array(4).fill(repeated[1]):product.split(/\s*⊗\s*/u);
 if(factors.length!==4||!factors.every(factor=>dimension.test(factor)))return null;
 const key=factors.join('⊗');
 return {target,cases:ninejBasisExamples.filter(example=>example.factors===key&&(target===undefined||example.target===target))};
}
