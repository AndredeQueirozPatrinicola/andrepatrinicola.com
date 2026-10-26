/**
 * The architecture of andrepatrinicola.com.br as it is in the code: the
 * site repository (S3 + CloudFront, GitHub Actions) and the API repository
 * (Terraform in infra/, handlers in src/). Concepts only: no account ids,
 * ARNs, bucket names or endpoints. Update it when the infrastructure
 * changes (see docs/ARCHITECTURE_STUDIO.md).
 */
import type { TemplateDefinition } from "./types";

export const portfolioTemplate: TemplateDefinition = {
  id: "portfolio",
  links: [
    {
      label: { pt: "Código-fonte do site", en: "Site source code", es: "Código fuente del sitio" },
      href: "https://github.com/AndredeQueirozPatrinicola/andrepatrinicola.com",
    },
    {
      label: { pt: "Distributed Systems Playground", en: "Distributed Systems Playground", es: "Distributed Systems Playground" },
      href: "/labs/distributed-systems",
    },
  ],
  nodes: [
    // ------------------------------------------------------------ outside AWS
    {
      id: "visitor",
      serviceId: "generic-user",
      label: { pt: "Visitante", en: "Visitor", es: "Visitante" },
      at: [0, 90],
      description: {
        pt: "Qualquer pessoa no site público. Lê páginas pré-renderizadas; só o formulário de contato e o assistente chamam a API.",
        en: "Anyone on the public site. Reads pre-rendered pages; only the contact form and the assistant call the API.",
        es: "Cualquier persona en el sitio público. Lee páginas pre-renderizadas; solo el formulario de contacto y el asistente llaman a la API.",
      },
    },
    {
      id: "umami",
      serviceId: "generic-external-service",
      label: "Umami Cloud",
      at: [0, -60],
      description: {
        pt: "Métricas anônimas de visitas e cliques, sem cookies de rastreamento. O script só carrega depois do consentimento.",
        en: "Anonymous visit and click metrics, without tracking cookies. The script only loads after consent.",
        es: "Métricas anónimas de visitas y clics, sin cookies de rastreo. El script solo se carga tras el consentimiento.",
      },
    },
    {
      id: "admin",
      serviceId: "generic-user",
      label: { pt: "Admin (/admin)", en: "Admin (/admin)", es: "Admin (/admin)" },
      at: [0, 620],
      tone: "blue",
      description: {
        pt: "O Portfolio Studio: um CMS client-only em /admin, servido pelo mesmo CloudFront. Os dados vêm da API, autenticados pelo Cognito.",
        en: "Portfolio Studio: a client-only CMS at /admin, served by the same CloudFront. Its data comes from the API, authenticated by Cognito.",
        es: "Portfolio Studio: un CMS solo de cliente en /admin, servido por el mismo CloudFront. Los datos vienen de la API, autenticados por Cognito.",
      },
    },
    {
      id: "github",
      serviceId: "generic-pipeline",
      label: "GitHub Actions",
      at: [0, 960],
      description: {
        pt: "Workflow de deploy do site: congela o conteúdo publicado, roda lint e testes, pré-renderiza, envia ao S3, invalida o CloudFront e reporta o resultado. Também é disparado pelo Studio, por um GitHub App.",
        en: "The site's deploy workflow: freezes the published content, runs lint and tests, pre-renders, uploads to S3, invalidates CloudFront and reports the result. Portfolio Studio also triggers it, through a GitHub App.",
        es: "Workflow de despliegue del sitio: congela el contenido publicado, ejecuta lint y pruebas, pre-renderiza, sube a S3, invalida CloudFront e informa el resultado. Portfolio Studio también lo dispara, mediante una GitHub App.",
      },
    },
    {
      id: "turnstile",
      serviceId: "generic-external-service",
      label: "Cloudflare Turnstile",
      at: [880, -150],
      description: {
        pt: "CAPTCHA sem fricção. As Lambdas validam o token (siteverify) antes de enviar e-mail ou abrir uma conversa nova.",
        en: "Low-friction CAPTCHA. The Lambdas validate its token (siteverify) before sending email or starting a new conversation.",
        es: "CAPTCHA sin fricción. Las Lambdas validan el token (siteverify) antes de enviar correo o abrir una conversación nueva.",
      },
    },
    {
      id: "linkedin",
      serviceId: "generic-external-service",
      label: "LinkedIn API",
      at: [1840, 560],
      description: {
        pt: "Publicação de posts sobre os artigos (OAuth com escopo w_member_social). Tokens ficam só no Parameter Store.",
        en: "Publishes posts about the articles (OAuth with the w_member_social scope). Tokens live only in Parameter Store.",
        es: "Publica posts sobre los artículos (OAuth con el alcance w_member_social). Los tokens quedan solo en Parameter Store.",
      },
    },
    // ---------------------------------------------------------------- AWS
    {
      id: "aws",
      serviceId: "group-aws-cloud",
      label: "AWS · us-east-1",
      at: [220, 0],
      size: { width: 1560, height: 1240 },
      description: {
        pt: "Uma conta AWS, tudo em us-east-1. A infraestrutura da API está em Terraform; a distribuição do CloudFront do site é configurada à mão.",
        en: "One AWS account, everything in us-east-1. The API's infrastructure is in Terraform; the site's CloudFront distribution is configured by hand.",
        es: "Una cuenta de AWS, todo en us-east-1. La infraestructura de la API está en Terraform; la distribución de CloudFront del sitio se configura a mano.",
      },
    },
    {
      id: "site",
      serviceId: "group-generic",
      label: { pt: "Site estático", en: "Static site", es: "Sitio estático" },
      in: "aws",
      at: [280, 40],
      size: { width: 232, height: 280 },
    },
    {
      id: "cloudfront",
      serviceId: "aws-cloudfront",
      label: "CloudFront",
      in: "site",
      at: [304, 90],
      description: {
        pt: "HTTPS e cache na borda. Uma CloudFront Function reescreve URLs limpas para o index.html de cada página e serve o shell do /admin; páginas inexistentes recebem /404.html.",
        en: "HTTPS and edge caching. A CloudFront Function rewrites clean URLs to each page's index.html and serves the /admin shell; missing pages get /404.html.",
        es: "HTTPS y caché en el borde. Una CloudFront Function reescribe URLs limpias al index.html de cada página y sirve el shell de /admin; las páginas inexistentes reciben /404.html.",
      },
    },
    {
      id: "s3-site",
      serviceId: "aws-s3",
      label: { pt: "S3 · site", en: "S3 · site", es: "S3 · sitio" },
      in: "site",
      at: [304, 220],
      description: {
        pt: "Bucket privado com o HTML pré-renderizado de cada rota em três idiomas, os jogos e as imagens do blog em WebP. Só o CloudFront lê.",
        en: "Private bucket with the pre-rendered HTML of every route in three languages, the games and the blog images as WebP. Only CloudFront reads it.",
        es: "Bucket privado con el HTML pre-renderizado de cada ruta en tres idiomas, los juegos y las imágenes del blog en WebP. Solo CloudFront lo lee.",
      },
    },
    {
      id: "api",
      serviceId: "group-generic",
      label: { pt: "API serverless", en: "Serverless API", es: "API serverless" },
      in: "aws",
      at: [560, 300],
      size: { width: 540, height: 580 },
    },
    {
      id: "apigw",
      serviceId: "aws-api-gateway",
      label: "API Gateway (HTTP API)",
      in: "api",
      at: [600, 540],
      description: {
        pt: "Uma HTTP API com CORS só para o domínio do site e throttling por rota. Dois authorizers JWT: Cognito para /admin/* e GitHub OIDC para /publishing/*.",
        en: "One HTTP API with CORS only for the site's domain and per-route throttling. Two JWT authorizers: Cognito for /admin/* and GitHub OIDC for /publishing/*.",
        es: "Una HTTP API con CORS solo para el dominio del sitio y throttling por ruta. Dos authorizers JWT: Cognito para /admin/* y GitHub OIDC para /publishing/*.",
      },
    },
    {
      id: "contact",
      serviceId: "aws-lambda",
      label: "Lambda contact",
      in: "api",
      at: [880, 330],
      description: {
        pt: "POST /contact: valida o formulário e o Turnstile e envia o e-mail pelo SES. Node.js 24 em arm64.",
        en: "POST /contact: validates the form and Turnstile and sends the email through SES. Node.js 24 on arm64.",
        es: "POST /contact: valida el formulario y Turnstile y envía el correo por SES. Node.js 24 en arm64.",
      },
    },
    {
      id: "studio",
      serviceId: "aws-lambda",
      label: "Lambda studio",
      in: "api",
      at: [880, 440],
      description: {
        pt: "O backend do CMS: artigos, revisões, mídia e publicação. Confere o grupo admin no token e congela o snapshot de cada deploy.",
        en: "The CMS backend: articles, revisions, media and publishing. Checks the admin group in the token and freezes each deploy's snapshot.",
        es: "El backend del CMS: artículos, revisiones, medios y publicación. Verifica el grupo admin en el token y congela el snapshot de cada despliegue.",
      },
    },
    {
      id: "social",
      serviceId: "aws-lambda",
      label: "Lambda social",
      in: "api",
      at: [880, 550],
      description: {
        pt: "Integração com o LinkedIn: OAuth, rascunhos, aprovação e posts agendados. A única Lambda que lê os tokens do LinkedIn.",
        en: "LinkedIn integration: OAuth, drafts, approval and scheduled posts. The only Lambda that reads the LinkedIn tokens.",
        es: "Integración con LinkedIn: OAuth, borradores, aprobación y posts programados. La única Lambda que lee los tokens de LinkedIn.",
      },
    },
    {
      id: "ai-chat",
      serviceId: "aws-lambda",
      label: "Lambda ai-chat",
      in: "api",
      at: [880, 660],
      description: {
        pt: "POST /ai/chat: aplica os limites por visitante e globais, chama o Knowledge Base e devolve a resposta com as páginas citadas.",
        en: "POST /ai/chat: applies per-visitor and global limits, calls the Knowledge Base and returns the answer with the cited pages.",
        es: "POST /ai/chat: aplica los límites por visitante y globales, llama a la Knowledge Base y devuelve la respuesta con las páginas citadas.",
      },
    },
    {
      id: "ai-ingest",
      serviceId: "aws-lambda",
      label: "Lambda ai-ingest",
      in: "api",
      at: [880, 790],
      description: {
        pt: "Sincroniza o conhecimento do assistente depois de cada deploy, um job por vez.",
        en: "Syncs the assistant's knowledge after every deploy, one job at a time.",
        es: "Sincroniza el conocimiento del asistente después de cada despliegue, un job a la vez.",
      },
    },
    {
      id: "cognito",
      serviceId: "aws-cognito",
      label: "Cognito",
      in: "aws",
      at: [280, 720],
      description: {
        pt: "User pool do admin: login gerenciado, authorization code com PKCE, MFA TOTP obrigatório e criação de usuários só por administrador.",
        en: "The admin's user pool: managed login, authorization code with PKCE, required TOTP MFA and admin-only user creation.",
        es: "User pool del admin: login administrado, authorization code con PKCE, MFA TOTP obligatorio y creación de usuarios solo por administrador.",
      },
    },
    {
      id: "iam",
      serviceId: "aws-iam",
      label: { pt: "IAM · role de deploy", en: "IAM · deploy role", es: "IAM · rol de despliegue" },
      in: "aws",
      at: [280, 860],
      description: {
        pt: "O workflow assume uma role por OIDC (AssumeRoleWithWebIdentity), sem chaves de acesso guardadas no GitHub.",
        en: "The workflow assumes a role through OIDC (AssumeRoleWithWebIdentity), with no access keys stored in GitHub.",
        es: "El workflow asume un rol por OIDC (AssumeRoleWithWebIdentity), sin claves de acceso guardadas en GitHub.",
      },
    },
    {
      id: "ssm",
      serviceId: "aws-ssm-parameter-store",
      label: "Parameter Store",
      in: "aws",
      at: [1198, 950],
      description: {
        pt: "Segredos em SecureString, criados à mão e fora do state do Terraform: Turnstile, chave do GitHub App e tokens do LinkedIn. Cada Lambda só lê o que precisa.",
        en: "SecureString secrets, created by hand and kept out of the Terraform state: Turnstile, the GitHub App key and LinkedIn tokens. Each Lambda reads only what it needs.",
        es: "Secretos en SecureString, creados a mano y fuera del state de Terraform: Turnstile, la clave de la GitHub App y los tokens de LinkedIn. Cada Lambda lee solo lo que necesita.",
      },
    },
    {
      id: "cloudwatch",
      serviceId: "aws-cloudwatch",
      label: "CloudWatch Logs",
      in: "aws",
      at: [1460, 950],
      description: {
        pt: "Um log group por Lambda, com retenção definida no Terraform. As conexões foram omitidas para não poluir o diagrama.",
        en: "One log group per Lambda, with retention set in Terraform. The connections are left out to keep the diagram readable.",
        es: "Un log group por Lambda, con retención definida en Terraform. Las conexiones se omiten para no saturar el diagrama.",
      },
    },
    {
      id: "terraform-note",
      serviceId: "generic-note",
      label: "Terraform",
      in: "aws",
      at: [280, 1060],
      size: { width: 300, height: 140 },
      description: {
        pt: "A API e seus recursos são Terraform (state remoto em S3 com lockfile). O código das Lambdas chega pelo workflow de deploy da API, não pelo Terraform.",
        en: "The API and its resources are Terraform (remote state in S3 with a lockfile). Lambda code arrives through the API's deploy workflow, not through Terraform.",
        es: "La API y sus recursos son Terraform (state remoto en S3 con lockfile). El código de las Lambdas llega por el workflow de despliegue de la API, no por Terraform.",
      },
    },
    {
      id: "data",
      serviceId: "group-generic",
      label: { pt: "Dados", en: "Data", es: "Datos" },
      in: "aws",
      at: [1160, 300],
      size: { width: 260, height: 270 },
    },
    {
      id: "dynamodb",
      serviceId: "aws-dynamodb",
      label: { pt: "DynamoDB (tabela única)", en: "DynamoDB (single table)", es: "DynamoDB (tabla única)" },
      in: "data",
      at: [1198, 340],
      description: {
        pt: "Uma tabela on-demand para tudo: artigos, revisões, slugs, deploys, posts, limites do assistente e controle da ingestão.",
        en: "One on-demand table for everything: articles, revisions, slugs, deployments, posts, assistant limits and ingestion control.",
        es: "Una tabla on-demand para todo: artículos, revisiones, slugs, despliegues, posts, límites del asistente y control de la ingesta.",
      },
    },
    {
      id: "s3-studio",
      serviceId: "aws-s3",
      label: "S3 · studio",
      in: "data",
      at: [1198, 460],
      description: {
        pt: "Bucket privado e versionado: uploads, mídia original, revisões imutáveis, snapshots de deploy e os documentos do site para o assistente.",
        en: "Private, versioned bucket: uploads, original media, immutable revisions, deploy snapshots and the site documents for the assistant.",
        es: "Bucket privado y versionado: uploads, medios originales, revisiones inmutables, snapshots de despliegue y los documentos del sitio para el asistente.",
      },
    },
    {
      id: "ses",
      serviceId: "aws-ses",
      label: "SES",
      in: "aws",
      at: [1500, 200],
      description: {
        pt: "Entrega as mensagens do formulário de contato na minha caixa de entrada.",
        en: "Delivers the contact form messages to my inbox.",
        es: "Entrega los mensajes del formulario de contacto en mi bandeja de entrada.",
      },
    },
    {
      id: "scheduler",
      serviceId: "aws-eventbridge",
      label: "EventBridge Scheduler",
      in: "aws",
      at: [1500, 450],
      description: {
        pt: "Agendamentos únicos (at(...)) que invocam a Lambda social na hora marcada e são apagados depois.",
        en: "One-time schedules (at(...)) that invoke the social Lambda at the chosen time and are deleted afterwards.",
        es: "Programaciones únicas (at(...)) que invocan la Lambda social a la hora indicada y se borran después.",
      },
    },
    {
      id: "rag",
      serviceId: "group-generic",
      label: { pt: "Assistente (RAG)", en: "Assistant (RAG)", es: "Asistente (RAG)" },
      in: "aws",
      at: [1160, 620],
      size: { width: 600, height: 270 },
    },
    {
      id: "kb",
      serviceId: "aws-bedrock-knowledge-bases",
      label: "Knowledge Base",
      in: "rag",
      at: [1198, 670],
      description: {
        pt: "RetrieveAndGenerate faz o RAG inteiro numa chamada. A ingestão divide os documentos em trechos de 300 tokens e grava os vetores.",
        en: "RetrieveAndGenerate does the whole RAG round trip in one call. Ingestion splits documents into 300-token chunks and writes the vectors.",
        es: "RetrieveAndGenerate hace todo el RAG en una llamada. La ingesta divide los documentos en fragmentos de 300 tokens y escribe los vectores.",
      },
    },
    {
      id: "bedrock",
      serviceId: "aws-bedrock",
      label: "Nova Lite · Titan V2",
      in: "rag",
      at: [1500, 670],
      description: {
        pt: "Modelos do Bedrock na própria região: Titan Text Embeddings V2 (1024 dimensões) para os vetores e Nova Lite para as respostas.",
        en: "Bedrock models in the same Region: Titan Text Embeddings V2 (1024 dimensions) for the vectors and Nova Lite for the answers.",
        es: "Modelos de Bedrock en la misma región: Titan Text Embeddings V2 (1024 dimensiones) para los vectores y Nova Lite para las respuestas.",
      },
    },
    {
      id: "s3-knowledge",
      serviceId: "aws-s3",
      label: "S3 · knowledge",
      in: "rag",
      at: [1198, 790],
      description: {
        pt: "A fonte de dados do Knowledge Base: um Markdown por página e idioma, com metadados. Só conteúdo público do site.",
        en: "The Knowledge Base's data source: one Markdown file per page and language, with metadata. Public site content only.",
        es: "La fuente de datos de la Knowledge Base: un Markdown por página e idioma, con metadatos. Solo contenido público del sitio.",
      },
    },
    {
      id: "s3-vectors",
      serviceId: "aws-s3-vectors",
      label: "S3 Vectors",
      in: "rag",
      at: [1500, 790],
      description: {
        pt: "Índice vetorial (cosseno) com filtros por idioma e por documentos revogados. Sem custo fixo, ao contrário de um cluster de busca.",
        en: "Vector index (cosine) with filters by language and revoked documents. No fixed cost, unlike a search cluster.",
        es: "Índice vectorial (coseno) con filtros por idioma y documentos revocados. Sin costo fijo, a diferencia de un clúster de búsqueda.",
      },
    },
  ],
  edges: [
    { id: "visit-cf", source: "visitor", target: "cloudfront", label: "HTTPS", mode: "synchronous" },
    { id: "cf-s3", source: "cloudfront", target: "s3-site", label: "Origin", mode: "data-flow" },
    { id: "visit-umami", source: "visitor", target: "umami", label: "Events", mode: "asynchronous" },
    { id: "visit-api", source: "visitor", target: "apigw", label: "HTTPS", mode: "synchronous", from: "bottom", to: "left" },
    { id: "admin-cf", source: "admin", target: "cloudfront", label: "HTTPS", mode: "synchronous" },
    { id: "admin-cognito", source: "admin", target: "cognito", label: "OAuth + PKCE", mode: "synchronous" },
    { id: "admin-api", source: "admin", target: "apigw", label: "Bearer JWT", mode: "synchronous" },
    { id: "api-cognito", source: "apigw", target: "cognito", label: "JWT authorizer", mode: "data-flow" },
    { id: "api-contact", source: "apigw", target: "contact", label: "Invoke", mode: "synchronous" },
    { id: "api-studio", source: "apigw", target: "studio", label: "Invoke", mode: "synchronous" },
    { id: "api-social", source: "apigw", target: "social", label: "Invoke", mode: "synchronous" },
    { id: "api-chat", source: "apigw", target: "ai-chat", label: "Invoke", mode: "synchronous" },
    { id: "contact-turnstile", source: "contact", target: "turnstile", label: "siteverify", mode: "synchronous" },
    { id: "contact-ses", source: "contact", target: "ses", label: "SendEmail", mode: "synchronous", from: "top", to: "top" },
    { id: "contact-ssm", source: "contact", target: "ssm", mode: "data-flow" },
    { id: "studio-ddb", source: "studio", target: "dynamodb", mode: "data-flow" },
    { id: "studio-s3", source: "studio", target: "s3-studio", mode: "data-flow" },
    { id: "studio-ssm", source: "studio", target: "ssm", mode: "data-flow" },
    { id: "studio-github", source: "studio", target: "github", label: "workflow_dispatch", mode: "asynchronous", from: "right", to: "bottom" },
    { id: "studio-ingest", source: "studio", target: "ai-ingest", label: "Invoke (async)", mode: "asynchronous", from: "right", to: "right" },
    { id: "github-api", source: "github", target: "apigw", label: "OIDC: snapshot, status", mode: "synchronous", from: "right", to: "bottom" },
    { id: "github-iam", source: "github", target: "iam", label: "AssumeRole (OIDC)", mode: "synchronous" },
    { id: "github-s3", source: "github", target: "s3-site", label: "s3 sync", mode: "data-flow" },
    { id: "github-cf", source: "github", target: "cloudfront", label: "Invalidation", mode: "synchronous" },
    { id: "social-ddb", source: "social", target: "dynamodb", mode: "data-flow" },
    { id: "social-ssm", source: "social", target: "ssm", mode: "data-flow" },
    { id: "social-scheduler", source: "social", target: "scheduler", label: "Schedule / Invoke", mode: "asynchronous", arrow: "both", from: "right", to: "bottom" },
    { id: "social-linkedin", source: "social", target: "linkedin", label: "Posts API", mode: "synchronous" },
    { id: "chat-turnstile", source: "ai-chat", target: "turnstile", label: "siteverify", mode: "synchronous", from: "left", to: "left" },
    { id: "chat-ddb", source: "ai-chat", target: "dynamodb", label: "Limits", mode: "data-flow" },
    { id: "chat-ssm", source: "ai-chat", target: "ssm", mode: "data-flow" },
    { id: "chat-kb", source: "ai-chat", target: "kb", label: "RetrieveAndGenerate", mode: "synchronous" },
    { id: "ingest-s3-studio", source: "ai-ingest", target: "s3-studio", mode: "data-flow" },
    { id: "ingest-ddb", source: "ai-ingest", target: "dynamodb", label: "Lease", mode: "data-flow" },
    { id: "ingest-s3-knowledge", source: "ai-ingest", target: "s3-knowledge", mode: "data-flow" },
    { id: "ingest-kb", source: "ai-ingest", target: "kb", label: "StartIngestionJob", mode: "asynchronous" },
    { id: "kb-s3-knowledge", source: "kb", target: "s3-knowledge", label: "Read", mode: "data-flow" },
    { id: "kb-bedrock", source: "kb", target: "bedrock", label: "InvokeModel", mode: "synchronous" },
    { id: "kb-vectors", source: "kb", target: "s3-vectors", label: "Query/Put", mode: "data-flow" },
  ],
  flows: [
    {
      id: "public-site",
      title: { pt: "Acesso ao site público", en: "Visiting the public site", es: "Acceso al sitio público" },
      steps: [
        {
          nodes: ["visitor", "cloudfront"],
          edges: ["visit-cf"],
          text: {
            pt: "O navegador pede /pt/labs ao CloudFront. Uma CloudFront Function reescreve a URL limpa para /pt/labs/index.html; URLs com barra no fim são redirecionadas para a versão sem barra.",
            en: "The browser asks CloudFront for /en/labs. A CloudFront Function rewrites the clean URL to /en/labs/index.html; URLs with a trailing slash redirect to the version without it.",
            es: "El navegador pide /es/labs a CloudFront. Una CloudFront Function reescribe la URL limpia a /es/labs/index.html; las URLs con barra final se redirigen a la versión sin barra.",
          },
        },
        {
          nodes: ["cloudfront", "s3-site"],
          edges: ["cf-s3"],
          text: {
            pt: "Sem cache, o CloudFront busca o arquivo no bucket privado. Cada página já está pronta em HTML: foi pré-renderizada no build, em três idiomas.",
            en: "On a cache miss, CloudFront fetches the file from the private bucket. Every page is already HTML: it was pre-rendered at build time, in three languages.",
            es: "Sin caché, CloudFront busca el archivo en el bucket privado. Cada página ya es HTML: se pre-renderizó en el build, en tres idiomas.",
          },
        },
        {
          nodes: ["visitor", "umami"],
          edges: ["visit-umami"],
          text: {
            pt: "O React hidrata a página e a navegação segue no cliente. Nenhuma página pede conteúdo à API; métricas anônimas vão para o Umami só depois do consentimento.",
            en: "React hydrates the page and navigation continues on the client. No page asks the API for content; anonymous metrics go to Umami only after consent.",
            es: "React hidrata la página y la navegación sigue en el cliente. Ninguna página pide contenido a la API; las métricas anónimas van a Umami solo tras el consentimiento.",
          },
        },
      ],
    },
    {
      id: "contact",
      title: { pt: "Formulário de contato", en: "Contact form", es: "Formulario de contacto" },
      steps: [
        {
          nodes: ["visitor", "apigw", "contact"],
          edges: ["visit-api", "api-contact"],
          text: {
            pt: "POST /contact passa pelo API Gateway, que só aceita a origem do site e limita a taxa de requisições.",
            en: "POST /contact goes through API Gateway, which only accepts the site's origin and throttles requests.",
            es: "POST /contact pasa por API Gateway, que solo acepta el origen del sitio y limita la tasa de solicitudes.",
          },
        },
        {
          nodes: ["contact", "ssm", "turnstile"],
          edges: ["contact-ssm", "contact-turnstile"],
          text: {
            pt: "A Lambda valida os campos, lê o segredo do Turnstile no Parameter Store e confirma o token na Cloudflare antes de qualquer envio.",
            en: "The Lambda validates the fields, reads the Turnstile secret from Parameter Store and confirms the token with Cloudflare before sending anything.",
            es: "La Lambda valida los campos, lee el secreto de Turnstile en Parameter Store y confirma el token con Cloudflare antes de enviar nada.",
          },
        },
        {
          nodes: ["contact", "ses"],
          edges: ["contact-ses"],
          text: {
            pt: "Com o token aceito, o SES entrega a mensagem. O endereço do visitante vai como Reply-To, nunca como remetente.",
            en: "With the token accepted, SES delivers the message. The visitor's address goes in Reply-To, never as the sender.",
            es: "Con el token aceptado, SES entrega el mensaje. La dirección del visitante va como Reply-To, nunca como remitente.",
          },
        },
      ],
    },
    {
      id: "admin-login",
      title: { pt: "Autenticação administrativa", en: "Admin authentication", es: "Autenticación administrativa" },
      steps: [
        {
          nodes: ["admin", "cloudfront", "cognito"],
          edges: ["admin-cf", "admin-cognito"],
          text: {
            pt: "O CloudFront serve o shell do /admin, que não contém dados. O login acontece no Cognito: authorization code com PKCE e MFA TOTP obrigatório.",
            en: "CloudFront serves the /admin shell, which holds no data. Sign-in happens in Cognito: authorization code with PKCE and required TOTP MFA.",
            es: "CloudFront sirve el shell de /admin, que no contiene datos. El inicio de sesión ocurre en Cognito: authorization code con PKCE y MFA TOTP obligatorio.",
          },
        },
        {
          nodes: ["admin", "apigw", "cognito"],
          edges: ["admin-api", "api-cognito"],
          text: {
            pt: "Cada chamada leva o access token. O authorizer JWT do API Gateway confere emissor e cliente com as chaves públicas do Cognito; um token inválido nem chega à Lambda.",
            en: "Every call carries the access token. API Gateway's JWT authorizer checks issuer and client against Cognito's public keys; an invalid token never reaches the Lambda.",
            es: "Cada llamada lleva el access token. El authorizer JWT de API Gateway verifica emisor y cliente con las claves públicas de Cognito; un token inválido nunca llega a la Lambda.",
          },
        },
        {
          nodes: ["apigw", "studio", "dynamodb"],
          edges: ["api-studio", "studio-ddb"],
          text: {
            pt: "A Lambda studio exige o grupo admin no token: autenticação na borda, autorização no código. Só então lê ou grava.",
            en: "The studio Lambda requires the admin group in the token: authentication at the edge, authorization in code. Only then does it read or write.",
            es: "La Lambda studio exige el grupo admin en el token: autenticación en el borde, autorización en el código. Solo entonces lee o escribe.",
          },
        },
      ],
    },
    {
      id: "publish",
      title: { pt: "Publicação de artigo", en: "Publishing an article", es: "Publicación de un artículo" },
      steps: [
        {
          nodes: ["admin", "apigw", "studio"],
          edges: ["admin-api", "api-studio"],
          text: {
            pt: "No /admin, Publicar envia a versão do rascunho que está na tela (controle otimista de concorrência).",
            en: "In /admin, Publish sends the version of the draft on screen (optimistic concurrency control).",
            es: "En /admin, Publicar envía la versión del borrador que está en pantalla (control optimista de concurrencia).",
          },
        },
        {
          nodes: ["studio", "dynamodb", "s3-studio"],
          edges: ["studio-ddb", "studio-s3"],
          text: {
            pt: "O studio grava uma revisão imutável no S3 e, numa transação no DynamoDB, reserva os slugs de cada idioma e cria o deployment.",
            en: "Studio writes an immutable revision to S3 and, in one DynamoDB transaction, reserves each language's slug and creates the deployment.",
            es: "Studio escribe una revisión inmutable en S3 y, en una transacción de DynamoDB, reserva los slugs de cada idioma y crea el deployment.",
          },
        },
        {
          nodes: ["studio", "ssm", "github"],
          edges: ["studio-ssm", "studio-github"],
          text: {
            pt: "Com a chave do GitHub App, lida do Parameter Store, o studio dispara o workflow de deploy do site (workflow_dispatch).",
            en: "With the GitHub App key read from Parameter Store, studio dispatches the site's deploy workflow (workflow_dispatch).",
            es: "Con la clave de la GitHub App, leída de Parameter Store, studio dispara el workflow de despliegue del sitio (workflow_dispatch).",
          },
        },
        {
          nodes: ["github", "apigw", "studio"],
          edges: ["github-api", "api-studio"],
          text: {
            pt: "O primeiro passo do workflow pede o snapshot com um token OIDC do GitHub. Essa chamada congela o conteúdo: reexecutar um run antigo nunca publica conteúdo antigo.",
            en: "The workflow's first step asks for the snapshot with a GitHub OIDC token. That call freezes the content: re-running an old run never publishes old content.",
            es: "El primer paso del workflow pide el snapshot con un token OIDC de GitHub. Esa llamada congela el contenido: re-ejecutar un run antiguo nunca publica contenido antiguo.",
          },
        },
        {
          nodes: ["github", "iam", "s3-site", "cloudfront"],
          edges: ["github-iam", "github-s3", "github-cf"],
          text: {
            pt: "Depois de lint, testes e build, o workflow assume a role de deploy por OIDC, sincroniza o bucket do site e invalida o CloudFront.",
            en: "After lint, tests and the build, the workflow assumes the deploy role through OIDC, syncs the site bucket and invalidates CloudFront.",
            es: "Tras lint, pruebas y build, el workflow asume el rol de despliegue por OIDC, sincroniza el bucket del sitio e invalida CloudFront.",
          },
        },
        {
          nodes: ["github", "apigw", "studio", "ai-ingest"],
          edges: ["github-api", "api-studio", "studio-ingest"],
          text: {
            pt: "O workflow reporta succeeded. Só então o artigo passa a constar como publicado, e o studio pede ao ai-ingest que atualize o assistente.",
            en: "The workflow reports succeeded. Only then is the article marked as live, and studio asks ai-ingest to update the assistant.",
            es: "El workflow informa succeeded. Solo entonces el artículo figura como publicado, y studio pide a ai-ingest que actualice el asistente.",
          },
        },
      ],
    },
    {
      id: "assistant",
      title: { pt: "Pergunta ao assistente", en: "Asking the assistant", es: "Pregunta al asistente" },
      steps: [
        {
          nodes: ["visitor", "apigw", "ai-chat", "turnstile"],
          edges: ["visit-api", "api-chat", "chat-turnstile"],
          text: {
            pt: "POST /ai/chat, com throttling no API Gateway. Uma conversa nova exige um token do Turnstile, validado pela Lambda.",
            en: "POST /ai/chat, throttled at API Gateway. A new conversation requires a Turnstile token, which the Lambda validates.",
            es: "POST /ai/chat, con throttling en API Gateway. Una conversación nueva exige un token de Turnstile, que la Lambda valida.",
          },
        },
        {
          nodes: ["ai-chat", "dynamodb"],
          edges: ["chat-ddb"],
          text: {
            pt: "Limites por visitante (identificado por um HMAC do IP), por conversa e globais, por dia e por mês. Se a verificação falhar, a pergunta é recusada (fail closed).",
            en: "Limits per visitor (identified by an HMAC of the IP), per conversation and global, per day and per month. If the check fails, the question is refused (fail closed).",
            es: "Límites por visitante (identificado por un HMAC de la IP), por conversación y globales, por día y por mes. Si la verificación falla, la pregunta se rechaza (fail closed).",
          },
        },
        {
          nodes: ["ai-chat", "kb", "bedrock", "s3-vectors"],
          edges: ["chat-kb", "kb-bedrock", "kb-vectors"],
          text: {
            pt: "RetrieveAndGenerate: o Knowledge Base gera o embedding da pergunta com o Titan e busca os trechos mais próximos no S3 Vectors, filtrando por idioma e documentos revogados.",
            en: "RetrieveAndGenerate: the Knowledge Base embeds the question with Titan and searches S3 Vectors for the closest chunks, filtering by language and revoked documents.",
            es: "RetrieveAndGenerate: la Knowledge Base genera el embedding de la pregunta con Titan y busca los fragmentos más cercanos en S3 Vectors, filtrando por idioma y documentos revocados.",
          },
        },
        {
          nodes: ["kb", "bedrock", "ai-chat", "apigw", "visitor"],
          edges: ["kb-bedrock", "chat-kb", "api-chat", "visit-api"],
          text: {
            pt: "O Nova Lite responde só com os trechos encontrados, em até 400 tokens. A resposta volta com links para as páginas citadas.",
            en: "Nova Lite answers from the retrieved chunks only, in up to 400 tokens. The answer comes back with links to the cited pages.",
            es: "Nova Lite responde solo con los fragmentos encontrados, en hasta 400 tokens. La respuesta vuelve con enlaces a las páginas citadas.",
          },
        },
      ],
    },
    {
      id: "ingestion",
      title: { pt: "Ingestão de conteúdo", en: "Content ingestion", es: "Ingesta de contenido" },
      steps: [
        {
          nodes: ["github", "apigw", "studio", "s3-studio"],
          edges: ["github-api", "api-studio", "studio-s3"],
          text: {
            pt: "Durante o deploy, o workflow envia os documentos públicos gerados no build (projetos, jogos, currículo e perfil) e o studio os guarda no S3. Os artigos vêm do snapshot publicado.",
            en: "During the deploy, the workflow sends the public documents generated at build time (projects, games, résumé and profile) and studio stores them in S3. Articles come from the published snapshot.",
            es: "Durante el despliegue, el workflow envía los documentos públicos generados en el build (proyectos, juegos, currículum y perfil) y studio los guarda en S3. Los artículos vienen del snapshot publicado.",
          },
        },
        {
          nodes: ["studio", "ai-ingest"],
          edges: ["studio-ingest"],
          text: {
            pt: "Quando o deploy termina com sucesso, o studio invoca o ai-ingest de forma assíncrona.",
            en: "When the deploy succeeds, studio invokes ai-ingest asynchronously.",
            es: "Cuando el despliegue termina con éxito, studio invoca ai-ingest de forma asíncrona.",
          },
        },
        {
          nodes: ["ai-ingest", "s3-studio", "dynamodb", "s3-knowledge"],
          edges: ["ingest-s3-studio", "ingest-ddb", "ingest-s3-knowledge"],
          text: {
            pt: "Com um lease no DynamoDB (um job por vez), o ai-ingest junta snapshot e documentos e grava um Markdown com metadados por página e idioma no bucket de conhecimento.",
            en: "Holding a lease in DynamoDB (one job at a time), ai-ingest merges the snapshot and documents and writes one Markdown file with metadata per page and language to the knowledge bucket.",
            es: "Con un lease en DynamoDB (un job a la vez), ai-ingest combina snapshot y documentos y escribe un Markdown con metadatos por página e idioma en el bucket de conocimiento.",
          },
        },
        {
          nodes: ["ai-ingest", "kb", "s3-knowledge", "bedrock", "s3-vectors"],
          edges: ["ingest-kb", "kb-s3-knowledge", "kb-bedrock", "kb-vectors"],
          text: {
            pt: "O job de ingestão do Knowledge Base lê só os arquivos alterados, divide em trechos, gera embeddings com o Titan e grava os vetores no S3 Vectors.",
            en: "The Knowledge Base ingestion job reads only the changed files, splits them into chunks, embeds them with Titan and writes the vectors to S3 Vectors.",
            es: "El job de ingesta de la Knowledge Base lee solo los archivos modificados, los divide en fragmentos, genera embeddings con Titan y escribe los vectores en S3 Vectors.",
          },
        },
      ],
    },
  ],
};
