// Versão do cache
const CACHE_NAME = 'organizador-tarefas-v1';

// Arquivos a serem cacheados
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/assets/index-CwkMYUte.css',
  '/assets/index-Bracgnp6.js'
];

// Instalação do service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto com sucesso');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Falha ao adicionar itens ao cache:', error);
      })
  );
  // Força o service worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// Ativação do service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Garante que o service worker controle imediatamente todas as páginas
  self.clients.claim();
});

// Estratégia de cache: stale-while-revalidate
self.addEventListener('fetch', (event) => {
  // Ignora requisições não GET
  if (event.request.method !== 'GET') return;
  
  // Ignora requisições de outros domínios
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Usa o cache primeiro enquanto busca uma atualização da rede
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Se a resposta for válida, cloná-la e armazená-la no cache
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('Falha na rede, usando cache para:', event.request.url);
          // Se a rede falhar, retorna o cachedResponse como fallback
        });
      
      return cachedResponse || fetchPromise;
    })
  );
}); 