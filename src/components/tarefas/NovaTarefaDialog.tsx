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
import { verificarSuporteNotificacoes } from "@/services/notificationService";

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
  handleFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  abrirEdicaoAnexo,
  handleFileSelect: externalHandleFileSelect
}: NovaTarefaDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<Date | undefined>(novaData ? new Date(novaData) : undefined);
  const { configNotificacoes } = useApp();
  const [notificar, setNotificar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
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
    console.log("Anexos:", anexos ? anexos.length : 0, "anexos");
    
    // Lista os anexos para verificar se foram processados corretamente
    if (anexos && anexos.length > 0) {
      anexos.forEach((anexo, index) => {
        console.log(`Anexo ${index+1}:`, anexo.nome, anexo.tipo, 
          anexo.conteudo ? `${anexo.conteudo.substring(0, 50)}...` : 'sem conteúdo');
      });
    }
    
    // Chamar a função de adicionar tarefa
    onAddTarefa(notificar);
    
    // Resetar o estado de carregamento e fechar o diálogo após um breve intervalo
    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 800);
  };
  
  // Gerar ID único para anexos temporários
  const gerarIdTemporario = () => {
    return 'temp_' + Math.random().toString(36).substring(2, 11);
  };
  
  // Usar o handler externo se fornecido, caso contrário usar o interno
  const handleFileSelectFn = externalHandleFileSelect || handleFileSelect;
  
  // Processar arquivo de imagem com compressão
  const processImageFile = (file: File, tipoAnexo: string, fileUrl: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
      const dataUrl = canvas.toDataURL(`image/${tipoAnexo === 'jpg' ? 'jpeg' : tipoAnexo}`, qualidade);
      
      // Adicionar anexo ao estado
      setAnexos([...anexos, {
        id: gerarIdTemporario(),
        nome: file.name,
        tipo: tipoAnexo,
        conteudo: dataUrl,
        url: fileUrl
      }]);
      
      console.log("Anexo de imagem criado com sucesso:", file.name, "tipo:", tipoAnexo);
      
      // Limpar input
      e.target.value = '';
    };
    
    img.onerror = () => {
      console.error("Erro ao carregar imagem");
      toast.error("Erro ao processar a imagem. Tente novamente.");
      e.target.value = '';
    };
    
    img.src = fileUrl;
  };
  
  // Processar outros tipos de arquivo
  const processRegularFile = (file: File, tipo: string, fileUrl: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      // Certificar que conteúdo não é nulo
      if (!event.target || !event.target.result) {
        toast.error("Erro ao ler arquivo");
        return;
      }
      
      const conteudo = event.target.result as string;
      
      // Verificar tamanho após conversão para base64
      const conteudoBase64 = conteudo.split(',')[1] || '';
      const sizeInMB = (conteudoBase64.length * 3/4) / (1024 * 1024);
      
      if (sizeInMB > 1) {
        console.warn(`Conteúdo em base64 é muito grande: ${sizeInMB.toFixed(2)}MB`);
        toast.error("O conteúdo do arquivo é muito grande após processamento. Use um arquivo menor.");
        e.target.value = '';
        return;
      }
      
      // Log detalhado para depuração
      console.log(`Processando anexo: ${file.name} (${tipo})`);
      console.log(`- Tamanho base64: ${sizeInMB.toFixed(2)}MB`);
      console.log(`- Primeiros 50 caracteres do conteúdo: ${conteudo.substring(0, 50)}...`);
      
      // Adicionar anexo ao estado
      setAnexos([...anexos, {
        id: gerarIdTemporario(),
        nome: file.name,
        tipo: tipo,
        conteudo: conteudo,
        url: fileUrl
      }]);
      
      console.log(`Anexo criado com sucesso: ${file.name}, tipo: ${tipo}`);
      
      // Limpar input
      e.target.value = '';
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler arquivo:", error, reader.error);
      toast.error("Erro ao processar o arquivo. Tente novamente.");
      e.target.value = '';
    };
    
    // Usar readAsDataURL para todos os tipos de arquivo, incluindo MP3
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
          
          <div className="grid gap-2">
            <Label htmlFor="anexos">Anexos (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="anexos"
                type="file"
                className="hidden"
                onChange={handleFileSelectFn}
                accept=".jpg,.jpeg,.png,.pdf,.txt,.mp3"
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
            onClick={handleAddTarefa}
            disabled={!novoTitulo || !novaData || !novaCategoria}
          >
            Adicionar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
