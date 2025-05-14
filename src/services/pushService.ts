/**
 * Push Notification Service
 * Gerencia o registro e gerenciamento de notificações push
 * Compatível com iOS e Android
 */

import { appLogger } from '@/utils/logger';
import { VAPID_PUBLIC_KEY } from '@/constants/pushKeys';
import { 
  logPushError, 
  logPushSuccess, 
  PushErrorType 
} from './errorMonitoringService';

// Verificar se é iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Verificar se é Android
const isAndroid = /Android/.test(navigator.userAgent);

// Verificar se é Safari
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Detectar versão do iOS para estratégias específicas
const getIOSVersion = (): number | null => {
  if (!isIOS) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match && match[1] ? parseInt(match[1], 10) : null;
};

const iOS_VERSION = getIOSVersion();

// Verificar se é PWA instalado
const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              (window.navigator as any).standalone === true;

// Verificar suporte a Push API
const hasPushSupport = 'PushManager' in window;

// Verificar se há suporte a Service Workers
const hasServiceWorkerSupport = 'serviceWorker' in navigator;

// Objeto para armazenar o registro de SW
let swRegistration: ServiceWorkerRegistration | null = null;

interface PushSubscriptionOptions {
  userVisibleOnly: boolean;
  applicationServerKey: Uint8Array;
}

/**
 * Converter string base64 para Uint8Array (para chave VAPID)
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
 * Inicializa o serviço de push notifications
 */
export async function initPushService(): Promise<boolean> {
  try {
    if (!hasServiceWorkerSupport) {
      appLogger.error('Push Service: Service Worker não suportado neste navegador');
      logPushError(
        PushErrorType.UNSUPPORTED_BROWSER, 
        'Service Worker não suportado neste navegador'
      );
      return false;
    }

    if (!hasPushSupport && !isIOS) {
      // No iOS, podemos tentar abordagens alternativas mesmo sem Push API
      appLogger.error('Push Service: Push API não suportada neste navegador');
      logPushError(
        PushErrorType.UNSUPPORTED_BROWSER, 
        'Push API não suportada neste navegador'
      );
      return false;
    }

    // Verificar se já temos uma referência ao registration
    if (!swRegistration) {
      try {
        swRegistration = await navigator.serviceWorker.ready;
        appLogger.info('Push Service: Service Worker está pronto');
        logPushSuccess('service_worker_ready');
      } catch (error) {
        appLogger.error('Push Service: Erro ao obter Service Worker registration', error);
        logPushError(
          PushErrorType.SERVICE_WORKER_ERROR, 
          'Erro ao obter Service Worker registration',
          error
        );
        return false;
      }
    }

    // Verificar permissão atual
    const permission = await checkNotificationPermission();
    
    // Se estamos no iOS sem Push API, usar abordagem alternativa
    if (isIOS && !hasPushSupport && permission === 'granted') {
      appLogger.info('Push Service: Usando método alternativo para iOS sem Push API');
      
      // Configurar detecção de background para iOS
      setupBackgroundDetection();
      
      // Informar ao service worker que o usuário permitiu notificações
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'iOS_NOTIFICATIONS_ENABLED'
        });
      }
      
      return true;
    }
    
    if (permission === 'granted') {
      // Se já temos permissão, tentar inscrever para push
      await subscribeToPush();
      return true;
    } else if (permission === 'default') {
      // Se o usuário ainda não foi perguntado, pedir permissão
      const newPermission = await requestNotificationPermission();
      if (newPermission === 'granted') {
        await subscribeToPush();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    appLogger.error('Push Service: Erro ao inicializar serviço push', error);
    logPushError(
      PushErrorType.UNKNOWN, 
      'Erro ao inicializar serviço push',
      error
    );
    return false;
  }
}

/**
 * Verifica a permissão atual de notificações
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  // Em Safari < 12.1, a API é ligeiramente diferente
  if (isSafari && !('permissions' in navigator)) {
    return Notification.permission;
  }
  
  try {
    const status = await navigator.permissions.query({ name: 'notifications' as PermissionName });
    return status.state as NotificationPermission;
  } catch (error) {
    // Fallback para API mais antiga
    return Notification.permission;
  }
}

/**
 * Solicita permissão de notificações
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    // Solicitar permissão
    const permission = await Notification.requestPermission();
    
    // Log específico para iOS
    if (isIOS) {
      if (permission === 'granted') {
        appLogger.info('Push Service: Permissão concedida no iOS');
        logPushSuccess('permission_granted_ios');
      } else {
        appLogger.warn('Push Service: Permissão negada/ignorada no iOS');
        logPushError(
          PushErrorType.PERMISSION_DENIED, 
          'Permissão negada/ignorada no iOS'
        );
      }
    } else {
      // Logs para outras plataformas
      if (permission === 'granted') {
        logPushSuccess('permission_granted');
      } else if (permission === 'denied') {
        logPushError(
          PushErrorType.PERMISSION_DENIED, 
          'Permissão de notificação negada'
        );
      }
    }
    
    return permission;
  } catch (error) {
    appLogger.error('Push Service: Erro ao solicitar permissão', error);
    logPushError(
      PushErrorType.PERMISSION_DENIED, 
      'Erro ao solicitar permissão',
      error
    );
    return 'denied';
  }
}

/**
 * Inscreve o usuário para receber notificações push
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.ready;
    }
    
    // Verificar se já está inscrito
    let subscription = await swRegistration.pushManager.getSubscription();
    
    if (subscription) {
      appLogger.info('Push Service: Usuário já está inscrito para push');
      logPushSuccess('already_subscribed', { endpoint: subscription.endpoint });
      return subscription;
    }
    
    // Converter a chave VAPID
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    
    // Opções de inscrição
    const options: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey
    };
    
    // Tentar inscrever
    try {
      subscription = await swRegistration.pushManager.subscribe(options);
      appLogger.info('Push Service: Usuário inscrito com sucesso para push');
      logPushSuccess('subscription_created', { endpoint: subscription.endpoint });
      
      // Em uma aplicação real, você enviaria a subscription para o servidor
      await sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      // Erro mais comum: permissão negada
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        appLogger.warn('Push Service: Usuário negou permissão de notificação');
        logPushError(
          PushErrorType.PERMISSION_DENIED,
          'Usuário negou permissão de notificação',
          { error: error.toString() }
        );
      } else {
        appLogger.error('Push Service: Erro ao inscrever para push', error);
        logPushError(
          PushErrorType.SUBSCRIPTION_FAILED,
          'Erro ao inscrever para push',
          error
        );
      }
      
      return null;
    }
  } catch (error) {
    appLogger.error('Push Service: Erro inesperado ao inscrever para push', error);
    logPushError(
      PushErrorType.UNKNOWN,
      'Erro inesperado ao inscrever para push',
      error
    );
    return null;
  }
}

/**
 * Cancela a inscrição de push
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.ready;
    }
    
    const subscription = await swRegistration.pushManager.getSubscription();
    
    if (!subscription) {
      appLogger.info('Push Service: Não há inscrição para cancelar');
      return true;
    }
    
    // Cancelar inscrição
    const result = await subscription.unsubscribe();
    
    if (result) {
      // Notificar servidor que o usuário cancelou inscrição
      await removeSubscriptionFromServer(subscription);
      appLogger.info('Push Service: Inscrição cancelada com sucesso');
    } else {
      appLogger.warn('Push Service: Falha ao cancelar inscrição');
    }
    
    return result;
  } catch (error) {
    appLogger.error('Push Service: Erro ao cancelar inscrição', error);
    return false;
  }
}

/**
 * Envia a inscrição para o servidor
 * Nota: Em uma aplicação real, isso enviaria para seu backend
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    appLogger.info('Push Service: Enviando inscrição para o servidor', subscription);
    
    // Apenas simular para propósitos de demonstração
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
    
    // Armazenar localmente para demonstração
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    
    // Informar o service worker sobre a nova inscrição
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REGISTER_PUSH',
        subscription
      });
    }
    
    logPushSuccess('subscription_sent_to_server');
    return true;
  } catch (error) {
    appLogger.error('Push Service: Erro ao enviar inscrição para o servidor', error);
    logPushError(
      PushErrorType.NETWORK_ERROR,
      'Erro ao enviar inscrição para o servidor',
      error
    );
    return false;
  }
}

/**
 * Remove a inscrição do servidor
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<boolean> {
  try {
    appLogger.info('Push Service: Removendo inscrição do servidor');
    
    // Apenas simular para propósitos de demonstração
    // Em uma aplicação real, você enviaria para seu backend:
    /*
    const response = await fetch('/api/push/unregister', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription })
    });
    
    return response.ok;
    */
    
    // Remover do armazenamento local
    localStorage.removeItem('pushSubscription');
    
    return true;
  } catch (error) {
    appLogger.error('Push Service: Erro ao remover inscrição do servidor', error);
    return false;
  }
}

/**
 * Verifica se o dispositivo suporta notificações push em segundo plano
 */
export function supportsBackgroundNotifications(): {
  supported: boolean;
  reason?: string;
  partialSupport?: boolean;
} {
  if (!hasServiceWorkerSupport || !hasPushSupport) {
    return {
      supported: false,
      reason: 'Este navegador não suporta Service Workers ou Push API'
    };
  }
  
  // Safari no iOS tem suporte muito limitado
  if (isIOS && isSafari) {
    // iOS 16.4+ melhorou o suporte a notificações push em PWAs
    if (iOS_VERSION && iOS_VERSION >= 16.4 && isPWA) {
      return {
        supported: true,
        partialSupport: true,
        reason: 'iOS 16.4+ tem suporte melhorado para PWAs, mas com algumas limitações'
      };
    }
    
    return {
      supported: false,
      reason: 'Safari no iOS tem suporte limitado a notificações em segundo plano. Tente instalar como PWA ou usar outro navegador.'
    };
  }
  
  // PWAs instalados no iOS têm melhor suporte
  if (isIOS && !isPWA) {
    return {
      supported: true,
      partialSupport: true,
      reason: 'Para melhor suporte em iOS, instale o aplicativo na tela inicial'
    };
  }
  
  // Android geralmente tem bom suporte
  if (isAndroid) {
    if (isPWA) {
      return { supported: true };
    } else {
      return { 
        supported: true,
        partialSupport: true,
        reason: 'Para melhor experiência no Android, instale o aplicativo na tela inicial' 
      };
    }
  }
  
  // Desktop geralmente tem bom suporte
  return { supported: true };
}

/**
 * Detecta quando o app está entrando em segundo plano
 */
export function setupBackgroundDetection(): void {
  // Para navegadores modernos
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // App indo para segundo plano
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'APP_BACKGROUND'
        });
        logPushSuccess('app_background');
      }).catch(error => {
        logPushError(
          PushErrorType.SERVICE_WORKER_ERROR,
          'Erro ao notificar service worker sobre app em segundo plano',
          error
        );
      });
    } else if (document.visibilityState === 'visible') {
      // App voltando para primeiro plano
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'APP_FOREGROUND'
        });
        logPushSuccess('app_foreground');
      }).catch(error => {
        logPushError(
          PushErrorType.SERVICE_WORKER_ERROR,
          'Erro ao notificar service worker sobre app em primeiro plano',
          error
        );
      });
    }
  });
  
  // Detecção de eventos de saída/entrada (iOS)
  window.addEventListener('pagehide', () => {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({
        type: 'APP_BACKGROUND'
      });
    });
  });
  
  window.addEventListener('pageshow', () => {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({
        type: 'APP_FOREGROUND'
      });
    });
  });
}

/**
 * Iniciar todas as funcionalidades de push
 */
export async function startPushServices(): Promise<boolean> {
  try {
    // Inicializar serviço de push
    const initialized = await initPushService();
    
    // Configurar detecção de segundo plano
    setupBackgroundDetection();
    
    return initialized;
  } catch (error) {
    appLogger.error('Push Service: Erro ao iniciar serviços push', error);
    return false;
  }
} 