const directory = new URL('./data/examples/quartz-298k/',import.meta.url);
const sourceFiles = [
  ['original','9005017.cif','cif',2384,'09da8f993c8c494c4f69c1a36d2ce055fa006cdae133823dfd1a1c7376b56dd6',"Load the original 298 K CIF"],
  ['active','quartz-active-inversion.vasp','poscar',346,'8035f3412487ff71b0b2ec893047f0725a91a57dcd46feb44aa5e0baaf92870f',"Load the actively inverted structure"],
  ['passive','quartz-passive-rebasis.vasp','poscar',355,'60da4f5cab153fa1eb19e4480085267508744c6254454908dacc6cc4fe2dfecd',"Load the passive basis-change control"]
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
    <summary>298 K α-quartz · Active inversion and passive basis change</summary>
    <p>Predict the result. Negate the fractional coordinates with the lattice fixed, then negate both the coordinates and the lattice basis. Which operation produces the geometric mirror of the original structure?</p>
    <div class="controls-row">${quartzStructureCases.map(({id,label})=>`<button type="button" class="secondary small" id="structure-quartz-${id}">${label}</button>`).join('')}</div>
    <p id="structure-quartz-status" class="form-note" role="status" tabindex="-1" hidden></p>
    <details class="structure-details"><summary>Check the three structure results</summary><p>The original structure has space group 154. Active inversion with the lattice fixed gives space group 152. A passive change of the coordinates and lattice basis keeps space group 154. All three structures have three Si sites and six O sites.</p></details>
    <p class="form-note">The two POSCAR files are teaching geometries derived from the original CIF. Anisotropic displacement data remain in the complete source file.</p>
    <p class="controls-row"><a href="data/examples/quartz-298k/9005017.cif" download="9005017.cif">Download the byte-preserved CIF ↓</a><a href="docs/quartz-handedness.md">See the structure source and basis conventions ↗</a><a href="#crystkit?preset=quartz-handedness">Check the space-group operations in CrystKit →</a></p>
  </details>`;
}
