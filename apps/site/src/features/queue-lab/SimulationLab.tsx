import { useId, useState } from "react";

import { track } from "../../analytics/umami";
import { localeInfo } from "../../i18n/config";
import { useI18n } from "../../i18n/context";
import { QueueDiagram, type DiagramLabels } from "./diagram/QueueDiagram";
import { fromSimulation, type TokenTone } from "./diagram/model";
import { fill, type QueueLabMessages } from "./messages";
import {
  limits,
  metrics as computeMetrics,
  type LogEntry,
  type Metrics,
  type SimulationConfig,
  type SimulationState,
} from "./simulation/engine";
import { presetIds, presets, type PresetId } from "./simulation/presets";
import { speeds, useSimulation, type RunStatus } from "./useSimulation";

type Formatters = { seconds: (ms: number) => string; decimal: (value: number) => string; percent: (value: number) => string };

function useFormatters(): Formatters {
  const { locale } = useI18n();
  const tag = localeInfo[locale].tag;
  const decimal = new Intl.NumberFormat(tag, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 });
  return {
    seconds: (ms) => `${decimal.format(ms / 1000)} s`,
    decimal: (value) => decimal.format(value),
    percent: (value) => percent.format(value),
  };
}

export function diagramLabels(text: QueueLabMessages, values: Metrics): DiagramLabels {
  return {
    title: text.diagram.title,
    summary: fill(text.diagram.summary, values),
    producer: text.diagram.producer,
    queue: text.diagram.queue,
    hidden: text.diagram.hidden,
    consumer: (index) => fill(text.diagram.consumer, { n: index + 1 }),
    processed: text.diagram.processed,
    dlq: text.diagram.dlq,
    send: text.diagram.send,
    receive: text.diagram.receive,
    remove: text.diagram.remove,
    retry: text.diagram.retry,
    redrive: text.diagram.redrive,
  };
}

// ------------------------------------------------------------------ presets

function PresetPicker({ text, selected, onSelect }: { text: QueueLabMessages; selected: PresetId | null; onSelect: (id: PresetId) => void }) {
  const titleId = useId();
  return (
    <section className="ql-presets" aria-labelledby={titleId}>
      <h2 id={titleId} className="label">
        {text.presets.title}
      </h2>
      <div className="ql-preset-list" role="radiogroup" aria-labelledby={titleId}>
        {presetIds.map((id, index) => {
          const preset = text.presets.items[id];
          return (
            <label key={id} className="ql-preset" data-selected={selected === id}>
              <input type="radio" name="ql-preset" value={id} checked={selected === id} onChange={() => onSelect(id)} />
              <span className="ql-preset-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="ql-preset-title">{preset.title}</span>
              <span className="ql-preset-concept">{preset.concept}</span>
            </label>
          );
        })}
      </div>
      <p className="ql-preset-observe" aria-live="polite">
        {selected ? (
          <>
            <strong>{text.presets.observeLabel}:</strong> {text.presets.items[selected].observe}
          </>
        ) : (
          text.presets.custom
        )}
      </p>
    </section>
  );
}

// ------------------------------------------------------------------ configuration

type RangeProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
};

function Range({ label, value, min, max, step, display, onChange }: RangeProps) {
  const id = useId();
  return (
    <div className="ql-field">
      <label htmlFor={id}>
        <span>{label}</span>
        <span className="ql-value">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ConfigPanel({
  text,
  config,
  format,
  onChange,
}: {
  text: QueueLabMessages;
  config: SimulationConfig;
  format: Formatters;
  onChange: (patch: Partial<SimulationConfig>) => void;
}) {
  const titleId = useId();
  const t = text.config;
  return (
    <section className="ql-config" aria-labelledby={titleId}>
      <h2 id={titleId} className="label">
        {t.title}
      </h2>
      <Range label={t.messageCount} value={config.messageCount} {...limits.messageCount} step={1} display={String(config.messageCount)} onChange={(messageCount) => onChange({ messageCount })} />
      <Range label={t.consumers} value={config.consumers} {...limits.consumers} step={1} display={String(config.consumers)} onChange={(consumers) => onChange({ consumers })} />
      <Range
        label={t.processingMs}
        value={config.processingMs}
        {...limits.processingMs}
        step={100}
        display={format.seconds(config.processingMs)}
        onChange={(processingMs) => onChange({ processingMs })}
      />
      <Range
        label={t.visibilityTimeout}
        value={config.visibilityTimeoutMs}
        {...limits.visibilityTimeoutMs}
        step={500}
        display={format.seconds(config.visibilityTimeoutMs)}
        onChange={(visibilityTimeoutMs) => onChange({ visibilityTimeoutMs })}
      />
      <Range label={t.maxReceives} value={config.maxReceives} {...limits.maxReceives} step={1} display={String(config.maxReceives)} onChange={(maxReceives) => onChange({ maxReceives })} />
      <Range
        label={t.failureRate}
        value={config.failureRate}
        min={0}
        max={0.8}
        step={0.05}
        display={format.percent(config.failureRate)}
        onChange={(failureRate) => onChange({ failureRate })}
      />
      <fieldset className="ql-choice">
        <legend>{t.failureKind}</legend>
        {(["error", "timeout"] as const).map((kind) => (
          <label key={kind}>
            <input type="radio" name="ql-failure-kind" checked={config.failureKind === kind} onChange={() => onChange({ failureKind: kind })} />
            {t.failureKinds[kind]}
          </label>
        ))}
      </fieldset>
      <Range
        label={t.poisonMessages}
        value={config.poisonMessages}
        {...limits.poisonMessages}
        step={1}
        display={String(config.poisonMessages)}
        onChange={(poisonMessages) => onChange({ poisonMessages })}
      />
      <Range
        label={t.duplicateRate}
        value={config.duplicateRate}
        min={0}
        max={0.6}
        step={0.05}
        display={format.percent(config.duplicateRate)}
        onChange={(duplicateRate) => onChange({ duplicateRate })}
      />
      <div className="ql-toggle">
        <label>
          <input type="checkbox" checked={config.idempotent} onChange={(event) => onChange({ idempotent: event.target.checked })} />
          {t.idempotent}
        </label>
        <p className="ql-hint">{t.idempotentHint}</p>
      </div>
      <div className="ql-seed">
        <span>{fill(t.seed, { seed: config.seed })}</span>
        <button type="button" className="ql-button" onClick={() => onChange({ seed: (config.seed * 7919 + 13) % 100_000 })}>
          {t.newSeed}
        </button>
        <p className="ql-hint">{t.seedHint}</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ results

function MetricsPanel({ text, values, format }: { text: QueueLabMessages; values: Metrics; format: Formatters }) {
  const titleId = useId();
  const t = text.metrics;
  const items: { key: string; label: string; value: string; emphasis?: boolean }[] = [
    { key: "elapsed", label: t.elapsed, value: format.seconds(values.elapsedMs) },
    { key: "sent", label: t.sent, value: String(values.sent) },
    { key: "available", label: t.available, value: String(values.available) },
    { key: "inFlight", label: t.inFlight, value: String(values.inFlight) },
    { key: "waitingRetry", label: t.waitingRetry, value: String(values.waitingRetry) },
    { key: "processed", label: t.processed, value: String(values.processed) },
    { key: "attempts", label: t.attempts, value: String(values.attempts) },
    { key: "failedAttempts", label: t.failedAttempts, value: String(values.failedAttempts) },
    { key: "dlq", label: t.dlq, value: String(values.dlq), emphasis: values.dlq > 0 },
    { key: "throughput", label: t.throughput, value: `${format.decimal(values.throughput)} ${t.throughputUnit}` },
    { key: "avgProcessing", label: t.avgProcessing, value: format.seconds(values.avgProcessingMs) },
    { key: "duplicateEffects", label: t.duplicateEffects, value: String(values.duplicateEffects), emphasis: values.duplicateEffects > 0 },
    { key: "duplicatesSkipped", label: t.duplicatesSkipped, value: String(values.duplicatesSkipped) },
  ];
  return (
    <section className="ql-metrics" aria-labelledby={titleId}>
      <h2 id={titleId} className="label">
        {t.title}
      </h2>
      <dl>
        {items.map((item) => (
          <div key={item.key} data-metric={item.key} data-emphasis={item.emphasis ?? false}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function describeLog(text: QueueLabMessages, entry: LogEntry): string {
  return fill(text.log.kinds[entry.kind], {
    id: entry.messageId ?? "",
    consumer: entry.consumer ? fill(text.diagram.consumer, { n: entry.consumer }) : "",
    attempt: entry.attempt ?? 0,
  });
}

function EventLog({ text, log, format }: { text: QueueLabMessages; log: LogEntry[]; format: Formatters }) {
  const titleId = useId();
  const recent = log.slice(-14).reverse();
  return (
    <section className="ql-log" aria-labelledby={titleId}>
      <h2 id={titleId} className="label">
        {text.log.title}
      </h2>
      {recent.length === 0 ? (
        <p className="ql-hint">{text.log.empty}</p>
      ) : (
        <ol>
          {recent.map((entry, index) => (
            <li key={`${log.length - index}`} data-kind={entry.kind}>
              <time>{format.seconds(entry.at)}</time>
              <span>{describeLog(text, entry)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MessageTable({ text, state }: { text: QueueLabMessages; state: SimulationState }) {
  const t = text.table;
  return (
    <details className="ql-table">
      <summary className="label">{t.title}</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{t.id}</th>
            <th scope="col">{t.state}</th>
            <th scope="col">{t.receives}</th>
            <th scope="col">{t.effects}</th>
          </tr>
        </thead>
        <tbody>
          {state.messages.map((message) => (
            <tr key={message.id}>
              <th scope="row">
                {message.id}
                {message.poison && <span className="ql-tag">{t.poison}</span>}
              </th>
              <td>{t.states[message.state]}</td>
              <td>{message.receiveCount}</td>
              <td data-warn={message.effects > 1}>{message.effects}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const legendTones: TokenTone[] = ["default", "retry", "poison", "copy", "stale"];

export function DiagramLegend({ text }: { text: QueueLabMessages }) {
  return (
    <div className="ql-legend">
      <p className="label">{text.diagram.legend.title}</p>
      <ul>
        {legendTones.map((tone) => (
          <li key={tone}>
            <svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true" className="ql-token" data-tone={tone}>
              <rect width="18" height="18" rx="1" />
            </svg>
            {text.diagram.legend[tone]}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ page section

function statusText(text: QueueLabMessages, status: RunStatus, values: Metrics, format: Formatters): string {
  if (status === "paused") return fill(text.status.paused, { time: format.seconds(values.elapsedMs) });
  if (status === "finished") {
    return fill(text.status.finished, { time: format.seconds(values.elapsedMs), processed: values.processed, dlq: values.dlq });
  }
  return text.status[status];
}

function Controls({ text, simulation, values, format }: { text: QueueLabMessages; simulation: ReturnType<typeof useSimulation>; values: Metrics; format: Formatters }) {
  const t = text.controls;
  const { status } = simulation;
  const primary =
    status === "running" ? (
      <button type="button" className="ql-button" data-variant="primary" onClick={simulation.pause}>
        {t.pause}
      </button>
    ) : (
      <button
        type="button"
        className="ql-button"
        data-variant="primary"
        disabled={status === "finished"}
        onClick={() => {
          if (status === "idle") track("queue-lab", { action: "start" });
          simulation.start();
        }}
      >
        {status === "paused" ? t.resume : t.start}
      </button>
    );

  return (
    <div className="ql-controls" role="group" aria-label={t.title}>
      <div className="ql-controls-buttons">
        {primary}
        <button type="button" className="ql-button" disabled={status === "finished"} onClick={simulation.step}>
          {t.step}
        </button>
        <button type="button" className="ql-button" onClick={() => simulation.reset(simulation.state.config)}>
          {t.reset}
        </button>
      </div>
      <fieldset className="ql-speed">
        <legend>{t.speed}</legend>
        {speeds.map((value) => (
          <label key={value} data-selected={simulation.speed === value}>
            <input type="radio" name="ql-speed" checked={simulation.speed === value} onChange={() => simulation.setSpeed(value)} />
            {`${format.decimal(value).replace(/[,.]0$/, "")}×`}
          </label>
        ))}
      </fieldset>
      <p className="ql-status" role="status" data-status={status}>
        {statusText(text, status, values, format)}
      </p>
    </div>
  );
}

/** The whole Simulation Mode: presets, configuration, controls, diagram and results. */
export function SimulationLab({ text }: { text: QueueLabMessages }) {
  const format = useFormatters();
  const [preset, setPreset] = useState<PresetId | null>("happy-path");
  const [config, setConfig] = useState<SimulationConfig>(presets["happy-path"]);
  const simulation = useSimulation(config);
  const values = computeMetrics(simulation.state);

  const apply = (next: SimulationConfig, nextPreset: PresetId | null) => {
    setConfig(next);
    setPreset(nextPreset);
    simulation.reset(next);
  };

  return (
    <div className="ql-sim">
      <PresetPicker
        text={text}
        selected={preset}
        onSelect={(id) => {
          track("queue-lab", { action: "preset", preset: id });
          apply(presets[id], id);
        }}
      />
      <div className="ql-workbench">
        <div className="ql-stage">
          <Controls text={text} simulation={simulation} values={values} format={format} />
          <div className="ql-diagram-frame">
            <QueueDiagram model={fromSimulation(simulation.state)} labels={diagramLabels(text, values)} />
          </div>
          <DiagramLegend text={text} />
        </div>
        <ConfigPanel text={text} config={config} format={format} onChange={(patch) => apply({ ...config, ...patch }, null)} />
      </div>
      <MetricsPanel text={text} values={values} format={format} />
      <div className="ql-results">
        <EventLog text={text} log={simulation.state.log} format={format} />
        <MessageTable text={text} state={simulation.state} />
      </div>
    </div>
  );
}
