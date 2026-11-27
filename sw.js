// Service Worker: App offline verfügbar halten. Eigene Dateien: erst Netz (immer aktuell), sonst Cache.
// Daten aus Supabase werden nie gecacht.
const CACHE = 'bernd-v2';
const SHELL = ['./', './index.html', './css/app.css', './js/app.js', './js/data.js', './js/bernd.js', './js/mehr.js', './js/planer.js', './js/toc-sh.js', './config.js',
  './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './vendor/ui.js', './vendor/supabase.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co') || url.hostname.includes('open-meteo')) return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
      .catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
  } else if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.match(e.request).then(h => h || fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })));
  }
});
