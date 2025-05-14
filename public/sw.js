/**
 * Service Worker para o Organizador de Tarefas
 * Implementa o caching de recursos estáticos para funcionamento offline
 * e gerencia notificações em segundo plano
 */

// Nome do cache
const CACHE_NAME = 'organizador-tarefas-v2';

// Configurações de verificação periódica
let CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos por padrão
let MIN_CHECK_INTERVAL = 1 * 60 * 1000; // 1 minuto, intervalo mínimo
let lastCheckTime = 0;
let isBackgroundMode = false;
let backgroundStartTime = 0;
let proximasTarefas = [];
let tarefasCache = [];
let heartbeatTimer = null;
let backgroundCheckTimer = null;
let lastBatteryLevel = 1.0; // Nível de bateria inicial (cheio)
let isBatteryLow = false;

// Variáveis para ajuste adaptativo
let tarefasProximasEncontradas = false;
let tempoProximaTarefa = Infinity;
let intervaloDinamico = CHECK_INTERVAL;

// Cache de mensagens pendentes que não puderam ser entregues
let mensagensPendentes = [];

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
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-512x512.png',
  '/sounds/notification.mp3'
];

// Evento de instalação - pré-cachear arquivos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  // Ativar imediatamente
  self.skipWaiting();
});

// Evento de ativação - limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativado!');
  
  // Reivindicar clientes para este service worker
  event.waitUntil(clients.claim());
  
  // Iniciar heartbeat para manter service worker ativo
  iniciarHeartbeat();
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
  } else if (event.tag === 'sincronizacao-periodica') {
    event.waitUntil(registrarSincronizacaoPeriodica());
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
    tag: data.tag || 'default',  // Permitir agrupar notificações
    actions: [
      {
        action: 'view',
        title: 'Ver detalhes'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ],
    silent: false
  };
  
  // Se recebemos dados sobre a tarefa, adicionar à notificação
  if (data.data && data.data.tarefa) {
    options.data.tarefa = data.data.tarefa;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Evento de clique em notificação
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notificação clicada:', event.notification.tag);
  
  // Fechar a notificação
  event.notification.close();
  
  // Dados personalizados da notificação
  const notificacaoData = event.notification.data || {};
  let urlDestino = '/';
  
  // Se a notificação contém dados sobre a tarefa, construir URL para a tarefa
  if (notificacaoData.tarefa) {
    urlDestino = `/tarefa/${notificacaoData.tarefa.id}`;
  }
  
  // Processar ações específicas
  if (event.action === 'view' && notificacaoData.tarefa) {
    urlDestino = `/tarefa/${notificacaoData.tarefa.id}`;
  }
  
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

// Evento para fechamento de notificação
self.addEventListener('notificationclose', event => {
  console.log('[Service Worker] Notificação fechada:', event.notification.tag);
});

// Evento de mensagem
self.addEventListener('message', event => {
  const data = event.data;
  
  if (data && data.type) {
    switch (data.type) {
      case 'APP_BACKGROUND':
        console.log('[Service Worker] Aplicativo entrou em segundo plano');
        isBackgroundMode = true;
        backgroundStartTime = Date.now();
        iniciarVerificacaoEmSegundoPlano();
        break;
        
      case 'APP_FOREGROUND':
        console.log('[Service Worker] Aplicativo voltou para o primeiro plano');
        isBackgroundMode = false;
        pararVerificacaoEmSegundoPlano();
        break;
        
      case 'CHECK_NOW':
        console.log('[Service Worker] Solicitação para verificar tarefas imediatamente');
        verificarTarefasPendentes();
        break;
        
      case 'REGISTER_PUSH':
        console.log('[Service Worker] Solicitação para registrar para notificações push');
        registrarParaNotificacoesPush(data.subscription);
        break;
        
      case 'UPDATE_CONFIG':
        console.log('[Service Worker] Atualização de configurações');
        atualizarConfiguracoes(data.config);
        break;
        
      case 'UPDATE_TAREFAS_CACHE':
        if (Array.isArray(data.tarefas)) {
          console.log('[Service Worker] Atualizando cache de tarefas:', data.tarefas.length);
          tarefasCache = data.tarefas;
        }
        break;
        
      case 'CHECK_PENDING_MESSAGES':
        console.log('[Service Worker] Verificando mensagens pendentes');
        enviarMensagensPendentes(event.source);
        break;
        
      case 'TEST_NOTIFICATION':
        console.log('[Service Worker] Evento de teste de notificação recebido');
        enviarNotificacaoTeste(event.source);
        break;
    }
  }
});

// Evento de estado de visibilidade (iOS Safari)
self.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    console.log('[Service Worker] Documento oculto (segundo plano)');
    isBackgroundMode = true;
    backgroundStartTime = Date.now();
    iniciarVerificacaoEmSegundoPlano();
  } else {
    console.log('[Service Worker] Documento visível (primeiro plano)');
    isBackgroundMode = false;
    pararVerificacaoEmSegundoPlano();
  }
});

// Em alguns navegadores, precisamos interceptar o evento que indica quando o dispositivo entra em modo inativo
self.addEventListener('freeze', () => {
  console.log('[Service Worker] Dispositivo em modo inativo (freeze)');
  isBackgroundMode = true;
  // Salvar estado antes de congelar
  persistirEstadoAtual();
});

self.addEventListener('resume', () => {
  console.log('[Service Worker] Dispositivo saiu do modo inativo (resume)');
  isBackgroundMode = false;
  // Restaurar estado após descongelar
  restaurarEstadoSalvo();
  verificarTarefasPendentes();
});

// Função para iniciar verificação periódica de tarefas
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

// Função para iniciar verificação em segundo plano (mais frequente)
function iniciarVerificacaoEmSegundoPlano() {
  console.log('[Service Worker] Iniciando verificação em segundo plano');
  
  // Limpar timer anterior, se existir
  if (backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer);
  }
  
  // Verificar imediatamente
  verificarTarefasPendentes()
    .then(() => {
      // Ajustar intervalo de verificação baseado no resultado
      ajustarIntervaloVerificacao();
      
      // Configurar verificação periódica
      backgroundCheckTimer = setInterval(() => {
        // Se estiver em modo de baixa bateria, verificar menos frequentemente
        if (isBatteryLow && !tarefasProximasEncontradas) {
          console.log('[Service Worker] Modo de economia de bateria ativo');
          const agora = Date.now();
          // Verificar a cada 15 minutos em economia de bateria, exceto se houver tarefas próximas
          if (agora - lastCheckTime < 15 * 60 * 1000) {
            return;
          }
        }
        
        verificarTarefasPendentes()
          .then(() => {
            // Re-ajustar o intervalo baseado no novo resultado
            ajustarIntervaloVerificacao();
          });
      }, intervaloDinamico);
    });
}

// Função para parar verificação em segundo plano
function pararVerificacaoEmSegundoPlano() {
  if (backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer);
    backgroundCheckTimer = null;
  }
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

// Função principal para verificar tarefas pendentes
async function verificarTarefasPendentes() {
  try {
    console.log('[Service Worker] Verificando tarefas pendentes...');
    lastCheckTime = Date.now();
    
    // Tentar verificar o nível de bateria
    await verificarBateria();
    
    // Se não temos nenhuma tarefa em cache, não podemos verificar
    if (!Array.isArray(tarefasCache) || tarefasCache.length === 0) {
      console.warn('[Service Worker] Cache de tarefas vazio, impossível verificar');
      // Solicitar cache atualizado aos clientes
      solicitarAtualizacaoCache();
      return [];
    }
    
    // Buscar configurações de notificações
    const config = await buscarConfiguracoes();
    
    if (!config || !config.ativadas) {
      console.log('[Service Worker] Notificações desativadas nas configurações');
      return [];
    }
    
    // Verificar cada tarefa
    const agora = new Date();
    const tarefasNotificar = [];
    let menorTempoParaTarefa = Infinity;
    
    for (const tarefa of tarefasCache) {
      const { deveNotificar, tempoParaTarefa } = verificarNotificacaoTarefa(tarefa, agora, config);
      
      if (tempoParaTarefa && tempoParaTarefa < menorTempoParaTarefa) {
        menorTempoParaTarefa = tempoParaTarefa;
      }
      
      if (deveNotificar) {
        tarefasNotificar.push(tarefa);
      }
    }
    
    // Registrar o tempo para a próxima tarefa mais próxima para ajuste adaptativo
    tempoProximaTarefa = menorTempoParaTarefa;
    tarefasProximasEncontradas = menorTempoParaTarefa < CHECK_INTERVAL * 3;
    
    // Se há tarefas para notificar
    if (tarefasNotificar.length > 0) {
      console.log(`[Service Worker] ${tarefasNotificar.length} tarefas para notificar`, tarefasNotificar);
      
      // Enviar notificações
      for (const tarefa of tarefasNotificar) {
        enviarNotificacao(tarefa, config);
      }
      
      // Guardar referência e notificar clientes
      proximasTarefas = tarefasNotificar;
      notificarClientesAtivos(tarefasNotificar);
    } else {
      console.log('[Service Worker] Nenhuma tarefa para notificar no momento');
      
      if (tarefasProximasEncontradas) {
        console.log(`[Service Worker] Próxima tarefa em ${formatarTempo(tempoProximaTarefa)}`);
      }
    }
    
    // Agora podemos reajustar o intervalo de verificação
    ajustarIntervaloVerificacao();
    
    // Atualizar o timestamp da última verificação
    localStorage.setItem('lastTarefaCheck', lastCheckTime.toString());
    
    return tarefasNotificar;
  } catch (error) {
    console.error('[Service Worker] Erro ao verificar tarefas:', error);
    return [];
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
        }).catch(err => {
          console.error('[Service Worker] Erro ao avaliar código no cliente:', err);
          return obterTarefasArmazenadasCache();
        });
      } else {
        // Se não há clientes ativos, usar o cache interno
        return obterTarefasArmazenadasCache();
      }
    }).catch(err => {
      console.error('[Service Worker] Erro ao acessar tarefas via client:', err);
      return obterTarefasArmazenadasCache();
    });
  } catch (e) {
    console.error('[Service Worker] Erro ao obter tarefas do localStorage:', e);
    return obterTarefasArmazenadasCache();
  }
}

// Obter tarefas do cache interno
function obterTarefasArmazenadasCache() {
  return tarefasCache;
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
  
  // Usar margem adaptativa baseada no tempo de antecedência
  let margemVerificacao;
  
  if (valorAntecedencia <= 5 && unidade === 'minutos') {
    // Margem mais estreita para tempos curtos (30% do tempo de antecedência, mínimo 20s)
    margemVerificacao = Math.max(20000, milissegundosAntecedencia * 0.3);
    console.log(`[Service Worker] Usando margem estreita de ${margemVerificacao/1000}s para notificação com antecedência de ${valorAntecedencia} ${unidade}`);
  } else if (valorAntecedencia <= 30 && unidade === 'minutos') {
    // Margem média para tempos médios (15% do tempo de antecedência, mínimo 60s)
    margemVerificacao = Math.max(60000, milissegundosAntecedencia * 0.15);
    console.log(`[Service Worker] Usando margem média de ${margemVerificacao/1000}s para notificação com antecedência de ${valorAntecedencia} ${unidade}`);
  } else {
    // Margem padrão para tempos longos (5% do tempo, máximo 10 minutos)
    margemVerificacao = Math.min(10 * 60 * 1000, milissegundosAntecedencia * 0.05);
    console.log(`[Service Worker] Usando margem padrão de ${margemVerificacao/1000}s para notificação com antecedência de ${valorAntecedencia} ${unidade}`);
  }
  
  // Verifique se o momento de notificação está entre agora e a próxima verificação
  const agoraMilis = agora.getTime();
  
  // A condição para notificar é: 
  // 1. O momento da notificação já passou OU está dentro da próxima janela de verificação
  // 2. E o momento da tarefa ainda não chegou
  const deveNotificar = 
    ((momentoNotificacao <= agoraMilis + margemVerificacao) && 
     (momentoNotificacao >= agoraMilis - margemVerificacao)) &&
    tempoParaTarefa > 0;
  
  // Adicionar logs mais detalhados para diagnóstico
  const tempoAteNotificacao = momentoNotificacao - agoraMilis;
  if (Math.abs(tempoAteNotificacao) < margemVerificacao * 2) {
    console.log(`[Service Worker] Tarefa "${tarefa.titulo}" analisada:
      Tempo até tarefa: ${formatarTempo(tempoParaTarefa)}
      Tempo até notificação: ${formatarTempo(tempoAteNotificacao)} (${tempoAteNotificacao > 0 ? 'futuro' : 'passado'})
      Margem de verificação: ${formatarTempo(margemVerificacao)}
      Deve notificar? ${deveNotificar ? 'SIM' : 'NÃO'}
    `);
  }
  
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
    // Se não houver clientes ativos, armazenar para posterior recuperação
    if (clientList.length === 0) {
      // Guardar a mensagem para entrega posterior
      storeMessageForLaterDelivery({
        tipo: tipo,
        tarefas: tarefasVerificadas,
        timestamp: Date.now()
      });
      return;
    }
    
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
    
    // Enviar para todos os clientes ativos
    clientList.forEach(client => {
      client.postMessage(mensagem);
    });
  }).catch(err => {
    console.error('[Service Worker] Erro ao notificar clientes:', err);
    // Armazenar a mensagem para envio posterior
    storeMessageForLaterDelivery({
      tipo: tipo,
      tarefas: tarefasVerificadas,
      erro: 'Erro ao notificar clientes'
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

// Função para armazenar mensagens para entrega posterior
function storeMessageForLaterDelivery(mensagem) {
  // Adicionar timestamp se não existir
  if (!mensagem.timestamp) {
    mensagem.timestamp = Date.now();
  }
  
  // Limitar a quantidade de mensagens pendentes para evitar consumo excessivo de memória
  if (mensagensPendentes.length >= 50) {
    // Remover a mensagem mais antiga
    mensagensPendentes.shift();
  }
  
  // Adicionar a nova mensagem
  mensagensPendentes.push(mensagem);
  
  console.log(`[Service Worker] Mensagem armazenada para entrega posterior. Total: ${mensagensPendentes.length}`);
}

// Função para enviar mensagens pendentes para um cliente
function enviarMensagensPendentes(client) {
  if (!client || mensagensPendentes.length === 0) return;
  
  console.log(`[Service Worker] Enviando ${mensagensPendentes.length} mensagens pendentes`);
  
  // Enviar em lote para reduzir overhead
  client.postMessage({
    tipo: 'pending-messages',
    mensagens: mensagensPendentes,
    timestamp: Date.now()
  });
  
  // Limpar mensagens após enviá-las
  mensagensPendentes = [];
}

// Função para enviar uma notificação de teste do service worker
async function enviarNotificacaoTeste(client) {
  try {
    console.log('[Service Worker] Enviando notificação de teste');
    
    // Enviar notificação de teste
    await self.registration.showNotification('Teste do Service Worker', {
      body: 'Esta notificação confirma que o Service Worker está funcionando corretamente em segundo plano.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'sw-test',
      renotify: true,
      vibrate: [100, 50, 100],
      data: {
        url: '/settings/notificacoes',
        test: true
      }
    });
    
    console.log('[Service Worker] Notificação de teste enviada');
    
    // Responder ao cliente que iniciou o teste
    if (client) {
      client.postMessage({
        tipo: 'test-result',
        sucesso: true,
        timestamp: Date.now(),
        mensagem: 'Teste de notificação em segundo plano executado com sucesso!'
      });
    }
  } catch (error) {
    console.error('[Service Worker] Erro ao enviar notificação de teste:', error);
    
    // Reportar erro ao cliente
    if (client) {
      client.postMessage({
        tipo: 'test-result',
        sucesso: false,
        erro: error.message || 'Erro desconhecido',
        timestamp: Date.now()
      });
    }
  }
}

// Função para ajustar o intervalo de verificação
function ajustarIntervaloVerificacao() {
  // Se não encontrarmos tarefas próximas, usar o intervalo padrão
  if (!tarefasProximasEncontradas) {
    intervaloDinamico = CHECK_INTERVAL;
    console.log(`[Service Worker] Usando intervalo padrão de ${formatarTempo(intervaloDinamico)}`);
    return;
  }
  
  // Ajuste dinâmico - quanto mais próxima a tarefa, menor o intervalo
  if (tempoProximaTarefa < 5 * 60 * 1000) { // < 5 min
    // Para tarefas muito próximas, verificar a cada 30 segundos
    intervaloDinamico = Math.max(MIN_CHECK_INTERVAL / 2, tempoProximaTarefa / 10);
  } else if (tempoProximaTarefa < 30 * 60 * 1000) { // < 30 min
    // Para tarefas próximas, verificar com maior frequência
    intervaloDinamico = Math.max(MIN_CHECK_INTERVAL, tempoProximaTarefa / 15);
  } else {
    // Para tarefas distantes, manter o intervalo padrão
    intervaloDinamico = CHECK_INTERVAL;
  }
  
  // Limitar o intervalo mínimo para preservar bateria
  intervaloDinamico = Math.max(MIN_CHECK_INTERVAL, intervaloDinamico);
  
  // Se a bateria estiver baixa, aumentar o intervalo para economizar
  if (isBatteryLow) {
    intervaloDinamico = Math.max(intervaloDinamico * 2, 5 * 60 * 1000);
  }
  
  console.log(`[Service Worker] Intervalo dinâmico ajustado para ${formatarTempo(intervaloDinamico)}`);
  
  // Atualizar o temporizador se estiver em segundo plano
  if (isBackgroundMode && backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer);
    backgroundCheckTimer = setInterval(() => {
      verificarTarefasPendentes()
        .then(() => ajustarIntervaloVerificacao());
    }, intervaloDinamico);
  }
}

// Função para tentar verificar o nível de bateria (quando disponível)
async function verificarBateria() {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      lastBatteryLevel = battery.level;
      isBatteryLow = battery.level <= 0.2 || battery.dischargingTime < 30 * 60; // < 20% ou < 30min restantes
      
      if (isBatteryLow) {
        console.log(`[Service Worker] Bateria baixa (${Math.round(battery.level * 100)}%), economizando energia`);
      }
      
      // Ouvir eventos de mudança de bateria
      battery.addEventListener('levelchange', () => {
        lastBatteryLevel = battery.level;
        const novoEstadoBateria = battery.level <= 0.2;
        
        if (novoEstadoBateria !== isBatteryLow) {
          isBatteryLow = novoEstadoBateria;
          if (isBatteryLow) {
            console.log(`[Service Worker] Bateria baixa (${Math.round(battery.level * 100)}%), economizando energia`);
          } else {
            console.log(`[Service Worker] Bateria ok (${Math.round(battery.level * 100)}%), modo normal`);
          }
          // Reajustar intervalos
          ajustarIntervaloVerificacao();
        }
      });
      
    } catch (error) {
      console.log('[Service Worker] Erro ao acessar informações de bateria:', error);
    }
  }
} 