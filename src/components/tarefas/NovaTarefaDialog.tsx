import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Bell, BellOff, HelpCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { Categoria, ConfiguracoesNotificacao } from "@/types";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatarDataParaISO } from "@/utils/dateUtils";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/AppContext";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { verificarSuporteNotificacoes } from "@/services/notificationService";

// Mapa de cores de prioridade
const prioridadeCores = {
  alta: '#ef4444',  // vermelho
  media: '#f59e0b', // âmbar
  baixa: '#10b981', // verde
};

interface NovaTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: Categoria[];
  onAddTarefa: (notificar: boolean, prioridade: string) => void;
  novoTitulo: string;
  setNovoTitulo: (titulo: string) => void;
  novaDescricao: string;
  setNovaDescricao: (descricao: string) => void;
  novaData: string;
  setNovaData: (data: string) => void;
  novaHora: string;
  setNovaHora: (hora: string) => void;
  novaCategoria: string;
  setNovaCategoria: (categoria: string) => void;
}

export const NovaTarefaDialog = ({
  open,
  onOpenChange,
  categorias,
  onAddTarefa,
  novoTitulo,
  setNovoTitulo,
  novaDescricao,
  setNovaDescricao,
  novaData,
  setNovaData,
  novaHora,
  setNovaHora,
  novaCategoria,
  setNovaCategoria
}: NovaTarefaDialogProps) => {
  const [date, setDate] = useState<Date | undefined>(novaData ? new Date(novaData) : undefined);
  const { configNotificacoes } = useApp();
  const [notificar, setNotificar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta'>("media"); // Prioridade média como padrão
  
  // Atualizar data interna quando mudar a externa
  useEffect(() => {
    if (novaData) {
      setDate(new Date(novaData));
    } else {
      setDate(undefined);
    }
  }, [novaData]);
  
  // Resetar isLoading quando o diálogo fechar
  useEffect(() => {
    if (!open && isLoading) {
      console.log("Diálogo de nova tarefa fechado, resetando estado de carregamento");
      setIsLoading(false);
    }
  }, [open, isLoading]);
  
  // Ao selecionar data no calendário, atualizar estado
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    
    if (selectedDate) {
      setNovaData(formatarDataParaISO(selectedDate));
    } else {
      setNovaData("");
    }
  };
  
  // Função para salvar tarefa com indicação de carregamento
  const handleAddTarefa = () => {
    setIsLoading(true);
    
    // Adicionar log detalhado para debug
    console.log("=== Dados da tarefa a ser salva ===");
    console.log("Título:", novoTitulo);
    console.log("Data:", novaData);
    console.log("Hora:", novaHora);
    console.log("Categoria:", novaCategoria);
    console.log("Notificar:", notificar);
    console.log("Prioridade:", prioridade);
    
    // Chamar a função de adicionar tarefa
    onAddTarefa(notificar, prioridade);
    
    // Resetar o estado de carregamento e fechar o diálogo após um breve intervalo
    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 800);
  };
  
  // Obter texto de configurações de notificação para o tooltip
  const getNotificacaoTooltipText = () => {
    if (!configNotificacoes.ativadas) {
      return "As notificações estão desativadas nas configurações. Vá para Configurações > Notificações para ativá-las.";
    }
    
    const tempo = configNotificacoes.antecedencia.valor;
    const unidade = configNotificacoes.antecedencia.unidade === 'minutos' ? 
      (tempo === 1 ? 'minuto' : 'minutos') : 
      (tempo === 1 ? 'hora' : 'horas');
    
    return `Você receberá uma notificação ${tempo} ${unidade} antes desta tarefa. ${
      configNotificacoes.comSom ? 'Com som de alerta.' : 'Sem som de alerta.'
    }`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da tarefa abaixo
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Digite o título da tarefa"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              placeholder="Adicione uma descrição para a tarefa"
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="data">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="data"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hora">Hora (opcional)</Label>
              <Input 
                id="hora"
                type="time"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={novaCategoria} onValueChange={setNovaCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: categoria.cor }}
                        />
                        {categoria.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select 
                value={prioridade} 
                onValueChange={(value: 'baixa' | 'media' | 'alta') => setPrioridade(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">
                    <div className="flex items-center">
                      <Flag className="w-3 h-3 mr-2" color={prioridadeCores.alta} />
                      Alta
                    </div>
                  </SelectItem>
                  <SelectItem value="media">
                    <div className="flex items-center">
                      <Flag className="w-3 h-3 mr-2" color={prioridadeCores.media} />
                      Média
                    </div>
                  </SelectItem>
                  <SelectItem value="baixa">
                    <div className="flex items-center">
                      <Flag className="w-3 h-3 mr-2" color={prioridadeCores.baixa} />
                      Baixa
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="notificar">Notificar</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{getNotificacaoTooltipText()}</p>
                      {!verificarSuporteNotificacoes() && (
                        <p className="text-red-500 text-xs mt-1">
                          Seu dispositivo ou navegador atual pode não ser compatível com notificações.
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                {notificar ? 
                  <Bell className="h-4 w-4 text-green-500" /> : 
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                }
                <Switch 
                  id="notificar"
                  checked={notificar} 
                  onCheckedChange={setNotificar}
                  disabled={!configNotificacoes.ativadas || !verificarSuporteNotificacoes()}
                />
              </div>
            </div>
            {!verificarSuporteNotificacoes() && (
              <p className="text-xs text-red-500">
                Notificações não são suportadas no seu navegador/dispositivo.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            type="submit"
            onClick={handleAddTarefa}
            disabled={!novoTitulo || !novaData || !novaCategoria || isLoading}
            className={isLoading ? 'opacity-70' : ''}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-background"></div>
                Salvando...
              </>
            ) : 'Adicionar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
