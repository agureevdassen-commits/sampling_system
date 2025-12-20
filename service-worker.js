const CACHE_NAME = 'sampling-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://unpkg.com/@zxing/library@latest/umd/index.js'
];

// Установка service worker и кэширование ресурсов
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('Some resources failed to cache:', err);
          // Не падаем, если ZXing не загрузился
          return cache.addAll(urlsToCache.filter(url => !url.includes('zxing')));
        });
      })
  );
  self.skipWaiting();
});

// Активация и удаление старых кэшей
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Стратегия: cache-first для статики, network-first для API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Никогда не кэшировать API запросы
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Нет соединения с сервером' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Cache-first для статики
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // Если ничего не помогло, возвращаем закэшированный индекс (если есть)
            return caches.match('/index.html')
              .then((response) => response || new Response('Приложение недоступно (офлайн)', { status: 503 }));
          });
      })
  );
});

// Обработка сообщений от клиента (для управления версией SW)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
