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
export function cancelPython() { stop("The calculation has been cancelled. You can modify the parameters and run again."); }
export function runPythonTask(action, payload) {
  if (active) return Promise.reject(new Error("There is already Python task running, please wait for completion or click \"Cancel Calculation\"."));
  const nineJ = action === 'teaching_labs' && payload?.lab === 'lie' && payload?.experiment === 'su3_ninej';
  const seconds = nineJ ? 600 : 180;
  return new Promise((resolve, reject) => {
    if (!worker) {
      worker = new Worker(new URL('./python-worker.js?v=20261113-route1', import.meta.url), {type: 'module'});
      const createdWorker = worker;
      worker.onerror = event => {if(worker===createdWorker)stop(event.message || "Python Module loading failed, please try again.");};
      worker.onmessage = ({data}) => {
        if (!active || data.id !== active.id) return;
        if (data.status === 'loading' || data.status === 'running') {
          if (data.status === 'running') {
            clearTimeout(active.timer);
            const deadline = active.seconds;
            active.timer = setTimeout(() => stop(`calculation exceeds ${deadline} seconds, stopped. Please reduce the model size or narrow the search scope.`), deadline * 1000);
          }
          notify(data.status, data.message);
          return;
        }
        clearTimeout(active.timer);
        const request = active;
        active = null;
        notify(data.error ? 'error' : 'ready', data.error ? "Python · Please check your input" : "Python · Local computing ready");
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.result);
      };
    }
    active = {id: ++nextId, resolve, reject, seconds,
      timer: setTimeout(() => stop("Python Environment loading timed out. Please check the network and try again; the first run requires downloading the interpreter and numerical library."), 180000)};
    notify('loading', "is preparing Python environment...");
    worker.postMessage({id: active.id, action, payload});
  });
}
