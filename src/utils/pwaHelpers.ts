/**
 * Utilitários para o PWA
 */

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
            if (request.url.includes('/icons/') || request.url.includes('/app-icon.png')) {
              await cache.delete(request);
              console.log(`Cache limpo para: ${request.url}`);
            }
          }
        }
      }
      
      // Atualizar o service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao forçar atualização dos ícones:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Verifica se todos os ícones necessários existem
 * @returns Promise<boolean> - true se todos os ícones existem
 */
export async function verificarIconesPWA(): Promise<{validos: boolean, problemas: string[]}> {
  const problemas: string[] = [];
  
  try {
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    const icones = iconSizes.map(size => `/icons/icon-${size}x${size}.png`);
    icones.push('/icons/maskable-icon-512x512.png');
    
    for (const icone of icones) {
      try {
        const response = await fetch(icone, { cache: 'no-store' });
        
        if (!response.ok) {
          problemas.push(`O ícone ${icone} não foi encontrado (${response.status})`);
          continue;
        }
        
        // Verificar tamanho do arquivo para detectar placeholders
        const tamanho = parseInt(response.headers.get('content-length') || '0');
        if (tamanho < 1500) {
          problemas.push(`O ícone ${icone} parece ser um placeholder (${tamanho} bytes)`);
        }
      } catch (error) {
        problemas.push(`Erro ao verificar ícone ${icone}: ${error}`);
      }
    }
    
    return { 
      validos: problemas.length === 0,
      problemas
    };
  } catch (error) {
    return { 
      validos: false, 
      problemas: [`Erro ao verificar ícones: ${error}`]
    };
  }
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