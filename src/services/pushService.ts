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

// Detecção de plataforma - melhorada para maior precisão
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isAndroid = /Android/.test(navigator.userAgent);

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const isChrome = /chrome/i.test(navigator.userAgent) && !/edge|edg/i.test(navigator.userAgent);

export const isFirefox = /firefox/i.test(navigator.userAgent);

export const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    window.matchMedia('(display-mode: fullscreen)').matches || 
                    (window.navigator as any).standalone === true;

// Verificar se é um iPhone ou iPad específico (para estratégias especiais)
export const getIOSVersion = (): number | null => {
  if (!isIOS) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match && match[1] ? parseInt(match[1], 10) : null;
};

// Obter o modelo de iPhone para estratégias mais específicas
export const getIOSModel = (): string | null => {
  if (!isIOS) return null;
  
  const userAgent = navigator.userAgent;
  
  // Detectar iPhone específico
  if (userAgent.includes('iPhone')) {
    // iPhone 14 ou superior
    if (userAgent.includes('iPhone14') || userAgent.includes('iPhone15')) {
      return 'iPhone14+';
    }
    // iPhone 11-13
    if (userAgent.includes('iPhone11') || userAgent.includes('iPhone12') || userAgent.includes('iPhone13')) {
      return 'iPhone11-13';
    }
    // Modelos mais antigos
    return 'iPhone-older';
  }
  
  // Detectar iPad
  if (userAgent.includes('iPad')) {
    return 'iPad';
  }
  
  return 'iOS-unknown';
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
      
      // iOS 15+ tem suporte a notificações locais programadas
      if (iosVersion && iosVersion >= 15) {
        return {
          supported: true,
          partial: true,
          reason: 'No iOS 15+, notificações locais programadas são suportadas, mas podem não ser 100% confiáveis com o app fechado.'
        };
      }
      
      // Versões anteriores têm suporte muito limitado
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
    
    // Verificar suporte a FCM para maior confiabilidade
    if (deviceSupportsFCM()) {
      return { supported: true, partial: false };
    }
    
    // Android sem FCM tem suporte parcial
    return { 
      supported: true, 
      partial: true,
      reason: 'Este dispositivo Android não tem suporte completo ao Firebase Cloud Messaging, o que pode reduzir a confiabilidade das notificações.'
    };
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
          const isPersisted = await navigator.storage.persisted();
          if (!isPersisted) {
            const persisted = await navigator.storage.persist();
            appLogger.info(`Armazenamento persistente no iOS: ${persisted ? 'concedido' : 'negado'}`);
          } else {
            appLogger.info('Armazenamento já estava persistente no iOS');
          }
        } catch (e) {
          appLogger.warn('Falha ao solicitar armazenamento persistente no iOS:', e);
        }
      }
      
      // Para iOS, pré-registrar service worker antes de solicitar permissão
      try {
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.ready;
          appLogger.info('Service Worker pronto para iOS antes de solicitar permissão');
        }
      } catch (e) {
        appLogger.warn('Erro ao esperar Service Worker no iOS:', e);
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
        localStorage.setItem('notificationPermissionTimestamp', Date.now().toString());
        appLogger.info('Notificações habilitadas no PWA, registrando preferência persistente');
      }
      
      // Configurar cookie para ajudar na detecção
      try {
        document.cookie = `notificationPermission=granted; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/; SameSite=Strict`;
      } catch (e) {
        appLogger.warn('Não foi possível definir cookie de permissão:', e);
      }
      
      // Se for iOS, enviar mensagem para o service worker registrar
      if (isIOS && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REGISTER_IOS_NOTIFICATION',
          timestamp: Date.now()
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
    if (!('serviceWorker' in navigator)) {
      appLogger.error('Service Worker não suportado, impossível configurar notificações push');
      return false;
    }
    
    const swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      appLogger.error('Service Worker não registrado, impossível configurar notificações push');
      return false;
    }
    
    // Estratégia baseada na plataforma
    let registrationSuccess = false;
    
    if (isIOS) {
      registrationSuccess = await registerIOSPushStrategy(swRegistration);
    } else if (isAndroid) {
      registrationSuccess = await registerAndroidPushStrategy(swRegistration);
    } else {
      registrationSuccess = await registerStandardPushStrategy(swRegistration);
    }
    
    // Configurar persistência de estado e detecção de segundo plano
    if (registrationSuccess) {
      setupBackgroundDetection();
      setupPushPersistence();
    }
    
    return registrationSuccess;
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
    const iosVersion = getIOSVersion();
    const iosModel = getIOSModel();
    
    appLogger.info(`Configurando notificações para iOS versão ${iosVersion}, modelo ${iosModel}`);
    
    // iOS PWA em versões recentes (16.4+) - usar FCM/Push API
    if (isPWA && iosVersion && iosVersion >= 16.4) {
      try {
        // Tentar obter token FCM para Push API nativo
        if (deviceSupportsFCM()) {
          const token = await requestFCMToken();
          if (token) {
            appLogger.info('FCM configurado com sucesso no iOS 16.4+');
            
            // Notificar service worker
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'IOS_FCM_REGISTERED',
                token,
                iosVersion,
                iosModel,
                timestamp: Date.now()
              });
            }
            
            // Armazenar FCM token localmente para persistência
            localStorage.setItem('fcmToken', token);
            localStorage.setItem('fcmTokenTimestamp', Date.now().toString());
            
            return true;
          }
        }
      } catch (e) {
        appLogger.error('Erro ao configurar FCM no iOS 16.4+:', e);
      }
    }
    
    // Para iOS < 16.4, usar estratégia baseada em scheduling e persistência
    appLogger.info('Utilizando estratégia de scheduling local para iOS');
    
    try {
      // 1. Registrar para notificações Web Push para dispositivos compatíveis
      // Isso pode falhar em iOS, mas tentamos mesmo assim como fallback
      let pushSubscription = null;
      try {
        // Verificar se já está inscrito
        pushSubscription = await swRegistration.pushManager.getSubscription();
        
        // Se não estiver inscrito, tentar inscrever
        if (!pushSubscription) {
          pushSubscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          
          if (pushSubscription) {
            appLogger.info('Web Push inscrito com sucesso no iOS');
          }
        }
      } catch (pushError) {
        appLogger.warn('Web Push não suportado no iOS, usando alternativas:', pushError);
      }
      
      // 2. Enviar mensagem para o service worker configurar estratégia específica para iOS
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SETUP_IOS_NOTIFICATIONS',
          isPWA,
          iosVersion,
          iosModel,
          settings: {
            // Configurações específicas para iOS
            useHighPriorityMode: true,
            keepAliveInterval: Math.max(15, Math.min(iosVersion || 15, 29)),
            checkInterval: isPWA ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5min ou 15min
            useLongLivingConnection: true,
            useLocalNotificationFallback: true,
            persistentStorage: true,
            contentAvailable: true, // content-available: 1 param
            mutableContent: true,  // mutable-content: 1 param
            targetContentId: "org.lovable.organizador-de-tarefas",
            wakeLockDuration: 30000, // 30s
          },
          timestamp: Date.now()
        });
      }
      
      // 3. Inicializar persistência e estado
      try {
        // Configurar storage
        if (navigator.storage && navigator.storage.persist) {
          const persisted = await navigator.storage.persist();
          appLogger.info(`Armazenamento persistente no iOS: ${persisted ? 'ativado' : 'negado'}`);
        }
        
        // Configurar cookie para estratégia de fallback
        document.cookie = `iosNotificationsEnabled=true; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/; SameSite=Strict`;
        
        // Armazenar em localStorage
        localStorage.setItem('iosNotificationsEnabled', 'true');
        localStorage.setItem('iosNotificationsTimestamp', Date.now().toString());
        
        // Registrar na IndexedDB para o service worker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'REGISTER_NOTIFICATION_STATE',
            enabled: true,
            platform: 'ios',
            version: iosVersion,
            model: iosModel,
            timestamp: Date.now()
          });
        }
      } catch (storageError) {
        appLogger.warn('Erro ao configurar persistência iOS:', storageError);
      }
      
      // 4. Iniciar serviço de heartbeat com o service worker para iOS
      startIOSHeartbeat();
      
      // 5. Enviar uma notificação de teste silenciosa para verificar
      setTimeout(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TEST_NOTIFICATION',
            silent: true,
            platform: 'ios',
            version: iosVersion,
            contentAvailable: true
          });
        }
      }, 2000);
      
      return true;
    } catch (error) {
      appLogger.error('Erro ao configurar notificações para iOS:', error);
      return false;
    }
  } catch (error) {
    appLogger.error('Erro crítico na estratégia iOS:', error);
    return false;
  }
}

/**
 * Estratégia específica para Android
 */
async function registerAndroidPushStrategy(swRegistration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    appLogger.info('Configurando notificações para Android');
    
    // 1. Verificar se Firebase/FCM está disponível (melhor opção para Android)
    if (deviceSupportsFCM()) {
      try {
        // Inicializar Firebase Messaging
        await initializeMessaging();
        
        // Solicitar token FCM
        const token = await requestFCMToken();
        
        if (token) {
          appLogger.info('FCM configurado com sucesso para Android');
          
          // Notificar service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'FCM_TOKEN_RECEIVED',
              token,
              platform: 'android',
              timestamp: Date.now()
            });
          }
          
          // Armazenar FCM token localmente para persistência
          localStorage.setItem('fcmToken', token);
          localStorage.setItem('fcmTokenTimestamp', Date.now().toString());
          
          // Configurar persistência para o Android
          setupAndroidPersistence(token);
          
          return true;
        }
      } catch (e) {
        appLogger.error('Erro ao configurar FCM para Android:', e);
      }
    }
    
    // 2. Fallback para Web Push API padrão se FCM falhar
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
        appLogger.info('Inscrito para notificações Web Push no Android');
        
        // Enviar subscription para o servidor (simulado)
        await sendSubscriptionToServer(subscription);
        
        // Notificar service worker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'PUSH_SUBSCRIPTION_UPDATED',
            subscription: subscription.toJSON(),
            platform: 'android',
            timestamp: Date.now()
          });
        }
        
        // Configurar persistência para o Android
        setupAndroidPersistence(JSON.stringify(subscription));
        
        return true;
      }
    } catch (error) {
      appLogger.error('Erro ao configurar Web Push para Android:', error);
    }
    
    return false;
  } catch (error) {
    appLogger.error('Erro crítico na estratégia Android:', error);
    return false;
  }
}

/**
 * Estratégia padrão para navegadores com bom suporte (Desktop)
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
          appLogger.info('FCM configurado com sucesso para desktop');
          
          // Notificar service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'FCM_TOKEN_RECEIVED',
              token,
              platform: 'desktop',
              timestamp: Date.now()
            });
          }
          
          // Armazenar FCM token localmente
          localStorage.setItem('fcmToken', token);
          localStorage.setItem('fcmTokenTimestamp', Date.now().toString());
          
          return true;
        }
      } catch (e) {
        appLogger.error('Erro ao configurar FCM para desktop, usando abordagem padrão:', e);
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
        appLogger.info('Inscrito para notificações Web Push no desktop');
        
        // Enviar subscription para o servidor (simulado)
        await sendSubscriptionToServer(subscription);
        
        // Notificar service worker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'PUSH_SUBSCRIPTION_UPDATED',
            subscription: subscription.toJSON(),
            platform: 'desktop',
            timestamp: Date.now()
          });
        }
        
        return true;
      }
    } catch (error) {
      appLogger.error('Erro ao configurar Web Push para desktop:', error);
    }
    
    return false;
  } catch (error) {
    appLogger.error('Erro crítico na estratégia desktop:', error);
    return false;
  }
}

/**
 * Configurar mecanismo de persistência para notificações Android
 */
function setupAndroidPersistence(token: string): void {
  try {
    // 1. Salvar em localStorage
    localStorage.setItem('androidNotificationsEnabled', 'true');
    localStorage.setItem('androidNotificationsTimestamp', Date.now().toString());
    localStorage.setItem('androidPushToken', token);
    
    // 2. Configurar cookie para estratégia de fallback
    document.cookie = `androidNotificationsEnabled=true; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/; SameSite=Strict`;
    
    // 3. Solicitar ao service worker para registrar em IndexedDB
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REGISTER_NOTIFICATION_STATE',
        enabled: true,
        platform: 'android',
        token: token,
        timestamp: Date.now()
      });
    }
    
    // 4. Iniciar heartbeat para verificações periódicas
    startAndroidHeartbeat();
    
  } catch (error) {
    appLogger.error('Erro ao configurar persistência Android:', error);
  }
}

/**
 * Configurar monitoramento de atividade para iOS
 */
function startIOSHeartbeat(): void {
  // Configurar intervalos de heartbeat para iOS
  // Esta função envia mensagens periódicas para o service worker
  // para manter notificações funcionais no iOS
  
  let heartbeatInterval: number | null = null;
  
  const sendHeartbeat = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'IOS_HEARTBEAT',
        timestamp: Date.now()
      });
    }
  };
  
  // Limpar intervalo existente se houver
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Definir intervalo ideal baseado na versão do iOS
  // iOS mais recentes permitem intervalos mais longos
  const iosVersion = getIOSVersion();
  let interval = 60000; // 1 minuto padrão
  
  if (iosVersion && iosVersion >= 16) {
    interval = 5 * 60000; // 5 minutos para iOS 16+
  } else if (iosVersion && iosVersion >= 14) {
    interval = 3 * 60000; // 3 minutos para iOS 14-15
  }
  
  // Iniciar heartbeat
  heartbeatInterval = window.setInterval(sendHeartbeat, interval);
  
  // Registrar para eventos de visibilidade para ajustar heartbeat
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Quando visível, enviar heartbeat imediatamente
      sendHeartbeat();
    }
  });
  
  // Primeiro heartbeat
  sendHeartbeat();
  
  appLogger.info(`Heartbeat iOS iniciado com intervalo de ${interval/1000}s`);
}

/**
 * Configurar monitoramento de atividade para Android
 */
function startAndroidHeartbeat(): void {
  let heartbeatInterval: number | null = null;
  
  const sendHeartbeat = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ANDROID_HEARTBEAT',
        timestamp: Date.now()
      });
    }
  };
  
  // Limpar intervalo existente se houver
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Para Android, intervalos mais longos são suficientes
  const interval = 10 * 60000; // 10 minutos
  
  // Iniciar heartbeat
  heartbeatInterval = window.setInterval(sendHeartbeat, interval);
  
  // Registrar para eventos de visibilidade
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Quando visível, enviar heartbeat imediatamente
      sendHeartbeat();
    }
  });
  
  // Primeiro heartbeat
  sendHeartbeat();
  
  appLogger.info(`Heartbeat Android iniciado com intervalo de ${interval/1000}s`);
}

/**
 * Configurar persistência de estado para notificações push
 */
function setupPushPersistence(): void {
  try {
    // Verificar e restaurar estado a cada página carregada
    if (typeof localStorage !== 'undefined') {
      // Restaurar estado FCM se disponível
      const fcmToken = localStorage.getItem('fcmToken');
      const fcmTimestamp = localStorage.getItem('fcmTokenTimestamp');
      
      if (fcmToken && fcmTimestamp) {
        const tokenAge = Date.now() - parseInt(fcmTimestamp);
        const isTokenFresh = tokenAge < 7 * 24 * 60 * 60 * 1000; // 7 dias
        
        if (isTokenFresh && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'RESTORE_FCM_TOKEN',
            token: fcmToken,
            timestamp: Date.now()
          });
          
          appLogger.info('Token FCM restaurado do armazenamento local');
        }
      }
      
      // Restaurar estado específico da plataforma
      if (isIOS) {
        const iosEnabled = localStorage.getItem('iosNotificationsEnabled');
        if (iosEnabled === 'true' && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'RESTORE_IOS_NOTIFICATIONS',
            timestamp: Date.now(),
            version: getIOSVersion(),
            model: getIOSModel()
          });
          
          // Reiniciar heartbeat para iOS
          startIOSHeartbeat();
          
          appLogger.info('Estado de notificações iOS restaurado');
        }
      } else if (isAndroid) {
        const androidEnabled = localStorage.getItem('androidNotificationsEnabled');
        if (androidEnabled === 'true' && navigator.serviceWorker.controller) {
          const token = localStorage.getItem('androidPushToken');
          
          navigator.serviceWorker.controller.postMessage({
            type: 'RESTORE_ANDROID_NOTIFICATIONS',
            timestamp: Date.now(),
            token: token || undefined
          });
          
          // Reiniciar heartbeat para Android
          startAndroidHeartbeat();
          
          appLogger.info('Estado de notificações Android restaurado');
        }
      }
    }
  } catch (error) {
    appLogger.error('Erro ao configurar persistência de notificações:', error);
  }
}

/**
 * Detecta quando o aplicativo está em segundo plano para notificações locais
 */
export function setupBackgroundDetection() {
  try {
    // Registrar estado inicial
    const backgroundState = {
      lastActive: Date.now(),
      isBackground: document.visibilityState === 'hidden',
      isIOSPageHide: false,
      lifecycle: 'active',
      focusTimestamp: Date.now()
    };
    
    // Salvar estado inicial
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('appBackgroundState', JSON.stringify(backgroundState));
    }
    
    // Detectar quando o documento fica invisível (segundo plano)
    document.addEventListener('visibilitychange', () => {
      const isHidden = document.visibilityState === 'hidden';
      
      const updatedState = {
        lastActive: isHidden ? backgroundState.lastActive : Date.now(),
        isBackground: isHidden,
        isIOSPageHide: backgroundState.isIOSPageHide,
        lifecycle: isHidden ? 'background' : 'active',
        focusTimestamp: isHidden ? backgroundState.focusTimestamp : Date.now()
      };
      
      // Atualizar estado local
      Object.assign(backgroundState, updatedState);
      
      // Salvar no localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('appBackgroundState', JSON.stringify(updatedState));
      }
      
      // Log
      appLogger.debug(`Aplicativo em ${isHidden ? 'segundo plano' : 'primeiro plano'}`);
      
      // Enviar mensagem para o service worker 
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: isHidden ? 'APP_BACKGROUND' : 'APP_FOREGROUND',
          timestamp: Date.now(),
          state: updatedState
        });
      }
    });
    
    // Eventos específicos para iOS
    window.addEventListener('pagehide', () => {
      // O pagehide é disparado quando a página está prestes a ser descarregada ou substituída
      // No iOS, isso pode indicar que o app está sendo fechado ou colocado em segundo plano
      
      const updatedState = {
        ...backgroundState,
        isIOSPageHide: true,
        lifecycle: 'pagehide',
        lastActive: Date.now()
      };
      
      // Atualizar estado local
      Object.assign(backgroundState, updatedState);
      
      // Salvar no localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('appBackgroundState', JSON.stringify(updatedState));
      }
      
      appLogger.debug('Evento pagehide - aplicativo possivelmente fechando');
      
      // Enviar mensagem para o service worker salvar estado
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'IOS_PAGE_HIDE',
          timestamp: Date.now(),
          state: updatedState
        });
      }
      
      // Para iOS, precisamos sempre fazer uma última verificação antes de fechar
      if (isIOS) {
        // Iniciar verificação de tarefas em segundo plano
        // Isso é especialmente importante para o iOS
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_PENDING_TASKS',
            timestamp: Date.now(),
            isClosing: true
          });
        }
      }
    });
    
    // Evento de retorno para iOS (pageshow)
    window.addEventListener('pageshow', (event) => {
      // pageshow é disparado quando a página é mostrada, seja na primeira carga
      // ou quando navegada pelo histórico (botão voltar)
      
      const isFromCache = event.persisted;
      
      const updatedState = {
        ...backgroundState,
        isIOSPageHide: false,
        lifecycle: 'pageshow',
        lastActive: Date.now(),
        focusTimestamp: Date.now(),
        isBackground: false
      };
      
      // Atualizar estado local
      Object.assign(backgroundState, updatedState);
      
      // Salvar no localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('appBackgroundState', JSON.stringify(updatedState));
      }
      
      appLogger.debug(`Evento pageshow - aplicativo reabrindo (do cache: ${isFromCache})`);
      
      // Enviar mensagem para o service worker restaurar estado
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'IOS_PAGE_SHOW',
          timestamp: Date.now(),
          persisted: isFromCache,
          state: updatedState
        });
      }
      
      // Reiniciar os heartbeats específicos da plataforma quando o app for reaberto
      if (isIOS) {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('iosNotificationsEnabled') === 'true') {
          startIOSHeartbeat();
        }
      } else if (isAndroid) {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('androidNotificationsEnabled') === 'true') {
          startAndroidHeartbeat();
        }
      }
      
      // Restaurar estado das notificações
      setupPushPersistence();
    });
    
    // Eventos de foco/blur
    window.addEventListener('focus', () => {
      // A janela recebeu foco
      const updatedState = {
        ...backgroundState,
        focusTimestamp: Date.now(),
        isBackground: false,
        lifecycle: 'active'
      };
      
      // Atualizar estado local
      Object.assign(backgroundState, updatedState);
      
      // Salvar no localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('appBackgroundState', JSON.stringify(updatedState));
      }
      
      // Notificar service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_FOCUS',
          timestamp: Date.now(),
          state: updatedState
        });
      }
    });
    
    window.addEventListener('blur', () => {
      // A janela perdeu foco
      const updatedState = {
        ...backgroundState,
        isBackground: true,
        lifecycle: 'blur'
      };
      
      // Atualizar estado local
      Object.assign(backgroundState, updatedState);
      
      // Salvar no localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('appBackgroundState', JSON.stringify(updatedState));
      }
      
      // Notificar service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_BLUR',
          timestamp: Date.now(),
          state: updatedState
        });
      }
    });
    
    // Detectar quando o app está prestes a ser fechado
    window.addEventListener('beforeunload', () => {
      appLogger.debug('Evento beforeunload - aplicativo fechando');
      
      const updatedState = {
        ...backgroundState,
        lifecycle: 'closing',
        lastActive: Date.now()
      };
      
      // Atualizar estado local
      Object.assign(backgroundState, updatedState);
      
      // Salvar no localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('appBackgroundState', JSON.stringify(updatedState));
        
        // Para iOS, precisamos persistir o estado atual para quando o app abrir novamente
        if (isIOS) {
          localStorage.setItem('iosAppClosedTimestamp', Date.now().toString());
        }
      }
      
      // Notificar service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_CLOSING',
          timestamp: Date.now(),
          state: updatedState
        });
        
        // Fazer uma última verificação de tarefas pendentes
        if (isIOS || isAndroid) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_PENDING_TASKS',
            timestamp: Date.now(),
            isClosing: true,
            forceNotificationCreation: true
          });
        }
      }
    });
    
    // Eventos de ciclo de vida adicionais para o PWA
    // (específico para quando o PWA é instalado na tela inicial)
    if (isPWA) {
      // Detectar mudanças no ciclo de vida para PWA
      if ('onappinstalled' in window) {
        window.addEventListener('appinstalled', () => {
          appLogger.info('PWA foi instalado na tela inicial');
          
          // Notificar service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'PWA_INSTALLED',
              timestamp: Date.now()
            });
          }
        });
      }
    }
    
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
    
    // Verificar se o service worker está pronto
    if (!navigator.serviceWorker.controller) {
      // Tentar registrar o service worker novamente
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        toast.info('Service Worker registrado, tente novamente em alguns segundos');
        return false;
      } catch (e) {
        toast.error('Service Worker não está disponível');
        return false;
      }
    }
    
    // Criar payload específico da plataforma
    const payload = {
      type: 'TEST_NOTIFICATION',
      silent: false,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
      title: 'Notificação de Teste',
      body: `Esta é uma notificação de teste enviada às ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      data: {
        testId: Math.random().toString(36).substring(2, 10),
        url: window.location.href,
        platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
      }
    };
    
    // Para iOS, adicionar parâmetros específicos
    if (isIOS) {
      payload.data = {
        ...payload.data,
        contentAvailable: 1,
        mutableContent: 1,
        targetContentId: "org.lovable.organizador-de-tarefas",
        iosVersion: getIOSVersion()
      };
    }
    
    // Enviar mensagem para o service worker
    navigator.serviceWorker.controller.postMessage(payload);
    
    toast.success('Notificação de teste enviada');
    
    // Para iOS e Android, enviar também uma notificação com 5 segundos de atraso
    // para simular notificações programadas
    if (isIOS || isAndroid) {
      setTimeout(() => {
        if (navigator.serviceWorker.controller) {
          const delayedPayload = {
            ...payload,
            title: 'Notificação Agendada de Teste',
            body: `Esta é uma notificação agendada de teste (atraso de 5s) às ${new Date().toLocaleTimeString()}`,
            timestamp: Date.now()
          };
          
          navigator.serviceWorker.controller.postMessage(delayedPayload);
        }
      }, 5000);
    }
    
    return true;
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
      
      // Restaurar estado de notificações
      if (Notification.permission === 'granted') {
        setupPushPersistence();
      }
    });
  } else {
    // Setup básico, sem solicitar permissão automaticamente
    setupBackgroundDetection();
    
    // Restaurar estado de notificações
    if (Notification.permission === 'granted') {
      setupPushPersistence();
    }
  }
} 