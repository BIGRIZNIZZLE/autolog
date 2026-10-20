# AutoLog: Fuel & Maintenance Tracker (PWA)

A static, offline-capable web app that also installs to a phone's home screen. There's no backend and no account. All data stays in the browser (localStorage key `autolog:data:v1`). Use Garage → Backup to export or import JSON.

## Run
- Any static server: `python3 -m http.server 8765` in this folder, then open http://localhost:8765/
- Installing as a PWA (with the service worker) needs HTTPS or localhost. Host the folder on any static host (Netlify, GitHub Pages, Cloudflare Pages…).
- `autolog-standalone.html` is a single self-contained file. Open it directly; it has no offline service worker or install prompt.

## Files
index.html · styles.css · app.js (app) · rewards-data.js (rewards reference library, checked Oct 2026) · sw.js · manifest.json · icons/

## Rebuild the standalone file
`python3 tools/build-standalone.py`
