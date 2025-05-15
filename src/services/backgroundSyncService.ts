/**
 * Serviço de sincronização em segundo plano
 * Gerencia a sincronização de dados quando o aplicativo está offline
 */

import { appLogger } from '@/utils/logger';
import { isIOS, isAndroid } from './serviceWorkerUtils';
import { sendMessageToServiceWorker, ServiceWorkerMessageType } from './serviceWorkerMessaging';

// Interface para service worker com suporte a sincronização
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
  periodicSync?: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
  };
}

// Constantes
const SYNC_TAG_TASKS = 'sync-tasks';
const PERIODIC_SYNC_TAG = 'periodic-check-tasks';
const PERIODIC_SYNC_INTERVAL = 12 * 60 * 60 * 1000; // 12 horas em milissegundos

/**
 * Configura a sincronização em segundo plano
 */
export async function setupBackgroundSync(
  registration: ServiceWorkerRegistrationWithSync
): Promise<void> {
  try {
    appLogger.info('Configurando sincronização em segundo plano');
    
    // Verificar qual estratégia usar baseado no dispositivo
    if (isIOS()) {
      appLogger.info('Usando estratégia de sincronização alternativa para iOS');
      setupAlternativeBackgroundSync();
    } else if (isAndroid()) {
      // Verificar suporte a Background Sync API
      if (registration.sync) {
        appLogger.info('Registrando background sync para Android');
        await registerBackgroundSync(registration);
      } else {
        appLogger.info('Background Sync não suportado, usando estratégia alternativa');
        setupAlternativeBackgroundSync();
      }
    } else {
      // Desktop ou outro dispositivo
      appLogger.info('Configurando sincronização para desktop/outro dispositivo');
      
      // Tentar registrar sincronização periódica se suportada
      if (registration.periodicSync) {
        try {
          await registerPeriodicSync(registration);
        } catch (error) {
          appLogger.error('Erro ao registrar periodic sync:', error);
          // Fallback para background sync normal
          if (registration.sync) {
            await registerBackgroundSync(registration);
          } else {
            setupAlternativeBackgroundSync();
          }
        }
      } else if (registration.sync) {
        // Fallback para background sync normal
        await registerBackgroundSync(registration);
      } else {
        // Nenhum mecanismo de sincronização suportado
        setupAlternativeBackgroundSync();
      }
    }
    
    appLogger.info('Sincronização em segundo plano configurada com sucesso');
  } catch (error) {
    appLogger.error('Erro ao configurar sincronização em segundo plano:', error);
    // Em caso de erro, configurar estratégia alternativa
    setupAlternativeBackgroundSync();
  }
}

/**
 * Registra a sincronização em segundo plano
 */
async function registerBackgroundSync(
  registration: ServiceWorkerRegistrationWithSync
): Promise<void> {
  try {
    if (registration.sync) {
      await registration.sync.register(SYNC_TAG_TASKS);
      appLogger.info('Background Sync registrado com sucesso');
    } else {
      throw new Error('Background Sync API não disponível');
    }
  } catch (error) {
    appLogger.error('Erro ao registrar background sync:', error);
    throw error;
  }
}

/**
 * Registra a sincronização periódica
 */
async function registerPeriodicSync(
  registration: ServiceWorkerRegistrationWithSync
): Promise<void> {
  try {
    if (registration.periodicSync) {
      await registration.periodicSync.register(PERIODIC_SYNC_TAG, {
        minInterval: PERIODIC_SYNC_INTERVAL
      });
      appLogger.info('Periodic Sync registrado com sucesso');
    } else {
      throw new Error('Periodic Sync API não disponível');
    }
  } catch (error) {
    appLogger.error('Erro ao registrar periodic sync:', error);
    throw error;
  }
}

/**
 * Configura estratégia alternativa de sincronização
 * Para navegadores que não suportam Background Sync API
 */
function setupAlternativeBackgroundSync(): void {
  try {
    appLogger.info('Configurando estratégia alternativa de sincronização');
    
    // Armazenar timestamp da última verificação
    const lastCheckKey = 'last_sync_check_time';
    
    // Função para armazenar último horário de verificação
    const setLastCheckTime = () => {
      try {
        localStorage.setItem(lastCheckKey, Date.now().toString());
      } catch (error) {
        appLogger.error('Erro ao armazenar timestamp:', error);
      }
    };
    
    // Função para obter último horário de verificação
    const getLastCheckTime = (): number => {
      try {
        const stored = localStorage.getItem(lastCheckKey);
        return stored ? parseInt(stored, 10) : 0;
      } catch (error) {
        appLogger.error('Erro ao obter timestamp:', error);
        return 0;
      }
    };
    
    // Configurar para verificar quando online após estar offline
    window.addEventListener('online', async () => {
      try {
        appLogger.info('Dispositivo ficou online, verificando sincronização');
        
        const now = Date.now();
        const lastCheck = getLastCheckTime();
        const timeSinceLastCheck = now - lastCheck;
        
        // Sincronizar apenas se passou tempo suficiente desde a última verificação
        if (timeSinceLastCheck > 60000) { // 1 minuto
          await requestSync();
          setLastCheckTime();
        }
      } catch (error) {
        appLogger.error('Erro ao sincronizar após ficar online:', error);
      }
    });
    
    // Verificar periodicamente quando o aplicativo está aberto
    setInterval(async () => {
      try {
        if (navigator.onLine) {
          const now = Date.now();
          const lastCheck = getLastCheckTime();
          const timeSinceLastCheck = now - lastCheck;
          
          // Sincronizar apenas se passou tempo suficiente desde a última verificação
          if (timeSinceLastCheck > 30 * 60 * 1000) { // 30 minutos
            appLogger.info('Executando verificação periódica de sincronização');
            await requestSync();
            setLastCheckTime();
          }
        }
      } catch (error) {
        appLogger.error('Erro na verificação periódica de sincronização:', error);
      }
    }, 15 * 60 * 1000); // Verificar a cada 15 minutos
    
    // Registrar horário inicial
    setLastCheckTime();
  } catch (error) {
    appLogger.error('Erro ao configurar estratégia alternativa de sincronização:', error);
  }
}

/**
 * Solicita sincronização de dados
 */
export async function requestSync(): Promise<boolean> {
  try {
    appLogger.info('Solicitando sincronização de dados');
    
    // Enviar mensagem para o service worker
    const success = await sendMessageToServiceWorker(
      ServiceWorkerMessageType.SYNC_REQUEST,
      { timestamp: Date.now() }
    );
    
    if (success) {
      appLogger.info('Solicitação de sincronização enviada com sucesso');
    } else {
      appLogger.warn('Não foi possível enviar solicitação de sincronização');
    }
    
    return success;
  } catch (error) {
    appLogger.error('Erro ao solicitar sincronização:', error);
    return false;
  }
} 