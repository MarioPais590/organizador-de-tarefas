import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

// Verificar se estamos em um ambiente de navegador
const isBrowser = typeof window !== 'undefined';

// Verificar se o localStorage está disponível
const isLocalStorageAvailable = () => {
  if (!isBrowser) return false;
  
  try {
    const testKey = '__auth_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('localStorage não está disponível:', e);
    return false;
  }
};

// Interface atualizada para refletir a tabela 'profiles' do Supabase
interface UserProfile {
  id: string;
  nome: string;
  avatar?: string | null;
  logo?: string | null;
  nome_app?: string | null;
  subtitulo?: string | null;
  cor_titulo?: string | null;
  cor_subtitulo?: string | null;
}

interface AuthContextProps {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, senha: string, nome: string) => Promise<boolean>;
  updateProfile: (data: Partial<Omit<UserProfile, 'id'>>) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (senha: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Função para buscar perfil de usuário
  const buscarPerfil = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return null;
      }
      
      if (!data) return null;
      
      return {
        id: data.id,
        nome: data.nome,
        avatar: data.avatar,
        logo: data.logo,
        nome_app: data.nome_app,
        subtitulo: data.subtitulo,
        cor_titulo: data.cor_titulo,
        cor_subtitulo: data.cor_subtitulo
      };
    } catch (error) {
      console.error("Erro ao processar perfil:", error);
      return null;
    }
  };

  // Função para inicializar sessão
  const inicializarSessao = async () => {
    try {
      setIsLoading(true);
      
      // Recuperar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        return;
      }
      
      // Verificar se o perfil existe
      const perfil = await buscarPerfil(session.user.id);
      
      if (perfil) {
        setUser(perfil);
      } else {
        // Se não existir perfil, criar um
        const { error: perfilError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            nome: session.user.user_metadata?.nome || 'Usuário'
          });
        
        if (perfilError) {
          console.error("Erro ao criar perfil:", perfilError);
          setUser(null);
          return;
        }
        
        // Buscar novamente após criar
        const novoPerfil = await buscarPerfil(session.user.id);
        setUser(novoPerfil);
      }
    } catch (error) {
      console.error("Erro ao inicializar sessão:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });
      
      if (error) {
        console.error("Erro ao fazer login:", error);
        
        // Mensagens mais amigáveis de acordo com o erro
        if (error.message.includes('Invalid login')) {
          toast.error("Email ou senha incorretos");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("Seu email ainda não foi confirmado. Verifique sua caixa de entrada");
        } else {
          toast.error(error.message);
        }
        
        return false;
      }
      
      // Verificar se o login foi bem-sucedido e há um usuário
      if (!data.user) {
        toast.error("Erro ao recuperar dados do usuário");
        return false;
      }
      
      // Buscar o perfil do usuário
      const perfil = await buscarPerfil(data.user.id);
      
      if (perfil) {
        setUser(perfil);
        return true;
      } else {
        // Criar um perfil se não existir
        const { error: perfilError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            nome: data.user.user_metadata?.nome || 'Usuário'
          });
        
        if (perfilError) {
          console.error("Erro ao criar perfil:", perfilError);
          toast.error("Erro ao criar perfil de usuário");
          return false;
        }
        
        // Buscar o perfil recém-criado
        const novoPerfil = await buscarPerfil(data.user.id);
        setUser(novoPerfil);
        return true;
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      toast.error("Erro ao processar login");
      return false;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  // Registro
  const register = async (email: string, senha: string, nome: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome
          }
        }
      });
      
      if (error) {
        console.error("Erro ao registrar:", error);
        
        // Mensagens mais amigáveis de acordo com o erro
        if (error.message.includes('already registered')) {
          toast.error("Este email já está registrado");
        } else if (error.message.includes('valid email')) {
          toast.error("Forneça um email válido");
        } else if (error.message.includes('Password')) {
          toast.error("A senha deve ter pelo menos 6 caracteres");
        } else {
          toast.error(error.message);
        }
        
        return false;
      }
      
      // Em alguns provedores, o usuário já está autenticado após o registro
      // Em outros, é necessário confirmação por email
      if (data.user) {
        // Criar perfil para o novo usuário
        const { error: perfilError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            nome
          });
        
        if (perfilError) {
          console.error("Erro ao criar perfil:", perfilError);
          toast.error("Erro ao criar perfil de usuário");
          return false;
        }
        
        // Se o registro for com confirmação por email
        if (!data.session) {
          toast.success("Registro realizado com sucesso! Verifique seu email para confirmar sua conta.");
          return true;
        }
        
        // Se o usuário já está autenticado após o registro
        const perfil = await buscarPerfil(data.user.id);
        setUser(perfil);
        return true;
      } else {
        toast.error("Erro ao registrar usuário");
        return false;
      }
    } catch (error) {
      console.error("Erro ao registrar:", error);
      toast.error("Erro ao processar registro");
      return false;
    }
  };

  // Atualizar perfil
  const updateProfile = async (data: Partial<Omit<UserProfile, 'id'>>): Promise<boolean> => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar seu perfil");
        return false;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
      
      if (error) {
        console.error("Erro ao atualizar perfil:", error);
        toast.error("Erro ao atualizar perfil");
        return false;
      }
      
      // Atualizar o estado do usuário
      setUser({
        ...user,
        ...data
      });
      
      toast.success("Perfil atualizado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao processar atualização de perfil");
      return false;
    }
  };

  // Recuperação de senha
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        console.error("Erro ao enviar email de recuperação:", error);
        toast.error(error.message);
        return false;
      }
      
      toast.success("Email de recuperação enviado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao processar recuperação de senha:", error);
      toast.error("Erro ao enviar email de recuperação");
      return false;
    }
  };

  // Atualizar senha
  const updatePassword = async (senha: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: senha
      });
      
      if (error) {
        console.error("Erro ao atualizar senha:", error);
        toast.error(error.message);
        return false;
      }
      
      toast.success("Senha atualizada com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao processar atualização de senha:", error);
      toast.error("Erro ao atualizar senha");
      return false;
    }
  };

  // Configurar listener para mudanças de autenticação
  useEffect(() => {
    // Inicializar sessão
    inicializarSessao();
    
    // Configurar listener para mudanças de sessão
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Carregar o perfil do usuário
        const perfil = await buscarPerfil(session.user.id);
        setUser(perfil);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    
    // Limpar listener ao desmontar
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        updateProfile,
        resetPassword,
        updatePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}; 