import { describe, expect, it } from "vitest";

import {
  SEND_INTERVAL_MS,
  advanceBy,
  advanceTo,
  createSimulation,
  metrics,
  runToEnd,
  step,
  type LogKind,
  type SimulationConfig,
  type SimulationState,
} from "./engine";
import { presetIds, presets } from "./presets";

const config = (overrides: Partial<SimulationConfig> = {}): SimulationConfig => ({
  messageCount: 4,
  consumers: 1,
  processingMs: 1000,
  failureRate: 0,
  failureKind: "error",
  poisonMessages: 0,
  maxReceives: 3,
  visibilityTimeoutMs: 5000,
  duplicateRate: 0,
  idempotent: true,
  seed: 1,
  ...overrides,
});

const kinds = (state: SimulationState, kind: LogKind) => state.log.filter((entry) => entry.kind === kind);

describe("sending", () => {
  it("creates unique ids and sends one message per interval", () => {
    const start = createSimulation(config({ messageCount: 5 }));
    expect(new Set(start.messages.map((message) => message.id)).size).toBe(5);
    expect(start.messages.every((message) => message.state === "unsent")).toBe(true);

    const state = advanceTo(start, SEND_INTERVAL_MS * 2);
    expect(state.sent).toBe(3);
    expect(kinds(state, "sent").map((entry) => entry.at)).toEqual([0, 250, 500]);
  });

  it("keeps the input configuration within the limits", () => {
    const state = createSimulation(config({ messageCount: 999, consumers: 0, failureRate: 4, poisonMessages: 9, maxReceives: 0 }));
    expect(state.config).toMatchObject({ messageCount: 40, consumers: 1, failureRate: 1, poisonMessages: 3, maxReceives: 1 });
  });
});

describe("processing", () => {
  it("processes every message once on the happy path", () => {
    const end = runToEnd(createSimulation(config({ messageCount: 6, consumers: 2 })));
    const result = metrics(end);
    expect(end.finishedAt).not.toBeNull();
    expect(result).toMatchObject({ sent: 6, processed: 6, attempts: 6, failedAttempts: 0, dlq: 0, available: 0, inFlight: 0 });
    expect(end.messages.every((message) => message.effects === 1 && message.receiveCount === 1)).toBe(true);
    expect(result.avgProcessingMs).toBeGreaterThan(600);
    expect(result.avgProcessingMs).toBeLessThan(1400);
  });

  it("hides a received message and gives each consumer one at a time", () => {
    const state = advanceTo(createSimulation(config({ messageCount: 3, consumers: 2 })), SEND_INTERVAL_MS * 2);
    expect(metrics(state)).toMatchObject({ inFlight: 2, available: 1 });
    expect(state.messages.filter((message) => message.state === "in-flight")).toHaveLength(2);
  });

  it("more consumers drain the queue faster", () => {
    const run = (consumers: number) => runToEnd(createSimulation(config({ messageCount: 20, consumers, seed: 5 })));
    const one = run(1);
    const four = run(4);
    expect(four.finishedAt!).toBeLessThan(one.finishedAt! / 2.5);
    expect(metrics(four).throughput).toBeGreaterThan(metrics(one).throughput * 2.5);
  });
});

describe("failures and retries", () => {
  it("a failed message stays hidden until the visibility timeout, then is received again", () => {
    const start = createSimulation(config({ messageCount: 1, failureRate: 1, maxReceives: 5, visibilityTimeoutMs: 4000 }));
    // Received at 0, fails halfway (≤ 700 ms), hidden until 4000.
    const failed = advanceTo(start, 2000);
    expect(kinds(failed, "failed")).toHaveLength(1);
    expect(failed.messages[0]).toMatchObject({ state: "invisible", receiveCount: 1, visibleAt: 4000 });
    expect(metrics(failed)).toMatchObject({ waitingRetry: 1, inFlight: 0, available: 0 });

    const retried = advanceTo(failed, 4000);
    expect(kinds(retried, "visible-again")[0]).toMatchObject({ at: 4000, messageId: "M01", attempt: 1 });
    expect(retried.messages[0]).toMatchObject({ state: "in-flight", receiveCount: 2 });
  });

  it("a transient failure is retried and then processed", () => {
    const end = runToEnd(createSimulation(presets["consumer-failure"]));
    const result = metrics(end);
    expect(result.failedAttempts).toBeGreaterThan(0);
    expect(result.processed).toBe(10);
    expect(result.dlq).toBe(0);
    expect(result.attempts).toBe(10 + result.failedAttempts);
    expect(end.messages.some((message) => message.receiveCount > 1)).toBe(true);
  });

  it("a hung consumer holds its slot until the timeout", () => {
    const state = advanceTo(createSimulation(config({ messageCount: 1, failureRate: 1, failureKind: "timeout", maxReceives: 2, visibilityTimeoutMs: 3000 })), 2999);
    expect(metrics(state).inFlight).toBe(1);
    const after = advanceTo(state, 3000);
    expect(kinds(after, "timed-out")).toHaveLength(1);
    expect(after.messages[0]!.receiveCount).toBe(2);
  });

  it("a poison message goes to the DLQ after maxReceives receives", () => {
    const end = runToEnd(createSimulation(config({ messageCount: 3, poisonMessages: 1, maxReceives: 3, visibilityTimeoutMs: 2000 })));
    const poison = end.messages.find((message) => message.poison)!;
    expect(poison).toMatchObject({ state: "dlq", receiveCount: 3, effects: 0 });
    expect(kinds(end, "failed").filter((entry) => entry.messageId === poison.id)).toHaveLength(3);
    expect(kinds(end, "dlq")).toEqual([expect.objectContaining({ messageId: poison.id, attempt: 3, at: poison.doneAt })]);
    expect(metrics(end)).toMatchObject({ processed: 2, dlq: 1 });
  });

  it("with maxReceives 1 a single failure is enough", () => {
    const end = runToEnd(createSimulation(config({ messageCount: 1, failureRate: 1, maxReceives: 1 })));
    expect(end.messages[0]).toMatchObject({ state: "dlq", receiveCount: 1 });
  });
});

describe("duplicates and idempotency", () => {
  it("without deduplication a duplicate delivery applies the side effect twice", () => {
    const end = runToEnd(createSimulation(presets["duplicate-delivery"]));
    const result = metrics(end);
    expect(kinds(end, "copy-received").length).toBeGreaterThan(0);
    expect(result.duplicateEffects).toBeGreaterThan(0);
    expect(result.duplicatesSkipped).toBe(0);
    expect(result.processed).toBe(8);
  });

  it("an idempotent consumer skips the copies of the same run", () => {
    const plain = runToEnd(createSimulation(presets["duplicate-delivery"]));
    const idempotent = runToEnd(createSimulation({ ...presets["duplicate-delivery"], idempotent: true }));
    expect(metrics(idempotent).duplicateEffects).toBe(0);
    expect(metrics(idempotent).duplicatesSkipped).toBe(metrics(plain).duplicateEffects);
    expect(idempotent.messages.every((message) => message.effects === 1)).toBe(true);
  });

  it("a consumer slower than the visibility timeout causes a second receive", () => {
    const end = runToEnd(createSimulation(presets["slow-consumer"]));
    expect(kinds(end, "stale-delete").length).toBeGreaterThan(0);
    expect(metrics(end).duplicateEffects).toBeGreaterThan(0);
    expect(end.messages.some((message) => message.receiveCount > 1)).toBe(true);

    const fixed = runToEnd(createSimulation({ ...presets["slow-consumer"], visibilityTimeoutMs: 15000 }));
    expect(kinds(fixed, "stale-delete")).toHaveLength(0);
    expect(metrics(fixed).duplicateEffects).toBe(0);
  });
});

describe("determinism and controls", () => {
  it("the same seed gives the same run, another seed another one", () => {
    const cfg = config({ messageCount: 12, consumers: 3, failureRate: 0.3, duplicateRate: 0.3 });
    expect(runToEnd(createSimulation(cfg))).toEqual(runToEnd(createSimulation(cfg)));
    expect(runToEnd(createSimulation({ ...cfg, seed: 2 })).log).not.toEqual(runToEnd(createSimulation(cfg)).log);
  });

  it("pausing does not change the outcome: small steps and one big step agree", () => {
    const cfg = config({ messageCount: 10, consumers: 3, failureRate: 0.3, duplicateRate: 0.2 });
    let chunked = createSimulation(cfg);
    while (chunked.finishedAt === null) chunked = advanceBy(chunked, 16);
    const once = runToEnd(createSimulation(cfg));
    expect(chunked.log).toEqual(once.log);
    expect(metrics(chunked).processed).toBe(metrics(once).processed);
  });

  it("step moves to the next event without skipping any", () => {
    let state = createSimulation(config({ messageCount: 2 }));
    const seen: number[] = [];
    for (let index = 0; index < 50 && state.finishedAt === null; index++) {
      const next = step(state);
      expect(next.log.length).toBeGreaterThan(state.log.length);
      seen.push(next.now);
      state = next;
    }
    expect(state.finishedAt).not.toBeNull();
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it("never mutates the state it receives", () => {
    const start = createSimulation(config());
    const copy = structuredClone(start);
    advanceBy(start, 5000);
    step(start);
    expect(start).toEqual(copy);
  });

  it("a finished run stays finished", () => {
    const end = runToEnd(createSimulation(config()));
    expect(advanceBy(end, 10_000).now).toBe(end.now);
    expect(step(end)).toBe(end);
  });
});

describe("presets", () => {
  it.each(presetIds)("%s finishes", (id) => {
    const end = runToEnd(createSimulation(presets[id]));
    expect(end.finishedAt).not.toBeNull();
    expect(metrics(end).processed + metrics(end).dlq).toBe(presets[id].messageCount);
  });

  it("each one shows what it is about", () => {
    const run = (id: (typeof presetIds)[number]) => metrics(runToEnd(createSimulation(presets[id])));
    expect(run("happy-path")).toMatchObject({ failedAttempts: 0, dlq: 0, duplicateEffects: 0 });
    expect(run("consumer-failure").failedAttempts).toBeGreaterThan(0);
    expect(run("poison-message").dlq).toBe(1);
    expect(run("high-concurrency").throughput).toBeGreaterThan(run("happy-path").throughput);
    expect(run("duplicate-delivery").duplicateEffects).toBeGreaterThan(0);
    expect(run("slow-consumer").duplicateEffects).toBeGreaterThan(0);
  });
});
