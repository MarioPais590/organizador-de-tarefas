/**
 * Push Notification Service
 * Gerencia o registro e gerenciamento de notificações push
 * Compatível com iOS e Android
 */

import { appLogger } from '@/utils/logger';
import { VAPID_PUBLIC_KEY } from '@/constants/pushKeys';
import { initializeMessaging, requestFCMToken, deviceSupportsFCM } from './firebaseConfig';
import { toast } from 'sonner';

// Tipos de notificação
export type NotificationPermission = 'granted' | 'denied' | 'default';

// Tipos de erro
export enum PushErrorType {
  PERMISSION_DENIED = 'permission_denied',
  SUBSCRIPTION_FAILED = 'subscription_failed',
  TOKEN_FAILED = 'token_failed',
  MESSAGING_UNSUPPORTED = 'messaging_unsupported',
  REGISTRATION_FAILED = 'registration_failed',
  UNKNOWN = 'unknown'
}

// Detecção de plataforma
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isAndroid = /Android/.test(navigator.userAgent);

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    window.matchMedia('(display-mode: fullscreen)').matches || 
                    (window.navigator as any).standalone === true;

// Verificar se é um iPhone ou iPad específico (para estratégias especiais)
export const getIOSVersion = (): number | null => {
  if (!isIOS) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match && match[1] ? parseInt(match[1], 10) : null;
};

/**
 * Verifica se o dispositivo atual suporta notificações push confiáveis
 */
export const supportsBackgroundNotifications = (): { 
  supported: boolean; 
  partial: boolean;
  reason?: string;
} => {
  // Verificar se temos suporte básico de notificações
  if (!('Notification' in window)) {
    return { 
      supported: false, 
      partial: false,
      reason: 'Este navegador não suporta notificações.' 
    };
  }
  
  // Verificar se estamos em HTTPS (requisito para Service Workers e notificações)
  if (window.location.protocol !== 'https:' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return { 
      supported: false, 
      partial: false,
      reason: 'Notificações push requerem HTTPS.' 
    };
  }
  
  // Verificar suporte a Service Worker
  if (!('serviceWorker' in navigator)) {
    return { 
      supported: false, 
      partial: false,
      reason: 'Este navegador não suporta Service Workers, necessários para notificações em segundo plano.' 
    };
  }
  
  // Verificar especificidades do iOS
  if (isIOS) {
    // iOS no Safari tem limitações sérias
    if (isSafari && !isPWA) {
      return { 
        supported: false, 
        partial: true,
        reason: 'No Safari iOS, você precisa instalar o app como PWA para notificações mais confiáveis.' 
      };
    }
    
    // iOS como PWA tem suporte parcial
    if (isPWA) {
      const iosVersion = getIOSVersion();
      
      // iOS 16.4+ tem melhor suporte a Push API
      if (iosVersion && iosVersion >= 16.4) {
        return { 
          supported: true, 
          partial: false
        };
      }
      
      // Versões anteriores têm suporte limitado
      return { 
        supported: true, 
        partial: true,
        reason: 'No iOS, as notificações podem não funcionar perfeitamente com o app fechado.' 
      };
    }
  }
  
  // Android geralmente tem bom suporte em navegadores modernos
  if (isAndroid) {
    // Verificar Push API específica
    if (!('PushManager' in window)) {
      return { 
        supported: false, 
        partial: true,
        reason: 'Este navegador Android não suporta a Push API. Recomendamos o Chrome ou Firefox.' 
      };
    }
    
    return { supported: true, partial: false };
  }
  
  // Desktop tem bom suporte em navegadores modernos
  if ('PushManager' in window) {
    return { supported: true, partial: false };
  }
  
  // Caso de fallback para outros navegadores
  return { 
    supported: false, 
    partial: true,
    reason: 'Este navegador tem suporte limitado a notificações push.' 
  };
};

/**
 * Solicita permissão para enviar notificações
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (!('Notification' in window)) {
      appLogger.warn('Este navegador não suporta notificações');
      return 'denied';
    }
    
    // No iOS, precisamos de alguns passos adicionais
    if (isIOS) {
      // Solicitar armazenamento persistente para melhor experiência
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          await navigator.storage.persist();
          appLogger.info('Armazenamento persistente concedido no iOS');
        } catch (e) {
          appLogger.warn('Falha ao solicitar armazenamento persistente no iOS');
        }
      }
    }
    
    // Solicitar permissão para notificações
    const permission = await Notification.requestPermission();
    
    // Registrar resultado
    if (permission === 'granted') {
      appLogger.info(`Permissão para notificações concedida (${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'})`);
      
      // Verificar se estamos no PWA para estratégias específicas
      if (isPWA) {
        localStorage.setItem('notificationPermissionGranted', 'true');
        appLogger.info('Notificações habilitadas no PWA, registrando preferência persistente');
      }
      
      // Se for iOS, enviar mensagem para o service worker registrar
      if (isIOS && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REGISTER_IOS_NOTIFICATION'
        });
      }
      
      return 'granted';
    } else {
      appLogger.warn(`Permissão para notificações ${permission === 'denied' ? 'negada' : 'não decidida'}`);
      return permission;
    }
  } catch (error) {
    appLogger.error('Erro ao solicitar permissão para notificações:', error);
    return 'denied';
  }
}

/**
 * Registra o dispositivo para notificações push
 */
export async function registerPushNotifications(): Promise<boolean> {
  try {
    const { supported, partial } = supportsBackgroundNotifications();
    
    if (!supported && !partial) {
      appLogger.warn('Este dispositivo não suporta notificações push em segundo plano');
      return false;
    }
    
    // Verificar permissão atual
    if (Notification.permission !== 'granted') {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        return false;
      }
    }
    
    // Verificar se o service worker está registrado
    const swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      appLogger.error('Service Worker não registrado, impossível configurar notificações push');
      return false;
    }
    
    // Estratégia baseada na plataforma
    if (isIOS) {
      return await registerIOSPushStrategy(swRegistration);
    } else {
      return await registerStandardPushStrategy(swRegistration);
    }
  } catch (error) {
    appLogger.error('Erro ao registrar para notificações push:', error);
    return false;
  }
}

/**
 * Estratégia específica para iOS
 */
async function registerIOSPushStrategy(swRegistration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    appLogger.info('Utilizando estratégia específica para iOS');
    
    // Verificar se dispositivo suporta FCM
    if (deviceSupportsFCM() && isIOS && isPWA) {
      // iOS 16.4+ tem suporte a Push API no Safari
      try {
        // Tentar obter token FCM
        const token = await requestFCMToken();
        if (token) {
          appLogger.info('FCM configurado com sucesso no iOS');
          
          // Notificar service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'IOS_FCM_REGISTERED',
              token
            });
          }
          
          return true;
        }
      } catch (e) {
        appLogger.error('Erro ao configurar FCM no iOS:', e);
      }
    }
    
    // Usar estratégia de fallback para iOS
    appLogger.info('Utilizando estratégia de fallback para iOS');
    
    // Registrar para notificações locais usando o service worker
    await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }).catch(e => {
      appLogger.warn('Erro ao inscrever para notificações padrão no iOS:', e);
      // Continuar mesmo com erro, pois usaremos método alternativo
    });
    
    // Enviar mensagem para o service worker configurar notificações para iOS
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SETUP_IOS_NOTIFICATIONS',
        isPWA
      });
    }
    
    // Configurar verificação de segundo plano
    setupBackgroundDetection();
    
    // Solicitar notificação de teste para confirmar
    setTimeout(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TEST_NOTIFICATION',
          silent: false,
          platform: 'ios'
        });
      }
    }, 2000);
    
    return true;
  } catch (error) {
    appLogger.error('Erro ao configurar notificações para iOS:', error);
    return false;
  }
}

/**
 * Estratégia padrão para navegadores com bom suporte (Android, Desktop)
 */
async function registerStandardPushStrategy(swRegistration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    // Verificar se o dispositivo suporta FCM
    if (deviceSupportsFCM()) {
      try {
        // Inicializar Firebase Messaging
        await initializeMessaging();
        
        // Solicitar token FCM
        const token = await requestFCMToken();
        
        if (token) {
          appLogger.info('FCM configurado com sucesso');
          
          // Notificar service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'FCM_TOKEN_RECEIVED',
              token
            });
          }
          
          return true;
        }
      } catch (e) {
        appLogger.error('Erro ao configurar FCM, usando abordagem padrão:', e);
      }
    }
    
    // Usar abordagem padrão com Web Push API
    try {
      // Verificar se já está inscrito
      let subscription = await swRegistration.pushManager.getSubscription();
      
      // Se já estiver inscrito, renovar
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      // Inscrever para notificações push
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      if (subscription) {
        appLogger.info('Inscrito para notificações push Web Push API');
        
        // Enviar subscription para o servidor (simulado)
        await sendSubscriptionToServer(subscription);
        
        // Notificar service worker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'PUSH_SUBSCRIPTION_UPDATED',
            subscription: subscription.toJSON()
          });
        }
        
        return true;
      }
    } catch (error) {
      appLogger.error('Erro ao configurar Web Push API:', error);
    }
    
    return false;
  } catch (error) {
    appLogger.error('Erro na estratégia padrão de notificação push:', error);
    return false;
  }
}

/**
 * Detecta quando o aplicativo está em segundo plano para notificações locais
 */
export function setupBackgroundDetection() {
  try {
    // Detectar quando o documento fica invisível (segundo plano)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        appLogger.debug('Aplicativo em segundo plano');
        
        // Enviar mensagem para o service worker 
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'APP_BACKGROUND'
          });
        }
      } else {
        appLogger.debug('Aplicativo em primeiro plano');
        
        // Enviar mensagem para o service worker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'APP_FOREGROUND'
          });
        }
      }
    });
    
    // Evento específico para iOS
    window.addEventListener('pagehide', () => {
      if (isIOS) {
        appLogger.debug('Evento pagehide no iOS - aplicativo possivelmente fechando');
        
        // Enviar mensagem para o service worker salvar estado
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'IOS_PAGE_HIDE'
          });
        }
      }
    });
    
    // Evento de retorno para iOS
    window.addEventListener('pageshow', () => {
      if (isIOS) {
        appLogger.debug('Evento pageshow no iOS - aplicativo possivelmente reabrindo');
        
        // Enviar mensagem para o service worker restaurar estado
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'IOS_PAGE_SHOW'
          });
        }
      }
    });
    
    // Eventos de carregamento/recarregamento para restaurar estado
    window.addEventListener('load', () => {
      if (isIOS && navigator.serviceWorker.controller) {
        // Pequeno atraso para garantir que o service worker está pronto
        setTimeout(() => {
          navigator.serviceWorker.controller.postMessage({
            type: 'IOS_PAGE_LOADED'
          });
        }, 1000);
      }
    });
    
  } catch (error) {
    appLogger.error('Erro ao configurar detecção de segundo plano:', error);
  }
}

/**
 * Inicia os serviços de notificação push ao carregar a aplicação
 * Esta função é chamada pelo main.tsx durante a inicialização
 */
export async function startPushServices(): Promise<boolean> {
  try {
    appLogger.info('Iniciando serviços de notificação push');
    
    // Verificar se o navegador suporta notificações
    const { supported, partial } = supportsBackgroundNotifications();
    
    if (!supported && !partial) {
      appLogger.warn('Este dispositivo não suporta notificações push');
      return false;
    }
    
    // Configurar detecção de segundo plano independente de permissões
    setupBackgroundDetection();
    
    // Se o usuário já concedeu permissão, inicializar automaticamente
    if (Notification.permission === 'granted') {
      appLogger.info('Permissão para notificações já concedida, inicializando serviços');
      return await initPushService();
    } else if (isPWA) {
      // No PWA, solicitar permissão automaticamente ao iniciar
      appLogger.info('Aplicativo instalado como PWA, solicitando permissão para notificações');
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
        return await initPushService();
      }
    }
    
    appLogger.info('Serviços de notificação push configurados para solicitar permissão quando necessário');
    return true;
  } catch (error) {
    appLogger.error('Erro ao iniciar serviços de notificação push:', error);
    return false;
  }
}

/**
 * Enviar subscription para o servidor (simulado)
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    // Simular envio para o servidor
    appLogger.info('Enviando subscription para o servidor:', subscription.endpoint);
    
    // Em produção, aqui você enviaria para seu backend
    // const response = await fetch('/api/push/register', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ subscription }),
    // });
    
    // return response.ok;
    
    // Simulação bem-sucedida
    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar subscription para o servidor:', error);
    return false;
  }
}

/**
 * Converter string base64 para Uint8Array (necessário para applicationServerKey)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Inicializa serviço de notificações push
 */
export async function initPushService(): Promise<boolean> {
  try {
    // Verificar suporte
    const { supported, partial } = supportsBackgroundNotifications();
    
    if (!supported && !partial) {
      appLogger.warn('Este dispositivo não suporta notificações push');
      return false;
    }
    
    // Verificar se o usuário já concedeu permissão
    if (Notification.permission === 'granted') {
      // Registrar para notificações push
      return await registerPushNotifications();
    } else if (Notification.permission === 'default') {
      // Solicitar permissão automaticamente apenas no PWA
      if (isPWA) {
        appLogger.info('Aplicativo está instalado como PWA, solicitando permissão automaticamente');
        const permission = await requestNotificationPermission();
        
        if (permission === 'granted') {
          return await registerPushNotifications();
        }
      }
    }
    
    return false;
  } catch (error) {
    appLogger.error('Erro ao inicializar serviço push:', error);
    return false;
  }
}

/**
 * Envia uma notificação de teste para verificar se o sistema está funcionando
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    // Verificar se temos permissão
    if (Notification.permission !== 'granted') {
      toast.error('Permissão para notificações não concedida');
      return false;
    }
    
    // Enviar mensagem para o service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        silent: false,
        platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
      });
      
      toast.success('Notificação de teste enviada');
      return true;
    } else {
      toast.error('Service Worker não está ativo');
      return false;
    }
  } catch (error) {
    appLogger.error('Erro ao enviar notificação de teste:', error);
    toast.error('Erro ao enviar notificação de teste');
    return false;
  }
}

// Inicializar automaticamente
if (typeof window !== 'undefined') {
  // Inicializar quando o documento estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Setup básico, sem solicitar permissão automaticamente
      setupBackgroundDetection();
    });
  } else {
    // Setup básico, sem solicitar permissão automaticamente
    setupBackgroundDetection();
  }
} 