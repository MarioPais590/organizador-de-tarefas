import { Tarefa, ConfiguracoesNotificacao } from '@/types';
import { toast } from 'sonner';
import { formatarTempo } from '@/utils/dateUtils';

// Extend Window interface para incluir nossas propriedades customizadas
declare global {
  interface Window {
    notificacaoIntervalId?: ReturnType<typeof setInterval>;
    notificacaoUltimasNotificadas: Record<string, number>;
    debugNotificacoes?: boolean;
    notificacoesAtivas?: boolean;
    android?: any; // Para PWA em Android
    webkit?: any; // Para detecção de Safari
  }
}

// Verificar se o ambiente é navegador e inicializar propriedades
const isBrowser = typeof window !== 'undefined';

// Inicializar o registro de notificações já enviadas
if (isBrowser) {
  try {
    window.notificacaoUltimasNotificadas = window.notificacaoUltimasNotificadas || {};
    window.debugNotificacoes = true; // Habilitar modo de depuração
    window.notificacoesAtivas = false; // Inicialmente desativado
  } catch (e) {
    console.error('Erro ao inicializar propriedades de notificação:', e);
  }
}

// Variável global para rastrear se a permissão já foi solicitada nesta sessão
let permissaoJaSolicitada = false;

/**
 * Detecta se o dispositivo é um dispositivo móvel
 */
export const detectarDispositivoMovel = (): { isMobile: boolean, isIOS: boolean, isAndroid: boolean, navegador: string } => {
  // Verificar se estamos em um ambiente de navegador
  if (typeof navigator === 'undefined') return { isMobile: false, isIOS: false, isAndroid: false, navegador: 'desconhecido' };
  
  const userAgent = navigator.userAgent || "";
  const vendor = navigator.vendor || "";
  
  // Detectar iOS (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Detectar Android
  const isAndroid = /Android/.test(userAgent);
  
  // Detectar qualquer dispositivo móvel
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                  (window.innerWidth <= 800 && window.innerHeight <= 800);
  
  // Identificar o navegador
  let navegador = 'desconhecido';
  if (/CriOS/i.test(userAgent)) {
    navegador = 'Chrome iOS';
  } else if (/FxiOS/i.test(userAgent)) {
    navegador = 'Firefox iOS';
  } else if (/EdgiOS/i.test(userAgent)) {
    navegador = 'Edge iOS';
  } else if (/OPiOS/i.test(userAgent)) {
    navegador = 'Opera iOS';
  } else if (/SamsungBrowser/i.test(userAgent)) {
    navegador = 'Samsung Browser';
  } else if (/Chrome/.test(userAgent) && /Safari/.test(userAgent) && !/Edg/.test(userAgent)) {
    navegador = 'Chrome';
  } else if (/Firefox/.test(userAgent)) {
    navegador = 'Firefox';
  } else if (/Edg/.test(userAgent) || /Edge/.test(userAgent)) {
    navegador = 'Edge';
  } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    navegador = 'Safari';
  } else if (/Opera|OPR/.test(userAgent)) {
    navegador = 'Opera';
  }
  
  return { isMobile, isIOS, isAndroid, navegador };
};

/**
 * Verifica se o navegador suporta notificações
 * @returns true se o navegador suporta notificações, false caso contrário
 */
export const verificarSuporteNotificacoes = (): boolean => {
  // Verificar se estamos em um ambiente de navegador
  if (typeof window === 'undefined') return false;
  
  // Verificar se o navegador suporta a API de Notification
  const suportaNotificacoes = 'Notification' in window;
  
  // Verificar se estamos em um PWA
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                window.matchMedia('(display-mode: fullscreen)').matches ||
                window.matchMedia('(display-mode: minimal-ui)').matches ||
                (window.navigator as any).standalone === true;
  
  // Verificar se está em um contexto seguro (necessário para PWAs)
  const contextoSeguro = window.location.protocol === 'https:' || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  // Detectar navegador e sistema operacional
  const { isMobile, isIOS, isAndroid, navegador } = detectarDispositivoMovel();
  
  // Verificar se é o navegador Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                  /Apple/.test(navigator.vendor);
  
  // Chrome no iOS ainda tem limitações semelhantes ao Safari
  const isiOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
  
  // Firefox no iOS também tem limitações
  const isiOSFirefox = isIOS && /FxiOS/.test(navigator.userAgent);
  
  const problematicoPwa = isIOS && isPwa;
  
  // Verificação para dispositivos Samsung, que têm melhor suporte a notificações
  const isSamsungBrowser = /SamsungBrowser/.test(navigator.userAgent);
  
  // Verificar se é uma visualização da web dentro de um aplicativo
  const isWebView = /(; wv)/i.test(navigator.userAgent) ||
                    /Facebook/i.test(navigator.userAgent) ||
                    /Instagram/i.test(navigator.userAgent) ||
                    /Twitter/i.test(navigator.userAgent);
  
  console.log("=== DIAGNÓSTICO DE NOTIFICAÇÕES ===");
  console.log("• Dispositivo e navegador:");
  console.log(`  - Sistema: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
  console.log(`  - Navegador: ${navegador}`);
  console.log(`  - É mobile: ${isMobile}`);
  console.log(`  - É webview: ${isWebView}`);
  console.log("• Suporte técnico:");
  console.log(`  - API de notificações: ${suportaNotificacoes ? 'Disponível' : 'Indisponível'}`);
  console.log(`  - Contexto seguro: ${contextoSeguro ? 'Sim' : 'Não'}`);
  console.log(`  - Instalado como PWA: ${isPwa ? 'Sim' : 'Não'}`);
  console.log(`  - Service Worker registrado: ${navigator.serviceWorker ? 'Disponível' : 'Indisponível'}`);
  
  // Log de problemas específicos
  if (isIOS) {
    console.log("• Observações para iOS:");
    console.log(`  - Safari no iOS: ${isSafari ? 'Detectado (suporte limitado a notificações)' : 'Não detectado'}`);
    console.log(`  - Chrome no iOS: ${isiOSChrome ? 'Detectado (usa motor do Safari, suporte limitado)' : 'Não detectado'}`);
    console.log(`  - Firefox no iOS: ${isiOSFirefox ? 'Detectado (usa motor do Safari, suporte limitado)' : 'Não detectado'}`);
    console.log(`  - PWA no iOS: ${problematicoPwa ? 'Detectado (suporte inconsistente)' : 'Não detectado'}`);
  }
  
  if (isAndroid) {
    console.log("• Observações para Android:");
    console.log(`  - Samsung Browser: ${isSamsungBrowser ? 'Detectado (bom suporte)' : 'Não detectado'}`);
    console.log(`  - Chrome para Android: ${/Chrome/.test(navigator.userAgent) && isAndroid ? 'Detectado (bom suporte)' : 'Não detectado'}`);
    console.log(`  - Firefox para Android: ${/Firefox/.test(navigator.userAgent) && isAndroid ? 'Detectado (bom suporte)' : 'Não detectado'}`);
  }
  
  // Verificações de compatibilidade
  
  // Fator 1: Navegador não suporta API de notificações
  if (!suportaNotificacoes) {
    console.warn("❌ Este navegador não suporta a API de notificações");
    return false;
  }
  
  // Fator 2: Não está em contexto seguro (HTTPS)
  if (!contextoSeguro) {
    console.warn("❌ Notificações só funcionam em contexto seguro (HTTPS)");
    return false;
  }
  
  // Fator 3: WebView integrado em aplicativo
  if (isWebView) {
    console.warn("❌ WebViews dentro de aplicativos geralmente não suportam notificações");
    return false;
  }
  
  // Fator 4: Navegadores problemáticos em iOS (que não são PWA)
  const iOSSemSuporte = isIOS && (isSafari || isiOSChrome || isiOSFirefox) && !isPwa;
  if (iOSSemSuporte) {
    console.warn("⚠️ Navegadores em iOS têm suporte limitado a notificações. Considere instalar como PWA.");
    
    // Se for Safari, vamos tentar mesmo assim 
    if (isSafari && !isPwa) {
      console.log("ℹ️ Tentando usar notificações no Safari iOS mesmo com limitações");
      return true;
    }
    
    return false;
  }
  
  // Para PWAs no iOS, verificar com ressalvas
  if (problematicoPwa) {
    console.warn("⚠️ Notificações em PWAs no iOS podem ter comportamento inconsistente");
    // Ainda retornamos true para permitir tentar em PWAs no iOS
    return true;
  }
  
  // Para Android e Desktop, geralmente temos bom suporte
  if (isAndroid || !isMobile) {
    console.log("✅ Dispositivo com bom suporte a notificações");
    return true;
  }
  
  // Caso padrão: tentar usar notificações mesmo com suporte incerto
  console.log("ℹ️ Suporte a notificações incerto, mas tentando mesmo assim");
  return true;
};

/**
 * Solicita permissão para enviar notificações ao usuário
 * @returns Promessa que resolve para true se a permissão foi concedida
 */
export const solicitarPermissaoNotificacao = async (): Promise<boolean> => {
  // Verificar se o navegador suporta notificações
  if (!verificarSuporteNotificacoes()) {
    // Mostrar mensagens personalizadas de acordo com o dispositivo
    const { isMobile, isIOS, isAndroid, navegador } = detectarDispositivoMovel();
    
    if (isIOS) {
      // Instruções específicas para iOS
      const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true;
      
      if (isPwa) {
        toast.warning(
          "O suporte a notificações no iOS pode ser inconsistente. Certifique-se de que o aplicativo esteja atualizado.", 
          { duration: 6000 }
        );
      } else {
        toast.error(
          "Dispositivos iOS têm suporte limitado a notificações web. Para melhor experiência, adicione à tela inicial tocando no ícone de compartilhamento e depois 'Adicionar à Tela de Início'.", 
          { duration: 8000 }
        );
      }
    } else if (isAndroid) {
      toast.warning(
        "Para garantir notificações confiáveis, adicione esta aplicação à tela inicial ou use o Chrome.", 
        { duration: 5000 }
      );
    } else if (isMobile) {
      toast.error(
        "Seu dispositivo móvel pode ter limitações com notificações. Considere adicionar à tela inicial ou usar um navegador compatível como Chrome.", 
        { duration: 6000 }
      );
    } else {
      toast.error(
        "Seu navegador não suporta notificações ou está usando uma conexão não segura (HTTPS necessário).", 
        { duration: 5000 }
      );
    }
    
    console.error(`Notificações não suportadas neste ambiente: ${navegador} em ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
    return false;
  }
  
  const permissionStatus = Notification.permission as string;
  
  // Se já temos permissão, retornar
  if (permissionStatus === "granted") {
    window.notificacoesAtivas = true;
    console.log("✅ Permissão de notificações já concedida");
    return true;
  }
  
  // Se já negada, avisar mas não solicitar novamente
  if (permissionStatus === "denied") {
    console.warn("❌ Permissão para notificações foi negada anteriormente");
    toast.warning(
      "Permissões de notificação estão bloqueadas. Você precisa permitir notificações nas configurações do navegador.",
      { duration: 6000 }
    );
    window.notificacoesAtivas = false;
    return false;
  }
  
  // Em dispositivos móveis, fornecer instruções claras antes de solicitar
  const { isMobile, isIOS } = detectarDispositivoMovel();
  if (isMobile && !permissaoJaSolicitada) {
    if (isIOS) {
      toast.info(
        "Você verá um prompt para permitir notificações. Por favor, toque em 'Permitir' para receber lembretes das suas tarefas.",
        { duration: 6000 }
      );
    } else {
      toast.info(
        "Você verá um prompt para permitir notificações. Ative para receber lembretes das suas tarefas!",
        { duration: 5000 }
      );
    }
    
    // Pequeno atraso para o usuário ler a mensagem
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Evitar solicitar muitas vezes na mesma sessão
  if (permissaoJaSolicitada) {
    // Usar Notification.permission diretamente
    const concedida = (Notification.permission as string) === "granted";
    window.notificacoesAtivas = concedida;
    return concedida;
  }
  
  // Solicitar permissão
  try {
    console.log("Solicitando permissão para notificações...");
    permissaoJaSolicitada = true;
    const permissao = await Notification.requestPermission();
    
    console.log(`Resultado da solicitação de permissão: ${permissao}`);
    window.notificacoesAtivas = permissao === "granted";
    
    if (permissao === "granted") {
      toast.success("Notificações ativadas com sucesso!");
      
      // Enviar notificação de teste para confirmar funcionamento
      setTimeout(() => {
        try {
          new Notification("Notificações configuradas com sucesso!", {
            body: "Você receberá lembretes das suas tarefas agendadas.",
            icon: "/favicon.ico"
          });
        } catch (e) {
          console.error("Erro ao enviar notificação de teste:", e);
        }
      }, 1500);
    } else if (permissao === "denied") {
      toast.error("Permissão para notificações negada. Você não receberá lembretes de tarefas.");
    } else {
      toast.warning("Permissão para notificações ainda pendente. Algumas funções podem não funcionar corretamente.");
    }
    
    return permissao === "granted";
  } catch (error) {
    console.error("Erro ao solicitar permissão para notificações:", error);
    
    // Abordagem de fallback para navegadores mais antigos
    try {
      console.log("Tentando método alternativo de solicitação de permissão...");
      Notification.requestPermission(function(permission) {
        window.notificacoesAtivas = permission === "granted";
        return permission === "granted";
      });
      
      return false;
    } catch (fallbackError) {
      console.error("Falha na abordagem alternativa:", fallbackError);
      toast.error("Não foi possível solicitar permissão para notificações");
      window.notificacoesAtivas = false;
      return false;
    }
  }
};

/**
 * Reproduz um som de notificação
 */
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
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(e => console.error("Erro ao reproduzir áudio de fallback:", e));
    } catch (fallbackError) {
      console.error("Erro no método de fallback:", fallbackError);
    }
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
    if (!data) {
      console.warn("Data vazia fornecida para converterParaDate");
      return new Date(); // Retornar data atual em caso de erro
    }
    
    // Garantir que a data está no formato correto
    if (!data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.warn(`Formato de data inválido: ${data}, esperado YYYY-MM-DD`);
      return new Date();
    }
    
    // Criar a data sem manipulação de timezone para evitar problemas
    const [ano, mes, dia] = data.split('-').map(Number);
    
    // Verificar se os componentes da data são válidos
    if (isNaN(ano) || isNaN(mes) || isNaN(dia) || 
        mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      console.warn(`Componentes de data inválidos: ${data} (${ano}-${mes}-${dia}), usando data atual`);
      return new Date();
    }
    
    // Criar data primeiro sem hora (apenas data) para evitar problemas de timezone
    const dataObj = new Date(ano, mes - 1, dia);
    
    // Definir horas para meia-noite por padrão
    dataObj.setHours(0, 0, 0, 0);
    
    // Se houver hora, adicionar explicitamente
    if (hora && hora.trim() && hora.includes(':')) {
      const [horaStr, minutoStr] = hora.split(':');
      const horaNum = parseInt(horaStr, 10);
      const minutoNum = parseInt(minutoStr, 10);
      
      if (!isNaN(horaNum) && !isNaN(minutoNum) && 
          horaNum >= 0 && horaNum <= 23 && 
          minutoNum >= 0 && minutoNum <= 59) {
        // Definir hora com setHours para preservar a data já definida
        dataObj.setHours(horaNum, minutoNum, 0, 0);
      } else {
        console.warn(`Hora inválida: ${hora}, mantendo meia-noite`);
      }
    }
    
    // Verificação final
    if (isNaN(dataObj.getTime())) {
      console.warn(`Objeto de data resultante inválido para entrada: ${data} ${hora || ''}`);
      return new Date();
    }
    
    return dataObj;
  } catch (error) {
    console.error(`Erro ao converter data/hora: ${data} ${hora || ''}`, error);
    return new Date();
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
  if (!verificarSuporteNotificacoes()) {
    console.warn("Notificações não suportadas neste navegador/ambiente");
    return;
  }
  
  // Verificar tarefas imediatamente após iniciar
  verificarTarefasPendentes();
  
  // Parar qualquer serviço anterior se existir
  pararServicoNotificacoes();
  
  // Iniciar verificação periódica com maior frequência para garantir precisão
  const intervalId = setInterval(() => {
    verificarTarefasPendentes();
  }, 1000); // Reduzido para 1 segundo para maior precisão na entrega das notificações
  
  // Armazenar o ID do intervalo para poder limpar depois
  window.notificacaoIntervalId = intervalId;
  window.notificacoesAtivas = true;
  
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
 * Envia uma notificação para uma tarefa
 * @param tarefa A tarefa para enviar notificação
 * @param tempoParaTarefa Tempo em milissegundos até a tarefa
 * @param comSom Se deve reproduzir som ao notificar
 */
const enviarNotificacao = (tarefa: Tarefa, tempoParaTarefa: number, comSom: boolean): void => {
  try {
    const horaFormatada = new Date(new Date().getTime() + tempoParaTarefa).toLocaleTimeString([], {
      hour: '2-digit', 
      minute:'2-digit'
    });
    
    const notification = new Notification(`Lembrete: ${tarefa.titulo}`, {
      body: `Tarefa agendada para ${horaFormatada} (em ${formatarTempo(tempoParaTarefa)})`,
      icon: '/favicon.ico',
      tag: `tarefa-${tarefa.id}`, // Evita múltiplas notificações para a mesma tarefa
      requireInteraction: true // A notificação permanece até o usuário interagir com ela
    });
    
    // Registrar que notificamos esta tarefa
    window.notificacaoUltimasNotificadas[tarefa.id] = Date.now();
    
    // Reproduzir som de notificação se ativado
    if (comSom) {
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
};

/**
 * Verifica se está no momento certo para enviar uma notificação para a tarefa
 * @param tarefa A tarefa a verificar
 * @param agora A data/hora atual
 * @param milissegundosAntecedencia Quanto tempo antes da tarefa deve notificar
 * @param margemDeVerificacao Margem de erro aceitável em milissegundos
 * @returns true se deve notificar, false caso contrário
 */
const deveNotificar = (
  tarefa: Tarefa, 
  agora: Date, 
  milissegundosAntecedencia: number,
  margemDeVerificacao: number
): boolean => {
  // Converter string para objeto Date
  const dataHoraTarefa = converterParaDate(tarefa.data, tarefa.hora);
  
  // Verificar se a data é válida
  if (isNaN(dataHoraTarefa.getTime())) {
    console.warn(`Data/hora inválida para tarefa ${tarefa.id}: ${tarefa.data} ${tarefa.hora || 'sem hora'}`);
    return false;
  }
  
  // Verificar se está na hora de notificar
  const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
  
  // Evitar notificações duplicadas
  const ultimaNotificacao = window.notificacaoUltimasNotificadas[tarefa.id] || 0;
  const tempoDesdeUltimaNotificacao = agora.getTime() - ultimaNotificacao;
  
  // Calcular o momento exato em que a notificação deve ser enviada
  // (momento da tarefa menos o tempo de antecedência)
  const momentoNotificacao = dataHoraTarefa.getTime() - milissegundosAntecedencia;
  
  // Verificar se estamos próximos do momento de notificação
  const tempoAteNotificacao = momentoNotificacao - agora.getTime();
  
  // Verificar se estamos dentro do limite para notificar
  const dentroDoLimiteDeAntecedencia = Math.abs(tempoAteNotificacao) <= margemDeVerificacao;
  
  // Definir intervalo mínimo entre notificações para a mesma tarefa
  const intervaloMinimo = 60000; // 1 minuto para evitar notificações duplicadas
  
  // Verificar se já notificamos recentemente esta tarefa
  const notificacaoRecente = tempoDesdeUltimaNotificacao <= intervaloMinimo && ultimaNotificacao !== 0;
  
  if (window.debugNotificacoes) {
    const debug = agora.getSeconds() === 0; // Log detalhado apenas a cada minuto
    if (debug) {
      console.log(
        `Tarefa: ${tarefa.titulo} (${tarefa.data} ${tarefa.hora || "00:00"})\n` +
        `  • Tempo até a tarefa: ${formatarTempo(tempoParaTarefa)}\n` +
        `  • Tempo até momento de notificação: ${formatarTempo(tempoAteNotificacao)}\n` +
        `  • Notificar com antecedência: ${formatarTempo(milissegundosAntecedencia)}\n` +
        `  • Dentro do limite: ${dentroDoLimiteDeAntecedencia}\n` +
        `  • Notificação recente: ${notificacaoRecente}\n` +
        `  • Notificar ativado: ${tarefa.notificar !== false}\n` +
        `  • Hora atual: ${agora.toLocaleString()}\n` +
        `  • Hora da tarefa: ${dataHoraTarefa.toLocaleString()}\n` +
        `  • Momento da notificação: ${new Date(momentoNotificacao).toLocaleString()}`
      );
    }
  }
  
  // Só notificar se: 
  // 1. A tarefa ainda não ocorreu
  // 2. Estamos no momento certo para notificar
  // 3. Não notificamos recentemente esta tarefa
  return (
    tempoParaTarefa > 0 && 
    dentroDoLimiteDeAntecedencia && 
    !notificacaoRecente
  );
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
  if (!configNotificacoes.ativadas) {
    if (window.debugNotificacoes) {
      console.log("Notificações desativadas nas configurações");
    }
    return;
  }
  
  // Verificar suporte a notificações
  if (!verificarSuporteNotificacoes()) {
    if (window.debugNotificacoes) {
      console.log("Navegador não suporta notificações ou contexto não é seguro");
    }
    return;
  }
  
  // Se não tiver permissão, não fazer nada
  if (Notification.permission !== "granted") {
    if (window.debugNotificacoes) {
      console.log("Permissão para notificações não concedida");
    }
    return;
  }
  
  const agora = new Date();
  const debug = window.debugNotificacoes;
  
  if (debug && agora.getSeconds() === 0) {
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
  
  if (debug && agora.getSeconds() === 0) {
    console.log(`Milissegundos de antecedência: ${milissegundosAntecedencia}ms (${formatarTempo(milissegundosAntecedencia)})`);
  }
  
  // Definir margens de verificação para maior precisão
  // Para tempos muito curtos (< 5 minutos), usar uma margem mais estreita
  let margemDeVerificacao = 60000; // 1 minuto padrão
  
  if (valorAntecedencia < 5 && configNotificacoes.antecedencia.unidade === 'minutos') {
    // Ajustar margem para valores muito curtos (< 5 minutos)
    if (valorAntecedencia <= 1) {
      margemDeVerificacao = 10000; // 10 segundos para 1 minuto ou menos
    } else if (valorAntecedencia <= 2) {
      margemDeVerificacao = 20000; // 20 segundos para 2 minutos
    } else {
      margemDeVerificacao = 30000; // 30 segundos para 3-4 minutos
    }
  }
  
  if (debug && agora.getSeconds() === 0) {
    console.log(`Usando margem de verificação: ${margemDeVerificacao}ms (${formatarTempo(margemDeVerificacao)})`);
  }
  
  // Garantir que o objeto de últimas notificações existe
  if (!window.notificacaoUltimasNotificadas) {
    window.notificacaoUltimasNotificadas = {};
  }
  
  // Para cada tarefa não concluída que tenha notificações ativadas
  tarefas
    .filter(tarefa => 
      !tarefa.concluida && 
      tarefa.data && 
      (tarefa.notificar === undefined || tarefa.notificar === true)
    )
    .forEach(tarefa => {
      try {
        // Converter string para objeto Date
        const dataHoraTarefa = converterParaDate(tarefa.data, tarefa.hora);
        const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
  
        // Verificar se deve notificar
        if (deveNotificar(tarefa, agora, milissegundosAntecedencia, margemDeVerificacao)) {
          enviarNotificacao(tarefa, tempoParaTarefa, configNotificacoes.comSom);
        }
      } catch (error) {
        console.error("Erro ao processar tarefa para notificação:", error, tarefa);
      }
    });
}; 