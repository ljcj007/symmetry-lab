import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';

const english = process.argv.includes('--english');
const {GRAPHENE_REFERENCE, fetchGrapheneSources, parseGrapheneSettings, verifyGrapheneSources} = await import(
  english ? '../dist/en/wannier-graphene-source.js' : '../dist/wannier-graphene-source.js',
);

const revision = '362171ce35450118828c6960a882e3a6d08c73f5';
const {hr, settings} = GRAPHENE_REFERENCE;
assert.equal(GRAPHENE_REFERENCE.commit, revision);
assert.equal(GRAPHENE_REFERENCE.id, 'wannier-tools-graphene');
assert(Object.isFrozen(GRAPHENE_REFERENCE) && Object.isFrozen(hr) && Object.isFrozen(settings));
assert.equal(hr.rawURL, `https://raw.githubusercontent.com/quanshengwu/wannier_tools/${revision}/examples/Graphene/Graphene_hr.dat`);
assert.equal(settings.rawURL, `https://raw.githubusercontent.com/quanshengwu/wannier_tools/${revision}/examples/Graphene/wt.in-bands`);
assert.deepEqual([hr.bytes, settings.bytes], [64657, 955]);
assert.deepEqual([hr.sha256, settings.sha256], [
  '4caf86edf7341709413383542280b132195bcb71526d5313bad331526a50f75e',
  '55dcb2f584260496e29530874a019042cc68bc9a5acdd547478af3312cdff3da',
]);

// This control uses invented lattice, Fermi energy and path coordinates. No
// upstream HR bytes or settings fixture are stored in the source repository.
const synthetic = `&TB_FILE
Hrfile = 'Graphene_hr.dat'
/
&SYSTEM
SOC=0 ! comment
E_FERMI = 2.125
/
&PARAMETERS
Nk1 = 101
/
LATTICE
Angstrom
3 -.2 0
0 4 0
0 0 15
ATOM_POSITIONS
KPATH_BULK ! 3 connected segments
3
M .4 .1 0 K .31234567 .2 0
K .31234567 .2 0 G 0 0 0
G 0 0 0 M .4 .1 0
`;
const cleanShape = {
  lattice: [[3, -.2, 0], [0, 4, 0], [0, 0, 15]],
  path: [{label: 'M', k: [.4, .1, 0]}, {label: 'K', k: [.31234567, .2, 0]},
    {label: 'Γ', k: [0, 0, 0]}, {label: 'M', k: [.4, .1, 0]}],
  points_per_segment: 101,
};
assert.deepEqual(parseGrapheneSettings(synthetic), {...cleanShape, referenceFermiEV: 2.125});
for (const malformed of [
  synthetic.replace('K .31234567 .2 0 G', 'K .31234566 .2 0 G'),
  synthetic.replace('Angstrom', 'Bohr'),
  synthetic.replace('SOC=0', 'SOC=1'),
  synthetic.replace('E_FERMI = 2.125', 'E_FERMI = 2.125\nE_FERMI = 2.2'),
  synthetic.replace('3 -.2 0', '0 0 0'),
  synthetic.replace('KPATH_BULK', 'OTHER_PATH'),
  synthetic.replace('G 0 0 0 M .4 .1 0', 'G 0 0 0 M .41 .1 0'),
  synthetic.replace("'Graphene_hr.dat'", "'other-name.dat'"),
]) assert.throws(() => parseGrapheneSettings(malformed), english ? /continuous path/i : /连续路径/);

const encoder = new TextEncoder();
const hrBytes = new Uint8Array(hr.bytes).fill(97);
const settingsBytes = encoder.encode(synthetic + '!' + ' '.repeat(settings.bytes - synthetic.length - 1));
const inputs = {hrBytes, settingsBytes};
const bufferOf = value => Uint8Array.from(value).buffer;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digestTable = new Map([[sha(hrBytes), hr.sha256], [sha(settingsBytes), settings.sha256]]);

// Successful offline lifecycle checks use a test-only digest substitute. The
// byte checks are exercised separately with native WebCrypto and by --live.
const fixtureDigest = {
  subtle: {async digest(algorithm, bytes) {
    assert.equal(algorithm, 'SHA-256');
    const digest = digestTable.get(sha(bytes));
    return digest ? bufferOf(Buffer.from(digest, 'hex')) : webcrypto.subtle.digest(algorithm, bytes);
  }},
};
const result = await verifyGrapheneSources({...inputs, crypto: fixtureDigest});
assert.equal(result.source, GRAPHENE_REFERENCE);
assert.equal(result.referenceFermiEV, 2.125);
assert.deepEqual(result.payload, {action: 'hr_import', hr_text: 'a'.repeat(hr.bytes), ...cleanShape});
assert.deepEqual(await verifyGrapheneSources({hrBytes: bufferOf(hrBytes), settingsBytes: bufferOf(settingsBytes),
  crypto: fixtureDigest}), result, 'Local ArrayBuffer inputs use exactly the same source verification');

await assert.rejects(verifyGrapheneSources({...inputs, crypto: webcrypto}), /SHA-256/);
await assert.rejects(verifyGrapheneSources({...inputs, hrBytes: settingsBytes, crypto: fixtureDigest}),
  error => error.sourceFile === hr.fileName);
await assert.rejects(verifyGrapheneSources({hrBytes, crypto: fixtureDigest}), error => error.sourceFile === settings.fileName);
const modifiedHR = hrBytes.slice();
modifiedHR[0] = 99;
await assert.rejects(verifyGrapheneSources({...inputs, hrBytes: modifiedHR, crypto: fixtureDigest}),
  error => error.sourceFile === hr.fileName && /SHA-256/.test(error.message));
const modifiedConfig = settingsBytes.slice();
modifiedConfig[modifiedConfig.length - 1] = 46;
await assert.rejects(verifyGrapheneSources({...inputs, settingsBytes: modifiedConfig, crypto: fixtureDigest}),
  error => error.sourceFile === settings.fileName && /SHA-256/.test(error.message));
const crlf = encoder.encode(new TextDecoder().decode(settingsBytes).replaceAll('\n', '\r\n'));
await assert.rejects(verifyGrapheneSources({...inputs, settingsBytes: crlf, crypto: fixtureDigest}),
  error => error.sourceFile === settings.fileName && !/SHA-256/.test(error.message));
await assert.rejects(verifyGrapheneSources({...inputs, crypto: {}}), /SHA-256/);

const pendingHR = hrBytes.slice();
let continueDigest;
const waitForDigest = new Promise(resolve => { continueDigest = resolve; });
const delayedCrypto = {subtle: {async digest(algorithm, bytes) {
  await waitForDigest;
  return fixtureDigest.subtle.digest(algorithm, bytes);
}}};
const pending = verifyGrapheneSources({...inputs, hrBytes: pendingHR, crypto: delayedCrypto});
pendingHR[0] = 99;
continueDigest();
const snapshot = await pending;
assert.deepEqual(snapshot.payload, result.payload, 'Digest and UTF-8 decode share one immutable byte snapshot');

const requests = [];
const bodyFor = url => (url === hr.rawURL ? hrBytes : settingsBytes);
const remotePair = await fetchGrapheneSources({crypto: fixtureDigest, fetchImpl: async (url, options) => {
  requests.push({url, options});
  return new Response(bodyFor(url));
}});
assert.deepEqual(remotePair, result);
assert.deepEqual(requests.map(request => request.url), [hr.rawURL, settings.rawURL]);
for (const {options} of requests) {
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  assert(options.signal instanceof AbortSignal);
}

let streamCanceled = false;
const oversized = new ReadableStream({
  start(controller) { controller.enqueue(new Uint8Array(hr.bytes + 1)); },
  cancel() { streamCanceled = true; },
});
await assert.rejects(fetchGrapheneSources({crypto: fixtureDigest, fetchImpl: async url =>
  new Response(url === hr.rawURL ? oversized : settingsBytes)}), error => error.sourceFile === hr.fileName);
assert(streamCanceled, 'Oversized HTTP response is stopped before bytes can be hashed');

await assert.rejects(fetchGrapheneSources({crypto: fixtureDigest, fetchImpl: async url =>
  new Response(url === hr.rawURL ? hrBytes.slice(0, 10) : settingsBytes)}), error => error.sourceFile === hr.fileName);
let siblingAborted = false;
await assert.rejects(fetchGrapheneSources({crypto: fixtureDigest, fetchImpl: async (url, {signal}) => {
  if (url === hr.rawURL) return new Response(null, {status: 404});
  return new Promise((resolve, reject) => signal.addEventListener('abort', () => {
    siblingAborted = true;
    reject(signal.reason);
  }, {once: true}));
}}), error => error.sourceFile === hr.fileName);
assert(siblingAborted);
await assert.rejects(fetchGrapheneSources({crypto: fixtureDigest, fetchImpl: async url => {
  if (url === settings.rawURL) throw new TypeError('Failed to fetch');
  return new Response(hrBytes);
}}), error => error.sourceFile === settings.fileName && (english ? /upstream/i : /上游/).test(error.message));
const disconnection = new ReadableStream({start(controller) { controller.error(new TypeError('Interrupted body')); }});
await assert.rejects(fetchGrapheneSources({crypto: fixtureDigest, fetchImpl: async url =>
  new Response(url === hr.rawURL ? hrBytes : disconnection)}), error => error.sourceFile === settings.fileName);

const controller = new AbortController();
const releases = [];
const fetching = fetchGrapheneSources({signal: controller.signal, crypto: fixtureDigest, fetchImpl: async url =>
  new Promise(resolve => { releases.push(() => resolve(new Response(bodyFor(url)))); })});
assert.equal(releases.length, 2);
controller.abort();
for (const release of releases) release();
await assert.rejects(fetching, {name: 'AbortError'});
await assert.rejects(verifyGrapheneSources({...inputs, signal: controller.signal, crypto: fixtureDigest}), {name: 'AbortError'});

if (process.argv.includes('--live')) {
  const loaded = await fetchGrapheneSources({signal: AbortSignal.timeout(20_000), crypto: webcrypto});
  assert.equal(loaded.referenceFermiEV, -1.2533);
  assert.deepEqual(loaded.payload.lattice, [[2.137711, -1.234208, 0], [0, 2.468416, 0], [0, 0, 10]]);
  assert.deepEqual(loaded.payload.path.map(point => point.label), ['M', 'K', 'Γ', 'M']);
  assert.deepEqual(loaded.payload.path[1].k, [.33333333, .33333333, 0]);
  assert.equal(loaded.payload.points_per_segment, 101);
  const lines = loaded.payload.hr_text.split('\n');
  assert.equal(Number(lines[1]), 2);
  assert.equal(Number(lines[2]), 315);
  assert.equal(sha(encoder.encode(loaded.payload.hr_text)), hr.sha256);
  console.log('Official pinned WannierTools file pair verified from upstream; no files were written.');
}

console.log(`Graphene source provenance (${english ? 'English' : 'Chinese'}): settings contract, bounded remote input, local byte parity, strict digests and cancellation passed.`);
