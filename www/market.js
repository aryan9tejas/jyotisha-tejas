'use strict';
/* Jyotisha Tejas Market view: transit-based benefic/malefic reading for financial markets.
   Used in the Panchanga tab (Market view) and as a collapsed card on the first page.
   Needs app.js globals: api, esc, $, $$, guard, getCfg, defaultPlace, showTab. */
const Mkt = (() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const NSE = {lat: 19.0728, lon: 72.8826, tz: 'Asia/Kolkata'}, NYSE = {lat: 40.7069, lon: -74.0113, tz: 'America/New_York'}, TPE = {lat: 25.033, lon: 121.5654, tz: 'Asia/Taipei'};
  /* Conventional reference charts. Times are approximate where marked: edit them under Settings. */
  const DEFAULTS = [
    {id: 'global', name: 'Global (transits only)', note: 'No market chart: the planets as they stand, the same for every market.'},
    {id: 'nse', name: 'India - Nifty / NSE', note: 'NSE capital market started 3 Nov 1994. The time is approximate.', chart: {date: '1994-11-03', time: '10:00:00', lat: 19.0728, lon: 72.8826, tz: 'Asia/Kolkata', place: 'Mumbai', time_known: false}, open: '09:15', loc: NSE},
    {id: 'india1947', name: 'India - Independence chart', note: '15 Aug 1947 at midnight, New Delhi. Widely used for India.', chart: {date: '1947-08-15', time: '00:00:00', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', place: 'New Delhi', time_known: true}, open: '09:15', loc: NSE},
    {id: 'spx', name: 'USA - S&P 500', note: 'S&P 500 introduced 4 Mar 1957. The time is approximate.', chart: {date: '1957-03-04', time: '09:30:00', lat: 40.7128, lon: -74.006, tz: 'America/New_York', place: 'New York', time_known: false}, open: '09:30', loc: NYSE},
    {id: 'nasdaq', name: 'USA - Nasdaq', note: 'Nasdaq first traded 8 Feb 1971. The time is approximate.', chart: {date: '1971-02-08', time: '09:30:00', lat: 40.7128, lon: -74.006, tz: 'America/New_York', place: 'New York', time_known: false}, open: '09:30', loc: NYSE},
    {id: 'us1776', name: 'USA - Declaration chart', note: '4 Jul 1776, 17:10 local mean time, Philadelphia (the commonly used Sibly chart). The time is disputed.', chart: {date: '1776-07-04', time: '17:10:00', lat: 39.9526, lon: -75.1652, tz: -5.011, place: 'Philadelphia', time_known: false}, open: '09:30', loc: NYSE},
    {id: 'twse', name: 'Taiwan - TAIEX / TWSE', note: 'Taiwan Stock Exchange first traded 9 Feb 1962. The time is approximate.', chart: {date: '1962-02-09', time: '09:00:00', lat: 25.033, lon: 121.5654, tz: 'Asia/Taipei', place: 'Taipei', time_known: false}, open: '09:00', loc: TPE},
  ];
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const S = {guide: null, weights: lsGet('jt_mkt_w', {}), norm: lsGet('jt_mkt_norm', null), charts: lsGet('jt_mkt_charts', {}), sel: lsGet('jt_mkt_sel', 'global'),
    view: null, home: {key: '', data: null, busy: '', err: ''}, ctx: null, sub: 'view'};

  const markets = () => DEFAULTS.map(m => { if (!m.chart) return m; const {open, ...rest} = S.charts[m.id] || {}; return {...m, chart: {...m.chart, ...rest}, open: open || m.open}; });
  const market = id => markets().find(m => m.id === id) || markets()[0];
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmtDate = s => `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
  const guide = async () => S.guide || (S.guide = await api('/api/market/guide', {}));
  const sgn = v => (v > 0 ? '+' : '') + v;

  function body(date, place) {
    const m = market(S.sel);
    return {date, lat: place.lat, lon: place.lon, tz: place.tz, cfg: getCfg(), weights: S.weights, norm: S.norm, market: m.chart ? {id: m.id, name: m.name, note: m.note, chart: m.chart, open: m.open, loc: m.loc} : null};
  }

  /* ---------------------------------------------------------------- pieces shared by the tab and the card */
  const toneCls = s => s >= 25 ? 'bu2' : s >= 8 ? 'bu1' : s > -8 ? 'mx' : s > -25 ? 'be1' : 'be2';
  function gauge(b) {
    const pos = (b.score + 100) / 2;
    return `<div class="mk-gauge"><div class="bar"><i class="mk-mark" style="left:${pos}%"></i></div><div class="sc"><span>Bearish</span><span>Mixed</span><span>Bullish</span></div></div>`;
  }
  const chips = (list, cls) => list.map(s => `<span class="mk-chip ${cls}${s.volatile ? ' vol' : ''}">${esc(s.sector)}${s.volatile ? ' <i title="Volatile: sudden, narrative-driven moves">&#8645;</i>' : ''}</span>`).join('') || '<small>none</small>';
  function driverLine(r) { return `<li class="${r.pts > 0 ? 'up' : 'dn'}"><b>${sgn(r.pts)}</b> ${esc(r.title)}<small>${esc(r.detail)}</small></li>`; }

  /* ---------------------------------------------------------------- the Market view (Panchanga tab)  */
  function rootHTML() {
    const opts = markets().map(m => `<option value="${m.id}"${m.id === S.sel ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
    return `<div class="mk"><div class="mu-nav sub"><button data-k="view" class="on">Reading</button><button data-k="settings">Settings</button><button data-k="how">How it works</button></div>
      <div id="mkView"><div class="row"><label>Market<select id="mkSel">${opts}</select></label><label>Date<input type="date" id="mkDate" value="${today()}"></label>
        <button class="run" id="mkGo">Show reading</button></div><p class="note" id="mkNote"></p><div id="mkOut"></div></div>
      <div id="mkSettings" hidden></div><div id="mkHow" hidden></div></div>`;
  }
  async function mount(el) {
    el.innerHTML = rootHTML();
    $$('#pnMkt .mu-nav button').forEach(b => b.onclick = () => sub(b.dataset.k));
    $('#mkSel').onchange = () => { S.sel = $('#mkSel').value; lsSet('jt_mkt_sel', S.sel); note(); };
    $('#mkGo').onclick = guard(run);
    note();
    await guide();
    run().catch(e => { $('#mkOut').innerHTML = `<p class="bad">${esc(e.message)}</p>`; });
  }
  function note() { const m = market(S.sel); const n = $('#mkNote'); if (n) n.textContent = m.note || ''; }
  function sub(k) {
    S.sub = k;
    $$('#pnMkt .mu-nav button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    $('#mkView').hidden = k !== 'view'; $('#mkSettings').hidden = k !== 'settings'; $('#mkHow').hidden = k !== 'how';
    if (k === 'settings') drawSettings();
    if (k === 'how') drawHow();
  }
  async function run() {
    const out = $('#mkOut'); out.innerHTML = '<p class="note">Reading the sky...</p>';
    const r = await api('/api/market/view', body($('#mkDate').value, defaultPlace()));
    if (r.error) throw new Error(r.error);
    S.view = r; drawView(r);
  }

  function drawView(r) {
    const b = r.bias, up = r.sectors.filter(s => s.tag === 'Favoured'), dn = r.sectors.filter(s => s.tag === 'Pressured').reverse(), vol = r.sectors.filter(s => s.volatile);
    const grouped = {};
    r.rules.forEach(x => (grouped[x.group] = grouped[x.group] || []).push(x));
    const planetRows = r.planets.map(p => `<tr><td><b>${p.name}</b></td><td>${esc(p.sign)} ${esc(p.deg)}${p.retro ? ' <i class="rx">R</i>' : ''}</td><td>${esc(p.nak)} ${p.pada}</td>
      <td><span class="pill nat-${p.nature}">${p.nature}</span></td><td>${[p.dignity, ...p.notes].filter((x, i, a) => x && a.indexOf(x) === i).map(esc).join(', ') || '-'}</td></tr>`).join('');
    const ruleHTML = Object.keys(grouped).map(g => `<h4 class="mu-sec">${esc(g)}</h4>` + grouped[g].map(x => `<details class="mu-f ${x.pts > 0 ? 'lv-good' : 'lv-bad'}"><summary><b>${sgn(x.pts)}</b> ${esc(x.title)}<small> ${esc(x.detail)}</small></summary>
      <p class="fw">${esc(x.why)}</p><p class="fw"><span class="pill">${esc(x.basis)}</span> weight ${x.weight}, strength ${x.strength}</p></details>`).join('')).join('') || '<p class="note">No rule is active for this date.</p>';
    const secRow = (s, cls) => `<details class="mk-sec ${cls}"><summary><span>${esc(s.sector)}${s.volatile ? ' <i title="Volatile">&#8645;</i>' : ''}</span><b>${sgn(s.score)}</b></summary><ul>${s.drivers.map(d => `<li>${d.v ? `<b>${sgn(d.v)}</b> ` : ''}${esc(d.text)}</li>`).join('')}</ul></details>`;
    const g = r.sbc.grid.map(row => '<tr>' + row.map(c => `<td class="k-${c.k}${c.p.length ? ' has' : ''}"><span>${esc(c.t)}</span>${c.p.length ? `<b>${c.p.join(' ')}</b>` : ''}</td>`).join('') + '</tr>').join('');
    const stress = r.sbc.naks.filter(x => x.net < 0).slice(0, 6), help = r.sbc.naks.filter(x => x.net > 0).slice(-6).reverse();
    const nline = x => `<li><b>${esc(x.nak)}</b>: ${x.mal.length ? 'malefic ' + x.mal.join(', ') : ''}${x.mal.length && x.ben.length ? '; ' : ''}${x.ben.length ? 'benefic ' + x.ben.join(', ') : ''}</li>`;
    const ahead = r.ahead.map(a => `<li><b>${fmtDate(a.date)}</b> <small>in ${a.days} day${a.days === 1 ? '' : 's'}</small> <span class="pill">${a.kind}</span> ${esc(a.text)}<small>${esc(a.why)}</small></li>`).join('') || '<li>None in the next 90 days.</li>';
    $('#mkOut').innerHTML = `<div class="mk-head ${toneCls(b.score)}"><div><small>${esc(r.market ? r.market.name : 'Global')} &middot; ${fmtDate(r.date)}</small><h3>${b.label} <span>${sgn(b.score)}</span></h3></div>${gauge(b)}
        <p class="note">Benefic ${sgn(b.bull)}, malefic ${b.bear}, net ${sgn(b.net)} on a scale of ${b.norm}.${r.chart_used ? ' Includes the market chart.' : ''}</p></div>
      <div class="mk-two"><div><h4 class="mu-sec">Strongest benefic influences</h4><ul class="mk-dr">${r.top_bull.map(driverLine).join('') || '<li>none</li>'}</ul></div>
      <div><h4 class="mu-sec">Strongest malefic influences</h4><ul class="mk-dr">${r.top_bear.map(driverLine).join('') || '<li>none</li>'}</ul></div></div>
      ${r.open ? `<p class="note">At the ${r.open.time} open: rising sign ${esc(r.open.lagna)} ${esc(r.open.lagna_deg)}, hora of ${esc(r.open.hora || '-')}, ${esc(r.open.weekday)}.</p>` : ''}
      <h4 class="mu-sec">Sectors</h4>
      <div class="mk-two"><div><h5>Favoured by the current sky</h5><div class="mk-chips">${chips(up, 'ok')}</div></div><div><h5>Pressured by the current sky</h5><div class="mk-chips">${chips(dn, 'no')}</div></div></div>
      <p class="note">Volatile sectors (&#8645;) are tied to Rahu or Ketu: expect sudden, narrative-driven moves in either direction.</p>
      <details class="mu-rules"><summary>All sectors with the reason for each</summary><div class="mk-secs">${r.sectors.map(s => secRow(s, s.tag === 'Favoured' ? 'ok' : s.tag === 'Pressured' ? 'no' : '')).join('')}</div></details>
      <h4 class="mu-sec">Planets today (Moon left out)</h4><div class="tw"><table><thead><tr><th>Planet</th><th>Sign and degree</th><th>Nakshatra</th><th>Nature</th><th>State</th></tr></thead><tbody>${planetRows}</tbody></table></div>
      <h4 class="mu-sec">Active rules and why</h4>${ruleHTML}
      <h4 class="mu-sec">Sarvatobhadra Chakra</h4>
      <p class="note">Each planet pierces every square on its row, column and both diagonals. ${esc(r.sbc.weekday.weekday)} square: ${r.sbc.weekday.mal.length ? 'malefic ' + r.sbc.weekday.mal.join(', ') : 'no malefic'}, ${r.sbc.weekday.ben.length ? 'benefic ' + r.sbc.weekday.ben.join(', ') : 'no benefic'}.</p>
      <div class="tw"><table class="mk-sbc"><tbody>${g}</tbody></table></div>
      <div class="mk-two"><div><h5>Most pierced by malefics</h5><ul class="mk-dr">${stress.map(nline).join('') || '<li>none</li>'}</ul></div><div><h5>Most supported by benefics</h5><ul class="mk-dr">${help.map(nline).join('') || '<li>none</li>'}</ul></div></div>
      <h4 class="mu-sec">Coming up (next 90 days)</h4><ul class="mk-dr">${ahead}</ul>
      <p class="mk-credit">Traditional rules, not tested against price history. An astrological reading, not a forecast or advice. Predictive insights are based only on astrological concepts and may not apply to the real world; use your own discretion before acting on them. Created by Aryan Sankara Tejasvi.</p>`;
  }

  /* ---------------------------------------------------------------- settings: weights and reference charts */
  async function drawSettings() {
    const g = await guide(), el = $('#mkSettings'), norm = S.norm || g.norm;
    const rows = g.groups.map(gr => `<h4 class="mu-sec">${esc(gr)}</h4><div class="tw"><table><thead><tr><th>On</th><th>Rule</th><th>Weight</th><th>Default</th></tr></thead><tbody>` +
      g.rules.filter(r => r.group === gr).map(r => { const c = S.weights[r.id] || {}; return `<tr><td><input type="checkbox" data-on="${r.id}"${c.on === false ? '' : ' checked'}></td>
        <td>${r.pol > 0 ? '<b class="good">benefic</b>' : '<b class="bad">malefic</b>'} ${esc(r.title)}</td><td><input type="number" step="0.5" min="0" max="20" data-w="${r.id}" value="${c.w !== undefined ? c.w : r.w}" style="width:72px"></td><td>${r.w}</td></tr>`; }).join('') + '</tbody></table></div>').join('');
    const ch = markets().filter(m => m.chart).map(m => `<tr><td>${esc(m.name)}</td><td><input type="date" data-c="${m.id}:date" value="${m.chart.date}"></td><td><input type="time" step="1" data-c="${m.id}:time" value="${m.chart.time}"></td>
      <td><input type="number" step="0.0001" data-c="${m.id}:lat" value="${m.chart.lat}" style="width:90px"></td><td><input type="number" step="0.0001" data-c="${m.id}:lon" value="${m.chart.lon}" style="width:90px"></td>
      <td><input data-c="${m.id}:tz" value="${m.chart.tz}" style="width:130px"></td><td><input type="time" data-c="${m.id}:open" value="${m.open}"></td><td><input type="checkbox" data-c="${m.id}:time_known"${m.chart.time_known ? ' checked' : ''}></td></tr>`).join('');
    el.innerHTML = `<h3 class="mu-h">Rule weights</h3><p class="note">Each active rule adds weight x strength to the benefic or malefic side. Change a weight, or switch a rule off. The score is the total divided by the scale. Defaults are my proposal.</p>
      <div class="row"><label>Scale (points for a score of 100)<input type="number" id="mkNorm" value="${norm}" min="5" max="200" step="1" style="width:90px"></label><button class="run" id="mkSave">Save weights</button><button class="sec" id="mkReset">Reset all to default</button></div><span class="note" id="mkSaved"></span>${rows}
      <h3 class="mu-h">Market reference charts</h3><p class="note">Used when you pick a market. The defaults are conventional dates, and most times are approximate (the time-known box is unticked), so rules that depend on the rising sign are skipped for them. Edit any value. Time zone can be an IANA name or a number of hours from UTC.</p>
      <div class="tw"><table><thead><tr><th>Market</th><th>Date</th><th>Time</th><th>Lat</th><th>Lon</th><th>Time zone</th><th>Open</th><th>Time known</th></tr></thead><tbody>${ch}</tbody></table></div>
      <div class="row"><button class="run" id="mkSaveC">Save charts</button><button class="sec" id="mkResetC">Reset charts to default</button></div>`;
    $('#mkSave').onclick = () => {
      const w = {};
      $$('#mkSettings [data-w]').forEach(i => { const id = i.dataset.w, r = g.rules.find(x => x.id === id), on = $(`[data-on="${id}"]`).checked, v = parseFloat(i.value); if (!on || (!isNaN(v) && v !== r.w)) w[id] = {...(isNaN(v) ? {} : {w: v}), ...(on ? {} : {on: false})}; });
      S.weights = w; lsSet('jt_mkt_w', w);
      const n = parseFloat($('#mkNorm').value); S.norm = (n && n !== g.norm) ? n : null; lsSet('jt_mkt_norm', S.norm);
      S.home.key = ''; $('#mkSaved').textContent = 'Saved.';
    };
    $('#mkReset').onclick = () => { S.weights = {}; S.norm = null; lsSet('jt_mkt_w', {}); lsSet('jt_mkt_norm', null); S.home.key = ''; drawSettings(); };
    $('#mkSaveC').onclick = () => {
      const c = {};
      $$('#mkSettings [data-c]').forEach(i => { const [id, k] = i.dataset.c.split(':'); c[id] = c[id] || {}; let v = i.type === 'checkbox' ? i.checked : i.value; if (['lat', 'lon'].includes(k)) v = parseFloat(v); if (k === 'tz' && v !== '' && !isNaN(Number(v))) v = Number(v); c[id][k] = v; });
      S.charts = c; lsSet('jt_mkt_charts', c); S.home.key = ''; $('#mkSaved').textContent = 'Charts saved.';
    };
    $('#mkResetC').onclick = () => { S.charts = {}; lsSet('jt_mkt_charts', {}); S.home.key = ''; drawSettings(); };
  }
  /* ---------------------------------------------------------------- how it works */
  async function drawHow() {
    const g = await guide(), el = $('#mkHow'); if (el.dataset.done) return; el.dataset.done = '1';
    const sig = Object.entries(g.significators).map(([p, v]) => `<tr><td><b>${p}</b></td><td>${v.map(([s, w]) => esc(s) + (w < 1 ? ' (half)' : '')).join(', ')}</td></tr>`).join('');
    const nodes = Object.entries(g.node_sectors).map(([p, v]) => `<tr><td><b>${p}</b></td><td>${v.map(esc).join(', ')}</td></tr>`).join('');
    const signs = Object.entries(g.sign_sectors).map(([p, v]) => `<tr><td><b>${p}</b></td><td>${v.map(esc).join(', ')}</td></tr>`).join('');
    el.innerHTML = `<h3 class="mu-h">How the reading is made</h3><ul>${g.method.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
      <h4 class="mu-sec">Planets and the sectors they signify</h4><div class="tw"><table><tbody>${sig}</tbody></table></div>
      <h4 class="mu-sec">Rahu and Ketu: sectors made volatile</h4><div class="tw"><table><tbody>${nodes}</tbody></table></div>
      <h4 class="mu-sec">Signs and the sectors they colour</h4><div class="tw"><table><tbody>${signs}</tbody></table></div>
      <h4 class="mu-sec">Every rule, its default weight and its reason</h4>${g.rules.map(r => `<div class="mu-f ${r.pol > 0 ? 'lv-good' : 'lv-bad'}"><div class="fh"><b>${esc(r.title)}</b><span class="pill">${esc(r.basis)}</span><span class="pts">${r.pol > 0 ? '+' : '-'}${r.w}</span></div><p class="fw">${esc(r.why)}</p></div>`).join('')}
      <p class="mk-credit">Created by Aryan Sankara Tejasvi.</p>`;
  }

  /* ---------------------------------------------------------------- first-page card */
  function homeHead(open) {
    return `<div class="ch"><h2>Market view <span class="hint">benefic and malefic transits</span></h2><div class="btns"><button class="xp mk-open" type="button">Open</button><button class="xp ic mk-tg" type="button" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'}" title="${open ? 'Hide' : 'Show'}"><i>${open ? '▴' : '▾'}</i></button></div></div>`;
  }
  function homeBody(r) {
    const b = r.bias, up = r.sectors.filter(s => s.tag === 'Favoured').slice(0, 6), dn = r.sectors.filter(s => s.tag === 'Pressured').slice(-6).reverse();
    return `<div class="mk-head ${toneCls(b.score)}"><div><small>${esc(r.market ? r.market.name : 'Global transits')} &middot; ${fmtDate(r.date)}</small><h3>${b.label} <span>${sgn(b.score)}</span></h3></div>${gauge(b)}</div>
      <div class="mk-two"><div><h5>Benefic</h5><ul class="mk-dr">${r.top_bull.map(driverLine).join('') || '<li>none</li>'}</ul></div><div><h5>Malefic</h5><ul class="mk-dr">${r.top_bear.map(driverLine).join('') || '<li>none</li>'}</ul></div></div>
      <div class="mk-two"><div><h5>Favoured sectors</h5><div class="mk-chips">${chips(up, 'ok')}</div></div><div><h5>Pressured sectors</h5><div class="mk-chips">${chips(dn, 'no')}</div></div></div>
      <p class="mu-note">Traditional rules, not tested against price history. Astrological only, not advice; may not apply to the real world. Moon left out. Tap Open for the full reasons.</p>`;
  }
  function paint() {
    const host = document.getElementById('hmMkt'), ctx = S.ctx; if (!host || !ctx) return;
    let b = '';
    if (ctx.open) b = S.home.data ? homeBody(S.home.data) : (S.home.err ? `<p class="mu-note">${esc(S.home.err)}</p>` : '<p class="mu-note">Reading the sky...</p>');
    host.innerHTML = homeHead(ctx.open) + b;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest ? e.target.closest('#hmMkt .mk-open, #hmMkt .mk-tg') : null;
    if (!t) return;
    if (t.classList.contains('mk-tg')) { if (S.ctx && S.ctx.toggle) S.ctx.toggle(); } else go();
  });
  function home(host, ctx) {
    if (!host) return;
    S.ctx = ctx; paint();
    if (!ctx.open) return;
    const key = `${ctx.date}|${S.sel}|${ctx.place.lat},${ctx.place.lon}|${JSON.stringify(S.weights)}|${S.norm}|${JSON.stringify(S.charts)}`;
    if (S.home.key === key && S.home.data) return;
    if (S.home.busy === key) return;
    S.home.busy = key; S.home.err = '';
    (async () => {
      try {
        const r = await api('/api/market/view', body(ctx.date, ctx.place));
        if (r.error) throw new Error(r.error);
        S.home.key = key; S.home.data = r;
      } catch (e) { S.home.err = e.message || String(e); }
      S.home.busy = '';
      paint();
    })();
  }
  function go() {
    location.hash = '#app';
    setTimeout(() => { showTab('panchanga'); const b = document.querySelector('#pnSub button[data-s="market"]'); if (b) b.click(); }, 60);
  }
  return {mount, home, go};
})();
