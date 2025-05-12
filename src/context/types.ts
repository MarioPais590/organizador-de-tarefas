
import { Tarefa, Categoria, DadosPerfil, Rotina, ConfiguracoesNotificacao } from '@/types';

export interface AppContextType {
  tarefas: Tarefa[];
  categorias: Categoria[];
  rotinas: Rotina[];
  perfil: DadosPerfil;
  configNotificacoes: ConfiguracoesNotificacao;
  user: any | null;
  isLoading: boolean;
  adicionarTarefa: (tarefa: Omit<Tarefa, 'id'>) => Promise<void>;
  atualizarTarefa: (id: string, tarefa: Partial<Tarefa>) => Promise<void>;
  removerTarefa: (id: string) => Promise<void>;
  marcarConcluida: (id: string, concluida: boolean) => Promise<void>;
  adicionarCategoria: (categoria: Omit<Categoria, 'id'>) => Promise<void>;
  atualizarCategoria: (id: string, categoria: Partial<Categoria>) => Promise<void>;
  removerCategoria: (id: string) => Promise<void>;
  atualizarPerfil: (dados: Partial<DadosPerfil>) => Promise<void>;
  adicionarRotina: (rotina: Omit<Rotina, 'id'>) => Promise<void>;
  atualizarRotina: (id: string, rotina: Partial<Rotina>) => Promise<void>;
  removerRotina: (id: string) => Promise<void>;
  atualizarConfigNotificacoes: (config: Partial<ConfiguracoesNotificacao>, showToast?: boolean) => Promise<void>;
  verificarTarefasPendentes: () => void;
  limparTodosDados: () => Promise<void>;
  logout: () => Promise<boolean>; // Changed return type from Promise<void> to Promise<boolean>
}

export const CATEGORIAS_PADRAO: Categoria[] = [
  {
    id: '1',
    nome: 'Trabalho',
    cor: '#3a86ff',
  },
  {
    id: '2',
    nome: 'Pessoal',
    cor: '#8338ec',
  },
  {
    id: '3',
    nome: 'Compras',
    cor: '#fb5607',
  },
  {
    id: '4',
    nome: 'Saúde',
    cor: '#ff006e',
  },
  {
    id: '5',
    nome: 'Lazer',
    cor: '#ffbe0b',
  },
];
