// Service Worker: hält die App offline verfügbar (App-Gerüst + Bibliotheken).
// Daten aus Supabase werden immer frisch geladen.
const CACHE = 'bernd-v1';
const SHELL = ['./', './index.html', './css/app.css', './js/app.js', './js/data.js', './js/bernd.js', './config.js',
  './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './vendor/ui.js', './vendor/supabase.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  const cacheable = url.origin === location.origin || url.hostname.includes('fonts.g');
  if (!cacheable) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
