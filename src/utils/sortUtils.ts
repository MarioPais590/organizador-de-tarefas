import { Tarefa } from "@/types";

/**
 * Ordena tarefas por data em ordem crescente (da mais próxima para a mais distante)
 * 
 * @param tarefas Lista de tarefas para ordenar
 * @returns Lista ordenada de tarefas
 */
export function ordenarTarefasPorData(tarefas: Tarefa[]): Tarefa[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Normaliza para início do dia
  
  return [...tarefas].sort((a, b) => {
    // Filtra tarefas sem data para o final
    if (!a.data) return 1;
    if (!b.data) return -1;
    
    // Converter strings de data para objetos Date
    const dataA = new Date(a.data);
    const dataB = new Date(b.data);
    
    // Comparar as datas
    if (dataA < dataB) return -1;
    if (dataA > dataB) return 1;
    
    // Se as datas forem iguais, ordenar por hora (se houver)
    if (a.hora && b.hora) {
      if (a.hora < b.hora) return -1;
      if (a.hora > b.hora) return 1;
    } else if (a.hora) {
      return -1; // Tarefas com hora vêm antes das sem hora
    } else if (b.hora) {
      return 1;
    }
    
    // Se datas e horas forem iguais, priorizar tarefas pendentes
    if (!a.concluida && b.concluida) return -1;
    if (a.concluida && !b.concluida) return 1;
    
    // Se tudo for igual, manter a ordem original
    return 0;
  });
}

/**
 * Separa e ordena tarefas entre pendentes e concluídas
 * 
 * @param tarefas Lista de tarefas para processar
 * @param limite Número máximo de tarefas a retornar (opcional)
 * @returns Lista de tarefas ordenadas (pendentes primeiro, depois concluídas)
 */
export function processarTarefasRecentes(tarefas: Tarefa[], limite?: number): Tarefa[] {
  // Separar tarefas pendentes e concluídas
  const tarefasPendentes = tarefas.filter(t => !t.concluida);
  const tarefasConcluidas = tarefas.filter(t => t.concluida);
  
  // Ordenar ambos os grupos por data
  const tarefasPendentesOrdenadas = ordenarTarefasPorData(tarefasPendentes);
  const tarefasConcluidasOrdenadas = ordenarTarefasPorData(tarefasConcluidas);
  
  // Combinar tarefas pendentes e concluídas ordenadas, priorizando pendentes
  const resultado = [...tarefasPendentesOrdenadas, ...tarefasConcluidasOrdenadas];
  
  // Aplicar limite se fornecido
  return limite ? resultado.slice(0, limite) : resultado;
} 