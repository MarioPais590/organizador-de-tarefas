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
 * Verifica se os ícones são diferentes entre si (não são placeholders)
 * @returns Promise<boolean> - true se os ícones parecem ser reais
 */
export async function verificarIconesDiferentes(): Promise<boolean> {
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconPromises = iconSizes.map(size => {
    return new Promise<{size: number, width: number, height: number, dataUrl?: string}>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Criar um canvas para extrair os dados da imagem
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Obter uma amostra de dados da imagem para comparação
          const dataUrl = canvas.toDataURL('image/png');
          
          resolve({
            size,
            width: img.width,
            height: img.height,
            dataUrl
          });
        } else {
          resolve({
            size,
            width: img.width,
            height: img.height
          });
        }
      };
      img.onerror = () => {
        reject(new Error(`Erro ao carregar ícone ${size}x${size}`));
      };
      img.src = `/icons/icon-${size}x${size}.png?v=${Date.now()}`;
    });
  });

  try {
    const icones = await Promise.all(iconPromises);
    
    // Verificar se os ícones têm dimensões diferentes
    const dimensoesDiferentes = icones.some((icone, i) => {
      if (i === 0) return true;
      const anterior = icones[i-1];
      return icone.width !== anterior.width || icone.height !== anterior.height;
    });
    
    // Verificar se os ícones têm as dimensões esperadas
    const dimensoesCorretas = icones.every(icone => 
      icone.width === icone.size && icone.height === icone.size
    );
    
    // Verificar se os ícones têm conteúdo diferente
    let conteudoDiferente = true;
    if (icones[0]?.dataUrl && icones[1]?.dataUrl) {
      // Comparar o hash dos primeiros bytes de cada imagem
      const hash1 = icones[0].dataUrl.substring(0, 100);
      const hash2 = icones[1].dataUrl.substring(0, 100);
      
      // Se os hashes forem muito similares, pode ser placeholder
      if (hash1 === hash2 && icones[0].width !== icones[1].width) {
        conteudoDiferente = false;
        console.error('Os ícones têm conteúdo muito similar, provavelmente são placeholders');
      }
    }
    
    // Verificar se algum dos ícones é o placeholder padrão
    const saoPlaceholders = await verificarIconesPlaceholder(icones);
    
    if (!dimensoesDiferentes) {
      console.error('Todos os ícones parecem ser iguais, provavelmente são placeholders');
    }
    
    if (!dimensoesCorretas) {
      console.error('Os ícones não têm as dimensões corretas esperadas');
    }
    
    return dimensoesDiferentes && dimensoesCorretas && conteudoDiferente && !saoPlaceholders;
  } catch (error) {
    console.error('Erro ao verificar ícones:', error);
    return false;
  }
}

/**
 * Verifica se os ícones são placeholders
 * @param icones Array de objetos com informações dos ícones
 * @returns Promise<boolean> - true se os ícones forem placeholders
 */
async function verificarIconesPlaceholder(
  icones: Array<{size: number, width: number, height: number, dataUrl?: string}>
): Promise<boolean> {
  // Verificar se todos os ícones têm o mesmo tamanho de arquivo
  // Isso pode indicar que são placeholders gerados automaticamente
  try {
    const responses = await Promise.all(
      icones.map(icone => 
        fetch(`/icons/icon-${icone.size}x${icone.size}.png?v=${Date.now()}`)
      )
    );
    
    // Obter os tamanhos dos arquivos
    const tamanhos = await Promise.all(
      responses.map(async response => {
        const blob = await response.blob();
        return blob.size;
      })
    );
    
    // Se todos os tamanhos forem muito similares (diferença < 10%), provavelmente são placeholders
    const tamanhoMedio = tamanhos.reduce((acc, tam) => acc + tam, 0) / tamanhos.length;
    const todosSimilares = tamanhos.every(tamanho => 
      Math.abs(tamanho - tamanhoMedio) / tamanhoMedio < 0.1
    );
    
    if (todosSimilares) {
      console.error('Todos os ícones têm tamanhos de arquivo muito similares, provavelmente são placeholders');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar tamanhos dos ícones:', error);
    return false;
  }
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