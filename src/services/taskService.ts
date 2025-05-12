import { Tarefa, Categoria, Anexo } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Busca todas as tarefas do usuário com suas categorias e anexos
 * @param userId ID do usuário logado
 * @returns Array de tarefas com dados completos
 */
export const buscarTarefas = async (userId: string): Promise<Tarefa[]> => {
  try {
    // Carregar tarefas com categorias
    const { data: tarefasData, error: tarefasError } = await supabase
      .from('tarefas')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .eq('user_id', userId);
    
    if (tarefasError) throw tarefasError;
    
    if (!tarefasData || tarefasData.length === 0) {
      return [];
    }
    
    // Buscar anexos para cada tarefa
    const tarefasComAnexos = await Promise.all(tarefasData.map(async (tarefa) => {
      const { data: anexosData } = await supabase
        .from('tarefa_anexos')
        .select(`
          anexos(*)
        `)
        .eq('tarefa_id', tarefa.id);
      
      const anexos = anexosData ? anexosData.map(item => item.anexos) : [];
      
      return {
        id: tarefa.id,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || undefined,
        dataCriacao: new Date(tarefa.data_criacao),
        data: tarefa.data,
        hora: tarefa.hora || undefined,
        categoria: {
          id: tarefa.categoria.id,
          nome: tarefa.categoria.nome,
          cor: tarefa.categoria.cor
        },
        prioridade: tarefa.prioridade as 'baixa' | 'media' | 'alta',
        concluida: tarefa.concluida,
        anexos: anexos,
        notificar: tarefa.notificar !== undefined ? 
          (tarefa.notificar !== null ? tarefa.notificar : true) : 
          true
      };
    }));
    
    return tarefasComAnexos;
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    toast.error("Erro ao buscar suas tarefas");
    return [];
  }
};

/**
 * Adiciona uma nova tarefa no banco de dados
 * @param tarefa Dados da tarefa a ser adicionada
 * @param userId ID do usuário logado
 * @returns ID da tarefa criada em caso de sucesso, null em caso de erro
 */
export const adicionarTarefa = async (
  tarefa: Omit<Tarefa, 'id' | 'dataCriacao' | 'anexos'>,
  userId: string
): Promise<string | null> => {
  try {
    // Dados para inserir no Supabase
    const novaTarefa = {
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      data: tarefa.data,
      hora: tarefa.hora,
      categoria_id: tarefa.categoria.id,
      prioridade: tarefa.prioridade,
      concluida: tarefa.concluida,
      notificar: tarefa.notificar !== undefined ? tarefa.notificar : true,
      user_id: userId,
      data_criacao: new Date().toISOString()
    };
    
    // Adicionar tarefa no Supabase
    const { data, error } = await supabase
      .from('tarefas')
      .insert(novaTarefa)
      .select('id')
      .single();
    
    if (error) throw error;
    
    return data?.id || null;
  } catch (error) {
    console.error("Erro ao adicionar tarefa:", error);
    toast.error("Erro ao adicionar nova tarefa");
    return null;
  }
};

/**
 * Atualiza uma tarefa existente no banco de dados
 * @param id ID da tarefa a ser atualizada
 * @param tarefaAtualizada Dados da tarefa a serem atualizados
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const atualizarTarefa = async (
  id: string,
  tarefaAtualizada: Partial<Tarefa>,
  userId: string
): Promise<boolean> => {
  try {
    // Dados para atualizar no Supabase
    const dadosAtualizar: any = {};
    
    if (tarefaAtualizada.titulo !== undefined) dadosAtualizar.titulo = tarefaAtualizada.titulo;
    if (tarefaAtualizada.descricao !== undefined) dadosAtualizar.descricao = tarefaAtualizada.descricao;
    if (tarefaAtualizada.data !== undefined) dadosAtualizar.data = tarefaAtualizada.data;
    if (tarefaAtualizada.hora !== undefined) dadosAtualizar.hora = tarefaAtualizada.hora;
    if (tarefaAtualizada.concluida !== undefined) dadosAtualizar.concluida = tarefaAtualizada.concluida;
    if (tarefaAtualizada.prioridade !== undefined) dadosAtualizar.prioridade = tarefaAtualizada.prioridade;
    if (tarefaAtualizada.categoria !== undefined) dadosAtualizar.categoria_id = tarefaAtualizada.categoria.id;
    
    // Tratar o campo notificar de maneira segura para diferentes ambientes
    try {
      if (tarefaAtualizada.notificar !== undefined) {
        dadosAtualizar.notificar = tarefaAtualizada.notificar;
      }
    } catch (notificarError) {
      console.warn("Campo notificar não suportado neste ambiente, ignorando", notificarError);
    }
    
    // Atualizar tarefa no Supabase
    const { error } = await supabase
      .from('tarefas')
      .update(dadosAtualizar)
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    toast.error("Erro ao atualizar tarefa");
    return false;
  }
};

/**
 * Remove uma tarefa do banco de dados
 * @param id ID da tarefa a ser removida
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const removerTarefa = async (id: string, userId: string): Promise<boolean> => {
  try {
    // Primeiro, remover os anexos relacionados
    const { error: anexosError } = await supabase
      .from('tarefa_anexos')
      .delete()
      .eq('tarefa_id', id);
    
    if (anexosError) throw anexosError;
    
    // Remover a tarefa
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao remover tarefa:", error);
    toast.error("Erro ao remover tarefa");
    return false;
  }
};

/**
 * Marca uma tarefa como concluída ou não concluída
 * @param id ID da tarefa
 * @param concluida Status de conclusão (true/false)
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const marcarConcluida = async (
  id: string,
  concluida: boolean,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status da tarefa:", error);
    toast.error("Erro ao atualizar status da tarefa");
    return false;
  }
}; 