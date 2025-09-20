/* ImageToolkit Pro Service Worker */
const CACHE_VERSION = 'itp-v1-2025-09-20b';
// Compute base from current SW scope, so it works under root or /toolkit
const SCOPE_BASE = new URL('./', self.registration.scope).pathname.replace(/\/+/g, '/');
const APP_SHELL = [
  'index.html',
  // Key tool pages (precache for first-load offline)
  'pages/image_processing_hub.html',
  'pages/pdf_merge.html',
  'pages/pdf_split.html',
  'pages/qr_code_studio.html',
  'pages/compress-images.html',
  'pages/resize-images.html',
  'pages/convert-images.html',
  'css/main.css',
  'js/nav.js',
  'js/toast.js',
  'js/file-handler.js',
  'js/image-processor.js',
  'js/pdf-processor.js',
  'js/qr-generator.js',
  'js/toolkit-app.js',
  'public/favicon.svg',
  'public/favicon.ico',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/manifest.json',
  'public/apple-touch-icon-180.png',
  'offline.html'
].map(p => SCOPE_BASE + p);

const RUNTIME_CDN = [
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isHTMLRequest(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Network-first for HTML navigations, fallback to cached home/offline on error or non-OK
  if (isHTMLRequest(request)) {
    // Normalize known bad entry paths that can occur in standalone launch
    let navUrl = new URL(request.url);
    if (navUrl.pathname.endsWith('/public/index.html')) {
      navUrl = new URL(navUrl.origin + navUrl.pathname.replace(/\/public\/index\.html$/, '/'));
    }
    if (navUrl.pathname.endsWith('/index.html')) {
      // prefer root path to avoid duplicate cache entries
      navUrl.pathname = navUrl.pathname.replace(/index\.html$/, '');
    }

    event.respondWith((async () => {
      try {
        const resp = await fetch(navUrl, { redirect: 'follow' });
        if (resp && resp.ok) {
          caches.open(CACHE_VERSION).then(cache => cache.put(navUrl, resp.clone())).catch(()=>{});
          return resp;
        }
        // Non-OK (e.g., 404/500): try cached index, then offline
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(SCOPE_BASE + 'index.html'))
            || (await cache.match(navUrl))
            || (await cache.match(SCOPE_BASE + 'offline.html'))
            || resp; // last resort return resp
      } catch (e) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(SCOPE_BASE + 'index.html'))
            || (await cache.match(navUrl))
            || cache.match(SCOPE_BASE + 'offline.html');
      }
    })());
    return;
  }

  const url = new URL(request.url);

  // Cache-first for same-origin static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy)).catch(()=>{});
        return resp;
      }))
    );
    return;
  }

  // Stale-while-revalidate for CDN libs
  if (RUNTIME_CDN.some(prefix => request.url.startsWith(prefix))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      const networkPromise = fetch(request).then(resp => {
        cache.put(request, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || networkPromise || Response.error();
    })());
    return;
  }
});
