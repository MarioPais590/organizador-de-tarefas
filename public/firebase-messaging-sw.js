// Firebase Cloud Messaging Service Worker
// Este arquivo é necessário para receber notificações push em segundo plano via FCM

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBQHF0SZLuQikADgSjzuJpRD1fvkQ_-YWk",
  authDomain: "organizador-tarefas-pwa.firebaseapp.com",
  projectId: "organizador-tarefas-pwa",
  storageBucket: "organizador-tarefas-pwa.appspot.com",
  messagingSenderId: "768213431792",
  appId: "1:768213431792:web:5b8c7da6e0370b6a8ac3e1",
  measurementId: "G-LL6W2B8MNZ"
});

// Inicializar serviço de mensagens
const messaging = firebase.messaging();

// Função para determinar se é uma mensagem FCM ou uma notificação push padrão
function isFCMMessage(event) {
  try {
    const data = event.data ? event.data.json() : {};
    return data && data.firebase && data.firebase.messaging;
  } catch (e) {
    return false;
  }
}

// Manipular mensagens em segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[Firebase Messaging SW] Mensagem recebida em segundo plano:', payload);
  
  // Configuração da notificação
  const notificationTitle = payload.notification.title || 'Nova tarefa';
  const notificationOptions = {
    body: payload.notification.body || 'Você tem uma tarefa pendente',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.data && payload.data.tarefaId ? `tarefa-${payload.data.tarefaId}` : 'tarefa',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'view',
        title: 'Ver detalhes'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  // Adicionar conteúdo específico para iOS para garantir que funcione em segundo plano
  if (notificationOptions.data) {
    notificationOptions.data['content-available'] = '1';
    notificationOptions.data.priority = 'high';
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Evento de clique em notificação
self.addEventListener('notificationclick', function(event) {
  console.log('[Firebase Messaging SW] Notificação clicada', event);
  
  // Fechar a notificação
  event.notification.close();
  
  // Dados personalizados da notificação
  const notificacaoData = event.notification.data || {};
  let urlDestino = '/';
  
  // Se a notificação contém dados sobre a tarefa, construir URL para a tarefa
  if (notificacaoData.tarefaId) {
    urlDestino = `/tarefa/${notificacaoData.tarefaId}`;
  }
  
  // Processar ações específicas
  if (event.action === 'view' && notificacaoData.tarefaId) {
    urlDestino = `/tarefa/${notificacaoData.tarefaId}`;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(clientList => {
      // Verificar se já há uma janela/aba aberta e focá-la
      for (let client of clientList) {
        if ('focus' in client) {
          client.navigate(urlDestino);
          return client.focus();
        }
      }
      
      // Abrir nova janela/aba se nenhuma estiver aberta
      if (clients.openWindow) {
        return clients.openWindow(urlDestino);
      }
    })
  );
});

// Evento push para compatibilidade com push padrão
self.addEventListener('push', function(event) {
  // Ignora se for uma mensagem FCM, pois já foi tratada pelo onBackgroundMessage
  if (isFCMMessage(event)) return;
  
  console.log('[Firebase Messaging SW] Push recebido:', event);
  
  let notification = {};
  
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: 'Nova notificação',
      body: 'Você tem uma notificação pendente',
      data: {}
    };
  }
  
  // Configuração da notificação
  const options = {
    body: notification.body || 'Você tem uma notificação pendente',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: notification.data || {},
    requireInteraction: true,
    vibrate: [100, 50, 100]
  };
  
  event.waitUntil(
    self.registration.showNotification(notification.title || 'Nova notificação', options)
  );
});

// Evento de instalação - comunicar com o Service Worker principal
self.addEventListener('install', function(event) {
  console.log('[Firebase Messaging SW] Instalado');
  self.skipWaiting();
});

// Evento de ativação - tomar controle imediato
self.addEventListener('activate', function(event) {
  console.log('[Firebase Messaging SW] Ativado');
  event.waitUntil(clients.claim());
});

// Comunicação com o Service Worker principal
self.addEventListener('message', function(event) {
  console.log('[Firebase Messaging SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'PING') {
    // Responder para confirmar que este service worker está ativo
    event.ports[0].postMessage({
      type: 'PONG',
      status: 'active',
      timestamp: Date.now()
    });
  }
}); 