import { Categoria } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Busca todas as categorias do usuário
 * @param userId ID do usuário logado
 * @returns Array de categorias
 */
export const buscarCategorias = async (userId: string): Promise<Categoria[]> => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', userId)
      .order('nome');
    
    if (error) throw error;
    
    return data.map(categoria => ({
      id: categoria.id,
      nome: categoria.nome,
      cor: categoria.cor
    }));
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    toast.error("Erro ao buscar suas categorias");
    return [];
  }
};

/**
 * Adiciona uma nova categoria
 * @param nome Nome da categoria
 * @param cor Cor da categoria
 * @param userId ID do usuário logado
 * @returns ID da categoria criada em caso de sucesso, null em caso de erro
 */
export const adicionarCategoria = async (
  nome: string,
  cor: string,
  userId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nome,
        cor,
        user_id: userId
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    return data?.id || null;
  } catch (error) {
    console.error("Erro ao adicionar categoria:", error);
    toast.error("Erro ao adicionar nova categoria");
    return null;
  }
};

/**
 * Atualiza uma categoria existente
 * @param id ID da categoria
 * @param nome Novo nome da categoria
 * @param cor Nova cor da categoria
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const atualizarCategoria = async (
  id: string,
  nome: string,
  cor: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('categorias')
      .update({ nome, cor })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    toast.error("Erro ao atualizar categoria");
    return false;
  }
};

/**
 * Remove uma categoria do banco de dados
 * @param id ID da categoria a ser removida
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const removerCategoria = async (
  id: string,
  userId: string
): Promise<boolean> => {
  try {
    // Verificar se a categoria está sendo usada em alguma tarefa
    const { data: tarefas, error: tarefasError } = await supabase
      .from('tarefas')
      .select('id')
      .eq('categoria_id', id)
      .eq('user_id', userId);
    
    if (tarefasError) throw tarefasError;
    
    if (tarefas && tarefas.length > 0) {
      toast.error(`Esta categoria está sendo usada em ${tarefas.length} tarefa(s) e não pode ser removida.`);
      return false;
    }
    
    // Remover a categoria
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    toast.error("Erro ao remover categoria");
    return false;
  }
}; 