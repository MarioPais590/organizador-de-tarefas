import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '../../ui/button';
import { AlertCircle } from 'lucide-react';

interface NotificationPermissionAlertProps {
  notificationSupported?: boolean;
  permission?: NotificationPermission;
  onRequestPermission?: () => void;
}

export const NotificationPermissionAlert: React.FC<NotificationPermissionAlertProps> = ({
  notificationSupported = true,
  permission = Notification.permission,
  onRequestPermission = () => Notification.requestPermission()
}) => {
  if (!notificationSupported) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Notificações não suportadas</AlertTitle>
        <AlertDescription>
          Seu navegador não suporta notificações. Considere usar um navegador mais recente.
        </AlertDescription>
      </Alert>
    );
  }

  if (permission === 'denied') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permissão negada</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Você bloqueou as notificações para este site. Para receber notificações,
            você precisa alterar as configurações do seu navegador.
          </p>
          <p className="text-sm">
            Instruções: Clique no ícone de cadeado/informações na barra de endereço
            e altere as permissões de notificação.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (permission === 'default') {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permissão necessária</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Para receber notificações, você precisa conceder permissão.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestPermission}
          >
            Permitir notificações
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default NotificationPermissionAlert;
