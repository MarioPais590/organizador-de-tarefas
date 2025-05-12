import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Tenta fazer login com email e senha
 * @param email Email do usuário
 * @param senha Senha do usuário
 * @returns Objeto contendo resultado da operação e dados da sessão (se sucesso)
 */
export const login = async (email: string, senha: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    
    if (error) throw error;
    
    // Garantir que a sessão esteja persistida
    if (data.session) {
      // O supabase já se encarrega de armazenar a sessão,
      // mas podemos verificar se foi salva corretamente
      const authData = localStorage.getItem('supabase_auth_token');
      if (!authData) {
        console.warn("Aviso: Dados de autenticação não foram persistidos automaticamente");
        // Forçar salvamento manual da sessão
        localStorage.setItem('supabase_auth_token', JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }));
      }
    }
    
    toast.success("Login realizado com sucesso!");
    return { sucesso: true, session: data.session, user: data.user };
  } catch (error: any) {
    console.error("Erro ao fazer login:", error);
    
    let mensagemErro = "Erro ao fazer login";
    
    if (error.message.includes("Invalid login")) {
      mensagemErro = "Email ou senha incorretos";
    } else if (error.message.includes("rate limit")) {
      mensagemErro = "Muitas tentativas de login. Tente novamente mais tarde";
    }
    
    toast.error(mensagemErro);
    return { sucesso: false, error };
  }
};

/**
 * Tenta fazer registro com email e senha
 * @param email Email do usuário
 * @param senha Senha do usuário
 * @param nome Nome do usuário para o perfil
 * @returns Objeto contendo resultado da operação e dados da sessão (se sucesso)
 */
export const registro = async (email: string, senha: string, nome: string) => {
  try {
    // Criar usuário
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: nome
        }
      }
    });
    
    if (error) throw error;
    
    if (data?.user) {
      // Criar perfil do usuário após registro
      await supabase.from('profiles').insert({
        id: data.user.id,
        nome: nome,
        nome_app: 'Organizador de Tarefas',
        subtitulo: 'Organize seu tempo e aumente sua produtividade',
        cor_titulo: '#3a86ff',
        cor_subtitulo: '#64748b'
      });
      
      // Inserir categorias padrão para o usuário
      await supabase.from('categorias').insert([
        { nome: 'Trabalho', cor: '#3b82f6', user_id: data.user.id },
        { nome: 'Pessoal', cor: '#8b5cf6', user_id: data.user.id },
        { nome: 'Estudos', cor: '#ef4444', user_id: data.user.id },
        { nome: 'Saúde', cor: '#22c55e', user_id: data.user.id },
        { nome: 'Financeiro', cor: '#f59e0b', user_id: data.user.id }
      ]);
      
      // Configurações padrão de notificações
      await supabase.from('config_notificacoes').insert({
        user_id: data.user.id,
        ativadas: true,
        com_som: false,
        antecedencia_valor: 30,
        antecedencia_unidade: 'minutos'
      });
    }
    
    toast.success("Registro realizado com sucesso!");
    return { sucesso: true, session: data.session, user: data.user };
  } catch (error: any) {
    console.error("Erro ao fazer registro:", error);
    
    let mensagemErro = "Erro ao fazer registro";
    
    if (error.message.includes("already registered")) {
      mensagemErro = "Este email já está registrado";
    } else if (error.message.includes("password")) {
      mensagemErro = "A senha deve ter pelo menos 6 caracteres";
    }
    
    toast.error(mensagemErro);
    return { sucesso: false, error };
  }
};

/**
 * Tenta fazer logout do usuário atual
 * @returns true em caso de sucesso, false em caso de erro
 */
export const logout = async (): Promise<boolean> => {
  try {
    // Remover sessão do Supabase e do navegador
    const { error } = await supabase.auth.signOut({
      scope: 'local' // Garante que fazemos logout apenas localmente
    });
    
    if (error) throw error;
    
    // Limpar quaisquer dados locais da sessão
    localStorage.removeItem('supabase_auth_token');
    
    // Limpar possíveis valores salvos adicionais
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('supabase.auth.') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    }
    
    toast.success("Logout realizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    toast.error("Erro ao desconectar");
    return false;
  }
};

/**
 * Tenta fazer login automático com credenciais salvas
 * @returns Objeto com resultado da operação
 */
export const tryAutoLogin = async () => {
  try {
    console.log("Tentando auto login...");
    
    // Primeiro tentar obter a sessão atual
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Erro ao obter sessão:", sessionError);
      throw sessionError;
    }
    
    if (sessionData.session) {
      console.log("Sessão existente encontrada");
      return { sucesso: true, session: sessionData.session, error: null };
    }
    
    // Se não há sessão, verificar se temos um token no localStorage
    const tokenData = localStorage.getItem('supabase_auth_token');
    if (tokenData) {
      try {
        console.log("Token encontrado no localStorage, tentando restaurar sessão");
        const parsedToken = JSON.parse(tokenData);
        
        // Tentar restaurar a sessão com o token salvo
        if (parsedToken.refresh_token) {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: parsedToken.refresh_token
          });
          
          if (error) {
            console.error("Erro ao restaurar sessão:", error);
            // Se falhar, limpar o token inválido
            localStorage.removeItem('supabase_auth_token');
            throw error;
          }
          
          if (data.session) {
            console.log("Sessão restaurada com sucesso");
            return { sucesso: true, session: data.session, error: null };
          }
        }
      } catch (err) {
        console.error("Erro ao processar token do localStorage:", err);
        // Limpar token inválido
        localStorage.removeItem('supabase_auth_token');
      }
    }
    
    console.log("Sem sessão válida disponível");
    return { sucesso: false, session: null, error: null };
  } catch (error) {
    console.error("Erro ao tentar auto login:", error);
    return { sucesso: false, session: null, error };
  }
};

/**
 * Verifica se o usuário está autenticado atualmente
 * @returns Promessa que resolve para o usuário atual ou null
 */
export const verificarAutenticacao = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
    return null;
  }
};

/**
 * Limpa o estado de autenticação removendo todos os dados
 * relacionados à autenticação do localStorage
 */
export const cleanupAuthState = () => {
  // Remover token principal
  localStorage.removeItem('supabase_auth_token');
  
  // Remover qualquer outra chave relacionada ao supabase ou autenticação
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('supabase.auth.') || 
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('token')) {
      localStorage.removeItem(key);
    }
  }
  
  // Para depuração
  console.log("Estado de autenticação limpo");
}; 