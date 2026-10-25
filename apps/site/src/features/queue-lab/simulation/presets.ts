import type { SimulationConfig } from "./engine";

export const presetIds = [
  "happy-path",
  "consumer-failure",
  "poison-message",
  "high-concurrency",
  "duplicate-delivery",
  "slow-consumer",
] as const;

export type PresetId = (typeof presetIds)[number];

const base: SimulationConfig = {
  messageCount: 8,
  consumers: 2,
  processingMs: 1200,
  failureRate: 0,
  failureKind: "error",
  poisonMessages: 0,
  maxReceives: 3,
  visibilityTimeoutMs: 5000,
  duplicateRate: 0,
  idempotent: true,
  seed: 7,
};

/**
 * Each preset isolates one concept; its explanation lives in the i18n
 * dictionaries (queueLab.presets). Seeds are fixed so a preset always tells
 * the same story (tests in engine.test.ts pin what each one shows).
 */
export const presets: Record<PresetId, SimulationConfig> = {
  "happy-path": { ...base },
  "consumer-failure": { ...base, messageCount: 10, processingMs: 1000, failureRate: 0.35, maxReceives: 4, visibilityTimeoutMs: 4000, seed: 11 },
  "poison-message": { ...base, messageCount: 6, processingMs: 900, poisonMessages: 1, visibilityTimeoutMs: 3000, seed: 3 },
  "high-concurrency": { ...base, messageCount: 30, consumers: 6, processingMs: 1500, failureRate: 0.05, visibilityTimeoutMs: 6000, seed: 5 },
  "duplicate-delivery": { ...base, messageCount: 8, consumers: 3, processingMs: 1000, duplicateRate: 0.45, idempotent: false, seed: 4 },
  "slow-consumer": { ...base, messageCount: 5, consumers: 2, processingMs: 4200, maxReceives: 4, visibilityTimeoutMs: 3000, idempotent: false, seed: 4 },
};
