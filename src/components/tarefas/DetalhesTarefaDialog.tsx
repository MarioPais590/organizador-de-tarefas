import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Paperclip, FilePen, FileX, Eye } from "lucide-react";
import { Anexo, Tarefa } from "@/types";
import { formatarData } from "@/utils/dateUtils";
import { IconeAnexo } from "./IconeAnexo";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface DetalhesTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: Tarefa | null;
  onEditarAnexo: (anexoId: string, nome: string) => void;
  onRemoverAnexo: (anexoId: string) => void;
}

export const DetalhesTarefaDialog = ({
  open,
  onOpenChange,
  tarefa,
  onEditarAnexo,
  onRemoverAnexo
}: DetalhesTarefaDialogProps) => {
  const isMobile = useIsMobile();
  
  const visualizarAnexo = (anexo: Anexo) => {
    try {
      // Verificar se temos o conteúdo do anexo
      if (anexo.conteudo) {
        // Criar URL para visualização usando conteúdo
        const url = window.URL.createObjectURL(
          dataURLtoBlob(anexo.conteudo)
        );
        
        // Abrir em nova aba
        window.open(url, '_blank');
      } else if (anexo.url) {
        // Usar URL já existente, se disponível
        window.open(anexo.url, '_blank');
      } else {
        toast.error("Não foi possível visualizar este anexo");
      }
    } catch (error) {
      console.error("Erro ao visualizar anexo:", error);
      toast.error("Erro ao abrir o anexo");
    }
  };
  
  // Função auxiliar para converter Data URL para Blob
  const dataURLtoBlob = (dataURL: string) => {
    try {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || '';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      return new Blob([u8arr], { type: mime });
    } catch (error) {
      console.error("Erro ao converter data URL para blob:", error);
      throw error;
    }
  };
  
  if (!tarefa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'w-[95%] max-w-[95%]' : 'sm:max-w-[500px]'}`}>
        <DialogHeader>
          <DialogTitle className="text-lg break-words">{tarefa.titulo}</DialogTitle>
          <DialogDescription>
            Detalhes da tarefa e gerenciamento de anexos
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
          
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> 
              Anexos 
              <span className="text-xs text-muted-foreground font-normal">
                ({tarefa.anexos?.length || 0})
              </span>
            </h4>
            
            {(!tarefa.anexos || tarefa.anexos.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum anexo para esta tarefa</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tarefa.anexos.map((anexo: Anexo) => (
                  <div 
                    key={anexo.id} 
                    className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <IconeAnexo tipo={anexo.tipo} />
                      <span
                        className="text-sm hover:underline truncate max-w-[150px] md:max-w-[200px] cursor-pointer"
                        onClick={() => visualizarAnexo(anexo)}
                      >
                        {anexo.nome}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => visualizarAnexo(anexo)}
                        title="Visualizar"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => onEditarAnexo(anexo.id, anexo.nome)}
                        title="Editar nome"
                      >
                        <FilePen className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => onRemoverAnexo(anexo.id)}
                        title="Remover"
                      >
                        <FileX className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
