import { useState } from 'react';
import { Tarefa } from '@/types';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

/**
 * Hook personalizado para gerenciar tarefas
 */
export function useTarefaManager() {
  const { tarefas, adicionarTarefa, marcarConcluida, removerTarefa, atualizarTarefa } = useApp();
  
  const [tarefaDetalhes, setTarefaDetalhes] = useState<Tarefa | null>(null);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  
  // Diálogos
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState<boolean>(false);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState<boolean>(false);
  
  /**
   * Adiciona uma nova tarefa
   */
  const handleAddTarefa = async (
    titulo: string,
    descricao: string,
    data: string,
    hora: string,
    categoriaId: string,
    notificar: boolean = true,
    prioridade: 'baixa' | 'media' | 'alta' = 'media'
  ): Promise<boolean> => {
    if (!titulo || !data || !categoriaId) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    
    try {
      // Encontrar a categoria correta pelo ID
      const categoriaEncontrada = tarefas.find(t => t.categoria?.id === categoriaId)?.categoria;
      
      // Se não encontrou nas tarefas existentes, buscar no contexto global
      const categoria = categoriaEncontrada || 
                      { id: categoriaId, nome: 'Categoria', cor: '#3b82f6' };
      
      await adicionarTarefa({
        titulo,
        descricao: descricao || undefined,
        concluida: false,
        data,
        hora: hora || undefined,
        categoria,
        prioridade,
        notificar
      });
      
      toast.success('Tarefa adicionada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('Erro ao adicionar tarefa. Tente novamente.');
      return false;
    }
  };
  
  /**
   * Abre o diálogo de detalhes da tarefa
   */
  const abrirDetalhesTarefa = (tarefa: Tarefa) => {
    setTarefaDetalhes(tarefa);
    setDialogDetalhesOpen(true);
  };
  
  /**
   * Abre o diálogo de edição de tarefa
   */
  const abrirEditarTarefa = (tarefa: Tarefa) => {
    setTarefaEditando(tarefa);
    setDialogEditarOpen(true);
  };
  
  /**
   * Salva as alterações em uma tarefa
   */
  const salvarEdicaoTarefa = (id: string, tarefaAtualizada: Partial<Tarefa>) => {
    try {
      atualizarTarefa(id, tarefaAtualizada);
      setDialogEditarOpen(false);
      setTarefaEditando(null);
      toast.success('Tarefa atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa. Tente novamente.');
      return false;
    }
  };
  
  return {
    // Estados
    tarefaDetalhes,
    tarefaEditando,
    dialogOpen,
    dialogEditarOpen,
    dialogDetalhesOpen,
    
    // Setters
    setDialogOpen,
    setDialogEditarOpen,
    setDialogDetalhesOpen,
    
    // Ações de tarefas
    handleAddTarefa,
    abrirDetalhesTarefa,
    abrirEditarTarefa,
    salvarEdicaoTarefa
  };
}