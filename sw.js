const CACHE_NAME = 'bendecida-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './firebase-config.js',
  './manifest.json'
];

// Instalación: El obrero guarda los materiales de construcción
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados bajo la gracia de Dios.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación: Limpia versiones viejas si hacemos actualizaciones
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones (Estrategia: Network First, falling back to cache)
self.addEventListener('fetch', event => {
  // Ignoramos las peticiones a la API de Firestore y Gemini, solo cacheamos la interfaz
  if (event.request.url.includes('firestore') || event.request.url.includes('google')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});