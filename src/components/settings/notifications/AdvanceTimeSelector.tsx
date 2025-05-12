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
  
  // Garantir que valor esteja dentro dos limites
  const valorSafe = Math.max(1, Math.min(valor, maxValorPermitido));
  
  // Validar e atualizar o valor de entrada manual
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extrair valor da string e converter para número inteiro
    const inputValue = e.target.value.replace(/[^0-9]/g, '');
    const novoValor = parseInt(inputValue, 10);
    
    console.log(`Input alterado para: "${e.target.value}" -> valor numérico: ${novoValor}`);
    
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
      return `${valorSafe} minuto${valorSafe !== 1 ? 's' : ''}`;
    } else {
      return `${valorSafe} hora${valorSafe !== 1 ? 's' : ''}`;
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
            const novaUnidade = value as "minutos" | "horas";
            console.log(`Unidade alterada para: ${novaUnidade}`);
            
            onUnidadeChange(novaUnidade);
            
            // Ajustar valor para ser compatível com a nova unidade
            if (novaUnidade === "minutos" && valorSafe > 60) {
              onValorChange(60);
            }
            if (novaUnidade === "horas" && valorSafe > 24) {
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
            value={[valorSafe]}
            min={1}
            max={maxValorPermitido}
            step={1}
            onValueChange={([value]) => {
              const valorInteiro = Math.round(value);
              console.log(`Slider alterado para: ${valorInteiro}`);
              onValorChange(valorInteiro);
            }}
            disabled={disabled}
            className="py-2"
          />
        </div>
        <div className="w-20">
          <Input 
            type="number"
            value={valorSafe}
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
