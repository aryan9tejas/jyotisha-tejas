'use strict';
/* Jyotisha Tejas home page: a live Panchang snapshot with date and hora wheels.
   Needs app.js globals: api, esc, getCfg, placePicker, TZ. */
const Home = (() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOWF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const GLYPH = {Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄'};
  const RANGE = 2000;                     // days either side of the date wheel's centre
  const $h = id => document.getElementById(id);
  const H = {place: null, when: null, jd: null, live: true, data: null, seq: 0, open: {}, cache: new Map(), timer: null,
    dbase: null, horaKey: '', cfgKey: '', lastMin: '', started: false, visible: false};
  let wDate = null, wHora = null;

  /* ---------------------------------------------------------------- date helpers (civil dates as 'YYYY-MM-DD') */
  const pad = n => String(n).padStart(2, '0');
  const utc = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const addDays = (s, n) => { const d = new Date(utc(s) + n * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
  const dowOf = s => new Date(utc(s)).getUTCDay();
  const jdNow = () => Date.now() / 86400000 + 2440587.5;
  function nowIn(tz) {
    try { return new Date().toLocaleString('sv-SE', {timeZone: tz}).slice(0, 16).replace(' ', 'T'); } catch (e) {
      const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  function tzLabel(tz, dateStr) {
    try {
      const d = new Date(utc(dateStr) + 12 * 3600000);
      const p = new Intl.DateTimeFormat('en-US', {timeZone: tz, timeZoneName: 'shortOffset'}).formatToParts(d).find(x => x.type === 'timeZoneName');
      return p ? p.value.replace('GMT', 'UTC') : tz;
    } catch (e) { return tz; }
  }
  /* 'YYYY-MM-DD HH:MM' from the engine -> 'HH:MM', with the day added when it is not the day being shown */
  function stamp(s, ref) {
    if (!s) return '...';
    return s.slice(0, 10) === ref ? s.slice(11, 16) : `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(11, 16)}`;
  }
  const rangeTxt = (r, ref) => `${stamp(r.sa, ref)} <i class="ar">→</i> ${stamp(r.sb, ref)}`;
  const hm = hours => `${Math.floor(hours)}h ${pad(Math.round((hours % 1) * 60) % 60)}m`;

  /* ---------------------------------------------------------------- wheel (scroll-snap picker with a tilt effect) */
  function makeWheel(el) {
    const w = {n: 0, cur: 0, want: 0, prog: false, timer: 0, raf: 0, onSettle: null, last: [0, -1], dragged: false};
    const ih = () => parseFloat(getComputedStyle(el).getPropertyValue('--ih')) || 52;
    const clamp = i => Math.max(0, Math.min(w.n - 1, i));
    function paint() {
      const h = ih(), c = el.scrollTop / h, items = el.children;
      const lo = Math.max(0, Math.floor(c) - 4), hi = Math.min(w.n - 1, Math.ceil(c) + 4), mid = Math.round(c);
      for (let i = w.last[0]; i <= w.last[1]; i++) if ((i < lo || i > hi) && items[i]) { items[i].style.transform = ''; items[i].style.opacity = ''; items[i].classList.remove('sel'); }
      for (let i = lo; i <= hi; i++) {
        const d = i - c, a = Math.abs(d), it = items[i];
        it.style.transform = `rotateX(${(d * 24).toFixed(1)}deg) scale(${(1 - Math.min(a, 3) * 0.07).toFixed(3)})`;
        it.style.opacity = (a < 1 ? 1 - a * 0.6 : Math.max(0, 0.4 - (a - 1) * 0.8)).toFixed(2);
        const on = i === mid; if (it.classList.contains('sel') !== on) it.classList.toggle('sel', on);
      }
      w.last = [lo, hi];
    }
    function settle() {
      const idx = clamp(Math.round(el.scrollTop / ih()));
      w.want = idx;
      if (w.prog) { w.prog = false; w.cur = idx; return; }
      if (idx !== w.cur) { w.cur = idx; if (w.onSettle) w.onSettle(idx); }
    }
    el.addEventListener('scroll', () => {
      if (!w.raf) w.raf = requestAnimationFrame(() => { w.raf = 0; paint(); });
      clearTimeout(w.timer); w.timer = setTimeout(settle, 130);
    }, {passive: true});
    /* mouse wheel: one notch moves one item */
    let acc = 0, lastStep = 0;
    el.addEventListener('wheel', e => {
      e.preventDefault(); w.prog = false;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      acc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      const t = performance.now();
      if (Math.abs(acc) >= 50 && t - lastStep > 90) {
        const target = clamp(w.want + (acc > 0 ? 1 : -1)); acc = 0; lastStep = t; w.want = target;
        el.scrollTo({top: target * ih(), behavior: 'smooth'});
      }
    }, {passive: false});
    el.addEventListener('touchstart', () => { w.prog = false; }, {passive: true});
    /* mouse drag */
    let drag = null;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      w.prog = false; w.dragged = false;
      drag = {y: e.clientY, top: el.scrollTop};
      el.style.scrollSnapType = 'none'; el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const dy = e.clientY - drag.y; if (Math.abs(dy) > 5) w.dragged = true;
      el.scrollTop = drag.top - dy;
    });
    const endDrag = () => {
      if (!drag) return; drag = null; el.style.scrollSnapType = '';
      const target = clamp(Math.round(el.scrollTop / ih())); w.want = target;
      el.scrollTo({top: target * ih(), behavior: 'smooth'});
      setTimeout(() => { w.dragged = false; }, 50);
    };
    el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag);
    el.addEventListener('click', e => {
      const it = e.target.closest('.wi'); if (!it || w.dragged) return;
      api_select(+it.dataset.i, true, true);
    });
    el.addEventListener('keydown', e => {
      const k = {ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5}[e.key];
      if (e.key === 'Home') { e.preventDefault(); api_select(0, true, true); }
      else if (e.key === 'End') { e.preventDefault(); api_select(w.n - 1, true, true); }
      else if (k) { e.preventDefault(); api_select(clamp(w.cur + k), true, true); }
    });
    function api_select(idx, smooth, user) {
      idx = clamp(idx);
      const target = idx * ih();
      if (!user) w.cur = idx;
      w.want = idx;
      if (Math.abs(el.scrollTop - target) < 1) { paint(); return; }
      if (!user) w.prog = true;
      el.scrollTo({top: target, behavior: smooth ? 'smooth' : 'auto'});
      if (!user) { clearTimeout(w.fallback); w.fallback = setTimeout(() => { w.prog = false; }, 900); }
    }
    return {
      el, w,
      setItems(htmls) {
        w.n = htmls.length; w.last = [0, -1];
        el.innerHTML = htmls.map((h, i) => `<div class="wi" data-i="${i}" role="option">${h}</div>`).join('');
      },
      select: api_select, paint, index: () => w.cur,
      set onSettle(f) { w.onSettle = f; },
    };
  }

  /* ---------------------------------------------------------------- location */
  const storedPlace = () => { try { return JSON.parse(localStorage.getItem('jt_home_place') || 'null'); } catch (e) { return null; } };
  function storePlace(p) { try { localStorage.setItem('jt_home_place', JSON.stringify(p)); } catch (e) { /* ignore */ } }
  async function defaultPlace() {
    const s = storedPlace(); if (s && isFinite(s.lat) && isFinite(s.lon)) return s;
    try {   // a city in this device's time zone, e.g. Australia/Melbourne -> Melbourne
      const city = TZ.split('/').pop().replace(/_/g, ' ');
      const res = await api('/api/places?q=' + encodeURIComponent(city));
      const r = res.find(x => x.tz === TZ);
      if (r) return {label: r.label, lat: r.lat, lon: r.lon, tz: r.tz};
    } catch (e) { /* fall through */ }
    return {label: 'Mumbai, India', lat: 19.0728, lon: 72.8826, tz: 'Asia/Kolkata'};
  }
  function setPlace(p, save) {
    H.place = p; if (save) storePlace(p);
    $h('hmLocName').textContent = p.label;
    H.cache.clear(); H.horaKey = '';
    load(H.live ? nowIn(p.tz) : H.when);
  }

  /* ---------------------------------------------------------------- data */
  let inflight = false, pendingWhen = null;
  async function load(when) {
    if (inflight) { pendingWhen = when; H.seq++; return; }      // latest wins: skip the calls queued while one is running
    inflight = true;
    const my = ++H.seq;
    $h('homeView').classList.add('busy');
    try {
      const cfg = getCfg();
      const key = JSON.stringify([H.place.lat, H.place.lon, H.place.tz, when, cfg]);
      let data = H.cache.get(key);
      if (!data) {
        data = await api('/api/home', {lat: H.place.lat, lon: H.place.lon, tz: H.place.tz, when, cfg});
        H.cache.set(key, data); if (H.cache.size > 24) H.cache.delete(H.cache.keys().next().value);
      }
      if (my === H.seq) {
        H.cfgKey = JSON.stringify(cfg);
        H.data = data; H.when = when; H.jd = H.live ? jdNow() : data.jd;
        $h('hmMsg').textContent = '';
        render(true);
      }
    } catch (e) {
      if (my === H.seq) $h('hmMsg').innerHTML = `<div class="hm-err">${esc(e.message || e)}</div>`;
    } finally {
      inflight = false;
      if (pendingWhen) { const w = pendingWhen; pendingWhen = null; load(w); }
      else $h('homeView').classList.remove('busy');
    }
  }

  /* ---------------------------------------------------------------- rendering */
  const idxAt = (rows, jd) => rows.findIndex(r => (r.a === null || r.a <= jd) && (r.b === null || jd < r.b));
  const pct = (r, jd) => (r.a !== null && r.b !== null) ? Math.max(0, Math.min(100, (jd - r.a) / (r.b - r.a) * 100)) : null;
  const bar = p => p === null ? '' : `<div class="bar"><i style="width:${p.toFixed(1)}%"></i></div>`;

  function adjRows(rows, i, ref, nm) {
    const out = [];
    if (rows[i - 1]) out.push(`<div class="adj"><span class="lbl">Previous</span><span class="nm">${esc(nm(rows[i - 1]))}</span><span class="rg">${rangeTxt(rows[i - 1], ref)}</span></div>`);
    if (rows[i + 1]) out.push(`<div class="adj"><span class="lbl">Next</span><span class="nm">${esc(nm(rows[i + 1]))}</span><span class="rg">${rangeTxt(rows[i + 1], ref)}</span></div>`);
    return out.join('');
  }
  function block(label, rows, jd, ref, nmFn, subFn) {
    const i = idxAt(rows, jd); if (i < 0) return {main: '', adj: ''};
    const c = rows[i];
    return {
      main: `<div class="blk"><div class="bl">${label}</div><div class="bn">${esc(nmFn(c))}</div>${subFn ? `<div class="bs">${subFn(c)}</div>` : ''}<div class="br">${rangeTxt(c, ref)}</div>${bar(pct(c, jd))}</div>`,
      adj: `<div class="adjg"><div class="adjh">${label}</div>${adjRows(rows, i, ref, nmFn)}</div>`,
    };
  }
  function cardHTML(key, title, blocks) {
    const open = !!H.open[key];
    return `<section class="gcard c-${key}${blocks.length > 1 ? ' multi' : ''}"><div class="ch"><h2>${title}</h2><button class="xp" data-k="${key}" aria-expanded="${open}"><span class="xt">${open ? 'Hide' : 'Previous / next'}</span> <i>${open ? '▴' : '▾'}</i></button></div>`
      + blocks.map(b => b.main).join('') + `<div class="adjwrap"${open ? '' : ' hidden'}>${blocks.map(b => b.adj).join('')}</div></section>`;
  }

  /* Moon phase picture from the Moon-minus-Sun angle E (0 new, 180 full): lit part on the right while waxing, left while waning */
  function moonSVG(E) {
    const wax = E < 180, e = wax ? E : 360 - E, R = 20;
    const rx = Math.abs(Math.cos(e * Math.PI / 180)) * R, lit = Math.round((1 - Math.cos(e * Math.PI / 180)) / 2 * 100);
    const sw = e < 90 ? 0 : 1;
    const path = `M0 ${-R} A${R} ${R} 0 0 1 0 ${R} A${rx.toFixed(2)} ${R} 0 0 ${sw} 0 ${-R}Z`;
    return `<div class="mph" title="${wax ? 'Waxing' : 'Waning'}, ${lit}% lit"><svg viewBox="-24 -24 48 48" width="46" height="46" aria-hidden="true"><circle r="${R}" fill="#1b2040" stroke="rgba(255,255,255,.35)" stroke-width="1"/><path d="${path}" fill="#f4ecd0" transform="scale(${wax ? 1 : -1} 1)"/></svg><small>${wax ? 'Waxing' : 'Waning'}<br>${lit}%</small></div>`;
  }

  function skyOf(d, jd) {
    const m45 = 45 / 1440;
    if (Math.abs(jd - d.sunrise.jd) < m45) return 'dawn';
    if (Math.abs(jd - d.sunset.jd) < m45) return 'dusk';
    return (jd > d.sunrise.jd && jd < d.sunset.jd) ? 'day' : 'night';
  }
  function orbPos(d, jd) {
    const sr = d.sunrise.jd, ss = d.sunset.jd, nsr = d.next_sunrise.jd;
    const day = jd >= sr && jd < ss;
    let f;
    if (day) f = (jd - sr) / (ss - sr);
    else if (jd >= ss) f = (jd - ss) / (nsr - ss);
    else f = (jd - (ss - 1)) / (sr - (ss - 1));          // before sunrise: the tail of the previous night
    f = Math.max(0, Math.min(1, f));
    return {x: 8 + f * 84, y: 64 - Math.sin(Math.PI * f) * 48, moon: !day};
  }

  function renderCards() {
    const d = H.data, jd = H.jd, ref = H.when.slice(0, 10);
    if (!d) return;
    const sunIdx = idxAt(d.sun_sign, jd);
    const sunSign = sunIdx >= 0 ? d.sun_sign[sunIdx].name : '';
    const sn = idxAt(d.sun_nak || [], jd);
    const sunNak = sn >= 0 ? d.sun_nak[sn].name : '';
    const sunCard = `<section class="gcard c-sun"><div class="ch"><h2>Sun</h2></div><div class="kvs">`
      + `<div><span>Sunrise</span><b>${d.sunrise.s.slice(11)}</b></div><div><span>Sunset</span><b>${d.sunset.s.slice(11)}</b></div>`
      + `<div><span>Sun sign</span><b>${esc(sunSign)}</b></div><div><span>Nakshatra</span><b>${esc(sunNak)}</b></div>`
      + `<div><span>Masa</span><b>(${esc(d.masa || '')})</b></div></div></section>`;

    const padaRows = d.pada;
    const moonBlocks = [
      block('Moon sign', d.moon_sign, jd, ref, r => r.name),
      block('Nakshatra', d.nakshatra, jd, ref, r => r.name, r => {
        const pi = idxAt(padaRows, jd); const p = pi >= 0 ? padaRows[pi].pada : '';
        return `Pada ${p} &middot; lord ${esc(r.lord)}`;
      }),
    ];
    const mo = d.moon || {rise: [], set: [], track: []};
    const lst = l => l.length ? l.map(x => stamp(x.s, ref)).join(', ') : 'none';
    let dirHTML = '';
    if (mo.track.length) {
      const k = Math.max(0, Math.min(mo.track.length - 1, Math.round((jd - mo.track[0][0]) * 96)));
      const [, az, alt] = mo.track[k];
      const P = ['North', 'North-northeast', 'Northeast', 'East-northeast', 'East', 'East-southeast', 'Southeast', 'South-southeast', 'South', 'South-southwest', 'Southwest', 'West-southwest', 'West', 'West-northwest', 'Northwest', 'North-northwest'];
      const up = alt > 0;
      dirHTML = `<div class="mdir${up ? '' : ' dn'}"><span class="arw" style="transform:rotate(${az}deg)">&#8593;</span><div><b>${P[Math.round(az / 22.5) % 16]}</b><small>${Math.round(az)}&deg; &middot; ${up ? Math.round(alt) + '&deg; above horizon' : 'below horizon'}</small></div></div>`;
    }
    const moonExtra = `<div class="kvs mex"><div><span>Moonrise</span><b>${lst(mo.rise)}</b></div><div><span>Moonset</span><b>${lst(mo.set)}</b></div></div>${dirHTML}`;
    const moonCard = cardHTML('moon', 'Moon', moonBlocks).replace('<div class="adjwrap"', `<div class="mx">${moonExtra}</div><div class="adjwrap"`);

    const ti = idxAt(d.tithi, jd);
    let phase = '';
    if (ti >= 0) {
      const tr = d.tithi[ti], E = (tr.i + (pct(tr, jd) || 0) / 100) * 12;     // Moon minus Sun, degrees
      phase = moonSVG(E);
    }
    const tithiCard = cardHTML('tithi', 'Tithi', [block('Tithi', d.tithi, jd, ref, r => r.name)]).replace('<div class="blk">', `<div class="tw">${phase}<div class="blk">`).replace('<div class="adjwrap"', '</div><div class="adjwrap"');
    const cards = [
      sunCard, tithiCard, moonCard,
    ];
    const good = {'Abhijit': 1, 'Amrita Kala': 1, 'Vijaya Muhurta': 1, 'Brahma Muhurta': 1, 'Godhuli Muhurta': 1};
    const kal = [...d.kalas].sort((a, b) => a.a - b.a).map(k => {
      const st = (jd >= k.a && jd < k.b) ? 'now' : (jd < k.a ? 'next' : 'past');
      return `<div class="kala ${good[k.name] ? 'g' : 'b'} ${st}"><span class="dot"></span><span class="kn">${esc(k.name)}${k.nak ? ` <small>${esc(k.nak)}</small>` : ''}</span><span class="kt">${stamp(k.sa, ref)} <i class="ar">→</i> ${stamp(k.sb, ref)}</span>${st === 'now' ? '<span class="tag">now</span>' : ''}</div>`;
    }).join('');
    const kalasCard = `<section class="gcard wide"><div class="ch"><h2>Kalas</h2><span class="hint">for ${esc(d.weekday)}'s day</span></div>${kal}</section>`;
    cards.push(`<div class="pair">${cardHTML('yoga', 'Yoga', [block('Yoga', d.yoga, jd, ref, r => r.name)])}${cardHTML('karana', 'Karana', [block('Karana', d.karana, jd, ref, r => r.name)])}</div>`);
    cards.push(kalasCard);
    $h('hmCards').innerHTML = cards.join('');
    document.querySelectorAll('#hmCards .xp').forEach(b => b.onclick = () => {
      H.open[b.dataset.k] = !H.open[b.dataset.k]; renderCards();
    });
  }

  function renderHero() {
    const d = H.data, ref = H.when.slice(0, 10), dow = dowOf(ref);
    $h('hmClock').textContent = H.when.slice(11, 16);
    const early = DOWF[dow] !== d.weekday;
    $h('hmSub').innerHTML = `${esc(tzLabel(H.place.tz, ref))} &middot; Vara ${esc(d.weekday)}${early ? ' (before sunrise)' : ''}`;
    $h('hmNow').hidden = H.live;
    $h('hmLive').hidden = !H.live;
    const hi = idxAt(d.horas, H.jd);
    const h = hi >= 0 ? d.horas[hi] : null;
    const li = idxAt(d.lagna || [], H.jd), lg = li >= 0 ? d.lagna[li] : null;
    $h('hmLagna').innerHTML = lg ? `<span>Lagna</span><b>${esc(lg.name)}</b><small>${stamp(lg.sa, ref)} <i class="ar">→</i> ${stamp(lg.sb, ref)}</small>` : '';
    const sky = skyOf(d, H.jd), v = $h('homeView');
    if (v.dataset.sky !== sky) v.dataset.sky = sky;
    const o = orbPos(d, H.jd), orb = $h('hmOrb');
    orb.style.left = o.x + '%'; orb.style.top = o.y + '%'; orb.classList.toggle('moon', o.moon);
  }

  function dateItems() {
    const today = nowIn(H.place.tz).slice(0, 10), out = [];
    for (let i = -RANGE; i <= RANGE; i++) {
      const s = addDays(H.dbase, i), dw = dowOf(s);
      out.push(`<div class="${s === today ? 'today' : ''}"><b>${DOW[dw]} ${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]}</b><small>${s.slice(0, 4)}</small></div>`);
    }
    return out;
  }
  function syncWheels(smooth) {
    if (!H.data || !H.visible) return;
    const ref = H.when.slice(0, 10);
    if (!H.dbase || Math.abs(diffDays(H.dbase, ref)) >= RANGE - 2) { H.dbase = ref; wDate.setItems(dateItems()); }
    wDate.select(diffDays(H.dbase, ref) + RANGE, smooth, false);
    const key = H.data.date + '|' + H.place.lat + '|' + H.place.lon;
    if (key !== H.horaKey) {
      H.horaKey = key;
      wHora.setItems(H.data.horas.map(h => `<div class="${h.night ? 'n' : 'd'}"><b>${GLYPH[h.lord] || ''} ${esc(h.lord)}</b><small>${h.sa.slice(11)} – ${h.sb.slice(11)}</small></div>`));
    }
    const hi = idxAt(H.data.horas, H.jd);
    if (hi >= 0) wHora.select(hi, smooth, false);
  }
  function render(full) {
    if (!H.data) return;
    renderHero(); renderCards();
    if (full) syncWheels(false);
  }

  /* ---------------------------------------------------------------- interaction */
  function onDate(idx) {
    const s = addDays(H.dbase, idx - RANGE);
    if (s === H.when.slice(0, 10)) return;
    H.live = false;
    load(`${s}T${H.when.slice(11, 16)}`);
  }
  function onHora(idx) {
    const h = H.data && H.data.horas[idx]; if (!h) return;
    H.live = false; H.jd = h.a; H.when = h.sa.replace(' ', 'T');
    renderHero(); renderCards();
    const ref = H.when.slice(0, 10);
    if (Math.abs(diffDays(H.dbase, ref)) < RANGE - 2) wDate.select(diffDays(H.dbase, ref) + RANGE, true, false);
  }
  function goNow() {
    H.live = true;
    load(nowIn(H.place.tz));
  }
  function tick() {
    if (!H.visible || !H.data || !H.live) return;
    const when = nowIn(H.place.tz), jd = jdNow();
    if (when === H.lastMin) return;
    H.lastMin = when;
    if (jd < H.data.sunrise.jd || jd >= H.data.next_sunrise.jd) { load(when); return; }
    const oldHora = idxAt(H.data.horas, H.jd);
    H.jd = jd; H.when = when;
    renderHero(); renderCards();
    const hi = idxAt(H.data.horas, jd);
    if (hi !== oldHora && hi >= 0) wHora.select(hi, true, false);
    const ref = when.slice(0, 10);
    wDate.select(diffDays(H.dbase, ref) + RANGE, true, false);
  }

  /* ---------------------------------------------------------------- views */
  function route() {
    const app = location.hash === '#app';
    $h('homeView').hidden = app; $h('appView').hidden = !app;
    document.body.classList.toggle('home-on', !app);
    H.visible = !app;
    if (!app) {
      document.title = 'Jyotisha Tejas - Panchang';
      if (H.data && JSON.stringify(getCfg()) !== H.cfgKey) { H.cache.clear(); load(H.live ? nowIn(H.place.tz) : H.when); }
      else { requestAnimationFrame(() => { syncWheels(false); if (H.data) { wDate.paint(); wHora.paint(); } tick(); }); }
    } else { document.title = 'Jyotisha Tejas'; window.scrollTo(0, 0); }
  }

  function openModal() {
    $h('hmModal').hidden = false; $h('hmPlace').value = ''; $h('hmLocNote').textContent = `Now showing: ${H.place.label} (${H.place.lat.toFixed(2)}, ${H.place.lon.toFixed(2)}, ${H.place.tz}).`;
    setTimeout(() => $h('hmPlace').focus(), 30);
  }
  const closeModal = () => { $h('hmModal').hidden = true; };

  async function init() {
    if (H.started) return; H.started = true;
    wDate = makeWheel($h('wDate')); wHora = makeWheel($h('wHora'));
    wDate.onSettle = onDate; wHora.onSettle = onHora;
    $h('hmApp').onclick = () => { location.hash = '#app'; };
    $h('hmNow').onclick = goNow;
    $h('hmLoc').onclick = openModal; $h('hmClose').onclick = closeModal;
    $h('hmModal').addEventListener('click', e => { if (e.target.id === 'hmModal') closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$h('hmModal').hidden) closeModal(); });
    placePicker($h('hmPlace'), $h('hmPlaceDd'), r => { closeModal(); setPlace({label: r.label, lat: r.lat, lon: r.lon, tz: r.tz}, true); });
    $h('hmGeo').onclick = () => {
      if (!navigator.geolocation) { $h('hmLocNote').textContent = 'This device does not offer location.'; return; }
      $h('hmLocNote').textContent = 'Asking for your location...';
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = +pos.coords.latitude.toFixed(4), lon = +pos.coords.longitude.toFixed(4);
        closeModal(); setPlace({label: `My location (${lat.toFixed(2)}, ${lon.toFixed(2)})`, lat, lon, tz: TZ}, true);
      }, err => { $h('hmLocNote').textContent = 'Location was not shared: ' + err.message; }, {timeout: 15000, maximumAge: 600000});
    };
    window.addEventListener('hashchange', route);
    let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (H.visible) { syncWheels(false); wDate.paint(); wHora.paint(); } }, 150); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    H.timer = setInterval(tick, 15000);
    H.place = await defaultPlace();
    $h('hmLocName').textContent = H.place.label;
    route();
    load(nowIn(H.place.tz));
  }
  function status(m) {
    const e = $h('hmMsg');
    if (e && !H.data) e.textContent = m || '';
  }
  return {init, status};
})();
