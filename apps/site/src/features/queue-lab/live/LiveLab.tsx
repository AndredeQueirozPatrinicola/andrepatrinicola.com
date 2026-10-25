import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router";

import { ApiError, useStudioApi, type StudioApi } from "../../admin/api";
import { ErrorState, Loading, StatusBadge, errorMessage, formatDateTime } from "../../admin/ui";
import { DiagramLegend } from "../SimulationLab";
import { QueueDiagram, type DiagramLabels } from "../diagram/QueueDiagram";
import { fill, queueLabMessages } from "../messages";
import { fromRun } from "./fromRun";
import { runScenarios, type LiveEvent, type LiveMessage, type QueueLabOverview, type QueueRun, type RunScenario } from "./types";

/** The admin is in Portuguese only; the diagram reuses the public page's texts. */
const text = queueLabMessages("pt");

/** Polling interval while a run is open (only while the tab is visible). */
export const POLL_MS = 2000;
/** Stops polling a run after this long, whatever its state (the API closes runs after 10 minutes). */
const MAX_POLL_MS = 15 * 60_000;

const scenarioInfo: Record<RunScenario, { label: string; description: string }> = {
  "happy-path": { label: "Happy path", description: "Todas as mensagens são processadas no primeiro recebimento." },
  "transient-failure": { label: "Falha temporária", description: "Metade das mensagens falha no 1º recebimento e volta 5 s depois." },
  "poison-message": { label: "Poison message", description: "A primeira mensagem falha sempre: 3 recebimentos e vai para a DLQ." },
  "duplicate-delivery": {
    label: "Entrega duplicada",
    description: "As 2 primeiras mensagens são enviadas de novo (retry do producer); o consumer idempotente ignora a cópia.",
  },
  mixed: { label: "Misto", description: "Uma poison message, uma falha temporária e uma mensagem enviada duas vezes." },
};

const runStatusLabel: Record<QueueRun["status"], string> = {
  running: "Em andamento",
  completed: "Concluída",
  expired: "Expirada",
  failed: "Falhou no envio",
};

const messageStatusLabel: Record<LiveMessage["status"], string> = {
  queued: "Na fila",
  processing: "Em processamento",
  retrying: "Falhou; volta após o atraso",
  exhausted: "Esgotou os recebimentos; indo para a DLQ",
  dlq: "Na DLQ (inferido)",
  processed: "Processada",
  "send-failed": "Não enviada",
};

function describeEvent(event: LiveEvent): string {
  const id = event.messageId ?? "";
  const count = event.receiveCount ?? 0;
  switch (event.type) {
    case "run-started":
      return `Execução iniciada (${scenarioInfo[event.detail as RunScenario]?.label ?? event.detail})`;
    case "sent": {
      const [sent, copies] = (event.detail ?? "0+0").split("+");
      return `SendMessageBatch: ${sent} mensagem(ns)${copies && copies !== "0" ? ` + ${copies} reenvio(s)` : ""}`;
    }
    case "send-failed":
      return `O SQS recusou: ${event.detail}`;
    case "received":
      return `${id} recebida pelo consumer (ApproximateReceiveCount ${count})`;
    case "succeeded":
      return `${id} processada e apagada`;
    case "failed":
      return `${id} falhou no recebimento ${count} (${event.detail === "last receive" ? "último" : event.detail?.replace("retry in", "nova tentativa em")})`;
    case "exhausted":
      return `${id} esgotou os recebimentos: o SQS a move para a DLQ na próxima tentativa`;
    case "duplicate-skipped":
      return `${id} chegou de novo: já processada, ignorada (idempotência)`;
    case "busy":
      return `${id} chegou enquanto outro consumer a processava: devolvida à fila`;
    case "run-completed":
      return "Execução concluída";
    case "run-expired":
      return "Execução expirada (tempo limite)";
  }
}

function diagramLabels(run: QueueRun): DiagramLabels {
  const d = text.diagram;
  const c = run.counts;
  return {
    title: "Mensagens da execução real",
    summary: `${run.acceptedMessages} aceitas, ${c.queued} na fila, ${c.processing} em processamento, ${c.retrying + c.awaitingDlq} invisíveis, ${c.processed} processadas, ${c.dlq} na DLQ.`,
    producer: "Lambda producer",
    queue: d.queue,
    hidden: d.hidden,
    consumer: (index) => `Lambda consumer ${index + 1}`,
    processed: d.processed,
    dlq: d.dlq,
    // Short labels: they sit in the gaps between the boxes.
    send: d.send,
    receive: d.receive,
    remove: d.remove,
    retry: d.retry,
    redrive: fill("maxReceiveCount {n}", { n: run.maxReceives }),
  };
}

// ------------------------------------------------------------------ polling

function useRunPolling(api: StudioApi, runId: string, onSettled: () => void) {
  const [run, setRun] = useState<QueueRun | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    // Set while a tick is scheduled; a hidden tab skips its tick and resumes when shown.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let busy = false;
    let done = false;

    const schedule = (ms: number) => {
      if (Date.now() - startedAt < MAX_POLL_MS) timer = setTimeout(tick, ms);
    };

    async function tick() {
      timer = undefined;
      if (document.visibilityState === "hidden") return;
      busy = true;
      try {
        const next = await api.labs.run(runId, controller.signal);
        setRun(next);
        setError(null);
        if (next.status === "running") schedule(POLL_MS);
        else {
          done = true;
          onSettled();
        }
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught);
        // A missing run or a lost session will not fix itself.
        if (caught instanceof ApiError && [401, 403, 404].includes(caught.status)) done = true;
        else schedule(POLL_MS * 2);
      } finally {
        busy = false;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible" && !done && !busy && timer === undefined) void tick();
    };
    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // onSettled is a callback from the parent; a new one must not restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, runId]);

  return { run, error };
}

// ------------------------------------------------------------------ run view

function LiveRun({ runId, onSettled }: { runId: string; onSettled: () => void }) {
  const api = useStudioApi();
  const { run, error } = useRunPolling(api, runId, onSettled);
  const titleId = useId();

  if (!run) return error ? <ErrorState error={error} /> : <Loading label="Lendo a execução…" />;
  const c = run.counts;
  const stats = [
    ["Aceitas", run.acceptedMessages],
    ["Reenvios", run.duplicatesSent],
    ["Na fila", c.queued],
    ["Processando", c.processing],
    ["Aguardando retry", c.retrying],
    ["Processadas", c.processed],
    ["Recebimentos", c.deliveries],
    ["Falhas", c.failedAttempts],
    ["Duplicatas ignoradas", c.duplicatesSkipped],
    ["Na DLQ", c.dlq + c.awaitingDlq],
  ] as const;

  return (
    <section className="admin-card ql-live-run" aria-labelledby={titleId}>
      <header className="ql-live-head">
        <h2 id={titleId} className="admin-panel-title">
          Execução <code>{run.runId.slice(0, 8)}</code>
        </h2>
        <StatusBadge status={run.status === "running" ? "publishing" : run.status === "completed" ? "succeeded" : "failed"} label={runStatusLabel[run.status]} />
        <span className="admin-muted">
          {scenarioInfo[run.scenario].label} · iniciada {formatDateTime(run.createdAt)}
          {run.finishedAt && ` · encerrada ${formatDateTime(run.finishedAt)}`}
        </span>
      </header>
      {error !== null && (
        <p className="admin-warning" role="alert">
          Falha ao atualizar: {errorMessage(error)}. Tentando de novo.
        </p>
      )}

      <dl className="ql-live-stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="ql-diagram-frame">
        <QueueDiagram model={fromRun(run)} labels={diagramLabels(run)} />
      </div>
      <DiagramLegend text={text} />

      <p className="admin-help">
        Estado registrado pelo consumer no DynamoDB e lido por polling a cada {POLL_MS / 1000} s enquanto a execução está aberta. Eventos de
        consumers diferentes podem aparecer fora de ordem. A ida para a DLQ é inferida: a mensagem esgotou os {run.maxReceives} recebimentos e
        nada mais foi registrado por 15 s; a confirmação é a profundidade da DLQ no painel de estado.
      </p>

      <div className="ql-live-details">
        {/* Focusable: on narrow screens the table scrolls sideways. */}
        <div className="admin-table-wrap" role="region" aria-label="Mensagens da execução" tabIndex={0}>
          <table className="admin-table">
            <caption className="visually-hidden">Mensagens da execução</caption>
            <thead>
              <tr>
                <th scope="col">Mensagem</th>
                <th scope="col">Cenário</th>
                <th scope="col">Estado</th>
                <th scope="col">Recebimentos</th>
                <th scope="col">Entregas</th>
                <th scope="col">Efeitos</th>
              </tr>
            </thead>
            <tbody>
              {run.messages.map((message) => (
                <tr key={message.messageId}>
                  <th scope="row">{message.messageId}</th>
                  <td>{message.scenario}</td>
                  <td>{messageStatusLabel[message.status]}</td>
                  <td>{message.receives}</td>
                  <td>{message.deliveries}</td>
                  <td>{message.effects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol className="ql-live-events" aria-label="Eventos" tabIndex={0}>
          {[...run.events].reverse().map((event, index) => (
            <li key={`${event.at}-${index}`} data-type={event.type}>
              <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString("pt-BR")}</time>
              <span>{describeEvent(event)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ page

function startError(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error);
  switch (error.code) {
    case "disabled":
      return error.body.reason === "consumer_disabled"
        ? `O consumer está desligado (event source mapping: ${String(error.body.consumerState)}). As mensagens ficariam paradas na fila.`
        : "O AWS Live Mode está desligado (queue_lab_enabled = false).";
    case "daily_limit":
      return `Limite diário de ${String(error.body.limit)} execuções atingido. Volta a liberar à meia-noite UTC.`;
    case "run_in_progress":
      return "Você já tem uma execução em andamento.";
    case "invalid_request":
      return "Configuração inválida.";
    case "rate_limited":
      return "Muitas requisições. Aguarde alguns segundos.";
    default:
      return errorMessage(error);
  }
}

function Overview({ overview }: { overview: QueueLabOverview }) {
  const ready = overview.enabled && overview.consumerState === "Enabled";
  return (
    <section className="admin-card" aria-labelledby="ql-overview">
      <h2 id="ql-overview" className="admin-panel-title">
        Estado
      </h2>
      <dl className="admin-facts">
        <div>
          <dt>Execução real</dt>
          <dd>{overview.enabled ? "Habilitada" : "Desligada (kill switch)"}</dd>
        </div>
        <div>
          <dt>Consumer (event source mapping)</dt>
          <dd>{overview.consumerState}</dd>
        </div>
        <div>
          <dt>Execuções hoje (UTC)</dt>
          <dd>
            {overview.usage.runsToday} / {overview.limits.runsPerDay}
          </dd>
        </div>
        <div>
          <dt>Limites</dt>
          <dd>
            até {overview.limits.maxMessages} mensagens · maxReceiveCount {overview.limits.maxReceives} · 1 execução aberta por vez
          </dd>
        </div>
        <div>
          <dt>DLQ (aproximado)</dt>
          <dd>
            {overview.deadLetterQueue
              ? `${overview.deadLetterQueue.visible} visível(is), ${overview.deadLetterQueue.inFlight} em uso`
              : "indisponível"}
          </dd>
        </div>
      </dl>
      {!ready && (
        <p className="admin-help">
          Para ligar: <code>queue_lab_enabled = true</code> no Terraform (liga a API e o event source mapping). Desligar o mapping
          interrompe o polling da fila. Veja docs/DISTRIBUTED_SYSTEMS_LAB.md.
        </p>
      )}
    </section>
  );
}

export function LiveLab() {
  const api = useStudioApi();
  const [runId, setRunId] = useState<string | null>(null);
  // Kept while it reloads, so the open run stays mounted (and keeps polling) meanwhile.
  const [data, setData] = useState<QueueLabOverview | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const reload = useCallback(() => {
    api.labs.queue().then(
      (next) => {
        setData(next);
        setLoadError(null);
        // An open run found on load stays on screen after it ends.
        if (next.activeRunId) setRunId((current) => current ?? next.activeRunId);
      },
      (error: unknown) => setLoadError(error),
    );
  }, [api]);
  useEffect(reload, [reload]);
  const [messageCount, setMessageCount] = useState(5);
  const [scenario, setScenario] = useState<RunScenario>("poison-message");
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const formId = useId();

  if (!data) return loadError ? <ErrorState error={loadError} onRetry={reload} /> : <Loading />;
  const shownRun = runId;
  const ready = data.enabled && data.consumerState === "Enabled";
  const limitReached = data.usage.runsToday >= data.limits.runsPerDay;

  async function start() {
    setStarting(true);
    setFailure(null);
    try {
      const started = await api.labs.startRun({ messageCount, failureScenario: scenario });
      setRunId(started.runId);
      reload();
    } catch (error) {
      setFailure(startError(error));
      if (error instanceof ApiError && error.code === "run_in_progress" && typeof error.body.activeRunId === "string") setRunId(error.body.activeRunId);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="ql-live">
      <p className="ql-mode" data-mode="live" role="note">
        <strong>AWS Live Mode</strong>
        <span>
          Cada execução envia mensagens reais à fila SQS da conta pessoal e invoca Lambdas de verdade (custo de frações de centavo, dentro dos
          limites abaixo). Para experimentar sem AWS, use a <Link to="/pt/labs/distributed-systems">simulação pública</Link>.
        </span>
      </p>

      <div className="admin-grid-2">
        <Overview overview={data} />

        <section className="admin-card" aria-labelledby={`${formId}-title`}>
          <h2 id={`${formId}-title`} className="admin-panel-title">
            Nova execução
          </h2>
          <div className="admin-fields">
            <label className="admin-field" htmlFor={`${formId}-count`}>
              <span className="label">Mensagens (1 a {data.limits.maxMessages})</span>
              <input
                id={`${formId}-count`}
                type="number"
                min={1}
                max={data.limits.maxMessages}
                value={messageCount}
                onChange={(event) => setMessageCount(Math.max(1, Math.min(data.limits.maxMessages, Math.round(Number(event.target.value) || 1))))}
              />
            </label>
            <label className="admin-field" htmlFor={`${formId}-scenario`}>
              <span className="label">Cenário</span>
              <select id={`${formId}-scenario`} value={scenario} onChange={(event) => setScenario(event.target.value as RunScenario)}>
                {runScenarios.map((id) => (
                  <option key={id} value={id}>
                    {scenarioInfo[id].label}
                  </option>
                ))}
              </select>
              <span className="admin-help">{scenarioInfo[scenario].description}</span>
            </label>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              data-variant="primary"
              disabled={!ready || limitReached || starting}
              aria-busy={starting}
              onClick={() => void start()}
            >
              {starting ? "Enviando…" : "Executar na AWS"}
            </button>
          </div>
          {failure && (
            <p className="admin-warning" role="alert">
              {failure}
            </p>
          )}
        </section>
      </div>

      {shownRun && <LiveRun key={shownRun} runId={shownRun} onSettled={reload} />}

      {data.recentRuns.length > 0 && (
        <section className="admin-card" aria-labelledby="ql-recent">
          <h2 id="ql-recent" className="admin-panel-title">
            Execuções recentes
          </h2>
          <ul className="admin-list">
            {data.recentRuns.map((recent) => (
              <li key={recent.runId}>
                <button type="button" className="admin-link-button" aria-pressed={recent.runId === shownRun} onClick={() => setRunId(recent.runId)}>
                  <code>{recent.runId.slice(0, 8)}</code> · {scenarioInfo[recent.scenario as RunScenario]?.label ?? recent.scenario}
                </button>
                <span className="admin-muted">{formatDateTime(recent.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
