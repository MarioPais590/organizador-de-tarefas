import React from 'react';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';

interface NotificationToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const NotificationToggle: React.FC<NotificationToggleProps> = ({
  checked,
  onCheckedChange
}) => {
  return (
    <div className="flex items-center justify-between space-x-2">
      <div>
        <Label htmlFor="notification-toggle" className="text-base font-medium">
          Ativar notificações
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Receba alertas sobre suas tarefas pendentes
        </p>
      </div>
      <Switch
        id="notification-toggle"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
};

export default NotificationToggle;
