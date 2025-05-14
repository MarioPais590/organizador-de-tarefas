import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TarefaCard } from "./TarefaCard";
import { EmptyState } from "@/components/EmptyState";
import { List, Check, Flag, FilterX, Search, X } from "lucide-react";
import { Tarefa } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TarefasTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tarefasPendentes: Tarefa[];
  tarefasConcluidas: Tarefa[];
  tarefas: Tarefa[];
  marcarConcluida: (id: string, concluida: boolean) => void;
  abrirDetalhesTarefa: (tarefa: Tarefa) => void;
  abrirEditarTarefa: (tarefa: Tarefa) => void;
  removerTarefa: (id: string) => void;
  setDialogOpen: (open: boolean) => void;
}

// Mapa de cores de prioridade
const prioridadeCores = {
  alta: '#ef4444',  // vermelho
  media: '#f59e0b', // âmbar
  baixa: '#10b981', // verde
};

// Função de debounce para atrasar a execução de uma função
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Função para ordenar tarefas por data (ordem crescente)
function ordenarTarefasPorData(tarefas: Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    // Comparar as datas
    if (a.data < b.data) return -1;
    if (a.data > b.data) return 1;
    
    // Se as datas forem iguais, ordenar por hora (se houver)
    if (a.hora && b.hora) {
      if (a.hora < b.hora) return -1;
      if (a.hora > b.hora) return 1;
    } else if (a.hora) {
      return -1; // Tarefas com hora vêm antes das sem hora
    } else if (b.hora) {
      return 1;
    }
    
    // Se datas e horas forem iguais, manter a ordem original
    return 0;
  });
}

export function TarefasTabs({
  activeTab,
  setActiveTab,
  tarefasPendentes,
  tarefasConcluidas,
  tarefas,
  marcarConcluida,
  abrirDetalhesTarefa,
  abrirEditarTarefa,
  removerTarefa,
  setDialogOpen,
}: TarefasTabsProps) {
  // Estado para filtro de prioridade
  const [filtroPrioridade, setFiltroPrioridade] = useState<string | null>(null);
  
  // Estado para o termo de busca
  const [termoBuscaInput, setTermoBuscaInput] = useState('');
  const termoBusca = useDebounce(termoBuscaInput, 300); // Debounce de 300ms
  
  // Estado para tarefas filtradas
  const [tarefasPendentesFiltradas, setTarefasPendentesFiltradas] = useState<Tarefa[]>(ordenarTarefasPorData(tarefasPendentes));
  const [tarefasConcluidasFiltradas, setTarefasConcluidasFiltradas] = useState<Tarefa[]>(ordenarTarefasPorData(tarefasConcluidas));
  const [estaFiltrando, setEstaFiltrando] = useState(false);
  
  // Atualizar tarefas filtradas quando filtros mudarem
  useEffect(() => {
    // Indicar que estamos filtrando
    setEstaFiltrando(true);

    // Usar um timeout para simular processamento e evitar travamentos na UI
    const filtragem = setTimeout(() => {
      let tarefasFiltradas = [...tarefasPendentes];
      let tarefasConcluidasFiltradas = [...tarefasConcluidas];
      
      // Aplicar filtro de prioridade
      if (filtroPrioridade) {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.prioridade === filtroPrioridade);
        tarefasConcluidasFiltradas = tarefasConcluidasFiltradas.filter(tarefa => tarefa.prioridade === filtroPrioridade);
      }
      
      // Aplicar filtro de busca
      if (termoBusca.trim()) {
        const termoLowerCase = termoBusca.toLowerCase();
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => 
          tarefa.titulo.toLowerCase().includes(termoLowerCase) || 
          (tarefa.descricao && tarefa.descricao.toLowerCase().includes(termoLowerCase))
        );
        tarefasConcluidasFiltradas = tarefasConcluidasFiltradas.filter(tarefa => 
          tarefa.titulo.toLowerCase().includes(termoLowerCase) || 
          (tarefa.descricao && tarefa.descricao.toLowerCase().includes(termoLowerCase))
        );
      }
      
      // Ordenar as tarefas por data
      const tarefasOrdenadasPendentes = ordenarTarefasPorData(tarefasFiltradas);
      const tarefasOrdenadasConcluidas = ordenarTarefasPorData(tarefasConcluidasFiltradas);
      
      setTarefasPendentesFiltradas(tarefasOrdenadasPendentes);
      setTarefasConcluidasFiltradas(tarefasOrdenadasConcluidas);
      setEstaFiltrando(false);
    }, 150); // Pequeno atraso para evitar travamentos na UI

    return () => clearTimeout(filtragem);
  }, [tarefasPendentes, tarefasConcluidas, filtroPrioridade, termoBusca, tarefas]);
  
  // Contagem de tarefas por prioridade
  const contarPorPrioridade = (tarefas: Tarefa[], prioridade: string) => {
    return tarefas.filter(t => t.prioridade === prioridade).length;
  };
  
  // Alternar filtro
  const toggleFiltro = (prioridade: string) => {
    if (filtroPrioridade === prioridade) {
      setFiltroPrioridade(null);
    } else {
      setFiltroPrioridade(prioridade);
    }
  };
  
  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroPrioridade(null);
    setTermoBuscaInput('');
  };

  // Verificar se algum filtro está ativo
  const filtrosAtivos = filtroPrioridade !== null || termoBusca.trim() !== '';
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="pendentes" className="flex items-center gap-2">
          <List className="h-4 w-4" />
          <span>Pendentes</span>
          <span className="ml-1 w-5 h-5 bg-primary/10 text-primary text-xs rounded-full flex items-center justify-center">
            {tarefasPendentes.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="concluidas" className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>Concluídas</span>
          <span className="ml-1 w-5 h-5 bg-primary/10 text-primary text-xs rounded-full flex items-center justify-center">
            {tarefasConcluidas.length}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* Campo de busca */}
      <div className="mt-4 relative">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            className="pl-8 pr-8"
            value={termoBuscaInput}
            onChange={(e) => setTermoBuscaInput(e.target.value)}
            aria-label="Buscar tarefas"
          />
          {termoBuscaInput && (
            <button 
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setTermoBuscaInput('')}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filtros de prioridade */}
      <div className="flex flex-nowrap items-center gap-1.5 mt-4 overflow-x-auto pb-2 sm:flex-wrap sm:gap-2 sm:overflow-x-visible">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Filtrar:</span>
        
        <Button
          variant="outline"
          size="sm"
          className={`px-2 min-w-min whitespace-nowrap flex-shrink-0 sm:px-3 ${filtroPrioridade === 'alta' ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' : ''}`}
          onClick={() => toggleFiltro('alta')}
        >
          <Flag size={12} color={prioridadeCores.alta} className="mr-1" />
          <span>Alta</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1">{contarPorPrioridade(tarefas, 'alta')}</Badge>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className={`px-2 min-w-min whitespace-nowrap flex-shrink-0 sm:px-3 ${filtroPrioridade === 'media' ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' : ''}`}
          onClick={() => toggleFiltro('media')}
        >
          <Flag size={12} color={prioridadeCores.media} className="mr-1" />
          <span>Média</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1">{contarPorPrioridade(tarefas, 'media')}</Badge>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className={`px-2 min-w-min whitespace-nowrap flex-shrink-0 sm:px-3 ${filtroPrioridade === 'baixa' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' : ''}`}
          onClick={() => toggleFiltro('baixa')}
        >
          <Flag size={12} color={prioridadeCores.baixa} className="mr-1" />
          <span>Baixa</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1">{contarPorPrioridade(tarefas, 'baixa')}</Badge>
        </Button>
        
        {filtrosAtivos && (
          <Button
            variant="ghost"
            size="sm"
            onClick={limparFiltros}
            className="text-muted-foreground whitespace-nowrap flex-shrink-0"
          >
            <FilterX size={14} className="mr-1" />
            <span>Limpar filtros</span>
          </Button>
        )}
      </div>
      
      <TabsContent value="pendentes" className="mt-4">
        {estaFiltrando ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filtrosAtivos && tarefasPendentesFiltradas.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa pendente encontrada"
            description="Tente outros filtros ou adicione uma nova tarefa"
            icon={<List className="h-10 w-10" />}
            action={
              <div className="flex gap-2">
                <button 
                  onClick={limparFiltros}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm"
                >
                  Limpar filtros
                </button>
                <button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-azulPrincipal hover:bg-azulPrincipal/90 text-white px-4 py-2 rounded-md text-sm"
                >
                  Adicionar tarefa
                </button>
              </div>
            }
          />
        ) : tarefasPendentes.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa pendente"
            description="Adicione uma nova tarefa para começar"
            icon={<List className="h-10 w-10" />}
            action={
              <button 
                onClick={() => setDialogOpen(true)}
                className="bg-azulPrincipal hover:bg-azulPrincipal/90 text-white px-4 py-2 rounded-md text-sm"
              >
                Adicionar tarefa
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {tarefasPendentesFiltradas.map((tarefa) => (
              <TarefaCard
                key={tarefa.id}
                tarefa={tarefa}
                marcarConcluida={marcarConcluida}
                abrirDetalhesTarefa={abrirDetalhesTarefa}
                abrirEditarTarefa={abrirEditarTarefa}
                removerTarefa={removerTarefa}
              />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="concluidas" className="mt-4">
        {estaFiltrando ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filtrosAtivos && tarefasConcluidasFiltradas.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa concluída encontrada"
            description="Tente outros filtros"
            icon={<Check className="h-10 w-10" />}
            action={
              <button 
                onClick={limparFiltros}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm"
              >
                Limpar filtros
              </button>
            }
          />
        ) : tarefasConcluidas.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa concluída"
            description="Suas tarefas concluídas aparecerão aqui"
            icon={<Check className="h-10 w-10" />}
          />
        ) : (
          <div className="space-y-2">
            {tarefasConcluidasFiltradas.map((tarefa) => (
              <TarefaCard
                key={tarefa.id}
                tarefa={tarefa}
                marcarConcluida={marcarConcluida}
                abrirDetalhesTarefa={abrirDetalhesTarefa}
                abrirEditarTarefa={abrirEditarTarefa}
                removerTarefa={removerTarefa}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
