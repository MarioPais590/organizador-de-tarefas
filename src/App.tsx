
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/context/AppContext";
import { Layout } from "@/components/Layout";

// Pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Tarefas from "./pages/Tarefas";
import Rotinas from "./pages/Rotinas";
import Calendario from "./pages/Calendario";
import Categorias from "./pages/Categorias";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

// Componente que verifica autenticação
import { AuthGuard } from "./components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Dashboard />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route 
                path="/tarefas" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Tarefas />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route 
                path="/rotinas" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Rotinas />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route 
                path="/calendario" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Calendario />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route 
                path="/categorias" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Categorias />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route 
                path="/perfil" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Perfil />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route 
                path="/configuracoes" 
                element={
                  <Layout>
                    <AuthGuard>
                      <Configuracoes />
                    </AuthGuard>
                  </Layout>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
