const CACHE_NAME = 'bendecida-tailwind-v2';

self.addEventListener('install', e => {
  self.skipWaiting(); // Obliga al celular a soltar la versión vieja inmediatamente
  e.waitUntil(caches.open(CACHE_NAME).then(cache => {
    return cache.addAll(['./', './index.html', './style.css', './app.js']);
  }));
});

self.addEventListener('activate', e => {
  // Borra la memoria basura del pasado
  e.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    }));
  }));
});

self.addEventListener('fetch', e => {
  // Ignora Firebase y Gemini para no bloquearlos
  if (e.request.url.includes('firestore') || e.request.url.includes('google')) return;
  
  // Estrategia "Network First": Siempre intenta buscar lo más nuevo en GitHub primero
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
