
import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, LogIn, Mail, UserPlus, CheckSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [rememberMe, setRememberMe] = useState(false);
  const isMobile = useIsMobile();

  // Recuperar credenciais salvas
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const rememberedState = localStorage.getItem("rememberMe") === "true";
    
    if (savedEmail && savedPassword && rememberedState) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
      
      // Auto login opcional
      // handleSilentLogin(savedEmail, savedPassword);
    }
  }, []);
  
  // Função para tentativa de login silencioso
  const handleSilentLogin = async (savedEmail: string, savedPassword: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: savedEmail, 
        password: savedPassword 
      });
      
      if (!error) {
        // Login silencioso bem sucedido
        navigate("/dashboard");
      }
    } catch (error) {
      // Falha no login silencioso - não mostrar erro
      console.log("Falha no login automático, aguardando entrada do usuário");
    }
  };

  // Se o usuário já está logado, redireciona para o dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    try {
      setIsLoggingIn(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      // Salvar credenciais se "lembrar-me" estiver marcado
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
        localStorage.setItem("rememberMe", "true");
      } else {
        // Limpar credenciais salvas
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
        localStorage.removeItem("rememberMe");
      }
      
      toast.success("Login realizado com sucesso");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Erro no login:", error);
      
      if (error.message.includes("Invalid login credentials")) {
        toast.error("E-mail ou senha incorretos");
      } else {
        toast.error("Erro ao fazer login. Por favor, tente novamente.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nome) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    try {
      setIsSigningUp(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome
          }
        }
      });
      
      if (error) throw error;
      
      toast.success("Cadastro realizado com sucesso! Você já pode fazer login.");
      setActiveTab("login");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      
      if (error.message.includes("already registered")) {
        toast.error("Este e-mail já está cadastrado");
      } else {
        toast.error("Erro ao criar conta. Por favor, tente novamente.");
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-azulPrincipal mb-2">Organizador de Tarefas</h1>
        <p className="text-sm md:text-base text-muted-foreground">Organize seu tempo, aumente sua produtividade</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-xl md:text-2xl text-center">
            {activeTab === "login" ? "Entre na sua conta" : "Crie sua conta"}
          </CardTitle>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login" className="data-[state=active]:bg-azulPrincipal data-[state=active]:text-white">
              <LogIn className="mr-2 h-4 w-4" /> Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-azulPrincipal data-[state=active]:text-white">
              <UserPlus className="mr-2 h-4 w-4" /> Cadastro
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-0 top-0 h-full px-3" 
                      onClick={toggleShowPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => 
                      setRememberMe(checked === true)
                    }
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Lembrar-me
                  </label>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-azulPrincipal hover:bg-azulPrincipal/90"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Entrando...
                    </>
                  ) : (
                    <>Entrar</>
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input 
                    id="nome"
                    placeholder="Seu Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-signup">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email-signup"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password-signup"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-0 top-0 h-full px-3" 
                      onClick={toggleShowPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-azulPrincipal hover:bg-azulPrincipal/90"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Cadastrando...
                    </>
                  ) : (
                    <>Cadastrar</>
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
      
      <p className="mt-6 text-center text-xs md:text-sm text-muted-foreground px-4">
        Ao se cadastrar, você concorda com nossos{' '}
        <a href="#" className="text-azulPrincipal hover:underline">Termos de Serviço</a> e{' '}
        <a href="#" className="text-azulPrincipal hover:underline">Política de Privacidade</a>
      </p>
    </div>
  );
}
