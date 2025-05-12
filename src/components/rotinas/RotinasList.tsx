
import { Rotina } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, RepeatIcon, Clock, Calendar } from "lucide-react";
import { RotinaCard } from "./RotinaCard";

interface RotinasListProps {
  rotinas: Rotina[];
  tipo: "todas" | "diarias" | "semanais" | "mensais";
  onOpenDialog: () => void;
  onEditRotina: (rotina: Rotina) => void;
  onRemoveRotina: (id: string) => void;
}

export const RotinasList = ({ 
  rotinas, 
  tipo, 
  onOpenDialog, 
  onEditRotina, 
  onRemoveRotina 
}: RotinasListProps) => {
  let filteredRotinas = rotinas;
  let emptyTitle = "Nenhuma rotina cadastrada";
  let emptyDescription = "Você ainda não tem rotinas cadastradas. Crie rotinas para organizar suas atividades recorrentes.";
  let emptyIcon = <RepeatIcon className="h-8 w-8" />;
  let emptyButtonText = "Criar nova rotina";
  
  if (tipo === "diarias") {
    filteredRotinas = rotinas.filter(r => r.tipo === "diaria");
    emptyTitle = "Nenhuma rotina diária";
    emptyDescription = "Você não tem rotinas diárias cadastradas.";
    emptyIcon = <Clock className="h-8 w-8" />;
    emptyButtonText = "Criar rotina diária";
  } else if (tipo === "semanais") {
    filteredRotinas = rotinas.filter(r => r.tipo === "semanal");
    emptyTitle = "Nenhuma rotina semanal";
    emptyDescription = "Você não tem rotinas semanais cadastradas.";
    emptyIcon = <Calendar className="h-8 w-8" />;
    emptyButtonText = "Criar rotina semanal";
  } else if (tipo === "mensais") {
    filteredRotinas = rotinas.filter(r => r.tipo === "mensal");
    emptyTitle = "Nenhuma rotina mensal";
    emptyDescription = "Você não tem rotinas mensais cadastradas.";
    emptyIcon = <Calendar className="h-8 w-8" />;
    emptyButtonText = "Criar rotina mensal";
  }

  if (filteredRotinas.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={
          <Button 
            variant="outline" 
            onClick={onOpenDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            {emptyButtonText}
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredRotinas.map((rotina) => (
        <RotinaCard 
          key={rotina.id} 
          rotina={rotina} 
          onEdit={onEditRotina}
          onRemove={onRemoveRotina}
        />
      ))}
    </div>
  );
};
