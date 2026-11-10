/* BMChores — service worker : fonctionnement hors ligne et clic sur les notifications */
const CACHE = 'bmchores-v2';
const SDK = 'https://www.gstatic.com/firebasejs/';
const ASSETS = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/data.js', 'js/utils.js', 'js/store.js', 'js/notify.js', 'js/firebase-config.js', 'js/sync.js', 'js/app.js', 'js/views.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
   Seuls nos fichiers et le SDK Firebase passent par ici : le trafic Firestore n'est pas intercepté. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const mine = new URL(url).origin === location.origin;
  if (!mine && !url.startsWith(SDK)) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
