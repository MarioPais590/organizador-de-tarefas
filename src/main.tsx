import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorLogger } from './utils/errorLogger';
import { register } from './serviceWorkerRegistration';
import { verificarIconesPWA, verificarIconesDiferentes } from './utils/pwaHelpers';

// Inicializar o sistema de logging para capturar erros
ErrorLogger.initialize();

// Registrar o service worker para PWA
register();

// Verificar se os ícones do PWA estão carregados corretamente
verificarIconesPWA().then(iconesSaoValidos => {
  if (!iconesSaoValidos) {
    console.error('Alguns ícones do PWA não foram carregados corretamente. Isso pode afetar a instalação do aplicativo.');
  } else {
    console.log('Todos os ícones do PWA foram carregados com sucesso.');
  }
  
  // Verificar se os ícones são reais (não são placeholders)
  verificarIconesDiferentes().then(iconesReais => {
    if (!iconesReais) {
      console.error('Os ícones do PWA parecem ser placeholders ou estão corrompidos. Isso pode fazer com que o ícone da Vercel seja usado em vez do seu ícone personalizado.');
      console.info('Substitua os ícones na pasta public/icons por ícones reais com os tamanhos corretos.');
    } else {
      console.log('Os ícones do PWA parecem ser reais e têm os tamanhos corretos.');
    }
  });
});

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
