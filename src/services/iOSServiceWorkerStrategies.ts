/**
 * Estratégias específicas para Service Worker no iOS
 * O iOS tem comportamentos específicos com PWAs e Service Workers que precisam de tratamento especial
 */

import { appLogger } from '@/utils/logger';
import { getiOSVersion } from './serviceWorkerUtils';

// Interface para adicionar timeout no objeto window para o iOS
declare global {
  interface Window {
    iOS_BACKGROUND_NOTIFICATION_TIMEOUT?: ReturnType<typeof setTimeout> | undefined;
  }
}

/**
 * Verifica se é necessário usar uma estratégia especial para iOS
 */
export function needsIOSSpecialStrategy(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Configura estratégia para iOS baseada na versão
 */
export function setupIOSBackgroundStrategy(): void {
  try {
    appLogger.info('Configurando estratégia iOS para notificações em segundo plano');
    
    // Obter versão do iOS
    const iOSVersion = getiOSVersion();
    appLogger.info(`Versão do iOS detectada: ${iOSVersion}`);
    
    if (iOSVersion >= 16.4) {
      // iOS 16.4+ suporta notificações push adequadamente
      setupModerniOSStrategy();
    } else {
      // Versões mais antigas precisam de fallbacks
      setupLegacyiOSStrategy();
    }
  } catch (error) {
    appLogger.error('Erro ao configurar estratégia iOS:', error);
  }
}

/**
 * Configura estratégia para iOS 16.4+ que suporta notificações push nativas
 */
function setupModerniOSStrategy(): void {
  try {
    appLogger.info('Configurando estratégia para iOS moderno (16.4+)');
    
    // Configurar visibilidade
    setupVisibilityDetection();
    
    // Reportar visualização de página
    reportPageVisit();
  } catch (error) {
    appLogger.error('Erro ao configurar estratégia para iOS moderno:', error);
  }
}

/**
 * Configura estratégia para iOS mais antigo que não suporta notificações push
 */
function setupLegacyiOSStrategy(): void {
  try {
    appLogger.info('Configurando estratégia para iOS legado (<16.4)');
    
    // Configurar visibilidade
    setupVisibilityDetection();
    
    // Verificar periodicamente em segundo plano
    setupPeriodicCheck();
    
    // Verificar quando o app é reaberto
    setupAppReopenDetection();
    
    // Reportar visualização de página
    reportPageVisit();
  } catch (error) {
    appLogger.error('Erro ao configurar estratégia para iOS legado:', error);
  }
}

/**
 * Configura detecção de visibilidade da página
 */
function setupVisibilityDetection(): void {
  try {
    // Detectar quando a página fica visível/invisível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        appLogger.info('Aplicativo voltou ao primeiro plano (iOS)');
        
        // Limpar qualquer verificação em segundo plano
        if (window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT) {
          clearTimeout(window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT);
          window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT = undefined;
        }
        
        // Verificar notificações pendentes quando voltar ao primeiro plano
        checkPendingNotifications();
      } else {
        appLogger.info('Aplicativo foi para segundo plano (iOS)');
        
        // Configurar verificação em segundo plano
        setupBackgroundCheck();
      }
    });
    
    appLogger.info('Detector de visibilidade configurado para iOS');
  } catch (error) {
    appLogger.error('Erro ao configurar detecção de visibilidade:', error);
  }
}

/**
 * Configura verificação periódica para iOS
 */
function setupPeriodicCheck(): void {
  try {
    // Verificar a cada 5 minutos
    const REFRESH_INTERVAL = 5 * 60 * 1000;
    
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        appLogger.info('Verificação periódica de notificações (iOS visível)');
        checkPendingNotifications();
      }
    }, REFRESH_INTERVAL);
    
    appLogger.info('Verificação periódica configurada para iOS');
  } catch (error) {
    appLogger.error('Erro ao configurar verificação periódica:', error);
  }
}

/**
 * Configura verificação em segundo plano para iOS
 */
function setupBackgroundCheck(): void {
  try {
    // No iOS, a execução em segundo plano é limitada
    // Esta é uma tentativa de conseguir um pouco mais de tempo antes do app ser pausado
    
    const BACKGROUND_CHECK_DELAY = 10000; // 10 segundos
    
    window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT = setTimeout(() => {
      appLogger.info('Executando verificação em segundo plano (iOS)');
      checkPendingNotifications();
      window.iOS_BACKGROUND_NOTIFICATION_TIMEOUT = undefined;
    }, BACKGROUND_CHECK_DELAY);
    
    appLogger.info('Verificação em segundo plano configurada para iOS');
  } catch (error) {
    appLogger.error('Erro ao configurar verificação em segundo plano:', error);
  }
}

/**
 * Configura detecção de reabertura do app
 */
function setupAppReopenDetection(): void {
  try {
    window.addEventListener('focus', () => {
      appLogger.info('Aplicativo recebeu foco (iOS)');
      checkPendingNotifications();
    });
    
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        appLogger.info('Aplicativo restaurado do bfcache (iOS)');
        checkPendingNotifications();
      }
    });
    
    appLogger.info('Detector de reabertura configurado para iOS');
  } catch (error) {
    appLogger.error('Erro ao configurar detecção de reabertura:', error);
  }
}

/**
 * Verifica notificações pendentes
 */
function checkPendingNotifications(): void {
  try {
    // Enviar mensagem para o service worker verificar notificações
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_PENDING_NOTIFICATIONS',
        timestamp: Date.now()
      });
      
      appLogger.info('Solicitação de verificação de notificações enviada');
    }
  } catch (error) {
    appLogger.error('Erro ao verificar notificações pendentes:', error);
  }
}

/**
 * Reporta visita à página para o service worker
 */
function reportPageVisit(): void {
  try {
    // Reportar que a página foi visitada (útil para o service worker)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PAGE_VISITED',
        timestamp: Date.now()
      });
      
      appLogger.info('Visita à página reportada ao service worker');
    }
  } catch (error) {
    appLogger.error('Erro ao reportar visita à página:', error);
  }
} 