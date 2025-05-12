import { Tarefa, ConfiguracoesNotificacao } from '@/types';
import { toast } from 'sonner';
import { formatarTempo } from '@/utils/dateUtils';

// Extend Window interface para incluir nossas propriedades customizadas
declare global {
  interface Window {
    notificacaoIntervalId?: ReturnType<typeof setInterval>;
    notificacaoUltimasNotificadas: Record<string, number>;
    debugNotificacoes?: boolean;
  }
}

// Inicializar o registro de notificações já enviadas
if (typeof window !== 'undefined') {
  window.notificacaoUltimasNotificadas = window.notificacaoUltimasNotificadas || {};
  window.debugNotificacoes = true; // Habilitar modo de depuração
}

// Variável global para rastrear se a permissão já foi solicitada nesta sessão
let permissaoJaSolicitada = false;

/**
 * Solicita permissão para enviar notificações ao usuário
 * @returns Promessa que resolve para true se a permissão foi concedida
 */
export const solicitarPermissaoNotificacao = async (): Promise<boolean> => {
  // Verificar se o navegador suporta notificações
  if (!("Notification" in window)) {
    console.error("Este navegador não suporta notificações desktop");
    toast.error("Seu navegador não suporta notificações desktop");
    return false;
  }
  
  const permissionStatus = Notification.permission as string;
  
  // Se já temos permissão, retornar
  if (permissionStatus === "granted") {
    return true;
  }
  
  // Se já negada, avisar mas não solicitar novamente
  if (permissionStatus === "denied") {
    console.warn("Permissão para notificações foi negada");
    toast.warning(
      "Permissões de notificação estão bloqueadas. Você precisa permitir notificações nas configurações do navegador."
    );
    return false;
  }
  
  // Evitar solicitar muitas vezes na mesma sessão
  if (permissaoJaSolicitada) {
    // Usar Notification.permission diretamente
    return (Notification.permission as string) === "granted";
  }
  
  // Solicitar permissão
  try {
    permissaoJaSolicitada = true;
    const permissao = await Notification.requestPermission();
    return permissao === "granted";
  } catch (error) {
    console.error("Erro ao solicitar permissão para notificações:", error);
    toast.error("Não foi possível solicitar permissão para notificações");
    return false;
  }
};

/**
 * Reproduz um som de notificação
 */
export const reproduzirSomNotificacao = (): void => {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.warn('Erro ao reproduzir som:', e));
  } catch (error) {
    console.warn("Erro ao reproduzir som de notificação:", error);
  }
};

/**
 * Inicia o serviço de verificação periódica de notificações
 * @param verificarTarefasPendentes Callback que verifica tarefas pendentes
 */
export const iniciarServicoNotificacoes = (
  verificarTarefasPendentes: () => void
): void => {
  // Verificar se o navegador suporta notificações
  if (!("Notification" in window)) {
    console.error("Este navegador não suporta notificações desktop");
    return;
  }
  
  // Verificar tarefas imediatamente após iniciar
  verificarTarefasPendentes();
  
  // Parar qualquer serviço anterior se existir
  pararServicoNotificacoes();
  
  // Iniciar verificação periódica a cada 10 segundos
  const intervalId = setInterval(() => {
    verificarTarefasPendentes();
  }, 10000); // Reduzido para 10 segundos para maior precisão
  
  // Armazenar o ID do intervalo para poder limpar depois
  window.notificacaoIntervalId = intervalId;
  
  console.log("Serviço de notificações iniciado com sucesso!");
};

/**
 * Para o serviço de verificação periódica de notificações
 */
export const pararServicoNotificacoes = (): void => {
  if (window.notificacaoIntervalId) {
    clearInterval(window.notificacaoIntervalId);
    window.notificacaoIntervalId = undefined;
    console.log("Serviço de notificações parado com sucesso!");
  }
};

/**
 * Converte uma string de data e hora em um objeto Date
 * @param data String de data no formato YYYY-MM-DD
 * @param hora String de hora no formato HH:MM (opcional)
 * @returns Objeto Date
 */
const converterParaDate = (data: string, hora?: string): Date => {
  const dataObj = new Date(data);
  
  if (hora) {
    const [horaStr, minutoStr] = hora.split(':');
    const horaNum = parseInt(horaStr, 10);
    const minutoNum = parseInt(minutoStr, 10);
    
    if (!isNaN(horaNum) && !isNaN(minutoNum)) {
      dataObj.setHours(horaNum, minutoNum, 0, 0);
    } else {
      // Se a hora for inválida, usar meia-noite
      dataObj.setHours(0, 0, 0, 0);
    }
  } else {
    // Se não houver hora, usar meia-noite
    dataObj.setHours(0, 0, 0, 0);
  }
  
  return dataObj;
};

/**
 * Verifica as tarefas pendentes e envia notificações conforme configurado
 * @param tarefas Lista de tarefas para verificar
 * @param configNotificacoes Configurações de notificação
 */
export const verificarTarefasPendentes = (
  tarefas: Tarefa[], 
  configNotificacoes: ConfiguracoesNotificacao
): void => {
  // Verificações de segurança para evitar erros
  if (!tarefas || !Array.isArray(tarefas)) {
    console.error("Tarefas inválidas fornecidas para verificarTarefasPendentes", tarefas);
    return;
  }

  if (!configNotificacoes) {
    console.error("Configurações de notificação inválidas", configNotificacoes);
    return;
  }
  
  // Se as notificações não estiverem ativadas, não fazer nada
  if (!configNotificacoes.ativadas) return;
  
  // Se o navegador não suporta notificações, não fazer nada
  if (!("Notification" in window)) return;
  
  // Se não tiver permissão, não fazer nada
  if (Notification.permission !== "granted") return;
  
  const agora = new Date();
  const debug = window.debugNotificacoes;
  
  if (debug) {
    console.log(`Verificando tarefas pendentes: ${agora.toLocaleTimeString()}`);
    console.log(`Configurações atuais: antecedência=${configNotificacoes.antecedencia?.valor || 'N/A'} ${configNotificacoes.antecedencia?.unidade || 'N/A'}, som=${configNotificacoes.comSom}`);
  }
  
  // Verificar se configurações de antecedência são válidas
  if (!configNotificacoes.antecedencia) {
    console.error("Configuração de antecedência está faltando");
    return;
  }
  
  // Garantir que o valor de antecedência é válido
  let valorAntecedencia = configNotificacoes.antecedencia.valor;
  if (isNaN(valorAntecedencia) || valorAntecedencia < 1) {
    // Corrigir valor inválido
    console.warn(`Valor de antecedência inválido: ${valorAntecedencia}, usando 30 como padrão`);
    valorAntecedencia = 30;
  }
  
  // Verificar se a unidade é válida
  const unidadeValida = configNotificacoes.antecedencia.unidade === 'minutos' || 
                        configNotificacoes.antecedencia.unidade === 'horas';
                        
  if (!unidadeValida) {
    console.warn(`Unidade de antecedência inválida: ${configNotificacoes.antecedencia.unidade}, usando 'minutos' como padrão`);
    configNotificacoes.antecedencia.unidade = 'minutos';
  }
  
  // Calcular o tempo de antecedência em milissegundos
  const milissegundosAntecedencia = valorAntecedencia * 
    (configNotificacoes.antecedencia.unidade === 'minutos' ? 60000 : 3600000);
  
  if (debug) {
    console.log(`Milissegundos de antecedência: ${milissegundosAntecedencia}ms (${formatarTempo(milissegundosAntecedencia)})`);
  }
  
  // Garantir que o objeto de últimas notificações existe
  if (!window.notificacaoUltimasNotificadas) {
    window.notificacaoUltimasNotificadas = {};
  }
  
  // Para cada tarefa não concluída
  tarefas.forEach(tarefa => {
    if (!tarefa || tarefa.concluida) return;
    
    if (!tarefa.data) {
      if (debug) console.log(`Tarefa ${tarefa.id}: ${tarefa.titulo} não tem data definida`);
      return;
    }
    
    // Verificar se a tarefa deve notificar
    try {
      // Se a tarefa tem notificar=false explicitamente, pular
      if (tarefa.notificar === false) {
        if (debug) console.log(`Tarefa ${tarefa.titulo} tem notificações desativadas`);
        return;
      }
    } catch (err) {
      // Se o campo não existir, assumir que as notificações estão ativadas (compatibilidade)
    }
    
    try {
      // Converter string para objeto Date
      const dataHoraTarefa = converterParaDate(tarefa.data, tarefa.hora);
      
      // Verificar se a data é válida
      if (isNaN(dataHoraTarefa.getTime())) {
        console.warn(`Data/hora inválida para tarefa ${tarefa.id}: ${tarefa.data} ${tarefa.hora || 'sem hora'}`);
        return;
      }
      
      // Verificar se está na hora de notificar
      const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
      
      // Evitar notificações duplicadas
      const ultimaNotificacao = window.notificacaoUltimasNotificadas[tarefa.id] || 0;
      const tempoDesdeUltimaNotificacao = agora.getTime() - ultimaNotificacao;
      
      // Verificar se tempo está dentro da margem de notificação
      // Aumentamos a margem de verificação para mais precisão
      const margemDeVerificacao = 30000; // 30 segundos em ms
      
      // Se o tempo restante estiver próximo do tempo de antecedência configurado
      const dentroDoLimiteDeAntecedencia = Math.abs(tempoParaTarefa - milissegundosAntecedencia) <= margemDeVerificacao;
      
      // Só notificar se: 
      // 1. O tempo para a tarefa for positivo (tarefa ainda não ocorreu)
      // 2. O tempo para a tarefa for aproximadamente igual à antecedência configurada
      // 3. A última notificação foi há mais de 5 minutos ou nunca foi feita
      const notificacaoRecente = tempoDesdeUltimaNotificacao <= 300000 && ultimaNotificacao !== 0;
      
      if (debug) {
        console.log(
          `Tarefa: ${tarefa.titulo} (${tarefa.data} ${tarefa.hora || "00:00"})\n` +
          `  • Tempo até a tarefa: ${formatarTempo(tempoParaTarefa)}\n` +
          `  • Notificar com antecedência: ${formatarTempo(milissegundosAntecedencia)}\n` +
          `  • Dentro do limite: ${dentroDoLimiteDeAntecedencia}\n` +
          `  • Notificação recente: ${notificacaoRecente}\n` +
          `  • Hora da tarefa: ${dataHoraTarefa.toLocaleString()}`
        );
      }
      
      // Se entrar nessas condições, enviar notificação
      if (tempoParaTarefa > 0 && 
          dentroDoLimiteDeAntecedencia && 
          !notificacaoRecente) {
        
        // Enviar notificação
        try {
          const horaFormatada = dataHoraTarefa.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          const notification = new Notification(`Lembrete: ${tarefa.titulo}`, {
            body: `Tarefa agendada para ${horaFormatada} (em ${formatarTempo(tempoParaTarefa)})`,
            icon: '/favicon.ico',
            tag: `tarefa-${tarefa.id}`, // Evita múltiplas notificações para a mesma tarefa
            requireInteraction: true // A notificação permanece até o usuário interagir com ela
          });
          
          // Registrar que notificamos esta tarefa
          window.notificacaoUltimasNotificadas[tarefa.id] = agora.getTime();
          
          // Reproduzir som de notificação se ativado
          if (configNotificacoes.comSom) {
            reproduzirSomNotificacao();
          }
          
          console.log(`✅ Notificação enviada para tarefa: ${tarefa.titulo}`);
          
          // Evento de clique na notificação
          notification.onclick = () => {
            // Focar na janela e direcionar para a página de tarefas
            window.focus();
            window.location.href = '/tarefas';
          };
        } catch (error) {
          console.error("Erro ao enviar notificação:", error);
        }
      }
    } catch (error) {
      console.error("Erro ao processar tarefa para notificação:", error, tarefa);
    }
  });
}; 