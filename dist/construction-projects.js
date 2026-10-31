import {num} from './response-views.js?v=20261031-entry2';
const local={copies:1,targetIrrep:'E',seedSite:0,operatorType:'dipole',polarizationAngle:0,operatorScale:1,hop:-1,crossHop:.3,copyOffset:.5,anisotropy:.4,retainC4:1,retainMirror:1};
const repeated={...local,copies:2,operatorType:'scalar',crossHop:.6,copyOffset:.8};
const star={period:4,qx:1,qy:0,amplitude:1,transverseRatio:1,phaseDegrees:0,relativePhaseDegrees:0,pattern:'single'};
const line={operation:'glide',spinful:'true',hopping:1,spinOrbit:.65,mass:0,zeeman:0,shift:0,kFraction:.2,transverseY:0,transverseZ:0,points:121};
const screw={...line,operation:'screw',spinful:'false',kFraction:.5};

export const constructionAssignments=[
 {id:'salc-to-fourier-star',module:'salc',title:'从局域SALC到完整波矢星的模式空间',question:'四个局域轨道与四臂波矢星为什么能有相同的点群分解，却不能把实际图案、完整模式空间和重复副本当作一回事？',rubric:[
  '局域四轨道按+x、+y、−x、−y排序；由真实置换矩阵得到A₁⊕B₁⊕E。提交整个二维E子空间，允许复相位与可逆内部换基。',
  '八维表示有两个E副本，每份有两个伙伴；E投影秩为4。副本耦合矩阵可非对角，但母群保留时在伙伴空间为单位矩阵，不得把副本能量分离误认作E伙伴劈裂。',
  '第三阶段的16位点空间中，完整四臂q星提供四个实模式。把群作用限制为C₄ᵥ点操作时，其字符与四轨道表示一致，分解为A₁⊕B₁⊕E；平移另有非平凡作用，不能当作局域群的恒等操作。',
  '当前单q条纹只是完整四维星空间中的一个向量，不能替代完整星作业答案。使用回放和投影矩阵记录证明，不把不同模型相同的表示分解当成相同Hamiltonian或真实材料等价。'],steps:[
   {id:'local',title:'由置换矩阵得到四个局域SALC',action:'salc_lab',route:'#compute/salc-lab?preset=salc-four-sites',requires:local,prompt:'回放8个操作对种子的带权累加，记录字符、A₁/B₁/E投影秩和归一化E伙伴。先提交E_x、E_y，再改用E_x+E_y与i(E_x−E_y)验证子空间判分不依赖基的相位或内部换基。将实际投影矩阵与判分残差写进笔记，不能只截图最后的分解标签。'},
   {id:'copies',title:'把伙伴和重复副本分开计数',action:'salc_lab',route:'#compute/salc-lab?preset=salc-repeated',requires:repeated,prompt:'保留全部母群操作，把轨道空间增加到8维。查看U†HU中的E块，记录副本矩阵[[0,0.6],[0.6,0.8]]与I₂的直积结构，并核对每个副本混合能量仍有双重伙伴。提交完整四维E子空间，说明只提交第一副本两个伙伴为什么不足。'},
   {id:'star',title:'在16位点上构造完整四臂星',action:'wavevector_lab',route:'#compute/wavevector-lab?preset=wavevector-stripe',requires:star,prompt:'现在改变的是模型：方格4×4周期胞、q=(1/4,0)。回放四臂星与共轭配对，记录完整实模式维数4及当前条纹的平移指数4。将回放基B和作业中的C₄、镜面矩阵用于B†DB，比较其字符与第一阶段；同时说明平移可把cos模式变成sin模式。当前图案只有一个向量，提交完整星子空间时必须保留四个独立模式。'}]},
 {id:'order-to-nonsymmorphic-mass',module:'wavevector',title:'从二周期空间模式到半平移破缺与开隙',question:'怎样把明确的A/B交替势加到同一个四带模型，验证它破坏滑移却保留时间反演，并区分中间开隙和端点Kramers配对？',rubric:[
  '第一阶段为无量纲标量条纹f(j,y)=cos(πj)，沿y不变；平移指数为2。它只定义空间模式，不给出能量尺度，也不证明热力学稳定。',
  '为接入线模型另行规定细网格间距a/2、A为偶数j、B为奇数j，以及V/E₀=0.3f。这一额外耦合假设得到mτ_z⊗I，不能声称程序已由结构自动拟合电子Hamiltonian。',
  '第二、三阶段保持跃迁、SOC、采样、动量和时间反演参数完全一致，仅将m从0改为0.3；比较G协变和T协变残差，而非仅观察能带外形。',
  '当前质量与无质量轨道项反对易，全线中间直接隙变为0.6E₀，两个TRIM端点仍满足T²=−I的Kramers配对。只研究指定线与模型，不能据此判定三维材料全布里渊区绝缘。'],steps:[
   {id:'pattern',title:'先生成二周期条纹与平移畴',action:'wavevector_lab',route:'#compute/wavevector-lab?preset=wavevector-period-two',requires:{...star,period:2},prompt:'使用二周期单q条纹，记录y=0行的(+1,−1)、保留平移、两个平移畴和完整星模式维数。明确输出标量无量纲。为下一阶段声明细晶格常数a/2，偶数站点为A、奇数为B，并假设局域能量V/E₀=0.3f；写出diag(+0.3,−0.3)与τ_z的对应。'},
   {id:'unbroken',title:'建立无交替势的四带参照',action:'nonsymmorphic_lab',route:'#compute/nonsymmorphic-lab?preset=nonsymmorphic-hourglass',requires:line,prompt:'先运行m=b=0的同一条Γ—X四带模型，记录半平移S、双值G及T平方、解析交叉位置和两个端点配对。图中原胞长为a，两个位点分别在0和a/2。此Hamiltonian的t和λ由本项目另外指定，第一阶段的标量图案没有决定这些跃迁参数。'},
   {id:'mass',title:'只打开已声明的交替势',action:'nonsymmorphic_lab',route:'#compute/nonsymmorphic-lab?preset=nonsymmorphic-mass',requires:{...line,mass:.3},prompt:'只把m改为0.3，核对H_new−H_old=0.3τ_z⊗I。比较整条线的G、T协变残差、全线最小中间直接隙及端点Kramers判断。使用最小破缺挑战验证G破缺足以解除原交叉保护，再说明端点配对为何没有消失；不得把单个动量处的开隙当作整个三维材料绝缘。'}]},
 {id:'site-to-spinful-screw',module:'nonsymmorphic',title:'从位点诱导表示到双值螺旋边界配对',question:'位点置换产生的分数平移相位和自旋2π旋转负号分别来自哪里？为什么单值边界配对和自旋Kramers不能混为一谈？',rubric:[
  '第一阶段使用本站BC设置的SG4，螺旋轴为z、k_z=1/2、每点一个s轨道。此模块构造诱导表示，未施加时间反演、未计算Hamiltonian或材料能量。',
  '第二阶段把螺旋轴改记为x，采用额外指定的两位点最小线模型。不同位点原点和Bloch基可能改变矩阵元素；比较平方相位与本征值即可，不要求两个模块矩阵逐元素一致。',
  '单值S²=e^(−ik_x)I，在边界为−I，特征值为±i；加入物理自旋后G=S⊗iσ_x，G²=−e^(−ik_x)I，在边界为+I，特征值为±1。',
  '后两个阶段在同样动量和参数下比较单值/双值模型。单值T²=+I时边界复标签配对需要联合空间约束；双值T²=−I且保T、处于TRIM时才可引用Kramers，不能从任意二重数值简并反推定理。'],steps:[
   {id:'induced',title:'从SG4位点映射追踪跨胞相位',action:'band_rep_lab',route:'#compute/band-representation-lab?preset=screw-boundary',requires:{group:4,site:'auto',orbitals:'s',kPoint:'Z',kz:.5},prompt:'记录两个位点的映射、跨胞整格余量与单值螺旋矩阵，验证k_z=1/2时平方为−I且本征值为±i。注意本站BC轴为z。此工具没有时间反演和能量，不能由该结果独自宣布Kramers简并或电子能带交叉；把这些限制写入第一阶段结论。'},
   {id:'single',title:'在轴向线模型中复核单值群关系',action:'nonsymmorphic_lab',route:'#compute/nonsymmorphic-lab?preset=nonsymmorphic-screw-single',requires:screw,prompt:'使用同一半周期平移的x轴螺旋，取f_x=1/2且spinful=false。比较S²=−I、±i本征值与第一阶段，允许轴重命名、位点原点和Bloch规范导致矩阵外观不同。记录本模型另行加入的T²=+I与Hamiltonian；X点配对来自T交换不同复S标签，不能称物理自旋Kramers。'},
   {id:'double',title:'加入自旋因子并检查端点配对',action:'nonsymmorphic_lab',route:'#compute/nonsymmorphic-lab?preset=nonsymmorphic-screw-double',requires:{...screw,spinful:'true'},prompt:'仅把spinful改为true，回放G=S⊗iσ_x。记录边界G²=+I、两个实标签及T²=−I；结合T协变和TRIM诊断说明Kramers伙伴具有相同实G标签。对比Γ端共轭虚标签与中间交叉，提交当前最低能量的完整二维子空间，而非一条任意本征矢。'}]}
];

export function constructionEvidence(record){
 if(!['salc_lab','wavevector_lab','nonsymmorphic_lab'].includes(record.action))return null;
 const r=record.result;
 const summary=r.summary.map(s=>`${s.label}=${typeof s.value==='number'?num(s.value):s.value}${s.unit?' '+s.unit:''}`).join('；');
 const tasks=r.grading?.tasks||[],replay=r.replay?.length||0;
 return summary+`；构造回放${replay}步；子空间作业${tasks.map(t=>`${t.reference.re.length}×${t.reference.re[0]?.length||0}`).join('、')}（判分结果需在练习中另行提交）`;
}
