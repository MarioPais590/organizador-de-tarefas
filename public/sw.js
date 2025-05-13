/**
 * Service Worker para o Organizador de Tarefas
 * Implementa o caching de recursos estáticos para funcionamento offline
 */

// Nome do cache
const CACHE_NAME = 'organizador-tarefas-v1';

// Arquivos a serem cacheados inicialmente
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Evento de instalação - pré-cachear arquivos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Pré-cachear arquivos
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Evento de ativação - limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Agora está gerenciando os clientes');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições de rede - estratégia Cache First
self.addEventListener('fetch', event => {
  // Ignorar requisições de análise ou que não sejam GET
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') || 
      event.request.url.includes('analytics')) {
    return;
  }
  
  // Estratégia Cache First para arquivos estáticos
  if (event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|html|json)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retorna do cache se encontrado
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Caso contrário, busca da rede
          return fetch(event.request)
            .then(response => {
              // Se a resposta for válida, cloná-la e armazená-la no cache
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
        })
    );
  } else {
    // Estratégia Network First para outras requisições
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se a resposta for válida, cloná-la e armazená-la no cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se falhar, tenta buscar do cache
          console.log('[Service Worker] Buscando do cache:', event.request.url);
          return caches.match(event.request);
        })
    );
  }
}); 