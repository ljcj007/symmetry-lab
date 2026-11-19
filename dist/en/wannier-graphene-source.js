const commit = '362171ce35450118828c6960a882e3a6d08c73f5';
const repository = 'https://github.com/quanshengwu/wannier_tools';
const directory = 'examples/Graphene';
const rawBaseURL = `https://raw.githubusercontent.com/quanshengwu/wannier_tools/${commit}/${directory}/`;

function pinnedFile(fileName, bytes, sha256, gitBlobSha1) {
  return Object.freeze({fileName, bytes, sha256, gitBlobSha1,
    rawURL: rawBaseURL + fileName, sourceURL: `${repository}/blob/${commit}/${directory}/${fileName}`});
}

export const GRAPHENE_REFERENCE = Object.freeze({
  id: 'wannier-tools-graphene', commit, repository,
  licenseURL: `${repository}/blob/${commit}/LICENSE`,
  readmeURL: `${repository}/blob/${commit}/README.md`,
  hr: pinnedFile('Graphene_hr.dat', 64657,
    '4caf86edf7341709413383542280b132195bcb71526d5313bad331526a50f75e', '2fddda0c29386b973816bb8c832e5e29fd36eb8a'),
  settings: pinnedFile('wt.in-bands', 955,
    '55dcb2f584260496e29530874a019042cc68bc9a5acdd547478af3312cdff3da', '41dd63a463b8cad287736f25a6e5b95e0ab30c25'),
});

function invalidSettings() {
  throw new Error("The graphene settings file lacks the required lattice, energy reference or continuous path.");
}

function sectionIndex(lines, title) {
  const index = lines.indexOf(title);
  if (index < 0 || lines.indexOf(title, index + 1) !== -1) invalidSettings();
  return index;
}

function namelist(lines, title) {
  const start = sectionIndex(lines, title);
  const end = lines.indexOf('/', start + 1);
  if (end <= start + 1) invalidSettings();
  const entries = new Map();
  for (const line of lines.slice(start + 1, end)) {
    const match = /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
    if (!match || entries.has(match[1])) invalidSettings();
    entries.set(match[1], match[2]);
  }
  return entries;
}

function decimal(token) {
  if (typeof token !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) invalidSettings();
  const value = Number(token);
  if (!Number.isFinite(value)) invalidSettings();
  return value;
}

function vector(row) {
  if (row.length !== 3) invalidSettings();
  return row.map(decimal);
}

function determinant([[a, b, c], [d, e, f], [g, h, i]]) {
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

/** Extract only the fields used by the pinned Graphene wt.in-bands example. */
export function parseGrapheneSettings(text) {
  if (typeof text !== 'string' || text.length > GRAPHENE_REFERENCE.settings.bytes) invalidSettings();
  const lines = text.split(/\r?\n/).map(line => line.split('!', 1)[0].trim()).filter(Boolean);
  if (namelist(lines, '&TB_FILE').get('Hrfile') !== "'Graphene_hr.dat'") invalidSettings();
  const system = namelist(lines, '&SYSTEM');
  if (system.get('SOC') !== '0') invalidSettings();
  const referenceFermiEV = decimal(system.get('E_FERMI'));
  const nk1 = namelist(lines, '&PARAMETERS').get('Nk1');
  if (nk1 !== '101') invalidSettings();

  const latticeStart = sectionIndex(lines, 'LATTICE');
  if (lines[latticeStart + 1] !== 'Angstrom' || lines[latticeStart + 5] !== 'ATOM_POSITIONS') invalidSettings();
  const lattice = lines.slice(latticeStart + 2, latticeStart + 5).map(line => vector(line.split(/\s+/)));
  const volume = determinant(lattice);
  if (!Number.isFinite(volume) || Math.abs(volume) <= 1e-9) invalidSettings();

  const pathStart = sectionIndex(lines, 'KPATH_BULK');
  if (lines[pathStart + 1] !== '3' || lines.length !== pathStart + 5) invalidSettings();
  const labels = ['M', 'K', 'G', 'M'];
  const path = [];
  for (const [index, row] of lines.slice(pathStart + 2).entries()) {
    const tokens = row.split(/\s+/);
    if (tokens.length !== 8 || tokens[0] !== labels[index] || tokens[4] !== labels[index + 1]) invalidSettings();
    const from = vector(tokens.slice(1, 4));
    const to = vector(tokens.slice(5, 8));
    if (from[2] !== 0 || to[2] !== 0 || from.every((value, axis) => value === to[axis])) invalidSettings();
    if (index === 0) {
      path.push({label: tokens[0], k: from});
    } else if (!from.every((value, axis) => value === path[index].k[axis])) {
      invalidSettings();
    }
    path.push({label: tokens[4] === 'G' ? 'Γ' : tokens[4], k: to});
  }
  if (!path[0].k.every((value, axis) => value === path.at(-1).k[axis])) invalidSettings();
  return {lattice, path, points_per_segment: Number(nk1), referenceFermiEV};
}

function assertActive(signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

function sourceError(message, file) {
  const error = new Error(message);
  error.sourceFile = file.fileName;
  return error;
}

async function verifyText(value, file, crypto, signal) {
  assertActive(signal);
  const view = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null;
  if (view?.byteLength !== file.bytes) throw sourceError("The graphene file size differs from the pinned revision.", file);
  // Use a single snapshot for hashing and decoding, including on the local path.
  const bytes = new Uint8Array(view);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  assertActive(signal);
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== file.sha256) throw sourceError("The graphene file's SHA-256 differs from the pinned revision.", file);
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    throw sourceError("The graphene file could not be read as UTF-8.", file);
  }
}

function checkDigestAvailable(crypto) {
  if (typeof crypto?.subtle?.digest !== 'function') throw new Error("This browser cannot verify the original files' SHA-256 digests.");
}

/** Verify both exact file bodies before extracting the existing HR input. */
export async function verifyGrapheneSources({hrBytes, settingsBytes, crypto = globalThis.crypto, signal} = {}) {
  assertActive(signal);
  checkDigestAvailable(crypto);
  const [hr_text, settingsText] = await Promise.all([
    verifyText(hrBytes, GRAPHENE_REFERENCE.hr, crypto, signal),
    verifyText(settingsBytes, GRAPHENE_REFERENCE.settings, crypto, signal),
  ]);
  assertActive(signal);
  const {referenceFermiEV, ...settings} = parseGrapheneSettings(settingsText);
  return {payload: {action: 'hr_import', hr_text, ...settings}, source: GRAPHENE_REFERENCE, referenceFermiEV};
}

async function fetchBytes(fetchImpl, file, signal) {
  let response;
  try {
    response = await fetchImpl(file.rawURL, {credentials: 'omit', redirect: 'error', signal});
  } catch {
    assertActive(signal);
    throw sourceError("The original graphene file could not be read from upstream.", file);
  }
  assertActive(signal);
  if (!response?.ok || response.redirected || !response.body?.getReader) {
    throw sourceError("The original graphene file could not be read from upstream.", file);
  }
  const reader = response.body.getReader();
  const buffer = new Uint8Array(file.bytes);
  let received = 0, complete = false;
  try {
    for (;;) {
      const {value, done} = await reader.read();
      assertActive(signal);
      if (done) {
        complete = true;
        break;
      }
      if (!(value instanceof Uint8Array) || received + value.byteLength > buffer.byteLength) {
        throw sourceError("The graphene file size differs from the pinned revision.", file);
      }
      buffer.set(value, received);
      received += value.byteLength;
    }
  } catch (error) {
    assertActive(signal);
    if (error?.sourceFile === file.fileName) throw error;
    throw sourceError("The original graphene file could not be read from upstream.", file);
  } finally {
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (received !== file.bytes) throw sourceError("The graphene file size differs from the pinned revision.", file);
  return buffer;
}

/** Read from the two fixed upstream raw URLs, never from the deployed site. */
export async function fetchGrapheneSources({fetchImpl = globalThis.fetch, crypto = globalThis.crypto, signal} = {}) {
  assertActive(signal);
  checkDigestAvailable(crypto);
  if (typeof fetchImpl !== 'function') throw new Error("This browser cannot read the original files from upstream.");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, {once: true});
  try {
    const [hrBytes, settingsBytes] = await Promise.all([
      fetchBytes(fetchImpl, GRAPHENE_REFERENCE.hr, controller.signal),
      fetchBytes(fetchImpl, GRAPHENE_REFERENCE.settings, controller.signal),
    ]);
    return await verifyGrapheneSources({hrBytes, settingsBytes, crypto, signal: controller.signal});
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}
