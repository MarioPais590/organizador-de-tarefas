import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tarefa, Categoria } from '@/types';
import { buscarTarefas, adicionarTarefa, atualizarTarefa, removerTarefa, marcarConcluida } from '@/services/taskService';
import { buscarCategorias, adicionarCategoria, atualizarCategoria, removerCategoria } from '@/services/categoriaService';
import { toast } from 'sonner';

interface TaskContextProps {
  tarefas: Tarefa[];
  categorias: Categoria[];
  isLoadingTarefas: boolean;
  isLoadingCategorias: boolean;
  buscarTodasTarefas: (userId: string) => Promise<void>;
  buscarTodasCategorias: (userId: string) => Promise<void>;
  adicionarNovaTarefa: (tarefa: Omit<Tarefa, 'id' | 'dataCriacao'>, userId: string) => Promise<string | null>;
  atualizarTarefaExistente: (id: string, tarefa: Partial<Tarefa>, userId: string) => Promise<boolean>;
  removerTarefaExistente: (id: string, userId: string) => Promise<boolean>;
  marcarTarefaConcluida: (id: string, concluida: boolean, userId: string) => Promise<boolean>;
  adicionarNovaCategoria: (nome: string, cor: string, userId: string) => Promise<string | null>;
  atualizarCategoriaExistente: (id: string, nome: string, cor: string, userId: string) => Promise<boolean>;
  removerCategoriaExistente: (id: string, userId: string) => Promise<boolean>;
}

const TaskContext = createContext<TaskContextProps | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoadingTarefas, setIsLoadingTarefas] = useState(true);
  const [isLoadingCategorias, setIsLoadingCategorias] = useState(true);

  const buscarTodasTarefas = async (userId: string) => {
    try {
      setIsLoadingTarefas(true);
      const tarefasData = await buscarTarefas(userId);
      setTarefas(tarefasData);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      toast.error("Não foi possível carregar suas tarefas");
    } finally {
      setIsLoadingTarefas(false);
    }
  };

  const buscarTodasCategorias = async (userId: string) => {
    try {
      setIsLoadingCategorias(true);
      const categoriasData = await buscarCategorias(userId);
      setCategorias(categoriasData);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      toast.error("Não foi possível carregar suas categorias");
    } finally {
      setIsLoadingCategorias(false);
    }
  };

  const adicionarNovaTarefa = async (tarefa: Omit<Tarefa, 'id' | 'dataCriacao'>, userId: string) => {
    try {
      const tarefaId = await adicionarTarefa(tarefa, userId);
      if (tarefaId) {
        // Recarregar lista de tarefas
        await buscarTodasTarefas(userId);
        return tarefaId;
      }
      return null;
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Erro ao adicionar nova tarefa");
      return null;
    }
  };

  const atualizarTarefaExistente = async (id: string, tarefa: Partial<Tarefa>, userId: string) => {
    try {
      const success = await atualizarTarefa(id, tarefa, userId);
      if (success) {
        // Recarregar lista de tarefas
        await buscarTodasTarefas(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
      return false;
    }
  };

  const removerTarefaExistente = async (id: string, userId: string) => {
    try {
      const success = await removerTarefa(id, userId);
      if (success) {
        // Recarregar lista de tarefas
        await buscarTodasTarefas(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao remover tarefa:", error);
      toast.error("Erro ao remover tarefa");
      return false;
    }
  };

  const marcarTarefaConcluida = async (id: string, concluida: boolean, userId: string) => {
    try {
      const success = await marcarConcluida(id, concluida, userId);
      if (success) {
        // Recarregar lista de tarefas
        await buscarTodasTarefas(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao marcar tarefa como concluída:", error);
      toast.error("Erro ao atualizar status da tarefa");
      return false;
    }
  };

  const adicionarNovaCategoria = async (nome: string, cor: string, userId: string) => {
    try {
      const categoriaId = await adicionarCategoria(nome, cor, userId);
      if (categoriaId) {
        // Recarregar lista de categorias
        await buscarTodasCategorias(userId);
        return categoriaId;
      }
      return null;
    } catch (error) {
      console.error("Erro ao adicionar categoria:", error);
      toast.error("Erro ao adicionar nova categoria");
      return null;
    }
  };

  const atualizarCategoriaExistente = async (id: string, nome: string, cor: string, userId: string) => {
    try {
      const success = await atualizarCategoria(id, nome, cor, userId);
      if (success) {
        // Recarregar lista de categorias
        await buscarTodasCategorias(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      toast.error("Erro ao atualizar categoria");
      return false;
    }
  };

  const removerCategoriaExistente = async (id: string, userId: string) => {
    try {
      const success = await removerCategoria(id, userId);
      if (success) {
        // Recarregar lista de categorias
        await buscarTodasCategorias(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao remover categoria:", error);
      toast.error("Erro ao remover categoria");
      return false;
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tarefas,
        categorias,
        isLoadingTarefas,
        isLoadingCategorias,
        buscarTodasTarefas,
        buscarTodasCategorias,
        adicionarNovaTarefa,
        atualizarTarefaExistente,
        removerTarefaExistente,
        marcarTarefaConcluida,
        adicionarNovaCategoria,
        atualizarCategoriaExistente,
        removerCategoriaExistente
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask deve ser usado dentro de um TaskProvider');
  }
  return context;
}; 