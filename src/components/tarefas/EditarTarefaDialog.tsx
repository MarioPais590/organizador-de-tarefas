import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, FilePen, FileX, CalendarIcon, Bell, BellOff, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Anexo, Categoria, Tarefa } from "@/types";
import { IconeAnexo } from "./IconeAnexo";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatarDataParaISO } from "@/utils/dateUtils";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/useApp";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EditarTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: Tarefa | null;
  categorias: Categoria[];
  onSaveChanges: (id: string, tarefaAtualizada: Partial<Tarefa>) => void;
  abrirEdicaoAnexo: (anexo: Anexo) => void;
}

export const EditarTarefaDialog = ({
  open,
  onOpenChange,
  tarefa,
  categorias,
  onSaveChanges,
  abrirEdicaoAnexo
}: EditarTarefaDialogProps) => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("");
  const [categoria, setCategoria] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notificar, setNotificar] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados da tarefa quando o diálogo for aberto
  useEffect(() => {
    if (open && tarefa) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao || "");
      setData(tarefa.data);
      setHora(tarefa.hora || "");
      setCategoria(tarefa.categoria.id);
      setAnexos(tarefa.anexos || []);
      setNotificar(tarefa.notificar !== false); // Valor padrão verdadeiro se não definido
      
      console.log("EditarTarefaDialog - Carregando tarefa:", tarefa);
      console.log("EditarTarefaDialog - Data:", tarefa.data, "Hora:", tarefa.hora);
      
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
        anexos,
        notificar
      };
      
      onSaveChanges(tarefa.id, tarefaAtualizada);
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast.error("Erro ao salvar alterações. Tente novamente.");
    }
    
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileSize = file.size / 1024 / 1024; // tamanho em MB
    
    // Verificar tamanho do arquivo (máximo 5MB)
    if (fileSize > 5) {
      toast.error("O arquivo é muito grande. O tamanho máximo é de 5MB.");
      return;
    }
    
    // Verificar tipo de arquivo
    const tiposPermitidos = ['png', 'jpg', 'jpeg', 'pdf', 'txt', 'mp3'];
    
    if (!tiposPermitidos.some(tipo => file.type.includes(tipo))) {
      toast.error("Tipo de arquivo não suportado. Apenas PNG, JPG, PDF, TXT e MP3 são permitidos.");
      return;
    }
    
    try {
      // Criar URL para o arquivo
      const fileUrl = URL.createObjectURL(file);
      let tipo: "png" | "jpg" | "pdf" | "txt" | "mp3" = "png";
      
      if (file.type.includes('png')) tipo = "png";
      else if (file.type.includes('jpg') || file.type.includes('jpeg')) tipo = "jpg";
      else if (file.type.includes('pdf')) tipo = "pdf";
      else if (file.type.includes('txt') || file.type.includes('text')) tipo = "txt";
      else if (file.type.includes('mp3') || file.type.includes('audio')) tipo = "mp3";
      
      // Adicionar anexo
      const novoAnexo: Anexo = {
        id: crypto.randomUUID(),
        nome: file.name,
        tipo,
        conteudo: fileUrl,
        url: fileUrl
      };
      
      setAnexos([...anexos, novoAnexo]);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo. Tente novamente.");
    }
  };

  const removerAnexo = (id: string) => {
    setAnexos(anexos.filter(a => a.id !== id));
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="notificar">Notificar</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Ativar ou desativar notificações para esta tarefa</p>
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
                />
              </div>
            </div>
          </div>
          
          {/* Seção de anexos */}
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
            onClick={handleSaveChanges}
            disabled={!titulo || !data || !categoria || isLoading}
          >
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
