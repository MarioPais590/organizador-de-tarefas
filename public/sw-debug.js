// Script de depuração do service worker
console.log('[SW-DEBUG] Inicializando service worker de depuração');

// Lista de arquivos para cache
const CACHE_NAME = 'organizador-tarefas-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Evento de instalação - cacheia recursos estáticos
self.addEventListener('install', event => {
  console.log('[SW-DEBUG] Service Worker instalando...');
  
  // Forçar ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW-DEBUG] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW-DEBUG] Todos os recursos foram cacheados');
      })
      .catch(error => {
        console.error('[SW-DEBUG] Erro ao cachear recursos:', error);
      })
  );
});

// Evento de ativação - limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[SW-DEBUG] Service Worker ativando...');
  
  // Tomar controle de todos os clientes imediatamente
  event.waitUntil(self.clients.claim());
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('[SW-DEBUG] Caches existentes:', cacheNames);
      
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW-DEBUG] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW-DEBUG] Service Worker ativado com sucesso');
    })
  );
});

// Evento de fetch - responde com recursos cacheados
self.addEventListener('fetch', event => {
  console.log('[SW-DEBUG] Requisição interceptada para:', event.request.url);
  
  // Para API e solicitações de terceiros, permitir solicitações de rede
  if (event.request.url.includes('/api/') || 
      !event.request.url.startsWith(self.location.origin)) {
    console.log('[SW-DEBUG] Solicitação de API ou de terceiros, usando rede');
    return;
  }
  
  // Para navegação SPA, sempre redirecionar para index.html
  if (event.request.mode === 'navigate') {
    console.log('[SW-DEBUG] Requisição de navegação, redirecionando para index.html');
    event.respondWith(caches.match('/'));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Recurso encontrado no cache
        if (response) {
          console.log('[SW-DEBUG] Recurso encontrado no cache:', event.request.url);
          return response;
        }
        
        console.log('[SW-DEBUG] Recurso não encontrado no cache, buscando da rede:', event.request.url);
        
        // Clonar a requisição porque é consumível apenas uma vez
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              console.log('[SW-DEBUG] Resposta não válida para cache');
              return response;
            }
            
            console.log('[SW-DEBUG] Cacheando novo recurso:', event.request.url);
            
            // Clonar a resposta porque é consumível apenas uma vez
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[SW-DEBUG] Recurso adicionado ao cache:', event.request.url);
              });
              
            return response;
          })
          .catch(error => {
            console.error('[SW-DEBUG] Erro ao buscar recurso:', error);
            // Se falhar, tente fornecer uma resposta alternativa do cache
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Evento de sincronização em segundo plano
self.addEventListener('sync', event => {
  console.log('[SW-DEBUG] Evento de sincronização:', event.tag);
  
  if (event.tag === 'sync-data') {
    console.log('[SW-DEBUG] Sincronizando dados em segundo plano');
    // Implementar lógica de sincronização
  }
});

// Evento de notificação push
self.addEventListener('push', event => {
  console.log('[SW-DEBUG] Notificação push recebida:', event.data.text());
  
  const data = event.data.json();
  
  const title = data.title || 'Organizador de Tarefas';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW-DEBUG] Notificação exibida');
      })
      .catch(error => {
        console.error('[SW-DEBUG] Erro ao exibir notificação:', error);
      })
  );
});

// Evento de clique em notificação
self.addEventListener('notificationclick', event => {
  console.log('[SW-DEBUG] Notificação clicada:', event.notification.tag);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(windowClients => {
      // Verificar se já há uma janela/aba aberta e focá-la
      for (let client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          console.log('[SW-DEBUG] Focando janela existente');
          return client.focus();
        }
      }
      
      // Abrir nova janela/aba se nenhuma estiver aberta
      if (clients.openWindow) {
        console.log('[SW-DEBUG] Abrindo nova janela');
        return clients.openWindow('/');
      }
    })
  );
});

console.log('[SW-DEBUG] Service worker de depuração inicializado com sucesso'); 