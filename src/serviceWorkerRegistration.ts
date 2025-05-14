/**
 * Service Worker Registration
 * 
 * Este arquivo gerencia o registro e atualização do service worker.
 */

import { appLogger } from './utils/logger';
import { VAPID_PUBLIC_KEY } from './constants/pushKeys';
import { toast } from 'sonner';

// Interface estendida para o ServiceWorkerRegistration
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
  periodicSync?: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
  };
}

// Interface para detectar dispositivos Apple
interface NavigatorApple extends Navigator {
  standalone?: boolean;
}

// Interface para Service Worker que pode executar em segundo plano
interface ServiceWorkerWithWakelock extends ServiceWorker {
  wakeLock?: {
    request(type: string): Promise<any>;
  };
}

// Cache para armazenar o registro do service worker
let swRegistration: ServiceWorkerRegistrationWithSync | null = null;

// Status da inscrição push
let pushEnabled = false;

/**
 * Função para registrar o service worker
 */
export async function register() {
  if ('serviceWorker' in navigator) {
    try {
      // Configurar as variáveis de ambiente e parâmetros
      const isProduction = window.location.hostname !== 'localhost';
      const swUrl = '/sw.js';
      
      // Detectar recursos disponíveis
      const features = detectAvailableFeatures();
      appLogger.info('Recursos disponíveis:', features);
      
      // Solicitar armazenamento persistente para maior confiabilidade
      await requestPersistentStorage();
      
      // Registrar o service worker
      appLogger.info('Registrando Service Worker:', swUrl);
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      }) as ServiceWorkerRegistrationWithSync;
      
      swRegistration = registration;
      
      appLogger.info('Service Worker registrado com sucesso');
      
      // Verificar recursos avançados que precisam do registration
      await detectAdvancedFeatures(registration, features);
      
      // Configurar detecção de atualizações
      setupServiceWorkerUpdates(registration);
      
      // Configurar notificações push
      await setupPushNotifications(registration);
      
      // Configurar background sync para iOS e Android
      await setupBackgroundSync(registration);
      
      // Configurar a detecção de estado do aplicativo (primeiro/segundo plano)
      setupAppStateDetection();
      
      // Configurar ouvinte para mensagens do Service Worker
      configurarOuvinteMensagens();
      
      return registration;
    } catch (error) {
      appLogger.error('Erro durante o registro do Service Worker:', error);
      throw error;
    }
  } else {
    appLogger.warn('Service Workers não são suportados neste navegador');
    throw new Error('Service Workers não suportados');
  }
}

/**
 * Solicita permissão para armazenamento persistente
 * Isso é importante para que o IndexedDB e localStorage não sejam limpos pelo navegador
 */
async function requestPersistentStorage(): Promise<boolean> {
  try {
    // Verificar se a API de armazenamento persistente está disponível
    if ('storage' in navigator && 'persist' in navigator.storage) {
      // Verificar se já está persistente
      const isPersisted = await navigator.storage.persisted();
      
      if (isPersisted) {
        appLogger.info('Armazenamento já é persistente');
        return true;
      }
      
      // Solicitar permissão
      const persisted = await navigator.storage.persist();
      
      if (persisted) {
        appLogger.info('Armazenamento persistente concedido');
      } else {
        appLogger.warn('Armazenamento persistente negado pelo navegador ou usuário');
      }
      
      return persisted;
    } else {
      appLogger.warn('API de armazenamento persistente não disponível neste navegador');
      return false;
    }
  } catch (error) {
    appLogger.error('Erro ao solicitar armazenamento persistente:', error);
    return false;
  }
}

/**
 * Configura a detecção de atualizações do Service Worker
 */
function setupServiceWorkerUpdates(registration: ServiceWorkerRegistration) {
  // Monitorar novos service workers em instalação
  registration.onupdatefound = () => {
    const installingWorker = registration.installing;
    if (!installingWorker) return;
    
    installingWorker.onstatechange = () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // Nova versão do Service Worker disponível
          appLogger.info('Nova versão do Service Worker disponível');
          
          // Perguntar ao usuário se deseja atualizar
          if (confirm('Nova versão do aplicativo disponível. Deseja atualizar agora?')) {
            window.location.reload();
          }
        } else {
          // Primeira vez que o Service Worker é instalado
          appLogger.info('Service Worker instalado. Conteúdo em cache para uso offline.');
        }
      }
    };
  };
  
  // Verificar atualizações periodicamente
  setInterval(() => {
    registration.update().catch(err => {
      appLogger.error('Erro ao verificar atualizações do Service Worker:', err);
    });
  }, 60 * 60 * 1000); // Verificar a cada hora
}

/**
 * Configura notificações push
 */
async function setupPushNotifications(registration: ServiceWorkerRegistration) {
  try {
    // Verificar se o navegador suporta notificações push
    if (!('PushManager' in window)) {
      appLogger.warn('Este navegador não suporta notificações push');
      return;
    }
    
    // Verificar permissão de notificações
    let permission = Notification.permission;
    
    // Se a permissão já foi negada, não perguntar novamente
    if (permission === 'denied') {
      appLogger.warn('Usuário negou permissão para notificações');
      return;
    }
    
    // Se a permissão ainda não foi decidida, solicitar
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (err) {
        appLogger.error('Erro ao solicitar permissão para notificações:', err);
        return;
      }
    }
    
    // Se o usuário concedeu permissão, inscrever para notificações push
    if (permission === 'granted') {
      // Verificar se já está inscrito
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        appLogger.info('Já inscrito para notificações push');
        pushEnabled = true;
        await sendSubscriptionToServer(subscription); // Atualizar no servidor
        return;
      }
      
      // Criar nova inscrição
      try {
        const convertedKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
        
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
        
        appLogger.info('Inscrito para notificações push:', newSubscription);
        pushEnabled = true;
        
        // Enviar inscrição para o servidor
        await sendSubscriptionToServer(newSubscription);
      } catch (pushError) {
        appLogger.error('Erro ao inscrever para notificações push:', pushError);
        pushEnabled = false;
      }
    }
  } catch (error) {
    appLogger.error('Erro ao configurar notificações push:', error);
  }
}

/**
 * Configura sincronização em segundo plano
 */
async function setupBackgroundSync(registration: ServiceWorkerRegistrationWithSync) {
  try {
    // Verificar se o navegador suporta background sync
    if ('sync' in registration) {
      try {
        // Registrar para sincronização de tarefas
        await registration.sync.register('verificar-tarefas');
        appLogger.info('Background sync registrado com sucesso');
        
        // Em dispositivos iOS, precisamos de estratégias adicionais
        if (isIOS()) {
          appLogger.info('Configurando estratégias adicionais para iOS');
          setupIOSBackgroundStrategy();
        }
        
        // Em Android, podemos usar sync periódico se disponível
        if (isAndroid() && 'periodicSync' in registration) {
          try {
            await registration.periodicSync.register('sincronizacao-periodica', {
              minInterval: 15 * 60 * 1000 // 15 minutos
            });
            appLogger.info('Sincronização periódica registrada');
          } catch (periodicSyncError) {
            appLogger.warn('Erro ao registrar sincronização periódica:', periodicSyncError);
          }
        }
      } catch (syncError) {
        appLogger.warn('Erro ao registrar sincronização em segundo plano:', syncError);
      }
    } else {
      // Alternativa para navegadores sem suporte a sync
      appLogger.info('Background sync não suportado, usando estratégia alternativa');
      setupAlternativeBackgroundStrategy();
    }
  } catch (error) {
    appLogger.error('Erro ao configurar sincronização em segundo plano:', error);
  }
}

/**
 * Detecta se o dispositivo é iOS
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         ((navigator as any).standalone !== undefined && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detecta se o dispositivo é Android
 */
function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Detecta a versão do iOS
 */
function getiOSVersion(): number {
  const match = navigator.userAgent.match(/OS (\d+)_/i);
  return match && match[1] ? parseInt(match[1], 10) : 0;
}

/**
 * Verifica se o app está instalado como PWA
 */
function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.matchMedia('(display-mode: fullscreen)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Função para iniciar verificação periódica em iOS
 */
function setupIOSBackgroundStrategy() {
  // Em iOS, o service worker pode ser interrompido após alguns minutos
  
  // Verificar se está instalado como PWA
  const isPWA = isPWAInstalled();
  
  // Detectar versão do iOS para usar abordagens otimizadas
  const iOSVersion = getiOSVersion();
  
  if (!isPWA) {
    // Exibir aviso no console para depuração
    appLogger.warn("Notificações em segundo plano no iOS funcionam melhor quando instalado como PWA");
    
    // Mostrar notificação ao usuário após um tempo
    setTimeout(() => {
      toast.info(
        "Para receber notificações quando o app estiver fechado no iOS, adicione este app à sua tela inicial.",
        { duration: 8000, id: 'ios-pwa-notification' }
      );
    }, 5000);
  }
  
  // Abordagem específica baseada na versão do iOS
  if (iOSVersion >= 16.4 && isPWA) {
    appLogger.info("Usando estratégia otimizada para iOS 16.4+ com PWA");
    // iOS 16.4+ tem suporte melhorado para notificações push em PWAs
    setupModerniOSStrategy();
  } else {
    appLogger.info(`Usando estratégia de compatibilidade para iOS ${iOSVersion}`);
    setupLegacyiOSStrategy();
  }
}

/**
 * Estratégia otimizada para iOS 16.4+ instalado como PWA
 */
function setupModerniOSStrategy() {
  // Utilizar API Push quando disponível
  if ('PushManager' in window && Notification.permission === 'granted') {
    // Tentar se inscrever para notificações push
    navigator.serviceWorker.ready.then(registration => {
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
      }).then(() => {
        appLogger.info("Inscrito para notificações push no iOS 16.4+");
      }).catch(err => {
        appLogger.error("Erro ao se inscrever para push no iOS 16.4+:", err);
        // Fallback para métodos legados se falhar
        setupLegacyiOSStrategy();
      });
    });
  } else {
    setupLegacyiOSStrategy();
  }
  
  // Usar eventos de visibilidade
  setupVisibilityDetection();
}

/**
 * Estratégia legada para iOS mais antigos ou sem PWA
 */
function setupLegacyiOSStrategy() {
  // Configurar detecção de visibilidade
  setupVisibilityDetection();
  
  // Usar estratégias para manter o service worker ativo
  
  // 1. Programar "ping" de notificação silenciosa a cada 15 minutos
  if ('Notification' in window && Notification.permission === 'granted') {
    setInterval(() => {
      try {
        // Notificação silenciosa para "acordar" o SW periodicamente
        const notification = new Notification("Verificando tarefas...", {
          tag: "sw-keepalive",
          silent: true,
          requireInteraction: false
        });
        
        // Fechar automaticamente após 1 segundo
        setTimeout(() => notification.close(), 1000);
      } catch (e) {
        appLogger.warn("Erro ao enviar notificação de keepalive:", e);
      }
    }, 15 * 60 * 1000); // 15 minutos
  }
  
  // 2. Usar localStorage para sincronização entre abas
  window.addEventListener('storage', (event) => {
    if (event.key === 'sw_last_check') {
      appLogger.info("Detectada verificação de outra aba, sincronizando");
      solicitarSincronizacao();
    }
  });
  
  // 3. Periodicamente atualizar localStorage para informar outras abas
  setInterval(() => {
    localStorage.setItem('sw_last_check', Date.now().toString());
  }, 10 * 60 * 1000); // 10 minutos
}

/**
 * Configurar detecção de visibilidade compartilhada entre estratégias
 */
function setupVisibilityDetection() {
  // Detectar quando o app vai para segundo plano
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // App indo para segundo plano
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_BACKGROUND'
        });
      }
      
      // Solicitar verificação imediata antes que o iOS suspenda o app
      solicitarSincronizacao();
      
      // Em iOS, programamos uma notificação local para acordar o app
      if ('Notification' in window && Notification.permission === 'granted') {
        // Programar notificação para "acordar" o app em 15 minutos
        // Armazenar o ID do timeout para poder cancelá-lo depois
        const notificationTimeoutId = setTimeout(() => {
          new Notification('Verificando tarefas', {
            body: 'Verificação de tarefas em segundo plano',
            tag: 'background-check',
            silent: true
          });
        }, 15 * 60 * 1000);
        
        // Armazenar o ID para limpar depois
        window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT = notificationTimeoutId;
      }
    } else if (document.visibilityState === 'visible') {
      // App voltando ao primeiro plano - cancelar notificação programada
      if (window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT) {
        clearTimeout(window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT);
        window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT = undefined;
      }
      
      // Verificar tarefas pendentes
      solicitarSincronizacao();
      
      // Notificar service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_FOREGROUND'
        });
      }
    }
  });
}

/**
 * Configurar estratégia alternativa para navegadores sem suporte a background sync
 */
function setupAlternativeBackgroundStrategy() {
  // Usar localStorage para rastrear a última verificação
  const setLastCheckTime = () => {
    localStorage.setItem('lastTarefaCheck', Date.now().toString());
  };
  
  const getLastCheckTime = (): number => {
    const lastCheck = localStorage.getItem('lastTarefaCheck');
    return lastCheck ? parseInt(lastCheck, 10) : 0;
  };
  
  // Verificar na ativação da página
  window.addEventListener('focus', () => {
    const now = Date.now();
    const lastCheck = getLastCheckTime();
    const checkInterval = 5 * 60 * 1000; // 5 minutos
    
    if (now - lastCheck > checkInterval) {
      solicitarSincronizacao();
      setLastCheckTime();
    }
  });
  
  // Verificar periodicamente quando a página está visível
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      solicitarSincronizacao();
      setLastCheckTime();
    }
  }, 5 * 60 * 1000); // Verificar a cada 5 minutos
}

/**
 * Configura a detecção do estado do aplicativo (primeiro/segundo plano)
 */
function setupAppStateDetection() {
  // Detectar quando o app vai para segundo plano
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // App indo para segundo plano
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_BACKGROUND'
        });
      }
    } else if (document.visibilityState === 'visible') {
      // App voltando para primeiro plano
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_FOREGROUND'
        });
      }
    }
  });
  
  // Detectar quando o app está prestes a ser fechado/atualizado
  window.addEventListener('beforeunload', () => {
    if (navigator.serviceWorker.controller) {
      // Informar ao service worker que o app está fechando
      navigator.serviceWorker.controller.postMessage({
        type: 'APP_CLOSING'
      });
    }
  });
}

/**
 * Configura ouvintes para mensagens do Service Worker
 */
function configurarOuvinteMensagens() {
  if (!navigator.serviceWorker) return;
  
  navigator.serviceWorker.addEventListener('message', event => {
    const mensagem = event.data;
    
    if (!mensagem || !mensagem.tipo) return;
    
    switch (mensagem.tipo) {
      case 'tarefas-verificadas':
        appLogger.info('Tarefas verificadas pelo Service Worker:', mensagem.tarefas);
        // Aqui podemos atualizar a interface, se necessário
        break;
      case 'nova-versao':
        // Service worker detectou nova versão
        appLogger.info('Nova versão disponível');
        if (confirm('Nova versão do aplicativo disponível. Atualizar agora?')) {
          window.location.reload();
        }
        break;
      case 'pending-messages':
        // Processar mensagens pendentes que foram armazenadas enquanto o app estava fechado
        appLogger.info('Recebidas mensagens pendentes do Service Worker:', mensagem.mensagens?.length || 0);
        if (mensagem.mensagens && Array.isArray(mensagem.mensagens)) {
          // Processar cada mensagem
          mensagem.mensagens.forEach(msg => {
            // Verificar a idade da mensagem (não processar mensagens muito antigas)
            const agora = Date.now();
            const idade = agora - (msg.timestamp || agora);
            const idadeMaxima = 24 * 60 * 60 * 1000; // 24 horas
            
            if (idade <= idadeMaxima) {
              // Processar com base no tipo
              processarMensagemPendente(msg);
            } else {
              appLogger.info(`Mensagem ignorada por ser muito antiga (${Math.round(idade/3600000)}h)`, msg);
            }
          });
        }
        break;
      default:
        appLogger.info('Mensagem desconhecida do Service Worker:', mensagem);
    }
  });
  
  // Ao carregar, verificar se há mensagens pendentes
  if (navigator.serviceWorker.controller) {
    setTimeout(() => {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_PENDING_MESSAGES'
      });
    }, 2000); // Pequeno atraso para garantir que o service worker esteja pronto
  }
}

/**
 * Processa uma mensagem pendente do service worker
 */
function processarMensagemPendente(mensagem: any) {
  try {
    if (!mensagem.tipo) return;
    
    switch (mensagem.tipo) {
      case 'tarefas-verificadas':
        // Tarefas foram verificadas enquanto o app estava fechado
        if (mensagem.tarefas && mensagem.tarefas.length > 0) {
          appLogger.info('Processando verificações de tarefas pendentes:', mensagem.tarefas);
          // Poderia atualizar o estado global ou disparar alguma ação
        }
        break;
      case 'heartbeat':
        // Heartbeat recebido - serviço está funcionando
        appLogger.info('Heartbeat recebido do service worker', {
          lastCheck: mensagem.lastCheck
        });
        break;
      // Outros tipos de mensagens podem ser processados aqui
    }
  } catch (error) {
    appLogger.error('Erro ao processar mensagem pendente:', error, mensagem);
  }
}

/**
 * Solicita sincronização de dados em segundo plano
 */
export async function solicitarSincronizacao() {
  if (!swRegistration) {
    try {
      // Tentar obter o registration se não estiver disponível
      swRegistration = await navigator.serviceWorker.ready as ServiceWorkerRegistrationWithSync;
    } catch (e) {
      appLogger.warn('Não foi possível obter o registration do Service Worker');
      return false;
    }
  }
  
  if (!('sync' in swRegistration) || !swRegistration.sync) {
    appLogger.warn('API de sincronização não suportada neste navegador');
    
    // Usar mensagem direta como alternativa
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_NOW'
      });
      return true;
    }
    
    // Tentativa adicional para iOS - usar setTimeout para simular sincronização
    if (isIOS()) {
      try {
        // No iOS, precisamos de uma abordagem diferente
        appLogger.info('Utilizando método alternativo para iOS');
        
        // Usar setTimeout para programar a verificação
        setTimeout(() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CHECK_NOW'
            });
          }
        }, 500);
        
        return true;
      } catch (error) {
        appLogger.error('Erro ao solicitar verificação alternativa para iOS:', error);
        return false;
      }
    }
    
    return false;
  }
  
  try {
    await swRegistration.sync.register('verificar-tarefas');
    appLogger.info('Sincronização de tarefas solicitada');
    return true;
  } catch (error) {
    appLogger.error('Erro ao solicitar sincronização:', error);
    
    // Fallback para abordagem de mensagens diretas
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_NOW'
        });
        appLogger.info('Fallback para mensagem direta utilizado com sucesso');
        return true;
      }
    } catch (msgError) {
      appLogger.error('Erro no fallback de mensagem direta:', msgError);
    }
    
    return false;
  }
}

/**
 * Envia configurações atualizadas para o Service Worker
 */
export async function enviarConfiguracoesParaServiceWorker(config: any) {
  if (!navigator.serviceWorker.controller) {
    appLogger.warn('Service Worker não está controlando a página');
    return false;
  }
  
  try {
    navigator.serviceWorker.controller.postMessage({
      type: 'UPDATE_CONFIG',
      config
    });
    
    appLogger.info('Configurações enviadas para o Service Worker');
    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar configurações para o Service Worker:', error);
    return false;
  }
}

/**
 * Função para desregistrar o service worker
 */
export async function unregister() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        const success = await registration.unregister();
        if (success) {
          appLogger.info('Service Worker desregistrado com sucesso');
          swRegistration = null;
        } else {
          appLogger.warn('Falha ao desregistrar Service Worker');
        }
      }
    } catch (error) {
      appLogger.error('Erro ao desregistrar Service Worker:', error);
    }
  }
}

/**
 * Envia a inscrição para o servidor
 * Nota: Em uma aplicação real, isso enviaria para seu backend
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    appLogger.info('Enviando inscrição push para o servidor');
    
    // Armazenar localmente para demonstração
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    
    // Em uma aplicação real, você enviaria para seu backend:
    /*
    const response = await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription })
    });
    
    return response.ok;
    */
    
    // Informar o service worker sobre a nova inscrição
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REGISTER_PUSH',
        subscription
      });
    }
    
    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar inscrição para o servidor:', error);
    return false;
  }
}

/**
 * Função auxiliar para converter chave base64 para array
 */
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Substituir o desregistro automático por registro automático
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    register().catch(error => {
      appLogger.error('Erro ao registrar Service Worker:', error);
    });
  });
}

// Definição de tipos globais
declare global {
  interface Window {
    iOS_BACKGROUND_NOTIFICATION_TIMEOUT?: ReturnType<typeof setTimeout> | undefined;
  }
}

/**
 * Detecta os recursos básicos disponíveis no navegador
 */
function detectAvailableFeatures(): { [key: string]: boolean } {
  const features = {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    indexedDB: 'indexedDB' in window,
    localStorage: 'localStorage' in window,
    sessionStorage: 'sessionStorage' in window,
    vibration: 'vibrate' in navigator,
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isPWA: isPWAInstalled()
  };
  
  return features;
}

/**
 * Detecta recursos avançados que dependem do registration do service worker
 */
async function detectAdvancedFeatures(
  registration: ServiceWorkerRegistrationWithSync, 
  features: { [key: string]: boolean }
): Promise<{ [key: string]: boolean }> {
  try {
    // Verificar recursos que dependem do registration
    features.sync = 'sync' in registration;
    features.periodicSync = 'periodicSync' in registration;
    features.pushRegistration = 'pushManager' in registration;
    
    // Verificar se consegue acessar o banco de dados IndexedDB
    if (features.indexedDB) {
      try {
        const request = indexedDB.open('feature-detection-test', 1);
        const promiseResult = await new Promise<boolean>((resolve) => {
          request.onsuccess = () => {
            const db = request.result;
            db.close();
            resolve(true);
          };
          request.onerror = () => resolve(false);
        });
        
        features.indexedDBWorks = promiseResult;
      } catch (e) {
        features.indexedDBWorks = false;
      }
    }
    
    // Escolher a melhor estratégia com base nos recursos disponíveis
    setupOptimalStrategy(features);
    
    return features;
  } catch (error) {
    appLogger.error('Erro ao detectar recursos avançados:', error);
    return features;
  }
}

/**
 * Configura a estratégia ideal com base nos recursos disponíveis
 */
function setupOptimalStrategy(features: { [key: string]: boolean }) {
  if (features.isIOS) {
    appLogger.info('Configurando estratégia otimizada para iOS');
    // iOS requer estratégias específicas devido às suas restrições
    return;
  }
  
  if (features.isAndroid) {
    if (features.sync) {
      appLogger.info('Usando Background Sync API para notificações em Android');
    } else {
      appLogger.info('Background Sync não disponível, usando estratégia alternativa em Android');
      setupAlternativeBackgroundStrategy();
    }
    return;
  }
  
  // Para desktop
  if (features.sync) {
    appLogger.info('Usando Background Sync API para notificações em desktop');
  } else if (features.pushManager) {
    appLogger.info('Background Sync não disponível, usando Push API');
  } else {
    appLogger.info('APIs avançadas não disponíveis, usando estratégia alternativa');
    setupAlternativeBackgroundStrategy();
  }
} 