/** Responses of the queue lab API (andrepatrinicola-api, src/labs/queue/producer.ts). */

export const runScenarios = ["happy-path", "transient-failure", "poison-message", "duplicate-delivery", "mixed"] as const;
export type RunScenario = (typeof runScenarios)[number];

export type QueueLabOverview = {
  enabled: boolean;
  /** State of the consumer's event source mapping: "Enabled", "Disabled", "Unknown"... */
  consumerState: string;
  limits: { maxMessages: number; runsPerDay: number; maxReceives: number; scenarios: RunScenario[] };
  usage: { runsToday: number };
  activeRunId: string | null;
  /** Approximate (SQS attributes lag behind); null when it could not be read. */
  deadLetterQueue: { visible: number; inFlight: number } | null;
  recentRuns: { runId: string; scenario: string; createdAt: string }[];
};

export type LiveMessageStatus = "queued" | "processing" | "retrying" | "exhausted" | "dlq" | "processed" | "send-failed";

export type LiveMessage = {
  messageId: string;
  scenario: "success" | "transient-failure" | "poison";
  status: LiveMessageStatus;
  receives: number;
  deliveries: number;
  effects: number;
  updatedAt: string;
};

export type LiveEvent = {
  at: string;
  type:
    | "run-started"
    | "sent"
    | "send-failed"
    | "received"
    | "succeeded"
    | "failed"
    | "exhausted"
    | "duplicate-skipped"
    | "busy"
    | "run-completed"
    | "run-expired";
  messageId?: string;
  receiveCount?: number;
  detail?: string;
};

export type QueueRun = {
  runId: string;
  status: "running" | "completed" | "expired" | "failed";
  scenario: RunScenario;
  requestedMessages: number;
  acceptedMessages: number;
  duplicatesSent: number;
  maxReceives: number;
  createdAt: string;
  deadline: string;
  finishedAt: string | null;
  counts: {
    queued: number;
    processing: number;
    retrying: number;
    awaitingDlq: number;
    dlq: number;
    processed: number;
    sendFailed: number;
    failedAttempts: number;
    deliveries: number;
    duplicatesSkipped: number;
  };
  messages: LiveMessage[];
  events: LiveEvent[];
};

export type StartedRun = { runId: string; status: "queued"; acceptedMessages: number; duplicatesSent: number };
