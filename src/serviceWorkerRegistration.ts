/**
 * Service Worker Registration
 * 
 * Este arquivo gerencia o registro e atualização do service worker.
 */

/**
 * Função para registrar o service worker
 */
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then(registration => {
          console.log('[PWA] Service Worker registrado com sucesso:', registration);
          
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Uma nova versão foi instalada
                  console.log(
                    '[PWA] Nova versão do Service Worker disponível; será usado quando todas as abas forem fechadas'
                  );
                } else {
                  // O primeiro Service Worker foi instalado
                  console.log('[PWA] Conteúdo está em cache para uso offline');
                }
              }
            };
          };
        })
        .catch(error => {
          console.error('[PWA] Erro durante o registro do Service Worker:', error);
        });
    });
  }
}

/**
 * Função para desregistrar o service worker
 */
export async function unregister() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        const success = await registration.unregister();
        if (success) {
          console.log('[PWA] Service Worker desregistrado com sucesso');
        } else {
          console.warn('[PWA] Falha ao desregistrar Service Worker');
        }
      }
    } catch (error) {
      console.error('[PWA] Erro ao desregistrar Service Worker:', error);
    }
  }
}

// Executar unregister automaticamente para garantir limpeza
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    unregister();
  });
} 