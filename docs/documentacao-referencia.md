# Documentação de Referência - Organizador de Tarefas

## Visão Geral

O Organizador de Tarefas é uma aplicação web desenvolvida para ajudar os usuários a gerenciar suas tarefas diárias, rotinas e compromissos, aumentando sua produtividade. A aplicação permite criar, editar, categorizar e monitorar tarefas, bem como definir rotinas recorrentes.

## Tecnologias Utilizadas

### Frontend
- **React**: Biblioteca JavaScript para construção da interface de usuário
- **TypeScript**: Linguagem de programação tipada baseada em JavaScript
- **Vite**: Ferramenta de build rápida para aplicações web modernas
- **React Router**: Biblioteca para roteamento no lado do cliente
- **Tailwind CSS**: Framework CSS utilitário para design rápido
- **Shadcn/UI**: Componentes de interface reutilizáveis e acessíveis
- **Lucide React**: Biblioteca de ícones
- **React Query**: Biblioteca para gerenciamento de estado e requisições
- **React Hook Form**: Biblioteca para gerenciamento de formulários
- **Zod**: Biblioteca para validação de esquemas
- **Sonner**: Biblioteca para notificações toast
- **Date-fns**: Biblioteca para manipulação de datas

### Backend
- **Supabase**: Plataforma de backend como serviço (BaaS) para autenticação, banco de dados e armazenamento

## Estrutura do Projeto

```
organizador-de-tarefas/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   │   ├── tarefas/    # Componentes relacionados a tarefas
│   │   ├── rotinas/    # Componentes relacionados a rotinas
│   │   ├── sidebar/    # Componentes de navegação lateral
│   │   ├── settings/   # Componentes de configurações
│   │   └── ui/         # Componentes de interface genéricos
│   ├── context/        # Contextos React globais
│   ├── hooks/          # Hooks personalizados
│   ├── integrations/   # Integrações com serviços externos (Supabase)
│   ├── lib/            # Bibliotecas e utilidades
│   ├── pages/          # Páginas da aplicação
│   ├── types/          # Definições de tipos TypeScript
│   └── utils/          # Funções utilitárias
├── public/             # Arquivos públicos (imagens, favicon, etc.)
├── docs/               # Documentação do projeto
└── supabase/           # Configurações e scripts do Supabase
```

## Principais Características

### 1. Gestão de Tarefas
- Criação, edição e exclusão de tarefas
- Marcação de tarefas como concluídas
- Adição de anexos às tarefas
- Visualização detalhada de tarefas
- Filtragem de tarefas por estado (pendentes/concluídas)

### 2. Categorização
- Categorias personalizáveis com cores
- Atribuição de categorias às tarefas
- Gestão de categorias pelo usuário

### 3. Rotinas
- Criação de rotinas diárias, semanais ou mensais
- Programação de horários para rotinas
- Seleção de dias específicos para rotinas semanais/mensais

### 4. Notificações
- Configuração de notificações para tarefas
- Ajuste de antecedência das notificações
- Opção de notificações sonoras

### 5. Personalização
- Personalização do perfil do usuário
- Ajuste de cores e estilos visuais
- Configuração de nome e logo do aplicativo

## Modelos de Dados

### Tarefa
```typescript
interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao?: Date;
  dataVencimento?: Date;
  data: string;
  hora?: string;
  categoria: Categoria;
  prioridade: 'baixa' | 'media' | 'alta';
  concluida: boolean;
  anexos?: Anexo[];
}
```

### Categoria
```typescript
interface Categoria {
  id: string;
  nome: string;
  cor: string;
}
```

### Rotina
```typescript
interface Rotina {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: 'diaria' | 'semanal' | 'mensal';
  dias?: number[] | null;
  diasDoMes?: number[] | null;
  horario?: string;
  tarefas?: any[];
}
```

### Perfil
```typescript
interface DadosPerfil {
  nome: string;
  nomeApp?: string;
  avatar?: string;
  logo?: string;
  subtitulo?: string;
  corTitulo?: string;
  corSubtitulo?: string;
}
```

### Configurações de Notificação
```typescript
interface ConfiguracoesNotificacao {
  ativadas: boolean;
  comSom: boolean;
  antecedencia: {
    valor: number;
    unidade: 'minutos' | 'horas';
  }
}
```

## Fluxo de Autenticação

A aplicação utiliza o Supabase para autenticação:
1. Os usuários podem se registrar com email/senha
2. Login automático com base em sessões persistentes
3. Proteção de rotas através do componente `AuthGuard`
4. Gerenciamento de sessão via contexto global

## Gerenciamento de Estado

O estado global da aplicação é gerenciado através de:
1. Contexto React (`AppContext`) para dados compartilhados
2. React Query para gerenciamento de requisições ao servidor
3. Estados locais para componentes específicos

## Estilo e Design

A interface do usuário segue os seguintes princípios:
1. Design responsivo para funcionar em diversos dispositivos
2. Esquema de cores consistente baseado em azul como cor primária
3. Componentes modulares e reutilizáveis
4. Suporte a tema claro/escuro
5. Feedback visual através de animações e notificações

## Funções Principais

### Gerenciamento de Tarefas
- `adicionarTarefa`: Adiciona uma nova tarefa
- `removerTarefa`: Remove uma tarefa existente
- `marcarConcluida`: Altera o estado de conclusão de uma tarefa
- `atualizarTarefa`: Atualiza os dados de uma tarefa existente

### Gerenciamento de Rotinas
- `adicionarRotina`: Adiciona uma nova rotina
- `atualizarRotina`: Atualiza uma rotina existente
- `removerRotina`: Remove uma rotina existente

### Gerenciamento de Categorias
- `adicionarCategoria`: Adiciona uma nova categoria
- `atualizarCategoria`: Atualiza uma categoria existente
- `removerCategoria`: Remove uma categoria existente

## Integração com o Supabase

A aplicação integra-se com o Supabase para:
1. Autenticação e gerenciamento de usuários
2. Armazenamento de dados em tabelas PostgreSQL
3. Upload e gerenciamento de arquivos anexos

## Boas Práticas Implementadas

1. **Componentização**: Divisão da UI em componentes reutilizáveis
2. **Tipagem forte**: Uso de TypeScript para evitar erros em tempo de execução
3. **Lazy loading**: Carregamento sob demanda para melhor performance
4. **Responsive design**: Adaptação a diferentes tamanhos de tela
5. **Estado global**: Gerenciamento eficiente de estado com contextos
6. **Proteção de rotas**: Verificação de autenticação para acesso a páginas protegidas
7. **Feedback ao usuário**: Notificações e indicadores de carregamento 