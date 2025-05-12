import { Tarefa, ConfiguracoesNotificacao } from '@/types';
import { toast } from 'sonner';

// Extend Window interface to include our custom property
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

// Iniciar o serviço de notificações
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
  
  // Iniciar verificação periódica com maior frequência para maior precisão
  const intervalId = window.setInterval(() => {
    verificarTarefasPendentes();
  }, 1000); // Reduzido para 1 segundo para maior precisão nas notificações
  
  // Armazenar o ID do intervalo para poder limpar depois
  window.notificacaoIntervalId = intervalId;
  
  console.log("Serviço de notificações iniciado com sucesso em modo de alta precisão!");
  
  // Registrar para o evento de visibilidade
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log("Página visível novamente, verificando notificações");
      verificarTarefasPendentes();
    }
  });
  
  // Registrar para o evento de foco da janela
  window.addEventListener('focus', function() {
    console.log("Janela recebeu foco, verificando notificações");
    verificarTarefasPendentes();
  });
  
  // Registrar para o evento de online (quando o dispositivo volta a ter conexão)
  window.addEventListener('online', function() {
    console.log("Dispositivo voltou a ficar online, verificando notificações");
    verificarTarefasPendentes();
  });
};

// Parar o serviço de notificações
export const pararServicoNotificacoes = (): void => {
  // Limpar o intervalo se existir
  if (window.notificacaoIntervalId !== undefined) {
    clearInterval(window.notificacaoIntervalId);
    window.notificacaoIntervalId = undefined;
    console.log("Serviço de notificações parado.");
  }
};

// Verificar tarefas pendentes e enviar notificações
export const verificarTarefasPendentes = (
  tarefas: Tarefa[], 
  configNotificacoes: ConfiguracoesNotificacao
): void => {
  // Se as notificações não estiverem ativadas, não fazer nada
  if (!configNotificacoes.ativadas) {
    console.log("Notificações desativadas nas configurações");
    return;
  }
  
  // Se o navegador não suporta notificações, não fazer nada
  if (!("Notification" in window)) {
    console.log("Navegador não suporta notificações");
    return;
  }
  
  // Se não tiver permissão, não fazer nada
  if (Notification.permission !== "granted") {
    console.log("Permissão para notificações não concedida");
    return;
  }
  
  const agora = new Date();
  const logDetalhado = agora.getSeconds() === 0; // Log detalhado apenas a cada minuto
  
  if (logDetalhado) {
    console.log(`Verificando tarefas pendentes: ${agora.toLocaleTimeString()}`);
    console.log(`Configurações de notificação: Antecedência ${configNotificacoes.antecedencia.valor} ${configNotificacoes.antecedencia.unidade}, som: ${configNotificacoes.comSom}`);
    console.log(`Total de tarefas a verificar: ${tarefas.length}`);
  }
  
  // Calcular o tempo de antecedência em milissegundos
  const milissegundosAntecedencia = configNotificacoes.antecedencia.valor * 
    (configNotificacoes.antecedencia.unidade === 'minutos' ? 60000 : 3600000);
  
  // Para cada tarefa não concluída
  tarefas.forEach(tarefa => {
    // Ignorar tarefas concluídas
    if (tarefa.concluida) return;
    
    // Ignorar tarefas sem data
    if (!tarefa.data) return;
    
    // Se a tarefa tem notificar=false explicitamente, pular
    // Verificação compatível com ambientes sem o campo notificar
    try {
      if (tarefa.notificar === false) {
        if (logDetalhado) {
          console.log(`Tarefa "${tarefa.titulo}" (ID: ${tarefa.id}) ignorada - notificações desativadas para esta tarefa`);
        }
        return;
      }
    } catch (err) {
      // Se o campo não existir, assumir que as notificações estão ativadas (compatibilidade)
      if (logDetalhado) {
        console.log(`Tarefa "${tarefa.titulo}" (ID: ${tarefa.id}) - campo notificar não encontrado, assumindo ativado`);
      }
    }
    
    try {
      // Converter string para objeto Date de forma cuidadosa para evitar problemas de timezone
      const [ano, mes, dia] = tarefa.data.split('-').map(Number);
      
      // Criar data sem manipulação de timezone
      const dataHoraTarefa = new Date(ano, mes - 1, dia);
      
      // Definir hora se disponível, caso contrário usar meia-noite
      if (tarefa.hora && tarefa.hora.includes(':')) {
        const [hora, minuto] = tarefa.hora.split(':').map(Number);
        dataHoraTarefa.setHours(hora, minuto, 0, 0);
      } else {
        dataHoraTarefa.setHours(0, 0, 0, 0);
      }
      
      // Verificar se a data é válida
      if (isNaN(dataHoraTarefa.getTime())) {
        console.error(`Data inválida para tarefa "${tarefa.titulo}": ${tarefa.data} ${tarefa.hora || ''}`);
        return;
      }
      
      // Verificar se está na hora de notificar
      const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
      
      if (logDetalhado) {
        console.log(`Tarefa "${tarefa.titulo}" (ID: ${tarefa.id}): `);
        console.log(`  Data/hora: ${dataHoraTarefa.toLocaleString()}`);
        console.log(`  Tempo para a tarefa: ${Math.floor(tempoParaTarefa / 60000)} minutos`);
        console.log(`  Limite de antecedência: ${Math.floor(milissegundosAntecedencia / 60000)} minutos`);
      }
      
      // Evitar notificações duplicadas
      const ultimaNotificacao = window.notificacaoUltimasNotificadas[tarefa.id] || 0;
      const tempoDesdeUltimaNotificacao = agora.getTime() - ultimaNotificacao;
      
      // Verificar se tempo está dentro da margem de notificação
      // Para tempos menores, temos uma margem maior para pegar o momento exato
      const margemDeVerificacao = Math.min(500, milissegundosAntecedencia * 0.05); // 500ms ou 5% do tempo, o que for menor
      const dentroDoLimite = Math.abs(tempoParaTarefa - milissegundosAntecedencia) <= margemDeVerificacao;
      
      // Só notificar se: 
      // 1. O tempo para a tarefa for positivo (tarefa ainda não ocorreu)
      // 2. O tempo para a tarefa for aproximadamente igual à antecedência configurada
      // 3. A última notificação foi há mais de 5 minutos ou nunca foi feita
      const notificacaoRecente = tempoDesdeUltimaNotificacao <= 300000 && ultimaNotificacao !== 0;
      
      if (logDetalhado) {
        console.log(`  Já notificada? ${ultimaNotificacao > 0 ? 'Sim' : 'Não'}`);
        if (ultimaNotificacao > 0) {
          console.log(`  Tempo desde última notificação: ${Math.floor(tempoDesdeUltimaNotificacao / 60000)} minutos`);
        }
        console.log(`  Dentro do limite de tempo para notificar? ${dentroDoLimite ? 'Sim' : 'Não'}`);
      }
      
      if (tempoParaTarefa > 0 && 
          dentroDoLimite && 
          !notificacaoRecente) {
        
        console.log(`ENVIANDO NOTIFICAÇÃO para tarefa: ${tarefa.titulo}`);
        
        // Enviar notificação com tratamento de erro melhorado
        try {
          const notification = new Notification(`Lembrete: ${tarefa.titulo}`, {
            body: `Tarefa programada para ${formatarTempo(tempoParaTarefa)}`,
            icon: '/favicon.ico',
            // Vibrar em dispositivos que suportam (mobile principalmente)
            vibrate: [200, 100, 200]
          });
          
          // Adicionar evento de clique para abrir a aplicação
          notification.onclick = function() {
            window.focus();
            this.close();
          };
          
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

// Reproduzir som de notificação
export const reproduzirSomNotificacao = (): void => {
  try {
    // Usar beep nativo do navegador para garantir que sempre funcione
    const beepFrequency = 700;  // Hz
    const beepDuration = 300;   // ms
    const beepVolume = 0.5;     // 0 a 1
    
    // Criar contexto de áudio para maior compatibilidade
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configurar oscilador
    oscillator.type = 'sine';
    oscillator.frequency.value = beepFrequency;
    
    // Configurar volume
    gainNode.gain.value = beepVolume;
    
    // Conectar nós de áudio
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Iniciar e parar o som após a duração especificada
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
    }, beepDuration);
    
    console.log("Som de notificação reproduzido");
  } catch (error) {
    console.error("Erro ao reproduzir som de notificação:", error);
    // Fallback para método mais simples
    try {
      const audio = new Audio('data:audio/wav;base64,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');
      audio.play().catch(e => console.error("Erro ao reproduzir áudio de fallback:", e));
    } catch (fallbackError) {
      console.error("Erro no método de fallback:", fallbackError);
    }
  }
};

// Formatar tempo para exibição
export const formatarTempo = (milissegundos: number): string => {
  const horas = Math.floor(milissegundos / 3600000);
  const minutos = Math.floor((milissegundos % 3600000) / 60000);
  
  if (horas > 0) {
    return `${horas}h${minutos > 0 ? ` e ${minutos}min` : ''}`;
  }
  
  return `${minutos} minutos`;
};

// Solicitar permissão para notificações
export const solicitarPermissaoNotificacao = async (): Promise<NotificationPermission> => {
  if (!("Notification" in window)) {
    console.error("Este navegador não suporta notificações desktop");
    return "denied" as NotificationPermission;
  }
  
  // Se já temos permissão, apenas retornar
  if (Notification.permission === "granted") {
    return Notification.permission;
  }
  
  // Se a permissão já foi solicitada nesta sessão, não solicitar novamente
  if (permissaoJaSolicitada) {
    return Notification.permission;
  }
  
  try {
    if (Notification.permission !== "denied") {
      permissaoJaSolicitada = true; // Marcar que já solicitamos permissão
      const permission = await Notification.requestPermission();
      
      // Não mostrar notificação de teste
      
      return permission;
    }
  } catch (error) {
    console.error("Erro ao solicitar permissão para notificações:", error);
    toast.error("Não foi possível solicitar permissão para notificações");
  }
  
  return Notification.permission;
};
