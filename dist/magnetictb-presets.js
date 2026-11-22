export const magneticTBExamples=[
 ['graphene','石墨烯 · 对称性建模'],
 ['spinful-chain','自旋链 · 时间反演'],
 ['ssh','SSH 链 · 跃迁模型'],
 ['chern','Chern 绝缘体 · 二维模型']
];

export const isMagneticTBPreset=value=>magneticTBExamples.some(([id])=>id===value);

export function readMagneticTBPreset(params){
 const preset=params.get('preset');
 return params.size===1&&isMagneticTBPreset(preset)?preset:null;
}

export function magneticTBPresetRoute(preset){
 return 'magnetictb'+(isMagneticTBPreset(preset)?'?'+new URLSearchParams({preset}):'');
}
