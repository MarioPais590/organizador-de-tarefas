import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { appLogger } from './utils/logger';
import { register as registerServiceWorker } from './services/serviceWorkerRegistration';

// PWA
import { configurarCapturaPWA } from './utils/pwaHelpers';
import { startPushServices } from './services/pushService';
import { initErrorMonitoring } from './services/errorMonitoringService';
import { initConnectionService } from './services/connectionService';

// Logging e diagnóstico
import { ErrorLogger } from './utils/errorLogger';

// Declara o tipo global para adicionar appLogger ao objeto window
declare global {
  interface Window {
    appLogger: typeof appLogger;
  }
}

// Inicializar logger global
window.appLogger = appLogger;

// Função para sincronizar tarefas com o Service Worker
const handleSyncResult = (success: boolean) => {
  if (success) {
    appLogger.info('Tarefas sincronizadas com sucesso');
  } else {
    appLogger.warn('Falha ao sincronizar tarefas');
  }
};

// Função para inicializar a aplicação
async function initApp() {
  try {
    // Registrar service worker para notificações em segundo plano
    if ('serviceWorker' in navigator) {
      try {
        await registerServiceWorker();
        appLogger.info('Service Worker registrado com sucesso');
      } catch (swError) {
        appLogger.error('Erro ao registrar Service Worker', swError);
      }
    }
  } catch (error) {
    appLogger.error('Erro durante inicialização:', error);
  }
}

// Função de inicialização
const init = async () => {
  try {
    appLogger.info('Inicializando aplicação');
    
    try {
      // Inicializar serviços
      ErrorLogger.initialize();
      initErrorMonitoring();
      initConnectionService();
      configurarCapturaPWA();
      appLogger.info('Registrando service worker');
      await initApp();
      
      // Inicializar serviço de notificações push
      await startPushServices();
      
      appLogger.info('Aplicação inicializada com sucesso');
    } catch (error) {
      appLogger.error('Erro durante inicialização:', error);
      console.error('Detalhes do erro:', error);
    }
  } catch (e) {
    console.error('Falha crítica ao inicializar:', e);
  }
};

// Renderizar o aplicativo
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Inicializar após o render
init().catch(e => {
  console.error('Erro fatal durante inicialização:', e);
});
