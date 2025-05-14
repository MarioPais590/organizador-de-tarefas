/**
 * Service Worker Registration
 * 
 * Este arquivo gerencia o registro e atualização do service worker.
 */

// Interface estendida para o ServiceWorkerRegistration
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
}

// Cache para armazenar o registro do service worker
let swRegistration: ServiceWorkerRegistrationWithSync | null = null;

/**
 * Função para registrar o service worker
 */
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const swUrl = '/sw.js';

        const registration = await navigator.serviceWorker.register(swUrl) as ServiceWorkerRegistrationWithSync;
        swRegistration = registration;
        
        console.log('[PWA] Service Worker registrado com sucesso:', registration);
        
        // Configurar detecção de atualizações
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
        
        // Após o registro bem-sucedido, inscrever para notificações push se estiver disponível
        if (registration.pushManager) {
          registrarParaNotificacoesPush(registration);
        }
        
        // Também iniciar uma sincronização periódica
        if ('sync' in registration && registration.sync) {
          try {
            await registration.sync.register('verificar-tarefas');
            console.log('[PWA] Sincronização de tarefas registrada');
          } catch (syncError) {
            console.warn('[PWA] Erro ao registrar sincronização:', syncError);
          }
        }
        
        // Configurar ouvinte para mensagens do Service Worker
        configurarOuvinteMensagens();
      } catch (error) {
        console.error('[PWA] Erro durante o registro do Service Worker:', error);
      }
    });
  }
}

/**
 * Registra o aplicativo para receber notificações push
 */
async function registrarParaNotificacoesPush(registration: ServiceWorkerRegistration) {
  try {
    // Verificar se já está inscrito
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[PWA] Já inscrito para notificações push');
      return;
    }
    
    // Se a API Web Push estiver disponível, criar inscrição
    if ('PushManager' in window) {
      try {
        // Gerar chaves VAPID no backend em uma aplicação real
        // Aqui usando uma chave pública de exemplo (que não funciona para produção)
        const publicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        
        const convertedKey = urlB64ToUint8Array(publicKey);
        
        // Criar a inscrição
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
        
        console.log('[PWA] Inscrito para notificações push:', newSubscription);
        
        // Em uma aplicação real, enviaríamos esta inscrição para o servidor
        // await enviarInscricaoParaServidor(newSubscription);
      } catch (pushError) {
        // Falha na inscrição, possivelmente permissão negada ou contexto inseguro
        console.warn('[PWA] Erro ao inscrever para notificações push:', pushError);
      }
    }
  } catch (error) {
    console.error('[PWA] Erro ao configurar notificações push:', error);
  }
}

/**
 * Configura ouvintes para mensagens do Service Worker
 */
function configurarOuvinteMensagens() {
  if (!navigator.serviceWorker) return;
  
  navigator.serviceWorker.addEventListener('message', event => {
    const mensagem = event.data;
    
    if (!mensagem || !mensagem.tipo) return;
    
    switch (mensagem.tipo) {
      case 'tarefas-verificadas':
        console.log('[PWA] Tarefas verificadas pelo Service Worker:', mensagem.tarefas);
        // Aqui podemos atualizar a interface, se necessário
        break;
      default:
        console.log('[PWA] Mensagem desconhecida do Service Worker:', mensagem);
    }
  });
}

/**
 * Solicita sincronização de dados em segundo plano
 */
export async function solicitarSincronizacao() {
  if (!swRegistration) {
    console.warn('[PWA] Sincronização em segundo plano não está disponível');
    return false;
  }
  
  if (!('sync' in swRegistration) || !swRegistration.sync) {
    console.warn('[PWA] API de sincronização não suportada neste navegador');
    return false;
  }
  
  try {
    await swRegistration.sync.register('verificar-tarefas');
    console.log('[PWA] Sincronização de tarefas solicitada');
    return true;
  } catch (error) {
    console.error('[PWA] Erro ao solicitar sincronização:', error);
    return false;
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
          swRegistration = null;
        } else {
          console.warn('[PWA] Falha ao desregistrar Service Worker');
        }
      }
    } catch (error) {
      console.error('[PWA] Erro ao desregistrar Service Worker:', error);
    }
  }
}

/**
 * Função auxiliar para converter chave base64 para array
 */
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Substituir o desregistro automático por registro automático
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    register();
  });
} 