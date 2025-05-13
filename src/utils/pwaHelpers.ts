/**
 * PWA Helpers
 * 
 * Este arquivo contém utilitários para gerenciar as funcionalidades PWA do aplicativo.
 */

/**
 * Força a atualização dos ícones do PWA limpando o cache
 */
export async function forcarAtualizacaoIconesPWA(): Promise<boolean> {
  if ('caches' in window) {
    try {
      // Nomes de caches relacionados a ícones
      const cacheNames = await caches.keys();
      const iconCaches = cacheNames.filter(name => 
        name.includes('icon') || name.includes('image') || name.includes('assets')
      );
      
      // Deletar caches de ícones
      await Promise.all(iconCaches.map(cacheName => caches.delete(cacheName)));
      
      console.log('[PWA] Caches de ícones limpos com sucesso');
      
      // Recarregar a página para aplicar as mudanças
      setTimeout(() => window.location.reload(), 500);
      return true;
    } catch (error) {
      console.error('[PWA] Erro ao limpar cache de ícones:', error);
      return false;
    }
  }
  return false;
}

/**
 * Verifica se todos os ícones necessários existem
 */
export async function verificarIconesPWA(): Promise<{validos: boolean, problemas: string[]}> {
  const problemas: string[] = [];
  const icons = [
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/icons/maskable-icon-512x512.png'
  ];
  
  for (const icon of icons) {
    try {
      // Adicionar timestamp para evitar cache no navegador
      const response = await fetch(`${icon}?t=${Date.now()}`, { method: 'HEAD' });
      if (!response.ok) {
        problemas.push(`Ícone não encontrado: ${icon}`);
      }
    } catch (error) {
      problemas.push(`Erro ao verificar ícone ${icon}`);
    }
  }
  
  return {
    validos: problemas.length === 0,
    problemas
  };
}

/**
 * Verifica se o PWA está instalado
 */
export function estaPWAInstalado(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Verifica se o dispositivo é iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Verifica se o navegador é Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Verifica se o PWA pode ser instalado
 */
export function podeInstalarPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Verifica se o aplicativo está sendo executado como PWA instalado
 */
export const isPwaInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

/**
 * Verifica se é possível instalar o PWA
 */
export const isPwaInstallable = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

/**
 * Exibe o prompt de instalação do PWA se disponível
 */
export async function solicitarInstalacaoPWA(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const { deferredPrompt } = window;
  
  if (!deferredPrompt) {
    console.log('[PWA] Prompt de instalação não disponível');
    return 'unavailable';
  }
  
  // Mostrar prompt de instalação
  deferredPrompt.prompt();
  
  // Aguardar a escolha do usuário
  const { outcome } = await deferredPrompt.userChoice;
  
  // Limpar referência ao prompt
  window.deferredPrompt = null;
  
  return outcome;
}

/**
 * Instala o tratador de eventos para capturar o evento beforeinstallprompt
 */
export function configurarCapturaPWA(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impedir o navegador de mostrar automaticamente o prompt
    e.preventDefault();
    
    // Armazenar o evento para uso posterior
    window.deferredPrompt = e as any;
    
    console.log('[PWA] Evento beforeinstallprompt capturado');
  });
  
  // Detectar quando o PWA foi instalado
  window.addEventListener('appinstalled', () => {
    // Limpar o prompt salvo
    window.deferredPrompt = null;
    console.log('[PWA] Aplicativo instalado com sucesso');
  });
}

/**
 * Configurar os event listeners para recursos PWA
 */
export const setupPwaEventListeners = (): void => {
  // Função desativada
  console.log('[PWA] Função desativada: setupPwaEventListeners');
};

/**
 * Verificar se o navegador suporta recursos PWA básicos
 */
export const checkPwaSupport = (): { 
  serviceWorker: boolean; 
  cache: boolean;
  indexedDb: boolean;
  webManifest: boolean;
} => {
  return {
    serviceWorker: false,
    cache: false,
    indexedDb: true,
    webManifest: false
  };
};

/**
 * Forçar a atualização do service worker
 */
export const updateServiceWorker = async (): Promise<boolean> => {
  console.log('[PWA] Função desativada: updateServiceWorker');
  return false;
};

/**
 * Limpar o cache do PWA
 */
export const clearPwaCache = async (): Promise<boolean> => {
  console.log('[PWA] Função desativada: clearPwaCache');
  return false;
}; 