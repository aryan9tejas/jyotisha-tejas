'use strict';
/* Jyotisha Tejas security helpers: import validation, passphrase-encrypted backups (AES-GCM, PBKDF2) and an optional app lock.
   Everything stays on this device. The app lock is a privacy convenience: it hides the screen from people who borrow the phone; it is not a
   replacement for the phone's own lock, and data is not encrypted at rest by it (the phone's storage encryption does that). */
const Sec = (() => {
  const te = new TextEncoder(), td = new TextDecoder();
  const MAXFILE = 30e6, ITER = 310000;
  const $e = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
  const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const safeParse = text => JSON.parse(text, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);

  /* ------------------------------------------------------------ small dialog */
  function ask({title, intro, fields, ok, cancel}) {
    return new Promise(res => {
      const w = $e('div', 'xmodal');
      w.innerHTML = `<form class="xbox" role="dialog" aria-label="${escH(title)}" autocomplete="off"><h3>${escH(title)}</h3>${intro ? `<p class="note">${intro}</p>` : ''}`
        + (fields || []).map(f => f.select
          ? `<label class="sec-f">${escH(f.label)}<select name="${f.id}">${f.select.map(o => `<option value="${escH(o[0])}"${String(o[0]) === String(f.value) ? ' selected' : ''}>${escH(o[1])}</option>`).join('')}</select></label>`
          : `<label class="sec-f">${escH(f.label)}<input name="${f.id}" type="${f.type || 'password'}"${f.pin ? ' inputmode="numeric" pattern="[0-9]*" maxlength="8"' : ''} autocomplete="${f.type === 'text' ? 'off' : 'new-password'}"></label>`).join('')
        + `<p class="note sec-err" role="alert"></p><div class="xbtns"><button type="submit">${escH(ok || 'OK')}</button><button type="button" class="sec" data-x>${escH(cancel || 'Cancel')}</button></div></form>`;
      document.body.appendChild(w);
      const form = w.firstElementChild, err = form.querySelector('.sec-err');
      const done = v => { w.remove(); res(v); };
      form.querySelector('[data-x]').onclick = () => done(null);
      w.addEventListener('keydown', e => { if (e.key === 'Escape') done(null); });
      form.onsubmit = async e => {
        e.preventDefault();
        const v = {}; (fields || []).forEach(f => { v[f.id] = form.elements[f.id].value; });
        if (ask.check) { const m = await ask.check(v); if (m) { err.textContent = m; return; } }
        done(v);
      };
      const first = form.querySelector('input,select'); if (first) setTimeout(() => first.focus(), 50);
    });
  }
  async function askChecked(opts, check) { ask.check = check; try { return await ask(opts); } finally { ask.check = null; } }

  /* ------------------------------------------------------------ encryption */
  async function deriveKey(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(text, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt, ITER);
    const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, te.encode(text)));
    return JSON.stringify({app: 'Jyotisha Tejas', enc: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: toB64(salt), iv: toB64(iv), data: toB64(ct)});
  }
  async function decrypt(env, pass) {
    const iter = Math.min(Math.max(+env.iter || ITER, 100000), 2000000);
    const key = await deriveKey(pass, fromB64(env.salt), iter);
    try { return td.decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: fromB64(env.iv)}, key, fromB64(env.data))); }
    catch (e) { throw new Error('Wrong passphrase, or the file was changed'); }
  }

  /* ------------------------------------------------------------ backup file */
  const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  /** Ask whether to protect the backup, then return {name, text} or null if cancelled. */
  async function makeBackup(plainText) {
    if (!(window.crypto && crypto.subtle)) return {name: `jyotisha-tejas-backup-${stamp()}.json`, text: plainText, enc: false};
    const v = await askChecked({title: 'Back up your data', intro: 'Protect the backup file with a passphrase so that nobody who finds the file can read your clients. Leave both boxes empty for a plain file. <b>There is no way to recover a lost passphrase.</b>',
      fields: [{id: 'p1', label: 'Passphrase (optional)'}, {id: 'p2', label: 'Repeat passphrase'}], ok: 'Create backup'},
    async v => (v.p1 || v.p2) ? (v.p1.length < 8 ? 'Use at least 8 characters.' : v.p1 !== v.p2 ? 'The two passphrases do not match.' : '') : '');
    if (!v) return null;
    if (!v.p1) return {name: `jyotisha-tejas-backup-${stamp()}.json`, text: plainText, enc: false};
    return {name: `jyotisha-tejas-backup-${stamp()}.enc.json`, text: await encrypt(plainText, v.p1), enc: true};
  }
  /** Read a backup file's text; asks for the passphrase when it is encrypted. Returns the plain JSON text, or null if cancelled. */
  async function openBackup(text) {
    if (text.length > MAXFILE) throw new Error('That file is too large to be a backup');
    const j = safeParse(text);
    if (!j || typeof j !== 'object') throw new Error('Not a Jyotisha Tejas backup file');
    if (!j.enc) return text;
    if (!j.salt || !j.iv || !j.data) throw new Error('This encrypted backup is damaged');
    for (let tries = 0; tries < 5; tries++) {
      let plain = null;
      const v = await askChecked({title: 'Encrypted backup', intro: 'Enter the passphrase you chose when you made this backup.', fields: [{id: 'p', label: 'Passphrase'}], ok: 'Unlock'},
        async v => { try { plain = await decrypt(j, v.p); return ''; } catch (e) { return e.message; } });
      if (!v) return null;
      if (plain !== null) return plain;
    }
    throw new Error('Too many wrong attempts');
  }

  /* ------------------------------------------------------------ validation of imported data */
  const str = (v, n) => v == null ? null : String(v).slice(0, n);
  const num = v => { const x = Number(v); return v !== null && v !== '' && Number.isFinite(x) ? x : null; };
  function deep(v, depth, cap) {
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') return v.slice(0, cap);
    if (depth > 8) return null;
    if (Array.isArray(v)) return v.slice(0, 5000).map(x => deep(x, depth + 1, cap));
    if (typeof v === 'object') { const o = {}; Object.keys(v).slice(0, 500).forEach(k => { if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') o[k.slice(0, 80)] = deep(v[k], depth + 1, cap); }); return o; }
    return null;
  }
  /** Returns a cleaned {state, groups} or throws. Numbers are coerced so nothing imported can carry markup into a numeric field. */
  function validate(j) {
    if (!j || typeof j !== 'object' || !j.state || !Array.isArray(j.state.profiles)) throw new Error('Not a Jyotisha Tejas backup file');
    const S = j.state;
    if (S.profiles.length > 5000 || (Array.isArray(S.saved) && S.saved.length > 20000)) throw new Error('This backup has more entries than the app supports');
    const seen = new Set(), profiles = [];
    for (const p of S.profiles) {
      if (!p || typeof p !== 'object') continue;
      const id = Math.floor(num(p.id) || 0), y = num(p.year), mo = num(p.month), d = num(p.day);
      if (id <= 0 || seen.has(id) || y === null || mo === null || d === null) continue;
      seen.add(id);
      const tz = str(p.tz, 60);
      profiles.push({id, name: str(p.name, 200), year: y, month: mo, day: d, hour: num(p.hour) ?? 0, minute: num(p.minute) ?? 0, second: num(p.second) ?? 0,
        place: str(p.place, 300), lat: num(p.lat), lon: num(p.lon), tz: tz && /^[A-Za-z0-9_\/+\-]{1,60}$/.test(tz) ? tz : null,
        gender: str(p.gender, 20), notes: str(p.notes, 20000), tag: str(p.tag, 60), star: !!p.star,
        sessions: Array.isArray(p.sessions) ? deep(p.sessions, 0, 20000) : p.sessions == null ? null : [], follow: Array.isArray(p.follow) ? deep(p.follow, 0, 2000) : p.follow == null ? null : [],
        created: str(p.created, 30)});
    }
    const sid = new Set(), saved = [];
    for (const s of (Array.isArray(S.saved) ? S.saved : [])) {
      if (!s || typeof s !== 'object') continue;
      const id = Math.floor(num(s.id) || 0); if (id <= 0 || sid.has(id)) continue; sid.add(id);
      saved.push({id, profile_id: num(s.profile_id), title: str(s.title, 300), kind: str(s.kind, 60), payload: deep(s.payload, 0, 200000), created: str(s.created, 30)});
    }
    const maxP = Math.max(0, ...profiles.map(p => p.id)), maxS = Math.max(0, ...saved.map(s => s.id));
    const groups = Array.isArray(j.groups) ? j.groups.filter(g => typeof g === 'string').slice(0, 100).map(g => g.slice(0, 60)) : null;
    return {state: {profiles, saved, pseq: Math.max(Math.floor(num(S.pseq) || 0), maxP), sseq: Math.max(Math.floor(num(S.sseq) || 0), maxS)}, groups, skipped: S.profiles.length - profiles.length};
  }

  /* ------------------------------------------------------------ app lock */
  const LK = 'jt_lock';
  const cfg = () => { try { const c = JSON.parse(localStorage.getItem(LK) || 'null'); return c && c.hash && c.salt ? c : null; } catch (e) { return null; } };
  const hashPin = async (pin, salt, iter) => toB64(new Uint8Array(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: fromB64(salt), iterations: iter, hash: 'SHA-256'}, await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveBits']), 256)));
  async function setPin(pin, after) {
    const salt = toB64(crypto.getRandomValues(new Uint8Array(16))), iter = 200000;
    localStorage.setItem(LK, JSON.stringify({salt, iter, hash: await hashPin(pin, salt, iter), after: after ?? 30}));
  }
  const checkPin = async pin => { const c = cfg(); return !!c && (await hashPin(pin, c.salt, c.iter)) === c.hash; };
  let overlay = null, fails = 0, hiddenAt = 0, until = 0;
  const coverEl = () => { let c = document.getElementById('secCover'); if (!c) { c = $e('div', 'sec-cover'); c.id = 'secCover'; c.innerHTML = '<span>Jyotisha Tejas</span>'; document.body.appendChild(c); } return c; };

  function showLock() {
    if (overlay || !cfg()) return;
    overlay = $e('div', 'sec-lock'); overlay.id = 'secLock';
    overlay.innerHTML = `<form class="sec-box" autocomplete="off"><h2>Jyotisha Tejas</h2><p class="note">Enter your PIN to open the app.</p>
      <input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" aria-label="PIN"><p class="note sec-err" role="alert"></p>
      <div class="xbtns"><button type="submit">Unlock</button></div><button type="button" class="sec sec-forgot">Forgot PIN</button></form>`;
    document.body.appendChild(overlay);
    const f = overlay.querySelector('form'), err = overlay.querySelector('.sec-err'), inp = f.elements.pin;
    f.onsubmit = async e => {
      e.preventDefault();
      if (Date.now() < until) { err.textContent = `Wait ${Math.ceil((until - Date.now()) / 1000)} seconds and try again.`; return; }
      if (await checkPin(inp.value)) { fails = 0; overlay.remove(); overlay = null; return; }
      fails++; inp.value = '';
      if (fails >= 3) { until = Date.now() + Math.min(300, Math.pow(2, fails - 2) * 5) * 1000; err.textContent = 'Wrong PIN. Please wait before trying again.'; } else err.textContent = 'Wrong PIN.';
    };
    overlay.querySelector('.sec-forgot').onclick = async () => {
      const v = await ask({title: 'Forgot your PIN?', intro: 'There is no account or server to reset it. The only way in is to <b>erase all data on this device</b> and start fresh, then restore from a backup file if you have one. Type ERASE to confirm.', fields: [{id: 't', label: 'Type ERASE', type: 'text'}], ok: 'Erase everything'});
      if (!v || v.t.trim() !== 'ERASE') return;
      try { Object.keys(localStorage).filter(k => k.startsWith('jt_') || k.startsWith('jh_')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      try { indexedDB.deleteDatabase('jyotisha-tejas'); } catch (e) { /* ignore */ }
      setTimeout(() => location.reload(), 300);
    };
    setTimeout(() => inp.focus(), 80);
  }
  function onVis() {
    const c = cfg(); if (!c) { const el = document.getElementById('secCover'); if (el) el.remove(); return; }
    if (document.hidden) { hiddenAt = Date.now(); coverEl().classList.add('on'); }
    else { const el = document.getElementById('secCover'); if (el) el.classList.remove('on'); if (c.after === 0 || (hiddenAt && Date.now() - hiddenAt > (c.after || 30) * 1000)) showLock(); }
  }
  async function lockDialog() {
    if (!(window.crypto && crypto.subtle)) { alert('This browser cannot create an app lock.'); return; }
    const c = cfg(), opts = [[0, 'Immediately'], [30, 'After 30 seconds'], [120, 'After 2 minutes'], [600, 'After 10 minutes']];
    const pinCheck = v => /^\d{4,8}$/.test(v.n1) ? (v.n1 !== v.n2 ? 'The two PINs do not match.' : '') : 'Use 4 to 8 digits.';
    if (!c) {
      const v = await askChecked({title: 'Set an app lock', intro: 'A PIN asks for a code when the app opens or returns from the background, and hides the screen in the app switcher. It keeps casual onlookers out. Your phone lock and storage encryption still do the heavy protection. If you forget the PIN the only way in is to erase the data on this device, so keep a backup.',
        fields: [{id: 'n1', label: 'New PIN (4 to 8 digits)', pin: true}, {id: 'n2', label: 'Repeat PIN', pin: true}, {id: 'a', label: 'Lock', select: opts, value: 30}], ok: 'Turn on'}, async v => pinCheck(v));
      if (v) { await setPin(v.n1, +v.a); onVis(); }
      return !!v;
    }
    const v = await askChecked({title: 'App lock is on', intro: 'Enter your current PIN to change it, change when it locks, or turn the lock off. Leave the new PIN empty to keep the same PIN.',
      fields: [{id: 'cur', label: 'Current PIN', pin: true}, {id: 'n1', label: 'New PIN (optional)', pin: true}, {id: 'n2', label: 'Repeat new PIN', pin: true}, {id: 'a', label: 'Lock', select: opts, value: c.after ?? 30},
        {id: 'off', label: 'Turn the lock off', select: [['0', 'No, keep it on'], ['1', 'Yes, turn it off']], value: '0'}], ok: 'Save'},
    async v => !(await checkPin(v.cur)) ? 'Current PIN is wrong.' : (v.off === '1' || !v.n1) ? '' : pinCheck(v));
    if (!v) return false;
    if (v.off === '1') localStorage.removeItem(LK); else if (v.n1) await setPin(v.n1, +v.a); else localStorage.setItem(LK, JSON.stringify({...c, after: +v.a}));
    onVis(); return true;
  }
  const cardHTML = () => `<div class="xcard2"><div><b>App lock</b><small>${cfg() ? 'On. A PIN is asked when the app opens or returns from the background.' : 'Off. Add a PIN to keep your clients private from anyone who borrows your phone.'}</small></div><div class="xbtns"><button type="button" class="sec" data-seclock>${cfg() ? 'Change or turn off' : 'Set a PIN'}</button></div></div>`;
  function bindCard(root, after) { root.querySelectorAll('[data-seclock]').forEach(b => { b.onclick = async () => { if (await lockDialog() && after) after(); }; }); }

  function boot() {
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', () => { if (cfg()) coverEl().classList.add('on'); });
    window.addEventListener('pageshow', () => { const el = document.getElementById('secCover'); if (el && !document.hidden) el.classList.remove('on'); });
    if (cfg()) showLock();
  }
  return {boot, makeBackup, openBackup, validate, safeParse, encrypt, decrypt, lockDialog, cardHTML, bindCard, isLocked: () => !!overlay, hasLock: () => !!cfg()};
})();
Sec.boot();
