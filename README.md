# andrepatrinicola.com

Portfolio e Laboratório para desenvolvimento, estudo e publicação de protótipos de jogos para navegador. Inclui projetos feitos com Canvas nativo e frameworks JavaScript, além de ports de jogos originalmente desenvolvidos em outras engines, linguagens e tecnologias.

## Estrutura

```text
apps/site/          Aplicação principal
games/              Jogos 
packages/ui/        Componentes compartilhados
packages/config/    Configurações do monorepo
.github/workflows/  Automações de CI/CD
```

## Requisitos

- Node.js 20 ou superior
- npm

## Desenvolvimento

Instale as dependências e inicie o servidor local:

```bash
npm install
npm run dev
```

O site utiliza o servidor de desenvolvimento do Vite. Não abra `apps/site/index.html` diretamente no navegador.

## Build

```bash
npm run build
```
