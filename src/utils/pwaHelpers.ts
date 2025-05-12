/**
 * Utilitários para o PWA
 */

/**
 * Verifica se os ícones do PWA estão carregados corretamente
 * @returns Promise<boolean> - true se todos os ícones estiverem carregados corretamente
 */
export async function verificarIconesPWA(): Promise<boolean> {
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconPromises = iconSizes.map(size => {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Ícone ${size}x${size} carregado com sucesso`);
        resolve(true);
      };
      img.onerror = () => {
        console.error(`Erro ao carregar ícone ${size}x${size}`);
        resolve(false);
      };
      img.src = `/icons/icon-${size}x${size}.png?v=${Date.now()}`;
    });
  });

  // Verificar também o ícone maskable
  iconPromises.push(
    new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log('Ícone maskable carregado com sucesso');
        resolve(true);
      };
      img.onerror = () => {
        console.error('Erro ao carregar ícone maskable');
        resolve(false);
      };
      img.src = `/icons/maskable-icon-512x512.png?v=${Date.now()}`;
    })
  );

  const resultados = await Promise.all(iconPromises);
  const todosCarregados = resultados.every(resultado => resultado);
  
  if (!todosCarregados) {
    console.error('Alguns ícones do PWA não foram carregados corretamente');
  } else {
    console.log('Todos os ícones do PWA foram carregados com sucesso');
  }
  
  return todosCarregados;
}

/**
 * Força a atualização dos ícones do PWA limpando o cache
 * @returns Promise<boolean> - true se a atualização foi bem-sucedida
 */
export async function forcarAtualizacaoIconesPWA(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'caches' in window) {
    try {
      // Limpar o cache do service worker
      const cacheKeys = await caches.keys();
      for (const cacheKey of cacheKeys) {
        if (cacheKey.includes('organizador-tarefas')) {
          const cache = await caches.open(cacheKey);
          const requests = await cache.keys();
          
          // Remover apenas os ícones do cache
          for (const request of requests) {
            if (request.url.includes('/icons/')) {
              await cache.delete(request);
              console.log(`Cache limpo para: ${request.url}`);
            }
          }
        }
      }
      
      // Recarregar os ícones
      const iconesSaoValidos = await verificarIconesPWA();
      
      // Atualizar o service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
      
      return iconesSaoValidos;
    } catch (error) {
      console.error('Erro ao forçar atualização dos ícones:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Verifica se o PWA está instalado
 * @returns boolean - true se o PWA estiver instalado
 */
export function isPWAInstalado(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Verifica se o dispositivo é iOS
 * @returns boolean - true se o dispositivo for iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Verifica se o navegador é Safari
 * @returns boolean - true se o navegador for Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Verifica se o PWA pode ser instalado
 * @returns boolean - true se o PWA puder ser instalado
 */
export function podeInstalarPWA(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
} 