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
    setConfiguracoes(prev => ({ ...prev, ...config }));
  };

  // Função para verificar tarefas pendentes
  const verificarTarefas = (tarefas: Tarefa[]): void => {
    if (!notificacoesAtivas || !suporteNotificacoes || permissaoNotificacoes !== 'granted') {
      return;
    }
    
    verificarTarefasPendentes(tarefas, configuracoes);
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
          const configParsed = JSON.parse(configSalvas);
          setConfiguracoes(configParsed);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de notificação:", error);
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
  }, [dispositivo]);

  // Efeito para salvar configurações quando alteradas
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('configuracoesNotificacao', JSON.stringify(configuracoes));
      }
    } catch (error) {
      console.error("Erro ao salvar configurações de notificação:", error);
    }
  }, [configuracoes]);

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
        dispositivo
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