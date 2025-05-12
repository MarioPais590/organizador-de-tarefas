import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { solicitarPermissaoNotificacao, verificarSuporteNotificacoes } from "@/services/notificationService";

interface NotificationButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  tooltipSide?: "top" | "right" | "bottom" | "left";
  showIcon?: boolean;
  label?: string;
}

export function NotificationButton({ 
  className = "", 
  variant = "outline", 
  tooltipSide = "top",
  showIcon = true,
  label = "Ativar Notificações"
}: NotificationButtonProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default">("default");
  const [isSupported, setIsSupported] = useState(false);

  // Verificar permissão atual e suporte a notificações
  useEffect(() => {
    const checkSupport = () => {
      const supported = verificarSuporteNotificacoes();
      setIsSupported(supported);

      if (supported && "Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Atualiza o estado quando a permissão muda
  const updatePermissionState = () => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await solicitarPermissaoNotificacao();
    updatePermissionState();
    
    if (granted) {
      toast.success("Permissão para notificações concedida!");
    }
  };

  const testNotification = () => {
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

  // Se o navegador não suporta notificações, não mostrar o botão
  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" className={className} disabled>
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <span className="ml-2 hidden sm:inline">Notificações não suportadas</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Este navegador não suporta notificações</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Se a permissão já foi negada
  if (notificationPermission === "denied") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" className={className}>
              <XCircle className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Notificações bloqueadas</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>As notificações estão bloqueadas. Altere as permissões nas configurações do seu navegador.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Se a permissão ainda não foi concedida
  if (notificationPermission !== "granted") {
    return (
      <Button 
        variant={variant} 
        className={className}
        onClick={handleRequestPermission}
      >
        {showIcon && <BellRing className="h-4 w-4 mr-2" />}
        {label}
      </Button>
    );
  }

  // Se a permissão já foi concedida, mostrar botão de teste
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            className={`${className} bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-800/50 border-green-300 dark:border-green-800`}
            onClick={testNotification}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            <span>Testar Notificação</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>Clique para enviar uma notificação de teste</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 