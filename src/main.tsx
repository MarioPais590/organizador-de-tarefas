import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// PWA
import { configurarCapturaPWA } from './utils/pwaHelpers';
import { register as registerServiceWorker } from './serviceWorkerRegistration';

// Logging e diagnóstico
import { appLogger } from './utils/logger';
import { ErrorLogger } from './utils/errorLogger';

// Função de inicialização
const initializeApp = () => {
  appLogger.info('Iniciando a aplicação');
  
  // Inicializar o sistema de logging para capturar erros
  try {
    appLogger.info('Inicializando sistema de logs de erro');
    ErrorLogger.initialize();
    appLogger.info('Sistema de logs inicializado com sucesso');
  } catch (error) {
    console.error('Falha ao inicializar o sistema de logs:', error);
  }

  // Inicializar o PWA
  try {
    appLogger.info('Configurando captura de eventos PWA');
    configurarCapturaPWA();
    appLogger.info('Registrando service worker');
    registerServiceWorker();
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
initializeApp();

// Log de inicialização
console.log('Aplicação inicializada');
