/**
 * Texts of the Distributed Systems Playground. Kept out of the site-wide
 * dictionaries: only this page's loader sends them to the browser.
 * Templates use {name} placeholders (see `fill`).
 */
import type { Locale } from "../../i18n/config";
import type { PresetId } from "./simulation/presets";

type Preset = { title: string; concept: string; observe: string };

const pt = {
  title: "Distributed Systems Playground",
  description:
    "Laboratório interativo de mensageria: uma fila Amazon SQS simulada no navegador, com consumidores, falhas, retries, visibility timeout, DLQ e idempotência.",
  lead: "Uma fila de mensagens que você pode quebrar de propósito. Mude o número de consumidores, a taxa de falhas e o visibility timeout e veja o que acontece com cada mensagem.",
  breadcrumb: "Navegação estrutural",
  mode: {
    label: "Simulation Mode",
    body: "Roda inteiramente no seu navegador. Nenhuma requisição à AWS: todos os números desta página são calculados pelo simulador.",
  },
  presets: {
    title: "Cenários",
    observeLabel: "O que observar",
    custom: "Configuração própria",
    items: {
      "happy-path": {
        title: "Happy Path",
        concept: "Cada mensagem é recebida, processada e apagada uma única vez.",
        observe: "Uma mensagem só sai da fila quando o consumer a apaga (DeleteMessage). Receber não é o mesmo que consumir.",
      },
      "consumer-failure": {
        title: "Consumer Failure",
        concept: "Algumas tentativas falham. A mensagem não é apagada e volta depois do visibility timeout.",
        observe: "As mensagens com falha ficam na área de invisíveis até o timeout acabar e só então são recebidas de novo. O número no canto conta os recebimentos.",
      },
      "poison-message": {
        title: "Poison Message",
        concept: "Uma mensagem falha em toda tentativa e, ao atingir o maxReceiveCount, vai para a DLQ.",
        observe: "As outras mensagens continuam sendo processadas: a DLQ tira do caminho a mensagem que nunca vai dar certo.",
      },
      "high-concurrency": {
        title: "High Concurrency",
        concept: "Seis consumers dividem a fila. O throughput sobe, e a ordem de conclusão deixa de seguir a ordem de envio.",
        observe: "Compare o throughput com o do Happy Path. Reduza para um consumer e veja a fila acumular.",
      },
      "duplicate-delivery": {
        title: "Duplicate Delivery",
        concept: "O SQS Standard entrega cada mensagem pelo menos uma vez, às vezes mais. Sem deduplicação, o efeito colateral se repete.",
        observe: "Veja \"efeitos duplicados\". Depois ative \"Consumer idempotente\": as cópias são ignoradas e o resultado fica correto.",
      },
      "slow-consumer": {
        title: "Slow Consumer",
        concept: "O processamento demora mais que o visibility timeout. A mensagem reaparece e outro consumer a recebe enquanto o primeiro ainda trabalha.",
        observe: "O primeiro consumer termina, mas o delete com o receipt handle antigo não apaga a mensagem. Aumente o visibility timeout para 15 s e compare.",
      },
    } satisfies Record<PresetId, Preset>,
  },
  config: {
    title: "Configuração",
    messageCount: "Mensagens",
    consumers: "Consumers",
    processingMs: "Tempo médio de processamento",
    failureRate: "Probabilidade de falha",
    failureKind: "Tipo de falha",
    failureKinds: {
      error: "Exceção (falha rápida)",
      timeout: "Travamento (até o timeout)",
    },
    poisonMessages: "Poison messages",
    maxReceives: "maxReceiveCount",
    visibilityTimeout: "Visibility timeout",
    duplicateRate: "Entregas duplicadas",
    idempotent: "Consumer idempotente",
    idempotentHint: "Registra cada mensagem processada e ignora as repetidas.",
    seed: "Seed {seed}",
    newSeed: "Nova seed",
    seedHint: "A mesma seed sempre produz a mesma execução.",
  },
  controls: {
    title: "Controles",
    start: "Iniciar",
    pause: "Pausar",
    resume: "Continuar",
    step: "Próximo evento",
    reset: "Reiniciar",
    speed: "Velocidade",
  },
  status: {
    idle: "Pronta para iniciar.",
    running: "Executando.",
    paused: "Pausada em {time}.",
    finished: "Concluída em {time}: {processed} processadas, {dlq} na DLQ.",
  },
  metrics: {
    title: "Métricas do simulador",
    elapsed: "Tempo simulado",
    sent: "Enviadas",
    available: "Disponíveis",
    inFlight: "Em processamento",
    waitingRetry: "Aguardando retry",
    processed: "Concluídas",
    attempts: "Tentativas",
    failedAttempts: "Falhas",
    dlq: "Na DLQ",
    throughput: "Throughput",
    throughputUnit: "msg/s",
    avgProcessing: "Tempo médio",
    duplicateEffects: "Efeitos duplicados",
    duplicatesSkipped: "Duplicatas ignoradas",
  },
  diagram: {
    title: "Fluxo das mensagens",
    summary:
      "{sent} enviadas, {available} disponíveis na fila, {inFlight} em processamento, {waitingRetry} invisíveis aguardando retry, {processed} concluídas, {dlq} na DLQ.",
    producer: "Producer",
    queue: "Amazon SQS · Standard",
    hidden: "Invisíveis",
    consumer: "Consumer {n}",
    processed: "Processadas",
    dlq: "Dead-letter queue",
    send: "SendMessage",
    receive: "ReceiveMessage",
    remove: "DeleteMessage",
    retry: "falhou: não apaga",
    redrive: "maxReceiveCount",
    legend: {
      title: "Legenda",
      default: "Primeira tentativa",
      retry: "Recebida de novo (número = recebimentos)",
      poison: "Poison message",
      copy: "Cópia entregue em duplicidade",
      stale: "Ainda em processamento com receipt handle expirado",
    },
  },
  log: {
    title: "Eventos",
    empty: "Nenhum evento ainda.",
    kinds: {
      sent: "{id} enviada para a fila",
      received: "{consumer} recebeu {id} (recebimento {attempt})",
      "copy-received": "{consumer} recebeu uma cópia duplicada de {id}",
      succeeded: "{consumer} processou {id}",
      failed: "{consumer} falhou em {id}; ela volta após o visibility timeout",
      "timed-out": "{consumer} travou em {id} até o timeout",
      "visible-again": "{id} visível de novo após {attempt} recebimento(s)",
      "stale-delete": "{consumer} tentou apagar {id} com um receipt handle antigo: a mensagem continua na fila",
      "duplicate-effect": "Efeito de {id} aplicado de novo por {consumer}",
      "duplicate-skipped": "{consumer} ignorou {id}: já processada",
      dlq: "{id} movida para a DLQ após {attempt} recebimentos",
      finished: "Execução concluída",
    },
  },
  table: {
    title: "Estado de cada mensagem",
    id: "Mensagem",
    state: "Estado",
    receives: "Recebimentos",
    effects: "Efeitos aplicados",
    states: {
      unsent: "No producer",
      available: "Disponível",
      "in-flight": "Em processamento",
      invisible: "Invisível (aguardando retry)",
      processed: "Processada",
      dlq: "Na DLQ",
    },
    poison: "poison",
  },
  concepts: {
    title: "O que esta simulação mostra",
    items: [
      {
        title: "At-least-once",
        body: "O SQS Standard garante que cada mensagem é entregue pelo menos uma vez, não exatamente uma vez. Duplicatas são raras, mas o consumer precisa tolerá-las.",
      },
      {
        title: "Ordem não garantida",
        body: "Na fila Standard a ordem é best-effort. Com vários consumers e retries, a ordem de conclusão se distancia ainda mais da ordem de envio. Se a ordem importa, a opção é uma fila FIFO, com outros limites.",
      },
      {
        title: "Visibility timeout",
        body: "Receber esconde a mensagem por um tempo. Se o consumer não a apagar nesse intervalo, por falha, travamento ou lentidão, ela volta a ficar visível e é entregue de novo.",
      },
      {
        title: "Dead-letter queue",
        body: "Cada recebimento soma 1 ao receive count. Quando ele passa do maxReceiveCount da redrive policy, o SQS move a mensagem para a DLQ em vez de entregá-la de novo.",
      },
      {
        title: "Idempotência",
        body: "Um consumer idempotente produz o mesmo resultado se a mesma mensagem chegar duas vezes. Aqui ele registra o id de cada mensagem processada e ignora repetições.",
      },
      {
        title: "Concorrência",
        body: "Mais consumers aumentam o throughput enquanto houver mensagens disponíveis. Também aumentam a disputa por recursos compartilhados e a chance de processar duplicatas ao mesmo tempo.",
      },
    ],
  },
  simplifications: {
    title: "Simplificações deliberadas",
    items: [
      "Não é uma reprodução do escalonamento interno da AWS: tempos, ordem e duplicatas seguem regras simples e uma seed.",
      "Cada consumer recebe uma mensagem por vez. A Lambda real recebe lotes de até 10.",
      "A mensagem vai para a DLQ assim que reaparece com o limite atingido. No SQS isso acontece na próxima tentativa de recebimento.",
      "Cópias duplicadas não são reenviadas se falharem.",
      "O visibility timeout é fixo: nenhum consumer o estende, e não há backoff entre tentativas.",
    ],
  },
  live: {
    title: "AWS Live Mode",
    body: "Existe uma versão real deste experimento: API Gateway, uma Lambda que produz mensagens, uma fila SQS Standard com DLQ e uma Lambda consumer com respostas parciais de lote. Ela roda na minha conta AWS, por isso fica restrita à área administrativa, com limites de mensagens e execuções por dia.",
    restricted: "Esta página nunca chama a AWS. O modo real exige login de administrador.",
    flow: [
      "API Gateway (rota autenticada) → Lambda producer → SendMessageBatch",
      "Fila SQS Standard → event source mapping → Lambda consumer",
      "Falha: a mensagem volta com atraso; após 3 recebimentos, vai para a DLQ",
      "Estado de cada mensagem no DynamoDB, acompanhado por polling",
    ],
  },
  tech: {
    title: "Tecnologias",
    source: "Código do simulador",
  },
};

export type QueueLabMessages = typeof pt;

const en: QueueLabMessages = {
  title: "Distributed Systems Playground",
  description:
    "An interactive messaging lab: an Amazon SQS queue simulated in the browser, with consumers, failures, retries, visibility timeout, a DLQ and idempotency.",
  lead: "A message queue you can break on purpose. Change the number of consumers, the failure rate and the visibility timeout, and watch what happens to each message.",
  breadcrumb: "Breadcrumb",
  mode: {
    label: "Simulation Mode",
    body: "Runs entirely in your browser. No requests to AWS: every number on this page is computed by the simulator.",
  },
  presets: {
    title: "Scenarios",
    observeLabel: "What to watch",
    custom: "Custom configuration",
    items: {
      "happy-path": {
        title: "Happy Path",
        concept: "Every message is received, processed and deleted exactly once.",
        observe: "A message only leaves the queue when the consumer deletes it (DeleteMessage). Receiving is not consuming.",
      },
      "consumer-failure": {
        title: "Consumer Failure",
        concept: "Some attempts fail. The message is not deleted and comes back after the visibility timeout.",
        observe: "Failed messages wait in the hidden area until the timeout ends, and only then are received again. The number in the corner counts receives.",
      },
      "poison-message": {
        title: "Poison Message",
        concept: "One message fails on every attempt and, once it reaches maxReceiveCount, goes to the DLQ.",
        observe: "The other messages keep flowing: the DLQ moves the message that will never succeed out of the way.",
      },
      "high-concurrency": {
        title: "High Concurrency",
        concept: "Six consumers share the queue. Throughput goes up, and messages no longer finish in the order they were sent.",
        observe: "Compare the throughput with the Happy Path. Drop to one consumer and watch the queue build up.",
      },
      "duplicate-delivery": {
        title: "Duplicate Delivery",
        concept: "SQS Standard delivers each message at least once, sometimes more. Without deduplication, the side effect happens again.",
        observe: "Watch \"duplicate effects\". Then turn on \"Idempotent consumer\": the copies are skipped and the result is right.",
      },
      "slow-consumer": {
        title: "Slow Consumer",
        concept: "Processing takes longer than the visibility timeout. The message reappears and another consumer receives it while the first is still working.",
        observe: "The first consumer finishes, but deleting with the old receipt handle does not remove the message. Raise the visibility timeout to 15 s and compare.",
      },
    },
  },
  config: {
    title: "Configuration",
    messageCount: "Messages",
    consumers: "Consumers",
    processingMs: "Average processing time",
    failureRate: "Failure probability",
    failureKind: "Failure type",
    failureKinds: {
      error: "Exception (fails fast)",
      timeout: "Hang (until the timeout)",
    },
    poisonMessages: "Poison messages",
    maxReceives: "maxReceiveCount",
    visibilityTimeout: "Visibility timeout",
    duplicateRate: "Duplicate deliveries",
    idempotent: "Idempotent consumer",
    idempotentHint: "Records every processed message and skips repeats.",
    seed: "Seed {seed}",
    newSeed: "New seed",
    seedHint: "The same seed always produces the same run.",
  },
  controls: {
    title: "Controls",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    step: "Next event",
    reset: "Reset",
    speed: "Speed",
  },
  status: {
    idle: "Ready to start.",
    running: "Running.",
    paused: "Paused at {time}.",
    finished: "Finished at {time}: {processed} processed, {dlq} in the DLQ.",
  },
  metrics: {
    title: "Simulator metrics",
    elapsed: "Simulated time",
    sent: "Sent",
    available: "Available",
    inFlight: "Processing",
    waitingRetry: "Waiting retry",
    processed: "Completed",
    attempts: "Attempts",
    failedAttempts: "Failures",
    dlq: "In the DLQ",
    throughput: "Throughput",
    throughputUnit: "msg/s",
    avgProcessing: "Average time",
    duplicateEffects: "Duplicate effects",
    duplicatesSkipped: "Duplicates skipped",
  },
  diagram: {
    title: "Message flow",
    summary:
      "{sent} sent, {available} available in the queue, {inFlight} processing, {waitingRetry} hidden waiting for a retry, {processed} completed, {dlq} in the DLQ.",
    producer: "Producer",
    queue: "Amazon SQS · Standard",
    hidden: "Hidden",
    consumer: "Consumer {n}",
    processed: "Processed",
    dlq: "Dead-letter queue",
    send: "SendMessage",
    receive: "ReceiveMessage",
    remove: "DeleteMessage",
    retry: "failed: not deleted",
    redrive: "maxReceiveCount",
    legend: {
      title: "Legend",
      default: "First attempt",
      retry: "Received again (number = receives)",
      poison: "Poison message",
      copy: "Copy delivered twice",
      stale: "Still processing with an expired receipt handle",
    },
  },
  log: {
    title: "Events",
    empty: "No events yet.",
    kinds: {
      sent: "{id} sent to the queue",
      received: "{consumer} received {id} (receive {attempt})",
      "copy-received": "{consumer} received a duplicate copy of {id}",
      succeeded: "{consumer} processed {id}",
      failed: "{consumer} failed on {id}; it comes back after the visibility timeout",
      "timed-out": "{consumer} hung on {id} until the timeout",
      "visible-again": "{id} visible again after {attempt} receive(s)",
      "stale-delete": "{consumer} tried to delete {id} with an old receipt handle: the message stays in the queue",
      "duplicate-effect": "{consumer} applied the effect of {id} again",
      "duplicate-skipped": "{consumer} skipped {id}: already processed",
      dlq: "{id} moved to the DLQ after {attempt} receives",
      finished: "Run finished",
    },
  },
  table: {
    title: "State of each message",
    id: "Message",
    state: "State",
    receives: "Receives",
    effects: "Effects applied",
    states: {
      unsent: "At the producer",
      available: "Available",
      "in-flight": "Processing",
      invisible: "Hidden (waiting retry)",
      processed: "Processed",
      dlq: "In the DLQ",
    },
    poison: "poison",
  },
  concepts: {
    title: "What this simulation shows",
    items: [
      {
        title: "At-least-once",
        body: "SQS Standard guarantees each message is delivered at least once, not exactly once. Duplicates are rare, but the consumer has to tolerate them.",
      },
      {
        title: "No guaranteed order",
        body: "Order is best effort in a Standard queue. With several consumers and retries, completion order drifts even further from send order. When order matters, a FIFO queue is the option, with other limits.",
      },
      {
        title: "Visibility timeout",
        body: "Receiving hides a message for a while. If the consumer does not delete it within that time, because it failed, hung or was slow, it becomes visible and is delivered again.",
      },
      {
        title: "Dead-letter queue",
        body: "Each receive adds 1 to the receive count. Once it goes past the redrive policy's maxReceiveCount, SQS moves the message to the DLQ instead of delivering it again.",
      },
      {
        title: "Idempotency",
        body: "An idempotent consumer produces the same result when the same message arrives twice. Here it records the id of each processed message and skips repeats.",
      },
      {
        title: "Concurrency",
        body: "More consumers raise throughput while there are messages available. They also raise contention on shared resources and the chance of handling duplicates at the same time.",
      },
    ],
  },
  simplifications: {
    title: "Deliberate simplifications",
    items: [
      "It does not reproduce AWS's internal scheduling: timing, order and duplicates follow simple rules and a seed.",
      "Each consumer receives one message at a time. The real Lambda receives batches of up to 10.",
      "A message goes to the DLQ as soon as it reappears at the limit. SQS does it on the next receive attempt.",
      "Duplicate copies are not delivered again if they fail.",
      "The visibility timeout is fixed: no consumer extends it, and there is no backoff between attempts.",
    ],
  },
  live: {
    title: "AWS Live Mode",
    body: "There is a real version of this experiment: API Gateway, a Lambda that produces messages, an SQS Standard queue with a DLQ and a consumer Lambda with partial batch responses. It runs in my AWS account, so it is restricted to the admin area, with limits on messages and runs per day.",
    restricted: "This page never calls AWS. The real mode requires an admin sign-in.",
    flow: [
      "API Gateway (authenticated route) → producer Lambda → SendMessageBatch",
      "SQS Standard queue → event source mapping → consumer Lambda",
      "Failure: the message comes back after a delay; after 3 receives it goes to the DLQ",
      "Each message's state in DynamoDB, followed by polling",
    ],
  },
  tech: {
    title: "Technologies",
    source: "Simulator source code",
  },
};

const es: QueueLabMessages = {
  title: "Distributed Systems Playground",
  description:
    "Laboratorio interactivo de mensajería: una cola Amazon SQS simulada en el navegador, con consumidores, fallos, reintentos, visibility timeout, DLQ e idempotencia.",
  lead: "Una cola de mensajes que puedes romper a propósito. Cambia el número de consumidores, la tasa de fallos y el visibility timeout, y mira qué pasa con cada mensaje.",
  breadcrumb: "Ruta de navegación",
  mode: {
    label: "Simulation Mode",
    body: "Corre completamente en tu navegador. Ninguna petición a AWS: todos los números de esta página los calcula el simulador.",
  },
  presets: {
    title: "Escenarios",
    observeLabel: "Qué observar",
    custom: "Configuración propia",
    items: {
      "happy-path": {
        title: "Happy Path",
        concept: "Cada mensaje se recibe, se procesa y se borra una sola vez.",
        observe: "Un mensaje solo sale de la cola cuando el consumer lo borra (DeleteMessage). Recibir no es lo mismo que consumir.",
      },
      "consumer-failure": {
        title: "Consumer Failure",
        concept: "Algunos intentos fallan. El mensaje no se borra y vuelve después del visibility timeout.",
        observe: "Los mensajes con fallo esperan en el área de invisibles hasta que termina el timeout, y solo entonces se reciben de nuevo. El número en la esquina cuenta las recepciones.",
      },
      "poison-message": {
        title: "Poison Message",
        concept: "Un mensaje falla en cada intento y, al alcanzar el maxReceiveCount, va a la DLQ.",
        observe: "Los demás mensajes siguen procesándose: la DLQ saca del camino el mensaje que nunca va a funcionar.",
      },
      "high-concurrency": {
        title: "High Concurrency",
        concept: "Seis consumers se reparten la cola. El throughput sube y el orden de finalización deja de seguir el orden de envío.",
        observe: "Compara el throughput con el del Happy Path. Baja a un consumer y mira cómo se acumula la cola.",
      },
      "duplicate-delivery": {
        title: "Duplicate Delivery",
        concept: "SQS Standard entrega cada mensaje al menos una vez, a veces más. Sin deduplicación, el efecto secundario se repite.",
        observe: "Mira \"efectos duplicados\". Luego activa \"Consumer idempotente\": las copias se ignoran y el resultado es correcto.",
      },
      "slow-consumer": {
        title: "Slow Consumer",
        concept: "El procesamiento tarda más que el visibility timeout. El mensaje reaparece y otro consumer lo recibe mientras el primero sigue trabajando.",
        observe: "El primer consumer termina, pero borrar con el receipt handle antiguo no elimina el mensaje. Sube el visibility timeout a 15 s y compara.",
      },
    },
  },
  config: {
    title: "Configuración",
    messageCount: "Mensajes",
    consumers: "Consumers",
    processingMs: "Tiempo medio de procesamiento",
    failureRate: "Probabilidad de fallo",
    failureKind: "Tipo de fallo",
    failureKinds: {
      error: "Excepción (falla rápido)",
      timeout: "Bloqueo (hasta el timeout)",
    },
    poisonMessages: "Poison messages",
    maxReceives: "maxReceiveCount",
    visibilityTimeout: "Visibility timeout",
    duplicateRate: "Entregas duplicadas",
    idempotent: "Consumer idempotente",
    idempotentHint: "Registra cada mensaje procesado e ignora los repetidos.",
    seed: "Seed {seed}",
    newSeed: "Nueva seed",
    seedHint: "La misma seed siempre produce la misma ejecución.",
  },
  controls: {
    title: "Controles",
    start: "Iniciar",
    pause: "Pausar",
    resume: "Continuar",
    step: "Siguiente evento",
    reset: "Reiniciar",
    speed: "Velocidad",
  },
  status: {
    idle: "Lista para iniciar.",
    running: "En ejecución.",
    paused: "Pausada en {time}.",
    finished: "Terminada en {time}: {processed} procesados, {dlq} en la DLQ.",
  },
  metrics: {
    title: "Métricas del simulador",
    elapsed: "Tiempo simulado",
    sent: "Enviados",
    available: "Disponibles",
    inFlight: "En proceso",
    waitingRetry: "Esperando reintento",
    processed: "Completados",
    attempts: "Intentos",
    failedAttempts: "Fallos",
    dlq: "En la DLQ",
    throughput: "Throughput",
    throughputUnit: "msg/s",
    avgProcessing: "Tiempo medio",
    duplicateEffects: "Efectos duplicados",
    duplicatesSkipped: "Duplicados ignorados",
  },
  diagram: {
    title: "Flujo de los mensajes",
    summary:
      "{sent} enviados, {available} disponibles en la cola, {inFlight} en proceso, {waitingRetry} invisibles esperando reintento, {processed} completados, {dlq} en la DLQ.",
    producer: "Producer",
    queue: "Amazon SQS · Standard",
    hidden: "Invisibles",
    consumer: "Consumer {n}",
    processed: "Procesados",
    dlq: "Dead-letter queue",
    send: "SendMessage",
    receive: "ReceiveMessage",
    remove: "DeleteMessage",
    retry: "falló: no se borra",
    redrive: "maxReceiveCount",
    legend: {
      title: "Leyenda",
      default: "Primer intento",
      retry: "Recibido de nuevo (número = recepciones)",
      poison: "Poison message",
      copy: "Copia entregada por duplicado",
      stale: "Aún en proceso con el receipt handle vencido",
    },
  },
  log: {
    title: "Eventos",
    empty: "Todavía no hay eventos.",
    kinds: {
      sent: "{id} enviado a la cola",
      received: "{consumer} recibió {id} (recepción {attempt})",
      "copy-received": "{consumer} recibió una copia duplicada de {id}",
      succeeded: "{consumer} procesó {id}",
      failed: "{consumer} falló en {id}; vuelve después del visibility timeout",
      "timed-out": "{consumer} quedó bloqueado en {id} hasta el timeout",
      "visible-again": "{id} visible de nuevo tras {attempt} recepción(es)",
      "stale-delete": "{consumer} intentó borrar {id} con un receipt handle antiguo: el mensaje sigue en la cola",
      "duplicate-effect": "{consumer} aplicó de nuevo el efecto de {id}",
      "duplicate-skipped": "{consumer} ignoró {id}: ya procesado",
      dlq: "{id} movido a la DLQ tras {attempt} recepciones",
      finished: "Ejecución terminada",
    },
  },
  table: {
    title: "Estado de cada mensaje",
    id: "Mensaje",
    state: "Estado",
    receives: "Recepciones",
    effects: "Efectos aplicados",
    states: {
      unsent: "En el producer",
      available: "Disponible",
      "in-flight": "En proceso",
      invisible: "Invisible (esperando reintento)",
      processed: "Procesado",
      dlq: "En la DLQ",
    },
    poison: "poison",
  },
  concepts: {
    title: "Qué muestra esta simulación",
    items: [
      {
        title: "At-least-once",
        body: "SQS Standard garantiza que cada mensaje se entrega al menos una vez, no exactamente una vez. Los duplicados son raros, pero el consumer tiene que tolerarlos.",
      },
      {
        title: "Orden no garantizado",
        body: "En una cola Standard el orden es best-effort. Con varios consumers y reintentos, el orden de finalización se aleja aún más del de envío. Si el orden importa, la opción es una cola FIFO, con otros límites.",
      },
      {
        title: "Visibility timeout",
        body: "Recibir oculta el mensaje durante un tiempo. Si el consumer no lo borra en ese intervalo, por fallo, bloqueo o lentitud, vuelve a estar visible y se entrega de nuevo.",
      },
      {
        title: "Dead-letter queue",
        body: "Cada recepción suma 1 al receive count. Cuando supera el maxReceiveCount de la redrive policy, SQS mueve el mensaje a la DLQ en lugar de entregarlo otra vez.",
      },
      {
        title: "Idempotencia",
        body: "Un consumer idempotente produce el mismo resultado si el mismo mensaje llega dos veces. Aquí registra el id de cada mensaje procesado e ignora las repeticiones.",
      },
      {
        title: "Concurrencia",
        body: "Más consumers aumentan el throughput mientras haya mensajes disponibles. También aumentan la contención en recursos compartidos y la probabilidad de procesar duplicados al mismo tiempo.",
      },
    ],
  },
  simplifications: {
    title: "Simplificaciones deliberadas",
    items: [
      "No reproduce la planificación interna de AWS: tiempos, orden y duplicados siguen reglas simples y una seed.",
      "Cada consumer recibe un mensaje a la vez. La Lambda real recibe lotes de hasta 10.",
      "Un mensaje va a la DLQ en cuanto reaparece con el límite alcanzado. SQS lo hace en el siguiente intento de recepción.",
      "Las copias duplicadas no se vuelven a entregar si fallan.",
      "El visibility timeout es fijo: ningún consumer lo extiende y no hay backoff entre intentos.",
    ],
  },
  live: {
    title: "AWS Live Mode",
    body: "Existe una versión real de este experimento: API Gateway, una Lambda que produce mensajes, una cola SQS Standard con DLQ y una Lambda consumer con respuestas parciales de lote. Corre en mi cuenta de AWS, por eso está restringida al área de administración, con límites de mensajes y de ejecuciones por día.",
    restricted: "Esta página nunca llama a AWS. El modo real requiere iniciar sesión como administrador.",
    flow: [
      "API Gateway (ruta autenticada) → Lambda producer → SendMessageBatch",
      "Cola SQS Standard → event source mapping → Lambda consumer",
      "Fallo: el mensaje vuelve con retraso; tras 3 recepciones va a la DLQ",
      "Estado de cada mensaje en DynamoDB, seguido por polling",
    ],
  },
  tech: {
    title: "Tecnologías",
    source: "Código del simulador",
  },
};

const dictionaries: Record<Locale, QueueLabMessages> = { pt, en, es };

export const queueLabMessages = (locale: Locale): QueueLabMessages => dictionaries[locale];

/** "{id} sent" + { id: "M01" } → "M01 sent". Unknown placeholders stay as they are. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
