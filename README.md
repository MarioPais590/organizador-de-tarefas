# Organizador de Tarefas - PWA

Um aplicativo web progressivo (PWA) para organização de tarefas e aumento de produtividade.

## Recursos

- Interface de usuário moderna e responsiva
- Modo offline com sincronização automática
- Notificações em segundo plano
- Instalável como aplicativo nativo em dispositivos móveis e desktop
- Temas claro e escuro

## Tecnologias

- React
- TypeScript
- Tailwind CSS
- Vite
- Service Workers
- IndexedDB
- Push API

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/organizador-de-tarefas.git
   cd organizador-de-tarefas
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse o aplicativo em:
   ```
   http://localhost:8080
   ```

## Recursos do PWA

### Ícones

O aplicativo utiliza ícones personalizados para a instalação como PWA. Os ícones são gerados automaticamente a partir de uma imagem base usando o script `generateIconsFromPng.js`.

Para atualizar os ícones:

1. Substitua o arquivo `public/task-manager-icon.png` pela sua imagem base
2. Execute o script:
   ```bash
   node src/utils/generateIconsFromPng.js
   ```

### Service Worker

O aplicativo utiliza um service worker para permitir o funcionamento offline e notificações em segundo plano. O service worker está configurado para:

- Cachear recursos estáticos
- Fornecer uma experiência offline
- Enviar notificações mesmo quando o aplicativo está fechado
- Sincronizar dados em segundo plano

### Diagnóstico do PWA

O aplicativo inclui uma página de diagnóstico que permite verificar o status do PWA:

- Status de instalação
- Registro do service worker
- Validação dos ícones
- Verificação de compatibilidade com o dispositivo

Acesse a página de diagnóstico em `/diagnostico` após fazer login no aplicativo.

## Build para Produção

Para gerar a versão de produção:

```bash
npm run build
```

Os arquivos gerados estarão na pasta `dist`.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.

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
