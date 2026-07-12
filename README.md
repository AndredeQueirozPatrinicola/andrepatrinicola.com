# andrepatrinicola.com

Monorepo pessoal de André de Queiroz para site estatico

## Estrutura

```txt
andrepatrinicola.com/
  apps/
    site/
  packages/
    ui/
    config/
  infra/
    terraform/
  .github/
    workflows/
```

## Requisitos

- Node.js 20 ou superior
- npm

## Instalar dependencias

```bash
npm install
```

## Rodar localmente

```bash
npm run dev
```

O site roda pelo Vite em modo de desenvolvimento.

Nao abra `apps/site/index.html` diretamente pelo navegador. Esse arquivo e a entrada de desenvolvimento do Vite e depende de um servidor local para resolver `src/main.tsx`.

## Gerar build

```bash
npm run build
```

O build estatico sera gerado em:

```txt
apps/site/dist/
```

Esse diretorio contem os arquivos prontos para publicacao em S3.

## Preview do build

```bash
npm run preview
```

Use esse comando para testar o conteudo gerado em `apps/site/dist` antes de publicar.

## Deploy futuro para AWS

A integracao real com AWS ainda nao foi implementada. A arquitetura planejada e:

1. Gerar o build estatico em `apps/site/dist`.
2. Enviar os arquivos do build para um bucket S3 configurado para hosting estatico ou origem privada.
3. Distribuir o site publicamente via CloudFront.
4. Configurar invalidacao de cache do CloudFront apos novos deploys.
5. Automatizar o processo com GitHub Actions.
6. Gerenciar a infraestrutura com Terraform em `infra/terraform`.

## CI

O workflow inicial em `.github/workflows/ci.yml` instala dependencias, roda lint e gera o build.

## Escopo atual

- Sem backend
- Sem banco de dados
- Sem autenticacao
- Sem integracao real com AWS
- Site estatico simples, monocromatico e pronto para primeira publicacao
