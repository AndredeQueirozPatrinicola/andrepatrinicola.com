import type { DiagramModel, DiagramToken, NodeId } from "../diagram/model";
import type { LiveMessage, QueueRun } from "./types";

/** Consumers drawn for a real run: the event source mapping's maximum concurrency. */
export const LIVE_CONSUMERS = 2;

const nodeOf: Record<LiveMessage["status"], NodeId> = {
  queued: "queue",
  processing: "consumer",
  retrying: "hidden",
  exhausted: "hidden",
  dlq: "dlq",
  processed: "processed",
  "send-failed": "producer",
};

/**
 * A real run on the same diagram as the simulation. It only shows what the
 * consumer recorded in DynamoDB: which Lambda instance holds a message is not
 * known, so messages in processing fill the consumer boxes in order.
 */
export function fromRun(run: QueueRun): DiagramModel {
  let busy = 0;
  const tokens: DiagramToken[] = run.messages.map((message) => {
    const node = nodeOf[message.status];
    const tone = message.scenario === "poison" && message.receives > 0 ? "poison" : message.status === "send-failed" ? "stale" : message.receives > 1 ? "retry" : "default";
    return {
      key: message.messageId,
      label: message.messageId.replace(/^m/, ""),
      node,
      ...(node === "consumer" ? { consumer: busy++ % LIVE_CONSUMERS } : {}),
      tone,
      attempt: message.receives,
    };
  });
  return { consumers: LIVE_CONSUMERS, tokens };
}
