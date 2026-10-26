/**
 * Component catalog: every kind of node the editor can draw. Diagrams refer
 * to entries by `id` (`serviceId`); names, icons and docs live only here.
 * AWS names are the official ones and are not translated.
 */
import type { Localized } from "../../../domain/localized";
import type { Locale } from "../../../i18n/config";
import type { Size } from "../model/types";
import apiGateway from "./aws-icons/api-gateway.svg?url";
import bedrock from "./aws-icons/bedrock.svg?url";
import awsCloud from "./aws-icons/cloud.svg?url";
import cloudformation from "./aws-icons/cloudformation.svg?url";
import cloudfront from "./aws-icons/cloudfront.svg?url";
import cloudtrail from "./aws-icons/cloudtrail.svg?url";
import cloudwatch from "./aws-icons/cloudwatch.svg?url";
import cognito from "./aws-icons/cognito.svg?url";
import dynamodb from "./aws-icons/dynamodb.svg?url";
import ec2 from "./aws-icons/ec2.svg?url";
import ecs from "./aws-icons/elastic-container-service.svg?url";
import elb from "./aws-icons/elastic-load-balancing.svg?url";
import elasticache from "./aws-icons/elasticache.svg?url";
import eventbridge from "./aws-icons/eventbridge.svg?url";
import fargate from "./aws-icons/fargate.svg?url";
import iam from "./aws-icons/identity-and-access-management.svg?url";
import lambda from "./aws-icons/lambda.svg?url";
import privateSubnet from "./aws-icons/private-subnet.svg?url";
import publicSubnet from "./aws-icons/public-subnet.svg?url";
import rds from "./aws-icons/rds.svg?url";
import region from "./aws-icons/region.svg?url";
import route53 from "./aws-icons/route-53.svg?url";
import secretsManager from "./aws-icons/secrets-manager.svg?url";
import ses from "./aws-icons/simple-email-service.svg?url";
import sns from "./aws-icons/simple-notification-service.svg?url";
import sqs from "./aws-icons/simple-queue-service.svg?url";
import s3 from "./aws-icons/simple-storage-service.svg?url";
import stepFunctions from "./aws-icons/step-functions.svg?url";
import systemsManager from "./aws-icons/systems-manager.svg?url";
import vpc from "./aws-icons/virtual-private-cloud-vpc.svg?url";
import type { GenericIconName } from "./generic-icons";

export const categories = [
  "compute",
  "networking",
  "storage",
  "integration",
  "security",
  "ai",
  "operations",
  "generic",
  "groups",
] as const;
export type CategoryId = (typeof categories)[number];

/** How a node is drawn and behaves: services are boxes, groups contain nodes, notes hold text. */
export type NodeKind = "service" | "group" | "note";

export type ServiceIcon = { type: "aws"; src: string } | { type: "generic"; name: GenericIconName };

export type ServiceDefinition = {
  id: string;
  name: string;
  /** Generic components only: their name is translated (AWS names never are). */
  localName?: Localized;
  /** Default node label: what people call it in a diagram ("S3", "Lambda"). */
  shortName: string;
  category: CategoryId;
  kind: NodeKind;
  icon: ServiceIcon;
  description: Localized;
  /** Official documentation (https only). */
  docsUrl?: string;
  /** Initial size of groups and notes. */
  defaultSize?: Size;
  /** Groups: line style of the frame. */
  frame?: "solid" | "dashed";
};

const aws = (src: string): ServiceIcon => ({ type: "aws", src });
const generic = (name: GenericIconName): ServiceIcon => ({ type: "generic", name });
const docs = (path: string) => `https://docs.aws.amazon.com/${path}`;

const GROUP_SIZE = { width: 480, height: 320 };

export const services: ServiceDefinition[] = [
  // ---------------------------------------------------------------- compute
  {
    id: "aws-lambda",
    name: "AWS Lambda",
    shortName: "Lambda",
    category: "compute",
    kind: "service",
    icon: aws(lambda),
    docsUrl: docs("lambda/latest/dg/welcome.html"),
    description: {
      pt: "Executa funções sob demanda, sem servidores para administrar; cobra por invocação e duração.",
      en: "Runs functions on demand with no servers to manage; billed per invocation and duration.",
      es: "Ejecuta funciones bajo demanda, sin servidores que administrar; cobra por invocación y duración.",
    },
  },
  {
    id: "aws-ec2",
    name: "Amazon EC2",
    shortName: "EC2",
    category: "compute",
    kind: "service",
    icon: aws(ec2),
    docsUrl: docs("ec2/"),
    description: {
      pt: "Máquinas virtuais com controle total do sistema operacional.",
      en: "Virtual machines with full control of the operating system.",
      es: "Máquinas virtuales con control total del sistema operativo.",
    },
  },
  {
    id: "aws-ecs",
    name: "Amazon ECS",
    shortName: "ECS",
    category: "compute",
    kind: "service",
    icon: aws(ecs),
    docsUrl: docs("ecs/"),
    description: {
      pt: "Orquestra contêineres em serviços e tarefas, sobre EC2 ou Fargate.",
      en: "Orchestrates containers as services and tasks, on EC2 or Fargate.",
      es: "Orquesta contenedores como servicios y tareas, sobre EC2 o Fargate.",
    },
  },
  {
    id: "aws-fargate",
    name: "AWS Fargate",
    shortName: "Fargate",
    category: "compute",
    kind: "service",
    icon: aws(fargate),
    docsUrl: docs("AmazonECS/latest/developerguide/AWS_Fargate.html"),
    description: {
      pt: "Executa contêineres sem gerenciar instâncias: você define CPU e memória por tarefa.",
      en: "Runs containers without managing instances: you set CPU and memory per task.",
      es: "Ejecuta contenedores sin administrar instancias: defines CPU y memoria por tarea.",
    },
  },
  // ------------------------------------------------------------- networking
  {
    id: "aws-cloudfront",
    name: "Amazon CloudFront",
    shortName: "CloudFront",
    category: "networking",
    kind: "service",
    icon: aws(cloudfront),
    docsUrl: docs("cloudfront/"),
    description: {
      pt: "CDN: entrega conteúdo a partir de pontos de presença próximos do usuário, com cache e HTTPS.",
      en: "CDN: serves content from edge locations close to users, with caching and HTTPS.",
      es: "CDN: entrega contenido desde ubicaciones cercanas al usuario, con caché y HTTPS.",
    },
  },
  {
    id: "aws-route53",
    name: "Amazon Route 53",
    shortName: "Route 53",
    category: "networking",
    kind: "service",
    icon: aws(route53),
    docsUrl: docs("route53/"),
    description: {
      pt: "DNS gerenciado: registra domínios e resolve nomes para os recursos.",
      en: "Managed DNS: registers domains and resolves names to resources.",
      es: "DNS administrado: registra dominios y resuelve nombres hacia los recursos.",
    },
  },
  {
    id: "aws-api-gateway",
    name: "Amazon API Gateway",
    shortName: "API Gateway",
    category: "networking",
    kind: "service",
    icon: aws(apiGateway),
    docsUrl: docs("apigateway/"),
    description: {
      pt: "Porta de entrada HTTP: rotas, autorização, throttling e integração com Lambda.",
      en: "HTTP front door: routes, authorization, throttling and Lambda integration.",
      es: "Puerta de entrada HTTP: rutas, autorización, throttling e integración con Lambda.",
    },
  },
  {
    id: "aws-elb",
    name: "Elastic Load Balancing",
    shortName: "Load Balancer",
    category: "networking",
    kind: "service",
    icon: aws(elb),
    docsUrl: docs("elasticloadbalancing/"),
    description: {
      pt: "Distribui o tráfego entre alvos saudáveis em várias zonas de disponibilidade.",
      en: "Spreads traffic across healthy targets in several Availability Zones.",
      es: "Distribuye el tráfico entre destinos sanos en varias zonas de disponibilidad.",
    },
  },
  {
    id: "aws-vpc",
    name: "Amazon VPC",
    shortName: "VPC",
    category: "networking",
    kind: "group",
    icon: aws(vpc),
    docsUrl: docs("vpc/"),
    defaultSize: GROUP_SIZE,
    frame: "solid",
    description: {
      pt: "Rede privada isolada na AWS, dividida em sub-redes públicas e privadas.",
      en: "An isolated private network in AWS, split into public and private subnets.",
      es: "Red privada aislada en AWS, dividida en subredes públicas y privadas.",
    },
  },
  // ---------------------------------------------------------------- storage
  {
    id: "aws-s3",
    name: "Amazon S3",
    shortName: "S3",
    category: "storage",
    kind: "service",
    icon: aws(s3),
    docsUrl: docs("s3/"),
    description: {
      pt: "Armazenamento de objetos durável, organizado em buckets.",
      en: "Durable object storage, organized in buckets.",
      es: "Almacenamiento de objetos duradero, organizado en buckets.",
    },
  },
  {
    id: "aws-dynamodb",
    name: "Amazon DynamoDB",
    shortName: "DynamoDB",
    category: "storage",
    kind: "service",
    icon: aws(dynamodb),
    docsUrl: docs("dynamodb/"),
    description: {
      pt: "Banco NoSQL chave-valor serverless, com latência baixa e previsível.",
      en: "Serverless key-value NoSQL database with low, predictable latency.",
      es: "Base NoSQL clave-valor serverless, con latencia baja y predecible.",
    },
  },
  {
    id: "aws-rds",
    name: "Amazon RDS",
    shortName: "RDS",
    category: "storage",
    kind: "service",
    icon: aws(rds),
    docsUrl: docs("rds/"),
    description: {
      pt: "Bancos relacionais gerenciados (PostgreSQL, MySQL e outros), com backups e réplicas.",
      en: "Managed relational databases (PostgreSQL, MySQL and others), with backups and replicas.",
      es: "Bases relacionales administradas (PostgreSQL, MySQL y otras), con backups y réplicas.",
    },
  },
  {
    id: "aws-elasticache",
    name: "Amazon ElastiCache",
    shortName: "ElastiCache",
    category: "storage",
    kind: "service",
    icon: aws(elasticache),
    docsUrl: docs("elasticache/"),
    description: {
      pt: "Cache em memória compatível com Valkey, Redis OSS e Memcached.",
      en: "In-memory cache compatible with Valkey, Redis OSS and Memcached.",
      es: "Caché en memoria compatible con Valkey, Redis OSS y Memcached.",
    },
  },
  // ------------------------------------------------------------ integration
  {
    id: "aws-sqs",
    name: "Amazon SQS",
    shortName: "SQS",
    category: "integration",
    kind: "service",
    icon: aws(sqs),
    docsUrl: docs("sqs/"),
    description: {
      pt: "Filas de mensagens: desacopla produtores e consumidores, com retry e dead-letter queue.",
      en: "Message queues: decouples producers and consumers, with retries and dead-letter queues.",
      es: "Colas de mensajes: desacopla productores y consumidores, con reintentos y dead-letter queue.",
    },
  },
  {
    id: "aws-sns",
    name: "Amazon SNS",
    shortName: "SNS",
    category: "integration",
    kind: "service",
    icon: aws(sns),
    docsUrl: docs("sns/"),
    description: {
      pt: "Pub/sub: publica uma mensagem em um tópico e entrega a vários assinantes.",
      en: "Pub/sub: publishes a message to a topic and delivers it to many subscribers.",
      es: "Pub/sub: publica un mensaje en un tópico y lo entrega a varios suscriptores.",
    },
  },
  {
    id: "aws-eventbridge",
    name: "Amazon EventBridge",
    shortName: "EventBridge",
    category: "integration",
    kind: "service",
    icon: aws(eventbridge),
    docsUrl: docs("eventbridge/"),
    description: {
      pt: "Barramento de eventos com regras de roteamento, e o Scheduler para execuções agendadas.",
      en: "Event bus with routing rules, plus Scheduler for scheduled invocations.",
      es: "Bus de eventos con reglas de enrutamiento, y Scheduler para ejecuciones programadas.",
    },
  },
  {
    id: "aws-step-functions",
    name: "AWS Step Functions",
    shortName: "Step Functions",
    category: "integration",
    kind: "service",
    icon: aws(stepFunctions),
    docsUrl: docs("step-functions/"),
    description: {
      pt: "Orquestra passos de um fluxo de trabalho como máquina de estados, com retries e erros.",
      en: "Orchestrates workflow steps as a state machine, with retries and error handling.",
      es: "Orquesta pasos de un flujo de trabajo como máquina de estados, con reintentos y errores.",
    },
  },
  {
    id: "aws-ses",
    name: "Amazon SES",
    shortName: "SES",
    category: "integration",
    kind: "service",
    icon: aws(ses),
    docsUrl: docs("ses/"),
    description: {
      pt: "Envio de e-mails transacionais por API ou SMTP.",
      en: "Sends transactional email through an API or SMTP.",
      es: "Envío de correos transaccionales por API o SMTP.",
    },
  },
  // --------------------------------------------------------------- security
  {
    id: "aws-cognito",
    name: "Amazon Cognito",
    shortName: "Cognito",
    category: "security",
    kind: "service",
    icon: aws(cognito),
    docsUrl: docs("cognito/"),
    description: {
      pt: "Cadastro e login de usuários (OAuth 2.0 e OpenID Connect), emitindo tokens JWT.",
      en: "User sign-up and sign-in (OAuth 2.0 and OpenID Connect), issuing JWTs.",
      es: "Registro e inicio de sesión de usuarios (OAuth 2.0 y OpenID Connect), con tokens JWT.",
    },
  },
  {
    id: "aws-iam",
    name: "AWS IAM",
    shortName: "IAM",
    category: "security",
    kind: "service",
    icon: aws(iam),
    docsUrl: docs("iam/"),
    description: {
      pt: "Identidades, roles e políticas que dizem quem pode fazer o quê em cada recurso.",
      en: "Identities, roles and policies that say who can do what on each resource.",
      es: "Identidades, roles y políticas que definen quién puede hacer qué en cada recurso.",
    },
  },
  {
    id: "aws-secrets-manager",
    name: "AWS Secrets Manager",
    shortName: "Secrets Manager",
    category: "security",
    kind: "service",
    icon: aws(secretsManager),
    docsUrl: docs("secretsmanager/"),
    description: {
      pt: "Guarda segredos criptografados, com rotação automática.",
      en: "Stores encrypted secrets, with automatic rotation.",
      es: "Guarda secretos cifrados, con rotación automática.",
    },
  },
  {
    id: "aws-ssm-parameter-store",
    name: "AWS Systems Manager Parameter Store",
    shortName: "Parameter Store",
    category: "security",
    kind: "service",
    icon: aws(systemsManager),
    docsUrl: docs("systems-manager/latest/userguide/systems-manager-parameter-store.html"),
    description: {
      pt: "Parâmetros de configuração e segredos (SecureString) com controle de acesso por IAM.",
      en: "Configuration parameters and secrets (SecureString) with IAM access control.",
      es: "Parámetros de configuración y secretos (SecureString) con control de acceso por IAM.",
    },
  },
  // --------------------------------------------------------------------- AI
  {
    id: "aws-bedrock",
    name: "Amazon Bedrock",
    shortName: "Bedrock",
    category: "ai",
    kind: "service",
    icon: aws(bedrock),
    docsUrl: docs("bedrock/"),
    description: {
      pt: "Acesso por API a modelos de linguagem e de embeddings de vários fornecedores.",
      en: "API access to language and embedding models from several providers.",
      es: "Acceso por API a modelos de lenguaje y de embeddings de varios proveedores.",
    },
  },
  {
    id: "aws-bedrock-knowledge-bases",
    name: "Amazon Bedrock Knowledge Bases",
    shortName: "Knowledge Base",
    category: "ai",
    kind: "service",
    // No icon of its own in the AWS set: drawn with the Bedrock icon.
    icon: aws(bedrock),
    docsUrl: docs("bedrock/latest/userguide/knowledge-base.html"),
    description: {
      pt: "RAG gerenciado: ingere documentos, gera embeddings, busca trechos e monta a resposta.",
      en: "Managed RAG: ingests documents, creates embeddings, retrieves chunks and builds the answer.",
      es: "RAG administrado: ingiere documentos, genera embeddings, busca fragmentos y arma la respuesta.",
    },
  },
  {
    id: "aws-s3-vectors",
    name: "Amazon S3 Vectors",
    shortName: "S3 Vectors",
    category: "ai",
    kind: "service",
    // No icon of its own in the AWS set: drawn with the S3 icon.
    icon: aws(s3),
    docsUrl: docs("AmazonS3/latest/userguide/s3-vectors.html"),
    description: {
      pt: "Buckets e índices de vetores no S3, com busca por similaridade e filtros de metadados.",
      en: "Vector buckets and indexes in S3, with similarity search and metadata filters.",
      es: "Buckets e índices de vectores en S3, con búsqueda por similitud y filtros de metadatos.",
    },
  },
  // ------------------------------------------------------------- operations
  {
    id: "aws-cloudwatch",
    name: "Amazon CloudWatch",
    shortName: "CloudWatch",
    category: "operations",
    kind: "service",
    icon: aws(cloudwatch),
    docsUrl: docs("cloudwatch/"),
    description: {
      pt: "Logs, métricas e alarmes dos recursos e das aplicações.",
      en: "Logs, metrics and alarms for resources and applications.",
      es: "Logs, métricas y alarmas de los recursos y las aplicaciones.",
    },
  },
  {
    id: "aws-cloudtrail",
    name: "AWS CloudTrail",
    shortName: "CloudTrail",
    category: "operations",
    kind: "service",
    icon: aws(cloudtrail),
    docsUrl: docs("cloudtrail/"),
    description: {
      pt: "Registro de auditoria das chamadas de API feitas na conta.",
      en: "Audit log of the API calls made in the account.",
      es: "Registro de auditoría de las llamadas a la API hechas en la cuenta.",
    },
  },
  {
    id: "aws-cloudformation",
    name: "AWS CloudFormation",
    shortName: "CloudFormation",
    category: "operations",
    kind: "service",
    icon: aws(cloudformation),
    docsUrl: docs("cloudformation/"),
    description: {
      pt: "Infraestrutura como código nativa da AWS, em stacks declarativas.",
      en: "AWS-native infrastructure as code, in declarative stacks.",
      es: "Infraestructura como código nativa de AWS, en stacks declarativas.",
    },
  },
  // ---------------------------------------------------------------- generic
  {
    id: "generic-user",
    localName: { pt: "Usuário", en: "User", es: "Usuario" },
    name: "User",
    shortName: "User",
    category: "generic",
    kind: "service",
    icon: generic("user"),
    description: {
      pt: "Uma pessoa usando o sistema.",
      en: "A person using the system.",
      es: "Una persona que usa el sistema.",
    },
  },
  {
    id: "generic-browser",
    localName: { pt: "Navegador", en: "Browser", es: "Navegador" },
    name: "Browser",
    shortName: "Browser",
    category: "generic",
    kind: "service",
    icon: generic("browser"),
    description: {
      pt: "Aplicação web rodando no navegador do usuário.",
      en: "A web application running in the user's browser.",
      es: "Aplicación web que corre en el navegador del usuario.",
    },
  },
  {
    id: "generic-app",
    localName: { pt: "Aplicação externa", en: "External application", es: "Aplicación externa" },
    name: "External application",
    shortName: "Application",
    category: "generic",
    kind: "service",
    icon: generic("app"),
    description: {
      pt: "Aplicativo ou sistema cliente fora da arquitetura.",
      en: "A client app or system outside the architecture.",
      es: "Aplicación o sistema cliente fuera de la arquitectura.",
    },
  },
  {
    id: "generic-server",
    localName: { pt: "Servidor", en: "Server", es: "Servidor" },
    name: "Server",
    shortName: "Server",
    category: "generic",
    kind: "service",
    icon: generic("server"),
    description: {
      pt: "Um servidor ou serviço próprio, em qualquer infraestrutura.",
      en: "A server or self-hosted service, on any infrastructure.",
      es: "Un servidor o servicio propio, en cualquier infraestructura.",
    },
  },
  {
    id: "generic-database",
    localName: { pt: "Banco de dados", en: "Database", es: "Base de datos" },
    name: "Database",
    shortName: "Database",
    category: "generic",
    kind: "service",
    icon: generic("database"),
    description: {
      pt: "Um banco de dados qualquer.",
      en: "Any database.",
      es: "Cualquier base de datos.",
    },
  },
  {
    id: "generic-internet",
    localName: { pt: "Internet", en: "Internet", es: "Internet" },
    name: "Internet",
    shortName: "Internet",
    category: "generic",
    kind: "service",
    icon: generic("internet"),
    description: {
      pt: "A rede pública.",
      en: "The public network.",
      es: "La red pública.",
    },
  },
  {
    id: "generic-external-service",
    localName: { pt: "Serviço externo", en: "External service", es: "Servicio externo" },
    name: "External service",
    shortName: "External service",
    category: "generic",
    kind: "service",
    icon: generic("external"),
    description: {
      pt: "API ou serviço de terceiros (pagamentos, e-mail, analytics, CAPTCHA).",
      en: "A third-party API or service (payments, email, analytics, CAPTCHA).",
      es: "API o servicio de terceros (pagos, correo, analytics, CAPTCHA).",
    },
  },
  {
    id: "generic-pipeline",
    localName: { pt: "Pipeline CI/CD", en: "CI/CD pipeline", es: "Pipeline CI/CD" },
    name: "CI/CD pipeline",
    shortName: "CI/CD",
    category: "generic",
    kind: "service",
    icon: generic("pipeline"),
    description: {
      pt: "Build, testes e deploy automatizados.",
      en: "Automated build, tests and deployment.",
      es: "Build, pruebas y despliegue automatizados.",
    },
  },
  {
    id: "generic-note",
    localName: { pt: "Nota", en: "Note", es: "Nota" },
    name: "Text note",
    shortName: "Note",
    category: "generic",
    kind: "note",
    icon: generic("note"),
    defaultSize: { width: 220, height: 120 },
    description: {
      pt: "Uma anotação livre no diagrama.",
      en: "A free-form annotation on the diagram.",
      es: "Una anotación libre en el diagrama.",
    },
  },
  // ----------------------------------------------------------------- groups
  {
    id: "group-generic",
    localName: { pt: "Grupo", en: "Group", es: "Grupo" },
    name: "Group",
    shortName: "Group",
    category: "groups",
    kind: "group",
    icon: generic("group"),
    defaultSize: GROUP_SIZE,
    frame: "dashed",
    description: {
      pt: "Agrupa componentes relacionados: um serviço, uma camada, um time.",
      en: "Groups related components: a service, a layer, a team.",
      es: "Agrupa componentes relacionados: un servicio, una capa, un equipo.",
    },
  },
  {
    id: "group-aws-cloud",
    name: "AWS Cloud",
    shortName: "AWS Cloud",
    category: "groups",
    kind: "group",
    icon: aws(awsCloud),
    defaultSize: { width: 720, height: 440 },
    frame: "solid",
    description: {
      pt: "Fronteira da conta AWS no diagrama.",
      en: "The AWS account boundary in the diagram.",
      es: "Frontera de la cuenta de AWS en el diagrama.",
    },
  },
  {
    id: "group-region",
    localName: { pt: "Região", en: "Region", es: "Región" },
    name: "Region",
    shortName: "Region",
    category: "groups",
    kind: "group",
    icon: aws(region),
    defaultSize: { width: 640, height: 400 },
    frame: "dashed",
    description: {
      pt: "Uma região AWS (por exemplo, us-east-1), com várias zonas de disponibilidade.",
      en: "An AWS Region (for example, us-east-1), with several Availability Zones.",
      es: "Una región de AWS (por ejemplo, us-east-1), con varias zonas de disponibilidad.",
    },
  },
  {
    id: "group-availability-zone",
    localName: { pt: "Zona de disponibilidade", en: "Availability Zone", es: "Zona de disponibilidad" },
    name: "Availability Zone",
    shortName: "Availability Zone",
    category: "groups",
    kind: "group",
    icon: generic("zone"),
    defaultSize: { width: 320, height: 280 },
    frame: "dashed",
    description: {
      pt: "Um ou mais data centers isolados dentro de uma região.",
      en: "One or more isolated data centers within a Region.",
      es: "Uno o más centros de datos aislados dentro de una región.",
    },
  },
  {
    id: "group-public-subnet",
    localName: { pt: "Sub-rede pública", en: "Public subnet", es: "Subred pública" },
    name: "Public subnet",
    shortName: "Public subnet",
    category: "groups",
    kind: "group",
    icon: aws(publicSubnet),
    defaultSize: { width: 280, height: 200 },
    frame: "solid",
    description: {
      pt: "Sub-rede com rota para um internet gateway.",
      en: "A subnet with a route to an internet gateway.",
      es: "Subred con ruta a un internet gateway.",
    },
  },
  {
    id: "group-private-subnet",
    localName: { pt: "Sub-rede privada", en: "Private subnet", es: "Subred privada" },
    name: "Private subnet",
    shortName: "Private subnet",
    category: "groups",
    kind: "group",
    icon: aws(privateSubnet),
    defaultSize: { width: 280, height: 200 },
    frame: "solid",
    description: {
      pt: "Sub-rede sem acesso direto vindo da internet.",
      en: "A subnet with no direct access from the internet.",
      es: "Subred sin acceso directo desde internet.",
    },
  },
];

const byId = new Map(services.map((service) => [service.id, service]));

export function findService(id: string): ServiceDefinition | undefined {
  return byId.get(id);
}

/** For ids validated on load: a missing entry is a programming error. */
export function getService(id: string): ServiceDefinition {
  const service = byId.get(id);
  if (!service) throw new Error(`Unknown component: ${id}`);
  return service;
}

export function serviceName(service: ServiceDefinition, locale: Locale): string {
  return service.localName?.[locale] ?? service.name;
}

/** Label of a node just added from the catalog. */
export function defaultLabel(service: ServiceDefinition, locale: Locale): string {
  return service.localName?.[locale] ?? service.shortName;
}

export function isServiceId(id: string): boolean {
  return byId.has(id);
}

export function servicesIn(category: CategoryId): ServiceDefinition[] {
  return services.filter((service) => service.category === category);
}
