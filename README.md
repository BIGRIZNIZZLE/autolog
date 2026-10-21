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

## Version 6: parts, inventory, statistics, dashboard (Oct 2026)
- **Parts catalog** (`parts-catalog.json`, built by `tools/build-parts-catalog.js` from `tools/parts-base.json` plus part numbers users add). Brand → Part pickers with "Other / custom" on oil, oil filter, plugs, coils, battery, tires, engine and cabin air filters, filtered by vehicle fitment (show-all toggle).
- **No retailer scraping.** Amazon, Walmart, AutoZone, Advance, O'Reilly, RockAuto and Discount Tire block automated access, so prices shown are ones you paid or noted. Last-known prices are kept and marked stale. `PRICE_FEEDS` in the builder is where a sanctioned price API would plug in.
- **Fitment card** on every form: oil capacity with filter, viscosity, plug gap and count, battery group and CCA, tire size and PSI, filter part numbers, with owner's-manual suggestions for known vehicles.
- **Price paid is required** on new entries. $0 needs the "Free / warranty / no charge" box.
- **Inventory** (low-stock reminders, "use from inventory" decrements stock) and **planned parts** (bought → inventory, install → pre-filled service entry).
- **Statistics on the device:** component life, best-value leaderboards, a deep dive (correlations, regression with 95% CI, before/after tests, seasonality, outliers, multi-factor OLS) with plain-language confidence notes, TCO, and CSV export.
- **Dashboard** with a total-cost-of-ownership hero (per mile/month/year, all-vehicles toggle) and a 12-month projection. A **Vehicle overview** tab shows what's installed now.
- Sync: parts, plans and inventory sync as account-wide records (`maint` rows with `_vid = "__acct"`), so older app versions keep them untouched.
- Daily job: `tools/update-parts-catalog.sh` (validates, publishes only if changed).

## Version 7: RIZNOSS branding (Oct 2026)
- AutoLog is **RIZNOSS Chamber 01, "The Mileage Monk."** Brand images are in `img/`, built from `brand/riznoss-emblem.jpg` by `tools/make-brand.py`, with the black background masked to transparency.
- **Launch splash:** "RIZNOSS presents · Chamber 01". At most once per browser session, about 1.5 s, tap or any key skips it. With reduced motion it's static and closes after 0.9 s. `?nosplash` skips it.
- **Branding:** the R crest sits in the header (it opens About), and a faint crest appears in the dashboard cost card. A low-opacity watermark sits behind the page content and never takes taps.
- **About** (`#/about`) and the Garage footer show "Chamber 01 · The Mileage Monk" and "Protect ya data."
- The calendar export (.ics) PRODID now names RIZNOSS. The home-screen icon is unchanged.
