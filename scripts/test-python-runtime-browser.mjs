// Real cold Worker computations, without third-party browser automation packages.
// Usage: node scripts/test-python-runtime-browser.mjs [path/to/chrome-or-edge] [--english]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const dist = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const english = process.argv.includes('--english');
const executable = process.argv.slice(2).find(value => !value.startsWith('--')) || process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const workerPath = '/symmetry-lab/' + (english ? 'en/' : '') + 'python-worker.js';
const testWorkerPath = english ? '/en/test-worker.mjs' : '/test-worker.mjs';
assert.ok(fs.existsSync(executable), 'Pass an installed Chromium/Edge executable');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'symmetry-runtime-'));
const requests = [], blocked = [];
const debug = process.env.RUNTIME_TEST_DEBUG === '1';
let failedResource;
let failureUsed = false;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (debug) console.log('HTTP', pathname);
  requests.push(`http://${request.headers.host}${request.url}`);
  if (pathname === testWorkerPath) {
    response.writeHead(200, {'Content-Type': 'application/javascript', 'Cache-Control': 'no-store'});
    response.end(`const fetched=[],blocked=[];const originalFetch=globalThis.fetch;globalThis.fetch=(input,options)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);fetched.push(url.href);if(url.origin!==location.origin){blocked.push(url.href);return Promise.reject(new Error('Third-party fetch blocked'));}return originalFetch(input,options)};const originalPost=postMessage;globalThis.postMessage=data=>originalPost({...data,__requests:[...fetched,...performance.getEntriesByType('resource').map(x=>x.name)],__blocked:blocked});await import('${workerPath}');postMessage({status:'ready'});`);
    return;
  }
  if (pathname === '/test') {
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end('<!doctype html><title>Runtime cold-start verification</title>');
    return;
  }
  const filename = path.resolve(dist, '.' + pathname.replace(/^\/symmetry-lab/, ''));
  if (!filename.startsWith(dist + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    response.writeHead(404); response.end(); return;
  }
  if (failedResource && pathname.endsWith(failedResource) && !failureUsed) {
    failureUsed = true; response.writeHead(503); response.end('Simulated temporary failure'); return;
  }
  const mime = {'.js': 'application/javascript', '.mjs': 'application/javascript', '.wasm': 'application/wasm', '.json': 'application/json'};
  response.writeHead(200, {'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
  fs.createReadStream(filename).pipe(response);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile], {windowsHide: true});
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Browser CDP startup timed out')), 20000);
    browser.on('error', reject);
    browser.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {clearTimeout(timer); resolve(match[1]);}
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {socket.onopen = resolve; socket.onerror = reject;});
  let serial = 0;
  const calls = new Map();
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => {calls.delete(id); reject(new Error('CDP timeout: ' + method));}, method === 'Runtime.evaluate' ? 160000 : 20000);
    calls.set(id, {resolve: value => {clearTimeout(timer); resolve(value);}, reject: error => {clearTimeout(timer); reject(error);}});
    socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
  });
  socket.onmessage = async ({data}) => {
    const event = JSON.parse(data);
    if (event.id) {
      const call = calls.get(event.id); calls.delete(event.id);
      if (event.error) call.reject(new Error(JSON.stringify(event.error))); else call.resolve(event.result);
      return;
    }
    const sessionId = event.sessionId;
    if (event.method === 'Network.requestWillBeSent') requests.push(event.params.request.url);
    if (debug && event.method === 'Runtime.exceptionThrown') console.log('Browser exception:', JSON.stringify(event.params));
    if (debug && event.method === 'Runtime.consoleAPICalled') console.log('Browser console:', JSON.stringify(event.params.args));
    if (event.method === 'Fetch.requestPaused') {
      const {requestId, request} = event.params;
      if (new URL(request.url).origin !== origin) {
        blocked.push(request.url);
        await send('Fetch.failRequest', {requestId, errorReason: 'BlockedByClient'}, sessionId);
      } else await send('Fetch.continueRequest', {requestId}, sessionId);
    }
  };
  async function coldRun(label, action, payload, failPath) {
    console.log('Checking:', label);
    failedResource = failPath; failureUsed = false;
    const start = requests.length;
    const {browserContextId} = await send('Target.createBrowserContext');
    const {targetId} = await send('Target.createTarget', {url: origin + '/test', browserContextId});
    const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
    await send('Network.enable', {}, sessionId);
    await send('Fetch.enable', {patterns: [{urlPattern: '*'}]}, sessionId);
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, sessionId);
      assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    // Target.createTarget starts navigation asynchronously. Do not create a Worker
    // in the initial about:blank context that the navigation would then destroy.
    while (!(await evaluate(`location.href === '${origin}/test' && document.readyState === 'complete'`))) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    await evaluate(`globalThis.worker = new Worker('${origin}${testWorkerPath}', {type:'module'});globalThis.ready = new Promise((resolve,reject)=>{worker.onmessage=({data})=>{if(data.status==='ready')resolve(true)};worker.onerror=error=>reject(new Error(error.message))});globalThis.request = (action,payload) => new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Worker calculation timed out')),150000);worker.onmessage=({data})=>{if(['done','error'].includes(data.status)){clearTimeout(timer);resolve(data)}};worker.postMessage({id:'runtime-test',action,payload})});ready`);
    let result = await evaluate(`request(${JSON.stringify(action)}, ${JSON.stringify(payload)})`);
    if (failPath) {
      assert.equal(result.status, 'error', JSON.stringify(result).slice(0, 500));
      assert.equal(failureUsed, true, 'failure injection hit the requested resource');
      result = await evaluate(`request(${JSON.stringify(action)}, ${JSON.stringify(payload)})`);
    }
    assert.equal(result.status, 'done', JSON.stringify(result).slice(0, 700));
    assert.ok(!result.error, result.error);
    assert.deepEqual(result.__blocked, [], 'Worker attempted no third-party fetch');
    const urls = [...new Set([...requests.slice(start), ...result.__requests])];
    for (const url of urls) assert.equal(new URL(url).origin, origin);
    assert.ok(urls.some(url => url.includes('/vendor/pyodide/314.0.7/pyodide.mjs')));
    await send('Target.disposeBrowserContext', {browserContextId});
    console.log(`PASS: ${label}; ${urls.length} same-origin requests`);
    return {result: result.result, urls};
  }
  const exact = await coldRun('cold NumPy + SymPy calculation', 'phase', {a: -1, b: 1, c: 0, h: 0});
  assert.equal(exact.result.landau.globalMinima.length, 2);
  assert.ok(Math.abs(exact.result.landau.globalMinimumEnergy + .25) < 1e-12);
  for (const name of ['numpy-', 'sympy-', 'mpmath-']) assert.ok(exact.urls.some(url => url.includes(name)));
  const numeric = await coldRun('cold NumPy eigenproblem', 'dynamic_scattering_lab', {});
  assert.equal(numeric.result.checks.passed, true);
  const yamlPayload = {content: fs.readFileSync(path.join(dist, 'data/examples/phonopy-demo.yaml'), 'utf8'), filename: 'phonopy-demo.yaml', selected_q: 8, supercell: [2, 1, 1]};
  const yaml = await coldRun('cold NumPy + PyYAML Phonopy route', 'phonopy', yamlPayload);
  assert.equal(yaml.result.summary.qpointCount, 18);
  assert.equal(yaml.result.summary.bandCount, 6);
  assert.equal(yaml.result.animation.atoms.length, 4);
  assert.ok(yaml.urls.some(url => url.includes('pyyaml-6.0.3-')));
  await coldRun('failed runtime import then same-Worker retry', 'phase', {a: -1, b: 1}, '/pyodide.mjs');
  await coldRun('failed asm module import then same-Worker retry', 'phase', {a: -1, b: 1}, '/pyodide.asm.mjs');
  await coldRun('failed package fetch then same-Worker retry', 'phonopy', yamlPayload, '/pyyaml-6.0.3-cp314-cp314-pyemscripten_2026_0_wasm32.whl');
  assert.deepEqual(blocked, [], 'no third-party request was even attempted');
  await send('Browser.close');
  console.log('PASS: all cold computations and retries completed with third-party network blocked.');
} finally {
  socket?.close();
  browser.kill();
  server.closeAllConnections(); server.close();
  // Only remove the freshly created test profile, inside the OS temporary directory.
  assert.ok(path.resolve(profile).startsWith(path.resolve(os.tmpdir(), 'symmetry-runtime-')));
  try {fs.rmSync(profile, {recursive: true, force: true, maxRetries: 3, retryDelay: 200});} catch {}
}
