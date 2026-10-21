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

## Version 3: optional cross-device sync (Oct 2026)
- In the **Garage** tab, open **Account & sync**. Enter your email, then type the 6-digit code or paste the sign-in link from the email. Paste the link on iPhone Home Screen apps: don't tap it, press and hold it, tap Copy Link, and paste it into AutoLog.
- Data syncs per record (vehicles, fill-ups, service entries, rewards programs). The newest edit wins, and deletes sync too. Sync runs when the app opens, a couple of seconds after each change, when you come back online, and from **Sync now**. Offline changes queue on the device.
- Sync never erases local data. The first sign-in on a device merges local data with your account, and a raw copy goes to `localStorage['autolog:backup:presync']`. Signing out keeps everything on the device.
- Backend: Supabase project `mzaviklrqweptobljfoo`, table `public.records` with row-level security, so each signed-in user can only read and write their own rows. There are no hard deletes. Only the public publishable key is in the client.
- `vendor/supabase.js` is a local copy of supabase-js. It's loaded only when you use sync.
- Sync isn't included in `autolog-standalone.html`.
