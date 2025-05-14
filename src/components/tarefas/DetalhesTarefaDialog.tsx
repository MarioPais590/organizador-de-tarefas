import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tarefa } from "@/types";
import { formatarData } from "@/utils/dateUtils";
import { useIsMobile } from "@/hooks/use-mobile";

interface DetalhesTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: Tarefa | null;
}

export const DetalhesTarefaDialog = ({
  open,
  onOpenChange,
  tarefa
}: DetalhesTarefaDialogProps) => {
  const isMobile = useIsMobile();
  
  if (!tarefa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'w-[95%] max-w-[95%]' : 'sm:max-w-[500px]'}`}>
        <DialogHeader>
          <DialogTitle className="text-lg break-words">{tarefa.titulo}</DialogTitle>
          <DialogDescription>
            Detalhes da tarefa
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <h4 className="text-sm font-medium mb-1">Data</h4>
            <p className="text-sm text-muted-foreground">
              {formatarData(tarefa.data, tarefa.hora)}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-1">Categoria</h4>
            <div 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
              style={{ 
                backgroundColor: `${tarefa.categoria.cor}20`, 
                color: tarefa.categoria.cor 
              }}
            >
              {tarefa.categoria.nome}
            </div>
          </div>
          
          {tarefa.descricao && (
            <div>
              <h4 className="text-sm font-medium mb-1">Descrição</h4>
              <p className="text-sm text-muted-foreground break-words">
                {tarefa.descricao}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
