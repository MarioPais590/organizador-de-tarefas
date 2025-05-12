
import { useApp } from "@/context/AppContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useApp();
  
  // Aguardar verificação de autenticação
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azulPrincipal"></div>
      </div>
    );
  }
  
  // Redirecionar para login se não estiver autenticado
  if (!user) {
    toast.error("Você precisa estar logado para acessar esta página", {
      id: "auth-required", // Evitar múltiplos toasts
    });
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};
