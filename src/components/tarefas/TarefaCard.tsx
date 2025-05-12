
import React from "react";
import { Calendar, Edit, Trash, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip } from "lucide-react";
import { Tarefa } from "@/types";
import { formatarData } from "@/utils/dateUtils";

interface TarefaCardProps {
  tarefa: Tarefa;
  marcarConcluida: (id: string, concluida: boolean) => void;
  abrirDetalhesTarefa: (tarefa: Tarefa) => void;
  abrirEditarTarefa: (tarefa: Tarefa) => void;
  removerTarefa: (id: string) => void;
}

export const TarefaCard = ({ 
  tarefa, 
  marcarConcluida, 
  abrirDetalhesTarefa, 
  abrirEditarTarefa, 
  removerTarefa 
}: TarefaCardProps) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox 
          id={`task-${tarefa.id}`} 
          checked={tarefa.concluida}
          onCheckedChange={(checked) => marcarConcluida(tarefa.id, checked === true)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-medium ${tarefa.concluida ? 'line-through text-muted-foreground' : ''}`}>
                {tarefa.titulo}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatarData(tarefa.data, tarefa.hora)}</span>
                </div>
                <div 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${tarefa.categoria.cor}20`, 
                    color: tarefa.categoria.cor 
                  }}
                >
                  {tarefa.categoria.nome}
                </div>
              </div>
            </div>
            <div className="flex">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => abrirDetalhesTarefa(tarefa)} 
                className="text-muted-foreground hover:text-primary"
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => abrirEditarTarefa(tarefa)} 
                className="text-muted-foreground hover:text-primary"
                title="Editar tarefa"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removerTarefa(tarefa.id)} 
                className="text-muted-foreground hover:text-destructive"
                title="Remover tarefa"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {tarefa.descricao && (
            <div className="mt-2 text-sm">
              {tarefa.descricao}
            </div>
          )}
          
          {tarefa.anexos && tarefa.anexos.length > 0 && (
            <div className="mt-3">
              <div 
                className="text-sm font-medium flex items-center gap-1 cursor-pointer hover:text-primary"
                onClick={() => abrirDetalhesTarefa(tarefa)}
              >
                <Paperclip className="h-3 w-3" />
                <span>{tarefa.anexos.length} anexo{tarefa.anexos.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);
