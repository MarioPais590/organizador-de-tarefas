import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Anexo } from "@/types";
import { TarefasTabs } from "@/components/tarefas/TarefasTabs";
import { NovaTarefaDialog } from "@/components/tarefas/NovaTarefaDialog";
import { EditarTarefaDialog } from "@/components/tarefas/EditarTarefaDialog";
import { EditarAnexoDialog } from "@/components/tarefas/EditarAnexoDialog";
import { DetalhesTarefaDialog } from "@/components/tarefas/DetalhesTarefaDialog";
import { useNavigate } from "react-router-dom";

export default function Tarefas() {
  const { tarefas, categorias, adicionarTarefa, marcarConcluida, removerTarefa, atualizarTarefa, user, isLoading } = useApp();
  const navigate = useNavigate();
  
  // Redirecionar para login se não estiver autenticado
  if (!isLoading && !user) {
    toast.error("Você precisa estar logado para acessar esta página");
    navigate("/login");
    return null;
  }
  
  const tarefasPendentes = tarefas.filter(t => !t.concluida);
  const tarefasConcluidas = tarefas.filter(t => t.concluida);
  
  // Estado para nova tarefa
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pendentes");
  
  // Estados para gerenciamento de anexos
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  
  // Estados para edição de anexos
  const [anexoEditando, setAnexoEditando] = useState<string | null>(null);
  const [novoNomeAnexo, setNovoNomeAnexo] = useState("");
  const [dialogAnexoOpen, setDialogAnexoOpen] = useState(false);
  
  // Estado para visualização detalhada de tarefa
  const [tarefaDetalhes, setTarefaDetalhes] = useState<any | null>(null);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false);
  
  // Estado para edição de tarefa
  const [tarefaEditando, setTarefaEditando] = useState<any | null>(null);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);

  const handleAddTarefa = (notificar: boolean = true) => {
    if (!novoTitulo || !novaData || !novaCategoria) return;

    const categoria = categorias.find(c => c.id === novaCategoria);
    if (!categoria) return;

    console.log("Adicionando tarefa com data:", novaData, "e hora:", novaHora, "notificar:", notificar);

    try {
      // Adicionar tarefa com os dados corretos
      adicionarTarefa({
        titulo: novoTitulo,
        descricao: novaDescricao || undefined,
        concluida: false,
        data: novaData,
        hora: novaHora || undefined,
        categoria,
        anexos: anexos,
        prioridade: 'media',
        notificar: notificar
      });

      // Limpar campos
      setNovoTitulo("");
      setNovaDescricao("");
      setNovaData("");
      setNovaHora("");
      setNovaCategoria("");
      setAnexos([]);
      setDialogOpen(false);
      
      toast.success("Tarefa adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Erro ao adicionar tarefa. Tente novamente.");
    }
  };

  const abrirEdicaoAnexo = (anexo: Anexo) => {
    setAnexoEditando(anexo.id);
    setNovoNomeAnexo(anexo.nome);
    setDialogAnexoOpen(true);
  };
  
  const salvarEdicaoAnexo = () => {
    if (!anexoEditando || !novoNomeAnexo.trim()) return;
    
    setAnexos(anexos.map(a => {
      if (a.id === anexoEditando) {
        return { ...a, nome: novoNomeAnexo };
      }
      return a;
    }));
    
    setDialogAnexoOpen(false);
    setAnexoEditando(null);
    setNovoNomeAnexo("");
  };
  
  const removerAnexoTarefa = (tarefaId: string, anexoId: string) => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return;
    
    const novosAnexos = tarefa.anexos ? tarefa.anexos.filter(a => a.id !== anexoId) : [];
    atualizarTarefa(tarefaId, { anexos: novosAnexos });
  };
  
  const editarAnexoTarefa = (tarefaId: string, anexoId: string, novoNome: string) => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa || !tarefa.anexos) return;
    
    const novosAnexos = tarefa.anexos.map(a => {
      if (a.id === anexoId) {
        return { ...a, nome: novoNome };
      }
      return a;
    });
    
    atualizarTarefa(tarefaId, { anexos: novosAnexos });
    setDialogAnexoOpen(false);
    setAnexoEditando(null);
    setNovoNomeAnexo("");
  };
  
  const abrirDetalhesTarefa = (tarefa: any) => {
    setTarefaDetalhes(tarefa);
    setDialogDetalhesOpen(true);
  };
  
  const abrirEditarTarefa = (tarefa: any) => {
    console.log("Abrindo edição da tarefa:", tarefa);
    setTarefaEditando(tarefa);
    setDialogEditarOpen(true);
  };
  
  const salvarEdicaoTarefa = (id: string, tarefaAtualizada: Partial<any>) => {
    try {
      console.log("Salvando edição da tarefa:", id, tarefaAtualizada);
      atualizarTarefa(id, tarefaAtualizada);
      setDialogEditarOpen(false);
      setTarefaEditando(null);
      toast.success("Tarefa atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa. Tente novamente.");
    }
  };

  const handleEditarAnexoNoDetalhe = (anexoId: string, nome: string) => {
    if (!tarefaDetalhes) return;
    setAnexoEditando(anexoId);
    setNovoNomeAnexo(nome);
    setDialogAnexoOpen(true);
  };

  const handleRemoverAnexoNoDetalhe = (anexoId: string) => {
    if (!tarefaDetalhes) return;
    removerAnexoTarefa(tarefaDetalhes.id, anexoId);
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
          <Button className="bg-azulPrincipal hover:bg-azulPrincipal/90" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </PageHeader>

      <NovaTarefaDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
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
        anexos={anexos}
        setAnexos={setAnexos}
        abrirEdicaoAnexo={abrirEdicaoAnexo}
      />
      
      <EditarTarefaDialog
        open={dialogEditarOpen}
        onOpenChange={setDialogEditarOpen}
        tarefa={tarefaEditando}
        categorias={categorias}
        onSaveChanges={salvarEdicaoTarefa}
        abrirEdicaoAnexo={abrirEdicaoAnexo}
      />
      
      <EditarAnexoDialog 
        open={dialogAnexoOpen}
        onOpenChange={setDialogAnexoOpen}
        novoNomeAnexo={novoNomeAnexo}
        setNovoNomeAnexo={setNovoNomeAnexo}
        onSalvarEdicao={anexoEditando && tarefaDetalhes 
          ? () => editarAnexoTarefa(tarefaDetalhes.id, anexoEditando, novoNomeAnexo)
          : salvarEdicaoAnexo
        }
      />
      
      <DetalhesTarefaDialog 
        open={dialogDetalhesOpen}
        onOpenChange={setDialogDetalhesOpen}
        tarefa={tarefaDetalhes}
        onEditarAnexo={handleEditarAnexoNoDetalhe}
        onRemoverAnexo={handleRemoverAnexoNoDetalhe}
      />

      <TarefasTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tarefasPendentes={tarefasPendentes}
        tarefasConcluidas={tarefasConcluidas}
        tarefas={tarefas}
        marcarConcluida={marcarConcluida}
        abrirDetalhesTarefa={abrirDetalhesTarefa}
        abrirEditarTarefa={abrirEditarTarefa}
        removerTarefa={removerTarefa}
        setDialogOpen={setDialogOpen}
      />
    </div>
  );
}
