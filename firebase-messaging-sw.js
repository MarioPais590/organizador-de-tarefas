/**
 * Firebase Cloud Messaging Service Worker
 * Responsável pelo recebimento de notificações push em segundo plano
 * Compatível com iOS e Android para aplicativos PWA
 */

// Versão do Service Worker
const SW_VERSION = '1.3.0';

// Configurações do Firebase
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Cache das configurações para usar mesmo offline
let firebaseConfig = {
  apiKey: "AIzaSyD_k-G6kXBaxXdBCtzmSwdggzwSENv_jUE",
  authDomain: "organizador-de-tarefas-c5c71.firebaseapp.com",
  projectId: "organizador-de-tarefas-c5c71",
  storageBucket: "organizador-de-tarefas-c5c71.appspot.com",
  messagingSenderId: "661582526021",
  appId: "1:661582526021:web:d30f8ed044a1b1dea3c9aa",
  measurementId: "G-VDEERLQ0K3"
};

// VAPID Key para Web Push
const VAPID_KEY = "BHDFdff_CxSImgN_82PjqVxNbwXbUUwYaGx__SMZfpxLvBo7xXTNQMlPCnTQ-Cr1qpAhEqXbUMk_Lvi92HX5Ttk";

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obter instância de Firebase Messaging
const messaging = firebase.messaging();

// Estado e configurações
let notificationOptions = {
  silent: false,
  vibrate: [200, 100, 200],
  badge: '/icons/icon-128x128.png',
  icon: '/task-manager-icon.png',
  // Tag para garantir que as notificações sejam agrupadas
  tag: 'task-organizer',
  // Para iOS: permitir que a notificação acorde o dispositivo
  requireInteraction: true,
  // Para Android: definir prioridade máxima
  priority: 'high',
  // Ações para a notificação
  actions: [
    {
      action: 'view',
      title: 'Ver tarefa'
    },
    {
      action: 'dismiss',
      title: 'Ignorar'
    }
  ]
};

// Estado do cliente
let clientState = {
  inBackground: true,
  lastActivity: Date.now(),
  platform: 'unknown',
  deviceType: 'unknown',
  iosVersion: null,
  fcmToken: null,
  notificationsEnabled: true
};

// Cache para tarefas pendentes
let pendingTasks = [];

// Gerenciamento de ciclo de vida do Service Worker

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log(`[Firebase SW] Instalando versão ${SW_VERSION}`);
  
  // Ativa o novo Service Worker imediatamente
  self.skipWaiting();
  
  // Persistir configurações iniciais
  event.waitUntil(
    caches.open('fcm-settings').then(cache => {
      return cache.put('fcm-config', new Response(JSON.stringify({
        version: SW_VERSION,
        initialized: Date.now(),
        notificationOptions
      })));
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log(`[Firebase SW] Ativando versão ${SW_VERSION}`);
  
  // Assume o controle de todos os clientes imediatamente
  event.waitUntil(clients.claim());
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Remover caches antigos
          return cacheName.startsWith('fcm-') && cacheName !== 'fcm-settings' && cacheName !== 'fcm-tasks';
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  
  // Inicializar estado
  initializeState();
});

// Detecção de sistema operacional e dispositivo
function detectPlatform(userAgent) {
  // Definir plataforma padrão como 'unknown'
  let platform = 'unknown';
  let deviceType = 'desktop';
  let iosVersion = null;
  
  if (!userAgent) return { platform, deviceType, iosVersion };
  
  // Detectar iOS
  if (/iPad|iPhone|iPod/.test(userAgent) || 
      (userAgent.includes('Mac') && userAgent.includes('Mobile'))) {
    platform = 'ios';
    deviceType = 'mobile';
    
    // Extrair versão do iOS
    const match = userAgent.match(/OS (\d+)_/);
    iosVersion = match && match[1] ? parseInt(match[1], 10) : null;
  }
  // Detectar Android
  else if (/Android/.test(userAgent)) {
    platform = 'android';
    deviceType = 'mobile';
  }
  // Outros móveis
  else if (/Mobi|Mobile/.test(userAgent)) {
    platform = 'other-mobile';
    deviceType = 'mobile';
  }
  
  return { platform, deviceType, iosVersion };
}

// Inicializar estado do Service Worker
async function initializeState() {
  try {
    // Tentar restaurar config do cache
    const cache = await caches.open('fcm-settings');
    const configResponse = await cache.match('fcm-config');
    
    if (configResponse) {
      const config = await configResponse.json();
      notificationOptions = { ...notificationOptions, ...config.notificationOptions };
      console.log('[Firebase SW] Configurações restauradas do cache');
    }
    
    // Tentar restaurar tarefas pendentes
    const tasksCache = await caches.open('fcm-tasks');
    const tasksResponse = await tasksCache.match('pending-tasks');
    
    if (tasksResponse) {
      const tasks = await tasksResponse.json();
      pendingTasks = tasks;
      console.log(`[Firebase SW] ${pendingTasks.length} tarefas restauradas do cache`);
    }
    
  } catch (error) {
    console.error('[Firebase SW] Erro ao inicializar estado:', error);
  }
}

// Salvar tarefas pendentes no cache
async function savePendingTasks() {
  try {
    const cache = await caches.open('fcm-tasks');
    await cache.put('pending-tasks', new Response(JSON.stringify(pendingTasks)));
  } catch (error) {
    console.error('[Firebase SW] Erro ao salvar tarefas pendentes:', error);
  }
}

// Recebimento de mensagens FCM em segundo plano
messaging.onBackgroundMessage(async (payload) => {
  console.log('[Firebase SW] Mensagem recebida em segundo plano:', payload);
  
  let title = 'Nova notificação';
  let body = 'Você tem uma nova notificação';
  let data = payload.data || {};
  
  // Extrair título e corpo da notificação se disponíveis
  if (payload.notification) {
    title = payload.notification.title || title;
    body = payload.notification.body || body;
  }
  
  // Dados customizados para iOS
  const iosConfig = clientState.platform === 'ios' ? {
    contentAvailable: true,
    mutableContent: true,
    threadId: 'task-organizer'
  } : {};
  
  // Preparar configurações da notificação
  const options = {
    ...notificationOptions,
    body,
    data: {
      ...data,
      timestamp: Date.now(),
      source: 'fcm-background',
      ...iosConfig
    }
  };
  
  // Para iOS, ajustar configurações específicas
  if (clientState.platform === 'ios') {
    // Adicionar parâmetros específicos para iOS
    options.silent = false; // Nunca silencioso para iOS em segundo plano
    options.requireInteraction = true;
  }
  
  // Para Android, ajustar configurações
  if (clientState.platform === 'android') {
    options.vibrate = [200, 100, 200, 100, 200];
    options.priority = 'high';
    options.badge = '/icons/icon-128x128.png';
  }
  
  try {
    // Mostrar notificação
    const notification = await self.registration.showNotification(title, options);
    
    // Para iOS e Android, registrar notificação programada
    if (clientState.platform === 'ios' || clientState.platform === 'android') {
      // Armazenar notificação para fins de diagnóstico
      const notificationRecord = {
        id: Date.now().toString(),
        title,
        body,
        timestamp: Date.now(),
        platform: clientState.platform,
        shown: true
      };
      
      // Salvar no IndexedDB ou cache para fins de diagnóstico
      try {
        const diagCache = await caches.open('fcm-diagnostics');
        await diagCache.put(`notification-${notificationRecord.id}`, 
          new Response(JSON.stringify(notificationRecord)));
      } catch (diagError) {
        console.error('[Firebase SW] Erro ao salvar diagnóstico:', diagError);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('[Firebase SW] Erro ao mostrar notificação:', error);
    
    // Tentar método alternativo para iOS
    if (clientState.platform === 'ios') {
      try {
        // No iOS, às vezes o showNotification falha, tentamos um método diferente
        const notificationAlt = new Notification(title, { 
          ...options,
          badge: options.badge || '/task-manager-icon.png'
        });
        return notificationAlt;
      } catch (iosError) {
        console.error('[Firebase SW] Erro ao usar método alternativo para iOS:', iosError);
      }
    }
  }
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notificação clicada:', event);
  
  // Fechar a notificação
  event.notification.close();
  
  // Extrair dados
  const data = event.notification.data || {};
  
  // Determinar URL para abrir
  let url = '/';
  
  // Se tiver um ID de tarefa específico
  if (data.tarefaId) {
    url = `/tarefas?id=${data.tarefaId}`;
  } else if (data.url) {
    url = data.url;
  }
  
  // Verificar se foi clicado em uma ação específica
  if (event.action === 'view' && data.tarefaId) {
    url = `/tarefas?id=${data.tarefaId}&action=view`;
  }
  
  // Abrir ou focar a janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Verificar se já existe uma janela aberta
      for (const client of clientList) {
        // Se já tiver uma janela aberta, navegar para a URL
        if ('navigate' in client) {
          return client.navigate(url).then(client => client.focus());
        }
      }
      
      // Se não tiver janela aberta, abrir uma nova
      return clients.openWindow(url);
    })
  );
});

// Recebimento de mensagens do cliente
self.addEventListener('message', (event) => {
  const message = event.data;
  
  if (!message || !message.type) return;
  
  console.log(`[Firebase SW] Mensagem recebida: ${message.type}`);
  
  // Atualizar informações da plataforma se o cliente enviar userAgent
  if (event.source && event.source.navigator && event.source.navigator.userAgent) {
    const { platform, deviceType, iosVersion } = detectPlatform(event.source.navigator.userAgent);
    clientState.platform = platform;
    clientState.deviceType = deviceType;
    clientState.iosVersion = iosVersion;
  }
  
  // Processar mensagem com base no tipo
  switch (message.type) {
    case 'FCM_TOKEN_RECEIVED':
      clientState.fcmToken = message.token;
      break;
      
    case 'APP_BACKGROUND':
      clientState.inBackground = true;
      clientState.lastActivity = message.timestamp || Date.now();
      break;
      
    case 'APP_FOREGROUND':
      clientState.inBackground = false;
      clientState.lastActivity = message.timestamp || Date.now();
      break;
      
    case 'IOS_PAGE_HIDE':
      // O app iOS está possivelmente sendo fechado
      // Verificar tarefas pendentes imediatamente
      checkPendingTasks(true);
      break;
      
    case 'TEST_NOTIFICATION':
      // Enviar notificação de teste
      sendTestNotification(message);
      break;
      
    case 'CHECK_PENDING_TASKS':
      // Verificar tarefas pendentes (manual)
      checkPendingTasks(message.isClosing || false);
      break;
      
    case 'REGISTER_NOTIFICATION_STATE':
      // Registrar estado de notificações
      clientState.notificationsEnabled = message.enabled;
      
      if (message.platform) {
        clientState.platform = message.platform;
      }
      break;
  }
});

// Enviar notificação de teste
async function sendTestNotification(message) {
  const title = message.title || 'Notificação de Teste';
  const body = message.body || `Esta é uma notificação de teste (${new Date().toLocaleTimeString()})`;
  
  // Configurações específicas para a plataforma
  const platformConfig = {};
  
  if (message.platform === 'ios') {
    // Configurações específicas para iOS
    platformConfig.threadId = 'task-organizer';
    platformConfig.contentAvailable = true;
    platformConfig.mutableContent = true;
    platformConfig.interruptionLevel = 'active';
  } else if (message.platform === 'android') {
    // Configurações específicas para Android
    platformConfig.vibrate = [200, 100, 200, 100, 200];
    platformConfig.priority = 'high';
  }
  
  // Opções da notificação
  const options = {
    ...notificationOptions,
    ...platformConfig,
    body,
    silent: !!message.silent,
    data: {
      testId: Math.random().toString(36).substring(2, 10),
      timestamp: Date.now(),
      source: 'test-notification',
      ...message.data
    }
  };
  
  try {
    await self.registration.showNotification(title, options);
    console.log('[Firebase SW] Notificação de teste enviada com sucesso');
  } catch (error) {
    console.error('[Firebase SW] Erro ao enviar notificação de teste:', error);
    
    // Tentar método alternativo para iOS
    if (message.platform === 'ios') {
      try {
        new Notification(title, { 
          ...options,
          badge: options.badge || '/task-manager-icon.png'
        });
      } catch (iosError) {
        console.error('[Firebase SW] Erro ao usar método alternativo para iOS:', iosError);
      }
    }
  }
}

// Verificar tarefas pendentes
async function checkPendingTasks(isClosing = false) {
  console.log(`[Firebase SW] Verificando tarefas pendentes (closing: ${isClosing})`);
  
  // Se não houver tarefas pendentes, não fazer nada
  if (pendingTasks.length === 0) {
    console.log('[Firebase SW] Nenhuma tarefa pendente para verificar');
    return;
  }
  
  // Verificar tarefas que devem ser notificadas agora
  const now = Date.now();
  const tasksToNotify = pendingTasks.filter(task => {
    // Notificar se o tempo de notificação já chegou
    // Ou se o app estiver fechando e a tarefa está próxima (até 30 minutos)
    return now >= task.notifyTime || 
           (isClosing && (task.notifyTime - now) <= 30 * 60 * 1000);
  });
  
  console.log(`[Firebase SW] ${tasksToNotify.length} tarefas para notificar`);
  
  // Processar cada tarefa
  for (const task of tasksToNotify) {
    try {
      // Preparar notificação
      const title = task.titulo || 'Lembrete de Tarefa';
      const body = `${task.titulo} - ${task.descricao || 'Tarefa pendente'}`;
      
      // Configurações específicas para a plataforma
      const platformConfig = {};
      
      if (clientState.platform === 'ios') {
        // Configurações específicas para iOS
        platformConfig.threadId = 'task-organizer';
        platformConfig.contentAvailable = true;
        platformConfig.mutableContent = true;
        platformConfig.interruptionLevel = 'timeSensitive';
      } else if (clientState.platform === 'android') {
        // Configurações específicas para Android
        platformConfig.vibrate = [200, 100, 200, 100, 200];
        platformConfig.priority = 'high';
      }
      
      // Opções da notificação
      const options = {
        ...notificationOptions,
        ...platformConfig,
        body,
        data: {
          tarefaId: task.id,
          timestamp: now,
          source: 'scheduled-task',
          taskData: JSON.stringify(task)
        }
      };
      
      // Mostrar notificação
      await self.registration.showNotification(title, options);
      
      // Remover tarefa da lista pendente
      pendingTasks = pendingTasks.filter(t => t.id !== task.id);
      
    } catch (error) {
      console.error('[Firebase SW] Erro ao processar tarefa pendente:', error);
    }
  }
  
  // Salvar lista atualizada
  await savePendingTasks();
}

// Verificação periódica de tarefas
setInterval(() => {
  checkPendingTasks(false);
}, 60000); // Verificar a cada minuto 