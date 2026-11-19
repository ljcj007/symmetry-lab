const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const component = value => Number.isFinite(value) && Math.abs(value) <= 1000;
const isTriplet = value => Array.isArray(value) && value.length === 3 && [...value].every(component);
const validSpecies = value => typeof value === 'string' && Boolean(value.trim()) && [...value].length <= 32;

function signedVolume([[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
  return ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
}

function sourceFormat(value) {
  const name = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (name === 'vasp') return 'poscar';
  return ['poscar', 'cif', 'cell'].includes(name) ? name : '';
}

function sourceFilename(value) {
  return typeof value === 'string' && value.length <= 240 && !/[\\/\u0000-\u001f\u007f]/u.test(value) ? value : '';
}

function sourceDigest(value) {
  return typeof value === 'string' && value.length === 64 && /^[a-f0-9]+$/i.test(value) ? value.toLowerCase() : '';
}

/** Copy the parsed input cell in its own basis. The caller may supply a verified
 * source digest, which this helper carries as metadata without rehashing. */
export function createStructureDiffractionHandoff(result, source = {}) {
  const input = result?.input_cell;
  if (!isRecord(input) || !Array.isArray(input.positions) || !Array.isArray(input.species)) return null;
  const atomCount = input.species.length;
  if (atomCount < 1 || atomCount > 128 || input.positions.length !== atomCount) return null;
  if (Object.hasOwn(input, 'atom_count') && input.atom_count !== atomCount) return null;
  return validateStructureDiffractionHandoff({
    custom: {
      cell: input.lattice,
      atoms: Array.from(input.species, (species, index) => ({species, fractional: input.positions[index]})),
    },
    source: {
      format: sourceFormat(source?.format),
      filename: sourceFilename(source?.filename),
      sha256: sourceDigest(source?.sha256),
      atomCount,
    },
  });
}

/** Check a received teaching draft and return a deep copy of its small schema. */
export function validateStructureDiffractionHandoff(value) {
  if (!hasKeys(value, ['custom', 'source'])) return null;
  const {custom, source} = value;
  if (!hasKeys(custom, ['cell', 'atoms']) || !hasKeys(source, ['format', 'filename', 'sha256', 'atomCount'])) return null;
  const {cell, atoms} = custom;
  if (!Array.isArray(cell) || cell.length !== 3 || ![...cell].every(isTriplet)) return null;
  // The diffraction solver also checks the spectral condition number before inversion.
  if (Math.abs(signedVolume(cell)) < 1e-6) return null;
  if (!Array.isArray(atoms) || atoms.length < 1 || atoms.length > 128 || source.atomCount !== atoms.length) return null;
  if (source.format !== sourceFormat(source.format) || source.filename !== sourceFilename(source.filename)
    || source.sha256 !== sourceDigest(source.sha256)) return null;

  const copiedAtoms = [];
  for (const atom of atoms) {
    if (!hasKeys(atom, ['species', 'fractional']) || !validSpecies(atom.species) || !isTriplet(atom.fractional)) return null;
    copiedAtoms.push({species: atom.species, fractional: [...atom.fractional]});
  }
  return {
    custom: {cell: cell.map(row => [...row]), atoms: copiedAtoms},
    source: {format: source.format, filename: source.filename, sha256: source.sha256, atomCount: source.atomCount},
  };
}
