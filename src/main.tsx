import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// PWA
import { configurarCapturaPWA } from './utils/pwaHelpers';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { startPushServices } from './services/pushService';
import { initErrorMonitoring } from './services/errorMonitoringService';
import { initConnectionService } from './services/connectionService';

// Logging e diagnóstico
import { appLogger } from './utils/logger';
import { ErrorLogger } from './utils/errorLogger';

// Função para sincronizar tarefas com o Service Worker
const sincronizarTarefasComServiceWorker = () => {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Obter tarefas do localStorage
      const tarefasStr = localStorage.getItem('tarefas');
      const tarefas = tarefasStr ? JSON.parse(tarefasStr) : [];
      
      // Enviar para o Service Worker
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_TAREFAS_CACHE',
        tarefas
      });
      
      appLogger.info('Tarefas sincronizadas com o Service Worker');
    }
  } catch (error) {
    appLogger.error('Erro ao sincronizar tarefas com o Service Worker:', error);
  }
};

// Função de inicialização
const initializeApp = async () => {
  appLogger.info('Iniciando a aplicação');
  
  // Inicializar o sistema de logging para capturar erros
  try {
    appLogger.info('Inicializando sistema de logs de erro');
    ErrorLogger.initialize();
    appLogger.info('Sistema de logs inicializado com sucesso');
    
    // Inicializar o monitoramento de erros de notificações
    initErrorMonitoring();
    
    // Inicializar serviço de gerenciamento de conexão
    initConnectionService();
  } catch (error) {
    console.error('Falha ao inicializar o sistema de logs:', error);
  }

  // Inicializar o PWA
  try {
    appLogger.info('Configurando captura de eventos PWA');
    configurarCapturaPWA();
    appLogger.info('Registrando service worker');
    await registerServiceWorker();
    
    // Inicializar serviço de notificações push
    appLogger.info('Inicializando serviço de notificações push');
    const pushInitialized = await startPushServices();
    appLogger.info(`Serviço de notificações push inicializado: ${pushInitialized ? 'Sim' : 'Não'}`);
    
    // Sincronizar tarefas com o Service Worker
    sincronizarTarefasComServiceWorker();
    
    // Configurar sincronização periódica de tarefas
    window.addEventListener('storage', (event) => {
      if (event.key === 'tarefas') {
        sincronizarTarefasComServiceWorker();
      }
    });
    
    // Sincronizar quando o usuário retornar ao aplicativo
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        sincronizarTarefasComServiceWorker();
      }
    });
  } catch (error) {
    console.error('Falha ao inicializar o PWA:', error);
  }
};

// Renderizar a aplicação
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Inicializar a aplicação
initializeApp().catch(error => {
  console.error('Erro durante a inicialização da aplicação:', error);
});

// Log de inicialização
console.log('Aplicação iniciada');
