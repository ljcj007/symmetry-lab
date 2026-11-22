export const magneticTBExamples=[
 ['graphene',"Graphene · Symmetry Modeling"],
 ['spinful-chain',"spin chain · time reversal"],
 ['ssh',"SSH chain · transition model"],
 ['chern',"Chern Insulator · 2D model"]
];

export const isMagneticTBPreset=value=>magneticTBExamples.some(([id])=>id===value);

export function readMagneticTBPreset(params){
 const preset=params.get('preset');
 return params.size===1&&isMagneticTBPreset(preset)?preset:null;
}

export function magneticTBPresetRoute(preset){
 return 'magnetictb'+(isMagneticTBPreset(preset)?'?'+new URLSearchParams({preset}):'');
}
