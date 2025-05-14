import { Tarefa, Categoria } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Busca todas as tarefas do usuário com suas categorias
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
    
    // Mapear dados para o formato da aplicação
    const tarefasFormatadas = tarefasData.map(tarefa => ({
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
      notificar: tarefa.notificar !== undefined ? 
        (tarefa.notificar !== null ? tarefa.notificar : true) : 
        true
    }));
    
    return tarefasFormatadas;
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
  tarefa: Omit<Tarefa, 'id' | 'dataCriacao'>,
  userId: string
): Promise<string | null> => {
  try {
    console.log("Iniciando adição de tarefa", { 
      titulo: tarefa.titulo, 
      categoria: tarefa.categoria?.id || 'sem categoria'
    });
    
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
      .select()
      .single();
    
    if (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa");
      return null;
    }
    
    if (!data) {
      console.error("Nenhum dado retornado ao criar tarefa");
      toast.error("Erro ao criar tarefa");
      return null;
    }
    
    // Registrar sucesso
    console.log("Tarefa criada com sucesso:", data.id);
    
    return data.id;
  } catch (error) {
    console.error("Erro ao adicionar tarefa:", error);
    toast.error("Erro ao adicionar tarefa");
    return null;
  }
};

/**
 * Atualiza uma tarefa existente
 * @param id ID da tarefa a ser atualizada
 * @param tarefaAtualizada Dados parciais da tarefa a serem atualizados
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const atualizarTarefa = async (
  id: string,
  tarefaAtualizada: Partial<Tarefa>,
  userId: string
): Promise<boolean> => {
  try {
    console.log("Atualizando tarefa:", id, tarefaAtualizada);
    
    // Verificar permissão
    const { data: tarefaExistente, error: checkError } = await supabase
      .from('tarefas')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error("Erro ao verificar tarefa:", checkError);
      toast.error("Erro ao verificar permissão para editar tarefa");
      return false;
    }
    
    if (tarefaExistente.user_id !== userId) {
      console.error("Usuário não tem permissão para editar esta tarefa");
      toast.error("Você não tem permissão para editar esta tarefa");
      return false;
    }
    
    // Preparar dados para atualização
    const dadosAtualizados: any = {};
    
    if (tarefaAtualizada.titulo !== undefined) {
      dadosAtualizados.titulo = tarefaAtualizada.titulo;
    }
    
    if (tarefaAtualizada.descricao !== undefined) {
      dadosAtualizados.descricao = tarefaAtualizada.descricao;
    }
    
    if (tarefaAtualizada.data !== undefined) {
      dadosAtualizados.data = tarefaAtualizada.data;
    }
    
    if (tarefaAtualizada.hora !== undefined) {
      dadosAtualizados.hora = tarefaAtualizada.hora;
    }
    
    if (tarefaAtualizada.concluida !== undefined) {
      dadosAtualizados.concluida = tarefaAtualizada.concluida;
    }
    
    if (tarefaAtualizada.prioridade !== undefined) {
      dadosAtualizados.prioridade = tarefaAtualizada.prioridade;
    }
    
    if (tarefaAtualizada.categoria !== undefined) {
      dadosAtualizados.categoria_id = tarefaAtualizada.categoria.id;
    }
    
    if (tarefaAtualizada.notificar !== undefined) {
      dadosAtualizados.notificar = tarefaAtualizada.notificar;
    }
    
    // Atualizar tarefa no Supabase
    const { error: updateError } = await supabase
      .from('tarefas')
      .update(dadosAtualizados)
      .eq('id', id);
    
    if (updateError) {
      console.error("Erro ao atualizar tarefa:", updateError);
      toast.error("Erro ao atualizar tarefa");
      return false;
    }
    
    console.log("Tarefa atualizada com sucesso");
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