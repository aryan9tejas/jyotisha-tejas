/* Web worker (falls back to the main thread if workers are unavailable): Swiss Ephemeris (WebAssembly) + Python engine (Pyodide). Bundled to www/engine/worker.js as a module worker. */
import SwissEPH from './vendor-src/sweph/index.js';
import * as Places from './www/places.mjs';

const ROOT = new URL('../', import.meta.url).href;
const IN_WORKER = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
let api = null;

function post(m) { if (IN_WORKER) self.postMessage(m); else window.dispatchEvent(new CustomEvent('engine-msg', {detail: m})); }

async function init() {
  post({type: 'status', msg: 'Loading ephemeris...'});
  const swe = await SwissEPH.init(ROOT + 'vendor/sweph/swisseph.wasm');
  await Places.load(ROOT + 'data/places.json');
  post({type: 'status', msg: 'Starting Python engine...'});
  const {loadPyodide} = await import(/* @vite-ignore */ ROOT + 'vendor/pyodide/pyodide.mjs');
  const py = await loadPyodide({indexURL: ROOT + 'vendor/pyodide/'});
  py.registerJsModule('_swe_js', {
    julday: (y, m, d, h, g) => swe.swe_julday(y, m, d, h, g),
    revjul: (jd, g) => swe.swe_revjul(jd, g),
    set_sid_mode: (m, a, b) => swe.swe_set_sid_mode(m, a, b),
    get_ayanamsa_ut: jd => swe.swe_get_ayanamsa_ut(jd),
    calc_ut: (jd, ipl, f) => swe.swe_calc_ut(jd, ipl, f),
    houses_ex: (jd, f, lat, lon, h) => swe.swe_houses_ex(jd, f, lat, lon, h),
    rise_trans: (jd, ipl, ef, rsmi, lon, lat, alt, p, t) => swe.swe_rise_trans(jd, ipl, null, ef, rsmi, [lon, lat, alt], p, t),
    tz_for: (lat, lon) => Places.tzFor(lat, lon),
  });
  const wheel = await (await fetch(ROOT + 'vendor/tzdata.whl')).arrayBuffer();
  await py.unpackArchive(wheel, 'wheel');
  const files = await (await fetch(ROOT + 'py/manifest.json')).json();
  for (const f of files) {
    const dir = f.includes('/') ? '/home/pyodide/py/' + f.slice(0, f.lastIndexOf('/')) : '/home/pyodide/py';
    py.FS.mkdirTree(dir);
    py.FS.writeFile('/home/pyodide/py/' + f, new Uint8Array(await (await fetch(ROOT + 'py/' + f)).arrayBuffer()));
  }
  py.runPython("import sys; sys.path.insert(0, '/home/pyodide/py')");
  api = py.pyimport('api');
  post({type: 'ready'});
}

const ready = init().catch(e => { post({type: 'fatal', error: String(e && e.stack || e)}); throw e; });

async function handle({id, path, body}) {
  try {
    await ready;
    const res = api.dispatch(path, body);
    post({type: 'result', id, result: res});
  } catch (e) {
    post({type: 'result', id, result: JSON.stringify({error: String(e && e.message || e)})});
  }
}
if (IN_WORKER) self.onmessage = ev => handle(ev.data);
else window.__engineCall = handle;
