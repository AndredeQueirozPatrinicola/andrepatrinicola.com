/**
 * What the queue diagram draws, independent of where it comes from: the
 * browser simulation (fromSimulation) or a real AWS run in the admin
 * (features/queue-lab/live). Positions are computed by layout.ts.
 */
import type { SimulationState } from "../simulation/engine";

export type NodeId = "producer" | "queue" | "hidden" | "consumer" | "processed" | "dlq";

export type TokenTone =
  /** First attempt. */
  | "default"
  /** Received before: a retry. */
  | "retry"
  /** Fails on every attempt. */
  | "poison"
  /** An extra copy delivered by the queue (at-least-once). */
  | "copy"
  /** Still being processed after its receipt handle expired. */
  | "stale";

export type DiagramToken = {
  key: string;
  label: string;
  node: NodeId;
  /** Consumer slot, for node "consumer". */
  consumer?: number;
  tone: TokenTone;
  /** Receives so far (shown when above 1). */
  attempt: number;
};

export type DiagramModel = {
  consumers: number;
  tokens: DiagramToken[];
};

const short = (id: string) => id.replace(/^M/, "");

export function fromSimulation(state: SimulationState): DiagramModel {
  const tokens: DiagramToken[] = [];
  const working = new Map<string, number>();
  for (const consumer of state.consumers) {
    const delivery = consumer.delivery;
    if (!delivery || delivery.copy) continue;
    const message = state.messages.find((item) => item.id === delivery.messageId)!;
    if (message.handle === delivery.handle && message.state === "in-flight") working.set(message.id, consumer.id - 1);
  }

  for (const message of state.messages) {
    const tone = message.poison && message.receiveCount > 0 ? "poison" : message.receiveCount > 1 ? "retry" : "default";
    const base = { key: message.id, label: short(message.id), tone, attempt: message.receiveCount } as const;
    switch (message.state) {
      case "unsent":
        tokens.push({ ...base, node: "producer" });
        break;
      case "available":
        tokens.push({ ...base, node: "queue" });
        break;
      case "in-flight": {
        const consumer = working.get(message.id);
        tokens.push(consumer === undefined ? { ...base, node: "hidden" } : { ...base, node: "consumer", consumer });
        break;
      }
      case "invisible":
        tokens.push({ ...base, node: "hidden" });
        break;
      case "processed":
      case "dlq":
        tokens.push({ ...base, node: message.state });
        break;
    }
  }

  // Copies and work on an expired receipt handle: a second token for the same message.
  for (const message of state.messages) {
    message.copies.forEach((at, index) => {
      if (at > state.now) return;
      tokens.push({ key: `${message.id}~copy${index}`, label: short(message.id), node: "queue", tone: "copy", attempt: message.receiveCount });
    });
  }
  for (const consumer of state.consumers) {
    const delivery = consumer.delivery;
    if (!delivery || working.get(delivery.messageId) === consumer.id - 1) continue;
    tokens.push({
      key: `${delivery.messageId}~${delivery.handle}`,
      label: short(delivery.messageId),
      node: "consumer",
      consumer: consumer.id - 1,
      tone: delivery.copy ? "copy" : "stale",
      attempt: delivery.attempt,
    });
  }
  return { consumers: state.consumers.length, tokens };
}
