# Organizador de Tarefas

Um aplicativo para organização de tarefas, rotinas e compromissos, desenvolvido com React, TypeScript e Supabase.

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
