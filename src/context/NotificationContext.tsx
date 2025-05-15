import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tarefa, ConfiguracoesNotificacao } from '@/types';
import { 
  verificarSuporteNotificacoes, 
  solicitarPermissaoNotificacao, 
  verificarTarefasPendentes, 
  iniciarServicoNotificacoes, 
  pararServicoNotificacoes,
  detectarDispositivoMovel
} from '@/services/notificationService';
import { 
  salvarTarefasNoCache, 
  salvarConfiguracoesCache,
  registrarNotificacaoEnviada,
  limparNotificacoesAntigas
} from '@/services/storageService';
import { solicitarSincronizacao } from '@/services/serviceWorkerRegistration';
import { toast } from 'sonner';

// Tipos de notificação
type NotificationPermission = 'granted' | 'denied' | 'default';

// Detalhes do dispositivo
interface DispositivoInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  navegador: string;
  suportaNotificacoes: boolean;
  isPwa: boolean;
}

interface NotificationContextProps {
  notificacoesAtivas: boolean;
  configuracoes: ConfiguracoesNotificacao;
  suporteNotificacoes: boolean;
  permissaoNotificacoes: NotificationPermission;
  verificarSuporte: () => boolean;
  solicitarPermissao: () => Promise<boolean>;
  atualizarConfiguracoes: (config: Partial<ConfiguracoesNotificacao>) => void;
  verificarTarefas: (tarefas: Tarefa[]) => void;
  iniciarServico: () => void;
  pararServico: () => void;
  dispositivo: DispositivoInfo;
  atualizarCacheTarefas: (tarefas: Tarefa[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Configurações padrão de notificação
const configuracoesNotificacaoPadrao: ConfiguracoesNotificacao = {
  ativadas: true,
  comSom: true,
  antecedencia: {
    valor: 30,
    unidade: 'minutos'
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificacoesAtivas, setNotificacoesAtivas] = useState<boolean>(false);
  const [permissaoNotificacoes, setPermissaoNotificacoes] = useState<NotificationPermission>('default');
  const [suporteNotificacoes, setSuporteNotificacoes] = useState<boolean>(false);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesNotificacao>(configuracoesNotificacaoPadrao);
  const [dispositivo, setDispositivo] = useState<DispositivoInfo>({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    navegador: 'desconhecido',
    suportaNotificacoes: false,
    isPwa: false
  });

  // Função para verificar suporte a notificações
  const verificarSuporte = (): boolean => {
    const suporte = verificarSuporteNotificacoes();
    setSuporteNotificacoes(suporte);
    return suporte;
  };

  // Função para solicitar permissão para notificações
  const solicitarPermissao = async (): Promise<boolean> => {
    if (!suporteNotificacoes) {
      return false;
    }
    
    const permissao = await solicitarPermissaoNotificacao();
    setNotificacoesAtivas(permissao);
    
    if (typeof Notification !== 'undefined') {
      setPermissaoNotificacoes(Notification.permission as NotificationPermission);
    }
    
    return permissao;
  };

  // Função para atualizar configurações de notificações
  const atualizarConfiguracoes = (config: Partial<ConfiguracoesNotificacao>): void => {
    setConfiguracoes(prev => {
      const novasConfiguracoes = { ...prev, ...config };
      
      console.log('Atualizando configurações de notificação:', novasConfiguracoes);
      
      // Salvar imediatamente no localStorage
      try {
        localStorage.setItem('configuracoesNotificacao', JSON.stringify(novasConfiguracoes));
        console.log('Configurações de notificação salvas no localStorage');
      } catch (e) {
        console.error('Erro ao salvar configurações no localStorage:', e);
      }
      
      // Salvar no cache para o service worker
      salvarConfiguracoesCache(novasConfiguracoes)
        .then(() => {
          console.log('Configurações de notificação salvas com sucesso no cache');
        })
        .catch(error => {
          console.error('Erro ao salvar configurações de notificação no cache:', error);
        });
      
      // Verificar se estamos no iOS para manipulação especial
      if (dispositivo.isIOS) {
        // No iOS, forçamos uma persistência adicional para garantir
        setTimeout(() => {
          try {
            // Verificar se as configurações foram realmente salvas
            const savedConfigStr = localStorage.getItem('configuracoesNotificacao');
            if (savedConfigStr) {
              const savedConfig = JSON.parse(savedConfigStr);
              
              // Comparar os valores para garantir que foram salvos corretamente
              if (savedConfig.ativadas !== novasConfiguracoes.ativadas || 
                  savedConfig.comSom !== novasConfiguracoes.comSom ||
                  savedConfig.antecedencia.valor !== novasConfiguracoes.antecedencia.valor ||
                  savedConfig.antecedencia.unidade !== novasConfiguracoes.antecedencia.unidade) {
                
                console.log('Discrepância detectada nas configurações salvas, tentando novamente');
                localStorage.setItem('configuracoesNotificacao', JSON.stringify(novasConfiguracoes));
                
                // Salvar novamente no cache também
                salvarConfiguracoesCache(novasConfiguracoes)
                  .catch(error => console.error('Erro na segunda tentativa:', error));
              }
            }
          } catch (error) {
            console.error('Erro na verificação de persistência de configurações:', error);
          }
        }, 300); // Pequeno atraso para garantir que a operação de armazenamento anterior seja concluída
      }
      
      return novasConfiguracoes;
    });
  };

  // Função para verificar tarefas pendentes
  const verificarTarefas = (tarefas: Tarefa[]): void => {
    if (!notificacoesAtivas || !suporteNotificacoes || permissaoNotificacoes !== 'granted') {
      return;
    }
    
    verificarTarefasPendentes(tarefas, configuracoes);
  };

  // Função para atualizar o cache de tarefas para o service worker
  const atualizarCacheTarefas = async (tarefas: Tarefa[]): Promise<void> => {
    try {
      // Salvar apenas se tiver permissão e suporte
      if (permissaoNotificacoes === 'granted' && suporteNotificacoes) {
        await salvarTarefasNoCache(tarefas);
        
        // Solicitar sincronização periódica se estiver disponível
        solicitarSincronizacao()
          .catch(error => console.error('Erro ao solicitar sincronização:', error));
        
        // Limpar notificações antigas periodicamente
        limparNotificacoesAntigas()
          .catch(error => console.error('Erro ao limpar notificações antigas:', error));
      }
    } catch (error) {
      console.error('Erro ao atualizar cache de tarefas:', error);
    }
  };

  // Função para iniciar o serviço de notificações
  const iniciarServico = (): void => {
    if (!suporteNotificacoes || permissaoNotificacoes !== 'granted') {
      return;
    }
    
    iniciarServicoNotificacoes(() => {
      // Esta será a função para verificar tarefas pendentes
      // Ela será chamada a cada X segundos pelo serviço
      console.log("Serviço de notificações procurando por tarefas pendentes...");
      // Nota: As tarefas serão verificadas quando o contexto for informado sobre elas
    });
    
    setNotificacoesAtivas(true);
  };

  // Função para parar o serviço de notificações
  const pararServico = (): void => {
    pararServicoNotificacoes();
    setNotificacoesAtivas(false);
  };

  // Detectar capacidades do dispositivo
  useEffect(() => {
    const detectarCapacidades = () => {
      try {
        const dispositivo = detectarDispositivoMovel();
        const suportaNotificacoes = verificarSuporte();
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                     window.matchMedia('(display-mode: fullscreen)').matches || 
                     (window.navigator as any).standalone === true;
        
        setDispositivo({
          ...dispositivo,
          suportaNotificacoes,
          isPwa
        });
        
        console.log("Informações do dispositivo detectadas:", {
          ...dispositivo,
          suportaNotificacoes,
          isPwa
        });
      } catch (e) {
        console.error("Erro ao detectar capacidades do dispositivo:", e);
      }
    };
    
    detectarCapacidades();
  }, []);

  // Efeito para inicializar verificação de suporte e permissão
  useEffect(() => {
    const suporte = verificarSuporte();
    
    if (suporte && typeof Notification !== 'undefined') {
      setPermissaoNotificacoes(Notification.permission as NotificationPermission);
      setNotificacoesAtivas(Notification.permission === 'granted');
    }
    
    // Carregar configurações do localStorage
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const configSalvas = localStorage.getItem('configuracoesNotificacao');
        if (configSalvas) {
          try {
            const configParsed = JSON.parse(configSalvas);
            console.log('Carregando configurações salvas:', configParsed);
            
            // Verificar se os dados são válidos
            if (configParsed && 
                typeof configParsed === 'object' && 
                typeof configParsed.ativadas === 'boolean' &&
                configParsed.antecedencia && 
                typeof configParsed.antecedencia.valor === 'number') {
              
              // Atualizar com os valores válidos
              setConfiguracoes(configParsed);
              
              // Também salvar no IndexedDB para o service worker
              if (configParsed && (Notification.permission === 'granted' || dispositivo.isIOS)) {
                salvarConfiguracoesCache(configParsed)
                  .catch(error => console.error('Erro ao salvar configurações no IndexedDB:', error));
              }
            } else {
              console.warn('Configurações salvas com formato inválido:', configParsed);
              // Se inválido, salvar as configurações padrão
              localStorage.setItem('configuracoesNotificacao', JSON.stringify(configuracoesNotificacaoPadrao));
            }
          } catch (parseError) {
            console.error('Erro ao processar configurações salvas:', parseError);
            // Restaurar para valores padrão em caso de erro
            localStorage.setItem('configuracoesNotificacao', JSON.stringify(configuracoesNotificacaoPadrao));
          }
        } else if (dispositivo.isIOS) {
          // No iOS, garantir que as configurações padrão sejam salvas se não existirem
          console.log('Configurações não encontradas, inicializando com padrão para iOS');
          localStorage.setItem('configuracoesNotificacao', JSON.stringify(configuracoesNotificacaoPadrao));
          salvarConfiguracoesCache(configuracoesNotificacaoPadrao)
            .catch(error => console.error('Erro ao salvar configurações iniciais:', error));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de notificação:", error);
      // Tentar restaurar para valores padrão em caso de erro
      try {
        localStorage.setItem('configuracoesNotificacao', JSON.stringify(configuracoesNotificacaoPadrao));
      } catch (e) {
        console.error('Falha ao restaurar configurações padrão:', e);
      }
    }
    
    // Se for um dispositivo móvel, mostrar informações úteis
    if (dispositivo.isMobile && suporte) {
      const mensagem = dispositivo.isIOS 
        ? "Para garantir notificações no iOS, adicione este app à tela inicial." 
        : "Para notificações mais confiáveis, adicione este app à tela inicial.";
      
      if (!dispositivo.isPwa) {
        setTimeout(() => {
          toast.info(mensagem, {
            duration: 7000,
            id: 'pwa-suggestion'
          });
        }, 5000);
      }
    }
    
    // Configurar ouvinte para mensagens do service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.tipo) {
          if (event.data.tipo === 'tarefas-verificadas') {
            console.log('Tarefas verificadas pelo Service Worker:', event.data.tarefas);
            
            // Aqui poderíamos atualizar o estado da interface, se necessário
            if (event.data.tarefas && event.data.tarefas.length > 0) {
              toast.info(`O service worker verificou ${event.data.tarefas.length} tarefas em segundo plano.`);
            }
          } else if (event.data.tipo === 'heartbeat') {
            // Mensagem de heartbeat do Service Worker
            console.log('Heartbeat recebido do Service Worker:', 
              new Date(event.data.timestamp).toLocaleTimeString(), 
              'Last check:', event.data.lastCheck ? new Date(parseInt(event.data.lastCheck)).toLocaleTimeString() : 'none'
            );
            
            // Atualizar um timestamp de último contato com o Service Worker
            try {
              localStorage.setItem('lastServiceWorkerContact', event.data.timestamp.toString());
            } catch (e) {
              console.error('Erro ao salvar timestamp de contato com Service Worker:', e);
            }
          }
        }
      });
      
      // Registrar uma verificação periódica para garantir que o Service Worker esteja ativo
      const checkServiceWorkerInterval = setInterval(() => {
        try {
          const lastContact = localStorage.getItem('lastServiceWorkerContact');
          if (lastContact) {
            const lastContactTime = parseInt(lastContact);
            const now = Date.now();
            const timeSinceLastContact = now - lastContactTime;
            
            // Se faz mais de 15 minutos desde o último contato com o Service Worker
            if (timeSinceLastContact > 15 * 60 * 1000) {
              console.warn('Sem contato com o Service Worker por mais de 15 minutos. Pode ser necessário reiniciá-lo.');
              
              // Tentar reregistrar o Service Worker
              navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                  // Forçar uma atualização do Service Worker
                  registration.update().then(() => {
                    console.log('Service Worker atualizado com sucesso');
                  }).catch(err => {
                    console.error('Erro ao atualizar Service Worker:', err);
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error('Erro ao verificar status do Service Worker:', e);
        }
      }, 5 * 60 * 1000); // Verificar a cada 5 minutos
      
      // Limpar intervalo quando o componente for desmontado
      return () => {
        clearInterval(checkServiceWorkerInterval);
      };
    }
  }, [dispositivo]);

  // Efeito para salvar configurações quando alteradas
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('configuracoesNotificacao', JSON.stringify(configuracoes));
        
        // Também salvar no IndexedDB para o service worker se tivermos permissão
        if (permissaoNotificacoes === 'granted' && suporteNotificacoes) {
          salvarConfiguracoesCache(configuracoes)
            .catch(error => console.error('Erro ao salvar configurações no IndexedDB:', error));
        }
      }
    } catch (error) {
      console.error("Erro ao salvar configurações de notificação:", error);
    }
  }, [configuracoes, permissaoNotificacoes, suporteNotificacoes]);

  return (
    <NotificationContext.Provider
      value={{
        notificacoesAtivas,
        configuracoes,
        suporteNotificacoes,
        permissaoNotificacoes,
        verificarSuporte,
        solicitarPermissao,
        atualizarConfiguracoes,
        verificarTarefas,
        iniciarServico,
        pararServico,
        dispositivo,
        atualizarCacheTarefas
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
}; 