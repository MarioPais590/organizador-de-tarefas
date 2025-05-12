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
  anexos?: Anexo[];
  notificar?: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

export interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  conteudo: string;
  url?: string;
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
