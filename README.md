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

## Version 2 (Oct 2026)
- **VIN lookup.** The app checks the 17-character VIN and its check digit, then decodes it through NHTSA vPIC (`DecodeVinValuesExtended`). Year, make, model, trim, engine, fuel type, drive, body, and transmission are filled in for you to review before saving. Lookup also works on existing vehicles (Specs, then Re-run VIN lookup).
- **Specs card** (Dashboard, then Specs, or Garage, then Specs):
  - vPIC details.
  - EPA city/highway/combined MPG and fuel from fueleconomy.gov, compared with your real average in Insights.
  - Owner's-manual specs that you enter yourself: oil, tires and PSI, plugs, coolant, battery, brakes. AutoLog never guesses these. Each group has "Where to find this" tips and a search link.
  - Specs pre-fill service forms and flag mismatches, such as PSI below spec, low octane, wrong oil viscosity, or wrong battery group.
- **Reminders** (bell icon). Upcoming and overdue service across all vehicles, by miles (projected from your average miles per day) and by date.
  - App badge and in-app banner.
  - Optional notifications when you open the app. Background checks happen opportunistically on installed Chrome/Android apps.
  - Each item can be added to your calendar as an `.ics` file with alerts.
- **Updates.** When a new version is ready, a bar appears: "Update available, tap to reload".
- **Data.** Existing data is migrated in place to schema v2. An untouched copy of the old data is kept in `localStorage['autolog:backup:v1']`.
