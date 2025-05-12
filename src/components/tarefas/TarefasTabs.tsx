
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TarefaCard } from "./TarefaCard";
import { EmptyState } from "@/components/EmptyState";
import { List, Check } from "lucide-react";
import { Tarefa } from "@/types";

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
      
      <TabsContent value="pendentes" className="mt-6">
        {tarefasPendentes.length === 0 ? (
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
            {tarefasPendentes.map((tarefa) => (
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
      
      <TabsContent value="concluidas" className="mt-6">
        {tarefasConcluidas.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa concluída"
            description="Suas tarefas concluídas aparecerão aqui"
            icon={<Check className="h-10 w-10" />}
          />
        ) : (
          <div className="space-y-2">
            {tarefasConcluidas.map((tarefa) => (
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
