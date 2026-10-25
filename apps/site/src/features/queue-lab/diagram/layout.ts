/**
 * Coordinates of the diagram (SVG user units), in two arrangements: wide
 * (left to right) and narrow (top to bottom, for phones). Pure, so the
 * placement of every token can be tested without a browser.
 */
import type { DiagramModel, DiagramToken, NodeId } from "./model";

export type Box = { x: number; y: number; width: number; height: number };

export const TOKEN = 18;
const GAP = 4;
const CELL = TOKEN + GAP;
const PAD = 12;
/** Room for the node title inside each box. */
const HEADER = 26;

export type Orientation = "wide" | "narrow";

export type Layout = {
  width: number;
  height: number;
  boxes: { producer: Box; queue: Box; hidden: Box; processed: Box; dlq: Box; consumers: Box[] };
};

function consumerBoxes(area: Box, count: number, columns: number): Box[] {
  const rows = Math.ceil(count / columns);
  const gap = 8;
  const width = (area.width - gap * (columns - 1)) / columns;
  const height = Math.min(64, (area.height - gap * (rows - 1)) / rows);
  // Centered in the area when they do not fill it.
  const top = area.y + (area.height - (rows * height + gap * (rows - 1))) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: area.x + (index % columns) * (width + gap),
    y: top + Math.floor(index / columns) * (height + gap),
    width,
    height,
  }));
}

export function computeLayout(orientation: Orientation, consumers: number): Layout {
  if (orientation === "wide") {
    // Gaps between the columns leave room for the arrow labels.
    const queue = { x: 236, y: 40, width: 260, height: 360 };
    return {
      width: 1100,
      height: 440,
      boxes: {
        producer: { x: 16, y: 110, width: 140, height: 220 },
        queue,
        hidden: { x: queue.x + PAD, y: queue.y + 222, width: queue.width - 2 * PAD, height: 126 },
        consumers: consumerBoxes({ x: 616, y: 40, width: 170, height: 360 }, consumers, 1),
        processed: { x: 900, y: 40, width: 184, height: 220 },
        dlq: { x: 900, y: 290, width: 184, height: 110 },
      },
    };
  }
  const queue = { x: 12, y: 168, width: 336, height: 256 };
  const consumerArea = { x: 12, y: 474, width: 336, height: consumers > 3 ? 136 : 64 };
  const bottom = consumerArea.y + consumerArea.height + 48;
  return {
    width: 360,
    height: bottom + 202,
    boxes: {
      producer: { x: 12, y: 12, width: 336, height: 112 },
      queue,
      hidden: { x: queue.x + PAD, y: queue.y + 134, width: queue.width - 2 * PAD, height: 110 },
      consumers: consumerBoxes(consumerArea, consumers, 3),
      processed: { x: 12, y: bottom, width: 164, height: 190 },
      dlq: { x: 184, y: bottom, width: 164, height: 190 },
    },
  };
}

/** The grid of token slots inside a box; the top band of the queue is the visible area. */
function slotArea(layout: Layout, node: Exclude<NodeId, "consumer">): Box {
  const box = node === "hidden" ? layout.boxes.hidden : layout.boxes[node];
  if (node === "hidden") return { x: box.x, y: box.y + 18, width: box.width, height: box.height - 18 };
  if (node === "queue") {
    const hidden = layout.boxes.hidden;
    return { x: box.x + PAD, y: box.y + HEADER, width: box.width - 2 * PAD, height: hidden.y - box.y - HEADER - 8 };
  }
  return { x: box.x + PAD, y: box.y + HEADER, width: box.width - 2 * PAD, height: box.height - HEADER - PAD };
}

export function capacity(area: Box): { columns: number; rows: number } {
  return {
    columns: Math.max(1, Math.floor((area.width + GAP) / CELL)),
    rows: Math.max(1, Math.floor((area.height + GAP) / CELL)),
  };
}

/** `overflowed`: stacked in the last slot of a full box, behind the "+N" marker. */
export type PlacedToken = DiagramToken & { x: number; y: number; overflowed?: true };

export type Placement = {
  tokens: PlacedToken[];
  /** Tokens that did not fit in a box: how many, and where the "+N" marker goes. */
  overflow: { node: NodeId; count: number; x: number; y: number }[];
};

export function placeTokens(layout: Layout, model: DiagramModel): Placement {
  const groups = new Map<string, DiagramToken[]>();
  for (const token of model.tokens) {
    const group = token.node === "consumer" ? `consumer:${token.consumer ?? 0}` : token.node;
    groups.set(group, [...(groups.get(group) ?? []), token]);
  }

  const placed: PlacedToken[] = [];
  const overflow: Placement["overflow"] = [];
  for (const [group, tokens] of groups) {
    if (group.startsWith("consumer:")) {
      const box = layout.boxes.consumers[Number(group.split(":")[1])];
      if (!box) continue;
      // Up to two tokens side by side: the message, and a copy or stale delivery.
      tokens.slice(0, 2).forEach((token, index) => {
        placed.push({ ...token, x: box.x + box.width - PAD - TOKEN - index * CELL, y: box.y + (box.height - TOKEN) / 2 });
      });
      continue;
    }
    const node = group as Exclude<NodeId, "consumer">;
    const area = slotArea(layout, node);
    const { columns, rows } = capacity(area);
    const fit = columns * rows;
    tokens.forEach((token, index) => {
      const slot = Math.min(index, fit - 1);
      const x = area.x + (slot % columns) * CELL;
      const y = area.y + Math.floor(slot / columns) * CELL;
      placed.push(tokens.length > fit && index >= fit - 1 ? { ...token, x, y, overflowed: true } : { ...token, x, y });
    });
    if (tokens.length > fit) {
      overflow.push({ node, count: tokens.length - fit + 1, x: area.x + ((fit - 1) % columns) * CELL, y: area.y + Math.floor((fit - 1) / columns) * CELL });
    }
  }
  return { tokens: placed, overflow };
}
