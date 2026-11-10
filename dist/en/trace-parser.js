/** Readers corresponding to upstream readVasp2trace / readMagTrace.
 * Input spin basis is up-down; distributed BC matrices use down-up.
 * No structure standardization is inferred: matching requires BC primitive coordinates.
 */
export const MAX_TRACE_BYTES = 10 * 1024 * 1024;

function fail(message, line) {
  throw new Error(`trace file${line ? `No. ${line} OK` : ''}：${message}`);
}
function integer(value, label, line, min = 0, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${label}is not a valid integer`, line);
  return value;
}
const determinant = r => r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])-r[0][1]*(r[1][0]*r[2][2]-r[1][2]*r[2][0])+r[0][2]*(r[1][0]*r[2][1]-r[1][1]*r[2][0]);

export function parseTrace(text, {maxBytes = MAX_TRACE_BYTES} = {}) {
  if (typeof text !== 'string') fail("requires text content");
  if (text.length > maxBytes || new TextEncoder().encode(text).length > maxBytes) fail("file exceeds 10 MiB limit");
  const rows = [];
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/;
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const tokens = line.trim().split(/\s+/);
    if (tokens.some(x => !numeric.test(x))) fail("contains non-numeric content", index + 1);
    const values = tokens.map(x => Number(x.replace(/[dD]/, 'e')));
    if (values.some(x => !Number.isFinite(x))) fail("contains infinite or invalid value", index + 1);
    rows.push({values, line: index + 1});
  });
  let cursor = 0;
  const next = (label) => {
    if (cursor >= rows.length) fail(`${label}is missing, the file may be truncated`);
    return rows[cursor++];
  };
  const first = next("Electron number");
  const nelec = integer(first.values[0], "Electron number", first.line);
  const socRow = next("SOC mark");
  const soc = integer(socRow.values[0], "SOC mark", socRow.line, 0, 1);
  const countRow = next("Symmetric operands");
  const nsym = integer(countRow.values[0], "Symmetric operands", countRow.line, 1, 384);
  let columns;
  const operations = Array.from({length: nsym}, (_, sourceIndex) => {
    const row = next("Symmetric operation");
    const v = row.values;
    columns ??= v.length;
    if (![20,21].includes(columns) || v.length !== columns) fail("Symmetry operations must be unified to 20 columns (vasp2trace) or 21 columns (MagVasp2trace)", row.line);
    if (v.slice(0,9).some(x => !Number.isInteger(x))) fail("BC primitive cell The rotation matrix must be an integer", row.line);
    const rotation = [v.slice(0,3),v.slice(3,6),v.slice(6,9)];
    if (Math.abs(determinant(rotation)) !== 1) fail("The determinant of the rotation matrix must be ±1", row.line);
    if (columns === 21 && ![1,-1].includes(v[20])) fail("Unitary flag must be +1 or −1", row.line);
    return {sourceIndex:sourceIndex+1,rotation,translation:v.slice(9,12),
      spinRotation:[[v.slice(12,14),v.slice(14,16)],[v.slice(16,18),v.slice(18,20)]],
      antiunitary:columns===21 && v[20]===-1};
  });
  const nkRow = next("k points");
  const nk = integer(nkRow.values[0], "k points", nkRow.line, 1, 100000);
  const coords = Array.from({length:nk}, () => {
    const row = next("k point coordinates");
    if (row.values.length !== 3) fail("point k must have three coordinates", row.line);
    return row.values;
  });
  let bandCount;
  const kpoints = coords.map((k, ik) => {
    const count = next("little group operand");
    if (count.values.length !== 1) fail("little group The operand should occupy a separate line", count.line);
    const littleOrder = integer(count.values[0], "little group operand", count.line, 1, nsym);
    const indices = next("Operation Index");
    if (indices.values.length !== littleOrder) fail("operation index number is inconsistent with little group operation number", indices.line);
    const operationIndices = indices.values.map(x => integer(x,"Operation Index",indices.line,1,nsym)-1);
    if (new Set(operationIndices).size !== littleOrder) fail("Duplicate operation index", indices.line);
    const bands = [];
    let nextBand = 1;
    while (cursor < rows.length && rows[cursor].values.length !== 1) {
      const row = next("can carry data");
      const v = row.values;
      if (v.length !== 3 + 2*littleOrder) fail(`can lead the way ${3+2*littleOrder} column`, row.line);
      const index = integer(v[0], "band number", row.line, 1);
      const degeneracy = integer(v[1], "degeneracy", row.line, 1);
      if (index !== nextBand) fail(`band numbers should be consecutive; expected ${nextBand}, get ${index}`, row.line);
      nextBand += degeneracy;
      bands.push({index,degeneracy,energy:v[2],characters:Array.from({length:littleOrder},(_,i)=>v.slice(3+2*i,5+2*i))});
    }
    if (!bands.length) fail(`No. ${ik+1} k points cannot carry data`);
    bandCount ??= nextBand - 1;
    if (nextBand-1 !== bandCount) fail("The total number of energy bands at each k point is different");
    return {k,bands,operationIndices};
  });
  if (cursor !== rows.length) fail("There is unparsed data after the k point declared", rows[cursor].line);
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
  if (!group?.operations?.length) throw new Error("The selected group is missing operation data");
  const mapping = trace.operations.map((op, sourceIndex) => {
    const candidates = group.operations.map((g,i)=>({g,i})).filter(({g}) =>
      sameRotation(op.rotation,g.rotation) && !!op.antiunitary===!!g.antiunitary &&
      op.translation.every((x,j)=>near(x-g.translation[j],Math.round(x-g.translation[j]),tolerance)));
    if (candidates.length !== 1) throw new Error(`Operation ${sourceIndex+1} cannot uniquely match the BC primitive cell setting for the selected group. Please check the group number, primitive cell , and origin; this tool does not automatically convert unit cells.`);
    const {g,i} = candidates[0];
    let spinSign = 1;
    if (trace.soc===1) {
      if (!g.spinRotation) throw new Error(`Operation ${sourceIndex+1} Missing database spin matrix`);
      const s = op.spinRotation;
      const downup = [[s[1][1],s[1][0]],[s[0][1],s[0][0]]]; // σx U σx
      const matches = sign => downup.every((row,a)=>row.every((z,b)=>z.every((x,c)=>near(x,sign*g.spinRotation[a][b][c],tolerance))));
      if (matches(1)) spinSign=1;
      else if(matches(-1)) spinSign=-1;
      else throw new Error(`Operation ${sourceIndex+1} is incompatible with the BC substrate.`);
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
    notes:["coordinates match BC primitive cell ; no unit cell or origin transformations are performed.","Corrected ± sign of integer vector translation phase and binary rotation."]};
}

/** Order a mapped band's unitary traces for engine.decomposeCharacters. */
export function charactersForAnalysis(point, band, analysis) {
  const little = analysis?.littleGroup;
  if (!little?.sourceIndices || !little?.unitaryIndices) throw new Error("is missing little group analysis results");
  const expected = little.unitaryIndices.map(i=>little.sourceIndices[i]);
  return expected.map(sourceIndex=>{
    const position=point.operationIndices.indexOf(sourceIndex);
    if(position<0) throw new Error(`trace lacks unitary operation for selected k points ${sourceIndex+1}, character cannot be completely decomposed.`);
    return band.characters[position];
  });
}
