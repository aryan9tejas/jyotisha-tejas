/* Offline place search and nearest-place time zone (data from GeoNames via geonamescache). Used by the page and the worker. */
let DATA = null;
let LOADING = null;

export function load(url) {
  if (DATA) return Promise.resolve(DATA);
  if (!LOADING) LOADING = fetch(url).then(r => r.json()).then(d => { DATA = d; return d; });
  return LOADING;
}

export function search(q, limit = 15) {
  if (!DATA) return [];
  q = (q || '').trim().toLowerCase();
  if (q.length < 2) return [];
  let region = null;
  if (q.includes(',')) { const i = q.indexOf(','); region = q.slice(i + 1).trim(); q = q.slice(0, i).trim(); }
  const out = [];
  for (const r of DATA.rows) {
    const nm = r[0].toLowerCase();
    let rank = null;
    if (nm === q) rank = 0;
    else if (nm.startsWith(q)) rank = 1;
    else if (q.length >= 3 && r[6] && ('|' + r[6] + '|').includes('|' + q + '|')) rank = 2;
    else if (q.length >= 3 && nm.includes(q)) rank = 3;
    if (rank === null) continue;
    const cc = DATA.cc[r[1]];
    if (region) {
      const cn = (DATA.country[cc] || cc).toLowerCase();
      if (!(cn.startsWith(region) || cc.toLowerCase() === region)) continue;
    }
    out.push([rank, -r[4], r]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out.slice(0, limit).map(([, , r]) => {
    const cc = DATA.cc[r[1]], country = DATA.country[cc] || cc;
    return {name: r[0], country, cc, lat: r[2], lon: r[3], tz: DATA.tz[r[5]], population: r[4], label: `${r[0]}, ${country}`};
  });
}

/* nearest bundled place decides the time zone when only coordinates are known (approximate near borders) */
export function tzFor(lat, lon) {
  if (!DATA) return null;
  let best = null, bd = 1e18;
  const cl = Math.cos(lat * Math.PI / 180);
  for (const r of DATA.rows) {
    let dx = (r[3] - lon); if (dx > 180) dx -= 360; if (dx < -180) dx += 360;
    const d = (r[2] - lat) ** 2 + (dx * cl) ** 2;
    if (d < bd) { bd = d; best = r; }
  }
  return best ? DATA.tz[best[5]] : null;
}
