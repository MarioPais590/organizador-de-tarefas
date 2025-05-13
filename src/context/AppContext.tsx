import { createContext, useState, useEffect, useContext } from 'react';
import { Tarefa, Categoria, DadosPerfil, Rotina, ConfiguracoesNotificacao } from '@/types';
import { AppContextType, CATEGORIAS_PADRAO } from './types';
import { createAppFunctions } from './appFunctions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

// Importando os serviços
import { verificarTarefasPendentes, iniciarServicoNotificacoes, pararServicoNotificacoes, solicitarPermissaoNotificacao } from '@/services/notificationService';
import { tryAutoLogin } from '@/services/authService';
import { buscarTarefas } from '@/services/taskService';
import { verificarMigracaoNotificar } from '@/utils/dbMigrations';

// Logger específico para AppContext
const appContextLogger = logger.createNamespace('AppContext');

// Criação do contexto com valor default undefined
const AppContext = createContext<AppContextType | undefined>(undefined);

// Hook para usar o contexto
function useApp(): AppContextType {
  appContextLogger.debug("useApp chamado");
  const context = useContext(AppContext);
  if (context === undefined) {
    appContextLogger.error("useApp chamado fora de um AppProvider");
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
}

// Provider Component
function AppProvider({ children }: { children: React.ReactNode }) {
  appContextLogger.info("AppProvider inicializando");
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [perfil, setPerfil] = useState<DadosPerfil>({ 
    nome: 'Usuário', 
    nomeApp: 'Organizador de Tarefas',
    subtitulo: 'Organize seu tempo e aumente sua produtividade',
    corTitulo: '#3a86ff',
    corSubtitulo: '#64748b'
  });
  
  const [configNotificacoes, setConfigNotificacoes] = useState<ConfiguracoesNotificacao>({
    ativadas: true,
    comSom: false,
    antecedencia: {
      valor: 30,
      unidade: 'minutos' as const
    }
  });

  // Função para tentativa de auto login
  const attemptAutoLogin = async () => {
    appContextLogger.info("Tentando auto login");
    try {
      const { error } = await tryAutoLogin();
      if (error) {
        appContextLogger.info("Auto login não realizado:", error);
      } else {
        appContextLogger.info("Auto login bem sucedido");
      }
    } catch (error) {
      appContextLogger.error("Erro no auto login:", error);
    }
  };

  // Efeito para configurar o listener de autenticação
  useEffect(() => {
    appContextLogger.info("Configurando listener de autenticação");

    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        appContextLogger.info("Evento de alteração de autenticação:", event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Verificar sessão existente e tentar auto login se necessário
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        attemptAutoLogin();
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      appContextLogger.info("Limpando subscription de autenticação");
      subscription.unsubscribe();
    };
  }, []);

  // Função auxiliar para carregar o perfil do usuário
  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      appContextLogger.info("Carregando perfil do usuário");
      const { data: perfilData, error: perfilError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (perfilError) {
        throw perfilError;
      }
      
      if (perfilData) {
        setPerfil({
          nome: perfilData.nome,
          nomeApp: perfilData.nome_app,
          avatar: perfilData.avatar,
          logo: perfilData.logo,
          subtitulo: perfilData.subtitulo,
          corTitulo: perfilData.cor_titulo,
          corSubtitulo: perfilData.cor_subtitulo
        });
        appContextLogger.info("Perfil do usuário carregado com sucesso");
      }
    } catch (error) {
      appContextLogger.error("Erro ao carregar perfil:", error);
      throw error;
    }
  };
  
  // Função auxiliar para carregar categorias do usuário
  const loadUserCategories = async () => {
    if (!user) return;
    
    try {
      appContextLogger.info("Carregando categorias do usuário");
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id);
      
      if (categoriasError) {
        throw categoriasError;
      }
      
      if (categoriasData && categoriasData.length > 0) {
        setCategorias(categoriasData.map(cat => ({
          id: cat.id,
          nome: cat.nome,
          cor: cat.cor
        })));
        appContextLogger.info(`${categoriasData.length} categorias carregadas`);
      } else {
        // Se não tem categorias, usar padrão
        setCategorias(CATEGORIAS_PADRAO);
        appContextLogger.info("Usando categorias padrão");
      }
    } catch (error) {
      appContextLogger.error("Erro ao carregar categorias:", error);
      throw error;
    }
  };
  
  // Função auxiliar para carregar tarefas do usuário
  const loadUserTasks = async () => {
    if (!user) return;
    
    try {
      appContextLogger.info("Carregando tarefas do usuário");
      const tarefasCarregadas = await buscarTarefas(user.id);
      setTarefas(tarefasCarregadas);
      appContextLogger.info(`${tarefasCarregadas.length} tarefas carregadas`);
    } catch (error) {
      appContextLogger.error("Erro ao carregar tarefas:", error);
      throw error;
    }
  };
  
  // Função auxiliar para carregar rotinas do usuário
  const loadUserRoutines = async () => {
    if (!user) return;
    
    try {
      appContextLogger.info("Carregando rotinas do usuário");
      const { data: rotinasData, error: rotinasError } = await supabase
        .from('rotinas')
        .select('*')
        .eq('user_id', user.id);
      
      if (rotinasError) {
        throw rotinasError;
      }
      
      if (rotinasData && rotinasData.length > 0) {
        const rotinasMapeadas: Rotina[] = rotinasData.map(rotina => {
          // Garantir que manipulamos os arrays JSON corretamente
          const dias = Array.isArray(rotina.dias) 
            ? rotina.dias.map(d => Number(d)) 
            : typeof rotina.dias === 'object' && rotina.dias !== null
              ? Object.values(rotina.dias).map(d => Number(d))
              : undefined;
              
          const diasDoMes = Array.isArray(rotina.dias_do_mes) 
            ? rotina.dias_do_mes.map(d => Number(d)) 
            : typeof rotina.dias_do_mes === 'object' && rotina.dias_do_mes !== null
              ? Object.values(rotina.dias_do_mes).map(d => Number(d))
              : undefined;
          
          return {
            id: rotina.id,
            titulo: rotina.titulo,
            descricao: rotina.descricao,
            tipo: rotina.tipo as 'diaria' | 'semanal' | 'mensal',
            dias: dias,
            diasDoMes: diasDoMes,
            horario: rotina.horario
          };
        });
        
        setRotinas(rotinasMapeadas);
        appContextLogger.info(`${rotinasMapeadas.length} rotinas carregadas`);
      }
    } catch (error) {
      appContextLogger.error("Erro ao carregar rotinas:", error);
      throw error;
    }
  };
  
  // Função auxiliar para carregar configurações de notificação
  const loadNotificationSettings = async () => {
    if (!user) return;
    
    try {
      appContextLogger.info("Carregando configurações de notificação");
      const { data: notificacoesData, error: notificacoesError } = await supabase
        .from('config_notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (notificacoesError && notificacoesError.code !== 'PGRST116') {
        // PGRST116 é o código para "não encontrado", podemos ignorar
        throw notificacoesError;
      }
      
      if (notificacoesData) {
        appContextLogger.info("Configurações de notificação encontradas");
        
        // Garantir valores válidos com fallbacks para os padrões
        const configCarregada = {
          ativadas: notificacoesData.ativadas !== null ? notificacoesData.ativadas : true,
          comSom: notificacoesData.com_som !== null ? notificacoesData.com_som : false,
          antecedencia: {
            valor: notificacoesData.antecedencia_valor !== null ? 
              parseInt(String(notificacoesData.antecedencia_valor), 10) : 30,
            unidade: notificacoesData.antecedencia_unidade !== null && 
              (notificacoesData.antecedencia_unidade === 'minutos' || notificacoesData.antecedencia_unidade === 'horas') ? 
              notificacoesData.antecedencia_unidade as 'minutos' | 'horas' : 'minutos'
          }
        };
        
        // Validar valor de antecedência
        if (isNaN(configCarregada.antecedencia.valor) || configCarregada.antecedencia.valor < 1) {
          appContextLogger.warn("Valor de antecedência inválido, corrigindo para 30");
          configCarregada.antecedencia.valor = 30;
        }
        
        setConfigNotificacoes(configCarregada);
      } else {
        await createDefaultNotificationSettings();
      }
    } catch (error) {
      appContextLogger.error("Erro ao carregar configurações de notificação:", error);
      throw error;
    }
  };
  
  // Função para criar configurações de notificação padrão
  const createDefaultNotificationSettings = async () => {
    if (!user) return;
    
    appContextLogger.info("Nenhuma configuração de notificação encontrada, criando padrão");
    const configPadrao = {
      ativadas: true,
      comSom: false,
      antecedencia: {
        valor: 30,
        unidade: 'minutos' as const
      }
    };
    
    try {
      // Tentar inserir configuração padrão
      const { data, error } = await supabase
        .from('config_notificacoes')
        .insert({
          user_id: user.id,
          ativadas: configPadrao.ativadas,
          com_som: configPadrao.comSom,
          antecedencia_valor: configPadrao.antecedencia.valor,
          antecedencia_unidade: configPadrao.antecedencia.unidade
        })
        .select();
        
      if (error) {
        appContextLogger.error("Erro ao criar configurações padrão:", error);
      } else {
        appContextLogger.info("Configurações padrão de notificação criadas");
      }
    } catch (erro) {
      appContextLogger.error("Erro ao criar configurações padrão:", erro);
    }
    
    // Independente do resultado da criação, definir o estado com os valores padrão
    setConfigNotificacoes(configPadrao);
  };
  
  // Função para resetar para valores padrão (quando deslogado)
  const resetToDefaults = () => {
    appContextLogger.info("Resetando estados para valores padrão");
    setTarefas([]);
    setCategorias(CATEGORIAS_PADRAO);
    setRotinas([]);
    setPerfil({ 
      nome: 'Usuário', 
      nomeApp: 'Organizador de Tarefas',
      subtitulo: 'Organize seu tempo e aumente sua produtividade',
      corTitulo: '#3a86ff',
      corSubtitulo: '#64748b'
    });
    setConfigNotificacoes({
      ativadas: true,
      comSom: false,
      antecedencia: {
        valor: 30,
        unidade: 'minutos'
      }
    });
  };
  
  // Função principal para carregar todos os dados do usuário
  const loadUserData = async () => {
    appContextLogger.info("loadUserData chamado", { userId: user?.id });
    
    if (!user) {
      appContextLogger.info("Usuário não autenticado, resetando para valores padrão");
      resetToDefaults();
      return;
    }

    try {
      // Verificar e aplicar migrações do banco de dados
      appContextLogger.info("Verificando migrações necessárias");
      await verificarMigracaoNotificar();
      
      // Carregar dados do usuário em paralelo para melhor desempenho
      await Promise.all([
        loadUserProfile(),
        loadUserCategories(),
        loadUserTasks(),
        loadUserRoutines(),
        loadNotificationSettings()
      ]);

      appContextLogger.info("Dados do usuário carregados com sucesso");
    } catch (error) {
      appContextLogger.error("Erro ao carregar dados do usuário:", error);
      toast.error("Erro ao carregar dados. Tente novamente mais tarde.");
    }
  };

  // Efeito para carregar dados do usuário quando autenticado
  useEffect(() => {
    appContextLogger.info("Efeito loadUserData iniciado", { userId: user?.id });
    loadUserData();
  }, [user]);
  
  // Função para verificar tarefas pendentes
  const verificarPendentes = () => {
    appContextLogger.debug("Verificando tarefas pendentes");
    verificarTarefasPendentes(tarefas, configNotificacoes);
  };
  
  // Configurar serviço de notificações
  const setupNotificationService = async () => {
    appContextLogger.info("Solicitando permissão para notificações");
    const permitido = await solicitarPermissaoNotificacao();
    if (permitido) {
      appContextLogger.info("Permissão concedida, iniciando serviço de notificações");
      iniciarServicoNotificacoes(verificarPendentes);
    } else {
      appContextLogger.warn("Permissão para notificações negada pelo usuário");
    }
  };
  
  // Iniciar o serviço de notificações quando o componente montar
  useEffect(() => {
    appContextLogger.info("Configurando serviço de notificações");
    
    if (user && configNotificacoes.ativadas && tarefas.length > 0) {
      // Solicitar permissão e iniciar serviço se permitido
      setupNotificationService();
    } else {
      appContextLogger.info("Serviço de notificações não iniciado", { 
        userLoggedIn: !!user, 
        notificationsEnabled: configNotificacoes.ativadas,
        taskCount: tarefas.length
      });
    }
    
    // Limpar ao desmontar
    return () => {
      appContextLogger.info("Desmontando AppContext, parando serviço de notificações");
      pararServicoNotificacoes();
    };
  }, [user, tarefas, configNotificacoes]);
  
  // Funções do App
  const appFunctions = createAppFunctions(
    tarefas,
    setTarefas,
    categorias,
    setCategorias,
    rotinas,
    setRotinas,
    perfil,
    setPerfil,
    configNotificacoes,
    setConfigNotificacoes,
    verificarPendentes,
    user
  );

  // Valor do contexto
  const contextValue: AppContextType = {
    user,
    isLoading: loading,
    tarefas,
    categorias,
    rotinas,
    perfil,
    configNotificacoes,
    verificarTarefasPendentes: verificarPendentes,
    ...appFunctions
  };

  // Criar e retornar o contexto
  appContextLogger.info("AppProvider renderizando com contexto");
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Exportar os componentes e hooks
export { AppProvider, useApp };
