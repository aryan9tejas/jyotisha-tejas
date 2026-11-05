'use strict';
/* Jyotisha Tejas Transit reading: personal gochara reading for a chosen native, on the first page.
   Layers: planets from natal Moon, vedha, lagna, ashtakavarga bindus (info), dasa lens, domains, Today strip.
   Needs app.js globals: api, esc, $, getBirth, getCfg, S. */
const Goc = (() => {
  const GL = {Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋'};
  const pad = n => String(n).padStart(2, '0');
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const G = {guide: null, profiles: null, sel: lsGet('jt_goc_sel', ''), params: lsGet('jt_goc_p', {}), ctx: null, view: 'main',
    home: {key: '', data: null, busy: '', err: ''}, open: lsGet('jt_goc_open', {})};
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({1: 'st', 2: 'nd', 3: 'rd'}[n % 10] || 'th'));
  const sgn = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v).toFixed(2).replace(/\.?0+$/, '');
  const sgn0 = v => (v > 0 ? '+' : '') + v;
  const op = k => ` data-k="${esc(k)}"${G.open[k] ? ' open' : ''}`;      // the page re-renders every minute: remember which rows are open

  async function loadProfiles() {
    if (G.profiles) return G.profiles;
    try {
      const r = await Promise.race([api('/api/profiles'), new Promise(res => setTimeout(() => res(null), 4000))]);
      G.profiles = Array.isArray(r) ? r : [];
    } catch (e) { G.profiles = []; }
    return G.profiles;
  }
  const guide = async () => G.guide || (G.guide = await api('/api/gochara/guide', {}));

  function nativeBirth() {
    const sel = G.sel || (S.profileId ? 'p' + S.profileId : 'form');
    if (sel.startsWith('p')) {
      const pr = (G.profiles || []).find(x => 'p' + x.id === sel);
      if (pr) return {key: sel, birth: {name: pr.name, date: `${pr.year}-${pad(pr.month)}-${pad(pr.day)}`, time: `${pad(pr.hour)}:${pad(pr.minute)}:${pad(pr.second || 0)}`, lat: pr.lat, lon: pr.lon, tz: pr.tz, place: pr.place, gender: pr.gender}};
    }
    return {key: 'form', birth: getBirth()};            // throws when the form is empty
  }

  /* ---------------------------------------------------------------- pieces */
  const pill = (t, c) => `<span class="gc-pill ${c || ''}">${esc(t)}</span>`;
  const toneCls = {Strong: 'bu2', Supportive: 'bu1', Mixed: 'mx', Caution: 'be1', Difficult: 'be2'};
  const lab = d => `<span class="gc-lab ${toneCls[d.label]}">${esc(d.label)} <b>${sgn0(d.pct)}</b></span>`;

  function todayHTML(t) {
    const fav = t.blocked ? pill('blocked by vedha', 'mx') : pill(t.fav ? 'favourable' : 'not favourable', t.fav ? 'ok' : 'no');
    const tara = pill(`${t.tara} (${t.tara_no})`, t.tara_no === 1 ? 'mx' : t.tara_good ? 'ok' : 'no');
    const bind = t.bindus === null ? '' : `<div><span>Chandra bindus</span><b>${t.bindus} of 8</b><small>info only, sign total ${t.sav}</small></div>`;
    const others = [...t.conj.map(p => `${GL[p]} ${p} conjunct`), ...t.aspects.map(p => `${GL[p]} ${p} aspect`)];
    const rs = t.reasons.map(r => `<tr><td>${esc(r.k)}</td><td>${esc(r.text)}</td><td class="n ${r.pts > 0 ? 'up' : r.pts < 0 ? 'dn' : ''}">${sgn(r.pts)}</td></tr>`).join('');
    return `<div class="gc-today ${t.tone}"><div class="gc-th"><div><small>Today &middot; Moon</small><h3>${esc(t.label)} <span>${sgn(t.score)}</span></h3></div><div class="gc-tmoon">${GL.Moon} ${esc(t.sign)} ${esc(t.deg)}<small>${esc(t.nak)} pada ${t.pada}</small></div></div>
      <div class="gc-tg">
        <div><span>From natal Moon</span><b>${ord(t.house_moon)} house</b>${fav}</div>
        <div><span>Tara bala</span><b>${esc(t.tara)}</b>${tara}<small>${esc(t.tara_mean)}</small></div>
        <div><span>From lagna</span><b>${ord(t.house_lagna)} house</b><small>${esc(t.area)}</small></div>
        ${bind}
        <div><span>Moon with</span><b>${others.length ? others.map(esc).join(', ') : 'no planet'}</b></div>
      </div>
      <details class="gc-more"${op('today')}><summary>Why this tone</summary><div class="tw"><table><tbody>${rs}</tbody></table></div>
        <p class="gc-note">Moon changes sign every two to three days, so the day-to-day change comes from the nakshatra (Tara bala), the Moon's aspects and conjunctions, and its house from lagna.</p></details></div>`;
  }

  function flagsHTML(fl) {
    if (!fl.length) return '';
    const rank = {major: 0, moderate: 1, pressure: 2, support: 3};
    return `<div class="gc-flags">${[...fl].sort((a, b) => rank[a.level] - rank[b.level]).map(f => `<div class="gc-flag ${f.level}"><b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join('')}</div>`;
  }

  function domainsHTML(r) {
    const rows = r.domains.map(d => {
      const dv = (x, nm) => `<div><h5>${nm}</h5><ul class="gc-dr">${x.drivers.map(v => `<li class="${v.pts > 0 ? 'up' : 'dn'}"><b>${sgn(v.pts)}</b> ${GL[v.planet]} ${esc(v.planet)}<small>${esc(v.why)}</small></li>`).join('') || '<li>no planet is routed here</li>'}</ul></div>`;
      const em = d.dasa.emph > 1 ? ` <span class="gc-em" title="The running dasa concentrates on this area">&#9733; dasa focus</span>` : '';
      return `<details class="gc-dom"${op('dom:' + d.id)}><summary><span class="gc-dn">${esc(d.name)}${em}</span><span class="gc-dv">${lab(d.transit)}</span><span class="gc-dv">${lab(d.dasa)}</span></summary>
        <div class="gc-two">${dv(d.transit, 'Transit only')}${dv(d.dasa, 'With dasa')}</div>
        <p class="gc-note">Houses from lagna: ${d.houses.map(ord).join(', ')}. Natural significators: ${d.karakas.map(esc).join(', ')}.</p></details>`;
    }).join('');
    const best = r.summary.best.length ? `<b>Brightest</b> ${r.summary.best.map(esc).join(', ')}.` : '';
    const worst = r.summary.worst.length ? ` <b>Needs care</b> ${r.summary.worst.map(esc).join(', ')}.` : '';
    return `<h4 class="gc-h">Overall reading by life area</h4>${best || worst ? `<p class="gc-sum">${best}${worst}</p>` : ''}
      <div class="gc-dh"><span>Area</span><span>Transit only</span><span>With dasa</span></div>${rows}`;
  }

  function lensHTML(r) {
    const L = r.lens;
    const cards = L.path.map(l => `<div class="gc-lord"><small>${esc(l.level)}</small><b>${GL[l.lord]} ${esc(l.lord)}</b>
      <span>${esc(l.start)} to ${esc(l.end)}</span>
      <span>${esc(l.sign)}, ${ord(l.house_lagna)} from lagna, ${ord(l.house_moon)} from Moon</span>
      <span>${l.owns.length ? 'Rules the ' + l.owns.map(ord).join(' and ') + '; ' : ''}${esc(l.fn_label)} for this lagna</span>
      <span>${esc(l.dignity)}${l.combust ? ', combust' : ''}: <b class="${l.strength > 0 ? 'up' : l.strength < 0 ? 'dn' : ''}">${esc(l.strength_word)}</b></span></div>`).join('');
    const names = id => (r.domains.find(d => d.id === id) || {}).name || id;
    const trig = L.triggers.length ? L.triggers.map(t => `<li><b>${GL[t.planet]} ${esc(t.planet)}</b> x${t.mult}<small>${esc(t.why)}</small></li>`).join('') : '<li>No transit is a trigger today.</li>';
    return `<h4 class="gc-h">Dasa lens</h4><div class="gc-lords">${cards}</div>
      <div class="gc-two"><div><h5>How the dasa changes the reading</h5><ul class="gc-dr"><li>Combined dasa strength <b class="${L.L > 0 ? 'up' : L.L < 0 ? 'dn' : ''}">${sgn(L.L)}</b> of 2<small>${L.L > 0 ? 'Good transits deliver more fully and bad ones are softened.' : L.L < 0 ? 'Good transits under-deliver and bad ones sharpen.' : 'Neutral: the dasa neither lifts nor mutes transit results.'}</small></li>
        <li>Mahadasa focus: ${L.md_domains.map(i => esc(names(i))).join(', ') || 'none'}<small>Areas tied to the lord's house and the houses it rules, emphasised in the With dasa column.</small></li>
        <li>Antardasa focus: ${L.ad_domains.map(i => esc(names(i))).join(', ') || 'none'}</li></ul></div>
      <div><h5>Triggers (count more)</h5><ul class="gc-dr">${trig}</ul></div></div>`;
  }

  function planetsHTML(r) {
    const rows = r.planets.map(p => {
      const st = p.blocked ? pill('blocked', 'mx') : pill(p.fav ? 'favourable' : 'unfavourable', p.fav ? 'ok' : 'no');
      const bd = p.bindus === null ? '' : `<span class="gc-bd ${p.bindus_tone}" title="Ashtakavarga bindus of ${esc(p.planet)} in this sign (information only)">${p.bindus} bindus</span>`;
      const nt = p.notes.map(n => `<span class="gc-n ${n.t}">${esc(n.text)}</span>`).join('');
      const steps = p.steps.map(s => `<tr><td><b>${esc(s.layer)}</b></td><td>${esc(s.text)}</td><td class="n ${s.pts > 0 ? 'up' : s.pts < 0 ? 'dn' : ''}">${sgn(s.pts)}</td></tr>`).join('');
      return `<details class="gc-pl"${op('pl:' + p.planet)}><summary><span class="gc-pn">${GL[p.planet]} <b>${esc(p.planet)}</b>${p.retro && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? ' <i class="rx">R</i>' : ''}</span>
        <span class="gc-ps">${esc(p.sign)} ${esc(p.deg)}</span><span class="gc-ph">${ord(p.house_moon)} from Moon &middot; ${ord(p.house_lagna)} from lagna</span><span class="gc-st">${st}${bd}</span>
        <span class="gc-pe">${esc(p.effect)}${nt}</span></summary>
        <div class="tw"><table><tbody>${steps}</tbody></table></div>
        <p class="gc-note">Touches ${esc(p.area)} (${ord(p.house_lagna)} from lagna). Planet weight ${p.weight}; transit-only score ${sgn(p.score)}, with dasa ${sgn(p.score_dasa)}.</p></details>`;
    }).join('');
    return `<h4 class="gc-h">Planet by planet <small>tap a row for the layers</small></h4>${rows}`;
  }

  async function howHTML() {
    const g = await guide();
    const lay = g.layers.map(l => `<details class="gc-lay"${op('lay:' + l.name)}><summary><b>${esc(l.name)}</b></summary><p><b>What it does.</b> ${esc(l.what)}</p><p><b>Why it exists.</b> ${esc(l.why)}</p><p><b>Why this beats reading the planet directly.</b> ${esc(l.vs)}</p></details>`).join('');
    const fav = Object.keys(g.favourable).map(p => `<tr><td><b>${GL[p]} ${p}</b></td><td>${g.favourable[p].join(', ')}</td><td>${g.vedha[p] ? Object.entries(g.vedha[p]).map(([h, v]) => `${h}&#8594;${v}`).join(' ') : 'none'}</td></tr>`).join('');
    const prm = g.params.map(p => `<tr><td>${esc(p.text)}</td><td><input type="number" step="0.05" data-gp="${p.id}" value="${G.params[p.id] !== undefined ? G.params[p.id] : p.default}"></td><td class="n">${p.default}</td></tr>`).join('');
    return `<h4 class="gc-h">How it works</h4>${lay}
      <details class="gc-lay"${op('lay:fav')}><summary><b>Favourable houses and vedha</b></summary><div class="tw"><table><thead><tr><th>Planet</th><th>Favourable from Moon</th><th>Vedha (house&#8594;obstructing house)</th></tr></thead><tbody>${fav}</tbody></table></div></details>
      <details class="gc-lay"${op('lay:method')}><summary><b>Method</b></summary><ul>${g.method.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>
      <details class="gc-lay"${op('lay:set')}><summary><b>Weights and settings</b></summary><p class="gc-note">Defaults are my proposal. Change any value and save.</p>
        <div class="tw"><table><thead><tr><th>Setting</th><th>Value</th><th>Default</th></tr></thead><tbody>${prm}</tbody></table></div>
        <div class="gc-btns"><button class="gc-b gc-save" type="button">Save</button><button class="gc-b gc-reset" type="button">Reset to default</button><span class="gc-saved"></span></div></details>`;
  }

  function mainHTML(r) {
    return `<div class="gc-meta"><b>${esc(r.name || 'Chart')}</b> &middot; Lagna ${esc(r.lagna)} &middot; Moon ${esc(r.moon_sign)}, ${esc(r.moon_nak)} &middot; ${esc(r.when)}</div>
      ${todayHTML(r.today)}${flagsHTML(r.flags)}${domainsHTML(r)}${lensHTML(r)}${planetsHTML(r)}<div id="gcHow"></div>
      <p class="gc-note">Traditional gochara rules, not tested against outcomes. Astrological only; predictive insights may not apply to the real world. Created by Aryan Sankara Tejasvi.</p>`;
  }

  /* ---------------------------------------------------------------- card */
  function head(open) {
    return `<div class="ch"><h2>Transit reading <span class="hint">personal gochara</span></h2><div class="btns"><button class="xp ic gc-tg" type="button" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'}" title="${open ? 'Hide' : 'Show'}"><i>${open ? '▴' : '▾'}</i></button></div></div>`;
  }
  function pickerHTML() {
    const opts = (G.profiles || []).map(p => `<option value="p${p.id}">${esc(p.name || '(unnamed)')} - ${p.year}-${pad(p.month)}-${pad(p.day)}</option>`).join('');
    return `<div class="gc-pick"><label>Whose chart<select id="gcSel"><option value="form">Chart currently in the form</option>${opts}</select></label></div>`;
  }
  function paint() {
    const host = document.getElementById('hmGoc'), ctx = G.ctx; if (!host || !ctx) return;
    const ae = document.activeElement;
    if (ctx.open && ae && host.contains(ae) && ae.matches('input')) return;      // do not wipe a value being typed
    let b = '';
    if (ctx.open) {
      const h = G.home;
      b = pickerHTML() + (h.data ? mainHTML(h.data) : (h.err ? `<p class="gc-msg">${esc(h.err)}</p>` : '<p class="gc-msg">Reading the sky...</p>'));
    }
    host.innerHTML = head(ctx.open) + b;
    const sel = host.querySelector('#gcSel');
    if (sel) {
      sel.value = G.sel || (S.profileId ? 'p' + S.profileId : 'form');
      if (sel.value === '') sel.value = 'form';
      sel.onchange = () => { G.sel = sel.value; lsSet('jt_goc_sel', G.sel); G.home.key = ''; G.home.data = null; home(host, G.ctx); paint(); };
    }
    const how = host.querySelector('#gcHow');
    if (how && h0()) howHTML().then(x => { how.innerHTML = x; wireSettings(how); });
  }
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (d && d.matches && d.matches('#hmGoc details[data-k]')) { if (d.open) G.open[d.dataset.k] = 1; else delete G.open[d.dataset.k]; lsSet('jt_goc_open', G.open); }
  }, true);
  const h0 = () => G.home.data;
  function wireSettings(el) {
    const save = el.querySelector('.gc-save'), reset = el.querySelector('.gc-reset'), msg = el.querySelector('.gc-saved');
    if (save) save.onclick = () => {
      const g = G.guide, p = {};
      el.querySelectorAll('[data-gp]').forEach(i => { const def = g.params.find(x => x.id === i.dataset.gp).default, v = parseFloat(i.value); if (!isNaN(v) && v !== def) p[i.dataset.gp] = v; });
      G.params = p; lsSet('jt_goc_p', p); G.home.key = ''; msg.textContent = 'Saved.'; home(document.getElementById('hmGoc'), G.ctx);
    };
    if (reset) reset.onclick = () => { G.params = {}; lsSet('jt_goc_p', {}); G.home.key = ''; msg.textContent = 'Reset.'; home(document.getElementById('hmGoc'), G.ctx); };
  }
  document.addEventListener('click', e => {
    const t = e.target.closest ? e.target.closest('#hmGoc .gc-tg') : null;
    if (t && G.ctx && G.ctx.toggle) G.ctx.toggle();
  });
  function home(host, ctx) {
    if (!host) return;
    G.ctx = ctx; paint();
    if (!ctx.open) return;
    (async () => {
      await loadProfiles();
      let nb;
      try { nb = nativeBirth(); } catch (e) { G.home.data = null; G.home.err = 'Pick a saved profile above, or fill in birth details in the app, to see a personal reading.'; G.home.key = ''; return paint(); }
      const key = `${nb.key}|${JSON.stringify(nb.birth)}|${ctx.when.slice(0, 13)}|${ctx.place.tz}|${JSON.stringify(G.params)}|${JSON.stringify(getCfg())}`;
      if (G.home.key === key && G.home.data) return paint();
      if (G.home.busy === key) return;
      G.home.busy = key; G.home.err = '';
      try {
        const r = await api('/api/gochara/view', {birth: nb.birth, cfg: getCfg(), when: ctx.when, tz: ctx.place.tz, params: G.params});
        if (r.error) throw new Error(r.error);
        G.home.key = key; G.home.data = r;
      } catch (e) { G.home.err = e.message || String(e); G.home.data = null; }
      G.home.busy = '';
      paint();
    })();
  }
  return {home, G};
})();
