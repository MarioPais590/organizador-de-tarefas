import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "./components/AuthGuard";
import { getErrorLogs } from "@/utils/errorLogger";
import { appLogger } from "@/utils/logger";

// Providers
import { AuthProvider } from "@/context/AuthContext";
import { TaskProvider } from "@/context/TaskContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { AppProvider } from "@/context/AppContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tarefas from "./pages/Tarefas";
import Rotinas from "./pages/Rotinas";
import Calendario from "./pages/Calendario";
import Categorias from "./pages/Categorias";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import DiagnosticPage from "./pages/DiagnosticPage";

// Constantes e configurações
const LOADING_DELAY_MS = 800; // Tempo de exibição mínimo para a tela de carregamento
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, 
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  }
});

// Componente de Error Boundary
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorLogs: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorLogs: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    appLogger.error('Erro capturado pelo ErrorBoundary:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    appLogger.error("Detalhes do erro:", error, errorInfo);
    this.setState({ 
      errorInfo,
      errorLogs: getErrorLogs()
    });
  }

  render() {
    if (this.state.hasError) {
      const logs = this.state.errorLogs;
      const errorLogs = logs?.errors || [];
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              Erro no Aplicativo
            </h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Ocorreu um erro que impediu o carregamento do aplicativo.
            </p>
            <div className="mb-4">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                Detalhes do erro: {this.state.error?.message}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 mb-4 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Recarregar Aplicativo
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full px-4 py-2 mb-4 text-white bg-gray-600 rounded hover:bg-gray-700 transition-colors"
            >
              Limpar Cache e Recarregar
            </button>
            {errorLogs.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Ver logs de erro ({errorLogs.length})
                </summary>
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-48">
                  {errorLogs.map((log: string, index: number) => (
                    <p key={index} className="whitespace-normal break-words mb-1">
                      {log}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente de carregamento
const LoadingScreen = () => (
  <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Componente principal do aplicativo
const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Simular tempo de carregamento para evitar flashes de UI
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, LOADING_DELAY_MS);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  // Mostrar tela de carregamento enquanto inicializa
  if (!isInitialized) {
    return <LoadingScreen />;
  }
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <AuthProvider>
              <AppProvider>
                <TaskProvider>
                  <NotificationProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <Routes>
                        {/* Rotas públicas */}
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        
                        {/* Rotas privadas com layout padrão */}
                        <Route path="/dashboard" element={
                          <Layout>
                            <AuthGuard>
                              <Dashboard />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/tarefas" element={
                          <Layout>
                            <AuthGuard>
                              <Tarefas />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/rotinas" element={
                          <Layout>
                            <AuthGuard>
                              <Rotinas />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/calendario" element={
                          <Layout>
                            <AuthGuard>
                              <Calendario />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/categorias" element={
                          <Layout>
                            <AuthGuard>
                              <Categorias />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/perfil" element={
                          <Layout>
                            <AuthGuard>
                              <Perfil />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/configuracoes" element={
                          <Layout>
                            <AuthGuard>
                              <Configuracoes />
                            </AuthGuard>
                          </Layout>
                        } />
                        
                        <Route path="/diagnostico" element={<DiagnosticPage />} />
                        
                        {/* Rota 404 */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </NotificationProvider>
                </TaskProvider>
              </AppProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
