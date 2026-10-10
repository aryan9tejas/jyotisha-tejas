'use strict';
/* Client for the calculation worker (Python in WebAssembly). */
const Engine = (() => {
  let worker = null, nextId = 1, readyRes, readyRej;
  const pending = new Map();
  const ready = new Promise((res, rej) => { readyRes = res; readyRej = rej; });
  ready.catch(() => {});
  let onStatus = () => {};
  let mode = 'worker';
  function onMsg(m) {
    if (m.type === 'status') onStatus(m.msg);
    else if (m.type === 'ready') { onStatus(''); readyRes(); }
    else if (m.type === 'fatal') { onStatus('Engine failed: ' + m.error.split('\n')[0]); readyRej(new Error(m.error)); }
    else if (m.type === 'result') { const p = pending.get(m.id); pending.delete(m.id); if (p) p(m.result); }
  }
  function startMain() {
    mode = 'main';
    window.addEventListener('engine-msg', ev => onMsg(ev.detail));
    import('./engine/worker.js').catch(e => { onStatus('Engine failed: ' + e.message); readyRej(e); });
  }
  function start() {
    let started = false;
    try {
      if (/noworker=1/.test(location.search)) throw new Error('worker disabled');
      worker = new Worker('engine/worker.js', {type: 'module'});
    } catch (e) { startMain(); return; }
    worker.onmessage = ev => { started = true; onMsg(ev.data); };
    worker.onerror = e => {
      if (!started && mode === 'worker') { worker = null; startMain(); }   // worker could not start: run on the main thread instead
      else onStatus('Engine error: ' + (e.message || 'worker failed'));
    };
  }
  function call(path, body) {
    return new Promise((res, rej) => {
      const id = nextId++;
      pending.set(id, txt => { try { const j = JSON.parse(txt); if (j && j.error) rej(new Error(j.error)); else res(j); } catch (e) { rej(e); } });
      const msg = {id, path, body: JSON.stringify(body || {})};
      if (mode === 'main') window.__engineCall(msg); else worker.postMessage(msg);
    });
  }
  return {start, call, ready, set onStatus(f) { onStatus = f; }};
})();
