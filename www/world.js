'use strict';
/* Jyotisha Tejas World outlook: mundane reading of the sky (Brihat Samhita style principles).
   Used as a card on the first page and as a sub-tab of Panchanga. Also supplies the planet-in-sign reading shown under Transiting planets.
   Needs app.js globals: api, esc, $, $$, guard, defaultPlace. */
const Wor = (() => {
  const make = (hostSel, isCard) => {
  const GL = {Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋'};
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const W = {view: null, key: '', busy: '', err: '', cal: null, calKey: '', calBusy: '', nat: null, natKey: '', natBusy: '', ctx: null, tab: null,
    open: lsGet('jt_wor_open', {}), filt: lsGet('jt_wor_filt', 'key')};
  const op = k => ` data-k="${esc(k)}"${W.open[k] ? ' open' : ''}`;
  const fdt = s => s ? `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : '';
  const fdt2 = s => s ? `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(2, 4)}` : '';
  const paras = a => (a || []).map(t => { const m = /^([A-Z][A-Za-z' -]{2,22})\. (.+)$/.exec(t); return m ? `<p><b>${esc(m[1])}.</b> ${esc(m[2])}</p>` : `<p>${esc(t)}</p>`; }).join('');
  const detail = a => `<div class="wo-dt">${paras(a)}</div>`;

  /* ---------------------------------------------------------------- loading */
  async function load(when, tz) {
    const key = `${when.slice(0, 13)}|${tz}`;
    if (W.key === key && W.view) return;
    if (W.busy === key) return;
    W.busy = key; W.err = '';
    try {
      const r = await api('/api/world/view', {when, tz});
      if (r.error) throw new Error(r.error);
      W.view = r; W.key = key;
    } catch (e) { W.err = e.message || String(e); }
    W.busy = '';
  }
  async function loadCal(when, tz) {
    const key = `${when.slice(0, 10)}|${tz}`;
    if (W.calKey === key && W.cal) return;
    if (W.calBusy === key) return;
    W.calBusy = key;
    try { const r = await api('/api/world/calendar', {when, tz}); W.cal = r.events || []; W.calKey = key; } catch (e) { W.cal = null; }
    W.calBusy = '';
  }
  async function loadNat(when, tz) {
    const key = `${when.slice(0, 10)}|${tz}`;
    if (W.natKey === key && W.nat) return;
    if (W.natBusy === key) return;
    W.natBusy = key;
    try { const r = await api('/api/world/nations', {when, tz}); W.nat = r.nations || []; W.natKey = key; } catch (e) { W.nat = null; }
    W.natBusy = '';
  }
  const cur = () => W.ctx;

  /* ---------------------------------------------------------------- pieces */
  function themeRow(t) {
    return `<details class="wo-th ${t.tone}"${op('th:' + t.id)}><summary><span class="wo-tn">${esc(t.name)}${t.volatile ? ' <i class="wo-vol" title="Volatile: swings and reversals are likelier">&#8645;</i>' : ''}</span><span class="wo-lv ${t.tone}">${esc(t.level)}</span><small class="wo-hl">${esc(t.headline)}</small></summary>${detail(t.paras)}</details>`;
  }
  function themesHTML(v) {
    const shown = v.themes.filter(t => t.shown), quiet = v.themes.filter(t => !t.shown);
    return `<h4 class="wo-h">Themes in focus <small>tap a theme for the reading</small></h4>${shown.map(themeRow).join('') || '<p class="wo-note">No theme stands out today.</p>'}
      ${quiet.length ? `<details class="wo-q"${op('quiet')}><summary>Quiet themes (${quiet.length})</summary>${quiet.map(themeRow).join('')}</details>` : ''}`;
  }
  function interestsHTML(v) {
    return `<h4 class="wo-h">World interests and trend</h4>` + v.interests.map(i => `<div class="wo-int"><span class="wo-ip">${GL[i.planet]} ${esc(i.planet)} in ${esc(i.sign)}</span><b>${esc(i.head)}</b><small>${esc(i.text)}</small></div>`).join('');
  }
  function indHTML(v) {
    const I = v.industries;
    const row = (x, c) => `<div class="wo-ind ${c}"><b>${GL[x.planet]} ${esc(x.planet)}</b> ${esc(x.industries)}<small>${esc(x.why)}</small></div>`;
    return `<h4 class="wo-h">Industries</h4>
      <h5 class="wo-s up">Favoured</h5>${I.up.map(x => row(x, 'up')).join('') || '<p class="wo-note">No planet is strong enough to lift an industry clearly right now.</p>'}
      <h5 class="wo-s dn">Pulled down</h5>${I.down.map(x => row(x, 'dn')).join('') || '<p class="wo-note">No planet is weak enough to pull an industry down clearly right now.</p>'}
      <h5 class="wo-s">Volatile (Rahu and Ketu)</h5>${I.volatile.map(x => row(x, '')).join('')}`;
  }
  function slowHTML(v) {
    const S = v.slow, js = S.js, nd = S.nodes;
    const pl = S.planets.map(p => `<details class="wo-sl"${op('sl:' + p.planet)}><summary><b>${GL[p.planet]} ${esc(p.planet)}</b> in ${esc(p.sign)}${p.retro && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? ' <i class="rx">R</i>' : ''}<small>${esc(fdt(p.entered))} to ${esc(fdt(p.leaves))}</small></summary>${detail([p.text])}</details>`).join('');
    return `<details class="wo-sec"${op('slow')}><summary>Slow cycles: Jupiter, Saturn and the nodes</summary><div class="wo-in">
      ${pl}
      <details class="wo-sl"${op('js')}><summary><b>Jupiter and Saturn cycle</b><small>${esc(js.phase)}; ${js.house === 1 ? 'conjunct' : 'Saturn is ' + js.house + (js.house === 2 ? 'nd' : js.house === 3 ? 'rd' : 'th') + ' from Jupiter'}</small></summary>${detail(js.paras)}</details>
      <details class="wo-sl"${op('nodes')}><summary><b>Rahu and Ketu axis</b><small>Rahu in ${esc(nd.rahu)}, Ketu in ${esc(nd.ketu)}${nd.leaves ? ', changes ' + esc(fdt(nd.leaves)) : ''}</small></summary>${detail(nd.paras)}</details></div></details>`;
  }
  function evRow(e, nat) {
    let extra = '';
    if (e.type === 'eclipse' && nat) {
      const hits = nat.filter(n => n.moon_sign_idx === e.sign_idx || n.lagna_idx === e.sign_idx).map(n => `${n.name}: ${n.moon_sign_idx === e.sign_idx ? 'falls on its Moon sign (people, public mood and leaders)' : 'falls on its lagna (national character and government)'}`);
      if (hits.length) extra = `<p><b>Nations touched.</b> ${hits.map(esc).join('; ')}.</p>`;
    }
    const tag = e.type === 'eclipse' ? `<i class="wo-ec">${esc(e.direction)}</i>` : '';
    return `<details class="wo-ev ${e.type}"${op('ev:' + e.date + e.title)}><summary><span class="wo-d">${esc(fdt2(e.date))}</span><span class="wo-et">${esc(e.title)}</span>${tag}<small>${e.days <= 0 ? 'today' : 'in ' + e.days + ' d'}</small></summary><div class="wo-dt">${paras(e.paras)}${extra}</div></details>`;
  }
  function calHTML() {
    const chip = (k, n) => `<button type="button" class="wo-chip${W.filt === k ? ' on' : ''}" data-f="${k}">${n}</button>`;
    let body;
    if (!W.cal) body = `<p class="wo-note">${W.calBusy ? 'Working out the next twelve months...' : 'Open to load.'}</p>`;
    else {
      const f = W.filt, list = W.cal.filter(e => f === 'all' ? true : f === 'ecl' ? e.type === 'eclipse' : (e.big || e.type === 'eclipse' || (e.type === 'ingress' && ['Mars', 'Jupiter', 'Saturn', 'Rahu'].some(p => e.title.startsWith(p))) || (e.type === 'station' && /^(Mercury|Venus|Mars)/.test(e.title) === false)));
      body = list.map(e => evRow(e, W.nat)).join('') || '<p class="wo-note">Nothing in this view.</p>';
    }
    return `<details class="wo-sec"${op('cal')}><summary>Coming up: next 12 months</summary><div class="wo-in"><div class="wo-chips">${chip('key', 'Key events')}${chip('all', 'Everything')}${chip('ecl', 'Eclipses')}</div>${body}</div></details>`;
  }
  function eclHTML() {
    let body;
    if (!W.cal) body = `<p class="wo-note">${W.calBusy ? 'Working it out...' : 'Open to load.'}</p>`;
    else {
      const ec = W.cal.filter(e => e.type === 'eclipse');
      body = `<p class="wo-note">Based on the Brihat Samhita idea that the nakshatra of an eclipse points to a region, and the sign to the themes stirred. The directions follow the Kurma (tortoise) map of the Indian subcontinent.</p>` + (ec.map(e => evRow(e, W.nat)).join('') || '<p class="wo-note">No eclipse in the next twelve months.</p>');
    }
    return `<details class="wo-sec"${op('ecl')}><summary>Eclipses</summary><div class="wo-in">${body}</div></details>`;
  }
  function natHTML() {
    let body;
    if (!W.nat) body = `<p class="wo-note">${W.natBusy ? 'Reading the national charts...' : 'Open to load.'}</p>`;
    else {
      body = `<p class="wo-note">Each national chart is read like a native's chart: Saturn, Jupiter and the nodes from the national Moon, and the running dasa. The dates and times are conventions and some are disputed, so rely on the Moon sign and the slow planets.</p>` +
        W.nat.map(n => n.error ? `<p class="wo-note">${esc(n.name)}: ${esc(n.error)}</p>` :
          `<details class="wo-na"${op('na:' + n.id)}><summary><b>${esc(n.name)}</b><span class="wo-lv ${n.tone}">${esc(n.label)}</span><small>${esc(n.lagna)} lagna, ${esc(n.moon_sign)} Moon${n.flags.length ? '; ' + esc(n.flags.join(', ')) : ''}</small></summary>${detail(n.paras)}</details>`).join('');
    }
    return `<details class="wo-sec"${op('nat')}><summary>Nations: transits over national charts</summary><div class="wo-in">${body}</div></details>`;
  }
  function mainHTML(v) {
    return `<div class="wo-meta">Reading for ${esc(v.when)}</div>${themesHTML(v)}${interestsHTML(v)}${indHTML(v)}
      <h4 class="wo-h">Cycles, dates and nations</h4>${slowHTML(v)}${calHTML()}${eclHTML()}${natHTML()}
      <p class="wo-note">Traditional mundane principles in the spirit of Varahamihira's Brihat Samhita, composed as tendencies. Not tested against outcomes, not a forecast and not advice. Created by Aryan Sankara Tejasvi.</p>`;
  }

  /* ---------------------------------------------------------------- the card */
  function head(open) {
    return `<div class="ch"><h2>World outlook <span class="hint">sky, markets and nations</span></h2><div class="btns"><button class="xp ic wo-tg" type="button" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'}" title="${open ? 'Hide' : 'Show'}"><i>${open ? '▴' : '▾'}</i></button></div></div>`;
  }
  function paint() {
    const c = W.ctx, h = document.querySelector(hostSel);
    if (!h || !c) return;
    const inner = W.view ? mainHTML(W.view) : `<p class="wo-note">${W.err ? esc(W.err) : 'Reading the sky...'}</p>`;
    h.innerHTML = isCard ? head(c.open) + (c.open ? inner : '') : inner;
  }
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (!d || !d.matches || !d.matches(hostSel + ' details[data-k]')) return;
    const k = d.dataset.k;
    if (!!W.open[k] === d.open) return;      // a repaint restoring an open row also fires toggle: ignore it
    if (d.open) W.open[k] = 1; else delete W.open[k];
    lsSet('jt_wor_open', W.open);
    if (d.open && (k === 'cal' || k === 'ecl' || k === 'nat')) ensureExtras();
  }, true);
  async function ensureExtras() {
    const c = cur(); if (!c) return;
    const when = c.when, tz = c.tz;
    const jobs = [];
    if (W.open.cal || W.open.ecl) jobs.push(loadCal(when, tz));
    if (W.open.nat || W.open.ecl || W.open.cal) jobs.push(loadNat(when, tz));
    paint();
    await Promise.all(jobs);
    paint();
  }
  document.addEventListener('click', e => {
    const chip = e.target.closest ? e.target.closest(hostSel + ' .wo-chip') : null;
    if (chip) { W.filt = chip.dataset.f; lsSet('jt_wor_filt', W.filt); paint(); return; }
    const t = e.target.closest ? e.target.closest(hostSel + ' .wo-tg') : null;
    if (t && W.ctx && W.ctx.toggle) W.ctx.toggle();
  });
  async function home(host, ctx) {
    if (!host) return;
    W.ctx = {...ctx, tz: ctx.place.tz};
    paint();
    await load(ctx.when, ctx.place.tz);
    paint();
    if (ctx.open && (W.open.cal || W.open.ecl || W.open.nat)) ensureExtras();
    if (ctx.refresh && W.view && !W.refreshed) { W.refreshed = true; ctx.refresh(); }
  }

  /* planet-in-sign reading under Transiting planets */
  function planetHTML(body) {
    const p = W.view && W.view.planets && W.view.planets[body];
    if (!p) return `<div class="wo-pd"><p class="wo-note">${W.err ? 'Reading not available.' : 'Reading the sky...'}</p></div>`;
    const chips = [p.dignity !== 'neutral' && p.dignity !== 'node' ? p.dignity : '', p.retro && body !== 'Rahu' && body !== 'Ketu' ? 'retrograde' : '', p.combust ? 'combust' : '', ...p.flags.filter(f => f !== 'retrograde' && f !== 'combust')].filter(Boolean);
    return `<div class="wo-pd"><div class="wo-pc">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>${paras(p.paras)}</div>`;
  }

  async function run(when, tz) {
    W.ctx = {when, tz, open: true};
    W.view = null; W.key = ''; W.cal = null; W.calKey = ''; W.nat = null; W.natKey = '';
    paint();
    await load(when, tz);
    paint(); ensureExtras();
  }
  return {home, run, planetHTML, W};
  };

  const card = make('#hmWor', true), tab = make('#wrOut', false);
  /* ---------------------------------------------------------------- the Panchanga sub-tab */
  function mount(el) {
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    el.innerHTML = `<div class="row"><label>Date<input type="date" id="wrDate" value="${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}"></label><button class="run" id="wrGo">World outlook</button></div><div id="wrOut" class="wo-tab"></div>`;
    const go = () => { const dt = $('#wrDate').value; if (dt) return tab.run(`${dt} 12:00`, defaultPlace().tz); };
    $('#wrGo').onclick = guard(go);
    go();
  }
  return {home: card.home, mount, planetHTML: card.planetHTML};
})();
