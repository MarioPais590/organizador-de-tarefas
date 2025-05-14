import { appLogger } from "@/utils/logger";

/**
 * Detecta os recursos básicos disponíveis no navegador
 */
export function detectAvailableFeatures(): { [key: string]: boolean } {
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
 * Detecta se o app está instalado como PWA
 */
function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.matchMedia('(display-mode: fullscreen)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Detecta a versão do iOS
 */
function getiOSVersion(): number {
  const match = navigator.userAgent.match(/OS (\d+)_/i);
  return match && match[1] ? parseInt(match[1], 10) : 0;
}

/**
 * Verifica se o Service Worker está registrado e ativo
 */
async function checkServiceWorkerStatus(): Promise<{ 
  registered: boolean;
  active: boolean;
  controller: boolean;
}> {
  if (!('serviceWorker' in navigator)) {
    return { registered: false, active: false, controller: false };
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasRegistration = registrations.length > 0;
    const controller = !!navigator.serviceWorker.controller;
    
    return {
      registered: hasRegistration,
      active: hasRegistration && registrations.some(reg => !!reg.active),
      controller
    };
  } catch (error) {
    appLogger.error('Erro ao verificar status do Service Worker:', error);
    return { registered: false, active: false, controller: false };
  }
}

/**
 * Verifica o status da permissão de notificações
 */
function checkNotificationPermission(): { 
  available: boolean;
  permission: NotificationPermission | null;
} {
  if (!('Notification' in window)) {
    return { available: false, permission: null };
  }
  
  return {
    available: true,
    permission: Notification.permission
  };
}

/**
 * Verifica o status do armazenamento persistente
 */
async function checkPersistentStorage(): Promise<{
  available: boolean;
  persisted: boolean | null;
}> {
  if (!('storage' in navigator && 'persist' in navigator.storage)) {
    return { available: false, persisted: null };
  }
  
  try {
    const persisted = await navigator.storage.persisted();
    return { available: true, persisted };
  } catch (error) {
    appLogger.error('Erro ao verificar armazenamento persistente:', error);
    return { available: true, persisted: false };
  }
}

/**
 * Detecta possíveis problemas que podem afetar notificações
 */
function detectIssues(
  features: { [key: string]: boolean },
  swStatus: { registered: boolean; active: boolean; controller: boolean },
  notificationStatus: { available: boolean; permission: NotificationPermission | null },
  storageStatus: { available: boolean; persisted: boolean | null }
): Array<{ 
  message: string;
  severity: 'critical' | 'warning';
  solution?: string 
}> {
  const issues: Array<{ message: string; severity: 'critical' | 'warning'; solution?: string }> = [];
  
  // Problemas críticos que impedem as notificações
  if (!features.serviceWorker) {
    issues.push({
      message: 'Seu navegador não suporta Service Workers, necessários para notificações em segundo plano.',
      severity: 'critical',
      solution: 'Use um navegador moderno como Chrome, Edge, Firefox ou Safari.'
    });
  }
  
  if (!features.notification) {
    issues.push({
      message: 'Seu navegador não suporta Notificações.',
      severity: 'critical',
      solution: 'Use um navegador moderno ou verifique as configurações do seu sistema.'
    });
  }
  
  if (notificationStatus.permission === 'denied') {
    issues.push({
      message: 'Permissão de notificações foi negada pelo usuário.',
      severity: 'critical',
      solution: 'Limpe as configurações do site ou acesse as configurações do navegador para permitir notificações.'
    });
  }
  
  if (features.serviceWorker && !swStatus.registered) {
    issues.push({
      message: 'Service Worker disponível, mas não registrado.',
      severity: 'critical',
      solution: 'Recarregue a página ou reinstale o aplicativo.'
    });
  }
  
  // Avisos que podem afetar a confiabilidade
  if (features.isIOS && !features.isPWA) {
    issues.push({
      message: 'Em dispositivos iOS, as notificações em segundo plano funcionam melhor quando instalado como PWA.',
      severity: 'warning',
      solution: 'Adicione o aplicativo à tela inicial usando o botão "Compartilhar" e depois "Adicionar à Tela de Início".'
    });
  }
  
  if (features.persistentStorage && storageStatus.available && !storageStatus.persisted) {
    issues.push({
      message: 'Armazenamento persistente não ativado, o que pode limitar funcionalidades offline.',
      severity: 'warning',
      solution: 'Na próxima vez que o aplicativo for carregado, ele tentará solicitar armazenamento persistente.'
    });
  }
  
  if (features.isIOS) {
    const iOSVersion = getiOSVersion();
    if (iOSVersion > 0 && iOSVersion < 16.4) {
      issues.push({
        message: `Versão do iOS (${iOSVersion}) tem suporte limitado para notificações em PWAs.`,
        severity: 'warning',
        solution: 'Atualize para iOS 16.4 ou superior para melhor suporte a notificações.'
      });
    }
  }
  
  return issues;
}

/**
 * Executa diagnóstico completo do sistema de notificações
 */
export async function runDiagnostics(): Promise<{
  swStatus: { registered: boolean; active: boolean; controller: boolean };
  notification: { available: boolean; permission: NotificationPermission | null };
  storage: { available: boolean; persisted: boolean | null };
  issues: Array<{ message: string; severity: 'critical' | 'warning'; solution?: string }>;
}> {
  // Detectar recursos
  const features = detectAvailableFeatures();
  
  // Verificar status do service worker
  const swStatus = await checkServiceWorkerStatus();
  
  // Verificar permissão de notificação
  const notificationStatus = checkNotificationPermission();
  
  // Verificar armazenamento persistente
  const storageStatus = await checkPersistentStorage();
  
  // Detectar problemas
  const issues = detectIssues(features, swStatus, notificationStatus, storageStatus);
  
  return {
    swStatus,
    notification: notificationStatus,
    storage: storageStatus,
    issues
  };
} 