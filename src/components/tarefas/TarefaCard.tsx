import React, { memo } from "react";
import { Calendar, Edit, Trash, Eye, Flag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip } from "lucide-react";
import { Tarefa } from "@/types";
import { formatarData } from "@/utils/dateUtils";
import { format, isToday, isPast, parseISO, isValid } from "date-fns";

interface TarefaCardProps {
  tarefa: Tarefa;
  marcarConcluida: (id: string, concluida: boolean) => void;
  abrirDetalhesTarefa: (tarefa: Tarefa) => void;
  abrirEditarTarefa: (tarefa: Tarefa) => void;
  removerTarefa: (id: string) => void;
}

// Função para obter a cor da prioridade
const getPrioridadeColor = (prioridade: string): string => {
  switch (prioridade) {
    case 'alta':
      return '#ef4444'; // vermelho
    case 'media':
      return '#f59e0b'; // âmbar
    case 'baixa':
      return '#10b981'; // verde
    default:
      return '#f59e0b'; // âmbar como padrão
  }
};

// Função para obter o texto da prioridade
const getPrioridadeText = (prioridade: string): string => {
  switch (prioridade) {
    case 'alta':
      return 'Alta prioridade';
    case 'media':
      return 'Média prioridade';
    case 'baixa':
      return 'Baixa prioridade';
    default:
      return 'Prioridade média';
  }
};

// Componente de badge para status da data
const DateBadge = ({ dataString }: { dataString: string }) => {
  try {
    if (!dataString || !dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return null;
    }
    
    const data = parseISO(dataString);
    
    // Verificar se a data é válida antes de processar
    if (isNaN(data.getTime())) {
      return null;
    }
    
    if (isPast(data) && !isToday(data)) {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium ml-2">
          Atrasada
        </span>
      );
    } else if (isToday(data)) {
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-medium ml-2">
          Hoje
        </span>
      );
    }
  } catch (e) {
    console.error("Erro ao processar data:", e);
  }
  
  return null;
};

export const TarefaCard = memo(({ 
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
              <div className="flex items-center gap-2">
                <h3 className={`font-medium ${tarefa.concluida ? 'line-through text-muted-foreground' : ''}`}>
                  {tarefa.titulo}
                </h3>
                <div 
                  className="flex items-center tooltip-container" 
                  title={getPrioridadeText(tarefa.prioridade)}
                  aria-label={getPrioridadeText(tarefa.prioridade)}
                >
                  <Flag 
                    size={12} 
                    className="inline-block" 
                    style={{ color: getPrioridadeColor(tarefa.prioridade) }} 
                    aria-hidden="true"
                  />
                </div>
                {!tarefa.concluida && <DateBadge dataString={tarefa.data} />}
              </div>
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
        </div>
      </div>
    </CardContent>
  </Card>
));
