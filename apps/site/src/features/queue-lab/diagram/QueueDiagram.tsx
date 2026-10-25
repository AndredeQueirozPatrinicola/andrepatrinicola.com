import { useId } from "react";

import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { TOKEN, computeLayout, placeTokens, type Box, type Layout, type Orientation } from "./layout";
import type { DiagramModel, NodeId } from "./model";

export type DiagramLabels = {
  title: string;
  /** One sentence with the current counts, read by screen readers. */
  summary: string;
  producer: string;
  queue: string;
  hidden: string;
  consumer: (index: number) => string;
  processed: string;
  dlq: string;
  send: string;
  receive: string;
  remove: string;
  retry: string;
  redrive: string;
};

type Arrow = { d: string; label: string; x: number; y: number; dashed?: boolean; anchor?: "start" | "middle" | "end" };

const midY = (box: Box) => box.y + box.height / 2;
const midX = (box: Box) => box.x + box.width / 2;

function arrows(layout: Layout, orientation: Orientation, labels: DiagramLabels): Arrow[] {
  const { producer, queue, hidden, consumers, processed, dlq } = layout.boxes;
  const first = consumers[0]!;
  const last = consumers[consumers.length - 1]!;
  if (orientation === "wide") {
    const consumerMid = (first.y + last.y + last.height) / 2;
    return [
      { d: `M${producer.x + producer.width} ${midY(producer)} H${queue.x}`, label: labels.send, x: (producer.x + producer.width + queue.x) / 2, y: midY(producer) - 8 },
      { d: `M${queue.x + queue.width} ${consumerMid - 40} H${first.x}`, label: labels.receive, x: (queue.x + queue.width + first.x) / 2, y: consumerMid - 48 },
      { d: `M${first.x} ${consumerMid + 60} H${queue.x + queue.width}`, label: labels.retry, x: (queue.x + queue.width + first.x) / 2, y: consumerMid + 52, dashed: true },
      { d: `M${first.x + first.width} ${midY(processed)} H${processed.x}`, label: labels.remove, x: (first.x + first.width + processed.x) / 2, y: midY(processed) - 8 },
      {
        d: `M${midX(hidden)} ${queue.y + queue.height} V${layout.height - 14} H${midX(dlq)} V${dlq.y + dlq.height}`,
        label: labels.redrive,
        x: midX(hidden) + 8,
        y: layout.height - 20,
        dashed: true,
        anchor: "start",
      },
    ];
  }
  const consumerTop = first.y;
  return [
    { d: `M${midX(producer)} ${producer.y + producer.height} V${queue.y}`, label: labels.send, x: midX(producer) + 8, y: (producer.y + producer.height + queue.y) / 2 + 4, anchor: "start" },
    { d: `M${queue.x + 60} ${queue.y + queue.height} V${consumerTop}`, label: labels.receive, x: queue.x + 68, y: (queue.y + queue.height + consumerTop) / 2 + 4, anchor: "start" },
    { d: `M${queue.x + queue.width - 40} ${consumerTop} V${queue.y + queue.height}`, label: labels.retry, x: queue.x + queue.width - 48, y: (queue.y + queue.height + consumerTop) / 2 + 4, dashed: true, anchor: "end" },
    { d: `M${midX(processed)} ${last.y + last.height} V${processed.y}`, label: labels.remove, x: midX(processed) + 8, y: (last.y + last.height + processed.y) / 2 + 4, anchor: "start" },
    {
      d: `M${queue.x + 4} ${hidden.y + hidden.height / 2} H${2} V${dlq.y - 12} H${dlq.x + dlq.width - 40} V${dlq.y}`,
      label: labels.redrive,
      x: dlq.x + dlq.width - 48,
      y: dlq.y - 18,
      dashed: true,
      anchor: "end",
    },
  ];
}

function NodeBox({ box, title, node }: { box: Box; title: string; node: NodeId }) {
  return (
    <g className="ql-node" data-node={node}>
      <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={2} />
      <text x={box.x + 10} y={box.y + (node === "hidden" ? 13 : node === "consumer" ? 18 : 17)} className="ql-node-title">
        {title}
      </text>
    </g>
  );
}

/**
 * The queue drawn as boxes and message tokens. Tokens are keyed by message,
 * so a message that changes place slides there (CSS transition, off with
 * prefers-reduced-motion).
 */
export function QueueDiagram({ model, labels }: { model: DiagramModel; labels: DiagramLabels }) {
  const narrow = useMediaQuery("(max-width: 40rem)");
  const orientation: Orientation = narrow ? "narrow" : "wide";
  const layout = computeLayout(orientation, Math.max(1, model.consumers));
  const { tokens, overflow } = placeTokens(layout, model);
  const titleId = useId();
  const descId = useId();
  const markerId = `${useId().replace(/:/g, "")}-arrow`;
  const { boxes } = layout;

  return (
    <svg
      className="ql-diagram"
      data-orientation={orientation}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>{labels.title}</title>
      <desc id={descId}>{labels.summary}</desc>
      <defs>
        <marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" className="ql-arrow-head" />
        </marker>
      </defs>

      {arrows(layout, orientation, labels).map((arrow) => (
        <g key={arrow.label} className="ql-arrow" data-dashed={arrow.dashed ?? false}>
          <path d={arrow.d} markerEnd={`url(#${markerId})`} />
          <text x={arrow.x} y={arrow.y} textAnchor={arrow.anchor ?? "middle"}>
            {arrow.label}
          </text>
        </g>
      ))}

      <NodeBox box={boxes.producer} title={labels.producer} node="producer" />
      <NodeBox box={boxes.queue} title={labels.queue} node="queue" />
      <NodeBox box={boxes.hidden} title={labels.hidden} node="hidden" />
      {boxes.consumers.map((box, index) => (
        <NodeBox key={index} box={box} title={labels.consumer(index)} node="consumer" />
      ))}
      <NodeBox box={boxes.processed} title={labels.processed} node="processed" />
      <NodeBox box={boxes.dlq} title={labels.dlq} node="dlq" />

      <g aria-hidden="true">
        {tokens.map((token) => (
          <g
            key={token.key}
            className="ql-token"
            data-tone={token.tone}
            data-node={token.node}
            data-overflowed={token.overflowed}
            style={{ transform: `translate(${token.x}px, ${token.y}px)` }}
          >
            <rect width={TOKEN} height={TOKEN} rx={1} />
            <text x={TOKEN / 2} y={TOKEN / 2 + 3.5} textAnchor="middle">
              {token.label}
            </text>
            {token.attempt > 1 && (
              <text className="ql-token-attempt" x={TOKEN + 1} y={-1} textAnchor="end">
                {token.attempt}
              </text>
            )}
          </g>
        ))}
        {overflow.map((item) => (
          <g key={item.node} className="ql-overflow" transform={`translate(${item.x} ${item.y})`}>
            <rect width={TOKEN} height={TOKEN} rx={1} />
            <text x={TOKEN / 2} y={TOKEN / 2 + 3.5} textAnchor="middle">
              +{item.count}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
