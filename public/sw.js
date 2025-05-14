/**
 * Service Worker para o Organizador de Tarefas
 * Implementa o caching de recursos estáticos para funcionamento offline
 * e gerencia notificações em segundo plano
 */

// Nome do cache
const CACHE_NAME = 'organizador-tarefas-v1';

// Intervalo para verificação periódica de tarefas (15 minutos)
const CHECK_INTERVAL = 15 * 60 * 1000;

// Intervalo para heartbeat (5 minutos)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

// Chave para armazenar a última verificação
const LAST_CHECK_KEY = 'lastTarefaCheck';

// Arquivos a serem cacheados inicialmente
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Variáveis para rastrear verificações e heartbeats
let checkTimer = null;
let heartbeatTimer = null;

// Evento de instalação - pré-cachear arquivos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Pré-cachear arquivos
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Evento de ativação - limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Agora está gerenciando os clientes');
      return self.clients.claim();
    }).then(() => {
      // Iniciar verificação periódica de tarefas
      iniciarVerificacaoPeriodica();
      // Iniciar heartbeat
      iniciarHeartbeat();
    })
  );
});

// Evento de fetch - estratégia de cache
self.addEventListener('fetch', event => {
  // Ignorar requisições de API
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar do cache se encontrado
        if (response) {
          return response;
        }
        
        // Fazer requisição para a rede
        return fetch(event.request)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta para o cache
            let responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
});

// Evento de sincronização em segundo plano
self.addEventListener('sync', event => {
  console.log('[Service Worker] Evento de sincronização:', event.tag);
  
  if (event.tag === 'verificar-tarefas') {
    event.waitUntil(verificarTarefasPendentes());
  }
});

// Evento de notificação push
self.addEventListener('push', event => {
  console.log('[Service Worker] Notificação push recebida');
  
  let data = { title: 'Organizador de Tarefas', body: 'Nova notificação' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[Service Worker] Erro ao processar dados da notificação:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    requireInteraction: true,  // Manter a notificação visível até interação do usuário
    tag: data.tag || 'default'  // Permitir agrupar notificações
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Evento de clique em notificação
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notificação clicada:', event.notification.tag);
  
  event.notification.close();
  
  // Dados personalizados da notificação
  const notificacaoData = event.notification.data || {};
  const urlDestino = notificacaoData.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(clientList => {
      // Verificar se já há uma janela/aba aberta e focá-la
      for (let client of clientList) {
        if ('focus' in client) {
          client.navigate(urlDestino);
          return client.focus();
        }
      }
      
      // Abrir nova janela/aba se nenhuma estiver aberta
      if (clients.openWindow) {
        return clients.openWindow(urlDestino);
      }
    })
  );
});

// Iniciar verificação periódica de tarefas pendentes
function iniciarVerificacaoPeriodica() {
  console.log('[Service Worker] Iniciando verificação periódica de tarefas');
  
  // Limpar timer anterior se existir
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  
  // Verificar se é necessário fazer uma verificação imediata
  getLastCheckTime().then(lastCheck => {
    const agora = Date.now();
    
    // Se nunca verificou ou já passou do intervalo, verificar imediatamente
    if (!lastCheck || (agora - lastCheck) > CHECK_INTERVAL) {
      console.log('[Service Worker] Verificação inicial após ativação');
      verificarTarefasPendentes();
    } else {
      // Calcular quanto tempo falta para a próxima verificação programada
      const tempoRestante = (lastCheck + CHECK_INTERVAL) - agora;
      console.log(`[Service Worker] Próxima verificação programada em ${Math.round(tempoRestante/1000)} segundos`);
      
      // Configurar timer para a próxima verificação
      setTimeout(() => {
        verificarTarefasPendentes();
        // Depois da primeira verificação, estabelecer o intervalo regular
        checkTimer = setInterval(verificarTarefasPendentes, CHECK_INTERVAL);
      }, tempoRestante);
    }
  }).catch(err => {
    console.error('[Service Worker] Erro ao obter último horário de verificação:', err);
    // Em caso de erro, verificar imediatamente e estabelecer o intervalo
    verificarTarefasPendentes();
    checkTimer = setInterval(verificarTarefasPendentes, CHECK_INTERVAL);
  });
  
  // Registrar para verificação na reativação da rede
  self.addEventListener('online', () => {
    console.log('[Service Worker] Dispositivo está online, verificando tarefas pendentes');
    verificarTarefasPendentes();
  });
}

// Função de heartbeat para garantir que o service worker continue ativo
function iniciarHeartbeat() {
  console.log('[Service Worker] Iniciando heartbeat para manter o service worker ativo');
  
  // Limpar timer anterior se existir
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  
  // Configurar o heartbeat
  heartbeatTimer = setInterval(() => {
    console.log('[Service Worker] Heartbeat executado em:', new Date().toISOString());
    
    // Verificar se o timer de verificação de tarefas ainda está ativo
    getLastCheckTime().then(lastCheck => {
      const agora = Date.now();
      
      // Se já passou muito tempo desde a última verificação (mais de 2x o intervalo),
      // provavelmente o timer foi interrompido pelo sistema
      if (lastCheck && (agora - lastCheck) > (CHECK_INTERVAL * 2)) {
        console.log('[Service Worker] Detectada interrupção na verificação periódica, reiniciando');
        iniciarVerificacaoPeriodica();
      }
    }).catch(err => {
      console.error('[Service Worker] Erro no heartbeat:', err);
    });
    
    // Notificar clientes ativos sobre o heartbeat (útil para diagnóstico)
    notificarClientesAtivos([], 'heartbeat');
  }, HEARTBEAT_INTERVAL);
}

// Armazenar o horário da última verificação
function setLastCheckTime() {
  return new Promise((resolve, reject) => {
    try {
      const agora = Date.now();
      
      // Tentar usar IndexedDB primeiro
      openDatabase().then(db => {
        const transaction = db.transaction(['config'], 'readwrite');
        const store = transaction.objectStore('config');
        
        store.put({ key: LAST_CHECK_KEY, value: agora });
        
        transaction.oncomplete = () => {
          db.close();
          resolve(agora);
        };
        
        transaction.onerror = event => {
          db.close();
          console.error('[Service Worker] Erro ao salvar horário de verificação no IndexedDB:', event);
          // Fallback para localStorage
          localStorage.setItem(LAST_CHECK_KEY, agora.toString());
          resolve(agora);
        };
      }).catch(err => {
        // Fallback para localStorage
        localStorage.setItem(LAST_CHECK_KEY, agora.toString());
        resolve(agora);
      });
    } catch (err) {
      console.error('[Service Worker] Erro ao registrar verificação:', err);
      reject(err);
    }
  });
}

// Obter o horário da última verificação
function getLastCheckTime() {
  return new Promise((resolve, reject) => {
    try {
      // Tentar usar IndexedDB primeiro
      openDatabase().then(db => {
        const transaction = db.transaction(['config'], 'readonly');
        const store = transaction.objectStore('config');
        
        const request = store.get(LAST_CHECK_KEY);
        
        request.onsuccess = event => {
          db.close();
          const result = request.result;
          if (result && result.value) {
            resolve(result.value);
          } else {
            // Tentar localStorage como fallback
            const lastCheckLS = localStorage.getItem(LAST_CHECK_KEY);
            resolve(lastCheckLS ? parseInt(lastCheckLS, 10) : null);
          }
        };
        
        request.onerror = event => {
          db.close();
          console.error('[Service Worker] Erro ao ler horário de verificação do IndexedDB:', event);
          // Fallback para localStorage
          const lastCheckLS = localStorage.getItem(LAST_CHECK_KEY);
          resolve(lastCheckLS ? parseInt(lastCheckLS, 10) : null);
        };
      }).catch(err => {
        // Fallback para localStorage
        const lastCheckLS = localStorage.getItem(LAST_CHECK_KEY);
        resolve(lastCheckLS ? parseInt(lastCheckLS, 10) : null);
      });
    } catch (err) {
      console.error('[Service Worker] Erro ao obter último horário de verificação:', err);
      reject(err);
    }
  });
}

// Abrir banco de dados para o service worker
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ServiceWorkerDB', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      console.error('[Service Worker] Erro ao abrir banco de dados:', event);
      reject(event);
    };
  });
}

// Função para verificar tarefas pendentes e enviar notificações
async function verificarTarefasPendentes() {
  console.log('[Service Worker] Verificando tarefas pendentes em segundo plano:', new Date().toISOString());
  
  try {
    // Registrar horário da verificação
    setLastCheckTime();
    
    // Obter tarefas do IndexedDB
    const tarefas = await obterTarefasArmazenadas();
    if (!tarefas || tarefas.length === 0) {
      console.log('[Service Worker] Nenhuma tarefa encontrada para verificar');
      return;
    }
    
    // Obter configurações de notificação
    const config = await obterConfiguracoesNotificacao();
    if (!config || !config.ativadas) {
      console.log('[Service Worker] Notificações desativadas nas configurações');
      return;
    }
    
    // Verificar cada tarefa
    const agora = new Date();
    const verificadas = [];
    
    for (const tarefa of tarefas) {
      if (tarefa.concluida || !tarefa.notificar) continue;
      
      try {
        const resultado = verificarNotificacaoTarefa(tarefa, agora, config);
        if (resultado.deveNotificar) {
          // Enviar notificação
          await enviarNotificacaoTarefa(tarefa, resultado.tempoParaTarefa);
          verificadas.push(tarefa.id);
        }
      } catch (err) {
        console.error('[Service Worker] Erro ao processar tarefa:', err);
      }
    }
    
    console.log(`[Service Worker] Verificação concluída. Processadas: ${tarefas.length}, Notificadas: ${verificadas.length}`);
    
    // Se alguma tarefa foi verificada, notificar clientes ativos
    if (verificadas.length > 0) {
      notificarClientesAtivos(verificadas);
    }
  } catch (error) {
    console.error('[Service Worker] Erro ao verificar tarefas:', error);
  }
}

// Obter tarefas do IndexedDB
async function obterTarefasArmazenadas() {
  return new Promise((resolve) => {
    // Primeiro tentar recuperar do IndexedDB
    try {
      const request = indexedDB.open('organizador-tarefas-db', 1);
      
      request.onerror = function() {
        console.error('[Service Worker] Erro ao abrir IndexedDB');
        // Fallback para localStorage
        resolve(obterTarefasDoLocalStorage());
      };
      
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tarefas')) {
          db.createObjectStore('tarefas', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = function(event) {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['tarefas'], 'readonly');
          const store = transaction.objectStore('tarefas');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = function() {
            resolve(getAllRequest.result || []);
          };
          
          getAllRequest.onerror = function() {
            console.error('[Service Worker] Erro ao obter tarefas do IndexedDB');
            resolve(obterTarefasDoLocalStorage());
          };
        } catch (txError) {
          console.error('[Service Worker] Erro na transação do IndexedDB:', txError);
          resolve(obterTarefasDoLocalStorage());
        }
      };
    } catch (idbError) {
      console.error('[Service Worker] Erro geral do IndexedDB:', idbError);
      resolve(obterTarefasDoLocalStorage());
    }
  });
}

// Fallback para obter tarefas do LocalStorage
function obterTarefasDoLocalStorage() {
  try {
    // Acessar localStorage via clients
    return clients.matchAll().then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].evaluate(() => {
          const tarefasStr = localStorage.getItem('tarefas');
          return tarefasStr ? JSON.parse(tarefasStr) : [];
        });
      }
      return [];
    }).catch(err => {
      console.error('[Service Worker] Erro ao acessar tarefas via client:', err);
      return [];
    });
  } catch (e) {
    console.error('[Service Worker] Erro ao obter tarefas do localStorage:', e);
    return [];
  }
}

// Obter configurações de notificação
async function obterConfiguracoesNotificacao() {
  // Configurações padrão
  const configPadrao = {
    ativadas: true,
    comSom: true,
    antecedencia: {
      valor: 30,
      unidade: 'minutos'
    }
  };
  
  try {
    // Tentar acessar configurações via clients
    const clientList = await clients.matchAll();
    if (clientList.length > 0) {
      const configStr = await clientList[0].evaluate(() => {
        return localStorage.getItem('configuracoesNotificacao');
      });
      
      if (configStr) {
        return JSON.parse(configStr);
      }
    }
    
    return configPadrao;
  } catch (error) {
    console.error('[Service Worker] Erro ao obter configurações de notificação:', error);
    return configPadrao;
  }
}

// Verificar se uma tarefa deve ser notificada
function verificarNotificacaoTarefa(tarefa, agora, config) {
  // Verificar se os dados necessários existem
  if (!tarefa.data) {
    return { deveNotificar: false };
  }
  
  // Converter data/hora da tarefa para objeto Date
  const dataHoraTarefa = converterParaDate(tarefa.data, tarefa.hora);
  
  // Verificar se a data é válida
  if (isNaN(dataHoraTarefa.getTime())) {
    return { deveNotificar: false };
  }
  
  // Calcular tempo até a tarefa
  const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
  
  // Se a tarefa já passou, não notificar
  if (tempoParaTarefa <= 0) {
    return { deveNotificar: false };
  }
  
  // Calcular momento da notificação com base na antecedência configurada
  const valorAntecedencia = config.antecedencia.valor || 30;
  const unidade = config.antecedencia.unidade || 'minutos';
  
  // Converter antecedência para milissegundos
  const milissegundosAntecedencia = valorAntecedencia * 
    (unidade === 'minutos' ? 60000 : 3600000);
  
  // Momento em que a notificação deve ser enviada
  const momentoNotificacao = dataHoraTarefa.getTime() - milissegundosAntecedencia;
  
  // Verificar se estamos no momento de notificar
  // Com uma margem de 5 minutos para compensar a verificação periódica
  const margemVerificacao = 5 * 60 * 1000;
  
  // Verifique se o momento de notificação está entre agora e a próxima verificação
  const agoraMilis = agora.getTime();
  const proximaVerificacao = agoraMilis + CHECK_INTERVAL;
  
  // A condição para notificar é: 
  // 1. O momento da notificação já passou OU está dentro da próxima janela de verificação
  // 2. E o momento da tarefa ainda não chegou
  const deveNotificar = 
    ((momentoNotificacao <= agoraMilis + margemVerificacao) && 
     (momentoNotificacao >= agoraMilis - margemVerificacao)) &&
    tempoParaTarefa > 0;
  
  return {
    deveNotificar,
    tempoParaTarefa
  };
}

// Enviar notificação para uma tarefa
async function enviarNotificacaoTarefa(tarefa, tempoParaTarefa) {
  const horaFormatada = new Date(new Date().getTime() + tempoParaTarefa).toLocaleTimeString([], {
    hour: '2-digit', 
    minute:'2-digit'
  });
  
  const title = `Lembrete: ${tarefa.titulo}`;
  const options = {
    body: `Tarefa agendada para ${horaFormatada} (em ${formatarTempo(tempoParaTarefa)})`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `tarefa-${tarefa.id}`,
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: '/tarefas',
      tarefaId: tarefa.id
    }
  };
  
  await self.registration.showNotification(title, options);
  console.log(`[Service Worker] Notificação enviada para tarefa: ${tarefa.titulo}`);
  
  // Registrar que a tarefa foi notificada
  registrarTarefaNotificada(tarefa.id);
}

// Registrar que uma tarefa foi notificada para evitar duplicação
function registrarTarefaNotificada(tarefaId) {
  // Usar IndexedDB para registrar
  try {
    const request = indexedDB.open('organizador-tarefas-db', 1);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      try {
        const transaction = db.transaction(['notificacoes'], 'readwrite');
        const store = transaction.objectStore('notificacoes');
        
        store.put({
          id: tarefaId,
          timestamp: Date.now()
        });
      } catch (txError) {
        console.error('[Service Worker] Erro ao registrar notificação:', txError);
      }
    };
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notificacoes')) {
        db.createObjectStore('notificacoes', { keyPath: 'id' });
      }
    };
  } catch (error) {
    console.error('[Service Worker] Erro ao registrar notificação:', error);
  }
}

// Notificar clientes ativos sobre novas verificações
function notificarClientesAtivos(tarefasVerificadas, tipo = 'tarefas-verificadas') {
  clients.matchAll({ type: 'window' }).then(clientList => {
    clientList.forEach(client => {
      const mensagem = {
        tipo: tipo,
        timestamp: Date.now()
      };
      
      // Adicionar informações específicas dependendo do tipo de mensagem
      if (tipo === 'tarefas-verificadas') {
        mensagem.tarefas = tarefasVerificadas;
      } else if (tipo === 'heartbeat') {
        mensagem.lastCheck = localStorage.getItem('lastTarefaCheck');
        mensagem.serviceWorkerAtivo = true;
      }
      
      client.postMessage(mensagem);
    });
  });
}

// Função auxiliar para converter data e hora em objeto Date
function converterParaDate(data, hora) {
  try {
    if (!data) return new Date();
    
    // Criar a data sem manipulação de timezone para evitar problemas
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    
    // Definir horas para meia-noite por padrão
    dataObj.setHours(0, 0, 0, 0);
    
    // Se houver hora, adicionar
    if (hora && hora.includes(':')) {
      const [horaStr, minutoStr] = hora.split(':');
      const horaNum = parseInt(horaStr, 10);
      const minutoNum = parseInt(minutoStr, 10);
      
      if (!isNaN(horaNum) && !isNaN(minutoNum)) {
        dataObj.setHours(horaNum, minutoNum, 0, 0);
      }
    }
    
    return dataObj;
  } catch (error) {
    console.error(`[Service Worker] Erro ao converter data/hora: ${data} ${hora || ''}`, error);
    return new Date();
  }
}

// Função auxiliar para formatar tempo em texto legível
function formatarTempo(milissegundos) {
  const segundos = Math.floor(milissegundos / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (dias > 0) {
    return `${dias} dia${dias > 1 ? 's' : ''}`;
  } else if (horas > 0) {
    return `${horas} hora${horas > 1 ? 's' : ''}`;
  } else if (minutos > 0) {
    return `${minutos} minuto${minutos > 1 ? 's' : ''}`;
  } else {
    return `${segundos} segundo${segundos > 1 ? 's' : ''}`;
  }
} 