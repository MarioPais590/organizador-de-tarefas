import { useEffect, useState } from "react";
import { toast } from "sonner";

interface NotificationPermissionAlertProps {
  notificationSupported: boolean;
  permission: NotificationPermission | "default";
  onRequestPermission: () => void;
}

export function NotificationPermissionAlert({ 
  notificationSupported, 
  permission,
  onRequestPermission
}: NotificationPermissionAlertProps) {
  // Estado local para monitorar mudanças nas permissões em tempo real
  const [currentPermission, setCurrentPermission] = useState<NotificationPermission | "default">(permission);
  
  // Atualizar permissões quando mudar externamente ou iniciar o componente
  useEffect(() => {
    const checkPermission = () => {
      if ("Notification" in window) {
        setCurrentPermission(Notification.permission);
      }
    };
    
    // Verificar permissão atual
    checkPermission();
    
    // Não verificar periodicamente para evitar múltiplas notificações
    return () => {};
  }, [permission]);
  
  // Função para testar notificação
  const testarNotificacao = () => {
    try {
      const notification = new Notification("Teste de Notificação", {
        body: "Esta é uma notificação de teste. Se você está vendo isso, as notificações estão funcionando corretamente!",
        icon: '/favicon.ico'
      });
      
      toast.success("Notificação de teste enviada!");
      
      // Reproduzir som de teste usando o AudioContext API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 700;
        gainNode.gain.value = 0.5;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
        }, 300);
      } catch (audioError) {
        console.error("Erro ao reproduzir som de teste:", audioError);
      }
    } catch (error) {
      console.error("Erro ao enviar notificação de teste:", error);
      toast.error("Erro ao enviar notificação de teste");
    }
  };

  if (!notificationSupported) {
    return (
      <div className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 p-3 text-sm">
        <p className="text-center">Este navegador não suporta notificações desktop.</p>
      </div>
    );
  }

  if (currentPermission === "denied") {
    return (
      <div className="rounded-md bg-destructive/10 text-destructive p-3 text-sm">
        <p className="text-center">As notificações estão bloqueadas pelo navegador. Altere as permissões nas configurações do seu navegador para receber notificações.</p>
      </div>
    );
  }
  
  if (currentPermission === "default") {
    return (
      <div className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 p-3 text-sm flex flex-col space-y-2">
        <p className="text-center">As notificações precisam de sua permissão para funcionarem.</p>
        <div className="flex justify-center">
          <button 
            onClick={onRequestPermission}
            className="text-sm px-4 py-2 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 rounded-md transition-colors"
          >
            Permitir Notificações
          </button>
        </div>
      </div>
    );
  }
  
  // Se a permissão foi concedida, mostrar botão de teste
  return (
    <div className="rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 p-3 text-sm flex flex-col space-y-2">
      <p className="text-center">Permissão de notificações concedida!</p>
      <div className="flex justify-center">
        <button 
          onClick={testarNotificacao}
          className="text-sm px-4 py-2 bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 rounded-md transition-colors"
        >
          Testar Notificação
        </button>
      </div>
    </div>
  );
}
