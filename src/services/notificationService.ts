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
  
  // Iniciar verificação periódica com maior frequência para garantir precisão
  const intervalId = setInterval(() => {
    verificarTarefasPendentes();
  }, 5000); // Reduzido para 5 segundos para maior precisão na entrega das notificações
  
  // Armazenar o ID do intervalo para poder limpar depois
  window.notificacaoIntervalId = intervalId;
  
  console.log("Serviço de notificações iniciado com sucesso em modo de alta precisão!");
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
  try {
    // Criar a data sem manipulação de timezone
    const [ano, mes, dia] = data.split('-').map(Number);
    
    // Verificar se os componentes da data são válidos
    if (isNaN(ano) || isNaN(mes) || isNaN(dia) || 
        mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      console.warn(`Data inválida: ${data}, usando data atual`);
      return new Date(); // Retornar data atual em caso de erro
    }
    
    // Criar objeto data com componentes específicos (evita ajuste de timezone)
    const dataObj = new Date(ano, mes - 1, dia);
    
    // Se houver hora, adicionar
    if (hora && hora.includes(':')) {
      const [horaStr, minutoStr] = hora.split(':');
      const horaNum = parseInt(horaStr, 10);
      const minutoNum = parseInt(minutoStr, 10);
      
      if (!isNaN(horaNum) && !isNaN(minutoNum) && 
          horaNum >= 0 && horaNum <= 23 && 
          minutoNum >= 0 && minutoNum <= 59) {
        dataObj.setHours(horaNum, minutoNum, 0, 0);
      } else {
        console.warn(`Hora inválida: ${hora}, usando meia-noite`);
        dataObj.setHours(0, 0, 0, 0);
      }
    } else {
      // Se não houver hora, usar meia-noite
      dataObj.setHours(0, 0, 0, 0);
    }
    
    // Verificação final
    if (isNaN(dataObj.getTime())) {
      console.warn(`Objeto de data resultante inválido para entrada: ${data} ${hora || ''}`);
      return new Date(); // Retornar data atual em caso de erro
    }
    
    return dataObj;
  } catch (error) {
    console.error(`Erro ao converter data/hora: ${data} ${hora || ''}`, error);
    return new Date(); // Retornar data atual em caso de erro
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
      // Aumentar a margem de verificação para maior probabilidade de detecção
      const margemDeVerificacao = 60000; // 60 segundos (1 minuto) em ms
      
      // Calcular o momento exato em que a notificação deve ser enviada
      // (momento da tarefa menos o tempo de antecedência)
      const momentoNotificacao = dataHoraTarefa.getTime() - milissegundosAntecedencia;
      
      // Verificar se estamos próximos do momento de notificação
      const tempoAteNotificacao = momentoNotificacao - agora.getTime();
      
      // Condições para enviar notificação:
      // 1. Estamos próximos do momento de notificação (dentro da margem) OU
      // 2. Já passamos do momento de notificação, mas não faz muito tempo (dentro da margem negativa)
      const dentroDoLimiteDeAntecedencia = 
        Math.abs(tempoAteNotificacao) <= margemDeVerificacao;
      
      // Só notificar se: 
      // 1. O tempo para a tarefa for positivo (tarefa ainda não ocorreu)
      // 2. Estamos dentro do limite de antecedência (próximo do momento de notificação)
      // 3. A última notificação foi há mais de 5 minutos ou nunca foi feita
      const notificacaoRecente = tempoDesdeUltimaNotificacao <= 300000 && ultimaNotificacao !== 0;
      
      if (debug) {
        console.log(
          `Tarefa: ${tarefa.titulo} (${tarefa.data} ${tarefa.hora || "00:00"})\n` +
          `  • Tempo até a tarefa: ${formatarTempo(tempoParaTarefa)}\n` +
          `  • Tempo até momento de notificação: ${formatarTempo(tempoAteNotificacao)}\n` +
          `  • Notificar com antecedência: ${formatarTempo(milissegundosAntecedencia)}\n` +
          `  • Dentro do limite: ${dentroDoLimiteDeAntecedencia}\n` +
          `  • Notificação recente: ${notificacaoRecente}\n` +
          `  • Hora atual: ${agora.toLocaleString()}\n` +
          `  • Hora da tarefa: ${dataHoraTarefa.toLocaleString()}\n` +
          `  • Momento da notificação: ${new Date(momentoNotificacao).toLocaleString()}`
        );
      }
      
      // Lógica de envio de notificação ajustada:
      // 1. A tarefa ainda não ocorreu
      // 2. Estamos no momento certo para notificar
      // 3. Não notificamos recentemente esta tarefa
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