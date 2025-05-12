import { createContext, useState, useEffect, useContext } from 'react';
import { Tarefa, Categoria, DadosPerfil, Rotina, ConfiguracoesNotificacao } from '@/types';
import { AppContextType, CATEGORIAS_PADRAO } from './types';
import { createAppFunctions } from './appFunctions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Importando os serviços
import { verificarTarefasPendentes, iniciarServicoNotificacoes, pararServicoNotificacoes, solicitarPermissaoNotificacao } from '@/services/notificationService';
import { tryAutoLogin } from '@/services/authService';
import { buscarTarefas } from '@/services/taskService';

// Criação do contexto
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
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

  // Verificar autenticação
  useEffect(() => {
    // Tentar auto login com credenciais salvas
    const attemptAutoLogin = async () => {
      const { error } = await tryAutoLogin();
      if (error) {
        console.log("Auto login não realizado:", error);
      } else {
        console.log("Auto login bem sucedido");
      }
    };

    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

    return () => subscription.unsubscribe();
  }, []);

  // Carregar dados do usuário quando autenticado
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          // Carregar perfil
          const { data: perfilData, error: perfilError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (perfilError) throw perfilError;
          
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
          }
          
          // Carregar categorias
          const { data: categoriasData, error: categoriasError } = await supabase
            .from('categorias')
            .select('*')
            .eq('user_id', user.id);
          
          if (categoriasError) throw categoriasError;
          
          if (categoriasData && categoriasData.length > 0) {
            setCategorias(categoriasData.map(cat => ({
              id: cat.id,
              nome: cat.nome,
              cor: cat.cor
            })));
          }
          
          // Carregar tarefas usando o serviço
          const tarefasCarregadas = await buscarTarefas(user.id);
          setTarefas(tarefasCarregadas);
          
          // Carregar rotinas
          const { data: rotinasData, error: rotinasError } = await supabase
            .from('rotinas')
            .select('*')
            .eq('user_id', user.id);
          
          if (rotinasError) throw rotinasError;
          
          if (rotinasData && rotinasData.length > 0) {
            const rotinasMapeadas: Rotina[] = rotinasData.map(rotina => {
              // Ensure we handle the JSON arrays correctly and convert them to number arrays
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
          }
          
          // Carregar configurações de notificações
          const { data: notificacoesData, error: notificacoesError } = await supabase
            .from('config_notificacoes')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (notificacoesError && notificacoesError.code !== 'PGRST116') {
            // PGRST116 é o código para "não encontrado", podemos ignorar
            throw notificacoesError;
          }
          
          if (notificacoesData) {
            setConfigNotificacoes({
              ativadas: notificacoesData.ativadas,
              comSom: notificacoesData.com_som,
              antecedencia: {
                valor: notificacoesData.antecedencia_valor,
                unidade: notificacoesData.antecedencia_unidade as 'minutos' | 'horas'
              }
            });
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
          toast.error("Erro ao carregar seus dados. Por favor, tente novamente.");
        }
      } else {
        // Reset para valores padrão quando deslogado
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
      }
    };
    
    loadUserData();
  }, [user]);
  
  // Função para verificar tarefas pendentes
  const verificarPendentes = () => {
    verificarTarefasPendentes(tarefas, configNotificacoes);
  };
  
  // Iniciar o serviço de notificações quando o componente montar
  useEffect(() => {
    if (user && configNotificacoes.ativadas && tarefas.length > 0) {
      // Solicitar permissão e iniciar serviço se permitido
      const solicitarPermissao = async () => {
        const permitido = await solicitarPermissaoNotificacao();
        if (permitido) {
          iniciarServicoNotificacoes(verificarPendentes);
        }
      };
      
      solicitarPermissao();
    }
    
    // Limpar ao desmontar
    return () => {
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

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
