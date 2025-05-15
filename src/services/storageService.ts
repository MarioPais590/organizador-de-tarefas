import { Tarefa, Categoria, ConfiguracoesNotificacao } from '@/types';

// Nome do banco de dados
const DB_NAME = 'organizador-tarefas-db';
const DB_VERSION = 1;

// Nomes das stores
const STORE_TAREFAS = 'tarefas';
const STORE_NOTIFICACOES = 'notificacoes';
const STORE_CONFIGURACOES = 'configuracoes';

// Interface para rastrear notificações enviadas
interface NotificacaoEnviada {
  id: string;
  tarefaId: string;
  timestamp: number;
}

/**
 * Abre a conexão com o IndexedDB
 */
function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Erro ao abrir o banco de dados:', event);
        reject(new Error('Falha ao abrir IndexedDB'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Criar store de tarefas se não existir
        if (!db.objectStoreNames.contains(STORE_TAREFAS)) {
          const tarefasStore = db.createObjectStore(STORE_TAREFAS, { keyPath: 'id' });
          tarefasStore.createIndex('data', 'data', { unique: false });
          tarefasStore.createIndex('concluida', 'concluida', { unique: false });
          tarefasStore.createIndex('notificar', 'notificar', { unique: false });
        }
        
        // Criar store de notificações se não existir
        if (!db.objectStoreNames.contains(STORE_NOTIFICACOES)) {
          const notificacoesStore = db.createObjectStore(STORE_NOTIFICACOES, { keyPath: 'id' });
          notificacoesStore.createIndex('tarefaId', 'tarefaId', { unique: false });
          notificacoesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Criar store de configurações se não existir
        if (!db.objectStoreNames.contains(STORE_CONFIGURACOES)) {
          db.createObjectStore(STORE_CONFIGURACOES, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
    } catch (error) {
      console.error('Erro ao inicializar IndexedDB:', error);
      reject(error);
    }
  });
}

/**
 * Salva tarefas no IndexedDB para acesso pelo service worker
 * @param tarefas Lista de tarefas para salvar
 */
export async function salvarTarefasNoCache(tarefas: Tarefa[]): Promise<void> {
  try {
    const db = await abrirDB();
    const transaction = db.transaction([STORE_TAREFAS], 'readwrite');
    const store = transaction.objectStore(STORE_TAREFAS);
    
    // Limpar store antes de adicionar
    store.clear();
    
    // Adicionar cada tarefa
    tarefas.forEach(tarefa => {
      try {
        // Remover campos que podem causar problemas de serialização
        const tarefaSimplificada = {
          ...tarefa,
          // Converter Date para string se for uma instância de Date
          dataCriacao: tarefa.dataCriacao instanceof Date 
            ? tarefa.dataCriacao.toISOString() 
            : tarefa.dataCriacao
        };
        
        store.put(tarefaSimplificada);
      } catch (err) {
        console.error('Erro ao salvar tarefa específica:', err, tarefa.id);
      }
    });
    
    transaction.oncomplete = () => {
      console.log(`[Storage] ${tarefas.length} tarefas salvas no IndexedDB`);
      db.close();
    };
    
    transaction.onerror = (event) => {
      console.error('Erro na transação de salvar tarefas:', event);
      db.close();
    };
  } catch (error) {
    console.error('Erro ao salvar tarefas no IndexedDB:', error);
    
    // Fallback para localStorage
    try {
      localStorage.setItem('tarefas', JSON.stringify(tarefas.map(t => ({
        ...t, 
        dataCriacao: t.dataCriacao instanceof Date ? t.dataCriacao.toISOString() : t.dataCriacao
      }))));
    } catch (lsError) {
      console.error('Erro ao salvar tarefas no localStorage:', lsError);
    }
  }
}

/**
 * Salva configurações de notificação no IndexedDB para acesso pelo service worker
 * @param config Configurações de notificação
 */
export async function salvarConfiguracoesCache(config: ConfiguracoesNotificacao): Promise<void> {
  // Primeiro salvar no localStorage para garantir, especialmente para iOS
  try {
    localStorage.setItem('configuracoesNotificacao', JSON.stringify(config));
    console.log('[Storage] Configurações salvas no localStorage:', config);
  } catch (lsError) {
    console.error('Erro ao salvar configurações no localStorage:', lsError);
  }
  
  // Depois salvar no IndexedDB para o service worker
  try {
    const db = await abrirDB().catch(err => {
      throw new Error(`Falha ao abrir IndexedDB: ${err.message}`);
    });
    
    const transaction = db.transaction([STORE_CONFIGURACOES], 'readwrite');
    const store = transaction.objectStore(STORE_CONFIGURACOES);
    
    // Salvar com ID fixo para facilitar recuperação
    const configData = {
      id: 'notificacoes',
      ...config,
      timestamp: Date.now() // Adicionar timestamp para verificação de alterações
    };
    
    const request = store.put(configData);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[Storage] Configurações de notificação salvas no IndexedDB:', configData);
        
        // Adicionar tentativa de sincronização com o Service Worker se disponível
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_CONFIG',
            config: configData
          });
          console.log('[Storage] Enviada atualização de configuração para o Service Worker');
        }
        
        db.close();
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Erro na transação de salvar configurações:', event);
        db.close();
        reject(new Error('Falha ao salvar configurações no IndexedDB'));
      };
      
      // Adicionar handler para erros de transação
      transaction.onerror = (event) => {
        console.error('Erro na transação de configurações:', event);
        reject(new Error('Erro na transação do IndexedDB'));
      };
      
      transaction.onabort = (event) => {
        console.error('Transação abortada:', event);
        reject(new Error('Transação abortada'));
      };
    });
  } catch (error) {
    console.error('Erro ao salvar configurações no IndexedDB:', error);
    
    // Já salvamos no localStorage acima, então não precisamos fazer novamente aqui
  }
}

/**
 * Registra uma notificação enviada para evitar duplicações
 * @param tarefaId ID da tarefa notificada
 */
export async function registrarNotificacaoEnviada(tarefaId: string): Promise<void> {
  try {
    const db = await abrirDB();
    const transaction = db.transaction([STORE_NOTIFICACOES], 'readwrite');
    const store = transaction.objectStore(STORE_NOTIFICACOES);
    
    const notificacao: NotificacaoEnviada = {
      id: `${tarefaId}_${Date.now()}`,
      tarefaId,
      timestamp: Date.now()
    };
    
    store.put(notificacao);
    
    transaction.oncomplete = () => {
      console.log(`[Storage] Notificação registrada para tarefa ${tarefaId}`);
      db.close();
    };
    
    transaction.onerror = (event) => {
      console.error('Erro na transação de registrar notificação:', event);
      db.close();
    };
  } catch (error) {
    console.error('Erro ao registrar notificação no IndexedDB:', error);
    
    // Fallback para localStorage
    try {
      const ultimasNotificadas = JSON.parse(localStorage.getItem('notificacaoUltimasNotificadas') || '{}');
      ultimasNotificadas[tarefaId] = Date.now();
      localStorage.setItem('notificacaoUltimasNotificadas', JSON.stringify(ultimasNotificadas));
    } catch (lsError) {
      console.error('Erro ao registrar notificação no localStorage:', lsError);
    }
  }
}

/**
 * Verifica se uma tarefa já foi notificada recentemente
 * @param tarefaId ID da tarefa
 * @param janelaTempo Tempo em milissegundos para considerar recente
 */
export async function verificarNotificacaoRecente(tarefaId: string, janelaTempo: number = 3600000): Promise<boolean> {
  try {
    const db = await abrirDB();
    const transaction = db.transaction([STORE_NOTIFICACOES], 'readonly');
    const store = transaction.objectStore(STORE_NOTIFICACOES);
    const index = store.index('tarefaId');
    
    return new Promise((resolve) => {
      const agora = Date.now();
      const limiteInferior = agora - janelaTempo;
      
      const request = index.openCursor(IDBKeyRange.only(tarefaId));
      let notificacaoRecente = false;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const notificacao = cursor.value;
          if (notificacao.timestamp > limiteInferior) {
            notificacaoRecente = true;
            resolve(true);
            return;
          }
          cursor.continue();
        } else {
          // Nenhuma notificação encontrada ou todas são antigas
          resolve(false);
        }
      };
      
      request.onerror = () => {
        console.error('Erro ao verificar notificações recentes');
        resolve(false);
      };
      
      transaction.oncomplete = () => {
        if (!notificacaoRecente) {
          resolve(false);
        }
        db.close();
      };
    });
  } catch (error) {
    console.error('Erro ao verificar notificação recente no IndexedDB:', error);
    
    // Fallback para localStorage
    try {
      const ultimasNotificadas = JSON.parse(localStorage.getItem('notificacaoUltimasNotificadas') || '{}');
      const ultimaNotificacao = ultimasNotificadas[tarefaId] || 0;
      return Date.now() - ultimaNotificacao < janelaTempo;
    } catch (lsError) {
      console.error('Erro ao verificar notificação recente no localStorage:', lsError);
      return false;
    }
  }
}

/**
 * Limpa notificações antigas do IndexedDB
 * @param tempoRetencao Tempo em milissegundos para manter notificações
 */
export async function limparNotificacoesAntigas(tempoRetencao: number = 86400000): Promise<void> {
  try {
    const db = await abrirDB();
    const transaction = db.transaction([STORE_NOTIFICACOES], 'readwrite');
    const store = transaction.objectStore(STORE_NOTIFICACOES);
    const index = store.index('timestamp');
    
    const agora = Date.now();
    const limiteInferior = agora - tempoRetencao;
    
    const range = IDBKeyRange.upperBound(limiteInferior);
    const request = index.openCursor(range);
    
    let count = 0;
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor) {
        cursor.delete();
        count++;
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => {
      console.log(`[Storage] ${count} notificações antigas removidas`);
      db.close();
    };
    
    transaction.onerror = (event) => {
      console.error('Erro na transação de limpar notificações:', event);
      db.close();
    };
  } catch (error) {
    console.error('Erro ao limpar notificações antigas:', error);
  }
} 