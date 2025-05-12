import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, FilePen, FileX, CalendarIcon, Bell, BellOff, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Anexo, Categoria, ConfiguracoesNotificacao } from "@/types";
import { IconeAnexo } from "./IconeAnexo";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatarDataParaISO } from "@/utils/dateUtils";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/useApp";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NovaTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: Categoria[];
  onAddTarefa: (notificar: boolean) => void;
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
  anexos: Anexo[];
  setAnexos: (anexos: Anexo[]) => void;
  abrirEdicaoAnexo: (anexo: Anexo) => void;
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
  setNovaCategoria,
  anexos,
  setAnexos,
  abrirEdicaoAnexo
}: NovaTarefaDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<Date | undefined>(novaData ? new Date(novaData) : undefined);
  const { configNotificacoes } = useApp();
  const [notificar, setNotificar] = useState(true);
  
  // Atualizar data interna quando mudar a externa
  useEffect(() => {
    if (novaData) {
      setDate(new Date(novaData));
    } else {
      setDate(undefined);
    }
  }, [novaData]);
  
  // Ao selecionar data no calendário, atualizar estado
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    
    if (selectedDate) {
      setNovaData(formatarDataParaISO(selectedDate));
    } else {
      setNovaData("");
    }
  };
  
  // Gerar ID único para anexos temporários
  const gerarIdTemporario = () => {
    return 'temp_' + Math.random().toString(36).substring(2, 11);
  };
  
  // Manipular seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Verificar tamanho do arquivo (limite: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo não pode ser maior que 5MB");
      e.target.value = '';
      return;
    }
    
    // Validar tipo de arquivo
    if (!file.type.match(/^(image\/(jpeg|png|gif)|application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)|text\/plain|audio\/mpeg)$/)) {
      toast.error("Tipo de arquivo não suportado");
      e.target.value = '';
      return;
    }
    
    // Determinar tipo de arquivo para ícone
    let tipoAnexo = 'outro';
    if (file.type.startsWith('image/')) tipoAnexo = 'imagem';
    else if (file.type.includes('pdf')) tipoAnexo = 'pdf';
    else if (file.type.includes('word')) tipoAnexo = 'documento';
    else if (file.type.includes('text/')) tipoAnexo = 'texto';
    else if (file.type.includes('audio/')) tipoAnexo = 'audio';
    
    // Ler conteúdo do arquivo
    const reader = new FileReader();
    reader.onload = (event) => {
      // Certificar que conteúdo não é nulo
      if (!event.target || !event.target.result) {
        toast.error("Erro ao ler arquivo");
        return;
      }
      
      const conteudo = event.target.result as string;
      
      // Adicionar anexo ao estado
      setAnexos([...anexos, {
        id: gerarIdTemporario(),
        nome: file.name,
        tipo: tipoAnexo,
        conteudo,
        url: URL.createObjectURL(file)
      }]);
      
      // Limpar input
      e.target.value = '';
    };
    
    reader.readAsDataURL(file);
  };
  
  // Remover anexo
  const removerAnexo = (id: string) => {
    setAnexos(anexos.filter(a => a.id !== id));
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
                  disabled={!configNotificacoes.ativadas}
                />
              </div>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="anexos">Anexos (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="anexos"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".png,.jpg,.jpeg,.pdf,.txt,.mp3"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Adicionar Anexo
              </Button>
            </div>
            
            {anexos.length > 0 && (
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                {anexos.map((anexo) => (
                  <div key={anexo.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <IconeAnexo tipo={anexo.tipo} />
                      <span className="text-sm truncate max-w-[180px]">{anexo.nome}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={() => abrirEdicaoAnexo(anexo)}
                      >
                        <FilePen className="h-3 w-3" />
                      </Button>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-destructive"
                        onClick={() => removerAnexo(anexo.id)}
                      >
                        <FileX className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              console.log("Salvando tarefa com data:", novaData, "e hora:", novaHora, "notificar:", notificar);
              onAddTarefa(notificar);
            }}
            disabled={!novoTitulo || !novaData || !novaCategoria}
          >
            Adicionar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
