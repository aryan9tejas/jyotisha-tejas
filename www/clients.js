'use strict';
/* Jyotisha Tejas: Clients (people you keep notes for) and the branded PDF report.
   Needs app.js globals: api, esc, $, $$, guard, S, calc, profileToForm, refreshProfiles, showTab, tbl, kv, f, chartItems, chartSVG, styleNow, chalitItems, isPushkara, payload, setStatus, Local, Extra. */
const Cl = (() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = n => String(n).padStart(2, '0');
  const st = {sel: null, filter: 'all', q: '', sort: 'follow', tab: 'sessions', list: []};
  const birthLine = x => `${x.day} ${MON[x.month - 1]} ${x.year}, ${pad(x.hour)}:${pad(x.minute)}${x.place ? ', ' + x.place.split(',')[0] : ''}`;
  const ini = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const dayDiff = s => Math.round((Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) - Date.UTC(+todayStr().slice(0, 4), +todayStr().slice(5, 7) - 1, +todayStr().slice(8, 10))) / 86400000);
  const fdate = s => `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
  const nextFollow = c => (c.follow || []).filter(x => x.on !== false && x.date >= todayStr()).sort((a, b) => a.date < b.date ? -1 : 1)[0] || null;
  const MAXG = 10;
  const groups = () => { const g = Extra.lsGet('jt_groups', null); return Array.isArray(g) && g.length ? g : ['Client', 'Family']; };
  const tagOf = c => c.tag || groups()[0];
  const gLabel = g => g === 'Client' ? 'Clients' : g;
  const lastBackup = () => Extra.lsGet('jt_last_backup', 0);

  async function load(p) {
    st.list = await api('/api/profiles');
    paint(p);
  }
  function paint(p) {
    p = p || $('#p-clients'); if (!p) return;
    const c = st.sel ? st.list.find(x => x.id === st.sel) : null;
    if (c) detail(p, c); else listView(p);
  }

  /* ---------------------------------------------------------- list */
  function listView(p) {
    let rows = st.list.slice();
    const q = st.q.trim().toLowerCase();
    if (q) rows = rows.filter(c => ((c.name || '') + ' ' + (c.place || '') + ' ' + (c.notes || '')).toLowerCase().includes(q));
    if (st.filter !== 'all' && st.filter !== 'star') rows = rows.filter(c => tagOf(c) === st.filter);
    if (st.filter === 'star') rows = rows.filter(c => c.star);
    const cnt = t => st.list.filter(c => tagOf(c) === t).length;
    if (st.sort === 'follow') rows.sort((a, b) => { const x = nextFollow(a), y = nextFollow(b); if (x && y) return x.date < y.date ? -1 : 1; if (x) return -1; if (y) return 1; return (a.name || '').localeCompare(b.name || ''); });
    else if (st.sort === 'name') rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else rows.sort((a, b) => (b.created || '') < (a.created || '') ? -1 : 1);
    const bk = lastBackup(), days = bk ? Math.floor((Date.now() - bk) / 86400000) : null;
    const stale = st.list.length > 0 && (days === null || days > 14);
    p.innerHTML = `<div class="xhead"><h3>Clients</h3><span class="note">${st.list.length} ${st.list.length === 1 ? 'person' : 'people'}, stored on this device</span><button type="button" id="cAdd">Add new</button></div>
      <div class="row"><label style="flex:1;min-width:200px">Search<input id="cQ" placeholder="Name, place or note" value="${esc(st.q)}"></label><label>Sort<select id="cSort"><option value="follow"${st.sort === 'follow' ? ' selected' : ''}>Next follow-up</option><option value="name"${st.sort === 'name' ? ' selected' : ''}>Name</option><option value="new"${st.sort === 'new' ? ' selected' : ''}>Newest</option></select></label></div>
      <div class="xfilt">${[['all', `All ${st.list.length}`], ...groups().map(g => [g, `${gLabel(g)} ${cnt(g)}`]), ['star', 'Starred']].map(([k, n]) => `<button type="button" class="xchip${st.filter === k ? ' on' : ''}" data-f="${esc(k)}">${esc(n)}</button>`).join('')}<button type="button" class="xchip" id="cGrp">Manage groups</button></div>
      <div class="xlist">${rows.map(c => { const nf = nextFollow(c), d = nf ? dayDiff(nf.date) : null; return `<button type="button" class="xclient" data-id="${c.id}"><span class="xav">${esc(ini(c.name))}</span><span class="xcm"><b>${c.star ? '&#9733; ' : ''}${esc(c.name || '(unnamed)')}</b><small>${esc(birthLine(c))}</small></span><span class="xcr"><span class="xtag2">${esc(gLabel(tagOf(c)))}</span>${nf ? `<span class="xfu${d <= 7 ? ' soon' : ''}">${d === 0 ? 'Follow-up today' : d === 1 ? 'Follow-up tomorrow' : 'Follow-up ' + esc(fdate(nf.date).slice(0, -5))}</span>` : ''}</span></button>`; }).join('') || '<p class="note">No one here yet. Enter birth details above and press Save profile, or use Add new.</p>'}</div>
      <div class="xcard2 xbk${stale ? ' stale' : ''}"><div><b>Backup</b><small>${bk ? 'Last backup ' + (days === 0 ? 'today' : days + ' days ago') : 'Not backed up yet'}${stale ? '. Back up now so your notes are safe if the phone is lost.' : ''}</small></div>
        <div class="xbtns"><button type="button" class="sec" id="cBk">Back up now</button><label class="xfile sec">Restore<input type="file" id="cRs" accept="application/json,.json" hidden></label></div></div>
      <p class="note">${esc(Extra.DISC)}</p>`;
    $('#cQ').oninput = e => { st.q = e.target.value; listView(p); const i = $('#cQ'); i.focus(); i.setSelectionRange(st.q.length, st.q.length); };
    $('#cSort').onchange = e => { st.sort = e.target.value; listView(p); };
    $$('[data-f]', p).forEach(b => b.onclick = () => { st.filter = b.dataset.f; listView(p); });
    $('#cGrp').onclick = () => groupDialog(p);
    $$('.xclient', p).forEach(b => b.onclick = () => { st.sel = +b.dataset.id; st.tab = 'sessions'; paint(p); });
    $('#cAdd').onclick = () => { S.profileId = null; $('#profileSel').value = ''; $('#name').value = ''; const tg = $('#birthTg'); if (tg && tg.getAttribute('aria-expanded') === 'false') tg.click(); window.scrollTo({top: 0, behavior: 'smooth'}); setTimeout(() => $('#name').focus(), 300); };
    $('#cBk').onclick = guard(async () => { await Extra.saveFile('jyotisha-tejas-backup.json', 'application/json', Local.exportAll()); Extra.lsSet('jt_last_backup', Date.now()); listView(p); });
    $('#cRs').onchange = guard(async e => { const fl = e.target.files[0]; if (!fl) return; if (!confirm('Restore replaces everything on this device with the backup file. Continue?')) return; await Local.importAll(await fl.text()); await refreshProfiles(); st.list = await api('/api/profiles'); st.sel = null; listView(p); setStatus('Backup restored'); });
  }

  /* ---------------------------------------------------------- groups */
  function groupDialog(p) {
    const w = document.createElement('div'); w.className = 'xmodal';
    let g = groups().map(o => ({o, n: gLabel(o)}));
    const paint = () => {
      w.innerHTML = `<div class="xbox" role="dialog" aria-label="Manage groups"><h3>Groups</h3>
        <p class="note">Up to ${MAXG} groups. Open a person to move them to another group. Deleting a group moves its people to the first group.</p>
        <div id="gList">${g.map((x, i) => `<div class="row"><label style="flex:1">Group ${i + 1}<input data-i="${i}" value="${esc(x.n)}" maxlength="24"></label>${g.length > 1 ? `<button type="button" class="sec xdel" data-x="${i}" aria-label="Delete group">&#10005;</button>` : ''}</div>`).join('')}</div>
        ${g.length < MAXG ? `<div class="row"><label style="flex:1">New group<input id="gNew" maxlength="24" placeholder="e.g. Friends"></label><button type="button" class="sec" id="gAdd">Add</button></div>` : ''}
        <p class="note" id="gMsg"></p><div class="xbtns"><button type="button" id="gOk">Save</button><button type="button" class="sec" id="gNo">Cancel</button></div></div>`;
      $$('[data-x]', w).forEach(b => b.onclick = () => { g.splice(+b.dataset.x, 1); paint(); });
      $$('[data-i]', w).forEach(i => i.oninput = () => { g[+i.dataset.i].n = i.value; });
      const add = () => { const v = $('#gNew', w).value.trim(); if (!v) return; if (g.some(x => x.n.trim().toLowerCase() === v.toLowerCase())) { $('#gMsg', w).textContent = 'That group already exists.'; return; } g.push({o: null, n: v}); paint(); };
      if ($('#gAdd', w)) { $('#gAdd', w).onclick = add; $('#gNew', w).onkeydown = e => { if (e.key === 'Enter') add(); }; }
      $('#gNo', w).onclick = () => w.remove();
      $('#gOk', w).onclick = guard(async () => {
        const fin = g.map(x => ({o: x.o, n: (x.o !== null && x.n.trim() === gLabel(x.o)) ? x.o : x.n.trim()}));
        if (!fin.length || fin.some(x => !x.n) || new Set(fin.map(x => x.n.toLowerCase())).size !== fin.length) { $('#gMsg', w).textContent = 'Each group needs a different name.'; return; }
        const first = groups()[0];
        for (const c of st.list) {
          const t = c.tag || first, hit = fin.find(x => x.o === t);
          const nt = hit ? hit.n : fin[0].n;
          if (nt !== c.tag) await upd(c, {tag: nt});
        }
        const names = fin.map(x => x.n);
        Extra.lsSet('jt_groups', names);
        if (st.filter !== 'all' && st.filter !== 'star') { const h = fin.find(x => x.o === st.filter); st.filter = h ? h.n : 'all'; }
        w.remove(); listView(p);
      });
    };
    document.body.appendChild(w); paint();
  }

  /* ---------------------------------------------------------- detail */
  const upd = async (c, patch) => { Object.assign(c, patch); await api('/api/profiles', {id: c.id, ...patch}); };
  function detail(p, c) {
    const sess = (c.sessions || []).slice().sort((a, b) => a.date < b.date ? 1 : -1), fol = (c.follow || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const tabs = [['sessions', `Sessions ${sess.length}`], ['notes', 'Notes'], ['follow', `Follow-ups ${fol.length}`]];
    let body = '';
    if (st.tab === 'sessions') body = `<div class="xcard2">${sess.map(s => `<div class="xl"><div><b>${esc(fdate(s.date))}${s.title ? ' &middot; ' + esc(s.title) : ''}</b><small>${esc(s.note || '')}</small></div><button type="button" class="sec xdel" data-ds="${s.id}" aria-label="Delete session">&#10005;</button></div>`).join('') || '<p class="note">No sessions yet.</p>'}</div>
      <div class="xcard2"><h5>Add a session</h5><div class="row"><label>Date<input type="date" id="sDate" value="${todayStr()}"></label><label style="flex:1;min-width:160px">Topic<input id="sTitle" placeholder="e.g. Career change"></label></div><label>Note<textarea id="sNote" rows="3" placeholder="What was discussed"></textarea></label><div class="xbtns"><button type="button" id="sAdd">Save session</button></div></div>`;
    if (st.tab === 'notes') body = `<div class="xcard2"><label>Notes about ${esc(c.name || 'this person')}<textarea id="nTxt" rows="9" placeholder="Anything worth remembering">${esc(c.notes || '')}</textarea></label><div class="xbtns"><button type="button" id="nSave">Save notes</button></div></div>`;
    if (st.tab === 'follow') body = `<div class="xcard2">${fol.map(x => `<div class="xl"><div><b>${esc(fdate(x.date))}${x.date < todayStr() ? ' (past)' : ''}</b><small>${esc(x.text || '')}${x.remind ? ' &middot; remind ' + x.remind + ' days before' : ''}</small></div><label class="xsw"><input type="checkbox" data-fo="${x.id}"${x.on !== false ? ' checked' : ''}><i></i></label><button type="button" class="sec xdel" data-df="${x.id}" aria-label="Delete follow-up">&#10005;</button></div>`).join('') || '<p class="note">No follow-ups yet.</p>'}</div>
      <div class="xcard2"><h5>Add a follow-up</h5><div class="row"><label>Date<input type="date" id="fDate" value="${todayStr()}"></label><label>Remind me<select id="fRem"><option value="0">On the day</option><option value="1">1 day before</option><option value="3">3 days before</option><option value="7" selected>7 days before</option></select></label></div><label>What for<input id="fTxt" placeholder="e.g. Mercury dasa begins"></label><div class="xbtns"><button type="button" id="fAdd">Add follow-up</button></div>
      <p class="note">Reminders arrive through Alerts. Turn on "Client follow-ups" there.</p></div>`;
    p.innerHTML = `<div class="xhead"><button type="button" class="sec" id="dBack" aria-label="Back to clients">&#8249; Clients</button><h3>${esc(c.name || '(unnamed)')}</h3><button type="button" class="sec" id="dStar" aria-label="Star" title="Star">${c.star ? '&#9733;' : '&#9734;'}</button></div>
      <p class="note">${esc(birthLine(c))} &middot; ${esc(c.tz || '')}</p>
      <div class="row"><label>Group<select id="dTag">${[...new Set([...groups(), tagOf(c)])].map(g => `<option value="${esc(g)}"${tagOf(c) === g ? ' selected' : ''}>${esc(gLabel(g))}</option>`).join('')}</select></label></div>
      <div class="xact"><button type="button" class="sec" id="dChart">Chart</button><button type="button" class="sec" id="dRep">Report</button><button type="button" class="sec" id="dMuh">Muhurta</button></div>
      <div class="mu-nav">${tabs.map(([k, n]) => `<button type="button" data-t="${k}"${st.tab === k ? ' class="on"' : ''}>${n}</button>`).join('')}</div>${body}
      <div class="xbtns"><button type="button" class="sec" id="dDel">Delete this person</button></div>`;
    $('#dBack').onclick = () => { st.sel = null; paint(p); };
    $('#dStar').onclick = guard(async () => { await upd(c, {star: c.star ? 0 : 1}); detail(p, c); });
    $('#dTag').onchange = guard(async e => { await upd(c, {tag: e.target.value}); });
    $$('.mu-nav [data-t]', p).forEach(b => b.onclick = () => { st.tab = b.dataset.t; detail(p, c); });
    $('#dChart').onclick = guard(async () => { await openChart(c); showTab('charts'); });
    $('#dRep').onclick = guard(async () => { await openChart(c); Rp.open(c); });
    $('#dMuh').onclick = guard(async () => {
      await openChart(c);
      const mo = S.chart.planets.find(x => x.name === 'Moon');
      const me = {name: c.name || '', nak: Extra.NAKN.indexOf(mo.nak), pada: mo.pada, rasi: mo.sign, lagna: S.chart.asc.sign, sex: c.gender === 'Female' ? 'F' : c.gender === 'Male' ? 'M' : ''};
      Extra.lsSet('jt_muh_me', me);
      showTab('panchanga'); const b = document.querySelector('#pnSub button[data-s="muhurta"]'); if (b) b.click();
      setStatus(`Muhurta finder now uses ${c.name || 'this person'}'s birth star`);
    });
    $('#dDel').onclick = guard(async () => { if (!confirm(`Delete ${c.name || 'this person'} and their saved views?`)) return; await api('/api/profiles/' + c.id, undefined, 'DELETE'); if (S.profileId === c.id) S.profileId = null; await refreshProfiles(); st.sel = null; st.list = await api('/api/profiles'); paint(p); });
    if ($('#sAdd')) {
      $('#sAdd').onclick = guard(async () => { const list = (c.sessions || []).concat([{id: Date.now(), date: $('#sDate').value || todayStr(), title: $('#sTitle').value.trim(), note: $('#sNote').value.trim()}]); await upd(c, {sessions: list}); detail(p, c); });
      $$('[data-ds]', p).forEach(b => b.onclick = guard(async () => { await upd(c, {sessions: (c.sessions || []).filter(s => String(s.id) !== b.dataset.ds)}); detail(p, c); }));
    }
    if ($('#nSave')) $('#nSave').onclick = guard(async () => { await upd(c, {notes: $('#nTxt').value}); setStatus('Notes saved'); });
    if ($('#fAdd')) {
      $('#fAdd').onclick = guard(async () => { const list = (c.follow || []).concat([{id: Date.now(), date: $('#fDate').value || todayStr(), text: $('#fTxt').value.trim(), remind: +$('#fRem').value, on: true}]); await upd(c, {follow: list}); detail(p, c); });
      $$('[data-df]', p).forEach(b => b.onclick = guard(async () => { await upd(c, {follow: (c.follow || []).filter(s => String(s.id) !== b.dataset.df)}); detail(p, c); }));
      $$('[data-fo]', p).forEach(b => b.onchange = guard(async () => { await upd(c, {follow: (c.follow || []).map(s => String(s.id) === b.dataset.fo ? {...s, on: b.checked} : s)}); }));
    }
  }
  async function openChart(c) {
    S.profileId = c.id;
    profileToForm(c);
    await refreshProfiles(c.id);
    await calc();
  }
  return {load, st, birthLine};
})();

/* ============================================================ PDF report */
const Rp = (() => {
  const VSETS = {shadvarga: ['Shadvarga (6): D1, D2, D3, D9, D12, D30', [1, 2, 3, 9, 12, 30]], saptavarga: ['Saptavarga (7): D1, D2, D3, D7, D9, D12, D30', [1, 2, 3, 7, 9, 12, 30]], dashavarga: ['Dashavarga (10): D1, D2, D3, D7, D9, D10, D12, D16, D30, D60', [1, 2, 3, 7, 9, 10, 12, 16, 30, 60]], shodashavarga: ['Shodashavarga (16): all divisional charts', [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]]};
  const DEF = {vset: 'shodashavarga', paper: 'A4', style: 'classic', by: '', logo: '', footer: '', pages: {birth: 1, charts: 1, chalit: 0, positions: 1, dasa: 1, vargas: 0, strength: 1, notes: 1}};
  const cfg = () => Object.assign({}, DEF, Extra.lsGet('jt_report', {}), {pages: Object.assign({}, DEF.pages, (Extra.lsGet('jt_report', {}) || {}).pages)});
  const PAGES = [['birth', 'Birth details and Panchanga at birth'], ['charts', 'Rasi and Navamsa charts'], ['chalit', 'Bhava Chalit chart'], ['positions', 'Planet positions and dignity'], ['dasa', 'Vimshottari dasa (running period and the next 20 years)'], ['vargas', 'Divisional chart signs'], ['strength', 'Strengths (Shadbala)'], ['notes', 'Notes about the person']];
  let cur = null, dasaData = null;

  async function open(client) {
    cur = client || null;
    if (!S.chart) { setStatus('Calculate a chart first', true); return; }
    dasaData = null;
    const w = document.createElement('div'); w.className = 'xmodal'; w.id = 'rpModal';
    w.innerHTML = `<div class="xbox xwide" role="dialog" aria-label="Create report"><h3>Create report</h3>
      <p class="note">For ${esc(S.chart.meta.name || 'the chart on screen')}, ${esc(S.chart.meta.local)}, ${esc(S.chart.meta.place)}</p>
      <h5>Pages</h5><div class="xchecks" id="rpPages"></div>
      <div class="row" id="rpVrow"><label style="flex:1;min-width:220px">Divisional charts<select id="rpVset">${Object.keys(VSETS).map(k => `<option value="${k}">${VSETS[k][0]}</option>`).join('')}</select></label></div>
      <h5>Look</h5><div class="row"><label>Paper<select id="rpPaper"><option>A4</option><option>Letter</option></select></label><label>Style<select id="rpStyle"><option value="classic">Classic</option><option value="minimal">Minimal</option></select></label><label>Language<select id="rpLang"><option>English</option></select></label></div>
      <div class="row"><label style="flex:1;min-width:180px">Prepared by<input id="rpBy" placeholder="Your name or practice"></label><label style="flex:1;min-width:180px">Footer line (optional)<input id="rpFoot" placeholder="Phone, email or website"></label></div>
      <div class="row"><label class="xfile sec">Logo<input type="file" id="rpLogo" accept="image/*" hidden></label><img id="rpLogoImg" alt="" class="xlogo" hidden><button type="button" class="sec" id="rpLogoX" hidden>Remove logo</button></div>
      <p class="note" id="rpMsg"></p>
      <div class="xbtns"><button type="button" id="rpPrev">Preview</button><button type="button" id="rpPrint">Print / save as PDF</button><button type="button" class="sec" id="rpTab">Open in new tab</button><button type="button" class="sec" id="rpClose">Close</button></div>
      <iframe id="rpFrame" title="Report preview" hidden></iframe></div>`;
    document.body.appendChild(w);
    const c = cfg();
    $('#rpPages', w).innerHTML = PAGES.map(([k, n]) => `<label class="chk"><input type="checkbox" data-pg="${k}"${c.pages[k] ? ' checked' : ''}> ${esc(n)}</label>`).join('');
    $('#rpVset', w).value = VSETS[c.vset] ? c.vset : 'shodashavarga'; const vsync = () => { $('#rpVrow', w).hidden = !$('[data-pg="vargas"]', w).checked; }; $('[data-pg="vargas"]', w).onchange = vsync; vsync();
    $('#rpPaper', w).value = c.paper; $('#rpStyle', w).value = c.style; $('#rpBy', w).value = c.by; $('#rpFoot', w).value = c.footer;
    const showLogo = () => { const im = $('#rpLogoImg', w); im.hidden = !c.logo; im.src = c.logo || ''; $('#rpLogoX', w).hidden = !c.logo; };
    showLogo();
    const save = () => { c.vset = $('#rpVset', w).value; c.paper = $('#rpPaper', w).value; c.style = $('#rpStyle', w).value; c.by = $('#rpBy', w).value; c.footer = $('#rpFoot', w).value; $$('[data-pg]', w).forEach(b => c.pages[b.dataset.pg] = b.checked ? 1 : 0); Extra.lsSet('jt_report', c); return c; };
    w.onclick = e => { if (e.target === w) { save(); w.remove(); } };
    $('#rpClose', w).onclick = () => { save(); w.remove(); };
    $('#rpLogoX', w).onclick = () => { c.logo = ''; showLogo(); save(); };
    $('#rpLogo', w).onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const k = Math.min(1, 280 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); c.logo = cv.toDataURL('image/png'); URL.revokeObjectURL(url); showLogo(); save(); };
      img.src = url;
    };
    const build = async () => {
      const s = save(), msg = $('#rpMsg', w); msg.textContent = 'Preparing the report...';
      if (s.pages.dasa && !dasaData) { try { dasaData = await api('/api/dasa', payload({depth: 2, when: Extra.today(TZ) + 'T12:00', tz: TZ})); } catch (e) { dasaData = null; } }
      msg.textContent = '';
      return html(s);
    };
    const frame = $('#rpFrame', w);
    $('#rpPrev', w).onclick = guard(async () => { const h = await build(); frame.hidden = false; frame.srcdoc = h; });
    $('#rpPrint', w).onclick = guard(async () => {
      const h = await build(); frame.hidden = false;
      await new Promise(res => { frame.onload = res; frame.srcdoc = h; });
      setTimeout(() => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { $('#rpMsg', w).textContent = 'Printing is not available here. Use "Open in new tab", then your browser Share or Print menu.'; } }, 400);
    });
    $('#rpTab', w).onclick = guard(async () => { const h = await build(); const url = URL.createObjectURL(new Blob([h], {type: 'text/html'})); const a = window.open(url, '_blank'); if (!a) $('#rpMsg', w).textContent = 'The browser blocked the new tab. Allow pop-ups for this page.'; });
  }

  function html(s) {
    const c = S.chart, m = c.meta, cls = s.style === 'minimal' ? 'min' : 'cls';
    const style = styleNow();
    const ORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const pls = ORD.map(n => c.planets.find(x => x.name === n)).filter(Boolean);
    const svg = (n, title) => chartSVG({style, asc: n === 'C' ? c.chalit.asc_sign : c.vargas[String(n)].asc, items: n === 'C' ? chalitItems(c) : chartItems(c, n, {la: false, up: false}), title});
    const t2 = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${(x && x.html !== undefined) ? x.html : esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const sec = (title, body) => `<section><h2>${esc(title)}</h2>${body}</section>`;
    const out = [];
    const bp = c.panchanga;
    out.push(`<section class="cover"><div class="cv">${s.logo ? `<img class="logo" src="${s.logo}" alt="">` : ''}<h1>Vedic Astrology Report</h1><h2 class="nm">${esc(m.name || 'Chart')}</h2><p>${esc(m.local)}<br>${esc(m.place)}</p><p class="sm">Sidereal zodiac, ${esc(m.ayanamsa)} ayanamsa<br>Prepared ${esc(Extra.fmtDayY(Extra.today(TZ)))}${s.by ? '<br>Prepared by ' + esc(s.by) : ''}</p></div></section>`);
    if (s.pages.birth) out.push(sec('Birth details', `<div class="kv2">${[['Name', m.name || ''], ['Local time', `${m.local} (UTC${m.tz_offset >= 0 ? '+' : ''}${m.tz_offset})`], ['Place', `${m.place} (${m.lat.toFixed(3)}, ${m.lon.toFixed(3)})`], ['Lagna', `${c.asc.sign_name} ${c.asc.dms}`], ['Lagna star', `${c.asc.nak}, pada ${c.asc.pada}, lord ${c.asc.nak_lord}`], ['Moon star', `${bp.nakshatra}, pada ${bp.pada}`], ['Vara', bp.vara], ['Tithi', bp.tithi], ['Yoga', bp.yoga], ['Karana', bp.karana], ['Sunrise / sunset', `${bp.sunrise} / ${bp.sunset}`], ['Rahu kalam', bp.rahu_kalam]].map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}</div>`));
    if (s.pages.charts) out.push(sec('Charts', `<div class="two"><figure>${svg(1, 'Rasi (D1)')}<figcaption>Rasi, D1</figcaption></figure><figure>${svg(9, 'Navamsa (D9)')}<figcaption>Navamsa, D9</figcaption></figure></div><p class="sm">✦ Pushkara navamsa, ◆ Vargottama, ▲ Digbala. R = retrograde.</p>`));
    if (s.pages.chalit && c.chalit) {
      const ch = c.chalit, SIGNN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const inB = {}; Object.keys(ch.planets).forEach(n => (inB[ch.planets[n]] = inB[ch.planets[n]] || []).push(n));
      out.push(sec(chalitTitle(c), `<div class="one"><figure>${svg('C', 'Bhava Chalit')}</figure></div>${t2(['Bhava', 'Begins', 'Centre', 'Ends', 'Planets'], ch.rows.map(r => [r.house, `${SIGNN[r.begin_sign]} ${r.begin}`, `${SIGNN[r.madhya_sign]} ${r.madhya}`, `${SIGNN[r.end_sign]} ${r.end}`, (inB[r.house] || []).join(', ')]))}`));
    }
    if (s.pages.positions) {
      const flags = x => [x.states && x.states.length ? x.states.join(', ') : '', isPushkara(x.sign, x.deg) ? 'Pushkara navamsa' : '', x.vargottama ? 'Vargottama' : '', x.digbala ? 'Digbala' : '', x.retro && !['Rahu', 'Ketu'].includes(x.name) ? 'Retrograde' : '', x.combust ? 'Combust' : ''].filter(Boolean).join(', ');
      out.push(sec('Planet positions', t2(['Body', 'Sign', 'Degree', 'Nakshatra', 'Star lord', 'House', 'Dignity and state'], [['Lagna', c.asc.sign_name, c.asc.dms, `${c.asc.nak} ${c.asc.pada}`, c.asc.nak_lord, 1, isPushkara(c.asc.sign, c.asc.deg) ? 'Pushkara navamsa' : ''], ...pls.map(x => [x.name, x.sign_name, x.dms, `${x.nak} ${x.pada}`, x.nak_lord, x.house, flags(x)])])));
    }
    if (s.pages.dasa && dasaData && dasaData.periods) {
      const now = dasaData.at.when.slice(0, 10), lim = String(+now.slice(0, 4) + 20) + now.slice(4);
      const mah = dasaData.periods.filter(x => x.end >= now && x.start <= lim);
      const curM = dasaData.periods.find(x => x.start <= now && now < x.end);
      out.push(sec('Vimshottari dasa', `<p>Running now: ${dasaData.at.path.map(x => esc(x.lord)).join(' &gt; ')}</p>${t2(['Mahadasa', 'From', 'To'], mah.map(x => [x.lord, x.start, x.end]))}${curM && curM.sub ? `<h3>Antardasas in the running ${esc(curM.lord)} mahadasa</h3>${t2(['Antardasa', 'From', 'To'], curM.sub.map(x => [x.lord, x.start, x.end]))}` : ''}`));
    }
    if (s.pages.vargas) {
      const V = (VSETS[s.vset] || VSETS.shodashavarga)[1];
      out.push(sec('Divisional charts: ' + (VSETS[s.vset] || VSETS.shodashavarga)[0].split(' (')[0], t2(['Body', ...V.map(n => 'D' + n)], [['Lagna', ...V.map(n => SA[c.vargas[n].asc])], ...ORD.map(nm => [nm, ...V.map(n => SA[c.vargas[n].planets[nm]])])])));
    }
    if (s.pages.strength && c.shadbala) {
      const PL7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
      out.push(sec('Strengths (Shadbala)', t2(['Planet', 'Total (virupas)', 'Rupas', 'Required', 'Ratio', 'Rank'], PL7.map(n => { const r = c.shadbala[n]; return [n, f(r.total, 1), f(r.rupas, 2), f(r.required, 2), f(r.ratio, 2), r.rank]; })) + '<p class="sm">A ratio of 1.00 or more meets the classical minimum.</p>'));
    }
    if (s.pages.notes && cur && cur.notes) out.push(sec('Notes', `<p class="pre">${esc(cur.notes)}</p>`));
    const page = s.paper === 'Letter' ? 'Letter' : 'A4';
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(m.name || 'Report')} - Vedic report</title><style>
      :root{--acc:#2b2150;--acc2:#b9831a;--chart-bg:#fffdf8}
      @page{size:${page};margin:16mm 14mm 20mm}
      *{box-sizing:border-box}body{margin:0;font:11pt/1.45 Georgia,'Times New Roman',serif;color:#1d1a24}
      section{page-break-after:always;padding-bottom:6mm}section:last-of-type{page-break-after:auto}
      h1{font-size:26pt;margin:0 0 6mm;color:var(--acc)}h2{font-size:15pt;margin:0 0 4mm;color:var(--acc);${cls === 'cls' ? 'border-bottom:2px solid var(--acc2);padding-bottom:2mm' : ''}}h3{font-size:12pt;margin:6mm 0 2mm;color:var(--acc)}
      .cover{display:flex;align-items:center;justify-content:center;min-height:210mm;text-align:center}.cover .logo{max-height:34mm;max-width:70mm;margin-bottom:8mm}.cover .nm{font-size:20pt;border:0;margin:2mm 0 6mm}
      table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:2mm 0}th,td{border:${cls === 'cls' ? '1px solid #c9c2d6' : '0'};border-bottom:1px solid #d9d4e2;padding:2mm 2.4mm;text-align:left}th{background:${cls === 'cls' ? '#ece9f4' : 'transparent'};color:var(--acc)}
      .kv2{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm}.kv2 div{border-bottom:1px solid #e3deec;padding-bottom:1.5mm}.kv2 span{display:block;font-size:8.5pt;color:#6b6478}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.one{width:120mm;margin:0 auto}figure{margin:0}figure svg{width:100%;height:auto}figcaption{text-align:center;font-size:9pt;color:#6b6478}
      .sm{font-size:9pt;color:#6b6478}.pre{white-space:pre-wrap}
      footer{position:fixed;bottom:-14mm;left:0;right:0;font-size:8pt;color:#6b6478;text-align:center;border-top:1px solid #d9d4e2;padding-top:1.5mm}
    </style></head><body>${out.join('')}<footer>${s.by ? esc(s.by) + ' &middot; ' : ''}${s.footer ? esc(s.footer) + ' &middot; ' : ''}${esc(Extra.DISC)} Calculated with Jyotisha Tejas.</footer></body></html>`;
  }
  return {open};
})();
