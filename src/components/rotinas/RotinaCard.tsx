
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash } from "lucide-react";
import { Rotina } from "@/types";

interface RotinaCardProps {
  rotina: Rotina;
  onEdit: (rotina: Rotina) => void;
  onRemove: (id: string) => void;
}

export const RotinaCard = ({ rotina, onEdit, onRemove }: RotinaCardProps) => {
  // Helper para obter cores por tipo
  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case "diaria":
        return {
          bg: "#3a86ff20",
          color: "#3a86ff",
          label: "Diária"
        };
      case "semanal":
        return {
          bg: "#ffb70320",
          color: "#ffb703",
          label: "Semanal"
        };
      case "mensal":
      default:
        return {
          bg: "#a7c95720",
          color: "#a7c957",
          label: "Mensal"
        };
    }
  };

  const tipoStyle = getTipoStyle(rotina.tipo);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>{rotina.titulo}</span>
          <div 
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ 
              backgroundColor: tipoStyle.bg,
              color: tipoStyle.color
            }}
          >
            {tipoStyle.label}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rotina.descricao && (
          <p className="text-sm text-muted-foreground">{rotina.descricao}</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-azulPrincipal"
          onClick={() => onEdit(rotina)}
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-vermelho"
          onClick={() => onRemove(rotina.id)}
        >
          <Trash className="mr-2 h-4 w-4" />
          Remover
        </Button>
      </CardFooter>
    </Card>
  );
};
