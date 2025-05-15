// Declarações de tipos globais para o aplicativo

// Declare o tipo global para evitar erros de TypeScript
declare global {
  interface Window {
    notificacaoIntervalId?: ReturnType<typeof setInterval>;
    notificacaoUltimasNotificadas?: Record<string, number>;
    debugNotificacoes?: boolean;
    notificacoesAtivas?: boolean;
    deferredPrompt?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    android?: any;
    webkit?: any;
    location: Location;
  }

  interface ErrorWithStatus extends Error {
    status?: number;
    statusText?: string;
    response?: {
      data?: any;
      status?: number;
      headers?: any;
    };
  }
}

// Interfaces para o aplicativo

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  data?: string;
  hora?: string;
  concluida: boolean;
  notificar: boolean;
  prioridade: 'baixa' | 'media' | 'alta';
  categoria?: string;
  tags?: string[];
  dataCriacao: Date | string;
  repetir?: RepetirTarefa;
  localArmazenamento?: 'local' | 'remoto' | 'ambos';
}

export interface RepetirTarefa {
  tipo: 'diario' | 'semanal' | 'mensal' | 'anual' | 'personalizado';
  dias?: number[]; // Dias da semana (0-6) para repetição semanal
  intervalo?: number; // A cada X dias/semanas/meses
  dataFim?: string; // Data opcional de término da repetição
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  icone?: string;
  descricao?: string;
  dataCriacao: Date | string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  fotoPerfil?: string;
  ultimoAcesso?: Date | string;
  criado?: Date | string;
  configuracoes?: ConfiguracoesUsuario;
}

export interface ConfiguracoesUsuario {
  tema: 'claro' | 'escuro' | 'sistema';
  notificacoes: ConfiguracoesNotificacao;
  sincronizacao: 'automatica' | 'manual' | 'desativada';
  privacidade: {
    compartilharDados: boolean;
    logAnalytics: boolean;
  };
}

export interface ConfiguracoesNotificacao {
  ativadas: boolean;
  comSom: boolean;
  antecedencia: {
    valor: number;
    unidade: 'minutos' | 'horas';
  };
}

export interface NotificacaoEnviada {
  id: string;
  tarefaId: string;
  timestamp: number;
} 