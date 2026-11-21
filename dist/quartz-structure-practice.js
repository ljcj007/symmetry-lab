const directory = new URL('./data/examples/quartz-298k/',import.meta.url);
const sourceFiles = [
  ['original','9005017.cif','cif',2384,'09da8f993c8c494c4f69c1a36d2ce055fa006cdae133823dfd1a1c7376b56dd6','载入 298 K 原始 CIF'],
  ['active','quartz-active-inversion.vasp','poscar',346,'8035f3412487ff71b0b2ec893047f0725a91a57dcd46feb44aa5e0baaf92870f','载入主动镜像结构'],
  ['passive','quartz-passive-rebasis.vasp','poscar',355,'60da4f5cab153fa1eb19e4480085267508744c6254454908dacc6cc4fe2dfecd','载入被动换基对照']
];

export const quartzStructureCases = Object.freeze(sourceFiles.map(([id,filename,format,byteCount,sha256,label])=>Object.freeze({
  id,filename,format,byteCount,sha256,label,url:new URL(`${filename}?v=20261120-quartz-hand1`,directory)
})));

export function quartzStructurePracticeEnabled(query){
  const values=new URLSearchParams(query).getAll('quartz-hand');
  return values.length===1&&values[0]==='practice';
}

export function quartzStructurePracticeHTML(open){
  return `<details class="structure-details" id="structure-quartz-hand"${open?' open':''}>
    <summary>298 K α 石英 · 主动镜像与被动换基</summary>
    <p>先预测。对分数坐标取反时，分别固定晶格、同时对晶格基矢取反。哪一次会得到原结构的几何镜像？</p>
    <div class="controls-row">${quartzStructureCases.map(({id,label})=>`<button type="button" class="secondary small" id="structure-quartz-${id}">${label}</button>`).join('')}</div>
    <p id="structure-quartz-status" class="form-note" role="status" tabindex="-1" hidden></p>
    <details class="structure-details"><summary>核对三个结构结果</summary><p>原始结构识别为空间群 154。固定晶格的主动镜像变为空间群 152，同时改变坐标和晶格基矢的被动换基仍是空间群 154。三个结构都含 3 个 Si 位点和 6 个 O 位点。</p></details>
    <p class="form-note">两份 POSCAR 是从原始 CIF 派生的教学几何。各向异性热位移保留在完整原文件中。</p>
    <p><a href="#classroom/structure-dynamics?tab=learn&amp;lesson=screw-glide">用同一 CIF 核对镜像后的衍射消光 →</a></p>
    <p class="controls-row"><a href="data/examples/quartz-298k/9005017.cif" download="9005017.cif">下载保留原字节的 CIF ↓</a><a href="docs/quartz-handedness.md">查看结构来源与换基说明 ↗</a><a href="#crystkit?preset=quartz-handedness">在 CrystKit 核对空间群操作 →</a></p>
  </details>`;
}
