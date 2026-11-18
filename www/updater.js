/* Offline install and update prompt. The browser checks for a new deployment when the app is opened or brought back to the front.
   A banner appears only when a genuinely new version has been downloaded; nothing polls on a timer. */
(function () {
  /* Store apps (Capacitor) ship their files inside the app and update through the store, so no service worker is used there. */
  var native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (native) {
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
    return;
  }
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
  var REG = null, busy = false;
  function note(txt, ms) {
    var n = document.getElementById('jtPull');
    if (!n) {
      n = document.createElement('div'); n.id = 'jtPull'; n.setAttribute('role', 'status');
      n.style.cssText = 'position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:99998;background:#2b2418;color:#fff;border-radius:999px;padding:8px 16px;font:600 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none';
      document.body.appendChild(n);
    }
    n.textContent = txt; n.style.display = '';
    clearTimeout(n._t); if (ms) n._t = setTimeout(function () { n.style.display = 'none'; }, ms);
  }
  function check() {
    if (busy) return; busy = true;
    if (!REG) { note('Updates are checked when online', 2500); busy = false; return; }
    note('Checking for a new version...');
    REG.update().then(function () {
      if (document.getElementById('jtUpd')) { note('', 1); }
      else if (REG.waiting && navigator.serviceWorker.controller) { banner(REG.waiting); note('', 1); }
      else if (REG.installing) note('New version found, downloading...', 6000);
      else note('You are on the latest version', 2500);
    }).catch(function () { note('Could not check. Are you online?', 3000); }).then(function () { busy = false; });
  }
  /* pull down on the Live page (at the very top) to check for a new version: a deliberate gesture, so it costs no battery */
  var y0 = null, pulled = false;
  document.addEventListener('touchstart', function (e) {
    var live = location.hash !== '#app';
    y0 = (live && (window.scrollY || document.documentElement.scrollTop || 0) <= 0 && e.touches.length === 1) ? e.touches[0].clientY : null; pulled = false;
  }, {passive: true});
  document.addEventListener('touchmove', function (e) {
    if (y0 === null) return;
    var dy = e.touches[0].clientY - y0;
    if (dy > 120 && !pulled) { pulled = true; note('Release to check for a new version'); }
    else if (dy <= 120 && pulled) { pulled = false; var n = document.getElementById('jtPull'); if (n) n.style.display = 'none'; }
  }, {passive: true});
  document.addEventListener('touchend', function () { if (pulled) { pulled = false; y0 = null; check(); } y0 = null; }, {passive: true});
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    REG = reg;
    watch(reg);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
  }).catch(function () {});
})();
