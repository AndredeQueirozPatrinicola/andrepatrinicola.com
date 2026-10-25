/**
 * Discrete-event simulation of one Amazon SQS Standard queue, its consumers
 * and a dead-letter queue, for the Distributed Systems Playground.
 *
 * Pure and deterministic: the state holds its own clock (simulated
 * milliseconds) and its own random generator, so the same configuration and
 * seed always produce the same run. Nothing here knows about React or real
 * time; the page decides how fast simulated time passes.
 *
 * What it models (and how it differs from SQS) is listed in
 * docs/DISTRIBUTED_SYSTEMS_LAB.md of the API repository. In short:
 * - receiving hides a message for the visibility timeout and adds 1 to its
 *   receive count; only a delete with the latest receipt handle removes it;
 * - a failed or hung consumer does not delete, so the message reappears when
 *   the visibility timeout ends (no automatic backoff);
 * - a message that reappears with receiveCount >= maxReceives is moved to the
 *   DLQ (SQS does it on the next receive attempt; consumers here poll all the
 *   time, so it happens at once);
 * - order is best effort (a consumer takes one of the oldest visible
 *   messages, not necessarily the oldest);
 * - "duplicate delivery" hands out an extra copy of a message, as SQS
 *   Standard occasionally does (at-least-once delivery);
 * - one message per receive (Lambda would receive batches).
 */

export type FailureKind = "error" | "timeout";

export type SimulationConfig = {
  messageCount: number;
  consumers: number;
  /** Mean processing time of one attempt; each attempt varies by ±40%. */
  processingMs: number;
  /** Chance that an attempt on a normal message fails (0–1). */
  failureRate: number;
  /** How an attempt fails: the handler throws, or hangs until the timeout. */
  failureKind: FailureKind;
  /** Messages that fail on every attempt. */
  poisonMessages: number;
  /** maxReceiveCount of the redrive policy. */
  maxReceives: number;
  visibilityTimeoutMs: number;
  /** Chance that receiving a message also releases an extra copy of it (0–1). */
  duplicateRate: number;
  /** Consumers record what they processed and skip messages seen before. */
  idempotent: boolean;
  seed: number;
};

export const limits = {
  messageCount: { min: 1, max: 40 },
  consumers: { min: 1, max: 6 },
  processingMs: { min: 200, max: 6000 },
  maxReceives: { min: 1, max: 6 },
  visibilityTimeoutMs: { min: 1000, max: 15000 },
  poisonMessages: { min: 0, max: 3 },
} as const;

/** Time between two messages sent by the producer. */
export const SEND_INTERVAL_MS = 250;
/** How long after a receive a duplicate copy becomes visible. */
export const DUPLICATE_DELAY_MS = 300;
/** Errors are thrown halfway through the work. */
const ERROR_AT = 0.5;
const ORDER_WINDOW = 3;
const MAX_LOG = 400;

export type MessageState = "unsent" | "available" | "in-flight" | "invisible" | "processed" | "dlq";

export type SimMessage = {
  id: string;
  seq: number;
  poison: boolean;
  state: MessageState;
  receiveCount: number;
  /** Receipt handle of the latest receive (0 before the first). */
  handle: number;
  /** When an in-flight or invisible message becomes visible again. */
  visibleAt: number;
  sentAt: number | null;
  /** Visible since (orders the queue). */
  enqueuedAt: number;
  doneAt: number | null;
  /** Side effects actually applied (more than 1 = processed twice). */
  effects: number;
  /** Extra copies waiting to be delivered, with the time each becomes visible. */
  copies: number[];
};

export type Outcome = "success" | "error" | "timeout";

export type Delivery = {
  messageId: string;
  handle: number;
  /** An extra copy (duplicate delivery), not the message's own receive. */
  copy: boolean;
  attempt: number;
  startedAt: number;
  finishesAt: number;
  outcome: Outcome;
};

export type Consumer = { id: number; delivery: Delivery | null };

export type LogKind =
  | "sent"
  | "received"
  | "copy-received"
  | "succeeded"
  | "failed"
  | "timed-out"
  | "visible-again"
  | "stale-delete"
  | "duplicate-effect"
  | "duplicate-skipped"
  | "dlq"
  | "finished";

export type LogEntry = {
  at: number;
  kind: LogKind;
  messageId?: string;
  consumer?: number;
  attempt?: number;
};

export type SimulationState = {
  config: SimulationConfig;
  now: number;
  rng: number;
  sent: number;
  nextHandle: number;
  messages: SimMessage[];
  consumers: Consumer[];
  log: LogEntry[];
  attempts: number;
  failedAttempts: number;
  duplicatesSkipped: number;
  /** Durations of successful attempts, for the average. */
  successMs: number[];
  finishedAt: number | null;
};

// ------------------------------------------------------------------ random

/** mulberry32: a tiny seeded generator; returns [0, 1) and the next state. */
function random(state: SimulationState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let value = state.rng;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeConfig(config: SimulationConfig): SimulationConfig {
  const int = (value: number, range: { min: number; max: number }) => clamp(Math.round(value), range.min, range.max);
  const messageCount = int(config.messageCount, limits.messageCount);
  return {
    ...config,
    messageCount,
    consumers: int(config.consumers, limits.consumers),
    processingMs: int(config.processingMs, limits.processingMs),
    failureRate: clamp(config.failureRate, 0, 1),
    poisonMessages: Math.min(int(config.poisonMessages, limits.poisonMessages), messageCount),
    maxReceives: int(config.maxReceives, limits.maxReceives),
    visibilityTimeoutMs: int(config.visibilityTimeoutMs, limits.visibilityTimeoutMs),
    duplicateRate: clamp(config.duplicateRate, 0, 1),
    seed: config.seed >>> 0,
  };
}

const messageId = (seq: number) => `M${String(seq).padStart(2, "0")}`;

export function createSimulation(input: SimulationConfig): SimulationState {
  const config = normalizeConfig(input);
  const state: SimulationState = {
    config,
    now: 0,
    rng: config.seed,
    sent: 0,
    nextHandle: 1,
    messages: [],
    consumers: Array.from({ length: config.consumers }, (_, index) => ({ id: index + 1, delivery: null })),
    log: [],
    attempts: 0,
    failedAttempts: 0,
    duplicatesSkipped: 0,
    successMs: [],
    finishedAt: null,
  };

  // Poison messages are spread through the batch, chosen by the seed.
  const poison = new Set<number>();
  while (poison.size < config.poisonMessages) poison.add(1 + Math.floor(random(state) * config.messageCount));

  for (let seq = 1; seq <= config.messageCount; seq++) {
    state.messages.push({
      id: messageId(seq),
      seq,
      poison: poison.has(seq),
      state: "unsent",
      receiveCount: 0,
      handle: 0,
      visibleAt: 0,
      sentAt: null,
      enqueuedAt: 0,
      doneAt: null,
      effects: 0,
      copies: [],
    });
  }
  return state;
}

function log(state: SimulationState, entry: Omit<LogEntry, "at">): void {
  state.log.push({ at: state.now, ...entry });
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

const find = (state: SimulationState, id: string) => state.messages.find((message) => message.id === id)!;

// ------------------------------------------------------------------ events

const nextSendAt = (state: SimulationState) =>
  state.sent < state.config.messageCount ? state.sent * SEND_INTERVAL_MS : Infinity;

/** When the next scheduled thing happens (receives are immediate, see `receiveReady`). */
function nextEventAt(state: SimulationState): number {
  let next = nextSendAt(state);
  for (const consumer of state.consumers) if (consumer.delivery) next = Math.min(next, consumer.delivery.finishesAt);
  for (const message of state.messages) {
    if (message.state === "in-flight" || message.state === "invisible") next = Math.min(next, message.visibleAt);
    for (const at of message.copies) if (at > state.now) next = Math.min(next, at);
  }
  return next;
}

type Candidate = { message: SimMessage; copy: boolean; since: number };

function candidates(state: SimulationState): Candidate[] {
  const list: Candidate[] = [];
  for (const message of state.messages) {
    if (message.state === "available") list.push({ message, copy: false, since: message.enqueuedAt });
    for (const at of message.copies) if (at <= state.now) list.push({ message, copy: true, since: at });
  }
  return list.sort((a, b) => a.since - b.since || a.message.seq - b.message.seq);
}

const receiveReady = (state: SimulationState) =>
  state.consumers.some((consumer) => !consumer.delivery) && candidates(state).length > 0;

function duration(state: SimulationState): number {
  return Math.round(state.config.processingMs * (0.6 + random(state) * 0.8));
}

function startDelivery(state: SimulationState, consumer: Consumer, candidate: Candidate): void {
  const { message, copy } = candidate;
  const { config } = state;
  const work = duration(state);
  const handle = state.nextHandle++;
  state.attempts++;

  if (copy) {
    message.copies.splice(message.copies.indexOf(candidate.since), 1);
    // A copy is not retried: whatever happens to it, the message itself follows its own receives.
    const outcome: Outcome = message.poison ? "error" : "success";
    consumer.delivery = {
      messageId: message.id,
      handle,
      copy: true,
      attempt: message.receiveCount,
      startedAt: state.now,
      finishesAt: state.now + (outcome === "success" ? work : Math.round(work * ERROR_AT)),
      outcome,
    };
    log(state, { kind: "copy-received", messageId: message.id, consumer: consumer.id });
    return;
  }

  message.receiveCount++;
  message.handle = handle;
  message.state = "in-flight";
  message.visibleAt = state.now + config.visibilityTimeoutMs;

  const fails = message.poison || random(state) < config.failureRate;
  const outcome: Outcome = fails ? config.failureKind : "success";
  const finishesAt =
    outcome === "success"
      ? state.now + work
      : outcome === "error"
        ? state.now + Math.round(work * ERROR_AT)
        : // A hung handler holds its consumer until the visibility timeout ends.
          message.visibleAt;

  consumer.delivery = {
    messageId: message.id,
    handle,
    copy: false,
    attempt: message.receiveCount,
    startedAt: state.now,
    finishesAt,
    outcome,
  };
  log(state, { kind: "received", messageId: message.id, consumer: consumer.id, attempt: message.receiveCount });

  if (random(state) < config.duplicateRate) message.copies.push(state.now + DUPLICATE_DELAY_MS);
}

/** Every idle consumer takes one of the oldest visible messages (best-effort order). */
function receive(state: SimulationState): void {
  for (const consumer of state.consumers) {
    if (consumer.delivery) continue;
    const list = candidates(state);
    if (list.length === 0) return;
    const window = Math.min(ORDER_WINDOW, list.length);
    startDelivery(state, consumer, list[Math.floor(random(state) * window)]!);
  }
}

function applyEffect(state: SimulationState, message: SimMessage, consumer: Consumer): void {
  if (state.config.idempotent && message.effects > 0) {
    state.duplicatesSkipped++;
    log(state, { kind: "duplicate-skipped", messageId: message.id, consumer: consumer.id });
    return;
  }
  message.effects++;
  if (message.effects > 1) log(state, { kind: "duplicate-effect", messageId: message.id, consumer: consumer.id });
}

function complete(state: SimulationState, consumer: Consumer): void {
  const delivery = consumer.delivery!;
  const message = find(state, delivery.messageId);
  consumer.delivery = null;

  if (delivery.outcome !== "success") {
    state.failedAttempts++;
    log(state, {
      kind: delivery.outcome === "error" ? "failed" : "timed-out",
      messageId: message.id,
      consumer: consumer.id,
      attempt: delivery.attempt,
    });
    // Not deleted: hidden until the visibility timeout ends.
    if (message.handle === delivery.handle && message.state === "in-flight") message.state = "invisible";
    return;
  }

  state.successMs.push(state.now - delivery.startedAt);
  log(state, { kind: "succeeded", messageId: message.id, consumer: consumer.id, attempt: delivery.attempt });
  applyEffect(state, message, consumer);
  if (delivery.copy) return;

  // DeleteMessage only removes the message with its latest receipt handle.
  if (message.handle !== delivery.handle || message.state === "dlq" || message.state === "processed") {
    log(state, { kind: "stale-delete", messageId: message.id, consumer: consumer.id });
    return;
  }
  message.state = "processed";
  message.doneAt = state.now;
}

function expireVisibility(state: SimulationState, message: SimMessage): void {
  if (message.receiveCount >= state.config.maxReceives) {
    message.state = "dlq";
    message.doneAt = state.now;
    log(state, { kind: "dlq", messageId: message.id, attempt: message.receiveCount });
    return;
  }
  message.state = "available";
  message.enqueuedAt = state.now;
  log(state, { kind: "visible-again", messageId: message.id, attempt: message.receiveCount });
}

function processEventsAt(state: SimulationState): void {
  for (const consumer of state.consumers) {
    if (consumer.delivery && consumer.delivery.finishesAt <= state.now) complete(state, consumer);
  }
  for (const message of state.messages) {
    if ((message.state === "in-flight" || message.state === "invisible") && message.visibleAt <= state.now) {
      expireVisibility(state, message);
    }
  }
  while (nextSendAt(state) <= state.now) {
    const message = state.messages[state.sent++]!;
    message.state = "available";
    message.sentAt = state.now;
    message.enqueuedAt = state.now;
    log(state, { kind: "sent", messageId: message.id });
  }
}

function checkFinished(state: SimulationState): void {
  if (state.finishedAt !== null) return;
  const settled = state.messages.every(
    (message) => (message.state === "processed" || message.state === "dlq") && message.copies.length === 0,
  );
  if (settled && state.consumers.every((consumer) => !consumer.delivery)) {
    state.finishedAt = state.now;
    log(state, { kind: "finished" });
  }
}

// ------------------------------------------------------------------ public API

/** Runs every event up to `target` (simulated ms) and returns the new state. */
export function advanceTo(previous: SimulationState, target: number): SimulationState {
  const state = structuredClone(previous);
  if (state.finishedAt !== null) return state;
  for (;;) {
    receive(state);
    checkFinished(state);
    const next = nextEventAt(state);
    if (state.finishedAt !== null || next > target) break;
    state.now = next;
    processEventsAt(state);
  }
  if (state.finishedAt === null && Number.isFinite(target)) state.now = Math.max(state.now, target);
  return state;
}

export const advanceBy = (state: SimulationState, ms: number) => advanceTo(state, state.now + ms);

/** Moves to the next thing that happens: a receive, a send, a completion or a timeout. */
export function step(previous: SimulationState): SimulationState {
  if (previous.finishedAt !== null) return previous;
  if (receiveReady(previous)) {
    const state = structuredClone(previous);
    receive(state);
    return state;
  }
  const next = nextEventAt(previous);
  return Number.isFinite(next) ? advanceTo(previous, next) : previous;
}

/** Runs to the end (tests, and the "finish" of a preset). Bounded, in case of a bug. */
export function runToEnd(state: SimulationState, maxMs = 10 * 60_000): SimulationState {
  return advanceTo(state, state.now + maxMs);
}

export type Metrics = {
  elapsedMs: number;
  sent: number;
  available: number;
  inFlight: number;
  /** Failed and hidden: will be received again after the visibility timeout. */
  waitingRetry: number;
  processed: number;
  failedAttempts: number;
  attempts: number;
  dlq: number;
  /** Messages processed per simulated second. */
  throughput: number;
  avgProcessingMs: number;
  duplicateEffects: number;
  duplicatesSkipped: number;
};

export function metrics(state: SimulationState): Metrics {
  const count = (status: MessageState) => state.messages.filter((message) => message.state === status).length;
  const processed = count("processed");
  const seconds = state.now / 1000;
  const total = state.successMs.reduce((sum, value) => sum + value, 0);
  return {
    elapsedMs: state.now,
    sent: state.sent,
    available: count("available") + state.messages.reduce((sum, m) => sum + m.copies.filter((at) => at <= state.now).length, 0),
    inFlight: state.consumers.filter((consumer) => consumer.delivery).length,
    waitingRetry: count("invisible"),
    processed,
    failedAttempts: state.failedAttempts,
    attempts: state.attempts,
    dlq: count("dlq"),
    throughput: seconds > 0 ? processed / seconds : 0,
    avgProcessingMs: state.successMs.length ? total / state.successMs.length : 0,
    duplicateEffects: state.messages.reduce((sum, message) => sum + Math.max(0, message.effects - 1), 0),
    duplicatesSkipped: state.duplicatesSkipped,
  };
}
