import { useState } from 'react';
import { Tarefa, Anexo } from '@/types';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { adicionarAnexoEmMemoria, atualizarAnexoEmMemoria, removerAnexoEmMemoria } from '@/services/anexoService';

/**
 * Hook personalizado para gerenciar tarefas e seus anexos
 */
export function useTarefaManager() {
  const { tarefas, adicionarTarefa, marcarConcluida, removerTarefa, atualizarTarefa } = useApp();
  
  const [tarefaDetalhes, setTarefaDetalhes] = useState<Tarefa | null>(null);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [anexoEditando, setAnexoEditando] = useState<string | null>(null);
  const [novoNomeAnexo, setNovoNomeAnexo] = useState<string>('');
  
  // Diálogos
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState<boolean>(false);
  const [dialogAnexoOpen, setDialogAnexoOpen] = useState<boolean>(false);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState<boolean>(false);
  
  /**
   * Adiciona uma nova tarefa
   */
  const handleAddTarefa = (
    titulo: string,
    descricao: string,
    data: string,
    hora: string,
    categoriaId: string,
    notificar: boolean = true
  ) => {
    if (!titulo || !data || !categoriaId) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    
    try {
      adicionarTarefa({
        titulo,
        descricao: descricao || undefined,
        concluida: false,
        data,
        hora: hora || undefined,
        categoria: tarefas.find(t => t.id === categoriaId)?.categoria || { id: '', nome: '', cor: '' },
        anexos,
        prioridade: 'media',
        notificar
      });
      
      // Limpar anexos
      setAnexos([]);
      
      toast.success('Tarefa adicionada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('Erro ao adicionar tarefa. Tente novamente.');
      return false;
    }
  };
  
  /**
   * Abre o diálogo de edição de anexo
   */
  const abrirEdicaoAnexo = (anexo: Anexo) => {
    setAnexoEditando(anexo.id);
    setNovoNomeAnexo(anexo.nome);
    setDialogAnexoOpen(true);
  };
  
  /**
   * Salva a edição de um anexo
   */
  const salvarEdicaoAnexo = () => {
    if (!anexoEditando || !novoNomeAnexo.trim()) return;
    
    setAnexos(atualizarAnexoEmMemoria(anexos, anexoEditando, novoNomeAnexo));
    
    setDialogAnexoOpen(false);
    setAnexoEditando(null);
    setNovoNomeAnexo('');
  };
  
  /**
   * Remove um anexo de uma tarefa existente
   */
  const removerAnexoTarefa = (tarefaId: string, anexoId: string) => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return;
    
    const novosAnexos = tarefa.anexos ? removerAnexoEmMemoria(tarefa.anexos, anexoId) : [];
    atualizarTarefa(tarefaId, { anexos: novosAnexos });
  };
  
  /**
   * Edita um anexo de uma tarefa existente
   */
  const editarAnexoTarefa = (tarefaId: string, anexoId: string, novoNome: string) => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa || !tarefa.anexos) return;
    
    const novosAnexos = atualizarAnexoEmMemoria(tarefa.anexos, anexoId, novoNome);
    
    atualizarTarefa(tarefaId, { anexos: novosAnexos });
    
    setDialogAnexoOpen(false);
    setAnexoEditando(null);
    setNovoNomeAnexo('');
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
  
  /**
   * Manipula a edição de anexos no diálogo de detalhes
   */
  const handleEditarAnexoNoDetalhe = (anexoId: string, nome: string) => {
    if (!tarefaDetalhes) return;
    
    setAnexoEditando(anexoId);
    setNovoNomeAnexo(nome);
    setDialogAnexoOpen(true);
  };
  
  /**
   * Manipula a remoção de anexos no diálogo de detalhes
   */
  const handleRemoverAnexoNoDetalhe = (anexoId: string) => {
    if (!tarefaDetalhes) return;
    
    removerAnexoTarefa(tarefaDetalhes.id, anexoId);
  };
  
  /**
   * Adiciona um anexo à lista temporária
   */
  const adicionarAnexoTemp = (novoAnexo: Anexo) => {
    setAnexos(adicionarAnexoEmMemoria(anexos, novoAnexo));
  };
  
  return {
    // Estados
    tarefaDetalhes,
    tarefaEditando,
    anexos,
    anexoEditando,
    novoNomeAnexo,
    dialogOpen,
    dialogEditarOpen,
    dialogAnexoOpen,
    dialogDetalhesOpen,
    
    // Setters
    setAnexos,
    setNovoNomeAnexo,
    setDialogOpen,
    setDialogEditarOpen,
    setDialogAnexoOpen, 
    setDialogDetalhesOpen,
    
    // Ações de tarefas
    handleAddTarefa,
    abrirDetalhesTarefa,
    abrirEditarTarefa,
    salvarEdicaoTarefa,
    
    // Ações de anexos
    abrirEdicaoAnexo,
    salvarEdicaoAnexo,
    editarAnexoTarefa,
    removerAnexoTarefa,
    handleEditarAnexoNoDetalhe,
    handleRemoverAnexoNoDetalhe,
    adicionarAnexoTemp
  };
} 