/**
 * Gerenciamento de comunicação com o Service Worker
 * Facilita o envio e recebimento de mensagens para o Service Worker
 */

import { appLogger } from '@/utils/logger';

// Tipos de mensagens
export enum ServiceWorkerMessageType {
  CHECK_PENDING_NOTIFICATIONS = 'CHECK_PENDING_NOTIFICATIONS',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_COMPLETE = 'SYNC_COMPLETE',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  CACHE_UPDATED = 'CACHE_UPDATED',
  PAGE_VISITED = 'PAGE_VISITED',
  NOTIFICATION_CLICKED = 'NOTIFICATION_CLICKED',
  ERROR_REPORT = 'ERROR_REPORT'
}

// Interface para mensagens do Service Worker
export interface ServiceWorkerMessage {
  type: ServiceWorkerMessageType | string;
  timestamp: number;
  data?: any;
}

// Armazenar handlers de mensagens
type MessageHandler = (message: ServiceWorkerMessage) => void;
const messageHandlers: MessageHandler[] = [];

/**
 * Configura o listener para mensagens do Service Worker
 */
export function setupServiceWorkerMessaging(): void {
  try {
    if (!('serviceWorker' in navigator)) {
      appLogger.warn('Service Worker não suportado, comunicação desativada');
      return;
    }
    
    // Registrar o handler de mensagens
    navigator.serviceWorker.addEventListener('message', (event) => {
      try {
        const message = event.data as ServiceWorkerMessage;
        
        if (message && message.type) {
          appLogger.debug(`Mensagem recebida do Service Worker: ${message.type}`);
          
          // Notificar todos os handlers registrados
          messageHandlers.forEach(handler => {
            try {
              handler(message);
            } catch (handlerError) {
              appLogger.error(`Erro ao processar mensagem em handler: ${handlerError}`);
            }
          });
        }
      } catch (error) {
        appLogger.error('Erro ao processar mensagem do Service Worker:', error);
      }
    });
    
    appLogger.info('Listener de mensagens do Service Worker configurado');
  } catch (error) {
    appLogger.error('Erro ao configurar messaging do Service Worker:', error);
  }
}

/**
 * Envia uma mensagem para o Service Worker
 */
export async function sendMessageToServiceWorker(
  type: ServiceWorkerMessageType | string, 
  data?: any
): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      appLogger.warn('Service Worker não suportado, mensagem não enviada');
      return false;
    }
    
    // Verificar se existe um controller
    if (!navigator.serviceWorker.controller) {
      appLogger.warn('Service Worker não está controlando a página, mensagem não enviada');
      return false;
    }
    
    // Criar a mensagem
    const message: ServiceWorkerMessage = {
      type,
      timestamp: Date.now(),
      data
    };
    
    // Enviar a mensagem
    navigator.serviceWorker.controller.postMessage(message);
    appLogger.debug(`Mensagem enviada para o Service Worker: ${type}`);
    
    return true;
  } catch (error) {
    appLogger.error(`Erro ao enviar mensagem para o Service Worker (${type}):`, error);
    return false;
  }
}

/**
 * Registra um handler para receber mensagens do Service Worker
 */
export function addServiceWorkerMessageHandler(handler: MessageHandler): void {
  messageHandlers.push(handler);
}

/**
 * Remove um handler previamente registrado
 */
export function removeServiceWorkerMessageHandler(handler: MessageHandler): void {
  const index = messageHandlers.indexOf(handler);
  if (index !== -1) {
    messageHandlers.splice(index, 1);
  }
}

/**
 * Solicita a sincronização de dados ao Service Worker
 */
export async function requestSyncFromServiceWorker(syncData?: any): Promise<boolean> {
  return sendMessageToServiceWorker(ServiceWorkerMessageType.SYNC_REQUEST, syncData);
}

/**
 * Atualiza as configurações no Service Worker
 */
export async function updateServiceWorkerSettings(settings: any): Promise<boolean> {
  return sendMessageToServiceWorker(ServiceWorkerMessageType.UPDATE_SETTINGS, settings);
}

/**
 * Informa ao Service Worker que uma notificação foi processada
 */
export async function notifyNotificationClicked(notificationId: string): Promise<boolean> {
  return sendMessageToServiceWorker(ServiceWorkerMessageType.NOTIFICATION_CLICKED, { notificationId });
}

/**
 * Solicita verificação de notificações pendentes
 */
export async function checkPendingNotifications(): Promise<boolean> {
  return sendMessageToServiceWorker(ServiceWorkerMessageType.CHECK_PENDING_NOTIFICATIONS);
} 