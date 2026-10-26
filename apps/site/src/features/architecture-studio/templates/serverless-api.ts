import type { TemplateDefinition } from "./types";

export const serverlessApiTemplate: TemplateDefinition = {
  id: "serverless-api",
  nodes: [
    {
      id: "client",
      serviceId: "generic-app",
      label: { pt: "Cliente", en: "Client", es: "Cliente" },
      at: [0, 120],
      description: {
        pt: "Navegador, app móvel ou outro serviço que consome a API.",
        en: "A browser, mobile app or another service consuming the API.",
        es: "Navegador, app móvil u otro servicio que consume la API.",
      },
    },
    {
      id: "region",
      serviceId: "group-region",
      label: "us-east-1",
      at: [240, 0],
      size: { width: 840, height: 400 },
    },
    {
      id: "apigw",
      serviceId: "aws-api-gateway",
      label: "API Gateway",
      in: "region",
      at: [290, 120],
      description: {
        pt: "Recebe HTTPS, valida o token (authorizer JWT), aplica throttling e chama a Lambda. Uma HTTP API custa menos que uma REST API e basta para a maioria dos casos.",
        en: "Receives HTTPS, validates the token (JWT authorizer), throttles and calls the Lambda. An HTTP API costs less than a REST API and covers most cases.",
        es: "Recibe HTTPS, valida el token (authorizer JWT), aplica throttling y llama a la Lambda. Una HTTP API cuesta menos que una REST API y cubre la mayoría de los casos.",
      },
    },
    {
      id: "lambda",
      serviceId: "aws-lambda",
      label: "Lambda",
      in: "region",
      at: [580, 120],
      description: {
        pt: "Uma função por rota ou por contexto de segurança. Sem estado entre invocações: tudo o que precisa durar vai para o banco.",
        en: "One function per route or per security context. No state between invocations: anything that must last goes to the database.",
        es: "Una función por ruta o por contexto de seguridad. Sin estado entre invocaciones: todo lo que debe durar va a la base de datos.",
      },
    },
    {
      id: "dynamodb",
      serviceId: "aws-dynamodb",
      label: "DynamoDB",
      in: "region",
      at: [860, 120],
      description: {
        pt: "Modo on-demand: paga por requisição e escala sem planejamento de capacidade. A modelagem parte dos padrões de acesso, não das entidades.",
        en: "On-demand mode: pay per request and scale without capacity planning. The model starts from access patterns, not entities.",
        es: "Modo on-demand: paga por solicitud y escala sin planificar capacidad. El modelo parte de los patrones de acceso, no de las entidades.",
      },
    },
    {
      id: "logs",
      serviceId: "aws-cloudwatch",
      label: "CloudWatch Logs",
      in: "region",
      at: [580, 280],
      description: {
        pt: "Logs estruturados e métricas da função; defina a retenção para não guardar logs para sempre.",
        en: "Structured logs and the function's metrics; set a retention period so logs are not kept forever.",
        es: "Logs estructurados y métricas de la función; define la retención para no guardar logs para siempre.",
      },
    },
  ],
  edges: [
    { id: "client-api", source: "client", target: "apigw", label: "HTTPS", mode: "synchronous" },
    { id: "api-lambda", source: "apigw", target: "lambda", label: "Invoke", mode: "synchronous" },
    { id: "lambda-ddb", source: "lambda", target: "dynamodb", label: "Read/Write", mode: "data-flow" },
    { id: "lambda-logs", source: "lambda", target: "logs", label: "Logs", mode: "asynchronous" },
  ],
  flows: [
    {
      id: "request",
      title: { pt: "Uma requisição", en: "One request", es: "Una solicitud" },
      steps: [
        {
          nodes: ["client", "apigw"],
          edges: ["client-api"],
          text: {
            pt: "O cliente chama a API por HTTPS. O API Gateway rejeita na borda o que não tiver token válido ou passar do limite de taxa.",
            en: "The client calls the API over HTTPS. API Gateway rejects at the edge anything without a valid token or above the rate limit.",
            es: "El cliente llama a la API por HTTPS. API Gateway rechaza en el borde lo que no tenga un token válido o supere el límite de tasa.",
          },
        },
        {
          nodes: ["apigw", "lambda"],
          edges: ["api-lambda"],
          text: {
            pt: "A integração invoca a Lambda de forma síncrona e espera a resposta (o timeout de integração de uma HTTP API é de até 30 s).",
            en: "The integration invokes the Lambda synchronously and waits for the answer (an HTTP API's integration timeout is at most 30 s).",
            es: "La integración invoca la Lambda de forma síncrona y espera la respuesta (el timeout de integración de una HTTP API es de hasta 30 s).",
          },
        },
        {
          nodes: ["lambda", "dynamodb", "logs"],
          edges: ["lambda-ddb", "lambda-logs"],
          text: {
            pt: "A função valida a entrada, lê ou grava no DynamoDB com uma role IAM restrita à tabela e registra o resultado no CloudWatch.",
            en: "The function validates the input, reads or writes DynamoDB with an IAM role limited to the table and logs the result to CloudWatch.",
            es: "La función valida la entrada, lee o escribe en DynamoDB con un rol IAM limitado a la tabla y registra el resultado en CloudWatch.",
          },
        },
      ],
    },
  ],
};
