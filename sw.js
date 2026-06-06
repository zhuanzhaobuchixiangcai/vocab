const CACHE = 'v1';

self.addEventListener('install', e => {
  const base = self.location.pathname.replace(/\/[^/]*$/, '/');
  e.waitUntil(caches.open(CACHE).then(c => c.add(base)));
  self.skipWaiting();
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const basePath = new URL(self.location).pathname.replace(/\/[^/]*$/, '/');

  // Handle share target POST
  if (e.request.method === 'POST' && url.pathname === basePath) {
    e.respondWith((async () => {
      const fd = await e.request.formData();
      const text = (fd.get('text') || '').toString().trim();
      return Response.redirect(basePath + (text ? '?s=' + encodeURIComponent(text) : ''), 303);
    })());
    return;
  }

  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
