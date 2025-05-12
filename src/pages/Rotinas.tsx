
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Rotina } from "@/types";
import { RotinasTabs } from "@/components/rotinas/RotinasTabs";
import { RotinaDialog } from "@/components/rotinas/RotinaDialog";

export default function Rotinas() {
  const { rotinas, adicionarRotina, atualizarRotina, removerRotina } = useApp();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("todas");
  
  // Estado para edição de rotina
  const [modoEdicao, setModoEdicao] = useState(false);
  const [rotinaAtual, setRotinaAtual] = useState<Rotina | null>(null);

  const handleAddRotina = (titulo: string, descricao: string, tipo: "diaria" | "semanal" | "mensal") => {
    if (modoEdicao && rotinaAtual) {
      atualizarRotina(rotinaAtual.id, {
        titulo,
        descricao,
        tipo,
      });
    } else {
      adicionarRotina({
        titulo,
        descricao,
        tipo,
        tarefas: []
      });
    }

    resetForm();
  };

  const handleEditarRotina = (rotina: Rotina) => {
    setRotinaAtual(rotina);
    setModoEdicao(true);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setDialogOpen(false);
    setModoEdicao(false);
    setRotinaAtual(null);
  };

  return (
    <div className="animate-in">
      <PageHeader 
        title="Rotinas" 
        description="Gerencie suas rotinas diárias, semanais e mensais"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-azulPrincipal hover:bg-azulPrincipal/90">
              <Plus className="mr-2 h-4 w-4" /> Nova Rotina
            </Button>
          </DialogTrigger>
          <RotinaDialog 
            isOpen={dialogOpen}
            onClose={() => resetForm()}
            onSave={handleAddRotina}
            isEditing={modoEdicao}
            rotinaAtual={rotinaAtual || undefined}
          />
        </Dialog>
      </PageHeader>

      <RotinasTabs 
        rotinas={rotinas}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDialog={() => {
          setModoEdicao(false);
          setRotinaAtual(null);
          setDialogOpen(true);
        }}
        onEditRotina={handleEditarRotina}
        onRemoveRotina={(id) => removerRotina(id)}
      />
    </div>
  );
}
