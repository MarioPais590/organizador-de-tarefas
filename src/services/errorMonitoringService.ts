/**
 * Serviço de monitoramento de erros para notificações push
 * Permite rastrear e analisar problemas com notificações em diferentes dispositivos
 */

import { appLogger } from '@/utils/logger';

// Tipos de erros que podem ocorrer
export enum PushErrorType {
  PERMISSION_DENIED = 'permission_denied',
  SUBSCRIPTION_FAILED = 'subscription_failed',
  NETWORK_ERROR = 'network_error',
  SERVICE_WORKER_ERROR = 'service_worker_error',
  BACKGROUND_SYNC_ERROR = 'background_sync_error',
  NOTIFICATION_DELIVERY_FAILED = 'notification_delivery_failed',
  DEVICE_SPECIFIC = 'device_specific',
  UNSUPPORTED_BROWSER = 'unsupported_browser',
  UNKNOWN = 'unknown'
}

// Interface para evento de erro
interface PushErrorEvent {
  type: PushErrorType;
  message: string;
  timestamp: number;
  deviceInfo: DeviceInfo;
  details?: any;
}

// Informações sobre o dispositivo
interface DeviceInfo {
  userAgent: string;
  platform: string;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isPWA: boolean;
  serviceWorkerSupported: boolean;
  pushSupported: boolean;
}

// Histórico de erros
let errorHistory: PushErrorEvent[] = [];

// Limite de erros armazenados localmente
const MAX_ERROR_HISTORY = 50;

/**
 * Obtém informações do dispositivo atual
 */
function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
                
  return {
    userAgent,
    platform: navigator.platform,
    isIOS,
    isAndroid,
    isSafari,
    isPWA,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    pushSupported: 'PushManager' in window
  };
}

/**
 * Registra um erro de notificação
 */
export function logPushError(type: PushErrorType, message: string, details?: any): void {
  try {
    const errorEvent: PushErrorEvent = {
      type,
      message,
      timestamp: Date.now(),
      deviceInfo: getDeviceInfo(),
      details
    };
    
    // Adicionar ao histórico local
    errorHistory.push(errorEvent);
    
    // Limitar tamanho do histórico
    if (errorHistory.length > MAX_ERROR_HISTORY) {
      errorHistory = errorHistory.slice(-MAX_ERROR_HISTORY);
    }
    
    // Salvar no localStorage
    try {
      localStorage.setItem('pushErrorHistory', JSON.stringify(errorHistory));
    } catch (e) {
      appLogger.warn('Não foi possível salvar histórico de erros no localStorage');
    }
    
    // Registrar no sistema de logs
    appLogger.error(`[Push Notification Error] ${type}: ${message}`, details);
    
    // Em produção, enviar para serviço de análise de erros
    if (process.env.NODE_ENV === 'production') {
      sendErrorToAnalyticsService(errorEvent);
    }
  } catch (e) {
    appLogger.error('Erro ao registrar erro de notificação', e);
  }
}

/**
 * Registra um evento bem-sucedido de notificação
 */
export function logPushSuccess(eventType: string, details?: any): void {
  try {
    appLogger.info(`[Push Notification Success] ${eventType}`, details);
    
    // Em produção, enviar telemetria de sucesso
    if (process.env.NODE_ENV === 'production') {
      sendSuccessEventToAnalyticsService(eventType, details);
    }
  } catch (e) {
    appLogger.error('Erro ao registrar sucesso de notificação', e);
  }
}

/**
 * Envia erro para serviço de análise (implementação simulada)
 */
function sendErrorToAnalyticsService(errorEvent: PushErrorEvent): void {
  // Implementação simulada - em produção, enviar para um serviço real
  console.log('[Analytics] Erro de notificação registrado:', errorEvent);
  
  // Exemplo de implementação com fetch:
  /*
  fetch('/api/analytics/push-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorEvent)
  }).catch(e => console.error('Falha ao enviar erro para analytics', e));
  */
}

/**
 * Envia evento de sucesso para serviço de análise (implementação simulada)
 */
function sendSuccessEventToAnalyticsService(eventType: string, details?: any): void {
  // Implementação simulada - em produção, enviar para um serviço real
  console.log('[Analytics] Sucesso de notificação registrado:', { eventType, details });
}

/**
 * Obtém o histórico de erros para diagnóstico
 */
export function getPushErrorHistory(): PushErrorEvent[] {
  return [...errorHistory];
}

/**
 * Limpa o histórico de erros
 */
export function clearPushErrorHistory(): void {
  errorHistory = [];
  try {
    localStorage.removeItem('pushErrorHistory');
  } catch (e) {
    appLogger.warn('Não foi possível limpar histórico de erros do localStorage');
  }
}

/**
 * Inicializa o serviço de monitoramento
 */
export function initErrorMonitoring(): void {
  try {
    // Tentar carregar histórico anterior do localStorage
    const savedHistory = localStorage.getItem('pushErrorHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          errorHistory = parsed.slice(-MAX_ERROR_HISTORY);
        }
      } catch (e) {
        appLogger.warn('Erro ao carregar histórico de erros do localStorage');
      }
    }
    
    appLogger.info('Serviço de monitoramento de erros de notificações inicializado');
  } catch (e) {
    appLogger.error('Erro ao inicializar monitoramento de erros', e);
  }
} 