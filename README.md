# Organizador de Tarefas

Aplicativo web para gerenciamento de tarefas com notificações e anexos.

## Recursos

- Autenticação de usuários
- Criação, edição e exclusão de tarefas
- Categorização de tarefas
- Anexos em tarefas (com compressão automática de imagens)
- Notificações no navegador
- Modo responsivo (desktop e mobile)
- Tema claro e escuro

## Tecnologias

- React 18
- TypeScript
- Vite
- Supabase (autenticação e banco de dados)
- TailwindCSS
- shadcn/ui
- React Router v6
- React Query
- Sonner (toasts)

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── context/        # Contextos React com lógica de estado global
├── hooks/          # Hooks personalizados
├── integrations/   # Integrações com serviços externos
├── lib/            # Bibliotecas e utilitários
├── pages/          # Páginas da aplicação
├── services/       # Serviços para chamadas à API
├── types/          # Definições de tipos TypeScript
└── utils/          # Funções utilitárias
```

## Arquitetura

O projeto segue uma arquitetura modular baseada em contextos, onde:

- **AuthContext**: Gerencia autenticação e sessão do usuário
- **TaskContext**: Gerencia operações relacionadas a tarefas e categorias
- **NotificationContext**: Gerencia notificações do navegador

Cada contexto exporta um hook personalizado para fácil acesso aos seus dados e métodos.

## Serviços

Os serviços são responsáveis por interagir com o backend:

- **taskService**: Operações CRUD para tarefas
- **anexoService**: Gerenciamento de anexos (upload, processamento)
- **categoriaService**: Operações CRUD para categorias
- **notificationService**: Gerenciamento de notificações do navegador
- **authService**: Autenticação e gestão de usuários

## Inicialização

Para iniciar o projeto em modo de desenvolvimento:

```bash
npm install
npm run dev
```

Para construir o projeto para produção:

```bash
npm run build
```

## Banco de Dados

O aplicativo utiliza o Supabase como backend, com as seguintes tabelas:

- **profiles**: Perfis de usuário
- **tarefas**: Tarefas do usuário
- **categorias**: Categorias para organizar tarefas
- **anexos**: Anexos de tarefas
- **tarefa_anexos**: Relacionamento entre tarefas e anexos
- **config_notificacoes**: Configurações de notificação do usuário

## Documentação

A documentação completa do projeto pode ser encontrada na pasta `docs`:

- [Documentação de Referência](docs/documentacao-referencia.md)
- [Migrações de Banco de Dados](docs/migrations.md)
- [Instruções para Notificações](docs/notificacoes_instrucoes.md)

## Sincronização entre ambientes

Este projeto pode ser executado em diferentes ambientes:

1. **Local (Desenvolvimento)**: Seu ambiente de trabalho local
2. **Lovable**: Ambiente de teste/homologação
3. **Produção**: Ambiente final para usuários

### Como manter os ambientes sincronizados

Para garantir que todos os ambientes funcionem corretamente, siga estas instruções:

1. **Banco de dados (Supabase)**:
   - Execute os scripts SQL da pasta `docs/migrations.md` em cada ambiente
   - Marque cada migração como concluída conforme aplicar

2. **Código**:
   - Use o Git para controle de versão
   - Faça commit das alterações e envie para o repositório remoto
   - Atualize os outros ambientes a partir do repositório

```bash
# Para enviar alterações para o repositório:
git add .
git commit -m "Descrição das alterações"
git push origin main

# Para atualizar outro ambiente a partir do repositório:
git pull origin main
```

## Compatibilidade entre ambientes

O código foi adaptado para ser compatível com diferentes esquemas de banco de dados, permitindo que funcione mesmo quando algumas colunas não existem em todos os ambientes.

## Requisitos

- Node.js 18+
- npm ou Yarn
- Conta no Supabase

## Executando localmente

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173` (ou a porta indicada no terminal).

## Implementação de melhorias

Ao adicionar novos recursos:

1. Documente as alterações no banco de dados em `docs/migrations.md`
2. Escreva código que seja compatível com todos os ambientes
3. Teste em ambiente local antes de enviar para produção

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2c16dc52-6cbf-4bf2-9b5e-bed78096c7f7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2c16dc52-6cbf-4bf2-9b5e-bed78096c7f7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2c16dc52-6cbf-4bf2-9b5e-bed78096c7f7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
