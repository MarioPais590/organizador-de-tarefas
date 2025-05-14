import React from 'react';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Slider } from '../../ui/slider';
import { Clock } from 'lucide-react';

interface AdvanceTimeSelectorProps {
  valor: number;
  unidade: 'minutos' | 'horas';
  onValorChange: (valor: number) => void;
  onUnidadeChange: (unidade: 'minutos' | 'horas') => void;
  disabled?: boolean;
}

export const AdvanceTimeSelector: React.FC<AdvanceTimeSelectorProps> = ({
  valor,
  unidade,
  onValorChange,
  onUnidadeChange,
  disabled = false
}) => {
  // Definir limites do slider com base na unidade
  const getMaxValue = () => {
    return unidade === 'minutos' ? 60 : 24;
  };

  const getMinValue = () => {
    return unidade === 'minutos' ? 1 : 1;
  };

  const formatarLabel = () => {
    return `${valor} ${unidade === 'minutos' ? 'minuto' : 'hora'}${valor !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Label className="text-base font-medium">
          Tempo de antecedência
        </Label>
      </div>
      
      <div className="pl-6">
        <p className="text-sm text-muted-foreground mb-6">
          Receba notificações com antecedência de {formatarLabel()}
        </p>
        
        <div className="grid grid-cols-4 gap-4 items-center">
          <div className="col-span-3">
            <Slider
              value={[valor]}
              min={getMinValue()}
              max={getMaxValue()}
              step={1}
              onValueChange={(values) => onValorChange(values[0])}
              disabled={disabled}
            />
          </div>
          
          <Select
            value={unidade}
            onValueChange={(value) => onUnidadeChange(value as 'minutos' | 'horas')}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutos">Minutos</SelectItem>
              <SelectItem value="horas">Horas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AdvanceTimeSelector;
