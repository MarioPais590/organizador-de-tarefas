
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { ArrowRight, CheckCircle, PanelRight, Clock } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, isLoading, perfil } = useApp();

  // Redirecionar para o dashboard se já estiver logado
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  // Aguardar verificação de autenticação
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azulPrincipal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between lg:flex-row">
            <div className="max-w-xl lg:max-w-lg">
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-azulPrincipal sm:text-5xl">
                Organize seu tempo e aumente sua produtividade
              </h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Gerencie suas tarefas, rotinas e compromissos de forma simples e eficiente. 
                Nunca mais esqueça uma tarefa importante.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  className="bg-azulPrincipal hover:bg-azulPrincipal/90 text-lg px-8 py-6" 
                  onClick={() => navigate("/login")}
                >
                  Começar agora <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  className="text-lg px-8 py-6" 
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Saiba mais
                </Button>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 flex items-center justify-center">
              <img 
                src="/lovable-uploads/efc2d0bc-dcbc-4648-8b91-905d9636476b.png" 
                alt="Logomarca" 
                className="w-64 h-64 object-contain" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Recursos poderosos para organizar seu dia a dia
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Tudo o que você precisa para manter suas tarefas e compromissos organizados.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col rounded-lg border p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <CheckCircle className="h-6 w-6 text-azulPrincipal" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Gestão de Tarefas</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Crie, organize e acompanhe suas tarefas. Defina datas, categorias e prioridades.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col rounded-lg border p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Clock className="h-6 w-6 text-azulPrincipal" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Rotinas e Lembretes</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Configure rotinas diárias, semanais ou mensais. Receba notificações para não esquecer.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col rounded-lg border p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <PanelRight className="h-6 w-6 text-azulPrincipal" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Dashboard Intuitivo</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Visualize suas tarefas em um painel intuitivo e personalizável. Fácil de usar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-azulPrincipal/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-azulPrincipal px-6 py-16 sm:p-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Pronto para organizar sua vida?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
              Comece a usar nossa plataforma hoje mesmo e experimente um novo nível de organização pessoal.
            </p>
            <Button 
              className="mt-8 bg-white text-azulPrincipal hover:bg-blue-50 text-lg px-8 py-6" 
              onClick={() => navigate("/login")}
            >
              Criar minha conta <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <p className="text-lg font-bold text-azulPrincipal">Organizador de Tarefas</p>
              <p className="mt-1 text-sm text-gray-500">© 2025 Mario Augusto Todos os direitos reservados.</p>
            </div>
            <div className="flex gap-4">
              <a href="#" className="text-gray-500 hover:text-azulPrincipal">
                Termos
              </a>
              <a href="#" className="text-gray-500 hover:text-azulPrincipal">
                Privacidade
              </a>
              <a href="#" className="text-gray-500 hover:text-azulPrincipal">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
