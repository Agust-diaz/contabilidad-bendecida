const CACHE_NAME = 'bendecida-tailwind-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => {
    return cache.addAll(['./', './index.html', './style.css', './app.js']);
  }));
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('firestore') || e.request.url.includes('google')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});