# Jyotisha Tejas (offline app)

Runs entirely on the phone or computer, with no server and no internet after install. The calculation engine is the same Python code as the Mac version, run inside the app with Pyodide (Python in WebAssembly) on top of the Swiss Ephemeris compiled to WebAssembly (Moshier mode, no ephemeris files). Birth profiles and saved views stay on the device (IndexedDB). Use Saved > Export backup now and then.

Checked: 27 calls (charts in 4 cities incl. a polar one, panchanga, dasa, transits, sign times, moves, KP, Varsha, Tithi Pravesha, Prasna) give identical numbers to the Python version, and the app works in Chromium with the network switched off. Not tested on a real iPhone or Android phone, and the native wrappers were not built here (the build servers were not reachable from my workspace).

## Fastest way: install as a home-screen app (no builds)
`www/` is a plain static site. Put it on any free static host once, open the address on the phone, then Add to Home Screen. After the first load it works in airplane mode.
1. Host `www/`: GitHub Pages (upload the contents of `www/` to a repo, Settings > Pages), or drag the `www` folder onto https://app.netlify.com/drop, or Cloudflare Pages.
2. iPhone: open in Safari > Share > Add to Home Screen. Android: Chrome > menu > Install app.
3. Open it once while online and wait until the header chip "Loading engine..." disappears (about 25 MB is cached).
The site holds only the app code. No birth data is ever sent anywhere.

Try it on your computer first: `cd www && python3 -m http.server 8000`, then open http://localhost:8000

## Real native apps (Capacitor)
Needs `npm install` once (Node 18+). Native projects are in `ios/` and `android/`.
- Refresh the app files inside them: `npm run sync`
- iPhone (needs a Mac with Xcode): `npx cap open ios`, select the App target > Signing & Capabilities > pick your Apple ID team, choose your iPhone, press Run. A free Apple ID signs the app for 7 days (re-run to renew); a paid developer account ($99/yr) removes that limit. iOS 15 or newer.
- Android (Android Studio, JDK 17+): `npx cap open android`, then Build > Build APK(s). Or `cd android && ./gradlew assembleDebug`; the file is `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to the phone and allow "install unknown apps".

If a native build shows "Engine failed", tell me the message: the engine normally runs in a web worker and falls back to the main thread by itself, but that fallback has not been tried inside the native shells.

## Files
- `www/` the app: `index.html`, `app.js` (screens), `store.js` (profiles, saved views, backup), `engine.js` (talks to the engine), `engine/worker.js` (bundled engine host), `py/` (Python engine: `jh/` plus `api.py`, `swisseph.py` shim), `data/places.json` (34,000 places with time zones), `vendor/` (Pyodide, Swiss Ephemeris wasm, tzdata), `sw.js` (generated offline cache).
- `engine-src.mjs` and `vendor-src/` source for `engine/worker.js`. After editing either: `npm run bundle`. After editing anything in `www/`: `python3 build.py` (refreshes the offline cache list).
- Time zone from coordinates alone uses the nearest bundled place, so it can be wrong close to a border. Pick a place from the list or type the time zone.

## Hosting on GitHub Pages
Push to `main`. `.github/workflows/deploy.yml` runs `build.py` and publishes `www/`. Repo Settings > Pages > Source must be "GitHub Actions".
