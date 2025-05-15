/**
 * Service Worker Registration
 * 
 * Este arquivo gerencia o registro e atualização do service worker.
 */

import { appLogger } from '@/utils/logger';
import { VAPID_PUBLIC_KEY } from '@/constants/pushKeys';
import { toast } from 'sonner';
import { 
  detectAvailableFeatures,
  requestPersistentStorage,
  urlB64ToUint8Array
} from './serviceWorkerUtils';
import { setupIOSBackgroundStrategy, needsIOSSpecialStrategy } from './iOSServiceWorkerStrategies';
import { 
  setupServiceWorkerMessaging, 
  ServiceWorkerMessageType,
  sendMessageToServiceWorker,
  addServiceWorkerMessageHandler
} from './serviceWorkerMessaging';
import { setupBackgroundSync, requestSync } from './backgroundSyncService';

// Interface para service worker com suporte a sincronização
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
  periodicSync?: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
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
      
      // Configurar messaging do Service Worker
      setupServiceWorkerMessaging();
      
      // Configurar detecção de atualizações
      setupServiceWorkerUpdates(registration);
      
      // Configurar notificações push
      await setupPushNotifications(registration);
      
      // Configurar background sync para iOS e Android
      await setupBackgroundSync(registration);
      
      // Configurar estratégias específicas para iOS
      if (needsIOSSpecialStrategy()) {
        setupIOSBackgroundStrategy();
      }
      
      // Configurar a detecção de estado do aplicativo (primeiro/segundo plano)
      setupAppStateDetection();
      
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
          
          // Avisar o usuário sobre a nova versão
          const mensagem = 'Nova versão do aplicativo disponível. Deseja atualizar agora?';
          
          if (confirm(mensagem)) {
            // Limpar caches e recarregar
            if ('caches' in window) {
              caches.keys()
                .then(cacheNames => {
                  return Promise.all(
                    cacheNames.map(cacheName => {
                      appLogger.info(`Eliminando cache: ${cacheName}`);
                      return caches.delete(cacheName);
                    })
                  );
                })
                .then(() => {
                  window.location.reload();
                })
                .catch(err => {
                  appLogger.error('Erro ao limpar caches:', err);
                  window.location.reload();
                });
            } else {
              window.location.reload();
            }
          }
        } else {
          // Primeira vez que o Service Worker é instalado
          appLogger.info('Service Worker instalado. Conteúdo em cache para uso offline.');
        }
      }
    };
  };
  
  // Verificar atualizações periodicamente
  const intervalId = setInterval(() => {
    appLogger.info('Verificando atualizações do Service Worker...');
    registration.update().catch(err => {
      appLogger.error('Erro ao verificar atualizações do Service Worker:', err);
    });
  }, 15 * 60 * 1000); // A cada 15 minutos
  
  // Verificar quando o aplicativo volta ao foco
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      appLogger.info('Aplicativo em foco, verificando atualizações...');
      registration.update().catch(err => {
        appLogger.error('Erro ao verificar atualizações após foco:', err);
      });
    }
  });
  
  // Limpar intervalo quando a página é fechada
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });
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
        // Já está inscrito, atualizar no servidor
        const success = await sendSubscriptionToServer(subscription);
        pushEnabled = success;
        appLogger.info('Inscrição push existente atualizada');
      } else {
        // Não está inscrito, criar nova inscrição
        try {
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          
          // Enviar para o servidor
          const success = await sendSubscriptionToServer(newSubscription);
          pushEnabled = success;
          
          if (success) {
            appLogger.info('Nova inscrição push registrada com sucesso');
          } else {
            appLogger.warn('Falha ao registrar nova inscrição push no servidor');
          }
        } catch (err) {
          if (Notification.permission === 'denied') {
            appLogger.warn('Permissão para notificações negada');
          } else {
            appLogger.error('Erro ao inscrever para notificações push:', err);
            toast.error('Não foi possível registrar notificações push');
          }
        }
      }
    }
  } catch (error) {
    appLogger.error('Erro ao configurar notificações push:', error);
  }
}

/**
 * Configura a detecção de estado do aplicativo
 */
function setupAppStateDetection() {
  try {
    // Detectar quando o documento fica visível/invisível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        appLogger.debug('Aplicativo voltou ao primeiro plano');
        
        // Verificar notificações pendentes
        if (swRegistration && navigator.serviceWorker.controller) {
          sendMessageToServiceWorker(
            ServiceWorkerMessageType.CHECK_PENDING_NOTIFICATIONS
          );
        }
      } else {
        appLogger.debug('Aplicativo foi para segundo plano');
      }
    });
  } catch (error) {
    appLogger.error('Erro ao configurar detecção de estado do aplicativo:', error);
  }
}

/**
 * Função para solicitar sincronização
 */
export async function solicitarSincronizacao(): Promise<boolean> {
  try {
    return await requestSync();
  } catch (error) {
    appLogger.error('Erro ao solicitar sincronização:', error);
    return false;
  }
}

/**
 * Envia configurações para o Service Worker
 */
export async function enviarConfiguracoesParaServiceWorker(config: any): Promise<boolean> {
  try {
    return await sendMessageToServiceWorker(
      ServiceWorkerMessageType.UPDATE_SETTINGS,
      config
    );
  } catch (error) {
    appLogger.error('Erro ao enviar configurações para o Service Worker:', error);
    return false;
  }
}

/**
 * Função para cancelar o registro do service worker
 */
export async function unregister() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const unregistered = await registration.unregister();
      
      if (unregistered) {
        appLogger.info('Service Worker desregistrado com sucesso');
      } else {
        appLogger.warn('Não foi possível desregistrar o Service Worker');
      }
      
      return unregistered;
    } catch (error) {
      appLogger.error('Erro ao desregistrar o Service Worker:', error);
      throw error;
    }
  }
  return false;
}

/**
 * Envia a inscrição push para o servidor
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    appLogger.debug('Enviando inscrição push para o servidor');
    
    // Esta é uma implementação simulada, em produção você enviaria para seu servidor
    // const response = await fetch('/api/push/register', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     subscription: subscription,
    //     userId: 'usuário atual' // Adicionar identificação do usuário
    //   }),
    // });
    
    // return response.ok;
    
    // Implementação simulada para desenvolvimento
    console.log('Inscrição push:', subscription);
    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar inscrição push para o servidor:', error);
    return false;
  }
} 