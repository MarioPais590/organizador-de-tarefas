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

// Suporte a notificações em segundo plano
self.addEventListener('push', (event) => {
  let notificationData = {};
  
  try {
    if (event.data) {
      notificationData = event.data.json();
    }
  } catch (e) {
    console.error('Erro ao processar dados da notificação push:', e);
    notificationData = {
      title: 'Nova notificação',
      body: 'Você tem uma tarefa pendente',
      icon: '/icons/icon-192x192.png'
    };
  }
  
  // Dados padrão se não tiver informações suficientes
  const title = notificationData.title || 'Organizador de Tarefas';
  const options = {
    body: notificationData.body || 'Você tem uma tarefa pendente',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: notificationData.url || '/'
    },
    actions: [
      {
        action: 'visualizar',
        title: 'Visualizar',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'fechar',
        title: 'Fechar',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Tratamento de cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';
  
  if (event.action === 'fechar') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // Verificar se já existe uma janela aberta para esse URL
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Se não encontrou, abrir uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Verificar periodicamente por tarefas a cada hora (mesmo com app fechado)
const INTERVALO_VERIFICACAO = 60 * 60 * 1000; // 1 hora em milissegundos

self.addEventListener('sync', (event) => {
  if (event.tag === 'verificar-tarefas') {
    event.waitUntil(verificarTarefasPendentes());
  }
});

// Função para verificar tarefas pendentes
async function verificarTarefasPendentes() {
  // Esta função seria implementada para buscar tarefas no IndexedDB
  // ou em outro armazenamento local e enviar notificações se necessário
  console.log('Verificando tarefas pendentes em segundo plano');
  
  try {
    // Verificar se temos dados no IndexedDB
    // Implementação básica para mostrar como enviar uma notificação de teste
    const now = new Date();
    const hora = now.getHours();
    
    // Só enviar notificação se for hora comercial (exemplo)
    if (hora >= 8 && hora <= 20) {
      const title = 'Lembrete de Tarefas';
      const options = {
        body: 'Não se esqueça de verificar suas tarefas pendentes para hoje',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          url: '/'
        }
      };
      
      await self.registration.showNotification(title, options);
    }
  } catch (error) {
    console.error('Erro ao verificar tarefas pendentes:', error);
  }
}

// Registrar verificação periódica quando o service worker estiver ativo
self.addEventListener('activate', event => {
  // Registrar sincronização periódica para navegadores que suportam
  if ('periodicSync' in self.registration) {
    event.waitUntil(
      self.registration.periodicSync.register('verificar-tarefas', {
        minInterval: INTERVALO_VERIFICACAO
      })
    );
  }
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