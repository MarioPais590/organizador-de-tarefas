/**
 * Serviço para detecção e gerenciamento do estado de conexão
 * Permite gerenciar a sincronização quando o dispositivo fica offline/online
 */

import { appLogger } from '@/utils/logger';
import { logPushError, PushErrorType } from './errorMonitoringService';
import { solicitarSincronizacao } from '../serviceWorkerRegistration';

// Tipos de estados de conexão
export enum ConnectionState {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SLOW = 'slow',
  METERED = 'metered',
  UNKNOWN = 'unknown'
}

// Eventos de conexão para os quais podemos registrar listeners
export enum ConnectionEvent {
  STATE_CHANGE = 'state_change',
  ONLINE = 'online',
  OFFLINE = 'offline'
}

// Armazenar callbacks dos listeners
const listeners: { [key in ConnectionEvent]?: Array<(state: ConnectionState) => void> } = {
  [ConnectionEvent.STATE_CHANGE]: [],
  [ConnectionEvent.ONLINE]: [],
  [ConnectionEvent.OFFLINE]: []
};

// Estado atual da conexão
let currentConnectionState: ConnectionState = ConnectionState.UNKNOWN;

// Timestamp da última vez que o dispositivo ficou offline
let lastOfflineTimestamp: number | null = null;

// Timestamp da última vez que o dispositivo voltou online
let lastOnlineTimestamp: number | null = null;

/**
 * Inicia o serviço de conexão
 */
export function initConnectionService(): void {
  try {
    // Verificar estado inicial da conexão
    updateConnectionState();
    
    // Registrar listeners para eventos de conexão
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Se disponível, usar API mais avançada de detecção de conexão
    if ('connection' in navigator) {
      try {
        const connection = (navigator as any).connection;
        
        if (connection) {
          // Registrar para eventos de mudança
          connection.addEventListener('change', updateConnectionState);
          
          // Verificar tipo de conexão inicial
          checkConnectionType(connection);
        }
      } catch (error) {
        appLogger.warn('Erro ao acessar API de conexão avançada:', error);
      }
    }
    
    appLogger.info('Serviço de detecção de conexão inicializado');
  } catch (error) {
    appLogger.error('Erro ao inicializar serviço de conexão:', error);
  }
}

/**
 * Handler para quando o dispositivo fica online
 */
function handleOnline(): void {
  appLogger.info('Dispositivo voltou a ficar online');
  
  // Atualizar estado atual
  const previousState = currentConnectionState;
  currentConnectionState = ConnectionState.ONLINE;
  lastOnlineTimestamp = Date.now();
  
  // Verificar quanto tempo ficou offline
  if (lastOfflineTimestamp) {
    const offlineDuration = lastOnlineTimestamp - lastOfflineTimestamp;
    appLogger.info(`Dispositivo ficou offline por ${Math.round(offlineDuration / 1000)} segundos`);
    
    // Se ficou offline por mais de 1 minuto, verificar tarefas pendentes
    if (offlineDuration > 60000) {
      tryToSyncAfterReconnection();
    }
  }
  
  // Notificar listeners
  notifyListeners(ConnectionEvent.ONLINE, currentConnectionState);
  
  // Se o estado mudou, notificar também os listeners de mudança de estado
  if (previousState !== currentConnectionState) {
    notifyListeners(ConnectionEvent.STATE_CHANGE, currentConnectionState);
  }
}

/**
 * Handler para quando o dispositivo fica offline
 */
function handleOffline(): void {
  appLogger.info('Dispositivo ficou offline');
  
  // Atualizar estado atual
  const previousState = currentConnectionState;
  currentConnectionState = ConnectionState.OFFLINE;
  lastOfflineTimestamp = Date.now();
  
  // Notificar listeners
  notifyListeners(ConnectionEvent.OFFLINE, currentConnectionState);
  
  // Se o estado mudou, notificar também os listeners de mudança de estado
  if (previousState !== currentConnectionState) {
    notifyListeners(ConnectionEvent.STATE_CHANGE, currentConnectionState);
  }
}

/**
 * Verifica e atualiza o estado atual da conexão
 */
function updateConnectionState(): void {
  // Verificar disponibilidade online/offline
  if (navigator.onLine === false) {
    currentConnectionState = ConnectionState.OFFLINE;
    return;
  }
  
  // Se estiver online, mas tivermos informações adicionais da API Connection
  if ('connection' in navigator) {
    try {
      const connection = (navigator as any).connection;
      
      if (connection) {
        checkConnectionType(connection);
        return;
      }
    } catch (error) {
      // Fallback para estado simples
      currentConnectionState = navigator.onLine ? ConnectionState.ONLINE : ConnectionState.OFFLINE;
    }
  } else {
    // API Connection não disponível, usar verificação básica
    currentConnectionState = navigator.onLine ? ConnectionState.ONLINE : ConnectionState.OFFLINE;
  }
}

/**
 * Verifica o tipo de conexão usando a Network Information API
 */
function checkConnectionType(connection: any): void {
  try {
    // Verificar se a conexão é limitada
    if (connection.saveData) {
      currentConnectionState = ConnectionState.METERED;
      return;
    }
    
    // Verificar velocidade da conexão
    const effectiveType = connection.effectiveType;
    
    if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      currentConnectionState = ConnectionState.SLOW;
    } else {
      currentConnectionState = ConnectionState.ONLINE;
    }
  } catch (error) {
    appLogger.warn('Erro ao verificar tipo de conexão:', error);
    currentConnectionState = ConnectionState.UNKNOWN;
  }
}

/**
 * Tenta sincronizar após reconexão
 */
function tryToSyncAfterReconnection(): void {
  try {
    appLogger.info('Solicitando sincronização após reconexão');
    
    // Verificar tarefas pendentes
    if ('serviceWorker' in navigator) {
      solicitarSincronizacao().then(success => {
        if (success) {
          appLogger.info('Sincronização após reconexão bem-sucedida');
        } else {
          appLogger.warn('Falha na sincronização após reconexão');
        }
      }).catch(error => {
        appLogger.error('Erro na sincronização após reconexão:', error);
        logPushError(PushErrorType.BACKGROUND_SYNC_ERROR, 'Erro na sincronização após reconexão', error);
      });
    }
  } catch (error) {
    appLogger.error('Erro ao tentar sincronizar após reconexão:', error);
  }
}

/**
 * Notifica todos os listeners para um determinado evento
 */
function notifyListeners(event: ConnectionEvent, state: ConnectionState): void {
  try {
    const eventListeners = listeners[event] || [];
    
    eventListeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        appLogger.error(`Erro ao executar callback para evento ${event}:`, error);
      }
    });
  } catch (error) {
    appLogger.error(`Erro ao notificar listeners para ${event}:`, error);
  }
}

/**
 * Registra um listener para eventos de conexão
 */
export function addConnectionListener(event: ConnectionEvent, callback: (state: ConnectionState) => void): void {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  
  listeners[event]!.push(callback);
}

/**
 * Remove um listener
 */
export function removeConnectionListener(event: ConnectionEvent, callback: (state: ConnectionState) => void): void {
  if (!listeners[event]) return;
  
  const index = listeners[event]!.indexOf(callback);
  if (index !== -1) {
    listeners[event]!.splice(index, 1);
  }
}

/**
 * Obtém o estado atual da conexão
 */
export function getConnectionState(): ConnectionState {
  return currentConnectionState;
}

/**
 * Verifica se o dispositivo está online
 */
export function isOnline(): boolean {
  return currentConnectionState !== ConnectionState.OFFLINE;
}

/**
 * Verifica se a conexão é lenta
 */
export function isSlowConnection(): boolean {
  return currentConnectionState === ConnectionState.SLOW;
}

/**
 * Verifica se a conexão é limitada (economia de dados)
 */
export function isMeteredConnection(): boolean {
  return currentConnectionState === ConnectionState.METERED;
} 