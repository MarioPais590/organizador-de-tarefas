import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { appLogger } from '@/utils/logger';

// Configuração do Firebase (substitua com suas credenciais do console Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyBQHF0SZLuQikADgSjzuJpRD1fvkQ_-YWk",
  authDomain: "organizador-tarefas-pwa.firebaseapp.com",
  projectId: "organizador-tarefas-pwa",
  storageBucket: "organizador-tarefas-pwa.appspot.com",
  messagingSenderId: "768213431792",
  appId: "1:768213431792:web:5b8c7da6e0370b6a8ac3e1",
  measurementId: "G-LL6W2B8MNZ"
};

// Inicializar Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Inicializar Firebase Cloud Messaging
let messagingInitialized = false;
let messaging: any = null;

/**
 * Inicializa o serviço de mensagens do Firebase
 */
export const initializeMessaging = async () => {
  if (typeof window === 'undefined' || messagingInitialized) return;
  
  try {
    if (!('Notification' in window)) {
      appLogger.warn('Este navegador não suporta notificações push');
      return null;
    }
    
    messaging = getMessaging(firebaseApp);
    messagingInitialized = true;
    
    // Configurar manipulador de mensagens em primeiro plano
    onMessage(messaging, (payload) => {
      appLogger.info('Mensagem recebida em primeiro plano:', payload);
      
      // Exibir notificação mesmo em primeiro plano
      if (payload.notification) {
        const { title, body } = payload.notification;
        const notificationOptions = {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: payload.data
        };
        
        // Mostrar notificação
        new Notification(title || 'Nova notificação', notificationOptions);
      }
    });
    
    return messaging;
  } catch (error) {
    appLogger.error('Erro ao inicializar Firebase Messaging:', error);
    return null;
  }
};

/**
 * Solicita o token do dispositivo para FCM
 */
export const requestFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    await initializeMessaging();
    if (!messaging) return null;
  }
  
  try {
    // Este token é necessário para enviar notificações especificamente para este dispositivo
    const currentToken = await getToken(messaging, {
      vapidKey: 'BHxKNS5mPT68fhwWEXeqcV_wT4CU4FCKO4xDR6j-dw1qGdMtKQwGRb5c6W5-fj0uXHg8LzdXqoaBg26iMjaxKrk',
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/sw.js')
    });
    
    if (currentToken) {
      appLogger.info('Token FCM obtido:', currentToken);
      
      // Salvar token no localStorage para usar na recuperação
      localStorage.setItem('fcmToken', currentToken);
      
      // Em um ambiente de produção, você enviaria este token para seu servidor
      // await sendTokenToServer(currentToken);
      
      return currentToken;
    } else {
      appLogger.warn('Não foi possível obter um token FCM');
      return null;
    }
  } catch (error) {
    appLogger.error('Erro ao obter token FCM:', error);
    return null;
  }
};

/**
 * Verifica se o dispositivo suporta notificações push via FCM
 */
export const deviceSupportsFCM = (): boolean => {
  // iOS Safari não suporta FCM adequadamente, então usaremos método alternativo
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    return false;
  }
  
  // Verificar suporte básico a Service Worker e notificações
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}; 