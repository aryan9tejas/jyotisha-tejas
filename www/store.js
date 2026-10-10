'use strict';
/* On-device storage for profiles and saved views (IndexedDB, mirrored in memory), plus place search. */
const Local = (() => {
  const DB = 'jyotisha-tejas', KEY = 'state';
  let state = {profiles: [], saved: [], pseq: 0, sseq: 0};
  let db = null, Places = null, placesReady = null;

  function idb() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return res(null);
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    });
  }
  const getKV = () => new Promise(res => { if (!db) return res(null); const r = db.transaction('kv').objectStore('kv').get(KEY); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  async function persist() {
    try { localStorage.setItem('jt_state', JSON.stringify(state)); } catch (e) { /* ignore */ }
    if (!db) return;
    await new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(JSON.parse(JSON.stringify(state)), KEY); t.oncomplete = res; t.onerror = res; });
  }
  async function init() {
    db = await idb();
    let s = await getKV();
    if (!s) { try { s = JSON.parse(localStorage.getItem('jt_state') || 'null'); } catch (e) { s = null; } }
    if (s) state = s;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
    placesReady = import('./places.mjs').then(m => { Places = m; return m.load('data/places.json'); });
  }
  const now = () => new Date().toISOString().slice(0, 19);
  const PF = ['name', 'year', 'month', 'day', 'hour', 'minute', 'second', 'place', 'lat', 'lon', 'tz', 'gender', 'notes'];

  async function handle(url, body, method) {
    const [path, qs] = url.split('?');
    const q = new URLSearchParams(qs || '');
    method = method || (body === undefined ? 'GET' : 'POST');
    if (path === '/api/places') { await placesReady; return Places.search(q.get('q') || ''); }
    if (path === '/api/tz') { await placesReady; return {tz: Places.tzFor(+q.get('lat'), +q.get('lon'))}; }
    if (path === '/api/profiles') {
      if (method === 'GET') return [...state.profiles].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
      const d = body, rec = {};
      PF.forEach(k => rec[k] = d[k] ?? null);
      if (d.id) { const i = state.profiles.findIndex(p => p.id === d.id); if (i >= 0) { state.profiles[i] = {...state.profiles[i], ...rec}; await persist(); return {id: d.id}; } }
      const id = ++state.pseq; state.profiles.push({id, ...rec, created: now()}); await persist(); return {id};
    }
    let m = path.match(/^\/api\/profiles\/(\d+)$/);
    if (m && method === 'DELETE') { const id = +m[1]; state.profiles = state.profiles.filter(p => p.id !== id); state.saved = state.saved.filter(s => s.profile_id !== id); await persist(); return {ok: true}; }
    if (path === '/api/saved') {
      if (method === 'GET') {
        const pid = q.get('profile_id') ? +q.get('profile_id') : null;
        return state.saved.filter(s => !pid || s.profile_id === pid).map(({payload, ...r}) => r).sort((a, b) => b.id - a.id);
      }
      const id = ++state.sseq; state.saved.push({id, profile_id: body.profile_id ?? null, title: body.title, kind: body.kind, payload: body.payload, created: now()}); await persist(); return {id};
    }
    m = path.match(/^\/api\/saved\/(\d+)$/);
    if (m) {
      const id = +m[1];
      if (method === 'DELETE') { state.saved = state.saved.filter(s => s.id !== id); await persist(); return {ok: true}; }
      const r = state.saved.find(s => s.id === id); if (!r) throw new Error('Not found'); return r;
    }
    throw new Error('Unknown local route ' + path);
  }
  const isLocal = url => /^\/api\/(places|tz|profiles|saved)/.test(url);
  const exportAll = () => JSON.stringify({app: 'Jyotisha Tejas', version: 1, state}, null, 1);
  async function importAll(text) {
    const j = JSON.parse(text);
    if (!j || !j.state || !Array.isArray(j.state.profiles)) throw new Error('Not a Jyotisha Tejas backup file');
    state = j.state; await persist();
  }
  return {init, handle, isLocal, exportAll, importAll};
})();
