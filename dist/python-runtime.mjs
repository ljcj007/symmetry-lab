// This configuration is shared by both language editions and the calculation Worker.
export const PYTHON_RUNTIME_VERSION = '314.0.7';
export const PYTHON_RUNTIME_BASE = new URL('./vendor/pyodide/314.0.7/', import.meta.url).href;
export const PYTHON_RUNTIME_TIMEOUT_MS = 120000;
const ALLOWED_PACKAGES = ['mpmath', 'numpy', 'pyyaml', 'sympy'];
// The module is shared, while the Worker URL retains the selected language.
const message = (zh, en) => /\/en\//.test(globalThis.location?.pathname || '') ? en : zh;

export function validateRuntimeLock(lock) {
  if (lock?.info?.python !== '3.14.2' || lock?.info?.abi_version !== '2026_0' ||
      JSON.stringify(Object.keys(lock.packages || {}).sort()) !== JSON.stringify(ALLOWED_PACKAGES)) {
    throw new Error(message('本站 Python 运行时版本或计算库清单不匹配，请刷新页面后重试。', 'The site Python runtime version or package list does not match. Refresh the page and retry.'));
  }
  for (const entry of Object.values(lock.packages)) {
    if (!/^[a-zA-Z0-9_.+-]+\.whl$/.test(entry.file_name) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        !entry.depends.every(name => ALLOWED_PACKAGES.includes(name))) {
      throw new Error(message('本站 Python 计算库路径或校验值无效。', 'The site Python package path or checksum is invalid.'));
    }
  }
  return lock;
}

export function createRuntimeLoader({
  baseURL = PYTHON_RUNTIME_BASE,
  importModule = url => import(url),
  fetchResource = (url, options) => fetch(url, options),
  timeoutMs = PYTHON_RUNTIME_TIMEOUT_MS,
} = {}) {
  let pending;
  let attempt = 0;
  return function getRuntime() {
    if (pending) return pending;
    const controller = new AbortController();
    let timer;
    const loading = (async () => {
      const lockURL = new URL('pyodide-lock.json', baseURL);
      const response = await fetchResource(lockURL, {signal: controller.signal});
      if (!response.ok) throw new Error(message(`本站 Python 清单下载失败 (${response.status})`, `The site Python package list could not be downloaded (${response.status})`));
      const lock = validateRuntimeLock(await response.json());
      // Failed module imports are cached by browsers. A new attempt can fetch again.
      const moduleURL = new URL('pyodide.mjs', baseURL);
      moduleURL.searchParams.set('attempt', String(++attempt));
      const {loadPyodide} = await importModule(moduleURL.href);
      const wasmModuleURL = new URL('pyodide.asm.mjs', baseURL);
      wasmModuleURL.searchParams.set('attempt', String(attempt));
      const {default: createPyodideModule} = await importModule(wasmModuleURL.href);
      return loadPyodide({
        indexURL: baseURL,
        packageBaseUrl: baseURL, // Exact upstream spelling: also prevents its CDN fallback.
        lockFileContents: lock,
        stdLibURL: new URL('python_stdlib.zip', baseURL).href,
        createPyodideModule, // A failed asm module import must also be retryable.
      });
    })();
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(message('本站 Python 资源加载超时，请检查网络并再次点击计算。', 'The site Python resources took too long to load. Check your connection and run the calculation again.')));
      }, timeoutMs);
    });
    pending = Promise.race([loading, timeout]).catch(error => {
      pending = undefined;
      throw error;
    }).finally(() => clearTimeout(timer));
    return pending;
  };
}

export const getPythonRuntime = createRuntimeLoader();
