// Função para registrar o service worker
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      // Verificar se já existe um service worker ativo
      navigator.serviceWorker.getRegistration()
        .then(registration => {
          if (registration) {
            console.log('Service Worker já registrado, verificando atualizações...');
            registration.update();
          }
          return navigator.serviceWorker.register(swUrl);
        })
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
                  
                  // Opcionalmente, notificar o usuário sobre a atualização
                  if (window.confirm('Uma nova versão do aplicativo está disponível. Deseja atualizar agora?')) {
                    window.location.reload();
                  }
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
        
      // Verificar se o navegador suporta PWA
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS) {
        console.log('Dispositivo iOS detectado. Algumas funcionalidades PWA podem ser limitadas.');
        
        // No iOS, verificar se está em modo standalone
        if ((window.navigator as any).standalone === true) {
          console.log('Aplicativo está sendo executado em modo standalone no iOS');
        }
      }
    });
  } else {
    console.log('Este navegador não suporta Service Workers');
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