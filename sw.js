/* AutoLog service worker: offline app shell, update prompt, reminder notifications */
const CACHE = 'autolog-v3';
const DATA = 'autolog-data'; // reminder snapshot written by the page (never deleted on upgrade)
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './rewards-data.js', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })));
    // Versions before v3 had no "update available" prompt, so pages running them could never
    // tell this worker to take over. Activate right away when replacing one of those.
    const keys = await caches.keys();
    if (keys.some(k => k === 'autolog-v1' || k === 'autolog-v2')) await self.skipWaiting();
  })());
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('autolog-v') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Network first so a new deploy shows up right away; offline falls back to this page's cached copy, then the app shell.
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});

/* Opportunistic background reminders (Chrome/Android installed apps only). */
const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
async function notifyFromSnapshot() {
  const c = await caches.open(DATA);
  const r = await c.match('./__reminders.json'); if (!r) return;
  const { items = [] } = await r.json();
  const sr = await c.match('./__notified.json'); const sent = sr ? await sr.json() : {};
  const today = localISO(), soon = localISO(new Date(Date.now() + 14 * 864e5));
  for (const i of items) {
    if (!i.effDate || i.effDate > soon) continue;
    if (sent[i.key] && Date.now() - sent[i.key] < 20 * 3600e3) continue;
    await self.registration.showNotification(`${i.title} ${i.effDate <= today ? 'overdue' : 'due soon'}`, { body: `${i.vname}: ${i.text}`, tag: i.key, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: './#/reminders' } });
    sent[i.key] = Date.now();
  }
  await c.put('./__notified.json', new Response(JSON.stringify(sent), { headers: { 'Content-Type': 'application/json' } }));
}
self.addEventListener('periodicsync', e => { if (e.tag === 'autolog-reminders') e.waitUntil(notifyFromSnapshot()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ type: 'NAV', hash: '#/reminders' }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
