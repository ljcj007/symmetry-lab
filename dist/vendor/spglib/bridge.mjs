// Transport only: every symmetry calculation is performed by the official C kernel.
import createKernel from './spglib-kernel.mjs';

export async function createSpglibBridge(options = {}) {
  const kernel = await createKernel(options);
  function result(pointer) {
    if (!pointer) throw new Error('spglib WebAssembly allocation failed');
    try { return kernel.UTF8ToString(pointer); }
    finally { kernel._free(pointer); }
  }
  function hallNumber(value) {
    if (!Number.isInteger(value) || value < 1 || value > 530) throw new Error('Hall number must be 1–530');
    return value;
  }
  return requestJSON => {
    const request = JSON.parse(requestJSON);
    if (request.action === 'database') return result(kernel._sl_database(hallNumber(request.hall_number)));
    if (request.action === 'type') return result(kernel._sl_type(hallNumber(request.hall_number)));
    if (!['dataset', 'standardize'].includes(request.action)) throw new Error('Unknown spglib operation');
    const {cell, symprec = 1e-5, angle_tolerance = -1, hall_number = 0} = request;
    if (!Array.isArray(cell) || cell.length !== 3) throw new Error('Expected lattice, positions, numbers');
    const [lattice, positions, numbers] = cell;
    const n = numbers?.length;
    if (!Number.isInteger(n) || n < 1 || n > 20000 || positions?.length !== n) throw new Error('Cell must have 1–20000 atoms');
    const matrix = (x, rows) => Array.isArray(x) && x.length === rows && x.every(row => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite));
    if (!matrix(lattice, 3) || !matrix(positions, n)) throw new Error('Invalid cell coordinates');
    if (!numbers.every(x => Number.isInteger(x) && x > 0 && x <= 2147483647)) throw new Error('Invalid atom types');
    if (!Number.isFinite(symprec) || symprec <= 0 || !Number.isFinite(angle_tolerance)) throw new Error('Invalid symmetry tolerance');
    if (hall_number !== 0) hallNumber(hall_number);
    const pointers = [];
    function allocate(values, integer = false) {
      const array = integer ? new Int32Array(values) : new Float64Array(values);
      const pointer = kernel._malloc(array.byteLength);
      if (!pointer) throw new Error('spglib WebAssembly allocation failed');
      pointers.push(pointer);
      // malloc may grow the heap; fetch the current view for every write.
      kernel.HEAPU8.set(new Uint8Array(array.buffer), pointer);
      return pointer;
    }
    try {
      const lat = allocate(lattice.flat()), pos = allocate(positions.flat()), types = allocate(numbers, true);
      const pointer = request.action === 'dataset'
        ? kernel._sl_dataset(lat, pos, types, n, hall_number, symprec, angle_tolerance)
        : kernel._sl_standardize(lat, pos, types, n, Number(Boolean(request.to_primitive)), Number(Boolean(request.no_idealize)), symprec, angle_tolerance);
      return result(pointer);
    } finally { for (const pointer of pointers) kernel._free(pointer); }
  };
}
