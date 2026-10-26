'use strict';
/* Jyotisha Tejas extras: Calendar, calendar export, My day (daily brief), Alerts. Clients and the PDF report are in clients.js.
   Needs app.js globals: api, esc, $, $$, guard, getCfg, readPlaceField, defaultPlace, S, nowIn, Local, payload, setStatus, showTab. */
const Extra = (() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOWF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MASA = ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'];
  const NAKN = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const SIGNN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const TITH = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima'];
  const TARA = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Sadhana', 'Naidhana', 'Mitra', 'Parama Mitra'];
  const TARA_GOOD = [false, true, false, true, false, true, false, true, true];
  const CH_GOOD = [1, 3, 6, 7, 10, 11];
  const PL7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const pad = n => String(n).padStart(2, '0');
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]);
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parse = s => ({y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10)});
  const utcDay = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
  const addDays = (s, n) => { const t = new Date((utcDay(s) + n) * 86400000); return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  const fmtDay = s => { const p = parse(s); return `${DOWS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]} ${p.d} ${MON[p.m - 1]}`; };
  const fmtDayY = s => `${fmtDay(s)} ${s.slice(0, 4)}`;
  const today = tz => nowIn(tz).slice(0, 10);

  const DISC = 'Predictive insights here come only from astrological rules and may not hold in the real world. They are not medical, legal, financial or investment advice. Use your own judgement before acting on them.';

  let PLO = null;
  function place() {
    if (PLO) { const p = PLO(); if (p && isFinite(p.lat) && isFinite(p.lon)) return {lat: p.lat, lon: p.lon, tz: p.tz || TZ, label: p.label || ''}; }
    try { const p = readPlaceField('pn'); if (p && isFinite(p.lat) && isFinite(p.lon)) return {lat: p.lat, lon: p.lon, tz: p.tz || TZ, label: p.label || ''}; } catch (e) { /* field not on screen */ }
    const d = defaultPlace(); return {lat: d.lat, lon: d.lon, tz: d.tz || TZ, label: d.label || ''};
  }
  function person() {
    const me = lsGet('jt_muh_me', null);
    if (me && me.nak != null && me.rasi != null) return {nak: +me.nak, rasi: +me.rasi, name: me.name || '', src: 'saved'};
    const c = S.chart;
    if (c) { const mo = c.planets.find(p => p.name === 'Moon'); if (mo) return {nak: NAKN.indexOf(mo.nak), rasi: mo.sign, name: c.meta.name || '', src: 'chart'}; }
    return null;
  }
  function quality(row, p) {
    if (!p) return null;
    const ta = ((row.nak - p.nak) % 27 + 27) % 27 % 9, ch = ((row.moon_sign - p.rasi) % 12 + 12) % 12 + 1;
    const tg = TARA_GOOD[ta], cg = CH_GOOD.includes(ch);
    return {tara: TARA[ta], tg, ch, cg, level: tg && cg ? 'g' : (tg || cg ? 'm' : 'r'), score: Math.max(1, Math.min(10, 5 + (tg ? 2 : -2) + (cg ? 2 : -2) + (ta === 0 ? 0.5 : 0)))};
  }
  /* calendar systems */
  const SYS = {
    saka: {name: 'Luni-solar Saka Panchanga (Amanta)', short: 'Saka \u00b7 Amanta', pm: false, era: 'saka', tip: 'Months end at the new moon (South and West India). The year starts at Ugadi / Gudi Padwa.'},
    saka_p: {name: 'Luni-solar Saka Panchanga (Purnimanta)', short: 'Saka \u00b7 Purnimanta', pm: true, era: 'saka', tip: 'Months end at the full moon (North India), Saka year.'},
    vikram_c: {name: 'Chaitradi Vikram Samvat (Amanta)', short: 'Vikram \u00b7 Chaitradi', pm: false, era: 'vikram', tip: 'Vikram year starting at Chaitra Shukla Pratipada, Amanta months.'},
    vikram_n: {name: 'Vikram Samvat (North, Purnimanta)', short: 'Vikram \u00b7 Purnimanta', pm: true, era: 'vikram', tip: 'Vikram year starting at Chaitra Shukla Pratipada, Purnimanta months.'},
    vikram_g: {name: 'Gujarati Vikram Samvat (Kartikadi)', short: 'Vikram \u00b7 Gujarati', pm: false, era: 'vikram_g', tip: 'Vikram year starting the day after Diwali (Kartika Shukla Pratipada), Amanta months.'},
    tamil: {name: 'Tamil solar calendar (Chithirai to Panguni)', short: 'Tamil solar', pm: false, era: 'solar', sol: 'tamil', tip: 'Months start at the Sun\'s sign change (month begins that day if it happens before sunset). Tamil year name, Saka and Thiruvalluvar year. Pongal, Puthandu and Aadi Perukku are listed.'},
    malayalam: {name: 'Malayalam solar calendar (Kollavarsham)', short: 'Malayalam solar', pm: false, era: 'solar', sol: 'malayalam', tip: 'Kollam era, year starts at Chingam. A month begins that day if the Sun changes sign before the end of aparahna. Vishu, Onam and Makaravilakku are listed.'},
    bengali: {name: 'Bengali solar calendar (Bangabda)', short: 'Bengali solar', pm: false, era: 'solar', sol: 'bengali', tip: 'West Bengal Panjika rule: a month begins the day after the sign change, or the same day if it happens between midnight and sunrise. Year starts at Poila Boishakh.'},
    odia: {name: 'Odia solar calendar', short: 'Odia solar', pm: false, era: 'solar', sol: 'odia', tip: 'The month begins on the day of the sign change. Year starts at Maha Vishuva Pana Sankranti. Raja and Makara Sankranti are listed.'},
    assamese: {name: 'Assamese solar calendar (Bhaskarabda)', short: 'Assamese solar', pm: false, era: 'solar', sol: 'assamese', tip: 'Month begins that day if the sign change is before sunset, else the next day. Bohag, Kati and Magh Bihu are listed.'},
    punjabi: {name: 'Punjabi solar calendar (Bikrami)', short: 'Punjabi solar', pm: false, era: 'solar', sol: 'punjabi', tip: 'Months start at the Sangrand (sign change). Bikrami year starts at Vaisakhi. Vaisakhi, Lohri, Maghi and each Sangrand are listed.'},
    tulu: {name: 'Tulu solar calendar (Saura masa)', short: 'Tulu solar', pm: false, era: 'solar', sol: 'tulu', tip: 'Months start at the sign change (Paggu, Beshya, Kartel, Aati, ...). Bisu Parba is the new year.'},
    civil: {name: 'Indian National Calendar (Saka, solar civil)', short: 'National Saka', pm: false, era: 'civil', tip: 'The official civil calendar: fixed month lengths, Chaitra 1 on 22 March (21 March in a leap year).'},
  };
  const SAMV = ['Prabhava', 'Vibhava', 'Shukla', 'Pramoda', 'Prajapati', 'Angirasa', 'Shrimukha', 'Bhava', 'Yuva', 'Dhatri', 'Ishvara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vrisha', 'Chitrabhanu', 'Subhanu', 'Tarana', 'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikriti', 'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi', 'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava', 'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadicha', 'Ananda', 'Rakshasa', 'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmati', 'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya'];
  const CIVIL_M = ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadra', 'Ashwin', 'Kartika', 'Agrahayana', 'Pausha', 'Magha', 'Phalguna'];
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const sysOf = () => SYS[CAL.sys] || SYS.saka;
  const solarDay = () => sysOf().era === 'civil' || !!sysOf().sol;
  const sysOpts = () => { const g = (t, ks) => `<optgroup label="${t}">${ks.map(k => `<option value="${k}"${k === CAL.sys ? ' selected' : ''}>${esc(SYS[k].name)}</option>`).join('')}</optgroup>`; return g('Luni-solar and Vikram', ['saka', 'saka_p', 'vikram_c', 'vikram_n', 'vikram_g']) + g('Solar', ['civil', 'tamil', 'malayalam', 'bengali', 'odia', 'assamese', 'punjabi', 'tulu']); };
  function setSys(k) { if (!SYS[k]) return; CAL.sys = k; CAL.pm = SYS[k].pm; lsSet('jt_cal_sys', k); if (CAL.el && CAL.el.isConnected) { CAL.rows = null; calPaint(); calLoad(); } }
  function setHadj(v) { CAL.hadj = +v || 0; lsSet('jt_cal_hadj', CAL.hadj); cache.clear(); if (CAL.el && CAL.el.isConnected) { CAL.rows = null; calPaint(); calLoad(); } }
  function setState(v) { CAL.state = v; lsSet('jt_cal_state', v); cache.clear(); CAL.rows = null; if (CAL.el && CAL.el.isConnected) { calPaint(); calLoad(); } }
  /* Saka year of a day (it changes at Ugadi, the start of Chaitra) */
  function sakaYear(r) { const Y = +r.date.slice(0, 4), mo = +r.date.slice(5, 7); return (r.masa != null && r.masa >= 9 && mo <= 4) ? Y - 79 : Y - 78; }
  function vikramG(r) { const Y = +r.date.slice(0, 4), mo = +r.date.slice(5, 7); return (r.masa != null && r.masa >= 7 && mo >= 10) ? Y + 57 : Y + 56; }
  function civilDate(date) {
    const Y = +date.slice(0, 4);
    const st = y => addDays(`${y}-03-22`, isLeap(y) ? -1 : 0);
    const y0 = date >= st(Y) ? Y : Y - 1;
    let doy = utcDay(date) - utcDay(st(y0));
    const lens = [isLeap(y0) ? 31 : 30, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
    let mi = 0; while (mi < 11 && doy >= lens[mi]) { doy -= lens[mi]; mi++; }
    return {d: doy + 1, m: mi, y: y0 - 78};
  }
  /* the date in the chosen calendar: {era: 'Saka 1948 Parabhava', cell: tithi or day} */
  function eraOf(r, short) {
    const sy = sysOf().era;
    if (sy === 'solar') return r.sol ? (short ? `${r.sol.name}, ${r.sol.era}` : `${r.sol.d} ${r.sol.name}, ${r.sol.era}`) : '';
    if (sy === 'civil') { const c = civilDate(r.date); return `${c.d} ${CIVIL_M[c.m]} ${c.y} Saka`; }
    if (sy === 'saka') { const y = sakaYear(r); return `Saka ${y} ${SAMV[(((y + 12 - 1) % 60) + 60) % 60]}`; }
    if (sy === 'vikram') return `Vikram ${sakaYear(r) + 135}`;
    return `Vikram ${vikramG(r)}`;
  }
  const masaOf = (row, pm) => { const i = pm ? row.masa_p : row.masa; return i == null ? '' : (row.adhika ? 'Adhika ' : '') + MASA[i]; };

  /* ------------------------------------------------------------ data */
  const cache = new Map();
  async function getMonth(y, m) {
    const pl = place(), key = [y, m, pl.lat, pl.lon, pl.tz, CAL.state, sysOf().sol || '', CAL.hadj, JSON.stringify(getCfg())].join('|');
    if (cache.has(key)) return cache.get(key);
    const r = await api('/api/calendar/month', {year: y, month: m, lat: pl.lat, lon: pl.lon, tz: pl.tz, state: CAL.state, solar: sysOf().sol || '', hadj: CAL.hadj, cfg: getCfg()});
    if (r.error) throw new Error(r.error);
    if (cache.size > 24) cache.delete(cache.keys().next().value);
    cache.set(key, r.days); return r.days;
  }
  async function getRange(from, days) {
    const pl = place();
    const r = await api('/api/calendar/range', {from, days, lat: pl.lat, lon: pl.lon, tz: pl.tz, cfg: getCfg()});
    if (r.error) throw new Error(r.error);
    return r.days;
  }

  /* ------------------------------------------------------------ files */
  async function saveFile(name, mime, text) {
    const blob = new Blob([text], {type: mime});
    try {
      const file = new File([blob], name, {type: mime});
      if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: name}); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  }
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fold = l => { const out = []; while (l.length > 74) { out.push(l.slice(0, 74)); l = ' ' + l.slice(74); } out.push(l); return out.join('\r\n'); };
  function icsWrap(events, name, cancel) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jyotisha Tejas//Calendar//EN', 'CALSCALE:GREGORIAN', cancel ? 'METHOD:CANCEL' : 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(name || 'Jyotisha Tejas')];
    events.forEach(e => L.push(...e));
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  function allDayEvent(uid, date, title, desc, alarm, cancel) {
    const e = ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:20260101T000000Z', 'DTSTART;VALUE=DATE:' + date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + addDays(date, 1).replace(/-/g, ''), 'SUMMARY:' + icsEsc(title)];
    if (desc) e.push('DESCRIPTION:' + icsEsc(desc));
    if (cancel) e.push('STATUS:CANCELLED', 'SEQUENCE:1');
    else { e.push('TRANSP:TRANSPARENT'); if (alarm) e.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(title), 'TRIGGER:' + alarm, 'END:VALARM'); }
    e.push('END:VEVENT'); return e;
  }
  function zonedToDate(iso, tz) {
    const [d, t] = iso.split('T'), [Y, M, D] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number);
    const base = Date.UTC(Y, M - 1, D, h, mi);
    const off = ts => { try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}).formatToParts(new Date(ts)).map(x => [x.type, x.value])); return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000) / 60000; } catch (e) { return -new Date(ts).getTimezoneOffset(); } };
    let ts = base; for (let i = 0; i < 3; i++) ts = base - off(ts) * 60000;
    return new Date(ts);
  }

  /* ------------------------------------------------------------ calendar view */
  const CAL = {y: 0, m: 0, sel: '', filt: lsGet('jt_cal_filt', {fest: 1, hol: 1, vrata: 1, moon: 1, sky: 1}), pm: false, sys: lsGet('jt_cal_sys', 'saka'), state: lsGet('jt_cal_state', ''), hadj: +lsGet('jt_cal_hadj', 0) || 0, rows: null, el: null, err: '', home: false, q: lsGet('jt_cal_q', true), det: lsGet('jt_cal_det', {pg: 1, tm: 1, you: 1, up: 1, btn: 1})};
  CAL.pm = (SYS[CAL.sys] || SYS.saka).pm;
  const CATS = [['fest', 'Festivals'], ['hol', 'Holidays'], ['vrata', 'Vratas'], ['moon', 'Moon days'], ['sky', 'Sankranti']];
  const evCat = e => e.cat;

  async function calMount(el, opts) {
    CAL.el = el; CAL.home = !!(opts && opts.place); PLO = CAL.home ? opts.place : null;
    const tz = place().tz, t = today(tz);
    if (!CAL.y) { const p = parse(t); CAL.y = p.y; CAL.m = p.m; CAL.sel = t; }
    calPaint();
    calLoad();
  }
  async function calLoad() {
    CAL.err = '';
    const y = CAL.y, m = CAL.m;
    try { CAL.rows = await getMonth(y, m); } catch (e) { CAL.rows = null; CAL.err = e.message || String(e); }
    if (y !== CAL.y || m !== CAL.m) return;
    if (CAL.rows && !CAL.rows.find(r => r.date === CAL.sel)) CAL.sel = CAL.rows[0].date;
    calPaint();
    // warm the next month so "coming up" can cross the month end
    const nm = m === 12 ? [y + 1, 1] : [y, m + 1];
    getMonth(nm[0], nm[1]).then(() => { if (CAL.y === y && CAL.m === m) calUpcoming(); }).catch(() => {});
  }
  const dots = (ev) => [...new Set(ev.filter(e => CAL.home || CAL.filt[e.cat]).map(e => e.cat))].map(c => `<i class="xd d-${c}"></i>`).join('');
  function calPaint() {
    const el = CAL.el; if (!el) return;
    const pl = place(), t = today(pl.tz), p = person();
    let body = '';
    if (CAL.err) body = `<p class="bad">${esc(CAL.err)}</p>`;
    else if (!CAL.rows) body = '<p class="note">Reading the sky for this month...</p>';
    else {
      const first = CAL.rows[0].vara;
      const cells = [];
      for (let i = 0; i < first; i++) cells.push('<span class="xc blank"></span>');
      CAL.rows.forEach(r => {
        const q = quality(r, p), dd = +r.date.slice(8);
        const tl = sysOf().sol ? String(r.sol ? r.sol.d : '') : sysOf().era === 'civil' ? String(civilDate(r.date).d) : r.tithi === 15 ? 'Pur' : r.tithi === 30 ? 'Ama' : (r.tithi < 15 ? 'S' : 'K') + (r.tithi % 15);
        cells.push(`<button type="button" class="xc${r.date === t ? ' today' : ''}${r.date === CAL.sel ? ' sel' : ''}" data-d="${r.date}" aria-label="${esc(fmtDayY(r.date))}"><b>${dd}</b><small>${tl}</small><span class="xds">${dots(r.events)}</span>${q && CAL.q ? `<span class="xq q-${q.level}"></span>` : ''}</button>`);
      });
      const label = (() => { const a = CAL.rows[0], b = CAL.rows[CAL.rows.length - 1]; const x = masaOf(a, CAL.pm), y = masaOf(b, CAL.pm); return x === y ? x : `${x} / ${y}`; })();
      body = `<div class="xdow">${DOWS.map(d => `<span>${d}</span>`).join('')}</div><div class="xgrid">${cells.join('')}</div>
        <p class="note xlegend"><i class="xd d-fest"></i> Festival <i class="xd d-hol"></i> Holiday <i class="xd d-vrata"></i> Vrata <i class="xd d-moon"></i> Purnima / Amavasya <i class="xd d-sky"></i> Sankranti${p ? ' &middot; bar under the date: <span class="xq q-g inl"></span> good <span class="xq q-m inl"></span> mixed <span class="xq q-r inl"></span> weak for you' : ''}</p>
        <p class="note">${esc(eraOf(CAL.rows[0], 1))}${eraOf(CAL.rows[0], 1) !== eraOf(CAL.rows[CAL.rows.length - 1], 1) ? ' / ' + esc(eraOf(CAL.rows[CAL.rows.length - 1], 1)) : ''}${solarDay() ? '' : ' &middot; ' + esc(label)}. ${solarDay() ? 'Dates show the day of the solar month; the lunar tithi is in the day details.' : 'Tithi at sunrise: S = Shukla, K = Krishna.'}</p>`;
    }
    el.innerHTML = `<div class="xcal">
      <div class="xhead"><button type="button" class="sec" id="xPrev" aria-label="Previous month">&#8249;</button>
        <select id="xMon" class="xsel" aria-label="Month">${MONF.map((n, i) => `<option value="${i + 1}"${i + 1 === CAL.m ? ' selected' : ''}>${CAL.home ? n.slice(0, 3) : n}</option>`).join('')}</select>
        <select id="xYear" class="xsel" aria-label="Year">${Array.from({length: 151}, (_, i) => 1950 + i).map(y => `<option${y === CAL.y ? ' selected' : ''}>${y}</option>`).join('')}</select>
        <button type="button" class="sec" id="xNext" aria-label="Next month">&#8250;</button><span class="sp"></span>
        <button type="button" class="sec" id="xToday">Today</button>${CAL.home ? '<button type="button" class="sec" id="xGear" aria-label="Customise Home view" title="Customise">&#9881;</button>' : '<button type="button" class="sec" id="xExport">Export</button>'}</div>
      ${CAL.home ? `<div class="xmeta"><button type="button" class="xme" id="xMe" title="Whose birth star is used for Tarabala and Chandrabala">${p ? 'For you: <b>' + esc(p.name || NAKN[p.nak]) + '</b>' + (p.name ? ' (' + esc(NAKN[p.nak]) + ')' : '') : 'Set birth star'} &#9662;</button><span class="xtype" title="${esc(sysOf().name + '. ' + sysOf().tip)}">${esc(sysOf().short)}</span></div>` : ''}
      ${CAL.home ? '' : `<div class="xfilt">${CATS.map(([k, n]) => `<button type="button" class="xchip${CAL.filt[k] ? ' on' : ''}" data-f="${k}">${n}</button>`).join('')}<select id="xSys" class="xsel xpm" aria-label="Calendar system">${sysOpts()}</select><select id="xHadj" class="xsel xpm" aria-label="Hijri date adjustment" title="Hijri date adjustment (moon sighting)">${[-1, 0, 1].map(v => `<option value="${v}"${v === CAL.hadj ? ' selected' : ''}>Hijri ${v > 0 ? '+' + v : v}</option>`).join('')}</select></div>`}
      <div class="xbody">${body}</div><div id="xDetail"></div><div id="xUp"></div></div>`;
    $('#xPrev').onclick = () => calStep(-1); $('#xNext').onclick = () => calStep(1);
    $('#xToday').onclick = () => { const q = parse(today(place().tz)); CAL.y = q.y; CAL.m = q.m; CAL.sel = today(place().tz); CAL.rows = null; calPaint(); calLoad(); };
    if ($('#xExport')) $('#xExport').onclick = () => exportDialog();
    if ($('#xGear')) $('#xGear').onclick = () => homeViewDialog();
    if ($('#xMe')) $('#xMe').onclick = () => { if (typeof Muh !== 'undefined') Muh.personModal(); };
    $('#xMon').onchange = $('#xYear').onchange = () => { CAL.m = +$('#xMon').value; CAL.y = +$('#xYear').value; CAL.rows = null; CAL.sel = ymd(CAL.y, CAL.m, 1); calPaint(); calLoad(); };
    $$('.xchip', el).forEach(b => b.onclick = () => { CAL.filt[b.dataset.f] = CAL.filt[b.dataset.f] ? 0 : 1; lsSet('jt_cal_filt', CAL.filt); calPaint(); });
    if ($('#xSys')) $('#xSys').onchange = e => setSys(e.target.value);
    if ($('#xHadj')) $('#xHadj').onchange = e => setHadj(e.target.value);
    $$('.xc[data-d]', el).forEach(b => b.onclick = () => { CAL.sel = b.dataset.d; calPaint(); const d = $('#xDetail'); if (d && window.matchMedia('(max-width:700px)').matches) d.scrollIntoView({block: 'nearest', behavior: 'smooth'}); });
    calDetail(); calUpcoming();
  }
  function calStep(n) {
    CAL.m += n; if (CAL.m < 1) { CAL.m = 12; CAL.y--; } if (CAL.m > 12) { CAL.m = 1; CAL.y++; }
    CAL.rows = null; CAL.sel = ymd(CAL.y, CAL.m, 1); calPaint(); calLoad();
  }
  function evChip(e) { return `<span class="xev e-${e.cat}">${esc(e.name)}${e.time ? ' ' + esc(e.time) : ''}${e.pub ? ' <small>(public holiday)</small>' : e.state ? ' <small>(state)</small>' : e.regional ? ' <small>(' + esc(e.regional) + ')</small>' : ''}</span>`; }
  function calDetail() {
    const box = $('#xDetail'); if (!box || !CAL.rows) return;
    const r = CAL.rows.find(x => x.date === CAL.sel); if (!r) return;
    const p = person(), q = quality(r, p);
    const until = (tm, dt) => tm ? `until ${tm}${dt && dt !== r.date ? ' (' + fmtDay(dt) + ')' : ''}` : '';
    const T = r.times || {};
    const trow = (n, k) => T[k] ? `<div><span>${n}</span><b>${esc(T[k][0])} to ${esc(T[k][1])}</b></div>` : '';
    box.innerHTML = `<div class="xsheet">
      <div class="xsh1"><h4>${esc(fmtDayY(r.date))}</h4><small>${solarDay() ? esc(eraOf(r)) + ' &middot; ' : ''}${esc(masaOf(r, CAL.pm))} ${esc(r.paksha)} ${esc(TITH[(r.tithi - 1) % 15])}${r.tithi === 30 ? ' (Amavasya)' : ''}${solarDay() ? '' : ' &middot; ' + esc(eraOf(r))}${r.hijri ? ' &middot; Hijri ' + r.hijri.d + ' ' + esc(r.hijri.name) + ' ' + r.hijri.y : ''}</small></div>
      <div class="xevs">${r.events.length ? r.events.map(evChip).join('') : '<span class="note">No festival or vrata today.</span>'}</div>
      ${CAL.det.pg ? `<div class="xpg"><div><span>Tithi</span><b>${esc(r.tithi_name)}</b><small>${until(r.tithi_end, r.tithi_end_date)}</small></div><div><span>Nakshatra</span><b>${esc(r.nak_name)}</b><small>${until(r.nak_end, r.nak_end_date)}</small></div>
        <div><span>Yoga</span><b>${esc(r.yoga)}</b><small>${r.yoga_end ? 'until ' + esc(r.yoga_end) : ''}</small></div><div><span>Karana</span><b>${esc(r.karana)}</b></div>
        <div><span>Moon in</span><b>${esc(SIGNN[r.moon_sign])}</b></div><div><span>Sun</span><b>${esc(r.sunrise)} / ${esc(r.sunset)}</b><small>sunrise / sunset</small></div></div>` : ''}
      ${CAL.det.tm ? `<div class="xtm"><h5>Timings</h5>${trow('Abhijit', 'Abhijit')}${trow('Vijaya', 'Vijaya Muhurta')}${trow('Brahma', 'Brahma Muhurta')}${trow('Rahu Kala', 'Rahu Kalam')}${trow('Yama Gandam', 'Yama Gandam')}${trow('Gulika Kala', 'Gulika Kalam')}</div>` : ''}
      ${!CAL.det.you ? '' : q ? `<div class="xyou q-${q.level}"><h5>For you${p.name ? ' (' + esc(p.name) + ')' : ''}</h5><span>Tarabala <b>${esc(q.tara)}</b> ${q.tg ? 'good' : 'weak'}</span><span>Chandrabala <b>${ord(q.ch)} from your Moon</b> ${q.cg ? 'good' : 'weak'}</span></div>` : '<p class="note">Add your birth star under Muhurta finder, or calculate a chart, to see Tarabala and Chandrabala for each day.</p>'}
      ${CAL.det.btn ? '<div class="xbtns"><button type="button" class="sec" id="xFull">Full panchanga</button><button type="button" class="sec" id="xBrief">My day</button><button type="button" class="sec" id="xAdd">Add this day to my calendar</button></div>' : ''}</div>`;
    if (!CAL.det.btn) return;
    $('#xFull').onclick = () => gotoSub('panchanga', () => { $('#pnDate').value = r.date; $('#pnDay').click(); });
    $('#xBrief').onclick = () => gotoSub('brief', () => { BR.date = r.date; const b = document.querySelector('#pnSub button[data-s="brief"]'); if (b) b.click(); });
    $('#xAdd').onclick = guard(async () => {
      const ev = [allDayEvent(`jt-${r.date}-day@jyotishatejas.app`, r.date, `${r.tithi_name}, ${r.nak_name}`, `${r.tithi_name} ${until(r.tithi_end, r.tithi_end_date)}. ${r.nak_name} ${until(r.nak_end, r.nak_end_date)}. Rahu Kala ${(T['Rahu Kalam'] || []).join(' to ')}.`, null)];
      r.events.forEach((e, i) => ev.push(allDayEvent(`jt-${r.date}-${e.id}@jyotishatejas.app`, r.date, e.name, `${r.tithi_name}, ${r.nak_name}`, null)));
      await saveFile(`jyotisha-tejas-${r.date}.ics`, 'text/calendar', icsWrap(ev, 'Jyotisha Tejas'));
    });
  }
  function upcomingFrom(rows, from, n) {
    const out = [];
    for (const r of rows) { if (r.date < from) continue; for (const e of r.events) { if (CAL.home || CAL.filt[e.cat]) out.push({date: r.date, e}); } }
    return out.slice(0, n);
  }
  async function calUpcoming() {
    const box = $('#xUp'); if (!box || !CAL.rows) return;
    if (!CAL.det.up) { box.innerHTML = `<p class="note">${esc(DISC)}</p>`; return; }
    const tz = place().tz, from = today(tz) > CAL.rows[CAL.rows.length - 1].date ? CAL.rows[0].date : (today(tz) < CAL.rows[0].date ? CAL.rows[0].date : today(tz));
    let rows = CAL.rows.slice();
    const nm = CAL.m === 12 ? [CAL.y + 1, 1] : [CAL.y, CAL.m + 1];
    try { rows = rows.concat(await getMonth(nm[0], nm[1])); } catch (e) { /* ignore */ }
    const list = upcomingFrom(rows, from, 9);
    box.innerHTML = list.length ? `<h4 class="xh4">Coming up</h4><div class="xlist">${list.map(x => { const dd = utcDay(x.date) - utcDay(today(tz)); return `<button type="button" class="xrow" data-d="${x.date}"><span class="xdt">${esc(fmtDay(x.date))}</span><span class="xn"><i class="xd d-${x.e.cat}"></i> ${esc(x.e.name)}</span><span class="xin">${dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : dd > 0 ? 'in ' + dd + ' days' : ''}</span></button>`; }).join('')}</div><p class="note">${esc(DISC)}</p>` : `<p class="note">${esc(DISC)}</p>`;
    $$('.xrow', box).forEach(b => b.onclick = () => { const d = b.dataset.d, p = parse(d); if (p.y !== CAL.y || p.m !== CAL.m) { CAL.y = p.y; CAL.m = p.m; CAL.rows = null; CAL.sel = d; calPaint(); calLoad(); } else { CAL.sel = d; calPaint(); } });
  }

  /* ------------------------------------------------------------ export */
  function exportDialog() {
    const st = lsGet('jt_cal_exp', {cats: {fest: 1, hol: 1, vrata: 1, moon: 1, sky: 0}, daily: 0, months: 6, alarm: 'none'});
    const wrap = document.createElement('div'); wrap.className = 'xmodal'; wrap.innerHTML = `<div class="xbox" role="dialog" aria-label="Export to calendar">
      <h3>Export to your calendar</h3>
      <p class="note">Creates a calendar file. Open it in Apple, Google or Outlook Calendar and choose a <b>new calendar</b> named Jyotisha Tejas. To undo it later, delete that calendar, or use the removal file below.</p>
      <h5>Include</h5><div class="xfilt">${CATS.map(([k, n]) => `<button type="button" class="xchip${st.cats[k] ? ' on' : ''}" data-c="${k}">${n}</button>`).join('')}<button type="button" class="xchip${st.daily ? ' on' : ''}" data-c="daily">Daily tithi and nakshatra</button></div>
      <h5>Range</h5><div class="xfilt">${[3, 6, 12].map(n => `<button type="button" class="xchip${st.months === n ? ' on' : ''}" data-m="${n}">${n} months</button>`).join('')}</div>
      <h5>Reminder</h5><label>Add a reminder to each event<select id="xAlarm"><option value="none">None</option><option value="same">08:00 on the day</option><option value="eve">18:00 the evening before</option></select></label>
      <p class="note" id="xExpMsg"></p>
      <div class="xbtns"><button type="button" id="xExpGo">Create calendar file</button><button type="button" class="sec" id="xExpRm">Removal file</button><button type="button" class="sec" id="xExpX">Close</button></div></div>`;
    document.body.appendChild(wrap);
    $('#xAlarm', wrap).value = st.alarm;
    wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
    $('#xExpX', wrap).onclick = () => wrap.remove();
    $$('[data-c]', wrap).forEach(b => b.onclick = () => { const k = b.dataset.c; if (k === 'daily') st.daily = st.daily ? 0 : 1; else st.cats[k] = st.cats[k] ? 0 : 1; b.classList.toggle('on'); });
    $$('[data-m]', wrap).forEach(b => b.onclick = () => { st.months = +b.dataset.m; $$('[data-m]', wrap).forEach(x => x.classList.toggle('on', x === b)); });
    const run = guard(async cancel => {
      st.alarm = $('#xAlarm', wrap).value; lsSet('jt_cal_exp', st);
      const msg = $('#xExpMsg', wrap); msg.textContent = 'Working out the dates...';
      const tz = place().tz, from = today(tz);
      const rows = await getRange(from, Math.round(st.months * 30.5));
      const alarm = st.alarm === 'same' ? 'PT8H' : st.alarm === 'eve' ? '-PT6H' : null;
      const ev = []; let n = 0;
      rows.forEach(r => {
        r.events.forEach(e => { if (st.cats[e.cat]) { ev.push(allDayEvent(`jt-${r.date}-${e.id}@jyotishatejas.app`, r.date, e.name, `${r.tithi_name}, ${r.nak_name}`, alarm, cancel)); n++; } });
        if (st.daily) { ev.push(allDayEvent(`jt-${r.date}-day@jyotishatejas.app`, r.date, `${r.tithi_name}, ${r.nak_name}`, `${masaOf(r, CAL.pm)} ${r.paksha}`, null, cancel)); n++; }
      });
      if (!n) { msg.textContent = 'Nothing selected to export.'; return; }
      await saveFile(cancel ? 'jyotisha-tejas-remove.ics' : 'jyotisha-tejas-calendar.ics', 'text/calendar', icsWrap(ev, 'Jyotisha Tejas', cancel));
      msg.innerHTML = cancel ? `Removal file for ${n} events created. Open it in the same calendar app to cancel them.` : `<b>${n} events</b> ready. Choose "New calendar" when your calendar app asks where to add them. Dates are for ${esc(place().label || 'your location')}.`;
    });
    $('#xExpGo', wrap).onclick = () => run(false);
    $('#xExpRm', wrap).onclick = () => run(true);
  }

  /* ------------------------------------------------------------ my day */
  const BR = {date: '', el: null};
  const TNAT = ['Nanda', 'Bhadra', 'Jaya', 'Rikta', 'Purna'];
  const TNOTE = {Nanda: 'Nanda tithi: cheerful, good for celebrations and starting happy things.', Bhadra: 'Bhadra tithi: good for health, comfort and prosperity.', Jaya: 'Jaya tithi: good for competition, effort and new ventures.', Rikta: 'Rikta tithi: empty; avoid auspicious starts if you can.', Purna: 'Purna tithi: complete; good for finishing, learning and ceremonies.'};
  const VNOTE = ['Sunday: Sun day, good for authority matters and health.', 'Monday: Moon day, good for family, travel by water and gentle work.', 'Tuesday: Mars day, good for effort and repairs; avoid arguments.', 'Wednesday: Mercury day, good for study, trade and writing.', 'Thursday: Jupiter day, good for learning, advice and new beginnings.', 'Friday: Venus day, good for arts, relationships and purchases.', 'Saturday: Saturn day, steady work suits; avoid rushing new starts.'];
  async function briefMount(el) {
    BR.el = el;
    if (!BR.date) BR.date = today(place().tz);
    briefPaint('Reading the sky...');
    briefLoad();
  }
  async function briefLoad() {
    const el = BR.el, d = BR.date, pl = place();
    try {
      const p = parse(d);
      const [rows, full] = await Promise.all([getMonth(p.y, p.m), api('/api/panchanga/day', {lat: pl.lat, lon: pl.lon, tz: pl.tz, cfg: getCfg(), date: d})]);
      if (full.error) throw new Error(full.error);
      const row = rows.find(r => r.date === d);
      let dasa = null;
      if (S.chart && person() && person().src === 'chart') { try { const r = await api('/api/dasa', payload({depth: 2, when: d + 'T12:00', tz: TZ})); if (!r.error) dasa = r.at.path; } catch (e) { /* ignore */ } }
      if (d !== BR.date) return;
      briefPaint(null, row, full, dasa);
    } catch (e) { briefPaint(e.message || String(e)); }
  }
  function briefPaint(msg, row, full, dasa) {
    const el = BR.el; if (!el) return;
    const pl = place(), isToday = BR.date === today(pl.tz), p = person();
    const nav = `<div class="xhead"><button type="button" class="sec" id="bPrev" aria-label="Previous day">&#8249;</button><h3>${isToday ? 'Your day' : esc(fmtDay(BR.date))}</h3><button type="button" class="sec" id="bNext" aria-label="Next day">&#8250;</button><button type="button" class="sec" id="bToday">Today</button></div>`;
    if (msg || !row) { el.innerHTML = `<div class="xcal">${nav}<p class="${msg && msg !== 'Reading the sky...' ? 'bad' : 'note'}">${esc(msg || '')}</p></div>`; bind(); return; }
    const q = quality(row, p);
    const tn = TNAT[((row.tithi - 1) % 15) % 5];
    const T = row.times || {};
    const lbl = q ? (q.score >= 7 ? 'Favourable' : q.score >= 4.5 ? 'Mixed' : 'Go carefully') : 'General';
    const notes = [];
    if (q) { notes.push(`Moon is in the ${ord(q.ch)} from your natal Moon: ${q.cg ? 'supportive for work and dealings' : 'less supportive, keep plans simple'}${q.ch === 8 ? ' (Chandrashtama: avoid new starts)' : ''}.`); notes.push(`Tarabala ${q.tara}: ${q.tg ? 'a helpful star for you' : 'a weaker star for you, extra care with new starts'}.`); }
    notes.push(TNOTE[tn]); notes.push(VNOTE[row.vara]);
    // windows on a day timeline from sunrise to sunset
    const m = s => +s.slice(0, 2) * 60 + +s.slice(3, 5), s0 = m(row.sunrise), s1 = m(row.sunset), span = Math.max(1, s1 - s0);
    const seg = (rng, cls) => { if (!rng) return ''; const a = Math.max(s0, m(rng[0])), b = Math.min(s1, m(rng[1])); if (b <= a) return ''; return `<i class="${cls}" style="left:${(a - s0) / span * 100}%;width:${(b - a) / span * 100}%"></i>`; };
    const good = (full.horas || []).filter(h => !h.night && ['Jupiter', 'Venus'].includes(h.lord)).map(h => ({lord: h.lord, a: h.start.slice(11, 16), b: h.end.slice(11, 16)}));
    const tl = `<div class="xtl">${seg(T['Abhijit'], 'g2')}${good.map(h => seg([h.a, h.b], 'g1')).join('')}${seg(T['Rahu Kalam'], 'r1')}${seg(T['Yama Gandam'], 'r2')}${seg(T['Gulika Kalam'], 'r2')}</div><div class="xtlab"><span>${esc(row.sunrise)}</span><span>${esc(row.sunset)}</span></div>`;
    const dline = dasa && dasa.length > 1 ? `${dasa[0].lord} dasa, ${dasa[1].lord} antardasa (until ${dasa[1].end})` : '';
    const alerts = lsGet('jt_alerts', {rules: []});
    const hasBrief = alerts.rules.some(r => r.t === 'brief' && r.on !== false);
    el.innerHTML = `<div class="xcal">${nav}<p class="note">${esc(fmtDayY(BR.date))} &middot; ${esc(pl.label || '')}${p && p.name ? ' &middot; for ' + esc(p.name) : ''}</p>
      <div class="xhero${q ? ' q-' + q.level : ''}">${q ? `<div class="xring" style="--p:${q.score * 10}"><div><b>${Math.round(q.score)}</b><span>of 10</span></div></div>` : '<div class="xring plain"><div><b>&#9788;</b></div></div>'}<div><div class="xh1">${lbl}</div><div class="xh2">${esc(row.tithi_name)}, ${esc(row.nak_name)}. ${T['Rahu Kalam'] ? 'Take care ' + esc(T['Rahu Kalam'][0]) + ' to ' + esc(T['Rahu Kalam'][1]) + '.' : ''}</div></div></div>
      <div class="xcard2">${q ? `<div class="xl"><div><b>Tarabala</b><small>Star ${((row.nak - p.nak + 27) % 27) + 1} from your birth star</small></div><span class="xtag ${q.tg ? 'ok' : 'no'}">${esc(q.tara)}</span></div><div class="xl"><div><b>Chandrabala</b><small>Moon in the ${ord(q.ch)} from your natal Moon</small></div><span class="xtag ${q.cg ? 'ok' : 'no'}">${q.cg ? 'Good' : 'Weak'}</span></div>` : '<p class="note">Add your birth star in Muhurta finder, or calculate a chart, for personal Tarabala and Chandrabala.</p>'}
        ${dline ? `<div class="xl"><div><b>Running period</b><small>${esc(dline)}</small></div></div>` : ''}</div>
      <div class="xcard2"><h5>Best and worst windows</h5>${tl}
        <div class="xevs">${T['Abhijit'] ? `<span class="xev e-ok">Abhijit ${esc(T['Abhijit'].join(' to '))}</span>` : ''}${good.map(h => `<span class="xev e-ok">${h.lord} hora ${h.a} to ${h.b}</span>`).join('')}${T['Rahu Kalam'] ? `<span class="xev e-bad">Rahu Kala ${esc(T['Rahu Kalam'].join(' to '))}</span>` : ''}${T['Yama Gandam'] ? `<span class="xev e-bad">Yama Gandam ${esc(T['Yama Gandam'].join(' to '))}</span>` : ''}${T['Gulika Kalam'] ? `<span class="xev e-bad">Gulika ${esc(T['Gulika Kalam'].join(' to '))}</span>` : ''}</div></div>
      <div class="xcard2"><h5>Today's notes</h5>${notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>
      ${row.events.length ? `<div class="xevs">${row.events.map(evChip).join('')}</div>` : ''}
      <div class="xbtns"><button type="button" class="sec" id="bMuh">Open Muhurta finder</button><button type="button" id="bAlert">${hasBrief ? 'Edit daily alert' : 'Send me this every morning'}</button></div>
      <p class="note">${esc(DISC)}</p></div>`;
    bind();
    $('#bMuh').onclick = () => { const b = document.querySelector('#pnSub button[data-s="muhurta"]'); if (b) b.click(); };
    $('#bAlert').onclick = () => { if (!hasBrief) { AL.draft = {t: 'brief', time: '07:00'}; } const b = document.querySelector('#pnSub button[data-s="alerts"]'); if (b) b.click(); };
    function bind() {
      $('#bPrev').onclick = () => { BR.date = addDays(BR.date, -1); briefPaint('Reading the sky...'); briefLoad(); };
      $('#bNext').onclick = () => { BR.date = addDays(BR.date, 1); briefPaint('Reading the sky...'); briefLoad(); };
      $('#bToday').onclick = () => { BR.date = today(place().tz); briefPaint('Reading the sky...'); briefLoad(); };
    }
  }

  /* ------------------------------------------------------------ alerts */
  const AL = {el: null, draft: null, plan: null, busy: false, msg: ''};
  const store = () => { const s = lsGet('jt_alerts', null) || {}; s.rules = s.rules || []; s.quiet = s.quiet || {on: false, from: '22:00', to: '06:00'}; return s; };
  const saveStore = s => lsSet('jt_alerts', s);
  const EVK = [['ekadashi', 'Ekadashi'], ['pradosham', 'Pradosham'], ['sankashti', 'Sankashti Chaturthi'], ['vinayaka', 'Vinayaka Chaturthi'], ['masashivaratri', 'Masa Shivaratri'], ['purnima', 'Purnima'], ['amavasya', 'Amavasya'], ['sankranti', 'Sankranti'], ['fest', 'All festivals'], ['hol', 'Public holidays']];
  const TYPES = [['brief', 'Daily brief', 'One message each morning with the day in short.'], ['tithi', 'Tithi', 'Any tithi you choose, for example Krishna Dashami or Purnima.'], ['event', 'Festivals and vratas', 'Ekadashi, Pradosham, Sankashti, festivals and more.'], ['hora', 'Hora begins', 'When the hora of a planet you choose starts.'], ['transit', 'Planet transits', 'A planet changes sign, turns retrograde or turns direct.'], ['nak', 'Moon enters a nakshatra', 'When the Moon enters stars you choose.'], ['rahu', 'Rahu Kala', 'Shortly before Rahu Kala starts.'], ['personal', 'Personal day quality', 'Favourable days, Chandrashtama or weak days from your birth star.'], ['dasha', 'Dasha change', 'Before a new dasa or antardasa starts, from the chart on screen.'], ['followup', 'Client follow-ups', 'Reminders for the follow-ups you set in Clients.']];
  const typeName = t => (TYPES.find(x => x[0] === t) || [0, t])[1];
  const PRESETS = [
    ['Ekadashi, evening before', {t: 'event', keys: ['ekadashi'], offset: -1, time: '18:00'}], ['Pradosham, evening before', {t: 'event', keys: ['pradosham'], offset: -1, time: '17:00'}],
    ['Sankashti, same day', {t: 'event', keys: ['sankashti'], offset: 0, time: '16:00'}], ['Purnima and Amavasya', {t: 'event', keys: ['purnima', 'amavasya'], offset: -1, time: '18:00'}],
    ['Chandrashtama, evening before', {t: 'personal', what: 'chandrashtama', offset: -1, time: '18:00'}], ['Rahu Kala, 15 min before', {t: 'rahu', lead: 15}]];
  function describe(r) {
    const t = r.t;
    const tt = (x, off) => `${off < 0 ? 'evening before' : 'same day'} at ${x}`;
    if (t === 'brief') return `Every morning at ${r.time}`;
    if (t === 'tithi') return `${(r.tithis || []).map(n => (n <= 15 ? 'Shukla ' : 'Krishna ') + (n === 15 ? 'Purnima' : n === 30 ? 'Amavasya' : TITH[(n - 1) % 15])).join(', ') || 'no tithi chosen'}, ${tt(r.time, r.offset)}`;
    if (t === 'event') return `${(r.keys || []).map(k => (EVK.find(x => x[0] === k) || [0, k])[1]).join(', ') || 'nothing chosen'}, ${tt(r.time, r.offset)}`;
    if (t === 'hora') return `${(r.planets || []).join(', ') || 'no planet'} hora${r.lead ? ', ' + r.lead + ' min before' : ''}, ${r.from} to ${r.to}`;
    if (t === 'transit') return `${(r.planets || []).join(', ') || 'no planet'}: ${(r.what || []).map(w => ({sign: 'sign change', retrograde: 'turns retrograde', direct: 'turns direct'}[w])).join(', ')}${r.lead ? ', ' + r.lead + ' min before' : ''}`;
    if (t === 'nak') return `Moon in ${(r.naks || []).map(i => NAKN[i]).join(', ') || 'no star'}${r.lead ? ', ' + r.lead + ' min before' : ''}`;
    if (t === 'rahu') return `${r.lead || 15} min before Rahu Kala`;
    if (t === 'personal') return `${{goodday: 'Favourable day', chandrashtama: 'Chandrashtama', weakday: 'Weak day'}[r.what || 'goodday']}, ${tt(r.time, r.offset)}`;
    if (t === 'dasha') return `${r.lead || 7} days before a dasa or antardasa changes, at ${r.time}`;
    if (t === 'followup') return `Client follow-ups at ${r.time}`;
    return '';
  }
  const chips = (arr, sel, attr) => arr.map(([v, n]) => `<button type="button" class="xchip${sel.includes(v) ? ' on' : ''}" data-${attr}="${v}">${esc(n)}</button>`).join('');
  const selOpts = (opts, cur) => opts.map(([v, n]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${n}</option>`).join('');
  const LEADS = [[0, 'At the time'], [5, '5 min before'], [10, '10 min before'], [15, '15 min before'], [30, '30 min before'], [60, '1 hour before']];
  const OFFS = [[-1, 'Evening before'], [0, 'Same day']];

  function builderHTML(d) {
    const t = d.t;
    let f = '';
    if (t === 'brief') f = `<label>Time<input type="time" id="dTime" value="${d.time || '07:00'}"></label>`;
    if (t === 'tithi') f = `<h5>Shukla</h5><div class="xfilt">${chips(Array.from({length: 15}, (_, i) => [i + 1, i === 14 ? 'Purnima' : TITH[i]]), d.tithis || [], 'ti')}</div><h5>Krishna</h5><div class="xfilt">${chips(Array.from({length: 15}, (_, i) => [i + 16, i === 14 ? 'Amavasya' : TITH[i]]), d.tithis || [], 'ti')}</div><div class="row"><label>When<select id="dOff">${selOpts(OFFS, d.offset ?? -1)}</select></label><label>Time<input type="time" id="dTime" value="${d.time || '18:00'}"></label></div>`;
    if (t === 'event') f = `<div class="xfilt">${chips(EVK, d.keys || [], 'ek')}</div><div class="row"><label>When<select id="dOff">${selOpts(OFFS, d.offset ?? -1)}</select></label><label>Time<input type="time" id="dTime" value="${d.time || '18:00'}"></label></div>`;
    if (t === 'hora') f = `<div class="xfilt">${chips(PL7.map(p => [p, p]), d.planets || [], 'pl')}</div><div class="row"><label>Only between<input type="time" id="dFrom" value="${d.from || '06:00'}"></label><label>and<input type="time" id="dTo" value="${d.to || '20:00'}"></label><label>Alert<select id="dLead">${selOpts(LEADS, d.lead ?? 0)}</select></label></div>`;
    if (t === 'transit') f = `<div class="xfilt">${chips(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map(p => [p, p]), d.planets || [], 'pl')}</div><div class="xfilt">${chips([['sign', 'Changes sign'], ['retrograde', 'Turns retrograde'], ['direct', 'Turns direct']], d.what || ['sign'], 'wh')}</div><div class="row"><label>Alert<select id="dLead">${selOpts(LEADS.concat([[360, '6 hours before'], [1440, '1 day before']]), d.lead ?? 0)}</select></label></div>`;
    if (t === 'nak') f = `<div class="xfilt">${chips(NAKN.map((n, i) => [i, n]), d.naks || [], 'nk')}</div><div class="row"><label>Alert<select id="dLead">${selOpts(LEADS, d.lead ?? 0)}</select></label></div>`;
    if (t === 'rahu') f = `<div class="row"><label>Alert<select id="dLead">${selOpts(LEADS.slice(1), d.lead ?? 15)}</select></label></div>`;
    if (t === 'personal') f = `<div class="xfilt">${chips([['goodday', 'Favourable day (Tarabala and Chandrabala good)'], ['chandrashtama', 'Chandrashtama'], ['weakday', 'Weak day']], [d.what || 'goodday'], 'pw')}</div><div class="row"><label>When<select id="dOff">${selOpts(OFFS, d.offset ?? -1)}</select></label><label>Time<input type="time" id="dTime" value="${d.time || '18:00'}"></label></div>${person() ? '' : '<p class="note bad">Needs your birth star: set it under Muhurta finder or calculate a chart.</p>'}`;
    if (t === 'dasha') f = `<div class="row"><label>Alert<select id="dDays">${selOpts([[1, '1 day before'], [3, '3 days before'], [7, '7 days before'], [14, '14 days before']], d.lead ?? 7)}</select></label><label>Time<input type="time" id="dTime" value="${d.time || '08:00'}"></label></div>${S.chart ? '' : '<p class="note bad">Calculate a chart first; the dasas come from the chart on screen.</p>'}`;
    if (t === 'followup') f = `<label>Time<input type="time" id="dTime" value="${d.time || '08:00'}"></label>`;
    return `<div class="xbuild"><h4>${esc(typeName(t))}</h4><p class="note">${esc((TYPES.find(x => x[0] === t) || [0, 0, ''])[2])}</p>${f}<div class="xbtns"><button type="button" id="dSave">Add alert</button><button type="button" class="sec" id="dCancel">Cancel</button></div></div>`;
  }
  function readDraft() {
    const d = AL.draft;
    const v = id => { const e = $('#' + id, AL.el); return e ? e.value : undefined; };
    ['dTime', 'dFrom', 'dTo', 'dOff', 'dLead'].forEach(id => { const x = v(id); if (x !== undefined) { const k = {dTime: 'time', dFrom: 'from', dTo: 'to', dOff: 'offset', dLead: 'lead'}[id]; d[k] = ['offset', 'lead'].includes(k) ? +x : x; } });
    if (v('dDays') !== undefined) d.lead = +v('dDays');
  }
  function alPaint() {
    const el = AL.el; if (!el) return;
    const s = store(), nat = !!nativeLN();
    const rows = s.rules.map((r, i) => `<div class="xl"><div><b>${esc(typeName(r.t))}</b><small>${esc(describe(r))}</small></div><label class="xsw"><input type="checkbox" data-on="${i}"${r.on !== false ? ' checked' : ''}><i></i></label><button type="button" class="sec xdel" data-del="${i}" aria-label="Delete alert">&#10005;</button></div>`).join('');
    const nextUp = AL.plan ? AL.plan.slice(0, 8).map(x => `<div class="xl"><div><b>${esc(x.title)}</b><small>${esc(fmtDay(x.at.slice(0, 10)))} ${esc(x.at.slice(11, 16))} &middot; ${esc(x.body)}</small></div></div>`).join('') : '';
    el.innerHTML = `<div class="xcal"><div class="xhead"><h3>Alerts</h3></div>
      <p class="note">Nothing is on until you add it. Alerts are worked out on this device and scheduled for the next 14 days; they refresh each time you open the app.</p>
      ${s.rules.length ? `<div class="xcard2">${rows}</div>` : '<div class="xcard2"><p class="note">No alerts yet.</p></div>'}
      ${AL.draft ? builderHTML(AL.draft) : `<h5>Quick add</h5><div class="xfilt">${PRESETS.map((p, i) => `<button type="button" class="xchip" data-pre="${i}">${esc(p[0])}</button>`).join('')}</div><h5>Add your own</h5><div class="xfilt">${TYPES.map(t => `<button type="button" class="xchip" data-type="${t[0]}">${esc(t[1])}</button>`).join('')}</div>`}
      <div class="xcard2"><label class="chk"><input type="checkbox" id="qOn"${s.quiet.on ? ' checked' : ''}> Quiet hours</label><div class="row"><label>From<input type="time" id="qFrom" value="${s.quiet.from}"></label><label>To<input type="time" id="qTo" value="${s.quiet.to}"></label></div><p class="note">Alerts that fall inside quiet hours move to the end of them.</p></div>
      <div class="xcard2"><h5>Delivery</h5><p class="note">${nat ? 'This app can schedule notifications on your phone, so they arrive even when the app is closed.' : 'A browser can only notify while the app is open. For alerts that arrive when it is closed, use the phone app, or export your alerts to your calendar app, which fires them for you.'}</p>
        <div class="xbtns"><button type="button" id="aRefresh">Update schedule now</button><button type="button" class="sec" id="aIcs">Export alerts to calendar</button></div><p class="note" id="aMsg">${esc(AL.msg)}</p>${nextUp ? `<h5>Next alerts</h5><div class="xcard2">${nextUp}</div>` : ''}</div>
      <p class="note">${esc(DISC)}</p></div>`;
    $$('[data-on]', el).forEach(b => b.onchange = () => { const s2 = store(); s2.rules[+b.dataset.on].on = b.checked; saveStore(s2); alRefresh(false); });
    $$('[data-del]', el).forEach(b => b.onclick = () => { const s2 = store(); s2.rules.splice(+b.dataset.del, 1); saveStore(s2); alPaint(); alRefresh(false); });
    $$('[data-pre]', el).forEach(b => b.onclick = () => { const s2 = store(); s2.rules.push({id: 'r' + Date.now(), on: true, ...JSON.parse(JSON.stringify(PRESETS[+b.dataset.pre][1]))}); saveStore(s2); alPaint(); alRefresh(false); });
    $$('[data-type]', el).forEach(b => b.onclick = () => { AL.draft = {t: b.dataset.type}; if (b.dataset.type === 'transit') AL.draft.what = ['sign']; if (b.dataset.type === 'personal') AL.draft.what = 'goodday'; alPaint(); });
    $('#qOn').onchange = $('#qFrom').onchange = $('#qTo').onchange = () => { const s2 = store(); s2.quiet = {on: $('#qOn').checked, from: $('#qFrom').value, to: $('#qTo').value}; saveStore(s2); alRefresh(false); };
    $('#aRefresh').onclick = () => alRefresh(true);
    $('#aIcs').onclick = guard(async () => {
      const items = AL.plan || await buildPlan();
      if (!items.length) { AL.msg = 'No alerts to export yet.'; alPaint(); return; }
      const tz = place().tz;
      const ev = items.map((x, i) => { const dt = zonedToDate(x.at, tz).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; return ['BEGIN:VEVENT', `UID:jt-alert-${x.at}-${i}@jyotishatejas.app`, 'DTSTAMP:20260101T000000Z', 'DTSTART:' + dt, 'DTEND:' + dt, 'SUMMARY:' + icsEsc(x.title), 'DESCRIPTION:' + icsEsc(x.body), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(x.title), 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT']; });
      await saveFile('jyotisha-tejas-alerts.ics', 'text/calendar', icsWrap(ev, 'Jyotisha Tejas alerts'));
      AL.msg = `${items.length} alerts exported. Add them to a new calendar so you can remove them later.`; alPaint();
    });
    if (AL.draft) {
      const d = AL.draft;
      const toggle = (attr, key, multi, num) => $$(`[data-${attr}]`, el).forEach(b => b.onclick = () => { readDraft(); const v = num ? +b.dataset[attr] : b.dataset[attr]; const a = d[key] || (d[key] = []); if (multi) { const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); } else d[key] = v; alPaint(); });
      toggle('ti', 'tithis', true, true); toggle('ek', 'keys', true); toggle('pl', 'planets', true); toggle('wh', 'what', true); toggle('nk', 'naks', true, true);
      $$('[data-pw]', el).forEach(b => b.onclick = () => { readDraft(); d.what = b.dataset.pw; alPaint(); });
      $('#dCancel').onclick = () => { AL.draft = null; alPaint(); };
      $('#dSave').onclick = () => {
        readDraft();
        const need = {tithi: d.tithis, event: d.keys, hora: d.planets, transit: d.planets, nak: d.naks};
        if (d.t in need && !(need[d.t] && need[d.t].length)) { AL.msg = 'Pick at least one item first.'; $('#aMsg').textContent = AL.msg; return; }
        if (d.t === 'transit' && !(d.what && d.what.length)) { $('#aMsg').textContent = 'Pick what to be told about.'; return; }
        const s2 = store(); s2.rules.push({id: 'r' + Date.now(), on: true, ...d}); saveStore(s2); AL.draft = null; AL.msg = ''; alPaint(); alRefresh(false);
      };
    }
  }
  const nativeLN = () => { try { return window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications; } catch (e) { return null; } };
  const PYRULES = ['brief', 'tithi', 'event', 'hora', 'transit', 'nak', 'rahu', 'personal'];
  async function buildPlan() {
    const s = store(), pl = place(), from = today(pl.tz), now = nowIn(pl.tz);
    const on = s.rules.filter(r => r.on !== false);
    let items = [];
    const py = on.filter(r => PYRULES.includes(r.t));
    if (py.length) {
      const r = await api('/api/alerts/plan', {rules: py, from, days: 14, lat: pl.lat, lon: pl.lon, tz: pl.tz, cfg: getCfg(), person: person() ? {nak: person().nak, rasi: person().rasi} : null});
      if (r.error) throw new Error(r.error);
      items = r.items;
    }
    for (const r of on.filter(x => x.t === 'dasha')) {
      if (!S.chart) continue;
      try {
        const d = await api('/api/dasa', payload({depth: 2, when: now, tz: TZ}));
        const lim = addDays(from, 14 + (r.lead || 7));
        const walk = (arr, lvl) => arr.forEach(x => { if (x.start > from && x.start <= lim) { const at = addDays(x.start, -(r.lead || 7)); if (at >= from) items.push({id: r.id, at: `${at}T${r.time || '08:00'}`, title: `${x.lord} ${lvl} begins on ${fmtDay(x.start)}`, body: `${x.start} to ${x.end}`}); } if (x.sub) walk(x.sub, 'antardasa'); });
        walk(d.periods, 'dasa');
      } catch (e) { /* skip */ }
    }
    for (const r of on.filter(x => x.t === 'followup')) {
      const list = await api('/api/profiles');
      list.forEach(c => (c.follow || []).forEach(f => { if (f.on === false) return; const at = addDays(f.date, -(f.remind || 0)); if (at >= from && at <= addDays(from, 14)) items.push({id: r.id, at: `${at}T${r.time || '08:00'}`, title: `Follow-up: ${c.name || 'client'}`, body: `${f.text || ''} (${fmtDay(f.date)})`}); }));
    }
    // quiet hours, future only
    const q = s.quiet;
    items = items.map(x => { if (q.on) { const t = x.at.slice(11, 16), a = q.from, b = q.to; const inside = a > b ? (t >= a || t < b) : (t >= a && t < b); if (inside) { let d = x.at.slice(0, 10); if (a > b && t >= a) d = addDays(d, 1); return {...x, at: `${d}T${b}`, body: x.body}; } } return x; });
    items = items.filter(x => x.at >= now).sort((a, b) => a.at < b.at ? -1 : 1);
    return items;
  }
  let timers = [];
  async function deliver(items) {
    const pl = place(), LN = nativeLN();
    timers.forEach(clearTimeout); timers = [];
    if (LN) {
      try {
        const perm = await LN.requestPermissions();
        if (perm.display !== 'granted') return 'Notifications are switched off for this app. Allow them in the phone settings.';
        const pend = await LN.getPending();
        if (pend.notifications && pend.notifications.length) await LN.cancel({notifications: pend.notifications.map(n => ({id: n.id}))});
        const list = items.slice(0, 60).map((x, i) => ({id: 1000 + i, title: x.title, body: x.body, schedule: {at: zonedToDate(x.at, pl.tz)}}));
        if (list.length) await LN.schedule({notifications: list});
        return `${list.length} alerts scheduled on this phone.`;
      } catch (e) { return 'Could not schedule: ' + (e.message || e); }
    }
    let n = 0;
    if ('Notification' in window && Notification.permission === 'default' && items.length) { try { await Notification.requestPermission(); } catch (e) { /* ignore */ } }
    items.forEach(x => {
      const ms = zonedToDate(x.at, pl.tz).getTime() - Date.now();
      if (ms > 0 && ms < 24 * 3600 * 1000) { n++; timers.push(setTimeout(() => { toast(x.title + ': ' + x.body); try { if ('Notification' in window && Notification.permission === 'granted') new Notification(x.title, {body: x.body, icon: 'icon-192.png'}); } catch (e) { /* ignore */ } }, ms)); }
    });
    return items.length ? `${items.length} alerts planned. ${n} will show while this page stays open in the next 24 hours. Use the calendar export for alerts that arrive when the app is closed.` : 'No alerts are due in the next 14 days.';
  }
  function toast(msg) {
    let t = document.getElementById('xToast'); if (!t) { t = document.createElement('div'); t.id = 'xToast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 9000);
  }
  async function alRefresh(force) {
    if (AL.busy) return; AL.busy = true;
    try {
      const s = store();
      if (!s.rules.some(r => r.on !== false)) { AL.plan = []; AL.msg = 'No active alerts.'; timers.forEach(clearTimeout); const LN = nativeLN(); if (LN) { try { const p = await LN.getPending(); if (p.notifications.length) await LN.cancel({notifications: p.notifications.map(n => ({id: n.id}))}); } catch (e) { /* ignore */ } } }
      else { AL.msg = 'Working out your alerts...'; if (AL.el) { const m = $('#aMsg', AL.el); if (m) m.textContent = AL.msg; } AL.plan = await buildPlan(); AL.msg = await deliver(AL.plan); }
    } catch (e) { AL.msg = e.message || String(e); }
    AL.busy = false;
    if (AL.el && AL.el.isConnected && !AL.el.hidden) alPaint();
  }
  function alMount(el) { AL.el = el; alPaint(); if (!AL.plan) alRefresh(false); }
  /* refresh the schedule when the app starts (after the engine is ready), at most every 3 hours */
  function startup() {
    const s = store();
    if (!s.rules.some(r => r.on !== false)) return;
    if (Date.now() - (s.last || 0) < 3 * 3600 * 1000) return;
    s.last = Date.now(); saveStore(s);
    setTimeout(() => alRefresh(false), 4000);
  }

  /* ------------------------------------------------------------ home card */
  const HC = {key: '', rows: null, busy: false};
  async function home(host, ctx) {
    if (!host) return;
    HC.ctx = ctx;
    const open = ctx.open !== false;
    const head = `<div class="ch"><h2>Calendar <span class="hint">coming up</span></h2><div class="btns"><button class="xp x-open" type="button">Open</button><button class="xp ic mu-tg x-tg" type="button" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'}" title="${open ? 'Hide' : 'Show'}"><i>${open ? '▴' : '▾'}</i></button></div></div>`;
    const paint = body => { host.innerHTML = head + (open ? body : ''); host._ctx = ctx; };
    if (!open) { paint(''); return; }
    const key = ctx.date + '|' + ctx.place.lat + '|' + ctx.place.lon;
    if (HC.rows && HC.key === key) { paint(homeBody(HC.rows, ctx)); return; }
    paint('<p class="mu-note">Looking at the days ahead...</p>');
    if (HC.busy === key) return;
    HC.busy = key;
    try {
      const p = parse(ctx.date), nm = p.m === 12 ? [p.y + 1, 1] : [p.y, p.m + 1];
      const get = async (y, m) => (await api('/api/calendar/month', {year: y, month: m, lat: ctx.place.lat, lon: ctx.place.lon, tz: ctx.place.tz, cfg: getCfg()})).days;
      const rows = (await get(p.y, p.m)).concat(await get(nm[0], nm[1]));
      HC.rows = rows; HC.key = key;
    } catch (e) { HC.busy = ''; paint('<p class="mu-note">Could not read the calendar.</p>'); return; }
    HC.busy = '';
    const h = document.getElementById('hmCal'); if (h && HC.ctx) home(h, HC.ctx);
  }
  function homeBody(rows, ctx) {
    const list = [];
    for (const r of rows) { if (r.date < ctx.date) continue; for (const e of r.events) list.push({date: r.date, e}); if (list.length >= 14) break; }
    const todayRow = rows.find(r => r.date === ctx.date);
    const pick = list.filter(x => x.e.cat !== 'moon').slice(0, 6);
    const dd = d => { const n = utcDay(d) - utcDay(ctx.date); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; };
    return `${todayRow ? `<p class="xhm">${esc(masaOf(todayRow, lsGet('jt_cal_pm', false)))} ${esc(todayRow.paksha)} paksha &middot; ${esc(todayRow.tithi_name)}</p>` : ''}
      <div class="xhl">${pick.map(x => `<div><span>${esc(fmtDay(x.date))}</span><b>${esc(x.e.name)}</b><em>${dd(x.date)}</em></div>`).join('') || '<div><b>No festival or vrata in the next few weeks.</b></div>'}</div>
      <div class="xhb"><button class="xp x-open" type="button">Month view</button><button class="xp x-brief" type="button">My day</button><button class="xp x-alerts" type="button">Alerts</button></div>`;
  }
  /* open Panchanga > sub inside the app. From the Home calendar, a birth star picked from a saved profile opens that profile first. */
  async function gotoSub(sub, then) {
    try {
      const me = lsGet('jt_muh_me', null);
      if (CAL.home && me && /^p\d+$/.test(me.src || '')) {
        const id = +me.src.slice(1);
        let list = window._profiles; if (!list || !list.find(x => x.id === id)) list = await api('/api/profiles');
        const pr = (list || []).find(x => x.id === id);
        if (pr && (S.profileId !== id || !S.chart)) { S.profileId = id; profileToForm(pr); await refreshProfiles(id); await calc(); }
      }
    } catch (e) { /* open the app anyway */ }
    location.hash = '#app';
    setTimeout(() => {
      showTab('panchanga');
      const b = document.querySelector(`#pnSub button[data-s="${sub}"]`); if (b) b.click();
      if (then) setTimeout(then, 50);
    }, 80);
  }
  document.addEventListener('muh-person', () => { if (CAL.home && CAL.el && CAL.el.isConnected) calPaint(); });
  function go(sub) {
    location.hash = '#app';
    setTimeout(() => { showTab('panchanga'); const b = document.querySelector(`#pnSub button[data-s="${sub}"]`); if (b) b.click(); }, 60);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest ? e.target.closest('#hmCal .x-open, #hmCal .x-tg, #hmCal .x-brief, #hmCal .x-alerts') : null;
    if (!t) return;
    const host = document.getElementById('hmCal');
    if (t.classList.contains('x-tg')) { if (host && host._ctx && host._ctx.toggle) host._ctx.toggle(); }
    else go(t.classList.contains('x-brief') ? 'brief' : t.classList.contains('x-alerts') ? 'alerts' : 'calendar');
  });

  /* ------------------------------------------------------------ calendar as the Home view */
  const STATES = ['Karnataka','Maharashtra','Gujarat','Telangana','Andhra Pradesh','Kerala','Tamil Nadu','Odisha','West Bengal','Punjab','Haryana','Madhya Pradesh','Chhattisgarh','Rajasthan','Uttar Pradesh','Bihar','Jharkhand','Uttarakhand','Himachal Pradesh','Assam','Goa','Delhi'];
  const homeMode = () => lsGet('jt_home_view', 'panchang') === 'calendar' ? 'calendar' : 'panchang';
  function homeViewDialog() {
    if (document.getElementById('xHV')) return;
    const w = document.createElement('div'); w.className = 'xmodal'; w.id = 'xHV';
    const tg = (k, n, sub, on) => `<label class="xl"><div><b>${n}</b>${sub ? `<small>${sub}</small>` : ''}</div><span class="xsw"><input type="checkbox" data-k="${k}"${on ? ' checked' : ''}><i></i></span></label>`;
    const paint = () => {
      w.innerHTML = `<div class="xbox" role="dialog" aria-label="Home view"><h3>Home view</h3>
        <h5>Home page</h5><div class="xseg"><button type="button" data-m="panchang" class="${homeMode() === 'panchang' ? 'on' : ''}">Live</button><button type="button" data-m="calendar" class="${homeMode() === 'calendar' ? 'on' : ''}">Calendar</button></div>
        <p class="note">Live shows the clock, lagna, hora and today's panchang. Remembered on this device. Live is the default.</p>
        <h5>Calendar system</h5><select id="xSysD" class="xsel" style="width:100%">${sysOpts()}</select><p class="note" id="xSysTip">${esc(sysOf().tip)}</p>
        <h5>State holidays</h5><select id="xStD" class="xsel" style="width:100%"><option value=""${CAL.state === '' ? ' selected' : ''}>National holidays only</option><option value="all"${CAL.state === 'all' ? ' selected' : ''}>All states</option>${STATES.map(n => `<option${CAL.state === n ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <h5>Hijri dates</h5><select id="xHD" class="xsel" style="width:100%">${[-1, 0, 1].map(v => `<option value="${v}"${v === CAL.hadj ? ' selected' : ''}>${v === 0 ? 'Calculated (India sighting)' : v > 0 ? 'A day later (+1)' : 'A day earlier (-1)'}</option>`).join('')}</select>
        <p class="note">Eid, Muharram and other Islamic dates follow the moon sighting, so they can differ by a day. Adjust here. Every festival, vrata, moon day and holiday is listed for the selected date.</p>
        <h5>On the month grid</h5>${tg('q', 'Day quality bar', 'Green, amber, red for your chart', CAL.q)}
        <h5>Under the grid</h5>${tg('d:pg', 'Tithi, nakshatra, yoga, karana', '', CAL.det.pg)}${tg('d:tm', 'Timings', 'Abhijit, Rahu Kala, Yama Gandam, Gulika', CAL.det.tm)}${tg('d:you', 'Tarabala and Chandrabala', 'Needs a saved profile or a chart', CAL.det.you)}${tg('d:up', 'Coming up list', '', CAL.det.up)}${tg('d:btn', 'Action buttons', 'Full panchanga, My day, Add to calendar', CAL.det.btn)}
        <div class="xbtns"><button type="button" id="xHVok">Done</button></div></div>`;
      w.querySelector('#xSysD').onchange = e => { setSys(e.target.value); w.querySelector('#xSysTip').textContent = sysOf().tip; };
      w.querySelector('#xStD').onchange = e => setState(e.target.value);
      w.querySelector('#xHD').onchange = e => setHadj(e.target.value);
      $$('.xseg button', w).forEach(b => b.onclick = () => { lsSet('jt_home_view', b.dataset.m); document.dispatchEvent(new Event('jt-homeview')); paint(); });
      $$('input[data-k]', w).forEach(i => i.onchange = () => {
        const [a, k] = i.dataset.k.includes(':') ? i.dataset.k.split(':') : [i.dataset.k, ''];
        if (a === 'f') { CAL.filt[k] = i.checked ? 1 : 0; lsSet('jt_cal_filt', CAL.filt); } else if (a === 'q') { CAL.q = i.checked; lsSet('jt_cal_q', CAL.q); } else { CAL.det[k] = i.checked ? 1 : 0; lsSet('jt_cal_det', CAL.det); }
        if (CAL.el && CAL.el.isConnected) calPaint();
      });
      w.querySelector('#xHVok').onclick = () => w.remove();
    };
    paint(); document.body.appendChild(w);
  }
  function calHome(host, getPlace) { calMount(host, {place: getPlace}); }
  function calRefresh() { if (CAL.home && CAL.el && CAL.el.isConnected) { CAL.rows = null; const t = parse(today(place().tz)); CAL.y = t.y; CAL.m = t.m; CAL.sel = today(place().tz); calPaint(); calLoad(); } }

  /* ------------------------------------------------------------ disclaimer */
  function disclaimerDialog(first) {
    if (document.getElementById('xDisc')) return;
    const w = document.createElement('div'); w.className = 'xmodal'; w.id = 'xDisc';
    w.innerHTML = `<div class="xbox" role="dialog" aria-label="About the predictions"><h3>About the predictions</h3><p>${esc(DISC)}</p><p class="note">Astrology is a traditional belief system, not a science. Calendar dates and times are calculated for your chosen place and may differ from your local panchangam or temple calendar by a day for some festivals.</p><div class="xbtns"><button type="button" id="xDiscOk">${first ? 'I understand' : 'Close'}</button></div></div>`;
    document.body.appendChild(w);
    $('#xDiscOk').onclick = () => { if (first) lsSet('jt_disc_ok', 1); w.remove(); };
  }
  function discInit() {
    if (!lsGet('jt_disc_ok', 0)) setTimeout(() => disclaimerDialog(true), 1200);
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.x-disc')) { e.preventDefault(); disclaimerDialog(false); } });
  }
  discInit();

  return {calHome, calRefresh, homeMode, homeViewDialog, calMount, briefMount, alMount, home, startup, go, exportDialog, saveFile, icsWrap, allDayEvent, place, person, today, fmtDay, fmtDayY, addDays, DISC, NAKN, lsGet, lsSet, toast, disclaimerDialog};
})();
