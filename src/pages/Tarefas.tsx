import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TarefasTabs } from "@/components/tarefas/TarefasTabs";
import { NovaTarefaDialog } from "@/components/tarefas/NovaTarefaDialog";
import { EditarTarefaDialog } from "@/components/tarefas/EditarTarefaDialog";
import { DetalhesTarefaDialog } from "@/components/tarefas/DetalhesTarefaDialog";
import { useNavigate } from "react-router-dom";
import { useTarefaManager } from "@/hooks/useTarefaManager";

export default function Tarefas() {
  const { tarefas, categorias, marcarConcluida, removerTarefa, user, isLoading } = useApp();
  const navigate = useNavigate();
  
  // Redirecionar para login se não estiver autenticado
  if (!isLoading && !user) {
    toast.error("Você precisa estar logado para acessar esta página");
    navigate("/login");
    return null;
  }
  
  // Usar o hook personalizado para gerenciar tarefas
  const tarefaManager = useTarefaManager();
  
  // Estados locais
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [activeTab, setActiveTab] = useState("pendentes");
  
  // Filtrar tarefas
  const tarefasPendentes = tarefas.filter(t => !t.concluida);
  const tarefasConcluidas = tarefas.filter(t => t.concluida);
  
  // Função para adicionar nova tarefa
  const handleAddTarefa = async (notificar: boolean = true, prioridade: 'baixa' | 'media' | 'alta' = 'media') => {
    if (!novoTitulo || !novaData || !novaCategoria) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    console.log("Adicionando tarefa com data:", novaData, "e hora:", novaHora);
    console.log("Prioridade selecionada:", prioridade);

    try {
      const resultado = await tarefaManager.handleAddTarefa(
        novoTitulo,
        novaDescricao,
        novaData,
        novaHora,
        novaCategoria,
        notificar,
        prioridade
      );

      if (resultado) {
        // Limpar campos
        setNovoTitulo("");
        setNovaDescricao("");
        setNovaData("");
        setNovaHora("");
        setNovaCategoria("");
        
        tarefaManager.setDialogOpen(false);
      }
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Ocorreu um erro ao adicionar a tarefa. Tente novamente.");
    }
  };

  // Exibir indicador de carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azulPrincipal"></div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <PageHeader 
        title="Tarefas" 
        description="Gerencie suas tarefas e atividades"
      >
        <div className="flex gap-2 items-center">
          <Button 
            className="bg-azulPrincipal hover:bg-azulPrincipal/90" 
            onClick={() => tarefaManager.setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </PageHeader>

      <NovaTarefaDialog 
        open={tarefaManager.dialogOpen}
        onOpenChange={tarefaManager.setDialogOpen}
        categorias={categorias}
        onAddTarefa={handleAddTarefa}
        novoTitulo={novoTitulo}
        setNovoTitulo={setNovoTitulo}
        novaDescricao={novaDescricao}
        setNovaDescricao={setNovaDescricao}
        novaData={novaData}
        setNovaData={setNovaData}
        novaHora={novaHora}
        setNovaHora={setNovaHora}
        novaCategoria={novaCategoria}
        setNovaCategoria={setNovaCategoria}
      />
      
      <EditarTarefaDialog
        open={tarefaManager.dialogEditarOpen}
        onOpenChange={tarefaManager.setDialogEditarOpen}
        tarefa={tarefaManager.tarefaEditando}
        categorias={categorias}
        onSaveChanges={tarefaManager.salvarEdicaoTarefa}
      />
      
      <DetalhesTarefaDialog 
        open={tarefaManager.dialogDetalhesOpen}
        onOpenChange={tarefaManager.setDialogDetalhesOpen}
        tarefa={tarefaManager.tarefaDetalhes}
      />

      <TarefasTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tarefasPendentes={tarefasPendentes}
        tarefasConcluidas={tarefasConcluidas}
        tarefas={tarefas}
        marcarConcluida={marcarConcluida}
        abrirDetalhesTarefa={tarefaManager.abrirDetalhesTarefa}
        abrirEditarTarefa={tarefaManager.abrirEditarTarefa}
        removerTarefa={removerTarefa}
        setDialogOpen={tarefaManager.setDialogOpen}
      />
    </div>
  );
}
