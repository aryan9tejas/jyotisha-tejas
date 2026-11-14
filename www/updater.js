/* Offline install and update prompt. The browser checks for a new deployment when the app is opened or brought back to the front.
   A banner appears only when a genuinely new version has been downloaded; nothing polls on a timer. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
  var reloading = false;
  function banner(worker) {
    if (document.getElementById('jtUpd')) return;
    var b = document.createElement('div');
    b.id = 'jtUpd'; b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));z-index:99999;background:#2b2418;color:#fff;border-radius:999px;padding:10px 16px;font:600 14px system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.3);display:flex;gap:12px;align-items:center;max-width:92vw';
    var t = document.createElement('span'); t.textContent = 'New version ready';
    var go = document.createElement('button'); go.textContent = 'Tap to refresh';
    go.style.cssText = 'background:#e8b04a;color:#2b2418;border:0;border-radius:999px;padding:6px 12px;font:700 13px system-ui,sans-serif;cursor:pointer';
    var x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', 'Dismiss');
    x.style.cssText = 'background:none;border:0;color:#fff;font-size:18px;cursor:pointer;padding:0 2px';
    go.onclick = function () { go.disabled = true; go.textContent = 'Updating'; worker.postMessage('skip'); };
    x.onclick = function () { b.remove(); };
    b.appendChild(t); b.appendChild(go); b.appendChild(x);
    document.body.appendChild(b);
  }
  function watch(reg) {
    if (reg.waiting && navigator.serviceWorker.controller) banner(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', function () {
        if (w.state === 'installed' && navigator.serviceWorker.controller) banner(w);
      });
    });
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading || !window.__jtHadController) return;
    reloading = true; location.reload();
  });
  window.__jtHadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    watch(reg);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
  }).catch(function () {});
})();
