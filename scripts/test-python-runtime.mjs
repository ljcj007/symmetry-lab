import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRuntimeLoader, validateRuntimeLock, PYTHON_RUNTIME_BASE} from '../dist/python-runtime.mjs';
const lock = JSON.parse(fs.readFileSync(new URL('../dist/vendor/pyodide/314.0.7/pyodide-lock.json', import.meta.url)));
validateRuntimeLock(lock);
assert.ok(PYTHON_RUNTIME_BASE.endsWith('/vendor/pyodide/314.0.7/'));
const escaped = structuredClone(lock);
escaped.packages.numpy.file_name = 'https://cdn.example/numpy.whl';
assert.throws(() => validateRuntimeLock(escaped));
const runtime = {};
const urls = [];
let imports = 0;
const get = createRuntimeLoader({
  baseURL: 'https://symmetry.test/subdir/vendor/pyodide/314.0.7/',
  fetchResource: async url => {
    assert.equal(new URL(url).origin, 'https://symmetry.test');
    return {ok: true, json: async () => lock};
  },
  importModule: async url => {
    urls.push(url);
    if (++imports === 1) throw new Error('simulated cold import failure');
    if (url.includes('pyodide.asm.mjs')) return {default: () => {}};
    return {loadPyodide: async options => {
      assert.equal(options.packageBaseUrl, options.indexURL);
      assert.equal(options.stdLibURL, options.indexURL + 'python_stdlib.zip');
      assert.deepEqual(options.lockFileContents, lock);
      assert.equal(typeof options.createPyodideModule, 'function');
      return runtime;
    }};
  },
});
const first = get();
assert.equal(first, get(), 'concurrent startup shares one attempt');
await assert.rejects(first, /cold import failure/);
assert.equal(await get(), runtime, 'a failed startup can retry');
assert.equal(await get(), runtime);
assert.equal(imports, 3);
assert.notEqual(urls[0], urls[1], 'retry bypasses the failed browser module record');
let wasmImports = 0;
const wasmRetry = createRuntimeLoader({
  fetchResource: async () => ({ok: true, json: async () => lock}),
  importModule: async url => {
    if (url.includes('pyodide.asm.mjs')) {
      if (++wasmImports === 1) throw new Error('simulated asm module failure');
      return {default: () => {}};
    }
    return {loadPyodide: async () => runtime};
  },
});
await assert.rejects(wasmRetry(), /asm module failure/);
assert.equal(await wasmRetry(), runtime);
let fetches = 0;
const timed = createRuntimeLoader({
  timeoutMs: 10,
  fetchResource: async () => {
    if (++fetches === 1) return new Promise(() => {});
    return {ok: true, json: async () => lock};
  },
  importModule: async () => ({loadPyodide: async () => runtime}),
});
await assert.rejects(timed(), /超时/);
assert.equal(await timed(), runtime, 'timeout does not poison later attempts');
console.log('PASS: pinned same-origin routing, invalid remote lock paths, concurrent startup, loader and asm import retries, timeout retry.');
