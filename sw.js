const CACHE = 'vocab-v6';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    await self.clients.claim();
    // Delete old caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    console.log('[SW] activated, cache:', CACHE);
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const basePath = self.location.pathname.replace(/\/[^/]*$/, '/');

  // Handle share target POST
  if (e.request.method === 'POST' && url.pathname === basePath) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const text = (fd.get('text') || '').toString().trim();
        console.log('[SW] share target POST, text:', text);
        return Response.redirect(basePath + (text ? '?s=' + encodeURIComponent(text) : ''), 303);
      } catch (err) {
        console.error('[SW] POST error:', err);
        return Response.redirect(basePath, 303);
      }
    })());
    return;
  }

  // Only handle GET
  if (e.request.method !== 'GET') return;

  // Network-first: always try network, fall back to cache
  e.respondWith((async () => {
    try {
      const netResp = await fetch(e.request);
      // Cache successful GET responses (only same-origin)
      if (netResp.ok && url.origin === self.location.origin) {
        const cloned = netResp.clone();
        const cache = await caches.open(CACHE);
        cache.put(e.request, cloned);
      }
      return netResp;
    } catch (err) {
      // Offline — try cache
      const cached = await caches.match(e.request);
      if (cached) return cached;
      // Return a simple offline page for navigation requests
      if (e.request.mode === 'navigate') {
        return new Response(
          '<html><body style="font-family:sans-serif;text-align:center;padding-top:80px">' +
          '<h2>离线中</h2><p>请连接网络后重试</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      throw err;
    }
  })());
});
