import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorLogger } from './utils/errorLogger';

// Inicializar o sistema de logging para capturar erros
ErrorLogger.initialize();

// Garantir que o renderizador espere o DOM estar completamente carregado
const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Elemento root não encontrado, aguardando DOM...');
    setTimeout(renderApp, 100);
    return;
  }

  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('Aplicação renderizada com sucesso!');
  } catch (error) {
    console.error('Erro ao renderizar a aplicação:', error);
  }
};

// Iniciar o renderizador quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
