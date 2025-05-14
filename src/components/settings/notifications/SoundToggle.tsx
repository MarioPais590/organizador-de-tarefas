import React from 'react';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Volume2 } from 'lucide-react';

interface SoundToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({
  checked,
  onCheckedChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <div>
          <Label htmlFor="sound-toggle" className="text-base font-medium">
            Som de notificação
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Reproduzir som ao receber notificações
          </p>
        </div>
      </div>
      <Switch
        id="sound-toggle"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
};

export default SoundToggle;
