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
import { verificarSuporteNotificacoes } from "@/services/notificationService";

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
  const { configNotificacoes } = useApp();

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
      // Verificar se há anexos muito grandes
      if (anexos.some(anexo => {
        const base64Content = anexo.conteudo.split(',')[1] || '';
        const sizeInMB = (base64Content.length * 3/4) / (1024 * 1024);
        return sizeInMB > 0.9; // Alertar próximo ao limite
      })) {
        console.warn("Anexos muito grandes detectados");
        toast.warning("Alguns anexos são grandes e podem causar problemas ao salvar. Considere usar arquivos menores.");
      }
      
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileSize = file.size / 1024 / 1024; // tamanho em MB
    
    // Verificar tamanho do arquivo (máximo 2MB)
    if (fileSize > 2) {
      toast.error("O arquivo é muito grande. O tamanho máximo é de 2MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    console.log("Tentando processar arquivo:", file.name, "tipo:", file.type, "tamanho:", fileSize.toFixed(2) + "MB");
    
    // Verificar extensão do arquivo - é mais confiável do que MIME type
    const extensao = file.name.split('.').pop()?.toLowerCase();
    
    // Verificar se a extensão é válida
    if (!extensao || !['png', 'jpg', 'jpeg', 'pdf', 'txt', 'mp3'].includes(extensao)) {
      toast.error("Tipo de arquivo não suportado. Apenas PNG, JPG, PDF, TXT e MP3 são permitidos.");
      console.error("Extensão não suportada:", extensao);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Determinar o tipo baseado na extensão do arquivo
    const tipo = extensao === 'jpeg' ? 'jpg' : extensao as 'png' | 'jpg' | 'pdf' | 'txt' | 'mp3';
    
    console.log("Tipo determinado pela extensão:", tipo);
    
    try {
      // Criar URL para o arquivo
      const fileUrl = URL.createObjectURL(file);
      
      // Processar o arquivo com base no seu tipo
      if (tipo === 'png' || tipo === 'jpg') {
        // Para imagens, usar compressão
        processImageFile(file, tipo, fileUrl);
      } else {
        // Para outros tipos de arquivo, processar normalmente
        processRegularFile(file, tipo, fileUrl);
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo. Tente novamente.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Processar arquivo de imagem com compressão
  const processImageFile = (file: File, tipo: string, fileUrl: string) => {
    const img = new Image();
    img.onload = () => {
      // Criar canvas para redimensionar/comprimir a imagem
      const canvas = document.createElement('canvas');
      
      // Calcular dimensões mantendo proporção
      let width = img.width;
      let height = img.height;
      
      // Limitar tamanho máximo
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }
      
      // Configurar canvas
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem no canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error("Erro ao processar imagem");
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para Data URL com qualidade reduzida
      const qualidade = 0.7; // 70% de qualidade
      const dataUrl = canvas.toDataURL(`image/${tipo === 'jpg' ? 'jpeg' : tipo}`, qualidade);
      
      // Adicionar anexo
      const novoAnexo: Anexo = {
        id: crypto.randomUUID(),
        nome: file.name,
        tipo,
        conteudo: dataUrl,
        url: fileUrl
      };
      
      console.log("Anexo de imagem criado com sucesso:", novoAnexo.nome, "tipo:", novoAnexo.tipo);
      setAnexos([...anexos, novoAnexo]);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    img.onerror = () => {
      console.error("Erro ao carregar imagem");
      toast.error("Erro ao processar a imagem. Tente novamente.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    img.src = fileUrl;
  };
  
  // Processar outros tipos de arquivo
  const processRegularFile = (file: File, tipo: string, fileUrl: string) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        toast.error("Erro ao ler o arquivo");
        return;
      }
      
      const conteudo = event.target.result as string;
      
      // Verificar tamanho após conversão para base64
      const conteudoBase64 = conteudo.split(',')[1] || '';
      const sizeInMB = (conteudoBase64.length * 3/4) / (1024 * 1024);
      
      // Limitar tamanho com base no tipo do arquivo
      const tamanhoMaximo = 1; // 1MB para todos os tipos
      
      if (sizeInMB > tamanhoMaximo) {
        console.warn(`Conteúdo em base64 é muito grande: ${sizeInMB.toFixed(2)}MB (limite: ${tamanhoMaximo}MB)`);
        toast.error(`O arquivo ${file.name} é muito grande após processamento. Use um arquivo menor.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Log detalhado para depuração
      console.log(`Processando anexo: ${file.name} (${tipo})`);
      console.log(`- Tamanho base64: ${sizeInMB.toFixed(2)}MB`);
      console.log(`- Primeiros 50 caracteres do conteúdo: ${conteudo.substring(0, 50)}...`);
      
      // Adicionar anexo
      const novoAnexo: Anexo = {
        id: crypto.randomUUID(),
        nome: file.name,
        tipo,
        conteudo,
        url: fileUrl
      };
      
      console.log(`Anexo criado com sucesso: ${novoAnexo.nome}, tipo: ${novoAnexo.tipo}, tamanho: ${sizeInMB.toFixed(2)}MB`);
      setAnexos([...anexos, novoAnexo]);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler arquivo:", error, reader.error);
      toast.error("Erro ao processar o arquivo. Tente novamente.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    // Sempre usar readAsDataURL para maior compatibilidade com todos os tipos de arquivo
    reader.readAsDataURL(file);
  };

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
              <p className="text-red-500 text-xs">
                Notificações podem não funcionar neste dispositivo ou navegador.
              </p>
            )}
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
