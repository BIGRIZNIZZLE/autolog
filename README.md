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

## Invite page (Oct 2026)
- **https://bigriznizzle.github.io/autolog/join/**: a branded install guide to share. It detects iOS Safari, other iOS browsers and in-app browsers, Android and desktop, and shows the right next step.
  - Other iOS browsers get an `x-safari-https://` "Open in Safari" button plus a copy-link fallback.
  - Android gets Chrome's install prompt (when Chrome offers it) and an Open-in-Chrome intent.
  - Desktop gets a QR code, generated at build time. No runtime services.
- Build it with `node tools/build-join.js` from `tools/join.template.html`. Rebuild the link-preview image `img/og-autolog.jpg` (1200×630) with `node tools/make-og.js`.
- The service worker never handles `/join/`. The app shows a one-time "Almost there" card when it's opened with `?join=1`, then removes the parameter. About → **Share AutoLog** shares the invite link.

## Version 9: the whole garage (Oct 2026)
- **Vehicle types.** Every vehicle has a type: Car / Truck, Motorcycle, ATV, UTV / Side-by-side, or Boat. Existing vehicles read as Car / Truck. Nothing is rewritten on load, and the type is stored the first time you save the vehicle.
- **Usage meter.** Cars and motorcycles use miles. Boats use engine hours. ATVs and UTVs use whichever you pick. Hours go in the same odometer fields, so intervals, reminders, projections, cost per hour and TCO all work the same way. Fuel economy shows as GPH for hours-based machines.
- **Sections per type:**
  - Motorcycle: chain, sprockets & belt; coolant hides on air-cooled bikes.
  - ATV/UTV: CVT belt, and diff & gear oil.
  - Boat: lower unit gear lube, impeller / water pump, fuel/water separator, anodes, trailer bearings & tires, and winterization & storage.
  - Every type gets an **Other service** entry for anything else.
  - Sections that already hold entries always stay visible.
- **Garage.** Vehicles are grouped by type, with filter chips. "All vehicles" totals cover every type, with per-mile and per-hour rates side by side. Each vehicle's distance now counts toward its own range.
- **Overview.** Diagrams per type: a motorcycle side view, an ATV/UTV top-down view, and a boat hull with trailer. Each zone is colored by health.
- **VIN/HIN.**
  - Motorcycles, ATVs and UTVs use the NHTSA VIN decode. It reports NHTSA's vehicle type and auto-selects Motorcycle.
  - Boats store a HIN as free text, with no decoding.
  - Specs are user-entered: final drive, CVT & drivetrain, lower unit & cooling.
- **Parts.** New inventory and plan categories: chain/sprockets/belt, CVT belt, gear oil, impeller kit, fuel/water separator, anodes, trailer parts. Part numbers are user-added only; the catalog ships none for these.
- **Sync and old versions.** New fields and sections sync as ordinary records. Older app versions keep unknown sections and fields. `tools/test-types-old.js` runs v7 and v8 on v9 data and checks that nothing is dropped.
- Tests: `node tools/test-types.js` and `node tools/test-types-old.js`. Screenshots: `node tools/shots-types.js`.

## Version 10: vehicle pickers and engine details (Oct 2026)

- **Find your vehicle.** Add/Edit Vehicle has searchable dropdowns: Type → Year → Make → Model → Trim / engine. Every list has **Other / type my own** and a "Use “…” (my own)" row.
  - **Cars and trucks:** makes and models from EPA fueleconomy.gov, plus NHTSA vPIC (passenger car, MPV and truck types). Trim / engine lists EPA's engine options (for example "Auto (S8), 4 cyl, 2.5 L"). Picking one fills size (L), cylinders, aspiration, fuel, transmission and drive.
  - **Motorcycles:** makes and models from NHTSA vPIC (motorcycle type).
  - **ATV / UTV:** NHTSA vPIC off-road vehicle + motorcycle types (UTV also adds low-speed vehicle). NHTSA files most Polaris, Can-Am and similar models under "motorcycle". It doesn't separate ATVs from UTVs.
  - **Boats:** there's no free boat database, so you type the make, model, engine maker and engine. Entries you type are remembered.
- **Engine section:** size in L and cc, cylinders, layout, aspiration, horsepower, fuel and notes. Each field is tagged with its source (EPA, NHTSA or You).
  - EPA doesn't publish cc or layout (V vs inline), so AutoLog leaves those for you or for a VIN lookup. Nothing is invented.
  - The engine summary shows on the dashboard header, the garage card and the Overview.
- **Fill details from database** (in the form and on Overview) uses EPA for cars, and the VIN for every type. A VIN lookup now fills displacement (L and cc), cylinders, layout and horsepower when NHTSA has them.
  - Empty fields are filled.
  - Values you typed are only replaced after a "Replace / Keep mine" prompt.
- **Your own entries:** makes, models and engines you type are saved to `vlib` and offered next time. They sync like parts.
- **My part numbers** (Overview): save exact part numbers for each vehicle. They appear marked ✓ in that vehicle's service pickers.
- **Lookups** are cached in localStorage for 30 days (EPA vehicle details 180 days), debounced, and fall back to stale cache or free text when offline. Both APIs allow CORS.
- **iPhone scroll fix (Safari, Brave and every iOS browser):** opening a dropdown or field in a sheet used to drag the whole page down and leave it stuck. Three causes, all fixed:
  - Nothing locked the page behind open sheets, so iOS scrolled the document under the fixed dialog. The page is now pinned while any dialog is open, and its position is restored when the last one closes.
  - Sheets were sized in `vh`, which on iOS is the toolbar-hidden height. They're now sized in `dvh`.
  - Some inputs were under 16px (tire tread 12.8px, price notes 15.2px), which triggers zoom-on-focus. Every text control is now at least 16px.
  - Sheet bodies and lists use `overscroll-behavior: contain`.
  - Checked with `tools/test-ios-scroll.js` (Playwright WebKit, iPhone 13).
