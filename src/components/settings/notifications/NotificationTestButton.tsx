import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { verificarSuporteNotificacoes } from '@/services/notificationService';
import { Bell } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Componente para testar o sistema de notificações
 */
export const NotificationTestButton: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const { configNotificacoes } = useApp();
  
  const suporteAtivo = verificarSuporteNotificacoes();
  const notificacoesAtivas = configNotificacoes.ativadas && suporteAtivo && Notification.permission === 'granted';
  
  const handleTestNotification = async () => {
    setIsTesting(true);
    
    try {
      // Verificar permissão
      if (Notification.permission !== 'granted') {
        toast.error("Permissão de notificações não concedida. Verifique as configurações do navegador.");
        setIsTesting(false);
        return;
      }
      
      // Verificar suporte
      if (!suporteAtivo) {
        toast.error("Seu navegador ou dispositivo não suporta notificações.");
        setIsTesting(false);
        return;
      }
      
      // Enviar notificação de teste
      const notification = new Notification("Teste de notificação", {
        body: "Esta é uma notificação de teste para verificar se o sistema está funcionando corretamente.",
        icon: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false
      });
      
      // Reproduzir som se configurado
      if (configNotificacoes.comSom) {
        try {
          const audio = new Audio('/sounds/notification.mp3');
          await audio.play();
        } catch (audioError) {
          console.error("Erro ao reproduzir som:", audioError);
        }
      }
      
      // Testar service worker
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TEST_NOTIFICATION',
          timestamp: Date.now()
        });
      }
      
      toast.success("Notificação de teste enviada com sucesso!");
      
      // Fechar notificação após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error("Erro ao enviar notificação de teste:", error);
      toast.error("Erro ao enviar notificação de teste. Verifique o console para mais detalhes.");
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTestNotification}
            disabled={isTesting || !notificacoesAtivas}
            className={`${notificacoesAtivas ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-gray-50 border-gray-200'}`}
          >
            {isTesting ? (
              <>
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-green-600"></div>
                Testando...
              </>
            ) : (
              <>
                <Bell className="h-3.5 w-3.5 mr-2 text-green-600" />
                Testar Notificação
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {notificacoesAtivas 
            ? "Enviar uma notificação de teste para verificar se o sistema está funcionando" 
            : "As notificações estão desativadas ou não são suportadas neste navegador"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 