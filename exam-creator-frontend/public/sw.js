// EvalPro Service Worker — cache-first pour les assets statiques
const CACHE_NAME = 'evalpro-v2';

// Assets à mettre en cache lors de l'installation
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first pour les appels API, cache-first pour les assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels API ni les websockets
  if (url.pathname.startsWith('/api/') || event.request.url.includes('supabase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});

// Réception des notifications push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'EvalPro', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'EvalPro', {
      body: payload.body || '',
      icon: '/evalpro-icon.svg',
      badge: '/favicon.ico',
      tag: payload.tag || 'evalpro',
      data: payload.url ? { url: payload.url } : undefined,
    })
  );
});

// Clic sur une notification → ouvrir l'URL associée
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
