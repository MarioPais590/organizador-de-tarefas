// Função para registrar o service worker
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('ServiceWorker registrado com sucesso:', registration.scope);
          
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  console.log('Nova versão do Service Worker disponível. Recarregue para usar a versão mais recente.');
                } else {
                  // Primeira instalação
                  console.log('Conteúdo cacheado para uso offline.');
                }
              }
            };
          };
        })
        .catch(error => {
          console.error('Erro durante o registro do ServiceWorker:', error);
        });
    });
  }
}

// Função para desregistrar o service worker
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
} 