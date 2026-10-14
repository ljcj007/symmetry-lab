/** Readers corresponding to upstream readVasp2trace / readMagTrace.
 * Input spin basis is up-down; distributed BC matrices use down-up.
 * No structure standardization is inferred: matching requires BC primitive coordinates.
 */
export const MAX_TRACE_BYTES = 10 * 1024 * 1024;

function fail(message, line) {
  throw new Error(`trace 文件${line ? `第 ${line} 行` : ''}：${message}`);
}
function integer(value, label, line, min = 0, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${label}不是有效整数`, line);
  return value;
}
const determinant = r => r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])-r[0][1]*(r[1][0]*r[2][2]-r[1][2]*r[2][0])+r[0][2]*(r[1][0]*r[2][1]-r[1][1]*r[2][0]);

export function parseTrace(text, {maxBytes = MAX_TRACE_BYTES} = {}) {
  if (typeof text !== 'string') fail('需要文本内容');
  if (text.length > maxBytes || new TextEncoder().encode(text).length > maxBytes) fail('文件超过 10 MiB 限制');
  const rows = [];
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/;
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const tokens = line.trim().split(/\s+/);
    if (tokens.some(x => !numeric.test(x))) fail('含有非数值内容', index + 1);
    const values = tokens.map(x => Number(x.replace(/[dD]/, 'e')));
    if (values.some(x => !Number.isFinite(x))) fail('含有无穷或无效数值', index + 1);
    rows.push({values, line: index + 1});
  });
  let cursor = 0;
  const next = (label) => {
    if (cursor >= rows.length) fail(`${label}缺失，文件可能被截断`);
    return rows[cursor++];
  };
  const first = next('电子数');
  const nelec = integer(first.values[0], '电子数', first.line);
  const socRow = next('SOC 标记');
  const soc = integer(socRow.values[0], 'SOC 标记', socRow.line, 0, 1);
  const countRow = next('对称操作数');
  const nsym = integer(countRow.values[0], '对称操作数', countRow.line, 1, 384);
  let columns;
  const operations = Array.from({length: nsym}, (_, sourceIndex) => {
    const row = next('对称操作');
    const v = row.values;
    columns ??= v.length;
    if (![20,21].includes(columns) || v.length !== columns) fail('对称操作必须统一为 20 列（vasp2trace）或 21 列（MagVasp2trace）', row.line);
    if (v.slice(0,9).some(x => !Number.isInteger(x))) fail('BC 原胞旋转矩阵必须为整数', row.line);
    const rotation = [v.slice(0,3),v.slice(3,6),v.slice(6,9)];
    if (Math.abs(determinant(rotation)) !== 1) fail('旋转矩阵行列式必须为 ±1', row.line);
    if (columns === 21 && ![1,-1].includes(v[20])) fail('幺正标记必须为 +1 或 −1', row.line);
    return {sourceIndex:sourceIndex+1,rotation,translation:v.slice(9,12),
      spinRotation:[[v.slice(12,14),v.slice(14,16)],[v.slice(16,18),v.slice(18,20)]],
      antiunitary:columns===21 && v[20]===-1};
  });
  const nkRow = next('k 点数');
  const nk = integer(nkRow.values[0], 'k 点数', nkRow.line, 1, 100000);
  const coords = Array.from({length:nk}, () => {
    const row = next('k 点坐标');
    if (row.values.length !== 3) fail('k 点必须有三个坐标', row.line);
    return row.values;
  });
  let bandCount;
  const kpoints = coords.map((k, ik) => {
    const count = next('小群操作数');
    if (count.values.length !== 1) fail('小群操作数应单独占一行', count.line);
    const littleOrder = integer(count.values[0], '小群操作数', count.line, 1, nsym);
    const indices = next('操作索引');
    if (indices.values.length !== littleOrder) fail('操作索引数与小群操作数不一致', indices.line);
    const operationIndices = indices.values.map(x => integer(x,'操作索引',indices.line,1,nsym)-1);
    if (new Set(operationIndices).size !== littleOrder) fail('操作索引重复', indices.line);
    const bands = [];
    let nextBand = 1;
    while (cursor < rows.length && rows[cursor].values.length !== 1) {
      const row = next('能带数据');
      const v = row.values;
      if (v.length !== 3 + 2*littleOrder) fail(`能带行应有 ${3+2*littleOrder} 列`, row.line);
      const index = integer(v[0], '能带编号', row.line, 1);
      const degeneracy = integer(v[1], '简并度', row.line, 1);
      if (index !== nextBand) fail(`能带编号应连续；期望 ${nextBand}，得到 ${index}`, row.line);
      nextBand += degeneracy;
      bands.push({index,degeneracy,energy:v[2],characters:Array.from({length:littleOrder},(_,i)=>v.slice(3+2*i,5+2*i))});
    }
    if (!bands.length) fail(`第 ${ik+1} 个 k 点没有能带数据`);
    bandCount ??= nextBand - 1;
    if (nextBand-1 !== bandCount) fail('各 k 点的能带总数不同');
    return {k,bands,operationIndices};
  });
  if (cursor !== rows.length) fail('声明的 k 点之后还有未解析数据', rows[cursor].line);
  return {format:columns===21?'magvasp2trace':'vasp2trace',nelec,soc,nsym,nk,bandCount,
    sourceHeader:first.values,spinBasis:'up-down',operations,kpoints};
}

const near = (a,b,tolerance) => Math.abs(a-b)<tolerance;
const sameRotation = (a,b) => a.every((row,i)=>row.every((x,j)=>x===b[i][j]));
const mulComplex = ([a,b],[c,d]) => [a*c-b*d,a*d+b*c];

/** Match coordinates and normalize traces to the selected database representatives.
 * operationIndices are zero-based GLOBAL indices into group.operations.
 * characters stay paired [real,imaginary], in the same order as operationIndices.
 */
export function matchTraceOperations(trace, group, {tolerance=2e-5} = {}) {
  if (!group?.operations?.length) throw new Error('所选群缺少操作数据');
  const mapping = trace.operations.map((op, sourceIndex) => {
    const candidates = group.operations.map((g,i)=>({g,i})).filter(({g}) =>
      sameRotation(op.rotation,g.rotation) && !!op.antiunitary===!!g.antiunitary &&
      op.translation.every((x,j)=>near(x-g.translation[j],Math.round(x-g.translation[j]),tolerance)));
    if (candidates.length !== 1) throw new Error(`操作 ${sourceIndex+1} 无法唯一匹配所选群的 BC 原胞设置。请检查群编号、原胞和原点；此工具不自动转换晶胞。`);
    const {g,i} = candidates[0];
    let spinSign = 1;
    if (trace.soc===1) {
      if (!g.spinRotation) throw new Error(`操作 ${sourceIndex+1} 缺少数据库自旋矩阵`);
      const s = op.spinRotation;
      const downup = [[s[1][1],s[1][0]],[s[0][1],s[0][0]]]; // σx U σx
      const matches = sign => downup.every((row,a)=>row.every((z,b)=>z.every((x,c)=>near(x,sign*g.spinRotation[a][b][c],tolerance))));
      if (matches(1)) spinSign=1;
      else if(matches(-1)) spinSign=-1;
      else throw new Error(`操作 ${sourceIndex+1} 的自旋矩阵与 BC 基底不兼容。`);
    }
    return {groupIndex:i,spinSign,translationShift:op.translation.map((x,j)=>Math.round(x-g.translation[j]))};
  });
  const kpoints = trace.kpoints.map(point => ({...point,
    sourceOperationIndices:point.operationIndices,
    operationIndices:point.operationIndices.map(i=>mapping[i].groupIndex),
    bands:point.bands.map(band=>({...band,characters:band.characters.map((z,j)=>{
      const match=mapping[point.operationIndices[j]];
      const angle=2*Math.PI*point.k.reduce((sum,k,i)=>sum+k*match.translationShift[i],0);
      return mulComplex(z,[match.spinSign*Math.cos(angle),match.spinSign*Math.sin(angle)]);
    })}))
  }));
  return {...trace,kpoints,mapping,operationMap:mapping.map(x=>x.groupIndex),groupId:group.id??group.number,
    charactersBasis:'selected BC coset representatives; spin down-up',
    notes:['坐标按 BC 原胞匹配；没有执行晶胞或原点转换。','已校正整格矢平移相位和双值旋转的 ± 号。']};
}

/** Order a mapped band's unitary traces for engine.decomposeCharacters. */
export function charactersForAnalysis(point, band, analysis) {
  const little = analysis?.littleGroup;
  if (!little?.sourceIndices || !little?.unitaryIndices) throw new Error('缺少小群分析结果');
  const expected = little.unitaryIndices.map(i=>little.sourceIndices[i]);
  return expected.map(sourceIndex=>{
    const position=point.operationIndices.indexOf(sourceIndex);
    if(position<0) throw new Error(`trace 缺少所选 k 点的幺正操作 ${sourceIndex+1}，无法完整分解特征标。`);
    return band.characters[position];
  });
}
