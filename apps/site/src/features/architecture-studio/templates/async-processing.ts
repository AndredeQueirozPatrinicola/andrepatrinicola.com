import type { TemplateDefinition } from "./types";

export const asyncProcessingTemplate: TemplateDefinition = {
  id: "async-processing",
  links: [
    {
      label: {
        pt: "Simular esta fila no Distributed Systems Playground",
        en: "Simulate this queue in the Distributed Systems Playground",
        es: "Simular esta cola en el Distributed Systems Playground",
      },
      href: "/labs/distributed-systems",
    },
  ],
  nodes: [
    {
      id: "producer",
      serviceId: "aws-lambda",
      label: "Producer",
      at: [0, 140],
      description: {
        pt: "Recebe o pedido, envia a mensagem para a fila e responde na hora. O trabalho pesado fica para depois.",
        en: "Receives the request, sends the message to the queue and answers right away. The heavy work happens later.",
        es: "Recibe el pedido, envía el mensaje a la cola y responde de inmediato. El trabajo pesado queda para después.",
      },
    },
    {
      id: "queue",
      serviceId: "aws-sqs",
      label: { pt: "Fila SQS (Standard)", en: "SQS queue (Standard)", es: "Cola SQS (Standard)" },
      at: [300, 140],
      description: {
        pt: "Entrega pelo menos uma vez, sem ordem garantida. Uma mensagem recebida fica invisível pelo visibility timeout e só sai da fila quando o consumer a apaga.",
        en: "At-least-once delivery, no guaranteed order. A received message stays invisible for the visibility timeout and only leaves the queue when the consumer deletes it.",
        es: "Entrega al menos una vez, sin orden garantizado. Un mensaje recibido queda invisible durante el visibility timeout y solo sale de la cola cuando el consumer lo borra.",
      },
    },
    {
      id: "consumer",
      serviceId: "aws-lambda",
      label: "Consumer",
      at: [600, 140],
      description: {
        pt: "Acionada por event source mapping em lotes. Com ReportBatchItemFailures, só as mensagens que falharam voltam para a fila.",
        en: "Triggered by an event source mapping in batches. With ReportBatchItemFailures, only the failed messages go back to the queue.",
        es: "Activada por un event source mapping en lotes. Con ReportBatchItemFailures, solo los mensajes que fallaron vuelven a la cola.",
      },
    },
    {
      id: "store",
      serviceId: "aws-dynamodb",
      label: "DynamoDB",
      at: [900, 140],
      description: {
        pt: "Guarda o resultado e os ids já processados: como a entrega pode se repetir, o consumer precisa ser idempotente.",
        en: "Stores the result and the ids already processed: since delivery can repeat, the consumer must be idempotent.",
        es: "Guarda el resultado y los ids ya procesados: como la entrega puede repetirse, el consumer debe ser idempotente.",
      },
    },
    {
      id: "dlq",
      serviceId: "aws-sqs",
      label: "Dead-letter queue",
      at: [300, 340],
      tone: "red",
      description: {
        pt: "Depois de maxReceiveCount recebimentos sem sucesso, a redrive policy move a mensagem para cá. Ela sai do caminho das outras e pode ser analisada e reenviada.",
        en: "After maxReceiveCount unsuccessful receives, the redrive policy moves the message here. It gets out of the others' way and can be inspected and redriven.",
        es: "Tras maxReceiveCount recepciones sin éxito, la redrive policy mueve el mensaje aquí. Sale del camino de los demás y puede analizarse y reenviarse.",
      },
    },
    {
      id: "alarm",
      serviceId: "aws-cloudwatch",
      label: { pt: "Alarme da DLQ", en: "DLQ alarm", es: "Alarma de la DLQ" },
      at: [600, 340],
      description: {
        pt: "Um alarme em ApproximateNumberOfMessagesVisible > 0 avisa que algo foi parar na DLQ.",
        en: "An alarm on ApproximateNumberOfMessagesVisible > 0 tells you something landed in the DLQ.",
        es: "Una alarma en ApproximateNumberOfMessagesVisible > 0 avisa que algo llegó a la DLQ.",
      },
    },
  ],
  edges: [
    { id: "producer-queue", source: "producer", target: "queue", label: "SendMessage", mode: "asynchronous" },
    { id: "queue-consumer", source: "queue", target: "consumer", label: "Poll (batch)", mode: "asynchronous" },
    { id: "consumer-store", source: "consumer", target: "store", label: "Write", mode: "data-flow" },
    { id: "queue-dlq", source: "queue", target: "dlq", label: "Redrive", mode: "asynchronous" },
    { id: "dlq-alarm", source: "dlq", target: "alarm", label: "Metric", mode: "data-flow" },
  ],
  flows: [
    {
      id: "success",
      title: { pt: "Mensagem processada", en: "A processed message", es: "Mensaje procesado" },
      steps: [
        {
          nodes: ["producer", "queue"],
          edges: ["producer-queue"],
          text: {
            pt: "O producer grava a mensagem na fila e já responde. Picos de tráfego viram fila, não erro.",
            en: "The producer writes the message to the queue and answers immediately. Traffic spikes become a backlog, not errors.",
            es: "El producer escribe el mensaje en la cola y responde de inmediato. Los picos de tráfico se vuelven cola, no errores.",
          },
        },
        {
          nodes: ["queue", "consumer"],
          edges: ["queue-consumer"],
          text: {
            pt: "O event source mapping recebe um lote e invoca o consumer. As mensagens recebidas ficam invisíveis enquanto ele trabalha.",
            en: "The event source mapping receives a batch and invokes the consumer. The received messages stay invisible while it works.",
            es: "El event source mapping recibe un lote e invoca al consumer. Los mensajes recibidos quedan invisibles mientras trabaja.",
          },
        },
        {
          nodes: ["consumer", "store"],
          edges: ["consumer-store"],
          text: {
            pt: "O consumer grava o resultado (ignorando ids repetidos) e, ao terminar sem erro, as mensagens são apagadas da fila.",
            en: "The consumer stores the result (skipping repeated ids) and, when it finishes without errors, the messages are deleted from the queue.",
            es: "El consumer guarda el resultado (ignorando ids repetidos) y, al terminar sin errores, los mensajes se borran de la cola.",
          },
        },
      ],
    },
    {
      id: "failure",
      title: { pt: "Falha e dead-letter queue", en: "Failure and dead-letter queue", es: "Fallo y dead-letter queue" },
      steps: [
        {
          nodes: ["queue", "consumer"],
          edges: ["queue-consumer"],
          text: {
            pt: "O consumer falha numa mensagem. Ela não é apagada e volta a ficar visível quando o visibility timeout acaba.",
            en: "The consumer fails on a message. It is not deleted and becomes visible again when the visibility timeout ends.",
            es: "El consumer falla en un mensaje. No se borra y vuelve a ser visible cuando termina el visibility timeout.",
          },
        },
        {
          nodes: ["queue", "dlq"],
          edges: ["queue-dlq"],
          text: {
            pt: "Cada recebimento soma 1 ao receive count. Ao passar do maxReceiveCount, o SQS move a mensagem para a DLQ.",
            en: "Each receive adds 1 to the receive count. Past maxReceiveCount, SQS moves the message to the DLQ.",
            es: "Cada recepción suma 1 al receive count. Al superar el maxReceiveCount, SQS mueve el mensaje a la DLQ.",
          },
        },
        {
          nodes: ["dlq", "alarm"],
          edges: ["dlq-alarm"],
          text: {
            pt: "O alarme avisa. Depois de corrigir a causa, a mensagem pode voltar para a fila de origem (redrive).",
            en: "The alarm fires. Once the cause is fixed, the message can be sent back to the source queue (redrive).",
            es: "La alarma avisa. Una vez corregida la causa, el mensaje puede volver a la cola de origen (redrive).",
          },
        },
      ],
    },
  ],
};
