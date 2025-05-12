
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SoundToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}

export function SoundToggle({ checked, onCheckedChange, disabled }: SoundToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="sound">Sons de notificação</Label>
        <p className="text-sm text-muted-foreground">
          Ative sons para notificações importantes
        </p>
      </div>
      <Switch 
        id="sound" 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
