import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Bell, BellOff, HelpCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { Categoria, Tarefa } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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

interface EditarTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: Tarefa | null;
  categorias: Categoria[];
  onSaveChanges: (id: string, tarefaAtualizada: Partial<Tarefa>) => void;
}

export const EditarTarefaDialog = ({
  open,
  onOpenChange,
  tarefa,
  categorias,
  onSaveChanges
}: EditarTarefaDialogProps) => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("");
  const [categoria, setCategoria] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notificar, setNotificar] = useState(true);
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta'>("media");
  
  const { configNotificacoes } = useApp();

  // Carregar dados da tarefa quando o diálogo for aberto
  useEffect(() => {
    if (open && tarefa) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao || "");
      setData(tarefa.data);
      setHora(tarefa.hora || "");
      setCategoria(tarefa.categoria.id);
      setNotificar(tarefa.notificar !== false); // Valor padrão verdadeiro se não definido
      setPrioridade(tarefa.prioridade || "media");
      
      console.log("EditarTarefaDialog - Carregando tarefa:", tarefa);
      console.log("EditarTarefaDialog - Data:", tarefa.data, "Hora:", tarefa.hora);
      console.log("EditarTarefaDialog - Prioridade:", tarefa.prioridade);
      
      // Parse date without timezone issues
      if (tarefa.data) {
        try {
          const [year, month, day] = tarefa.data.split('-').map(Number);
          const newDate = new Date(year, month - 1, day);
          setDate(newDate);
          console.log("Data carregada:", newDate);
        } catch (error) {
          console.error("Erro ao converter data:", error);
        }
      }
    }
  }, [open, tarefa]);
  
  // Resetar isLoading quando o diálogo fechar
  useEffect(() => {
    if (!open && isLoading) {
      console.log("Diálogo fechado, resetando estado de carregamento");
      setIsLoading(false);
    }
  }, [open, isLoading]);

  // Atualizar estado da data quando o usuário seleciona uma data no calendário
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Criar uma nova data para evitar problemas de referência
      const newDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      
      setDate(newDate);
      const formattedDate = formatarDataParaISO(newDate);
      setData(formattedDate);
      console.log("Data selecionada:", formattedDate);
    }
  };

  const handleSaveChanges = () => {
    setIsLoading(true);
    
    if (!tarefa) return;
    
    try {
      const categoriaSelecionada = categorias.find(c => c.id === categoria);
      if (!categoriaSelecionada) {
        toast.error("Categoria inválida");
        setIsLoading(false);
        return;
      }
      
      const tarefaAtualizada = {
        titulo,
        descricao: descricao || undefined,
        data,
        hora: hora || undefined,
        categoria: categoriaSelecionada,
        notificar,
        prioridade
      };
      
      // Log de debug
      console.log("Salvando tarefa com prioridade:", prioridade);
      
      // Modificação aqui para fechar o diálogo e resetar isLoading após salvar com sucesso
      onSaveChanges(tarefa.id, tarefaAtualizada);
      
      // Resetar o estado de carregamento após um breve intervalo para garantir
      // que o usuário veja o feedback visual
      setTimeout(() => {
        setIsLoading(false);
        onOpenChange(false); // Fechar o diálogo automaticamente
      }, 800);
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast.error("Erro ao salvar alterações. Tente novamente.");
      setIsLoading(false);
    }
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

  if (!tarefa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da tarefa
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Digite o título da tarefa"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              placeholder="Adicione uma descrição para a tarefa"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="data">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? format(date, "dd/MM/yyyy") : <span>Selecione</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hora">Hora (opcional)</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => {
                  console.log("Hora alterada para:", e.target.value);
                  setHora(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2" 
                          style={{ backgroundColor: c.cor }}
                        />
                        {c.nome}
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
                {notificar ? (
                  <Bell className="h-4 w-4 text-green-500" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
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
            onClick={handleSaveChanges} 
            disabled={!titulo || !data || !categoria || isLoading}
            className={isLoading ? 'opacity-70' : ''}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-background"></div>
                Salvando...
              </>
            ) : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
