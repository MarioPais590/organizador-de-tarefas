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
    console.log("Tentando login para:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    
    if (error) throw error;
    
    // Garantir que a sessão esteja persistida em vários locais para maior compatibilidade
    if (data.session) {
      console.log("Login bem-sucedido, salvando sessão...");
      
      try {
        // Criar objeto de token para reutilização
        const tokenObj = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        };
        const tokenStr = JSON.stringify(tokenObj);
        
        // Salvar em localStorage para desktop
        try {
          localStorage.setItem('supabase_auth_token', tokenStr);
          console.log("Token salvo em localStorage");
        } catch (lsError) {
          console.warn("Erro ao salvar em localStorage:", lsError);
        }
        
        // Salvar também na sessionStorage para algumas implementações mobile
        try {
          sessionStorage.setItem('supabase_auth_token', tokenStr);
          console.log("Token salvo em sessionStorage");
        } catch (ssError) {
          console.warn("Erro ao salvar em sessionStorage:", ssError);
        }
        
        // Força configuração do Cookie para maior compatibilidade
        // Usar 30 dias de expiração e SameSite=Lax para compatibilidade mobile
        try {
          document.cookie = `supabase_auth_token=${encodeURIComponent(tokenStr)}; path=/; max-age=2592000; SameSite=Lax`;
          console.log("Token salvo em cookie");
        } catch (cookieError) {
          console.warn("Erro ao salvar em cookie:", cookieError);
        }
        
        // Verificar se tokens foram salvos corretamente
        let savedLocalStorage = false;
        let savedSessionStorage = false;
        let savedCookie = false;
        
        try {
          savedLocalStorage = !!localStorage.getItem('supabase_auth_token');
          savedSessionStorage = !!sessionStorage.getItem('supabase_auth_token');
          savedCookie = document.cookie.includes('supabase_auth_token=');
        } catch (checkError) {
          console.warn("Erro ao verificar storages:", checkError);
        }
        
        console.log("Sessão salva em localStorage:", savedLocalStorage);
        console.log("Sessão salva em sessionStorage:", savedSessionStorage);
        console.log("Sessão salva em cookie:", savedCookie);
        
        if (!savedLocalStorage && !savedSessionStorage && !savedCookie) {
          console.warn("ALERTA: Nenhum dos métodos de armazenamento funcionou!");
        }
        
      } catch (storageError) {
        console.warn("Erro ao salvar sessão em storages:", storageError);
        // Continuar mesmo se o storage falhar
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
    sessionStorage.removeItem('supabase_auth_token');
    
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
      
      // Mesmo com sessão encontrada, vamos reforçar o salvamento em todos os storages
      try {
        localStorage.setItem('supabase_auth_token', JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token
        }));
        
        sessionStorage.setItem('supabase_auth_token', JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token
        }));
        
        document.cookie = `supabase_auth_token=${encodeURIComponent(JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token
        }))}; path=/; max-age=2592000; SameSite=Lax`; // 30 dias
      } catch (storageError) {
        console.warn("Erro ao reforçar tokens nos storages:", storageError);
      }
      
      return { sucesso: true, session: sessionData.session, error: null };
    }
    
    console.log("Sessão não encontrada, verificando storages...");
    
    // Verificar todas as possíveis fontes de token
    let parsedToken = null;
    
    // Tentar obter token de todas as fontes possíveis e usar o primeiro válido encontrado
    const fontes = ['localStorage', 'sessionStorage', 'cookies', 'indexedDB'];
    
    // 1. Verificar localStorage
    try {
      const tokenData = localStorage.getItem('supabase_auth_token');
      if (tokenData) {
        console.log("Token encontrado no localStorage");
        try {
          parsedToken = JSON.parse(tokenData);
          if (parsedToken && parsedToken.refresh_token) {
            console.log("Token do localStorage parece válido");
          } else {
            console.log("Token do localStorage parece inválido");
            parsedToken = null;
          }
        } catch (e) {
          console.warn("Erro ao processar token do localStorage:", e);
        }
      }
    } catch (e) {
      console.warn("Erro ao acessar localStorage:", e);
    }
    
    // 2. Se não encontrou no localStorage, verificar sessionStorage
    if (!parsedToken) {
      try {
        const tokenData = sessionStorage.getItem('supabase_auth_token');
        if (tokenData) {
          console.log("Token encontrado no sessionStorage");
          try {
            parsedToken = JSON.parse(tokenData);
            if (parsedToken && parsedToken.refresh_token) {
              console.log("Token do sessionStorage parece válido");
            } else {
              console.log("Token do sessionStorage parece inválido");
              parsedToken = null;
            }
          } catch (e) {
            console.warn("Erro ao processar token do sessionStorage:", e);
          }
        }
      } catch (e) {
        console.warn("Erro ao acessar sessionStorage:", e);
      }
    }
    
    // 3. Se ainda não encontrou, tentar cookies
    if (!parsedToken) {
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const trimmedCookie = cookie.trim();
          if (trimmedCookie.startsWith('supabase_auth_token=')) {
            console.log("Token encontrado nos cookies");
            try {
              const tokenValue = trimmedCookie.substring('supabase_auth_token='.length);
              if (tokenValue) {
                parsedToken = JSON.parse(decodeURIComponent(tokenValue));
                if (parsedToken && parsedToken.refresh_token) {
                  console.log("Token do cookie parece válido");
                  break;
                } else {
                  console.log("Token do cookie parece inválido");
                  parsedToken = null;
                }
              }
            } catch (e) {
              console.warn("Erro ao processar token do cookie:", e);
            }
          }
        }
      } catch (e) {
        console.warn("Erro ao acessar cookies:", e);
      }
    }
    
    // 4. Verificar se há token persistido pelo próprio Supabase
    if (!parsedToken) {
      try {
        // Tentar obter diretamente via Supabase
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log("Token encontrado na sessão nativa do Supabase");
          parsedToken = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          };
        }
      } catch (e) {
        console.warn("Erro ao verificar sessão nativa do Supabase:", e);
      }
    }
    
    // Se encontrou token em algum lugar, tentar restaurar sessão
    if (parsedToken && parsedToken.refresh_token) {
      console.log("Tentando restaurar sessão com token encontrado");
      
      try {
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: parsedToken.refresh_token
        });
        
        if (error) {
          console.error("Erro ao restaurar sessão:", error);
          // Limpar tokens inválidos de todos os storages
          cleanupAuthState();
          throw error;
        }
        
        if (data.session) {
          console.log("Sessão restaurada com sucesso");
          
          // Re-salvar o token atualizado em todos os storages
          try {
            const tokenObj = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            };
            const tokenStr = JSON.stringify(tokenObj);
            
            localStorage.setItem('supabase_auth_token', tokenStr);
            sessionStorage.setItem('supabase_auth_token', tokenStr);
            
            // Configurar cookie para longa duração e compatibilidade mobile
            document.cookie = `supabase_auth_token=${encodeURIComponent(tokenStr)}; path=/; max-age=2592000; SameSite=Lax`; // 30 dias
            
            // Verificar se foi salvo corretamente
            const lsCheck = localStorage.getItem('supabase_auth_token');
            const ssCheck = sessionStorage.getItem('supabase_auth_token');
            
            console.log("Token salvo em localStorage:", !!lsCheck);
            console.log("Token salvo em sessionStorage:", !!ssCheck);
          } catch (e) {
            console.warn("Erro ao atualizar token nos storages:", e);
          }
          
          return { sucesso: true, session: data.session, error: null };
        }
      } catch (err) {
        console.error("Erro ao processar token encontrado:", err);
        cleanupAuthState();
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
  // Remover token principal do localStorage
  localStorage.removeItem('supabase_auth_token');
  
  // Remover token principal da sessionStorage
  try {
    sessionStorage.removeItem('supabase_auth_token');
  } catch (e) {
    console.warn("Erro ao limpar sessionStorage:", e);
  }
  
  // Remover cookies de autenticação
  try {
    document.cookie = 'supabase_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  } catch (e) {
    console.warn("Erro ao limpar cookies:", e);
  }
  
  // Remover qualquer outra chave relacionada ao supabase ou autenticação
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('supabase.auth.') || 
          key.includes('supabase') || 
          key.includes('auth') ||
          key.includes('token')) {
        localStorage.removeItem(key);
      }
    }
    
    // Fazer o mesmo para sessionStorage
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('supabase.auth.') || 
          key.includes('supabase') || 
          key.includes('auth') ||
          key.includes('token')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn("Erro ao limpar storages adicionais:", e);
  }
  
  // Para depuração
  console.log("Estado de autenticação limpo completamente");
}; 