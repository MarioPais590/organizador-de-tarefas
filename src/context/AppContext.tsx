import { createContext, useState, useEffect, useContext } from 'react';
import { Tarefa, Categoria, DadosPerfil, Rotina, ConfiguracoesNotificacao } from '@/types';
import { AppContextType, CATEGORIAS_PADRAO } from './types';
import { createAppFunctions } from './appFunctions';
import { verificarTarefasPendentes as checkTarefasPendentes, iniciarServicoNotificacoes, pararServicoNotificacoes, solicitarPermissaoNotificacao } from '@/utils/notificacoes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cleanupAuthState, tryAutoLogin } from '@/utils/authUtils';

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
      const { error } = await tryAutoLogin(supabase);
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
          
          // Carregar tarefas com categorias
          const { data: tarefasData, error: tarefasError } = await supabase
            .from('tarefas')
            .select(`
              *,
              categoria:categorias(*)
            `)
            .eq('user_id', user.id);
          
          if (tarefasError) throw tarefasError;
          
          if (tarefasData && tarefasData.length > 0) {
            // Buscar anexos para cada tarefa
            const tarefasComAnexos = await Promise.all(tarefasData.map(async (tarefa) => {
              const { data: anexosData } = await supabase
                .from('tarefa_anexos')
                .select(`
                  anexos(*)
                `)
                .eq('tarefa_id', tarefa.id);
              
              const anexos = anexosData ? anexosData.map(item => item.anexos) : [];
              
              return {
                id: tarefa.id,
                titulo: tarefa.titulo,
                descricao: tarefa.descricao || undefined,
                dataCriacao: new Date(tarefa.data_criacao),
                data: tarefa.data,
                hora: tarefa.hora || undefined,
                categoria: {
                  id: tarefa.categoria.id,
                  nome: tarefa.categoria.nome,
                  cor: tarefa.categoria.cor
                },
                prioridade: tarefa.prioridade as 'baixa' | 'media' | 'alta',
                concluida: tarefa.concluida,
                anexos: anexos,
                notificar: tarefa.notificar !== undefined ? 
                  (tarefa.notificar !== null ? tarefa.notificar : true) : 
                  true
              };
            }));
            
            setTarefas(tarefasComAnexos);
          }
          
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

  // Wrapper para verificarTarefasPendentes que usa o estado atual
  const verificarTarefasPendentes = () => {
    checkTarefasPendentes(tarefas, configNotificacoes);
  };

  // Criar funções da aplicação
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
    verificarTarefasPendentes,
    user
  );
  
  // Gestão de notificações e solicitação de permissão - único useEffect para gerenciar tudo
  useEffect(() => {
    // Variável de escopo de módulo para garantir que só solicitamos uma vez
    const solicitarPermissao = async () => {
      if (configNotificacoes.ativadas && user && Notification.permission !== "granted") {
        // Verificar permissão apenas uma vez e não mostrar toast
        await solicitarPermissaoNotificacao();
      }
    };
    
    // Verificar permissão apenas se o usuário estiver logado e as notificações ativadas
    if (configNotificacoes.ativadas && user) {
      // Se já temos permissão, apenas iniciar o serviço
      if (Notification.permission === "granted") {
        console.log("Permissão já concedida, iniciando serviço de notificações");
        iniciarServicoNotificacoes(verificarTarefasPendentes);
      } else {
        // Se ainda não temos permissão, solicitar uma única vez
        console.log("Solicitando permissão para notificações");
        solicitarPermissao().then(() => {
          // E iniciar o serviço se obtiver permissão
          if (Notification.permission === "granted") {
            console.log("Permissão concedida, iniciando serviço de notificações");
            iniciarServicoNotificacoes(verificarTarefasPendentes);
          } else {
            console.log("Permissão negada ou pendente, não iniciando serviço de notificações");
          }
        });
      }
    } else {
      console.log("Notificações desativadas ou usuário não logado, parando serviço");
      pararServicoNotificacoes();
    }
    
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      pararServicoNotificacoes();
    };
  }, [user, configNotificacoes.ativadas]);

  // Adicionar método de logout aprimorado ao contexto
  const logout = async (): Promise<boolean> => {
    try {
      // Limpar completamente o estado de autenticação
      cleanupAuthState();
      
      // Tentar fazer logout global no Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.error("Erro ao fazer logout no Supabase", err);
        // Prosseguimos mesmo com erro, já que limpamos localmente
      }

      // Redefinir estados após logout
      setUser(null);
      setSession(null);
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

      // Se chegamos até aqui, considere o logout bem-sucedido
      return true;
    } catch (error) {
      console.error("Erro ao realizar logout:", error);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        tarefas,
        categorias,
        rotinas,
        perfil,
        configNotificacoes,
        user,
        isLoading: loading,
        ...appFunctions,
        verificarTarefasPendentes,
        logout, // Usando nossa versão melhorada da função logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Export the useApp hook directly from this file
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
