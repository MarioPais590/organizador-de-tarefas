/**
 * Utilitários para o Service Worker
 * Funções auxiliares para gerenciamento de Service Worker
 */

import { appLogger } from '@/utils/logger';

/**
 * Detecta se o dispositivo é iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         ((navigator as any).standalone !== undefined && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detecta se o dispositivo é Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Detecta a versão do iOS
 */
export function getiOSVersion(): number {
  const match = navigator.userAgent.match(/OS (\d+)_/i);
  return match && match[1] ? parseInt(match[1], 10) : 0;
}

/**
 * Detecta se o aplicativo está instalado como PWA
 */
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.matchMedia('(display-mode: fullscreen)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Converte uma string base64 para Uint8Array (para chaves VAPID)
 */
export function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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
 * Detecta recursos disponíveis no navegador
 */
export function detectAvailableFeatures(): { [key: string]: boolean } {
  try {
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
  } catch (error) {
    appLogger.error('Erro ao detectar recursos disponíveis:', error);
    return {
      serviceWorker: false,
      pushManager: false,
      notification: false,
      persistentStorage: false,
      indexedDB: false,
      localStorage: false,
      sessionStorage: false,
      vibration: false,
      isIOS: false,
      isAndroid: false,
      isPWA: false
    };
  }
}

/**
 * Solicita permissão para armazenamento persistente
 */
export async function requestPersistentStorage(): Promise<boolean> {
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