
// Utilitário para limpar completamente o estado de autenticação
export const cleanupAuthState = () => {
  // Remover tokens de autenticação padrão
  localStorage.removeItem('supabase.auth.token');
  
  // Remover todas as chaves do Supabase no localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remover do sessionStorage também
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Preservar credenciais "lembrar-me"
  // Não removemos as chaves rememberedEmail, rememberedPassword e rememberMe
};

// Função para autenticar automaticamente com credenciais salvas
export const tryAutoLogin = async (supabase: any) => {
  try {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    const rememberedPassword = localStorage.getItem("rememberedPassword");
    const rememberMe = localStorage.getItem("rememberMe") === "true";
    
    if (rememberMe && rememberedEmail && rememberedPassword) {
      return await supabase.auth.signInWithPassword({ 
        email: rememberedEmail, 
        password: rememberedPassword 
      });
    }
    return { error: 'No stored credentials' };
  } catch (error) {
    console.error("Auto login error:", error);
    return { error };
  }
};
