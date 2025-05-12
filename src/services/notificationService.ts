import { Tarefa, ConfiguracoesNotificacao } from '@/types';
import { toast } from 'sonner';
import { formatarTempo } from '@/utils/dateUtils';

// Extend Window interface para incluir nossas propriedades customizadas
declare global {
  interface Window {
    notificacaoIntervalId?: number;
    notificacaoUltimasNotificadas: Record<string, number>;
  }
}

// Inicializar o registro de notificações já enviadas
if (typeof window !== 'undefined') {
  window.notificacaoUltimasNotificadas = window.notificacaoUltimasNotificadas || {};
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
  
  // Se já temos permissão, retornar
  if (Notification.permission === "granted") {
    return true;
  }
  
  // Se já negada, avisar mas não solicitar novamente
  if (Notification.permission === "denied") {
    console.warn("Permissão para notificações foi negada");
    toast.warning(
      "Permissões de notificação estão bloqueadas. Você precisa permitir notificações nas configurações do navegador."
    );
    return false;
  }
  
  // Evitar solicitar muitas vezes na mesma sessão
  if (permissaoJaSolicitada) {
    return Notification.permission === "granted";
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
  
  // Iniciar verificação periódica
  const intervalId = window.setInterval(() => {
    verificarTarefasPendentes();
  }, 30000); // Verifica a cada 30 segundos
  
  // Armazenar o ID do intervalo para poder limpar depois
  window.notificacaoIntervalId = intervalId;
  
  console.log("Serviço de notificações iniciado com sucesso!");
};

/**
 * Para o serviço de verificação periódica de notificações
 */
export const pararServicoNotificacoes = (): void => {
  if (window.notificacaoIntervalId) {
    window.clearInterval(window.notificacaoIntervalId);
    window.notificacaoIntervalId = undefined;
    console.log("Serviço de notificações parado com sucesso!");
  }
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
  // Se as notificações não estiverem ativadas, não fazer nada
  if (!configNotificacoes.ativadas) return;
  
  // Se o navegador não suporta notificações, não fazer nada
  if (!("Notification" in window)) return;
  
  // Se não tiver permissão, não fazer nada
  if (Notification.permission !== "granted") return;
  
  const agora = new Date();
  console.log(`Verificando tarefas pendentes: ${agora.toLocaleTimeString()}`);
  
  // Para cada tarefa não concluída
  tarefas.forEach(tarefa => {
    if (tarefa.concluida) return;
    
    if (!tarefa.data) return;
    
    // Verificar se a tarefa deve notificar
    // Feito de forma segura para compatibilidade com diferentes ambientes
    try {
      // Se a tarefa tem notificar=false explicitamente, pular
      if (tarefa.notificar === false) {
        return;
      }
    } catch (err) {
      // Se o campo não existir, assumir que as notificações estão ativadas (compatibilidade)
    }
    
    try {
      // Converter string para objeto Date
      let dataHoraTarefa = new Date(tarefa.data);
      if (tarefa.hora) {
        const [hora, minuto] = tarefa.hora.split(':');
        dataHoraTarefa.setHours(parseInt(hora, 10), parseInt(minuto, 10));
      } else {
        // Se não houver hora definida, assumir meia-noite
        dataHoraTarefa.setHours(0, 0, 0, 0);
      }
      
      // Calcular o tempo de antecedência em milissegundos
      const milissegundosAntecedencia = configNotificacoes.antecedencia.valor * 
        (configNotificacoes.antecedencia.unidade === 'minutos' ? 60000 : 3600000);
      
      // Verificar se está na hora de notificar
      const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
      
      // Evitar notificações duplicadas
      const ultimaNotificacao = window.notificacaoUltimasNotificadas[tarefa.id] || 0;
      const tempoDesdeUltimaNotificacao = agora.getTime() - ultimaNotificacao;
      
      // Verificar se tempo está dentro da margem de notificação
      // Para tempos curtos (< 5 minutos), ampliamos a margem de verificação
      const margemDeVerificacao = Math.min(30000, milissegundosAntecedencia * 0.1); // 30 segundos ou 10% do tempo, o que for menor
      const dentroDoLimite = Math.abs(tempoParaTarefa - milissegundosAntecedencia) <= margemDeVerificacao;
      
      // Só notificar se: 
      // 1. O tempo para a tarefa for positivo (tarefa ainda não ocorreu)
      // 2. O tempo para a tarefa for aproximadamente igual à antecedência configurada
      // 3. A última notificação foi há mais de 5 minutos ou nunca foi feita
      const notificacaoRecente = tempoDesdeUltimaNotificacao <= 300000 && ultimaNotificacao !== 0;
      
      if (tempoParaTarefa > 0 && 
          dentroDoLimite && 
          !notificacaoRecente) {
        
        // Enviar notificação
        try {
          const notification = new Notification(`Lembrete: ${tarefa.titulo}`, {
            body: `Tarefa programada para ${formatarTempo(tempoParaTarefa)}`,
            icon: '/favicon.ico',
          });
          
          // Registrar que notificamos esta tarefa
          window.notificacaoUltimasNotificadas[tarefa.id] = agora.getTime();
          
          // Reproduzir som de notificação se ativado
          if (configNotificacoes.comSom) {
            reproduzirSomNotificacao();
          }
        } catch (error) {
          console.error("Erro ao enviar notificação:", error);
        }
      }
    } catch (error) {
      console.error("Erro ao processar tarefa para notificação:", error, tarefa);
    }
  });
}; 