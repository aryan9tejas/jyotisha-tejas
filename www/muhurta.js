'use strict';
/* Jyotisha Tejas Muhurta: finder (Panchanga tab), guide, and the first-page "For you" card.
   Needs app.js globals: api, esc, $, $$, guard, getBirth, getCfg, defaultPlace, placeField, bindPlaceField, readPlaceField, showTab, S, TZ. */
const Muh = (() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const NAKS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const GR = {excellent: 'Excellent', good: 'Good', acceptable: 'Acceptable', poor: 'Poor', avoid: 'Avoid'};
  const GROUPS = ['Life events', 'Home and property', 'Everyday', 'Career and money'];
  const M = {guide: null, purpose: null, people: {me: null, partner: null}, days: [], token: 0, view: 'find', pending: null, sort: 'best', showAvoid: false,
    opts: {range: 30, hours: '6,22', direction: ''}, home: {key: '', data: null, busy: false, err: ''}};
  try {
    M.people.me = JSON.parse(localStorage.getItem('jt_muh_me') || 'null');
    M.people.partner = JSON.parse(localStorage.getItem('jt_muh_partner') || 'null');
  } catch (e) { /* ignore */ }
  const savePeople = () => { try { localStorage.setItem('jt_muh_me', JSON.stringify(M.people.me)); localStorage.setItem('jt_muh_partner', JSON.stringify(M.people.partner)); } catch (e) { /* ignore */ } };

  const pad = n => String(n).padStart(2, '0');
  const todayLocal = tz => { try { return new Date().toLocaleString('sv-SE', {timeZone: tz}).slice(0, 10); } catch (e) { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; } };
  const utc = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const fmtDay = s => { const d = new Date(utc(s)); return `${DOW[d.getUTCDay()]} ${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]}`; };
  const fmtDayY = s => `${fmtDay(s)} ${s.slice(0, 4)}`;
  const dm = s => `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(11, 16)}`;
  function win(sa, sb, date) {
    const f = s => s.slice(0, 10) === date ? s.slice(11, 16) : dm(s);
    return `${f(sa)} – ${f(sb)}`;
  }
  function addMin(s, m) {
    const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) + m * 60000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  const personKey = p => p ? `${p.nak}:${p.rasi}:${p.lagna ?? ''}:${p.sex || ''}` : '';
  const personLine = p => p ? `${NAKS[p.nak]}${p.pada ? ' pada ' + p.pada : ''} &middot; Moon ${SIGNS[p.rasi]}${p.lagna !== null && p.lagna !== undefined ? ' &middot; Lagna ' + SIGNS[p.lagna] : ''}` : '';
  const loc = () => { const p = (typeof defaultPlace === 'function') ? defaultPlace() : null; return p; };

  async function guide() {
    if (!M.guide) M.guide = await api('/api/muhurta/guide', {});
    return M.guide;
  }
  const purpose = id => (M.guide ? M.guide.purposes.find(p => p.id === id) : null);

  /* ------------------------------------------------------------ person picker (used in the finder and in the home modal) */
  async function personUI(el, which, onChange) {
    let profiles = [];
    const cur = M.people[which];
    const label = which === 'me' ? 'Whose birth star?' : 'Partner\'s birth star';
    el.innerHTML = `<div class="mu-person"><label>${label}<select class="mu-psel">
      <option value="">${which === 'me' ? 'No birth details (general timing)' : 'Not adding a partner'}</option>
      <optgroup label="Saved profiles" class="mu-prof"></optgroup>
      <option value="form">Chart currently in the form</option><option value="manual">Enter birth star manually</option></select></label>
      <div class="mu-manual" hidden>
        <label>Birth star<select class="mn-nak">${NAKS.map((n, i) => `<option value="${i}">${i + 1}. ${n}</option>`).join('')}</select></label>
        <label>Pada<select class="mn-pada"><option>1</option><option>2</option><option>3</option><option>4</option></select></label>
        <label>Birth Lagna (optional)<select class="mn-lagna"><option value="">Unknown</option>${SIGNS.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></label>
        <label>Sex (optional)<select class="mn-sex"><option value="">-</option><option value="F">Female</option><option value="M">Male</option></select></label>
        <button type="button" class="sec mn-ok">Use this</button></div>
      <div class="mu-pline">${cur ? `<b>${esc(cur.name || '')}</b> ${personLine(cur)}` : `<small>${which === 'me' ? 'Without a birth star, Tarabala and Chandrabala (the personal checks) are skipped and the result is general.' : 'Add the partner birth star so the day suits both of you.'}</small>`}</div></div>`;
    const sel = $('.mu-psel', el), man = $('.mu-manual', el), line = $('.mu-pline', el);
    const set = p => { M.people[which] = p; savePeople(); line.innerHTML = p ? `<b>${esc(p.name || '')}</b> ${personLine(p)}` : '<small>No personal checks will be applied.</small>'; if (onChange) onChange(p); };
    if (cur) sel.value = cur.src || '';
    (async () => {      // saved profiles load in the background so the picker never waits on storage
      try {
        const r = await Promise.race([api('/api/profiles'), new Promise(res => setTimeout(() => res(null), 4000))]);
        if (!Array.isArray(r)) return;
        profiles = r;
        const og = $('.mu-prof', el);
        og.innerHTML = r.map(p => `<option value="p${p.id}">${esc(p.name || '(unnamed)')} - ${p.year}-${pad(p.month)}-${pad(p.day)}</option>`).join('');
        og.hidden = !r.length;
        if (cur && cur.src) sel.value = cur.src;
      } catch (e) { /* ignore */ }
    })();
    sel.onchange = async () => {
      const v = sel.value; man.hidden = v !== 'manual';
      if (!v) return set(null);
      if (v === 'manual') return;
      try {
        let body;
        if (v === 'form') { const b = getBirth(); body = {birth: b, cfg: getCfg(), sex: b.gender === 'F' ? 'F' : b.gender === 'M' ? 'M' : null}; }
        else { const pr = profiles.find(x => 'p' + x.id === v); body = {birth: {name: pr.name, date: `${pr.year}-${pad(pr.month)}-${pad(pr.day)}`, time: `${pad(pr.hour)}:${pad(pr.minute)}:${pad(pr.second || 0)}`, lat: pr.lat, lon: pr.lon, tz: pr.tz, place: pr.place, gender: pr.gender}, cfg: getCfg(), sex: pr.gender === 'F' ? 'F' : pr.gender === 'M' ? 'M' : null}; }
        line.innerHTML = '<small>Reading the chart...</small>';
        const p = await api('/api/muhurta/person', body);
        if (p.error) throw new Error(p.error);
        p.src = v;
        set(p);
      } catch (e) { line.innerHTML = `<span class="bad">${esc(e.message)}</span>`; }
    };
    $('.mn-ok', el).onclick = async () => {
      const p = await api('/api/muhurta/person', {nak: +$('.mn-nak', el).value, pada: +$('.mn-pada', el).value, lagna: $('.mn-lagna', el).value, sex: $('.mn-sex', el).value || null, name: which === 'me' ? 'You' : 'Partner'});
      p.src = 'manual';
      set(p);
    };
  }

  /* ------------------------------------------------------------ finder */
  function rootHTML() {
    return `<div class="mu" id="muRoot"><div class="mu-nav"><button data-v="find" class="on">Find a muhurta</button><button data-v="guide">How it works</button></div>
      <div id="muFind"></div><div id="muGuide" hidden></div></div>`;
  }
  async function mount(el) {
    el.innerHTML = rootHTML();
    $$('#muRoot .mu-nav button').forEach(b => b.onclick = () => view(b.dataset.v));
    await guide();
    drawFind();
    if (M.pending) applyPending();
  }
  function view(v) {
    M.view = v;
    $$('#muRoot .mu-nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#muFind').hidden = v !== 'find';
    $('#muGuide').hidden = v !== 'guide';
    if (v === 'guide') drawGuide();
  }
  function applyPending() {
    const pid = M.pending; M.pending = null;
    if (pid) pickPurpose(pid, true);
  }
  function drawFind() {
    const g = M.guide;
    const grid = GROUPS.map(gr => `<h4>${gr}</h4><div class="mu-grid">${g.purposes.filter(p => p.group === gr).map(p =>
      `<button class="mu-p${M.purpose === p.id ? ' on' : ''}" data-id="${p.id}"><span class="ic">${p.icon}</span><b>${esc(p.label)}</b><small>${esc(p.blurb)}</small></button>`).join('')}</div>`).join('');
    $('#muFind').innerHTML = `<h3 class="mu-h">1. What do you want to start?</h3>${grid}<div id="muSetup"></div><div id="muOut"></div>`;
    $$('#muFind .mu-p').forEach(b => b.onclick = () => pickPurpose(b.dataset.id));
    if (M.purpose) drawSetup();
  }
  function pickPurpose(id, scroll) {
    M.purpose = id;
    M.days = [];
    drawFind();
    if (scroll) { const e = $('#muSetup'); if (e && e.scrollIntoView) e.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  }
  function drawSetup() {
    const p = purpose(M.purpose), d = loc() || {label: '', lat: '', lon: '', tz: ''};
    const both = p.person === 'both';
    $('#muSetup').innerHTML = `<div class="mu-setup"><h3 class="mu-h">${p.icon} ${esc(p.label)}</h3>
      <details class="mu-rules"><summary>Raman's rules for this purpose</summary><ul>${p.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      <small>Strictness: ${p.strict === 'high' ? 'high (a serious dosha means Avoid)' : p.strict === 'medium' ? 'medium (serious doshas are heavy penalties)' : 'low (a light check; only the personal checks and the worst doshas matter)'}</small></details>
      <h3 class="mu-h">2. For whom?</h3><div id="muMe"></div>${both ? '<div id="muPartner"></div>' : ''}
      <h3 class="mu-h">3. Where and when?</h3>
      <div class="row">${placeField('mu', d)}<label>Start date<input type="date" id="muStart" value="${todayLocal(d.tz || TZ)}"></label>
      <label>How far ahead<select id="muRange"><option value="14">2 weeks</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="180">6 months</option></select></label>
      <label>Hours to consider<select id="muHours"><option value="6,22">6:00 to 22:00</option><option value="6,18">Daytime 6:00 to 18:00</option><option value="">Any hour (including night)</option></select></label>
      ${p.id === 'travel' ? '<label>Direction of travel<select id="muDir"><option value="">Not specified</option><option>East</option><option>South</option><option>West</option><option>North</option></select></label>' : ''}
      </div><button class="run" id="muGo">Find auspicious times</button> <span id="muProg" class="note"></span></div>`;
    bindPlaceField('mu');
    $('#muRange').value = String(M.opts.range); $('#muHours').value = M.opts.hours;
    personUI($('#muMe'), 'me');
    if (both) personUI($('#muPartner'), 'partner');
    $('#muGo').onclick = guard(run);
  }

  async function run() {
    const p = purpose(M.purpose);
    const pl = readPlaceField('mu');
    if (isNaN(pl.lat) || isNaN(pl.lon)) throw new Error('Pick a place');
    const start = $('#muStart').value, total = +$('#muRange').value, hrs = $('#muHours').value;
    const dir = $('#muDir') ? $('#muDir').value : '';
    M.opts = {range: total, hours: hrs, direction: dir};
    const token = ++M.token;
    M.days = []; M.ctx = {pl, hrs: hrs ? hrs.split(',').map(Number) : null, dir, start};
    drawResults();
    const step = 7;
    for (let k = 0; k < total; k += step) {
      if (token !== M.token) return;
      const n = Math.min(step, total - k);
      const s = addMin(start + 'T00:00', k * 1440).slice(0, 10);
      $('#muProg') && ($('#muProg').textContent = `Checking ${Math.min(k + n, total)} of ${total} days...`);
      const r = await api('/api/muhurta/scan', {purpose: M.purpose, person: M.people.me, partner: p.person === 'both' ? M.people.partner : null, start: s, days: n,
        lat: pl.lat, lon: pl.lon, tz: pl.tz, cfg: getCfg(), direction: dir || null, hours: M.ctx.hrs});
      if (r.error) throw new Error(r.error);
      if (token !== M.token) return;
      M.days = M.days.concat(r.days);
      drawResults();
    }
    $('#muProg') && ($('#muProg').textContent = `Checked ${total} days.`);
  }

  function dayRow(d) {
    const b = d.best;
    const why = d.grade === 'avoid' && d.avoid.length ? `<div class="why">Blocked by: ${d.avoid.slice(0, 2).map(a => esc(a.title) + (a.value ? ' (' + esc(a.value) + ')' : '')).join('; ')}</div>` : '';
    const facts = d.facts ? `${esc(d.facts.nakshatra)} &middot; ${esc(d.facts.tithi)} &middot; ${esc(d.facts.yoga)}` : esc(d.masa);
    return `<button class="mu-day g-${d.grade}" data-d="${d.date}"><div class="dt"><b>${fmtDay(d.date)}</b><small>${esc(d.masa)}</small></div>
      <div class="gr"><span class="badge">${GR[d.grade]}</span>${d.grade !== 'avoid' ? `<span class="sc">${d.score}</span>` : ''}</div>
      <div class="bw">${b ? `${win(b.sa, b.sb, d.date)} <small>best window</small>` : '<small>No usable time</small>'}</div>
      <div class="fc">${facts}</div>${why}</button>`;
  }
  function drawResults() {
    const out = $('#muOut'); if (!out) return;
    const p = purpose(M.purpose);
    const days = M.days;
    const good = days.filter(d => d.grade === 'excellent' || d.grade === 'good').length;
    const usable = days.filter(d => d.grade !== 'avoid').length;
    let list = days.slice();
    if (!M.showAvoid) list = list.filter(d => d.grade !== 'avoid');
    if (M.sort === 'best') list.sort((a, b) => b.score - a.score || (a.date < b.date ? -1 : 1));
    const strip = days.map(d => `<button class="mu-sq g-${d.grade}" data-d="${d.date}" title="${fmtDay(d.date)}: ${GR[d.grade]}${d.grade !== 'avoid' ? ' ' + d.score : ''}"><i>${+d.date.slice(8)}</i></button>`).join('');
    const ppl = M.people.me ? (p.person === 'both' && M.people.partner ? 'both birth stars' : 'your birth star') : 'no birth star (general)';
    out.innerHTML = `<div class="mu-res"><h3 class="mu-h">${p.icon} ${esc(p.label)}: results</h3>
      <p class="note">${days.length ? `${usable} of ${days.length} days have a usable time (${good} good or excellent). Using ${ppl}.` : 'Starting...'}</p>
      <div class="mu-legend">${Object.keys(GR).map(k => `<span class="g-${k}"><i></i>${GR[k]}</span>`).join('')}</div>
      <div class="mu-strip">${strip}</div>
      <div class="mu-ctrl"><span><button class="sec${M.sort === 'best' ? ' on' : ''}" data-sort="best">Best first</button> <button class="sec${M.sort === 'date' ? ' on' : ''}" data-sort="date">By date</button></span>
      <label class="chk"><input type="checkbox" id="muShowAvoid"${M.showAvoid ? ' checked' : ''}> Show days to avoid</label></div>
      <div class="mu-days">${list.map(dayRow).join('') || (days.length ? '<p class="note">No day in this range has a usable time. Try a longer range, or "Any hour".</p>' : '')}</div></div>`;
    $$('#muOut [data-d]').forEach(b => b.onclick = () => openDay(b.dataset.d));
    $$('#muOut [data-sort]').forEach(b => b.onclick = () => { M.sort = b.dataset.sort; drawResults(); });
    $('#muShowAvoid').onchange = e => { M.showAvoid = e.target.checked; drawResults(); };
  }

  /* ------------------------------------------------------------ factor tables */
  const SECTIONS = [
    ['Your birth chart', ['tara', 'chandra', 'lagna_natal']],
    ['Panchanga of the day', ['nak', 'tithi', 'vara', 'yoga', 'karana', 'paksha', 'month', 'combust', 'krura']],
    ['Time of day', ['timing', 'hora']],
    ['Rising sign (Lagna) and planets', ['lagna_sign', 'lagna_strength', 'eighth', 'moon_lagna', 'moon_company', 'kartari', 'kunavamsa', 'special_house', 'venus6', 'panchaka']],
    ['Special yogas', ['special']],
  ];
  function factorHTML(f) {
    const hard = f.level === 'veto';
    return `<div class="mu-f lv-${f.level}"><div class="fh"><span class="dot"></span><b>${esc(f.title)}</b><span class="pill">${hard ? (f.absolute ? 'Must avoid' : 'Avoid') : esc(f.label)}</span>
      ${f.weight ? `<span class="pts">${f.pts} / ${f.weight}</span>` : (f.pts ? `<span class="pts">+${f.pts}</span>` : '')}</div>
      <div class="fv">${esc(f.value)}</div><p class="fw">${esc(f.why)}</p></div>`;
  }
  function factorTable(factors) {
    if (!factors) return '';
    const bad = factors.filter(f => f.level === 'veto' || f.level === 'bad').length, weak = factors.filter(f => f.level === 'weak').length;
    const good = factors.filter(f => f.level === 'best' || f.level === 'good').length;
    let h = `<p class="note">${good} favourable, ${weak} weak, ${bad} unfavourable or to avoid. Weights show each factor's share of the score (out of 100 over the factors that apply).</p>`;
    for (const [title, keys] of SECTIONS) {
      const rows = factors.filter(f => keys.includes(f.key));
      if (rows.length) h += `<h4 class="mu-sec">${title}</h4>${rows.map(factorHTML).join('')}`;
    }
    const known = SECTIONS.flatMap(s => s[1]);
    const rest = factors.filter(f => !known.includes(f.key));
    if (rest.length) h += `<h4 class="mu-sec">Other</h4>${rest.map(factorHTML).join('')}`;
    return h;
  }

  /* ------------------------------------------------------------ day sheet */
  function ensureSheet() {
    let s = document.getElementById('muSheet');
    if (!s) {
      s = document.createElement('div'); s.id = 'muSheet'; s.className = 'mu-sheet'; s.hidden = true;
      s.innerHTML = '<div class="mu-sheet-in"><button class="mu-x" aria-label="Close">&times;</button><div id="muSheetBody"></div></div>';
      document.body.appendChild(s);
      s.addEventListener('click', e => { if (e.target === s || e.target.classList.contains('mu-x')) s.hidden = true; });
    }
    return s;
  }
  async function openDay(date) {
    const s = ensureSheet(), body = $('#muSheetBody'); s.hidden = false;
    body.innerHTML = '<p class="note">Working out the day...</p>';
    const p = purpose(M.purpose), c = M.ctx || {pl: readPlaceField('mu'), hrs: null, dir: ''};
    try {
      const r = await api('/api/muhurta/day', {purpose: M.purpose, person: M.people.me, partner: p.person === 'both' ? M.people.partner : null, date, lat: c.pl.lat, lon: c.pl.lon, tz: c.pl.tz, cfg: getCfg(), direction: c.dir || null, hours: c.hrs});
      if (r.error) throw new Error(r.error);
      M.sheet = {r, date, p, c, sel: 0};
      drawSheet();
    } catch (e) { body.innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
  }
  function timeline(r) {
    const span = r.nsr - r.sr;
    const segs = r.timeline.map(t => `<i class="g-${t.grade}" style="left:${((t.a - r.sr) / span * 100).toFixed(3)}%;width:${(((t.b - t.a) / span) * 100).toFixed(3)}%" data-a="${t.sa}" data-m="${((t.b - t.a) / 2 * 1440).toFixed(2)}" title="${t.sa.slice(11)} to ${t.sb.slice(11)}: ${GR[t.grade]} ${t.grade === 'avoid' ? '(' + esc(t.veto.join(', ')) + ')' : t.score}"></i>`).join('');
    const m0 = +r.sunrise.slice(11, 13) * 60 + +r.sunrise.slice(14, 16);
    let ticks = '';
    for (let h = 0; h < 24; h += 3) {
      const off = ((h * 60 - m0) + 1440) % 1440;
      ticks += `<span style="left:${(off / (span * 1440) * 100).toFixed(2)}%">${pad(h)}</span>`;
    }
    return `<div class="mu-tl"><div class="bar">${segs}</div><div class="ticks">${ticks}</div></div>`;
  }
  function drawSheet() {
    const {r, date, p} = M.sheet;
    const wins = r.detail || [];
    const sel = Math.min(M.sheet.sel, Math.max(0, wins.length - 1));
    const wchips = wins.map((w, i) => `<button class="mu-w g-${w.grade}${i === sel ? ' on' : ''}" data-i="${i}">${win(w.sa, w.sb, date)} <b>${w.score}</b></button>`).join('');
    let factors = '', head = '';
    if (wins.length) { factors = factorTable(wins[sel].factors); head = `<p class="note">Showing the reasons for <b>${win(wins[sel].sa, wins[sel].sb, date)}</b>. Tap a coloured part of the bar to see any other time.</p>`; }
    else if (r.blocked) { factors = `<p class="note">No time this day is recommended. Here is why, for the strongest moment (${win(r.blocked.sa, r.blocked.sb, date)}):</p>` + factorTable(r.blocked.factors); }
    $('#muSheetBody').innerHTML = `<h3 class="mu-h">${p.icon} ${esc(p.label)}</h3>
      <div class="mu-dayh g-${r.grade}"><b>${fmtDayY(date)}</b><span class="badge">${GR[r.grade]}</span>${r.grade !== 'avoid' ? `<span class="sc">${r.score}</span>` : ''}
      <small>${esc(r.masa)} &middot; Sunrise ${r.sunrise.slice(11)} &middot; Sunset ${r.sunset.slice(11)}</small></div>
      ${timeline(r)}<div class="mu-legend">${Object.keys(GR).map(k => `<span class="g-${k}"><i></i>${GR[k]}</span>`).join('')}</div>
      ${wins.length ? `<h4 class="mu-sec">Best windows</h4><div class="mu-ws">${wchips}</div>` : ''}${head}
      <div id="muAt"></div>${factors}
      <details class="mu-rules"><summary>Rising sign through the day</summary><ul>${r.lagna.map(l => `<li>${l.sign}: ${win(l.sa, l.sb, date)}</li>`).join('')}</ul></details>`;
    $$('#muSheetBody .mu-w').forEach(b => b.onclick = () => { M.sheet.sel = +b.dataset.i; drawSheet(); });
    $$('#muSheetBody .mu-tl .bar i').forEach(i => i.onclick = async () => {
      const when = addMin(i.dataset.a, +i.dataset.m);
      const at = $('#muAt'); at.innerHTML = '<p class="note">Checking that time...</p>';
      try {
        const c = M.sheet.c;
        const e = await api('/api/muhurta/at', {purpose: M.purpose, person: M.people.me, partner: M.sheet.p.person === 'both' ? M.people.partner : null, when, lat: c.pl.lat, lon: c.pl.lon, tz: c.pl.tz, cfg: getCfg(), direction: c.dir || null});
        if (e.error) throw new Error(e.error);
        at.innerHTML = `<div class="mu-at g-${e.grade}"><h4 class="mu-sec">At ${when.slice(11, 16)}: ${GR[e.grade]}${e.grade !== 'avoid' ? ' (' + e.score + ')' : ''}</h4>${factorTable(e.factors)}</div>`;
        at.scrollIntoView({behavior: 'smooth', block: 'start'});
      } catch (err) { at.innerHTML = `<p class="bad">${esc(err.message)}</p>`; }
    });
  }

  /* ------------------------------------------------------------ guide */
  async function drawGuide() {
    const g = await guide(), el = $('#muGuide');
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const tot = g.factors.reduce((a, f) => a + f.weight, 0);
    el.innerHTML = `<h3 class="mu-h">How a muhurta is judged</h3>
      <p class="note">Based on B. V. Raman's <i>Muhurtha</i>. Four layers: vetoes (a serious dosha makes the moment Avoid), a weighted score, time windows inside the day, and the neutralisers Raman allows.</p>
      <h4 class="mu-sec">Grades</h4><div class="mu-legend">${g.grades.map(x => `<span class="g-${x.name.toLowerCase()}"><i></i>${x.name} ${x.min}+</span>`).join('')}<span class="g-avoid"><i></i>Avoid (any veto)</span></div>
      <h4 class="mu-sec">The factors and their weight</h4>
      ${g.factors.map(f => `<div class="mu-f"><div class="fh"><b>${esc(f.title)}</b>${f.personal ? '<span class="pill">needs birth star</span>' : ''}<span class="pts">${Math.round(100 * f.weight / tot)}%</span></div><p class="fw">${esc(f.text)}</p></div>`).join('')}
      <h4 class="mu-sec">What can cancel a dosha</h4><ul>${g.neutralisers.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      <h4 class="mu-sec">Look up a star, tithi, weekday or yoga</h4>
      <div class="mu-nav sub"><button data-k="nakshatras" class="on">Nakshatra</button><button data-k="tithis">Tithi</button><button data-k="weekdays">Weekday</button><button data-k="yogas">Yoga</button></div>
      <div id="muLook"></div><p class="note" style="text-align:center;margin-top:18px">Created by Aryan Sankara Tejasvi</p>`;
    const chips = (arr, cls) => arr.length ? arr.map(x => `<span class="chp ${cls}">${x.icon} ${esc(x.label)}</span>`).join('') : '<small>none</small>';
    const draw = k => {
      $('#muLook').innerHTML = g[k].map(x => `<div class="mu-f"><div class="fh"><b>${esc(x.name)}</b>${x.cls ? `<span class="pill">${esc(x.cls)}</span>` : ''}${x.lord ? `<span class="pill">${esc(x.lord)}</span>` : ''}${x.absolute ? '<span class="pill bad">avoided for almost all auspicious work</span>' : ''}${x.level === 'veto' ? '<span class="pill bad">great evil</span>' : x.level === 'bad' ? '<span class="pill bad">harmful</span>' : ''}</div>
        ${x.cls_text ? `<p class="fw">${esc(x.cls_text)}</p>` : ''}
        ${x.best ? `<div class="fw"><small>Favourable for</small> ${chips(x.best, 'ok')}</div>` : ''}${x.ok && x.ok.length ? `<div class="fw"><small>Acceptable for</small> ${chips(x.ok, 'mid')}</div>` : ''}
        ${x.avoid ? `<div class="fw"><small>Avoid for</small> ${chips(x.avoid, 'no')}</div>` : ''}</div>`).join('');
    };
    $$('.mu-nav.sub button', el).forEach(b => b.onclick = () => { $$('.mu-nav.sub button', el).forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.k); });
    draw('nakshatras');
  }

  /* ------------------------------------------------------------ first-page card */
  function homeHead(ctx) {
    const me = M.people.me, open = ctx.open;
    return `<div class="ch"><h2>Muhurta ${me ? 'for you' : '<span class="hint">for the day</span>'}</h2><div class="btns"><button class="xp mu-set" type="button" title="Set whose birth star to use">${me ? esc(me.name || 'Change') : 'Set birth star'}</button>`
      + `<button class="xp ic mu-tg" type="button" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'}" title="${open ? 'Hide' : 'Show'}"><i>${open ? '▴' : '▾'}</i></button></div></div>`;
  }
  function homeBody(d, ctx) {
    const info = d.info || {};
    const jd = ctx.jd;
    const me = M.people.me;
    let chips = '';
    if (me && info.tara) {
      const tg = info.tara_good, cb = info.chandra_bad;
      chips = `<div class="mu-pc"><span class="mu-chip ${tg ? 'ok' : (info.tara_n === 3 || info.tara_n === 7 ? 'no' : info.tara_n === 5 || info.tara_n === 1 ? 'mid' : 'ok')}"><small>Tarabala</small><b>${esc(info.tara)}</b><small>${esc(info.nak)} is star ${info.count} from yours: ${esc(info.tara_meaning)}</small></span>
        <span class="mu-chip ${info.chandrashtama ? 'no' : cb ? 'no' : info.chandra_warn ? 'mid' : 'ok'}"><small>Chandrabala</small><b>${info.chandrashtama ? 'Chandrashtama' : cb ? 'Weak' : info.chandra_warn ? 'Warning: 6th' : 'Good'}</b><small>Moon in ${esc(info.moon_sign)}, ${info.chandra_house}${[, 'st', 'nd', 'rd'][info.chandra_house] || 'th'} from your Moon sign${info.chandra_warn ? '. B. V. Raman rejects the 6th, accepted here with a warning' : ''}</small></span></div>`;
    }
    const items = (M.guide ? M.guide.purposes : []).map(p => {
      const r = d.purposes[p.id]; if (!r) return '';
      const sl = r.slots.find(s => jd >= s[0] && jd < s[1]);
      const nowg = sl ? sl[2] : r.now.grade;
      return `<button class="mu-hp g-${r.day.grade}" data-id="${p.id}" title="Day: ${GR[r.day.grade]}${r.day.grade !== 'avoid' ? ' ' + r.day.score : ''}. Right now: ${GR[nowg]}"><span class="ic">${p.icon}</span><b>${esc(p.label.replace(/ \(.*\)/, '').replace(/ \/.*/, ''))}</b><span class="st"><i class="dot g-${r.day.grade}"></i>${GR[r.day.grade]}</span><small>now: ${GR[nowg].toLowerCase()}</small></button>`;
    }).join('');
    return `${chips || '<p class="mu-note">Add your birth star to include Tarabala and Chandrabala. Without it this is the general quality of the day.</p>'}
      <div class="mu-hg">${items}</div>
      <p class="mu-note">Day quality before the rising sign and time-of-day checks. Tap a purpose to find the best dates and times.</p>`;
  }
  /* The header (with the Set birth star button) is always drawn at once; the body is drawn only when the section is open */
  function paint() {
    const host = document.getElementById('hmMuh'), ctx = M.ctx;
    if (!host || !ctx) return;
    host.classList.add('c-muh');
    let body = '';
    if (ctx.open) {
      if (M.home.data && M.guide) body = homeBody(M.home.data, ctx);
      else if (M.home.err) body = `<p class="mu-note">${esc(M.home.err)}</p>`;
      else body = '<p class="mu-note">Working out the day...</p>';
    }
    host.innerHTML = homeHead(ctx) + body;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest ? e.target.closest('#hmMuh .mu-set, #hmMuh .mu-tg, #hmMuh .mu-hp') : null;
    if (!t) return;
    if (t.classList.contains('mu-set')) personModal();
    else if (t.classList.contains('mu-tg')) { if (M.ctx && M.ctx.toggle) M.ctx.toggle(); }
    else go(t.dataset.id);
  });
  function home(host, ctx) {
    if (!host) return;
    M.ctx = ctx;
    paint();
    if (!ctx.open) return;
    const key = `${ctx.date}|${personKey(M.people.me)}|${ctx.place.lat},${ctx.place.lon}`;
    if (M.home.key === key && M.home.data && M.guide) return;
    if (M.home.busy === key) return;
    M.home.busy = key; M.home.err = '';
    (async () => {
      try {
        await guide();
        const r = await api('/api/muhurta/home', {when: ctx.when, person: M.people.me, lat: ctx.place.lat, lon: ctx.place.lon, tz: ctx.place.tz, cfg: getCfg()});
        if (r.error) throw new Error(r.error);
        M.home.key = key; M.home.data = r; M.home.busy = false;
      } catch (e) { M.home.busy = false; M.home.err = e.message || String(e); }
      paint();
    })();
  }
  function personModal() {
    let m = document.getElementById('muPM');
    if (!m) {
      m = document.createElement('div'); m.id = 'muPM'; m.className = 'mu-sheet'; m.hidden = true;
      m.innerHTML = '<div class="mu-sheet-in small"><button class="mu-x" aria-label="Close">&times;</button><h3 class="mu-h">Whose birth star?</h3><div id="muPMb"></div><p class="note">Stored only on this device. Used for Tarabala and Chandrabala.</p><button class="run" id="muPMok">Done</button></div>';
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.classList.contains('mu-x')) m.hidden = true; });
      $('#muPMok', m).onclick = () => { m.hidden = true; M.home.key = ''; document.dispatchEvent(new CustomEvent('muh-person')); };
    }
    m.hidden = false;
    personUI($('#muPMb'), 'me');
  }
  function go(pid) {
    M.pending = pid;
    location.hash = '#app';
    setTimeout(() => {
      showTab('panchanga');
      const sub = document.querySelector('#pnSub button[data-s="muhurta"]');
      if (sub) sub.click();
      else applyPending();
    }, 60);
  }

  return {mount, home, go, view, M, applyPending, personModal, guide};
})();
