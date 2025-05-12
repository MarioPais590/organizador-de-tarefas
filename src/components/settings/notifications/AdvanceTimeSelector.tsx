
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface AdvanceTimeSelectorProps {
  valor: number;
  unidade: "minutos" | "horas";
  onValorChange: (valor: number) => void;
  onUnidadeChange: (unidade: "minutos" | "horas") => void;
  disabled: boolean;
}

export function AdvanceTimeSelector({ 
  valor, 
  unidade, 
  onValorChange, 
  onUnidadeChange,
  disabled 
}: AdvanceTimeSelectorProps) {
  // Definir valor máximo permitido com base na unidade
  const maxValorPermitido = unidade === "minutos" ? 60 : 24;
  
  // Validar e atualizar o valor de entrada manual
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoValor = parseInt(e.target.value, 10);
    if (isNaN(novoValor) || novoValor < 1) {
      onValorChange(1); // Valor mínimo
    } else if (novoValor > maxValorPermitido) {
      onValorChange(maxValorPermitido); // Valor máximo
    } else {
      onValorChange(novoValor);
    }
  };

  // Formatar o texto de antecedência para exibição
  const formatarAntecedencia = () => {
    if (unidade === "minutos") {
      return `${valor} minuto${valor !== 1 ? 's' : ''}`;
    } else {
      return `${valor} hora${valor !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-4">
      <Label>
        Notificar com antecedência de {formatarAntecedencia()}
      </Label>
      
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <RadioGroup 
          value={unidade}
          onValueChange={(value) => {
            onUnidadeChange(value as "minutos" | "horas");
            // Ajustar valor para ser compatível com a nova unidade
            if (value === "minutos" && valor > 60) {
              onValorChange(60);
            }
            if (value === "horas" && valor > 24) {
              onValorChange(24);
            }
          }}
          className="flex"
          defaultValue="minutos"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="minutos" id="minutos" />
            <Label htmlFor="minutos">Minutos</Label>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <RadioGroupItem value="horas" id="horas" />
            <Label htmlFor="horas">Horas</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Slider
            value={[valor]}
            min={1}
            max={maxValorPermitido}
            step={1}
            onValueChange={([value]) => onValorChange(value)}
            disabled={disabled}
            className="py-2"
          />
        </div>
        <div className="w-20">
          <Input 
            type="number"
            value={valor}
            onChange={handleInputChange}
            min={1}
            max={maxValorPermitido}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
