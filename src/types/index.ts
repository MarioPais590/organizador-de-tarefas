export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao?: Date; // Changed from required to optional
  dataVencimento?: Date;
  data: string;
  hora?: string;
  categoria: Categoria;
  prioridade: 'baixa' | 'media' | 'alta';
  concluida: boolean;
  notificar?: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

export interface DadosPerfil {
  nome: string;
  nomeApp?: string;
  avatar?: string;
  logo?: string;
  subtitulo?: string;
  corTitulo?: string;
  corSubtitulo?: string;
}

export interface Rotina {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: 'diaria' | 'semanal' | 'mensal';
  dias?: number[] | null;
  diasDoMes?: number[] | null;
  horario?: string;
  tarefas?: any[];
}

export interface ConfiguracoesNotificacao {
  ativadas: boolean;
  comSom: boolean;
  antecedencia: {
    valor: number;
    unidade: 'minutos' | 'horas';
  }
}

/**
 * Interface para o evento beforeinstallprompt
 * Fonte: https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
export interface BeforeInstallPromptEvent extends Event {
  /**
   * Retorna uma promessa que resolve para um objeto contendo
   * a escolha do usuário
   */
  prompt(): Promise<void>;
  
  /**
   * Retorna uma promessa que resolve para um objeto contendo
   * o resultado da escolha do usuário
   */
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}
