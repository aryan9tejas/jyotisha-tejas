'use strict';
/* Jyotisha Tejas front end (vanilla JS, talks to the local Flask API). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ABBR = {Sun:'Su',Moon:'Mo',Mars:'Ma',Mercury:'Me',Jupiter:'Ju',Venus:'Ve',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke',Lagna:'La',Gulika:'Gu',Mandi:'Md',Muntha:'Mu',Kaala:'Ka',Mrityu:'Mr','Artha Praharaka':'AP','Yama Ghantaka':'YG',Dhuma:'Dh',Vyatipata:'Vy',Parivesha:'Pv',Indrachapa:'Ic',Upaketu:'Uk'};
const UPAS = ['Gulika','Mandi','Kaala','Mrityu','Artha Praharaka','Yama Ghantaka','Dhuma','Vyatipata','Parivesha','Indrachapa','Upaketu'];
const ARU = ['AL','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','UL'];
const COL = {planet:'#222', lagna:'#800000', aru:'#e0457b', upa:'#0a7a7a', natal:'#1a5fb4', muntha:'var(--acc2)', tlagna:'var(--acc2)'};
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SA = ['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi'];
const PL7 = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const PL9 = [...PL7, 'Rahu', 'Ketu'];
const VARGAS = [1,2,3,4,5,6,7,8,9,10,11,12,16,20,24,27,30,40,45,60,81,108,144];
const SHODASA = [1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60];
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const S = {chart: null, version: 0, profileId: null, tab: 'charts', loaded: {}, show: {la: false, up: false}};

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setStatus(msg, bad) { const e = $('#status'); e.textContent = msg || ''; e.className = 'status' + (bad ? ' err' : ''); }
async function api(url, body, method) {
  if (Local.isLocal(url)) return Local.handle(url, body, method);
  await Engine.ready;
  return Engine.call(url.split('?')[0], body);
}
function tbl(head, rows, o = {}) {
  const num = new Set(o.num || []);
  let h = '<div class="tw"><table' + (o.cls ? ` class="${o.cls}"` : '') + '><thead><tr>' + head.map((x, i) => `<th class="${num.has(i) ? 'n' : ''}">${esc(x)}</th>`).join('') + '</tr></thead><tbody>';
  for (const r of rows) {
    const cls = r._cls ? ` class="${r._cls}"` : '';
    h += `<tr${cls}>` + r.map((c, i) => { const v = (c && c.html !== undefined) ? c.html : esc(c); const k = (c && c.cls) ? c.cls : (num.has(i) ? 'n' : ''); return `<td class="${k}">${v}</td>`; }).join('') + '</tr>';
  }
  return h + '</tbody></table></div>';
}
function kv(pairs) { return '<div class="kv">' + pairs.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join('') + '</div>'; }
const f = (x, n = 2) => (x === null || x === undefined) ? '' : Number(x).toFixed(n);
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nowLocal = () => { const d = new Date(); return `${todayStr()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/* ---------------------------------------------------------------- form helpers */
function getBirth() {
  const lat = parseFloat($('#lat').value), lon = parseFloat($('#lon').value);
  if (isNaN(lat) || isNaN(lon)) throw new Error('Pick a place or enter latitude and longitude');
  if (!$('#date').value || !$('#time').value) throw new Error('Enter date and time of birth');
  return {name: $('#name').value, date: $('#date').value, time: $('#time').value.length === 5 ? $('#time').value + ':00' : $('#time').value,
    lat, lon, tz: $('#tz').value.trim(), place: $('#place').value, gender: $('#gender').value};
}
function getCfg() {
  const c = {};
  $$('[id^=cfg_]').forEach(e => c[e.id.slice(4)] = e.value);
  return c;
}
const payload = (extra = {}) => ({birth: getBirth(), cfg: getCfg(), ...extra});
function curPlace() { try { return JSON.parse(localStorage.getItem('jh_cur') || 'null'); } catch (e) { return null; } }
function birthPlace() { return {label: $('#place').value, lat: parseFloat($('#lat').value), lon: parseFloat($('#lon').value), tz: $('#tz').value || TZ}; }
function nowIn(tz) { try { return new Date().toLocaleString('sv-SE', {timeZone: tz}).slice(0, 16).replace(' ', 'T'); } catch (e) { return nowLocal(); } }
function defaultPlace() {
  return curPlace() || {label: $('#place').value, lat: parseFloat($('#lat').value), lon: parseFloat($('#lon').value), tz: $('#tz').value || TZ};
}

/* place search widget */
function placePicker(input, list, onPick) {
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { list.style.display = 'none'; return; }
      try {
        const res = await api('/api/places?q=' + encodeURIComponent(q));
        list.innerHTML = res.map((r, i) => `<div data-i="${i}">${esc(r.name)}, ${esc(r.country)} <small>${esc(r.tz)} - ${r.lat.toFixed(2)}, ${r.lon.toFixed(2)}</small></div>`).join('') || '<div><small>No match. Enter latitude/longitude manually.</small></div>';
        list.style.display = 'block';
        $$('div[data-i]', list).forEach(d => d.onclick = () => { const r = res[+d.dataset.i]; list.style.display = 'none'; input.value = r.label; onPick(r); });
      } catch (e) { /* ignore */ }
    }, 250);
  });
  document.addEventListener('click', e => { if (!list.contains(e.target) && e.target !== input) list.style.display = 'none'; });
}
function placeField(prefix, def) {
  const id = prefix + '_pl';
  return `<label class="place" style="min-width:230px">Location<input id="${id}" autocomplete="off" value="${esc(def.label || '')}" data-lat="${def.lat}" data-lon="${def.lon}" data-tz="${esc(def.tz || '')}"><div id="${id}_dd" class="dd"></div></label>`;
}
function bindPlaceField(prefix, save = true, onPick) {
  const i = $('#' + prefix + '_pl');
  placePicker(i, $('#' + prefix + '_pl_dd'), r => {
    i.dataset.lat = r.lat; i.dataset.lon = r.lon; i.dataset.tz = r.tz;
    if (save) { try { localStorage.setItem('jh_cur', JSON.stringify({label: r.label, lat: r.lat, lon: r.lon, tz: r.tz})); } catch (e) { /* ignore */ } }
    if (onPick) onPick(r);
  });
}
function readPlaceField(prefix) {
  const i = $('#' + prefix + '_pl');
  return {lat: parseFloat(i.dataset.lat), lon: parseFloat(i.dataset.lon), tz: i.dataset.tz || TZ, label: i.value};
}

/* ---------------------------------------------------------------- chart drawing */
const SOUTH_POS = {11: [0, 0], 0: [1, 0], 1: [2, 0], 2: [3, 0], 10: [0, 1], 3: [3, 1], 9: [0, 2], 4: [3, 2], 8: [0, 3], 7: [1, 3], 6: [2, 3], 5: [3, 3]};
const NORTH_POLY = {1: [[200, 0], [300, 100], [200, 200], [100, 100]], 2: [[0, 0], [200, 0], [100, 100]], 3: [[0, 0], [100, 100], [0, 200]], 4: [[100, 100], [200, 200], [100, 300], [0, 200]],
  5: [[0, 200], [100, 300], [0, 400]], 6: [[0, 400], [100, 300], [200, 400]], 7: [[100, 300], [200, 200], [300, 300], [200, 400]], 8: [[200, 400], [300, 300], [400, 400]],
  9: [[400, 400], [300, 300], [400, 200]], 10: [[300, 100], [400, 200], [300, 300], [200, 200]], 11: [[400, 200], [300, 100], [400, 0]], 12: [[400, 0], [300, 100], [200, 0]]};
function signPoly(style, asc, sign) {
  if (style === 'north') return NORTH_POLY[(sign - asc + 12) % 12 + 1];
  const [c, r] = SOUTH_POS[sign]; return [[c * 100, r * 100], [c * 100 + 100, r * 100], [c * 100 + 100, r * 100 + 100], [c * 100, r * 100 + 100]];
}
function pointIn(poly, x, y) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
/* sign index under an svg-space point (0-400), or -1 outside every sign area */
function hitSign(style, asc, x, y) {
  for (let s = 0; s < 12; s++) if (pointIn(signPoly(style, asc, s), x, y)) return s;
  return -1;
}
function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
/* degrees and minutes within the sign, e.g. 12°34' (minutes truncated, carry handled) */
function DM(d) {
  if (d === null || d === undefined || isNaN(d)) return '';
  let t = Math.floor(d * 60 + 1e-9); if (t >= 1800) t = 1799;
  return Math.floor(t / 60) + '°' + String(t % 60).padStart(2, '0') + "'";
}
/* items: [{sign, text, color}] */
function textBlock(cx, cy, items, per, fsMax = 12, maxW = 92) {
  if (!items.length) return '';
  let fs = fsMax, p = per;
  const n = items.length;
  if (n > 4) fs = Math.min(fs, 10);
  if (n > 6) { fs = Math.min(fs, 8.5); }
  if (n > 8 && p < 2) p = 2;
  if (n > 8) fs = Math.min(fs, 7.5);
  const lines = chunk(items, p);
  const lh = fs + 2.5;
  let y = cy - ((lines.length - 1) * lh) / 2 + fs / 3;
  return lines.map((l, i) => {
    const len = l.reduce((a, x) => a + x.text.length + 2 + (x.mk ? x.mk.length * 0.7 : 0), 0);
    const adj = Math.min(fs, (maxW / (len * 0.56)));
    return `<text x="${cx}" y="${y + i * lh}" text-anchor="middle" font-size="${adj.toFixed(1)}">` +
      l.map((x, k) => `<tspan fill="${x.color || COL.planet}"${x.bold ? ' font-weight="700"' : ''}${x.body ? ` class="pi" data-body="${esc(x.body)}" style="cursor:grab"` : ''}>${k ? '  ' : ''}${esc(x.text)}</tspan>` + (x.mk || []).map(m => `<tspan fill="${m[1]}"${m[2] ? ` font-size="${(adj * m[2]).toFixed(1)}"` : ''}> ${m[0]}</tspan>`).join('')).join('') + '</text>';
  }).join('');
}
function bySign(items) { const by = Array.from({length: 12}, () => []); items.forEach(x => by[x.sign].push(x)); return by; }
function chartSVG({style, asc, items, title, legend}) {
  const by = bySign(items || []);
  let g = '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica,Arial,sans-serif">';
  g += '<rect x="1" y="1" width="398" height="398" fill="var(--chart-bg,#fffdf8)" stroke="var(--acc)" stroke-width="2"/>';
  if (style === 'north') {
    g += '<g stroke="var(--acc)" stroke-width="1.5" fill="none"><line x1="0" y1="0" x2="400" y2="400"/><line x1="400" y1="0" x2="0" y2="400"/><polygon points="200,0 400,200 200,400 0,200"/></g>';
    const T = {1: [200, 100], 2: [100, 34], 3: [34, 100], 4: [95, 200], 5: [34, 300], 6: [100, 370], 7: [200, 305], 8: [300, 370], 9: [366, 300], 10: [305, 200], 11: [366, 100], 12: [300, 34]};
    const N = {1: [200, 140], 2: [100, 76], 3: [28, 130], 4: [95, 238], 5: [28, 272], 6: [100, 330], 7: [200, 345], 8: [300, 330], 9: [372, 272], 10: [305, 238], 11: [372, 130], 12: [300, 76]};
    const per = {1: 1, 4: 1, 7: 1, 10: 1};
    const W = {1: 120, 4: 110, 7: 120, 10: 110};
    for (let h = 1; h <= 12; h++) {
      const s = (asc + h - 1) % 12;
      const up = ([1, 3, 5, 7, 9, 11].includes(h) && by[s].length >= 4) ? -10 : 0;
      g += textBlock(T[h][0], T[h][1] + up, by[s], per[h] || 1, 11, W[h] || 70);
      g += `<text x="${N[h][0]}" y="${N[h][1]}" text-anchor="middle" font-size="10" fill="#9a8a78">${s + 1}</text>`;
    }
    g += `<text x="200" y="20" text-anchor="middle" font-size="10" fill="var(--acc2)">Lagna</text>`;
  } else {
    const pos = SOUTH_POS;
    g += '<g stroke="var(--acc)" stroke-width="1.2" fill="none">';
    for (const s in pos) { const [c, r] = pos[s]; g += `<rect x="${c * 100}" y="${r * 100}" width="100" height="100"/>`; }
    g += '</g>';
    for (const s in pos) {
      const [c, r] = pos[s]; const x = c * 100, y = r * 100;
      g += `<text x="${x + 5}" y="${y + 13}" font-size="10" fill="#9a8a78">${SA[s]}</text>`;
      g += textBlock(x + 50, y + 55, by[s], 1, 11, 94);
      if (+s === asc) g += `<line x1="${x + 100}" y1="${y}" x2="${x + 100 - 18}" y2="${y + 18}" stroke="var(--acc2)" stroke-width="2"/><text x="${x + 62}" y="${y + 13}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--acc2)">Asc</text>`;
    }
    g += `<text x="200" y="195" text-anchor="middle" font-size="13" font-weight="700" fill="var(--acc)">${esc(title || '')}</text>`;
  }
  return g + '</svg>';
}
/* build chart items for one varga of a chart view c (chart_view payload) */
/* chart marks (same symbols in every chart): [symbol, colour, relative size] */
const MK = {ex: ['\u25b2', '#1f5fbf'], de: ['\u25bc', '#c0261c'], cb: ['c', '#8a5a00'], pu: ['\u2726', '#7a4cc2'], va: ['\u25c6', '#b4531a', 0.72], dg: ['\u2197', '#2b6f9e'], mk: ['\u271a', '#7a1b13'], pv: ['\u21c4', '#0a7a7a']};
function marksFor(c, n, name, o = {}) {
  const v = c.vargas[String(n)], m = v && v.marks && v.marks[name];
  const p = c.planets.find(x => x.name === name), out = [];
  if (!m) return out;
  if (p && p.combust && n === 1) out.push(MK.cb);
  if (m.d === 'exalted') out.push(MK.ex); else if (m.d === 'debilitated') out.push(MK.de);
  if (n === 1 && isPushkara(v.planets[name], v.pos[name])) out.push(MK.pu);
  if ((n === 1 || n === 9) && p && p.vargottama) out.push(MK.va);
  if (m.dg) out.push(MK.dg);
  if (m.mk) out.push(MK.mk);
  if (m.pv) out.push(MK.pv);
  return out;
}
function planetItems(c, n, o = {}) {
  const v = c.vargas[String(n)];
  const color = o.color || COL.planet, pre = o.pre || '';
  const out = [];
  for (const name of PL9) {
    const p = c.planets.find(x => x.name === name);
    const retro = p && p.retro && name !== 'Rahu' && name !== 'Ketu';
    out.push({sign: v.planets[name], text: pre + ABBR[name] + ' ' + DM(v.pos[name]) + (retro ? ' R' : ''), mk: marksFor(c, n, name), color, body: o.body ? name : undefined});
  }
  return out;
}
function lagnaItems(c, n) {
  const v = c.vargas[String(n)];
  const out = Object.keys(v.lagnas).map(k => ({sign: v.lagnas[k], text: k + ' ' + DM(v.lagna_pos[k]), color: COL.lagna, bold: true}));
  (c.arudhas[String(n)] || []).forEach((s, i) => out.push({sign: s, text: ARU[i], color: COL.aru, bold: true}));
  return out;
}
function upaItems(c, n, o = {}) {
  const v = c.vargas[String(n)];
  return UPAS.filter(k => k in v.upa).map(k => ({sign: v.upa[k], text: (o.pre || '') + ABBR[k] + ' ' + DM(v.upa_pos[k]), color: o.color || COL.upa}));
}
function chartItems(c, n, show, o = {}) {
  const v = c.vargas[String(n)];
  let it = planetItems(c, n, o);
  if (v.asc_deg != null) it.push({sign: v.asc, text: (o.pre || '') + 'Asc ' + DM(v.asc_deg), color: COL.lagna, bold: true});
  if (show.la) it = it.concat(lagnaItems(c, n));
  if (show.up) it = it.concat(upaItems(c, n, o));
  return it;
}
function styleNow() { return $('input[name=style]:checked').value; }
const vsel = x => x === 'C' ? 'C' : +x;
/* Bhava Chalit method: chosen on the Charts tab and kept on this device */
const CH_LABEL = {equal_madhya: 'Equal, Lagna as centre', equal_start: 'Equal, Lagna as start', sripati: 'Sripati', porphyry: 'Porphyry', placidus: 'Placidus (KP)', koch: 'Koch', whole_sign: 'Whole sign'};
const CH_NOTE = {equal_madhya: 'Each bhava is 30 degrees, centred on the Lagna degree (the Lagna degree is the middle of bhava 1).', equal_start: 'Each bhava is 30 degrees and bhava 1 starts at the Lagna degree.',
  sripati: 'The centre of each bhava is found by dividing the arcs between Lagna, IC, Descendant and MC into thirds; a bhava runs from the midpoint with the previous centre to the midpoint with the next.',
  porphyry: 'The arcs between Lagna, IC, Descendant and MC are divided into thirds; each division point starts a bhava.', placidus: 'Time-based division, as used in KP astrology; each cusp starts a bhava.', koch: 'Time-based division by the birthplace method of Koch; each cusp starts a bhava.', whole_sign: 'Each sign is one bhava, so this is the Rasi chart.'};
function chalitMethod() { try { const m = localStorage.getItem('jt_chalit'); if (m && CH_LABEL[m]) return m; } catch (e) { /* ignore */ } return 'equal_madhya'; }
function applyChalit(c) { if (c && c.chalit_all) c.chalit = c.chalit_all[chalitMethod()] || c.chalit_all.equal_madhya; return c; }
const chalitTitle = c => 'Bhava Chalit (' + (CH_LABEL[c.chalit && c.chalit.method] || 'Sripati') + ')';
function chalitItems(c) {
  const ch = c.chalit, d1 = c.vargas['1'], out = [];
  for (const name of PL9) {
    const h = ch.planets[name]; if (!h) continue;
    const p = c.planets.find(x => x.name === name);
    out.push({sign: (ch.asc_sign + h - 1) % 12, text: ABBR[name] + ' ' + DM(d1.pos[name]) + (p && p.retro && name !== 'Rahu' && name !== 'Ketu' ? ' R' : ''), mk: marksFor(c, 1, name), color: COL.planet});
  }
  out.push({sign: ch.asc_sign, text: 'Asc ' + DM(d1.asc_deg), color: COL.lagna, bold: true});
  return out;
}
function drawChart(el, chart, n, title, show) {
  if (n === 'C') { el.innerHTML = chartSVG({style: styleNow(), asc: chart.chalit.asc_sign, items: chalitItems(chart), title: title || chalitTitle(chart)}); return; }
  const v = chart.vargas[String(n)];
  el.innerHTML = chartSVG({style: styleNow(), asc: v.asc, items: chartItems(chart, n, show || S.show), title: title || `D${n} ${v.name}`});
}
/* annual / prasna charts: planets given as sign + degree maps */
function freeItems(planets, degs, extra = []) {
  const out = Object.keys(planets).map(nm => ({sign: planets[nm], text: (ABBR[nm] || nm.slice(0, 2)) + (degs && degs[nm] != null ? ' ' + DM(degs[nm]) : ''), color: nm === 'Muntha' ? COL.muntha : COL.planet}));
  return out.concat(extra);
}
function drawFree(el, data, title, degs) {
  el.innerHTML = chartSVG({style: styleNow(), asc: data.asc, items: freeItems(data.planets, degs || data.degs), title});
}
function markLegend() {
  const it = [[MK.ex, 'Exalted'], [MK.de, 'Debilitated'], [['R', COL.planet], 'Retrograde'], [MK.cb, 'Combust (D1)'], [MK.pu, 'Pushkara navamsa (D1)'], [MK.va, 'Vargottama (D1, D9)'], [MK.dg, 'Digbala'], [MK.mk, 'Maranakaraka sthana (from Lagna)'], [MK.pv, 'Rasi parivartana (sign exchange)']];
  return '<p class="legend marks">' + it.map(([m, t]) => `<span><b style="color:${m[1]}">${m[0]}</b>${esc(t)}</span>`).join('') + '</p>';
}
function legend(parts) { return '<p class="legend">' + parts.map(([c, t]) => `<span><i style="background:${c}"></i>${esc(t)}</span>`).join('') + '</p>'; }
/* Pushkara navamsa: the navamsa falls in Libra/Sagittarius (fire and water signs) or Taurus/Pisces (earth and air signs) */
function isPushkara(sign, deg) {
  if (sign == null || deg == null) return false;
  const start = [0, 9, 6, 3][sign % 4], ns = (start + Math.min(8, Math.floor(deg / (30 / 9)))) % 12;
  const fireWater = sign % 4 === 0 || sign % 4 === 3;
  return fireWater ? (ns === 6 || ns === 8) : (ns === 1 || ns === 11);
}
const VARG_BDG = '<span class="bdg vargottama" title="Vargottama: same sign in the Rasi and Navamsa charts, which strengthens the planet">Vargottama</span>';
const DIG_BDG = '<span class="bdg digbala" title="Digbala: the planet is in the house where it gets directional strength">Digbala</span>';
const PUSH_BDG = '<span class="bdg pushkara" title="Pushkara navamsa: a navamsa of Venus or Jupiter that gives the planet strength and benefic results">Pushkara</span>';
/* dignity badges for the positions table */
const REL_TXT = {adhimitra: 'Great friend', mitra: 'Friend', sama: 'Neutral', satru: 'Enemy', adhisatru: 'Great enemy'};
function divDig(v, nm) {
  const m = v.marks && v.marks[nm]; if (!m) return '';
  const b = [];
  if (m.d === 'exalted') b.push('<span class="bdg exalted">Exalted</span>');
  else if (m.d === 'debilitated') b.push('<span class="bdg debilitated">Debilitated</span>');
  else if (m.d === 'own') b.push('<span class="bdg own">Own sign</span>');
  else if (m.d) b.push(`<span class="rel">${esc(REL_TXT[m.d] || m.d)}</span>`);
  if (m.dg) b.push('<span class="bdg digbala">Digbala</span>');
  if (m.mk) b.push('<span class="bdg marana">Maranakaraka</span>');
  if (m.pv) b.push(`<span class="bdg parivartana">Parivartana with ${esc(m.pv)}</span>`);
  return {html: b.join(' ')};
}
function dignityHTML(x) {
  const lab = {exalted: 'Exalted', debilitated: 'Debilitated', moolatrikona: 'Mulatrikona', own: 'Own sign'};
  const dp = x.dig_pts, sts = x.states || [];
  const nt = {};
  if (dp) {
    if (sts.includes('exalted')) nt.exalted = `peak ${dp.exalt.deg} ${dp.exalt.sign}`;
    if (sts.includes('debilitated')) nt.debilitated = `deepest ${dp.debil.deg} ${dp.debil.sign}`;
    if (x.sign === dp.mt.sign_idx) nt.mt = `Mulatrikona range ${dp.mt.from} to ${dp.mt.to} ${dp.mt.sign}`;
  }
  const st = sts.map(k => `<span class="bdg ${k}">${lab[k]}</span>` + (nt[k] ? ` <span class="rel">(${esc(nt[k])})</span>` : '')).join(' ');
  const mt = (nt.mt && !sts.includes('moolatrikona')) ? ` <span class="rel">(${esc(nt.mt)})</span>` : (nt.mt ? ` <span class="rel">(range ${esc(dp.mt.from)} to ${esc(dp.mt.to)} ${esc(dp.mt.sign)})</span>` : '');
  const rel = x.rel ? `<span class="rel">${esc(x.rel)}</span>` : '';
  const pu = (isPushkara(x.sign, x.deg) ? PUSH_BDG + ' ' : '') + (x.vargottama ? VARG_BDG + ' ' : '') + (x.digbala ? DIG_BDG + ' ' : '') + (x.marana ? '<span class="bdg marana" title="Maranakaraka sthana: a house that is difficult for this planet, counted from Lagna">Maranakaraka</span> ' : '') + (x.parivartana ? `<span class="bdg parivartana" title="Rasi parivartana: the two planets exchange signs">Parivartana with ${esc(x.parivartana)}</span> ` : '');
  return {html: pu + st + mt + (rel && (st || mt) ? ' ' : '') + rel};
}

/* ---------------------------------------------------------------- tabs */
const TABS = [
  {id: 'charts', title: 'Charts', load: loadCharts},
  {id: 'lagnas', title: 'Lagnas & Arudhas', load: loadLagnas},
  {id: 'strength', title: 'Strengths', load: loadStrength},
  {id: 'panchanga', title: 'Panchanga', load: loadPanchanga, lazy: true},
  {id: 'dasa', title: 'Vimsottari Dasa', load: loadDasa, lazy: true},
  {id: 'transit', title: 'Transits', load: loadTransit, lazy: true},
  {id: 'kp', title: 'KP', load: loadKP, lazy: true},
  {id: 'varsha', title: 'Varshaphala', load: loadVarsha, lazy: true},
  {id: 'tp', title: 'Tithi Pravesha', load: loadTP, lazy: true},
  {id: 'prasna', title: 'Prasna', load: loadPrasna, lazy: true},
  {id: 'clients', title: 'Clients', load: p => Cl.load(p), lazy: true},
  {id: 'saved', title: 'Saved', load: loadSaved, lazy: true},
];
function buildTabs() {
  $('#tabs').innerHTML = TABS.map(t => `<button data-t="${t.id}">${t.title}</button>`).join('');
  $('#panels').innerHTML = TABS.map(t => `<div class="panel card" id="p-${t.id}"></div>`).join('');
  $$('#tabs button').forEach(b => b.onclick = () => showTab(b.dataset.t));
}
function showTab(id) {
  S.tab = id;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === id));
  $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + id));
  const t = TABS.find(x => x.id === id);
  if (S.loaded[id] !== S.version) {
    S.loaded[id] = S.version;
    try { t.load($('#p-' + id)); } catch (e) { $('#p-' + id).innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
  }
}
function guard(fn) { return async (...a) => { try { setStatus('Working...'); await fn(...a); setStatus(''); } catch (e) { console.error(e); setStatus(e.message, true); } }; }


/* amsa number, ruler and devata of a position in divisional chart D-n (classical lists for the charts that have a standard one) */
const SIGN_LORDS = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const NAK_DEITY = ['Dastra (Ashwini Kumara)', 'Yama', 'Agni', 'Brahma', 'Chandra', 'Isa', 'Aditi', 'Jiva', 'Ahi', 'Pitara', 'Bhaga', 'Aryama', 'Surya', 'Tvashta', 'Marut', 'Sakragni', 'Mitra', 'Vasava', 'Rakshasa', 'Varuna', 'Visvadeva', 'Govinda', 'Vasu', 'Varuna', 'Ajapa', 'Ahirbudhanya', 'Pusha'];
const D60 = ['Ghora', 'Rakshasa', 'Deva', 'Kubera', 'Yaksha', 'Kinnara', 'Bhrashta', 'Kulaghna', 'Garala', 'Agni', 'Maya', 'Pureesha', 'Apampati', 'Marutvan', 'Kala', 'Ahibhaga', 'Amrita', 'Chandra', 'Mridu', 'Komala', 'Heramba', 'Brahma', 'Vishnu', 'Maheshwara', 'Deva', 'Ardra', 'Kalinasha', 'Kshiteeshwara', 'Kamalakara', 'Gulika', 'Mrityu', 'Kala', 'Davagni', 'Ghora', 'Yama', 'Kantaka', 'Sudha', 'Amrita', 'Poornachandra', 'Vishadagdha', 'Kulanasha', 'Vamshakshaya', 'Utpata', 'Kalaroopa', 'Saumya', 'Komala', 'Sheetala', 'Danshtrakarala', 'Indumukha', 'Praveena', 'Kalagni', 'Dandayudha', 'Nirmala', 'Saumya', 'Kroora', 'Atisheetala', 'Sudha', 'Payodheesha', 'Bhramana', 'Indurekha'];
const D20_ODD = ['Kali', 'Gauri', 'Jaya', 'Lakshmi', 'Vijaya', 'Vimala', 'Sati', 'Tara', 'Jvalamukhi', 'Sveta', 'Lalita', 'Bagalamukhi', 'Pratyangira', 'Sachi', 'Raudri', 'Bhavani', 'Varada', 'Jaya', 'Tripura', 'Sumukhi'];
const D20_EVEN = ['Daya', 'Megha', 'Chinnasirah', 'Pisachini', 'Dhumavati', 'Matangi', 'Bala', 'Bhadra', 'Aruna', 'Anala', 'Pingala', 'Chuchchuka', 'Ghora', 'Varahi', 'Vaishnavi', 'Sita', 'Bhuvaneshwari', 'Bhairavi', 'Mangala', 'Aparajita'];
const D24 = ['Skanda', 'Parashudhara', 'Anala', 'Vishwakarma', 'Bhaga', 'Mitra', 'Maya', 'Antaka', 'Vrishadhwaja', 'Govinda', 'Madana', 'Bhima'];
const D40 = ['Vishnu', 'Chandra', 'Marichi', 'Tvashta', 'Dhata', 'Shiva', 'Ravi', 'Yama', 'Yaksha', 'Gandharva', 'Kala', 'Varuna'];
/* Parasara (BPHS ch. 6). The position used is the rasi (D1) sign and degree; even signs reverse the order where the text says so. */
function amsaInfo(n, sign, deg) {
  if (n === 1 || sign === undefined || deg === undefined || deg === null) return null;
  const idx = Math.min(n - 1, Math.floor(deg / (30 / n))), odd = sign % 2 === 0, mode = sign % 3;   // mode 0 movable, 1 fixed, 2 dual
  const rv = k => odd ? idx : k - 1 - idx;                 // index counted from the end in even signs
  let ruler = '', dev = '';
  if (n === 2) { const sunH = (deg < 15) === odd; ruler = sunH ? 'Sun' : 'Moon'; dev = sunH ? 'Devas' : 'Pitris'; }
  else if (n === 3) dev = ['Narada', 'Agastya', 'Durvasa'][idx];
  else if (n === 4) dev = ['Sanaka', 'Sanandana', 'Sanatkumara', 'Sanatana'][idx];
  else if (n === 7) dev = ['Kshara (salt water)', 'Ksheera (milk)', 'Dadhi (curd)', 'Ghrita (ghee)', 'Ikshu rasa (cane juice)', 'Madya (wine)', 'Shuddha jala (pure water)'][rv(7)];
  else if (n === 9) dev = [['Deva', 'Manushya', 'Rakshasa'], ['Manushya', 'Rakshasa', 'Deva'], ['Rakshasa', 'Manushya', 'Deva']][mode][idx % 3];
  else if (n === 10) dev = ['Indra', 'Agni', 'Yama', 'Rakshasa', 'Varuna', 'Vayu', 'Kubera', 'Isana', 'Brahma', 'Ananta'][rv(10)];
  else if (n === 12) dev = ['Ganesha', 'Ashwini Kumara', 'Yama', 'Sarpa'][idx % 4];
  else if (n === 16) dev = ['Brahma', 'Vishnu', 'Shiva', 'Surya'][rv(16) % 4];
  else if (n === 20) dev = (odd ? D20_ODD : D20_EVEN)[idx];
  else if (n === 24) dev = D24[rv(24) % 12];
  else if (n === 27) dev = NAK_DEITY[rv(27)];
  else if (n === 30) {
    const lim = odd ? [5, 10, 18, 25, 30] : [5, 12, 20, 25, 30], pl = odd ? ['Mars', 'Saturn', 'Jupiter', 'Mercury', 'Venus'] : ['Venus', 'Mercury', 'Jupiter', 'Saturn', 'Mars'];
    const k = lim.findIndex(x => deg < x); ruler = pl[k < 0 ? 4 : k];
    dev = {Mars: 'Agni', Saturn: 'Vayu', Jupiter: 'Indra', Mercury: 'Kubera', Venus: 'Varuna'}[ruler];
  }
  else if (n === 40) dev = D40[idx % 12];
  else if (n === 45) dev = [['Brahma', 'Shiva', 'Vishnu'], ['Shiva', 'Vishnu', 'Brahma'], ['Vishnu', 'Brahma', 'Shiva']][mode][idx % 3];
  else if (n === 60) dev = D60[rv(60)];
  return {no: idx + 1, ruler, dev};
}

/* ---- Charts */
function loadCharts(p) {
  const c = S.chart;
  if (!c) { p.innerHTML = '<p>Enter birth details and press Calculate.</p>'; return; }
  const opts = n => VARGAS.map(v => `<option value="${v}"${v === n ? ' selected' : ''}>D${v} ${esc(c.vargas[v].name)}</option>`).join('') + '<option value="C">Bhava Chalit</option>';
  const m = c.meta;
  const bp = c.panchanga, moon = c.planets.find(x => x.name === 'Moon');
  const bc = [['Lagna', `${c.asc.sign_name} ${c.asc.dms}`], ['Lagna star', `${c.asc.nak}, pada ${c.asc.pada}, ${c.asc.nak_lord}`],
    ['Moon sign', moon.sign_name], ['Moon star', `${bp.nakshatra}, pada ${bp.pada}, ${bp.nakshatra_lord}`],
    ['Vara', bp.vara], ['Tithi', `${bp.tithi} (${bp.tithi_elapsed_pct}%)`], ['Yoga', bp.yoga], ['Karana', bp.karana], ['Hora lord', bp.hora_lord],
    ['Sunrise', String(bp.sunrise).slice(-5)], ['Sunset', String(bp.sunset).slice(-5)], ['Rahu kalam', bp.rahu_kalam], ['Yama gandam', bp.yama_gandam], ['Gulika kalam', bp.gulika_kalam]];
  p.innerHTML = `<div class="bc">${bc.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}</div>
    <div class="row" style="margin-top:12px"><label>Chart 1<select id="vL">${opts(1)}</select></label><label>Chart 2<select id="vR">${opts(9)}</select></label>
      <label class="chk"><input type="checkbox" id="sh3"${S.show.c3 ? ' checked' : ''}> Add Chart 3</label><label id="vMw"${S.show.c3 ? '' : ' hidden'}>Chart 3<select id="vM">${opts(+S.show.v3 || 10)}</select></label>
      <label id="chMw" hidden>Bhava Chalit method<select id="chM">${Object.keys(CH_LABEL).map(k => `<option value="${k}"${k === chalitMethod() ? ' selected' : ''}>${CH_LABEL[k]}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="shLA"${S.show.la ? ' checked' : ''}> Lagnas &amp; Arudhas</label>
      <label class="chk"><input type="checkbox" id="shUp"${S.show.up ? ' checked' : ''}> Upagrahas (Gulika, Mandi and others)</label></div>
    ${legend([[COL.lagna, 'Special lagnas'], [COL.aru, 'Arudha padas'], [COL.upa, 'Upagrahas']])}
    ${markLegend()}
    <div class="two" id="cRow"><div class="chartbox" id="cL"></div><div class="chartbox" id="cR"></div><div class="chartbox" id="cM" hidden></div></div>
    <h3>Positions (sidereal)</h3><div class="row"><label>Chart<select id="posV">${VARGAS.map(v => `<option value="${v}"${v === 1 ? ' selected' : ''}>D${v} ${v === 1 ? 'Rasi' : esc(c.vargas[v].name)}</option>`).join('')}<option value="C">Bhava Chalit</option></select></label></div><div id="postab"></div>
    <h3>Divisional positions</h3><div id="vtab"></div>`;
  const draw = () => {
    S.show.la = $('#shLA').checked; S.show.up = $('#shUp').checked; S.show.c3 = $('#sh3').checked; S.show.v3 = $('#vM').value;
    $('#chMw').hidden = ![$('#vL').value, $('#vR').value, S.show.c3 ? $('#vM').value : '', $('#posV') ? $('#posV').value : ''].includes('C');
    $('#vMw').hidden = !S.show.c3; $('#cM').hidden = !S.show.c3; $('#cRow').classList.toggle('three', S.show.c3);
    drawChart($('#cL'), c, vsel($('#vL').value)); drawChart($('#cR'), c, vsel($('#vR').value));
    if (S.show.c3) drawChart($('#cM'), c, vsel($('#vM').value));
  };
  $('#vL').onchange = draw; $('#vR').onchange = draw; $('#vM').onchange = draw; $('#sh3').onchange = draw; $('#shLA').onchange = draw; $('#shUp').onchange = draw;
  draw();
  const ORD = ['Sun', 'Moon', 'Mercury', 'Mars', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const pls = ORD.map(n => c.planets.find(x => x.name === n)).filter(Boolean).concat(c.planets.filter(x => !ORD.includes(x.name)));
  const starTxt = x => x.nak ? `${x.nak} ${x.pada}` : '';
  const SIGNN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const drawPos = () => {
    if ($('#posV').value === 'C') {
      const ch = c.chalit, inB = {};
      Object.keys(ch.planets).forEach(nm => (inB[ch.planets[nm]] = inB[ch.planets[nm]] || []).push(nm));
      const mv = c.planets.filter(x => ch.planets[x.name] && ch.planets[x.name] !== x.house).map(x => `${x.name} (house ${x.house} in Rasi, bhava ${ch.planets[x.name]})`);
      $('#postab').innerHTML = tbl(['Bhava', 'Begins', 'Madhya (centre)', 'Ends', 'Planets'], ch.rows.map(r => [r.house, `${SIGNN[r.begin_sign]} ${r.begin}`, `${SIGNN[r.madhya_sign]} ${r.madhya}`, `${SIGNN[r.end_sign]} ${r.end}`, (inB[r.house] || []).join(', ')]), {num: [0]})
        + `<p class="note">${esc(chalitTitle(c))}: ${esc(CH_NOTE[ch.method] || '')} ${ch.note ? esc(ch.note) + ' ' : ''}${mv.length ? 'Planets that change house: ' + esc(mv.join('; ')) + '.' : 'No planet changes house from the Rasi chart.'}</p>`;
      return;
    }
    const n = +$('#posV').value;
    if (n === 1) {
      const rows = [['Lagna', c.asc.sign_name, c.asc.dms, `${c.asc.nak} ${c.asc.pada}`, c.asc.nak_lord, 1, isPushkara(c.asc.sign, c.asc.deg) ? {html: PUSH_BDG} : '', '', '']];
      pls.forEach(x => rows.push([x.name, x.sign_name, x.dms, starTxt(x), x.nak_lord, x.house, dignityHTML(x), f(x.speed, 4), (x.retro && !['Rahu', 'Ketu'].includes(x.name) ? 'R ' : '') + (x.combust ? 'Combust' : '')]));
      c.lagnas.forEach(x => rows.push([x.name, x.sign_name, x.dms, starTxt(x), x.nak_lord || '', x.house, '', '', 'Special lagna']));
      c.upagrahas.forEach(x => rows.push([x.name, x.sign_name, x.dms, starTxt(x), x.nak_lord || '', x.house, '', '', 'Upagraha']));
      $('#postab').innerHTML = tbl(['Body', 'Sign', 'Degree', 'Nakshatra', 'Star lord', 'House', 'Dignity / relation', 'Speed/day', 'State'], rows, {num: [5]})
        + '<p class="note">Dignity: Exalted, Mulatrikona, Own sign or Debilitated where it applies; otherwise the compound (natural plus temporal) relation to the sign lord.</p>';
      return;
    }
    const v = c.vargas[n], d1 = {Lagna: c.asc.sign};
    c.planets.forEach(x => d1[x.name] = x.sign); c.lagnas.forEach(x => d1[x.name] = x.sign); c.upagrahas.forEach(x => d1[x.name] = x.sign);
    const dg = x => (x === undefined || x === null) ? '' : DM(x);
    const v1 = c.vargas['1'], d1d = {Lagna: v1.asc_deg, ...v1.pos, ...v1.lagna_pos, ...v1.upa_pos};
    let anyDev = false;
    const rows = [], add = (nm, sg, deg, kind) => {
      if (sg === undefined) return;
      const am = amsaInfo(n, d1[nm], d1d[nm]);
      if (am && am.dev) anyDev = true;
      rows.push([nm, SIGNN[sg], dg(deg), ((sg - v.asc + 12) % 12) + 1, divDig(v, nm), d1[nm] !== undefined ? SIGNN[d1[nm]] : '', kind, am ? am.no : '', am ? (am.ruler || SIGN_LORDS[sg]) : SIGN_LORDS[sg], am ? am.dev : '']);
    };
    add('Lagna', v.asc, v.asc_deg, '');
    ORD.forEach(nm => add(nm, v.planets[nm], v.pos[nm], ''));
    c.lagnas.forEach(x => add(x.name, v.lagnas[x.name], v.lagna_pos[x.name], 'Special lagna'));
    c.upagrahas.forEach(x => add(x.name, v.upa[x.name], v.upa_pos[x.name], 'Upagraha'));
    $('#postab').innerHTML = tbl([`Body (D${n} ${v.name})`, `Sign in D${n}`, 'Degree', `House in D${n}`, `Dignity / relation in D${n}`, 'Rasi (D1) sign', 'Type', `Amsa no. (of ${n})`, 'Amsa ruler', 'Devata'], rows, {num: [3, 7]})
      + `<p class="note">Houses are counted from the D${n} Lagna (${SIGNN[v.asc]}). Amsa ruler is the lord of the divisional sign (in D2 and D30 the lord of that part). ${anyDev ? 'Devatas follow Parasara (BPHS chapter 6), counted from the Rasi sign and degree, in reverse for even signs where the text says so.' : 'No standard devata list is used for this chart.'}</p>`;
  };
  $('#posV').onchange = () => { drawPos(); draw(); };
  $('#chM').onchange = () => { try { localStorage.setItem('jt_chalit', $('#chM').value); } catch (e) { /* ignore */ } applyChalit(c); draw(); drawPos(); };
  drawPos();
  const bodies = ['Lagna', ...ORD, ...c.lagnas.map(x => x.name), ...UPAS];
  const vr = bodies.map(b => [b, ...VARGAS.map(n => { const v = c.vargas[n]; const s = b === 'Lagna' ? v.asc : (b in v.planets ? v.planets[b] : (b in v.upa ? v.upa[b] : v.lagnas[b])); return SA[s]; })]);
  $('#vtab').innerHTML = tbl(['Body', ...VARGAS.map(n => 'D' + n)], vr);
}

/* ---- Lagnas & arudhas */
function loadLagnas(p) {
  const c = S.chart; if (!c) { p.innerHTML = '<p>Calculate first.</p>'; return; }
  const lr = [c.asc, ...c.lagnas, ...c.upagrahas].map(x => [x.name, x.sign_name, x.dms, `${x.nak} ${x.pada}`, x.nak_lord || '', x.house]);
  const kr = k => tbl(['Karaka', 'Planet', 'Degree in sign'], k.map(x => [x.karaka, x.planet, x.deg.toFixed(3)]), {num: [2]});
  p.innerHTML = `<h3>Special lagnas and upagrahas</h3>${tbl(['Point', 'Sign', 'Degree', 'Nakshatra', 'Star lord', 'House'], lr, {num: [5]})}
    <div class="two"><div><h3>Chara karakas (8-karaka scheme)</h3>${kr(c.karakas8)}</div><div><h3>Chara karakas (7-karaka scheme)</h3>${kr(c.karakas7)}</div></div>
    <h3>Arudha padas</h3><div class="row"><label>Divisional chart<select id="arV">${VARGAS.map(v => `<option value="${v}">D${v}</option>`).join('')}</select></label></div>
    <div id="arT"></div><h3>Arudha padas across the 16 shodasa vargas</h3><div id="arAll"></div>
    <p class="note">Houses 1 and 7 from the house itself are replaced by the 10th (standard Parasara rule). Scorpio and Aquarius use Mars and Saturn as lords.</p>`;
  const names = ['AL', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'UL'];
  const show = () => { const n = $('#arV').value; const asc = c.vargas[n].asc; $('#arT').innerHTML = tbl(['Pada', 'Sign', 'House from lagna'], c.arudhas[n].map((s, i) => [names[i], SIGNS[s], (s - asc + 12) % 12 + 1]), {num: [2]}); };
  $('#arV').onchange = show; show();
  $('#arAll').innerHTML = tbl(['Pada', ...SHODASA.map(n => 'D' + n)], names.map((nm, i) => [nm, ...SHODASA.map(n => SA[c.arudhas[n][i]])]));
}

/* ---- Strength */
function loadStrength(p) {
  const c = S.chart; if (!c) { p.innerHTML = '<p>Calculate first.</p>'; return; }
  const sb = c.shadbala;
  const rows = PL7.map(n => { const r = sb[n]; return [n, f(r.sthana, 1), f(r.dig, 1), f(r.kala, 1), f(r.cheshta, 1), f(r.naisargika, 1), f(r.drik, 1), f(r.total, 1), f(r.rupas, 2), f(r.required, 2), {html: `<span class="${r.ratio >= 1 ? 'good' : 'bad'}">${f(r.ratio, 2)}</span>`}, r.rank, f(r.ishta, 1), f(r.kashta, 1)]; });
  const comp = PL7.map(n => { const r = sb[n]; return [n, f(r.uccha, 1), f(r.saptavargaja, 1), f(r.ojayugma, 1), f(r.kendradi, 1), f(r.drekkana, 1), f(r.nathonnata, 1), f(r.paksha, 1), f(r.tribhaga, 1), f(r.abda, 1), f(r.masa, 1), f(r.vara, 1), f(r.hora, 1), f(r.ayana, 1)]; });
  const vm = c.vimsopaka;
  const vrows = PL7.map(n => [n, vm.shadvarga[n], vm.saptavarga[n], vm.dasavarga[n], vm.shodasavarga[n]]);
  const av = c.avasthas;
  const arows = PL7.map(n => [n, av[n].age, av[n].alertness, av[n].mood]);
  p.innerHTML = `<h3>Shadbala (virupas)</h3>${tbl(['Planet', 'Sthana', 'Dig', 'Kala', 'Cheshta', 'Naisargika', 'Drik', 'Total', 'Rupas', 'Required', 'Ratio', 'Rank', 'Ishta', 'Kashta'], rows, {num: [1,2,3,4,5,6,7,8,9,10,11,12,13]})}
    <p class="note">Ratio at or above 1.00 meets the classical minimum. Year lord ${esc(c.shadbala_notes.year_lord)}, month lord ${esc(c.shadbala_notes.month_lord)}, weekday lord ${esc(c.shadbala_notes.vara_lord)}, hora lord ${esc(c.shadbala_notes.hora_lord)}.</p>
    <details><summary>Component breakdown</summary>${tbl(['Planet', 'Uccha', 'Saptavargaja', 'Ojayugma', 'Kendradi', 'Drekkana', 'Nathonnata', 'Paksha', 'Tribhaga', 'Abda', 'Masa', 'Vara', 'Hora', 'Ayana'], comp, {num: [1,2,3,4,5,6,7,8,9,10,11,12,13]})}</details>
    <h3>Vimsopaka bala (out of 20)</h3>${tbl(['Planet', 'Shadvarga', 'Saptavarga', 'Dasavarga', 'Shodasavarga'], vrows, {num: [1,2,3,4]})}
    <h3>Ashtakavarga</h3><div class="row"><label>Divisional chart<select id="avV">${VARGAS.map(v => `<option value="${v}">D${v}</option>`).join('')}</select></label></div><div id="avT"></div>
    <h3>Avasthas</h3>${tbl(['Planet', 'Age (Baladi)', 'Alertness (Jagradadi)', 'Mood (Deeptadi)'], arows)}`;
  const show = () => {
    const n = $('#avV').value; const a = c.ashtakavarga[n]; const asc = c.vargas[n].asc;
    const r = PL7.map(pl => [pl, ...a.bav[pl], a.bav_total[pl]]);
    const sav = ['SAV', ...a.sav, a.sav_total]; sav._cls = 'cur'; r.push(sav);
    $('#avT').innerHTML = tbl(['', ...SA.map((s, i) => i === asc ? s + ' (Asc)' : s), 'Total'], r, {num: [1,2,3,4,5,6,7,8,9,10,11,12,13]}) + '<p class="note">Columns are signs from Aries; the lagna sign is marked. BAV totals must be 48/49/39/54/56/52/39 and SAV 337.</p>';
  };
  $('#avV').onchange = show; show();
}

/* ---- Panchanga */
const kt = (s, day) => s.slice(0, 10) === day ? s.slice(11) : s.slice(5, 16);   // time, with the date when it is on another day
function loadPanchanga(p) {
  const d = defaultPlace();
  p.innerHTML = `<div class="mu-nav" id="pnSub"><button data-s="panchanga" class="on">Panchanga</button><button data-s="muhurta">Muhurta finder</button><button data-s="market">Market view</button><button data-s="calendar">Calendar</button><button data-s="brief">My day</button><button data-s="alerts">Alerts</button></div>
    <div id="pnMain"><div class="row">${placeField('pn', d)}<label>Date<input type="date" id="pnDate" value="${todayStr()}"></label>
    <button class="run" id="pnDay">Day panchanga</button>
    <label>Month<input type="month" id="pnMonth" value="${todayStr().slice(0, 7)}"></label><button class="sec" id="pnMon">Monthly panchanga</button></div><div id="pnOut"></div></div>
    <div id="pnMuh" hidden></div><div id="pnMkt" hidden></div><div id="pnCal" hidden></div><div id="pnBrief" hidden></div><div id="pnAlerts" hidden></div>`;
  let muMounted = false, mkMounted = false, calMounted = false;
  $$('#pnSub button').forEach(b => b.onclick = () => {
    $$('#pnSub button').forEach(x => x.classList.toggle('on', x === b));
    const k = b.dataset.s;
    $('#pnMain').hidden = k !== 'panchanga'; $('#pnMuh').hidden = k !== 'muhurta'; $('#pnMkt').hidden = k !== 'market';
    $('#pnCal').hidden = k !== 'calendar'; $('#pnBrief').hidden = k !== 'brief'; $('#pnAlerts').hidden = k !== 'alerts';
    if (k === 'calendar') { if (!calMounted) { calMounted = true; Extra.calMount($('#pnCal')); } }
    if (k === 'brief') Extra.briefMount($('#pnBrief'));
    if (k === 'alerts') Extra.alMount($('#pnAlerts'));
    if (k === 'muhurta' && typeof Muh !== 'undefined') { if (!muMounted) { muMounted = true; Muh.mount($('#pnMuh')); } else Muh.applyPending(); }
    if (k === 'market' && typeof Mkt !== 'undefined' && !mkMounted) { mkMounted = true; Mkt.mount($('#pnMkt')); }
  });
  bindPlaceField('pn');
  const common = () => { const pl = readPlaceField('pn'); return {lat: pl.lat, lon: pl.lon, tz: pl.tz, cfg: getCfg()}; };
  const fdt = s => s ? `${+s.slice(8, 10)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+s.slice(5, 7) - 1]} ${s.slice(11, 16)}` : '-';
  $('#pnDay').onclick = guard(async () => {
    const r = await api('/api/panchanga/day', {...common(), date: $('#pnDate').value});
    let nowP = ''; try { nowP = new Date().toLocaleString('sv-SE', {timeZone: common().tz}).slice(0, 16); } catch (e) { nowP = ''; }
    const segs = (arr, extra) => tbl(['Name', 'Starts', 'Ends'], arr.map(x => [x.name, fdt(x.start), fdt(x.end)]));
    $('#pnOut').innerHTML = kv([['Date', `${r.date} ${r.weekday}`], ['Sunrise', r.sunrise.slice(11)], ['Sunset', r.sunset.slice(11)], ['Moonrise', (r.moonrise || '-').slice(5)], ['Moonset', (r.moonset || '-').slice(5)], ['Sun sign', r.sun_sign], ['Day length (h)', r.day_length_h], ['Ayanamsa', r.ayanamsa]])
      + `<div class="two"><div><h3>Tithi</h3>${segs(r.tithi)}<h3>Karana</h3>${segs(r.karana)}</div><div><h3>Nakshatra</h3>${segs(r.nakshatra)}<h3>Yoga</h3>${segs(r.yoga)}<h3>Moon sign</h3>${segs(r.moon_sign)}</div></div>`
      + `<h3>Kalams</h3>${tbl(['Period', 'From', 'To'], Object.entries(r.kalams).map(([k, v]) => [k, kt(v[0], r.date), kt(v[1], r.date)]).concat(Object.keys(r.kalams).some(k => k.startsWith('Amrita')) ? [] : [['Amrita Kalam', 'none in this day', '']]))}`
      + `<h3>Horas</h3>${tbl(['#', 'Lord', 'From', 'To', ''], r.horas.map(h => Object.assign([h.n, h.lord, h.start.slice(0, 16), h.end.slice(0, 16), (h.night ? 'night' : 'day') + (nowP >= h.start.slice(0, 16) && nowP < h.end.slice(0, 16) ? ' - running now' : '')], nowP >= h.start.slice(0, 16) && nowP < h.end.slice(0, 16) ? {_cls: 'cur-row'} : {})), {num: [0]})}`;
  });
  $('#pnMon').onclick = guard(async () => {
    const [y, m] = $('#pnMonth').value.split('-');
    const r = await api('/api/panchanga/month', {...common(), year: +y, month: +m});
    $('#pnOut').innerHTML = tbl(['Date', 'Day', 'Sunrise', 'Sunset', 'Tithi (at sunrise)', 'Tithi ends', 'Nakshatra', 'Ends', 'Yoga', 'Karana', 'Moon in', 'Rahu kalam', 'Yama gandam', 'Gulika kalam', 'Amrita kalam'],
      r.map(x => [x.date, x.weekday, x.sunrise, x.sunset, x.tithi, x.tithi_end, x.nakshatra, x.nak_end, x.yoga, x.karana, x.moon_sign, x.rahu, x.yama, x.gulika, x.amrita || '-']));
  });
}

/* ---- Dasa */
function loadDasa(p) {
  p.innerHTML = `<div class="row"><label>Running dasa as of<input type="datetime-local" id="dsWhen" value="${nowLocal()}"></label>
    <label>Depth<select id="dsDepth"><option value="2">Maha + Antar</option><option value="3" selected>+ Pratyantar</option></select></label><button class="run" id="dsRun">Show dasas</button></div><div id="dsOut"></div>`;
  $('#dsRun').onclick = guard(async () => {
    const r = await api('/api/dasa', payload({depth: +$('#dsDepth').value, when: $('#dsWhen').value, tz: TZ}));
    const now = r.at.when.slice(0, 10);
    const isCur = x => x.start <= now && now < x.end;
    const leaf = x => `<div class="dd1${isCur(x) ? ' cur' : ''}"><b>${x.lord}</b> ${x.start} to ${x.end}</div>`;
    const render = x => x.sub ? `<details class="dd1"${isCur(x) ? ' open' : ''}><summary${isCur(x) ? ' class="cur"' : ''}><b>${x.lord}</b> ${x.start} to ${x.end}</summary>${x.sub.map(render).join('')}</details>` : leaf(x);
    $('#dsOut').innerHTML = kv([['Moon nakshatra', r.moon_nakshatra], ['Dasa at birth', r.start_lord], ['Balance at birth', r.balance_ymd], ['Year length (days)', r.year_days]])
      + `<h3>Running at ${esc(r.at.when)}</h3>` + tbl(['Level', 'Lord', 'From', 'To'], r.at.path.map(x => [x.level, x.lord, x.start, x.end]))
      + `<h3>Mahadasa tree</h3>${r.periods.map(render).join('')}`;
  });
  $('#dsRun').click();
}

/* ---- Transits */
const fmtDur = d => `${d.d}d ${String(d.h).padStart(2, '0')}h ${String(d.m).padStart(2, '0')}m ${String(d.s).padStart(2, '0')}s`;
function loadTransit(p) {
  const d = birthPlace();
  const c0 = S.chart;
  if (!c0) { p.innerHTML = '<p>Calculate first.</p>'; return; }
  const old = document.getElementById('trTip'); if (old) old.remove();
  const opts = n => VARGAS.map(v => `<option value="${v}"${v === n ? ' selected' : ''}>D${v} ${esc(c0.vargas[v].name)}</option>`).join('');
  p.innerHTML = `<div class="row">${placeField('tr', d)}<label>Transit date and time (at that location)<input type="datetime-local" step="1" id="trWhen" value="${nowIn(d.tz)}"></label>
      <button class="sec" id="trNow">Now</button><button class="run" id="trRun">Show transits</button></div>
    <p class="note">Location defaults to the birth place. The time is read in that location's time zone. Hover (or tap) a transit planet or the transit lagna (La) in a chart for how long ago it entered its sign and how long until it leaves. Drag one to a sign in a D1 chart (or use Move in the tap box) to jump to the moment it reaches that position.</p>
    <div class="row"><label>Left chart<select id="trVL">${opts(1)}</select></label><label>Right chart<select id="trVR">${opts(9)}</select></label>
      <label>Lagna frame<select id="trFrame"><option value="transit">Transit lagna at location</option><option value="natal">Natal lagna</option></select></label>
      <label class="chk"><input type="checkbox" id="trNatal"> Include natal planet positions</label></div>
    <div id="trMove" class="movebox" style="display:none"></div>
    <div id="trOut"></div>
    <h3>Transit calendar</h3><div class="row"><label>From<input type="date" id="tcFrom" value="${todayStr()}"></label><label>Span<select id="tcM"><option value="12">12 months</option><option value="24" selected>24 months</option><option value="36">36 months</option><option value="60">60 months</option></select></label><button class="sec" id="tcRun">Build calendar</button></div><div id="tcOut"></div>`;
  bindPlaceField('tr', false, r => { $('#trWhen').value = nowIn(r.tz); });
  let last = null, cache = new Map();
  const locBody = () => { const pl = readPlaceField('tr'); return {lat: pl.lat, lon: pl.lon, tz: pl.tz, label: pl.label}; };
  const locOf = r => ({lat: r.loc.lat, lon: r.loc.lon, tz: r.loc.tz, label: r.loc.label});
  const drawAll = () => {
    if (!last) return;
    const r = last, tc = r.chart, nat = S.chart;
    const withNatal = $('#trNatal').checked, natalFrame = $('#trFrame').value === 'natal';
    const one = (el, n) => {
      const tv = tc.vargas[String(n)], nv = nat.vargas[String(n)];
      let items = planetItems(tc, n, {body: true});
      items.push({sign: tv.asc, text: 'La ' + DM(tv.asc_deg), color: COL.tlagna, bold: true, body: 'Lagna'});
      if (withNatal) items = items.concat(planetItems(nat, n, {color: COL.natal}));
      const asc = natalFrame ? nv.asc : tv.asc;
      el.dataset.n = n; el._asc = asc;
      el.innerHTML = chartSVG({style: styleNow(), asc, items, title: `D${n} ${tv.name} transit`});
    };
    one($('#trCL'), +$('#trVL').value); one($('#trCR'), +$('#trVR').value);
    $('#trLeg').innerHTML = legend([[COL.planet, 'Transit planets'], [COL.tlagna, 'Transit lagna (La)'], ...(withNatal ? [[COL.natal, 'Natal planets']] : [])])
      + `<p class="note">${natalFrame ? 'Houses counted from the natal lagna.' : 'Houses counted from the transit lagna at ' + esc(r.loc.label) + '.'}</p>`;
  };
  const render = r => {
    last = r; cache = new Map(); hideTip(true);
    const mv = r.moved;
    const banner = mv ? `<div class="moved"><b>${esc(mv.body)}</b> reaches <b>${esc(mv.sign)} ${esc(mv.deg)}</b> on <b>${esc(mv.when)}</b> (${esc(r.loc.tz)}), ${fmtDur(mv.dur)} ${mv.direction === 'prev' ? 'before' : 'after'} ${esc(mv.from_when)}${mv.retro ? ', while retrograde' : ''}. Charts and tables below are for that moment.</div>` : '';
    $('#trWhen').value = r.when_iso;
    $('#trOut').innerHTML = banner + kv([['Location', `${r.loc.label} (${r.loc.lat.toFixed(2)}, ${r.loc.lon.toFixed(2)}, ${r.loc.tz})`], ['Time', r.when_iso.replace('T', ' ')], ['Transit lagna', `${r.transit_lagna.sign} ${r.transit_lagna.dms}`], ['Natal lagna', r.lagna], ['Natal Moon sign', r.moon_sign], ['Saturn status', r.sade_sati || 'None']])
      + '<div id="trLeg"></div><div class="two"><div class="chartbox" id="trCL"></div><div class="chartbox" id="trCR"></div></div>'
      + tbl(['Planet', 'Sign', 'Degree', 'Nakshatra', 'Motion', 'House from lagna', 'House from Moon', 'Own BAV bindus', 'SAV of sign', 'Gochara from Moon'],
        r.rows.map(x => [x.planet, x.sign, x.deg, `${x.nakshatra} ${x.pada}`, x.retro ? 'Retro' : 'Direct', x.house_lagna, x.house_moon, x.bindus ?? '', x.sav, {html: `<span class="${x.favorable ? 'good' : 'bad'}">${x.favorable ? 'Favourable' : 'Unfavourable'}</span>`}]), {num: [5, 6, 7, 8]});
    drawAll();
  };
  /* ---- hover / tap tooltip with time to next and previous sign */
  const tip = document.createElement('div'); tip.id = 'trTip'; tip.className = 'tip'; tip.style.display = 'none'; document.body.appendChild(tip);
  function hideTip(force) { if (tip.dataset.pinned === '1' && !force) return; tip.style.display = 'none'; tip.dataset.pinned = ''; tip.dataset.name = ''; }
  /* keep the whole box inside the window: shift left, or flip above the item when there is no room below */
  function fitTip() {
    const r = tip._r; if (!r) return;
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let left = Math.min(r.left, vw - w - 8); left = Math.max(8, left);
    let top = r.bottom + 6; if (top + h > vh - 8 && r.top - h - 6 >= 8) top = r.top - h - 6;
    tip.style.left = left + 'px'; tip.style.top = Math.max(8, top) + 'px';
  }
  const bodyInfo = name => {
    if (name === 'Lagna') { const a = last.chart.asc; return {name: 'Lagna', sign_name: a.sign_name, sign: a.sign, dms: a.dms, retro: false}; }
    const x = last.chart.planets.find(q => q.name === name);
    return {name, sign_name: x.sign_name, sign: x.sign, dms: x.dms, retro: x.retro || name === 'Rahu' || name === 'Ketu'};
  };
  async function getTimes(name) {
    if (!cache.has(name)) cache.set(name, api('/api/transit/signtimes', payload({when: last.when_iso, loc: locOf(last), body: name})));
    return cache.get(name);
  }
  const horTxt = hor => hor / 365.25 >= 1 ? Math.round(hor / 365.25) + ' years' : hor + ' days';
  const evLine = (label, e, hor, tail) => e
    ? `<tr><td>${label}</td><td class="n"><b>${tail === 'ago' ? fmtDur(e.dur) + ' ago' : 'in ' + fmtDur(e.dur)}</b></td><td>${esc(e.when)}${e.retro && tail !== 'ago' ? ' <span class="bad">retro</span>' : ''}</td></tr>`
    : `<tr><td>${label}</td><td colspan="2">not within ${horTxt(hor)}</td></tr>`;
  async function showTip(el, pinned) {
    if (!last) return;
    const name = el.dataset.body, bi = bodyInfo(name);
    const r = el.getBoundingClientRect();
    tip.style.display = 'block'; tip.dataset.name = name; tip.dataset.pinned = pinned ? '1' : '';
    tip._r = r;
    const head = `<div class="th"><b>${name === 'Lagna' ? 'Transit lagna' : esc(name)}</b> in ${esc(bi.sign_name)} ${esc(bi.dms)}${bi.retro ? ' <span class="bad">retrograde</span>' : ''}</div>`;
    const foot = pinned ? `<div class="tf"><button class="sec" data-mv="${esc(name)}">Move ${esc(name === 'Lagna' ? 'lagna' : name)}...</button> <button class="sec" data-close="1">Close</button></div>` : '<div class="tf note">Click to pin and move</div>';
    tip.innerHTML = head + '<div class="note">Calculating...</div>' + foot; fitTip();
    try {
      const t = await getTimes(name);
      if (tip.dataset.name !== name) return;
      const cur = SIGNS[t.sign], ahead = SIGNS[(t.sign + 1) % 12];
      const rows = evLine(`Entered ${cur} from <b>${t.since ? esc(t.since.sign) : '?'}</b>`, t.since, t.horizon_days, 'ago')
        + evLine(`Leaves ${cur} for <b>${t.until ? esc(t.until.sign) : '?'}</b>`, t.until, t.horizon_days, 'in')
        + (t.station ? `<tr><td>Turns ${t.station.kind}</td><td class="n"><b>in ${fmtDur(t.station.dur)}</b></td><td>${esc(t.station.when)}</td></tr>` : '');
      let note = '';
      if (t.retro) note = t.until && t.until.sign === ahead && t.station
        ? 'Retrograde now: it turns direct before reaching the sign behind, so it leaves forward.'
        : 'Retrograde now: it moves backward, so it leaves into the sign behind and came in from the sign ahead.';
      tip.innerHTML = head + `<table><tbody>${rows}</tbody></table>` + (note ? `<div class="note">${note}</div>` : '') + foot; fitTip();
    } catch (e) { tip.innerHTML = head + `<div class="bad">${esc(e.message)}</div>` + foot; fitTip(); }
  }
  /* ---- move box */
  function openMove(name, signIdx) {
    const bi = bodyInfo(name);
    const [dd, mm] = (bi.dms.match(/(\d+)°(\d+)/) || [0, 0, 0]).slice(1).map(Number);
    const sg = signIdx === undefined ? bi.sign : signIdx;
    const box = $('#trMove');
    box.style.display = 'block';
    box.innerHTML = `<b>Move ${name === 'Lagna' ? 'transit lagna' : esc(name)}</b> (now ${esc(bi.sign_name)} ${esc(bi.dms)}) to
      <label>Sign<select id="mvSign">${SIGNS.map((x, i) => `<option value="${i}"${i === sg ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Degree<input type="number" id="mvDeg" min="0" max="29" value="${dd}" style="width:70px"></label>
      <label>Minute<input type="number" id="mvMin" min="0" max="59" value="${mm}" style="width:70px"></label>
      <label>Find<select id="mvDir"><option value="next">Next time it is there</option><option value="prev">Last time it was there</option></select></label>
      <button id="mvGo">Show transits at that moment</button><button class="sec" id="mvX">Cancel</button>`;
    $('#mvX').onclick = () => { box.style.display = 'none'; };
    $('#mvGo').onclick = guard(async () => {
      const r = await api('/api/transit/move', payload({when: last.when_iso, loc: locOf(last), body: name, sign: +$('#mvSign').value, deg: +$('#mvDeg').value + (+$('#mvMin').value) / 60, direction: $('#mvDir').value}));
      box.style.display = 'none';
      render(r);
    });
  }
  S.openMove = openMove;
  /* ---- events (delegated, so they survive re-rendering) */
  let dragging = null, suppress = false;
  const pi = e => (e.target && e.target.closest) ? e.target.closest('.pi') : null;
  p.addEventListener('pointerover', e => { const t = pi(e); if (!t || dragging || e.pointerType === 'touch' || tip.dataset.pinned === '1') return; showTip(t, false); });
  p.addEventListener('pointerout', e => { const t = pi(e); if (t && tip.dataset.pinned !== '1') hideTip(); });
  p.addEventListener('click', e => { const t = pi(e); if (suppress) { suppress = false; return; } if (t) { hideTip(true); showTip(t, true); e.stopPropagation(); } });
  const docClick = e => {
    const b = e.target.closest && e.target.closest('#trTip button');
    if (b && b.dataset.mv) { const nm = b.dataset.mv; hideTip(true); openMove(nm); return; }
    if (b && b.dataset.close) { hideTip(true); return; }
    if (tip.dataset.pinned === '1' && !(e.target.closest && (e.target.closest('#trTip') || e.target.closest('.pi')))) hideTip(true);
  };
  p.addEventListener('pointerdown', e => {
    const t = pi(e); if (!t || e.pointerType === 'touch' || (e.button !== undefined && e.button > 0)) return;
    const box = t.closest('.chartbox'); if (!box || box.dataset.n !== '1') return;
    e.preventDefault();
    dragging = {name: t.dataset.body, box, x0: e.clientX, y0: e.clientY, active: false, ghost: null, sign: -1, label: t.textContent.trim()};
  });
  const svgPoint = (box, e) => { const r = box.querySelector('svg').getBoundingClientRect(); return [(e.clientX - r.left) / (r.width || 400) * 400, (e.clientY - r.top) / (r.height || 400) * 400]; };
  const setHL = (box, sign) => {
    const svg = box.querySelector('svg'); const o = svg.querySelector('#dropHL'); if (o) o.remove();
    if (sign < 0) return;
    const pts = signPoly(styleNow(), box._asc, sign).map(q => q.join(',')).join(' ');
    svg.insertAdjacentHTML('beforeend', `<polygon id="dropHL" points="${pts}" fill="var(--acc2)" fill-opacity=".2" stroke="var(--acc2)" stroke-width="3" pointer-events="none"/>`);
  };
  const onMove = e => {
    if (!dragging) return;
    if (!dragging.active) {
      if (Math.hypot(e.clientX - dragging.x0, e.clientY - dragging.y0) < 6) return;
      dragging.active = true; hideTip(true);
      const g = document.createElement('div'); g.className = 'ghost'; g.textContent = dragging.label; document.body.appendChild(g); dragging.ghost = g;
    }
    dragging.ghost.style.left = (e.clientX + 8) + 'px'; dragging.ghost.style.top = (e.clientY + 8) + 'px';
    const [x, y] = svgPoint(dragging.box, e);
    const sg = hitSign(styleNow(), dragging.box._asc, x, y);
    if (sg !== dragging.sign) { dragging.sign = sg; setHL(dragging.box, sg); }
  };
  const onUp = e => {
    if (!dragging) return;
    const dg = dragging; dragging = null;
    if (!dg.active) return;
    suppress = true; setTimeout(() => { suppress = false; }, 50);
    dg.ghost.remove(); setHL(dg.box, -1);
    const [x, y] = svgPoint(dg.box, e);
    const sg = hitSign(styleNow(), dg.box._asc, x, y);
    if (sg < 0) { setStatus('Drop on one of the signs of the chart'); return; }
    openMove(dg.name, sg);
  };
  for (const [t, k, fn] of [['click', 'docClick', docClick], ['pointermove', 'onMove', onMove], ['pointerup', 'onUp', onUp]]) {
    const tgt = t === 'click' ? document : window;
    if (S[k]) tgt.removeEventListener(t, S[k]);
    S[k] = fn; tgt.addEventListener(t, fn);
  }
  $('#trNow').onclick = () => { $('#trWhen').value = nowIn(readPlaceField('tr').tz); $('#trRun').click(); };
  ['trVL', 'trVR', 'trFrame', 'trNatal'].forEach(i => $('#' + i).onchange = drawAll);
  $('#trRun').onclick = guard(async () => {
    render(await api('/api/transit', payload({when: $('#trWhen').value, loc: locBody()})));
  });
  $('#tcRun').onclick = guard(async () => {
    const r = await api('/api/transit/calendar', payload({from: $('#tcFrom').value + ' 00:00', months: +$('#tcM').value, loc: locBody()}));
    const months = []; let [y, m] = r.from.split('-').map(Number); const [ey, em] = r.to.split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) { months.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
    const rows = Object.keys(r.segments).map(pl => [pl, ...months.map(mo => {
      const mid = mo + '-15'; const s = r.segments[pl].find(x => x.start <= mid && mid <= x.end) || r.segments[pl][r.segments[pl].length - 1];
      return {html: `${SA[s.sign_idx]} ${s.house_moon}/${s.house_lagna}${s.bindus != null ? ' <small>(' + s.bindus + ')</small>' : ''}`, cls: s.favorable ? 'f' : 'u'};
    })]);
    const ev = r.events.map(e => [e.date, e.planet, e.event, e.house_lagna ?? '', e.house_moon ?? '', e.bindus ?? '']);
    $('#tcOut').innerHTML = `<p class="note">Each cell: sign, house from Moon / house from lagna, (own BAV bindus) at mid-month. Green = classical favourable house from Moon.</p>` + tbl(['', ...months], rows, {cls: 'tcal'})
      + `<h3>Ingresses and stations</h3>` + tbl(['Date', 'Planet', 'Event', 'House from lagna', 'House from Moon', 'BAV bindus'], ev, {num: [3, 4, 5]});
  });
  $('#trRun').click();
}

/* ---- KP */
function loadKP(p) {
  p.innerHTML = `<div class="row"><label>Sub levels<select id="kpD"><option value="3">3 (star, sub, sub-sub)</option><option value="4">4</option><option value="5" selected>5</option></select></label><button class="run" id="kpRun">Show KP table</button></div><div id="kpOut"></div>`;
  $('#kpRun').onclick = guard(async () => {
    const d = +$('#kpD').value;
    const r = await api('/api/kp', payload({depth: d}));
    $('#kpOut').innerHTML = `<p class="note">House cusps: ${esc(r.house_system)}, ayanamsa: ${esc(r.ayanamsa)}. Use the Krishnamurti ayanamsa in Settings for strict KP work.</p>`
      + tbl(['Body', 'Sign', 'Degree', 'Sign lord', ...r.levels], r.rows.map(x => [x.name, x.sign, x.deg, x.sign_lord, ...x.chain]))
      + `<h3>Bodies in the star and sub of each planet</h3>` + tbl(['Planet', ...r.levels.map(l => 'In ' + l + ' of planet')], Object.keys(r.reverse).map(pl => [pl, ...r.reverse[pl].slice(0, d).map(a => a.join(', '))]));
  });
  $('#kpRun').click();
}

/* ---- annual helpers */
function annualResult(out, r, title, pre) {
  const c = r.chart;
  const pl = {}, dg = {}; c.planets.forEach(x => { pl[x.name] = x.sign; dg[x.name] = x.deg; });
  if (r.muntha) { pl.Muntha = r.muntha.sign_idx; dg.Muntha = r.muntha.deg != null ? r.muntha.deg : null; }
  out.innerHTML = '';
  const div = document.createElement('div');
  div.innerHTML = `<div class="row"><label class="chk"><input type="checkbox" id="${pre}Up"${S.show.up ? ' checked' : ''}> Upagrahas</label><label class="chk"><input type="checkbox" id="${pre}LA"${S.show.la ? ' checked' : ''}> Lagnas &amp; Arudhas</label></div><div class="two"><div class="chartbox" id="${pre}D1"></div><div class="chartbox" id="${pre}D9"></div></div>`;
  out.appendChild(div);
  const draw = () => {
    const show = {la: $('#' + pre + 'LA').checked, up: $('#' + pre + 'Up').checked};
    let items1 = freeItems(pl, dg);
    if (c.asc && c.asc.deg != null) items1.push({sign: c.asc.sign, text: 'Asc ' + DM(c.asc.deg), color: COL.lagna, bold: true});
    if (show.la) items1 = items1.concat(lagnaItems(c, 1));
    if (show.up) items1 = items1.concat(upaItems(c, 1));
    $('#' + pre + 'D1', out).innerHTML = chartSVG({style: styleNow(), asc: c.asc.sign, items: items1, title});
    $('#' + pre + 'D9', out).innerHTML = chartSVG({style: styleNow(), asc: c.vargas['9'].asc, items: chartItems(c, 9, show), title: 'Navamsa'});
  };
  $('#' + pre + 'Up').onchange = draw; $('#' + pre + 'LA').onchange = draw;
  draw();
  return c;
}
function muddaHTML(m) {
  if (!m) return '';
  const rows = [];
  m.dasas.forEach((d, i) => {
    const r0 = ['\u25b8 ' + d.lord + ' dasa', d.start, d.end, d.days]; r0._cls = 'mu-main mg' + i; rows.push(r0);
    d.sub.forEach(a => { const r = ['\u00a0\u00a0\u21b3 ' + d.lord + '-' + a.lord, a.start, a.end, a.days]; r._cls = 'mu-sub mg' + i; rows.push(r); });
  });
  return '<h3>Planetary periods for the year (Mudda dasa)</h3>' + `<p class="note">Starts with ${esc(m.start_lord)} (Moon in ${esc(m.moon_nakshatra)}). Tap a main period to show its sub-periods.</p>` + tbl(['Period', 'From', 'To', 'Days'], rows, {num: [3]}) + `<p class="note">${esc(m.note)}</p>`;
}
function planetTable(c) { return tbl(['Body', 'Sign', 'Degree', 'Nakshatra', 'Star lord', 'House', 'Dignity / relation'], [['Lagna', c.asc.sign_name, c.asc.dms, `${c.asc.nak} ${c.asc.pada}`, c.asc.nak_lord, 1, isPushkara(c.asc.sign, c.asc.deg) ? {html: PUSH_BDG} : ''], ...c.planets.map(x => [x.name, x.sign_name, x.dms, `${x.nak} ${x.pada}`, x.nak_lord, x.house, dignityHTML(x)]), ...c.upagrahas.map(x => [x.name, x.sign_name, x.dms, `${x.nak} ${x.pada}`, x.nak_lord || '', x.house, ''])], {num: [5]}); }

function ageControls(prefix, run) {
  const d = defaultPlace();
  const age = (() => { try { return new Date().getFullYear() - +$('#date').value.slice(0, 4); } catch (e) { return ''; } })();
  return `<div class="row"><label>Age (completed years)<input type="number" id="${prefix}Age" value="${age}" min="0" max="140" style="width:90px"></label>${placeField(prefix, d)}<button class="run" id="${prefix}Run">Compute</button></div><p class="note">Location of the annual chart defaults to your current place (change it above if needed).</p><div id="${prefix}Out"></div>`;
}

/* ---- Varshaphala */
function loadVarsha(p) {
  p.innerHTML = ageControls('vs');
  bindPlaceField('vs');
  $('#vsRun').onclick = guard(async () => {
    const pl = readPlaceField('vs');
    const r = await api('/api/varsha', payload({age: +$('#vsAge').value, lat: pl.lat, lon: pl.lon, annual_tz: pl.tz, tz: TZ}));
    const out = $('#vsOut');
    const c = annualResult(out, r, 'Varsha chart', 'vs');
    const hb = r.harsha_bala, pv = r.pancha_vargeeya;
    out.insertAdjacentHTML('afterbegin', kv([['Age', r.age], ['Solar return (local)', r.return_local], ['Varsha lagna', r.varsha_lagna], ['Muntha', `${r.muntha.sign} (house ${r.muntha.house_in_varsha}), lord ${r.muntha.lord}`], ['Suggested Varsha lord', r.suggested_varsha_lord]])
      + '<h3>Candidates for Varsha lord</h3>' + tbl(['Role', 'Planet', 'Pancha Vargeeya'], Object.entries(r.varsha_lord_candidates).map(([k, v]) => [k, v, f(pv[v].total, 2)]), {num: [2]}));
    out.insertAdjacentHTML('beforeend', '<h3>Positions in the Varsha chart</h3>' + planetTable(c) + muddaHTML(r.mudda)
      + '<h3>Harsha bala (max 20)</h3>' + tbl(['Planet', 'Sthana', 'Stri-Purusha', 'Ucchadi', 'Dina-Ratri', 'Total'], PL7.map(n => [n, hb[n].sthana, hb[n].stri_purusha, hb[n].ucchadi, hb[n].dina_ratri, hb[n].total]), {num: [1, 2, 3, 4, 5]})
      + '<h3>Pancha Vargeeya bala (max 20)</h3>' + tbl(['Planet', 'Kshetra /30', 'Uccha /20', 'Hadda /15', 'Drekkana /10', 'Navamsa /5', 'Total /20', 'Grade'], PL7.map(n => [n, f(pv[n].kshetra, 1), f(pv[n].uccha, 1), f(pv[n].hadda, 1), f(pv[n].drekkana, 1), f(pv[n].navamsa, 1), f(pv[n].total, 2), pv[n].grade]), {num: [1, 2, 3, 4, 5, 6]})
      + `<p class="note">${esc(r.note)}</p>`);
  });
  $('#vsRun').click();
}

/* ---- Tithi Pravesha */
function loadTP(p) {
  p.innerHTML = ageControls('tp');
  bindPlaceField('tp');
  $('#tpRun').onclick = guard(async () => {
    const pl = readPlaceField('tp');
    const r = await api('/api/tp', payload({age: +$('#tpAge').value, lat: pl.lat, lon: pl.lon, annual_tz: pl.tz, tz: TZ}));
    const out = $('#tpOut');
    const c = annualResult(out, r, 'Tithi Pravesha', 'tp');
    out.insertAdjacentHTML('afterbegin', kv([['Age', r.age], ['Tithi pravesha (local)', r.return_local], ['Natal tithi', r.natal_tithi], ['Tithi at return', r.tithi_at_return], ['Lagna', c.asc.sign_name + ' ' + c.asc.dms + ', ' + c.asc.nak + ' (' + c.asc.nak_lord + ')']]));
    out.insertAdjacentHTML('beforeend', '<h3>Positions</h3>' + planetTable(c) + muddaHTML(r.mudda) + `<p class="note">${esc(r.note)}</p>`);
  });
  $('#tpRun').click();
}

/* ---- Prasna */
function loadPrasna(p) {
  const d = defaultPlace();
  p.innerHTML = `<div class="row"><label>Method<select id="prM"><option value="108">Number 1-108 (rasi and navamsa)</option><option value="249">KP number 1-249</option></select></label>
    <label>Number<input type="number" id="prN" value="1" min="1" max="249" style="width:90px"></label>
    <label>Question time<input type="datetime-local" id="prWhen" value="${nowLocal()}"></label>${placeField('pr', d)}<button class="run" id="prRun">Cast prasna</button></div><div id="prOut"></div>`;
  bindPlaceField('pr');
  $('#prRun').onclick = guard(async () => {
    const pl = readPlaceField('pr');
    const when = $('#prWhen').value;
    const b = {name: 'Prasna', date: when.slice(0, 10), time: when.slice(11, 16) + ':00', lat: pl.lat, lon: pl.lon, tz: pl.tz, place: pl.label};
    const r = await api('/api/prasna', {mode: +$('#prM').value, number: +$('#prN').value, birth: b, cfg: getCfg()});
    const L = r.lagna;
    const rows = r.mode === 108 ? [['Number', L.number], ['Prasna lagna (rasi)', L.rasi], ['Navamsa of lagna', `${L.navamsa} (navamsa ${L.navamsa_no_in_sign} of the sign)`], ['Span', `${L.from} to ${L.to} of ${L.rasi}`]]
      : [['Number', L.number], ['Prasna lagna (rasi)', L.rasi], ['Nakshatra', `${L.nakshatra} (${L.star_lord})`], ['Sub lord', L.sub_lord], ['Star/sub chain', L.chain.join(' > ')], ['Navamsa', L.navamsa], ['Span', `${L.from} to ${L.to} of ${L.rasi}`]];
    let h = tbl(['Item', 'Value'], rows);
    if (r.chart) h += `<p class="note">Planets cast for ${esc(r.chart.when)} at ${esc(r.chart.place)}; the lagna is replaced by the number-derived lagna.</p><div class="two"><div class="chartbox" id="prA"></div><div class="chartbox" id="prB"></div></div>`
      + tbl(['Planet', 'House from prasna lagna'], PL9.map(n => [n, r.chart.houses[n]]), {num: [1]});
    $('#prOut').innerHTML = h;
    if (r.chart) { drawFree($('#prA'), r.chart, 'Prasna rasi'); drawFree($('#prB'), r.chart.navamsa, 'Navamsa'); }
  });
}

/* ---- Saved */
async function loadSaved(p) {
  const list = await api('/api/saved' + (S.profileId ? '?profile_id=' + S.profileId : ''));
  p.innerHTML = `<p class="note">Saved views remember the birth details, settings, tab and the inputs on that tab. ${S.profileId ? 'Showing views for the selected profile.' : 'Showing all views.'}</p>`
    + (list.length ? tbl(['Title', 'Tab', 'Saved', ''], list.map(x => [x.title, x.kind, x.created.replace('T', ' '), {html: `<button class="sec" data-o="${x.id}">Open</button> <button class="sec" data-d="${x.id}">Delete</button>`}])) : '<p>Nothing saved yet. Use "Save current view" after calculating.</p>');
  p.insertAdjacentHTML('beforeend', '<h3>Backup</h3><p class="note">Everything is stored on this device only. Export a backup file now and then; import it on another device or after reinstalling.</p><div class="row"><button class="sec" id="bkOut">Export backup</button><label class="chk"><input type="file" id="bkIn" accept="application/json,.json"> Import backup</label></div>');
  $('#bkOut').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Local.exportAll()], {type: 'application/json'})); a.download = 'jyotisha-tejas-backup.json'; document.body.appendChild(a); a.click(); a.remove(); };
  $('#bkIn').onchange = guard(async e => { const f = e.target.files[0]; if (!f) return; await Local.importAll(await f.text()); await refreshProfiles(); S.loaded.saved = -1; showTab('saved'); setStatus('Backup imported'); });
  $$('[data-o]', p).forEach(b => b.onclick = guard(() => openSaved(+b.dataset.o)));
  $$('[data-d]', p).forEach(b => b.onclick = guard(async () => { await api('/api/saved/' + b.dataset.d, undefined, 'DELETE'); S.loaded.saved = -1; showTab('saved'); }));
}
const FORM_IDS = ['name', 'date', 'time', 'place', 'lat', 'lon', 'tz', 'gender'];
function formValues() { const o = {}; FORM_IDS.forEach(i => o[i] = $('#' + i).value); return o; }
function setForm(o) { FORM_IDS.forEach(i => { if (o[i] !== undefined && o[i] !== null) $('#' + i).value = o[i]; }); }
const saveView = guard(async () => {
  if (!S.chart) throw new Error('Calculate a chart first');
  const title = prompt('Name for this saved view:', `${$('#name').value || 'Chart'} - ${TABS.find(t => t.id === S.tab).title}`);
  if (!title) return;
  const extra = {};
  $$('input,select', $('#p-' + S.tab)).forEach(e => { if (e.id) extra[e.id] = e.type === 'checkbox' ? e.checked : e.value; });
  await api('/api/saved', {profile_id: S.profileId, title, kind: S.tab, payload: {form: formValues(), cfg: getCfg(), tab: S.tab, extra, style: $('input[name=style]:checked').value}});
  S.loaded.saved = -1;
  setStatus('Saved');
});
async function openSaved(id) {
  const r = await api('/api/saved/' + id);
  const pl = r.payload;
  setForm(pl.form);
  Object.entries(pl.cfg || {}).forEach(([k, v]) => { const e = $('#cfg_' + k); if (e) e.value = v; });
  const st = $(`input[name=style][value=${pl.style || 'south'}]`); if (st) st.checked = true;
  await calc();
  S.loaded[pl.tab] = -1;
  showTab(pl.tab);
  Object.entries(pl.extra || {}).forEach(([k, v]) => { const e = document.getElementById(k); if (e && !e.id.endsWith('_pl')) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v; } });
  const run = $('#p-' + pl.tab + ' .run'); if (run) run.click();
}

/* ---------------------------------------------------------------- main actions */
const calc = guard(async () => {
  S.chart = applyChalit(await api('/api/chart', payload()));
  S.version++;
  S.loaded = {};
  showTab(S.tab === 'saved' ? 'charts' : S.tab);
});
async function refreshProfiles(selectId) {
  const list = await api('/api/profiles');
  window._profiles = list;
  S.loaded.clients = -1;
  if (S.tab === 'clients' && typeof Cl !== 'undefined' && $('#p-clients')) Cl.load($('#p-clients'));
  $('#profileSel').innerHTML = '<option value="">Saved profiles...</option>' + list.map(x => `<option value="${x.id}"${x.id === selectId ? ' selected' : ''}>${esc(x.name || '(unnamed)')} - ${x.year}-${String(x.month).padStart(2, '0')}-${String(x.day).padStart(2, '0')}</option>`).join('');
}
function profileToForm(x) {
  const pad = n => String(n).padStart(2, '0');
  setForm({name: x.name, date: `${x.year}-${pad(x.month)}-${pad(x.day)}`, time: `${pad(x.hour)}:${pad(x.minute)}:${pad(x.second || 0)}`, place: x.place, lat: x.lat, lon: x.lon, tz: x.tz, gender: x.gender || ''});
}
async function init() {
  buildTabs();
  await Local.init();
  Engine.onStatus = m => { const e = $('#engine'); if (e) { e.textContent = m; e.style.display = m ? 'inline-block' : 'none'; } Home.status(m); };
  Engine.start();
  placePicker($('#place'), $('#placeList'), r => { $('#lat').value = r.lat; $('#lon').value = r.lon; $('#tz').value = r.tz; });
  $('#lat').value = 19.0728; $('#lon').value = 72.8826; $('#tz').value = 'Asia/Kolkata'; $('#place').value = 'Mumbai, India';
  $('#btnCalc').onclick = calc;
  $('#btnSaveView').onclick = saveView;
  $('#btnReport').onclick = () => Rp.open((window._profiles || []).find(x => x.id === S.profileId) || null);
  $$('input[name=style]').forEach(r => r.onchange = () => { S.loaded = {}; showTab(S.tab); });
  $('#btnNew').onclick = () => { S.profileId = null; $('#profileSel').value = ''; $('#name').value = ''; };
  $('#profileSel').onchange = guard(async () => {
    const id = +$('#profileSel').value;
    if (!id) { S.profileId = null; return; }
    S.profileId = id;
    profileToForm(window._profiles.find(x => x.id === id));
    await calc();
  });
  $('#btnSaveProfile').onclick = guard(async () => {
    const b = getBirth();
    const [y, m, d] = b.date.split('-').map(Number); const [hh, mm, ss] = b.time.split(':').map(Number);
    const res = await api('/api/profiles', {id: S.profileId || undefined, name: b.name, year: y, month: m, day: d, hour: hh, minute: mm, second: ss || 0, place: b.place, lat: b.lat, lon: b.lon, tz: b.tz, gender: b.gender});
    S.profileId = res.id;
    await refreshProfiles(res.id);
    setStatus('Profile saved');
  });
  $('#btnDelProfile').onclick = guard(async () => {
    if (!S.profileId || !confirm('Delete this profile and its saved views?')) return;
    await api('/api/profiles/' + S.profileId, undefined, 'DELETE');
    S.profileId = null; await refreshProfiles();
  });
  $('#btnHome').onclick = () => { location.hash = '#home'; };
  refreshProfiles();
  showTab('charts');
  $('#p-charts').innerHTML = '<p>Enter birth details above and press <b>Calculate</b>. The place search is offline (GeoNames); if a town is missing, type latitude, longitude and time zone yourself.</p>';
  Home.init();
  Extra.startup();
}
document.addEventListener('DOMContentLoaded', init);


/* ---- collapsible birth details */
(function () {
  const sec = document.getElementById('birth'), tg = document.getElementById('birthTg'), sum = document.getElementById('birthSum');
  if (!sec || !tg) return;
  const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  const summary = () => { sum.textContent = [val('name') || '(unnamed)', val('date'), val('time').slice(0, 5), val('place')].filter(Boolean).join('  |  '); };
  const set = col => { sec.classList.toggle('collapsed', col); tg.setAttribute('aria-expanded', String(!col)); tg.innerHTML = (col ? '&#9656; ' : '&#9662; ') + 'Birth details'; summary(); try { localStorage.setItem('jt_birth_col', col ? '1' : '0'); } catch (e) { /* ignore */ } };
  tg.onclick = () => set(!sec.classList.contains('collapsed'));
  ['name', 'date', 'time', 'place'].forEach(id => { const e = document.getElementById(id); if (e) { e.addEventListener('input', summary); e.addEventListener('change', summary); } });
  setInterval(() => { if (sec.classList.contains('collapsed')) summary(); }, 1500);   // picks up profile loads and place picks
  let col = false; try { col = localStorage.getItem('jt_birth_col') === '1'; } catch (e) { /* ignore */ }
  set(col);
})();

/* click a row of a wide table to highlight it, so it can be read across the line */
document.addEventListener('click', e => {
  const tr = e.target.closest && e.target.closest('table tr');
  if (!tr || e.target.closest('a,button,input,select,label,textarea')) return;
  const cells = tr.children.length;
  if (cells < 4 || tr.querySelector('th') && !tr.querySelector('td')) return;
  const tb = tr.closest('table'), was = tr.classList.contains('sel');
  tb.querySelectorAll('tr.sel').forEach(r => r.classList.remove('sel'));
  if (!was) tr.classList.add('sel');
});

/* Mudda dasa: tap a main period row to show or hide its sub-periods */
document.addEventListener('click', e => {
  const tr = e.target.closest && e.target.closest('tr.mu-main');
  if (!tr) return;
  const g = [...tr.classList].find(c => /^mg\d+$/.test(c));
  const open = !tr.classList.contains('open');
  tr.classList.toggle('open', open);
  tr.firstElementChild.textContent = (open ? '\u25be ' : '\u25b8 ') + tr.firstElementChild.textContent.slice(2);
  tr.closest('table').querySelectorAll('tr.mu-sub.' + g).forEach(r => r.classList.toggle('shown', open));
});

/* floating button: jump back to the top of a long page */
(() => {
  const b = document.getElementById('toTop'); if (!b) return;
  const upd = () => { b.hidden = (window.scrollY || document.documentElement.scrollTop) < 500; };
  window.addEventListener('scroll', upd, {passive: true}); window.addEventListener('hashchange', upd); upd();
  b.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
})();
