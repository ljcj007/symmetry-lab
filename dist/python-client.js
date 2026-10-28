// Shared browser-local Python engine. No calculation payload is sent to a server.
let worker = null;
let active = null;
let nextId = 0;
const listeners = new Set();
function notify(status, message) {
  for (const listener of listeners) listener({status, message});
}
export function onPythonStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function stop(message) {
  worker?.terminate();
  worker = null;
  if (active) {
    clearTimeout(active.timer);
    const request = active;
    active = null;
    request.reject(new Error(message));
  }
  notify('idle', message);
}
export function cancelPython() { stop('计算已取消，可修改参数后重新运行。'); }
export function runPythonTask(action, payload) {
  if (active) return Promise.reject(new Error('已有 Python 任务正在运行，请等待完成或点击“取消计算”。'));
  const nineJ = action === 'teaching_labs' && payload?.lab === 'lie' && payload?.experiment === 'su3_ninej';
  const seconds = nineJ ? 600 : 180;
  return new Promise((resolve, reject) => {
    if (!worker) {
      worker = new Worker(new URL('./python-worker.js?v=20261028-response1', import.meta.url), {type: 'module'});
      const createdWorker = worker;
      worker.onerror = event => {if(worker===createdWorker)stop(event.message || 'Python 模块加载失败，请重试。');};
      worker.onmessage = ({data}) => {
        if (!active || data.id !== active.id) return;
        if (data.status === 'loading' || data.status === 'running') {
          if (data.status === 'running') {
            clearTimeout(active.timer);
            const deadline = active.seconds;
            active.timer = setTimeout(() => stop(`计算超过 ${deadline} 秒，已停止。请减少模型规模或缩小搜索范围。`), deadline * 1000);
          }
          notify(data.status, data.message);
          return;
        }
        clearTimeout(active.timer);
        const request = active;
        active = null;
        notify(data.error ? 'error' : 'ready', data.error ? 'Python · 请检查输入' : 'Python · 本地计算就绪');
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.result);
      };
    }
    active = {id: ++nextId, resolve, reject, seconds,
      timer: setTimeout(() => stop('Python 环境加载超时。请检查网络后重试；首次运行需要下载解释器和数值库。'), 180000)};
    notify('loading', '正在准备 Python 环境…');
    worker.postMessage({id: active.id, action, payload});
  });
}
