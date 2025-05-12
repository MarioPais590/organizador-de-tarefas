
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function NotificationToggle({ 
  checked, 
  onCheckedChange,
  disabled = false 
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="notificacoes">Notificações Push</Label>
        <p className="text-sm text-muted-foreground">
          Receba alertas sobre tarefas pendentes
        </p>
      </div>
      <Switch 
        id="notificacoes" 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
