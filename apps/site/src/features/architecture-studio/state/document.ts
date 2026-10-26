/**
 * Editing operations on the editor document. Pure functions: they return a
 * new document (or the same one when nothing changes) and never touch React,
 * so the editor's rules are tested without rendering a canvas.
 */
import { getService } from "../catalog/services";
import { GROUP_Z_INDEX, type EditorDocument, type StudioEdge, type StudioEdgeData, type StudioNode, type StudioNodeData } from "../model/editor";
import { createId } from "../model/ids";
import { limits, type ConnectionMode, type HandleSide, type Point, type Size } from "../model/types";

/** Size assumed for a service node React Flow has not measured yet. */
export const SERVICE_SIZE: Size = { width: 184, height: 64 };

export type LimitError = { error: "limit" };

// ------------------------------------------------------------------ geometry

export function nodeSize(node: StudioNode): Size {
  return {
    width: node.measured?.width ?? node.width ?? SERVICE_SIZE.width,
    height: node.measured?.height ?? node.height ?? SERVICE_SIZE.height,
  };
}

function indexNodes(nodes: StudioNode[]): Map<string, StudioNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function absolutePosition(node: StudioNode, byId: Map<string, StudioNode>): Point {
  let x = node.position.x;
  let y = node.position.y;
  let parent = node.parentId !== undefined ? byId.get(node.parentId) : undefined;
  let guard = 0;
  while (parent && guard < limits.nesting + 1) {
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId !== undefined ? byId.get(parent.parentId) : undefined;
    guard += 1;
  }
  return { x, y };
}

function depthOf(node: StudioNode, byId: Map<string, StudioNode>): number {
  let depth = 0;
  let current = node;
  while (current.parentId !== undefined && byId.has(current.parentId) && depth <= limits.nesting) {
    current = byId.get(current.parentId)!;
    depth += 1;
  }
  return depth;
}

/** The node and everything nested in it. */
export function withDescendants(nodes: StudioNode[], ids: Iterable<string>): Set<string> {
  const result = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of nodes) {
      if (node.parentId !== undefined && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id);
        grew = true;
      }
    }
  }
  return result;
}

/** Innermost group whose frame contains `point`, ignoring `exclude` (a node can't go inside itself). */
export function groupAt(nodes: StudioNode[], point: Point, exclude: ReadonlySet<string> = new Set()): StudioNode | undefined {
  const byId = indexNodes(nodes);
  let best: { node: StudioNode; depth: number; area: number } | undefined;
  for (const node of nodes) {
    if (node.type !== "group" || exclude.has(node.id)) continue;
    const origin = absolutePosition(node, byId);
    const { width, height } = nodeSize(node);
    const inside = point.x >= origin.x && point.x <= origin.x + width && point.y >= origin.y && point.y <= origin.y + height;
    if (!inside) continue;
    const depth = depthOf(node, byId);
    const area = width * height;
    if (!best || depth > best.depth || (depth === best.depth && area < best.area)) {
      best = { node, depth, area };
    }
  }
  return best?.node;
}

/**
 * The free spot closest to `desired` (top-left corner) for a box of `size`,
 * searched on rings around it, so nodes added from the catalog do not land
 * on top of each other. Groups are not obstacles (things go inside them).
 */
export function findFreePosition(nodes: StudioNode[], desired: Point, size: Size): Point {
  const byId = indexNodes(nodes);
  const boxes = nodes
    .filter((node) => node.type !== "group")
    .map((node) => ({ ...absolutePosition(node, byId), ...nodeSize(node) }));
  const GAP = 16;
  const free = (point: Point) =>
    boxes.every(
      (box) =>
        point.x + size.width + GAP <= box.x ||
        box.x + box.width + GAP <= point.x ||
        point.y + size.height + GAP <= box.y ||
        box.y + box.height + GAP <= point.y,
    );
  const stepX = size.width + GAP * 2;
  const stepY = size.height + GAP * 2;
  for (let ring = 0; ring <= 8; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const point = { x: desired.x + dx * stepX, y: desired.y + dy * stepY };
        if (free(point)) return point;
      }
    }
  }
  return desired;
}

/** Parents before children, the order React Flow requires; otherwise keeps the current order. */
export function sortParentsFirst(nodes: StudioNode[]): StudioNode[] {
  const byId = indexNodes(nodes);
  return nodes
    .map((node, index) => ({ node, index, depth: depthOf(node, byId) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map(({ node }) => node);
}

function takenIds(document: EditorDocument): Set<string> {
  return new Set([...document.nodes.map((node) => node.id), ...document.edges.map((edge) => edge.id)]);
}

const deselectNodes = (nodes: StudioNode[]) => nodes.map((node) => (node.selected ? { ...node, selected: false } : node));
const deselectEdges = (edges: StudioEdge[]) => edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge));

// ---------------------------------------------------------------- selection

export function selectedNodeIds(document: EditorDocument): string[] {
  return document.nodes.filter((node) => node.selected).map((node) => node.id);
}

export function selectedEdgeIds(document: EditorDocument): string[] {
  return document.edges.filter((edge) => edge.selected).map((edge) => edge.id);
}

export function select(document: EditorDocument, nodeIds: Iterable<string>, edgeIds: Iterable<string> = []): EditorDocument {
  const nodes = new Set(nodeIds);
  const edges = new Set(edgeIds);
  return {
    nodes: document.nodes.map((node) => (Boolean(node.selected) === nodes.has(node.id) ? node : { ...node, selected: nodes.has(node.id) })),
    edges: document.edges.map((edge) => (Boolean(edge.selected) === edges.has(edge.id) ? edge : { ...edge, selected: edges.has(edge.id) })),
  };
}

// --------------------------------------------------------------------- nodes

export function createNode(
  serviceId: string,
  label: string,
  id: string,
  position: Point,
  extra: Partial<StudioNodeData> = {},
): StudioNode {
  const service = getService(serviceId);
  const size = service.kind === "service" ? undefined : service.defaultSize;
  return {
    id,
    type: service.kind,
    position,
    ...(size ? { width: size.width, height: size.height } : {}),
    ...(service.kind === "group" ? { zIndex: GROUP_Z_INDEX } : {}),
    data: { serviceId, label, description: "", tone: "default", ...extra },
  };
}

type AddNodeInput = {
  serviceId: string;
  label: string;
  /** Absolute position of the node's top-left corner. */
  position: Point;
};

/** Adds a node (inside the group under it, if any) and selects it alone. */
export function addNode(document: EditorDocument, input: AddNodeInput): { document: EditorDocument; id: string } | LimitError {
  if (document.nodes.length >= limits.nodes) return { error: "limit" };
  const id = createId("n", takenIds(document));
  const node = { ...createNode(input.serviceId, input.label, id, input.position), selected: true };
  const parent = groupAt(document.nodes, input.position);
  const placed = parent ? toParent(node, parent, indexNodes(document.nodes)) : node;
  return {
    id,
    document: { nodes: [...deselectNodes(document.nodes), placed], edges: deselectEdges(document.edges) },
  };
}

function toParent(node: StudioNode, parent: StudioNode | undefined, byId: Map<string, StudioNode>): StudioNode {
  const absolute = absolutePosition(node, byId);
  if (!parent) {
    const { parentId: _removed, ...rest } = node;
    return { ...rest, position: absolute };
  }
  const origin = absolutePosition(parent, byId);
  return { ...node, parentId: parent.id, position: { x: absolute.x - origin.x, y: absolute.y - origin.y } };
}

export function updateNodeData(document: EditorDocument, id: string, patch: Partial<StudioNodeData>): EditorDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)),
  };
}

export function setNodePosition(document: EditorDocument, id: string, position: Point): EditorDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => (node.id === id ? { ...node, position } : node)),
  };
}

/** Moves a node into a group (keeping where it is on screen) or out of any group with `null`. */
export function setParent(document: EditorDocument, id: string, parentId: string | null): EditorDocument {
  const byId = indexNodes(document.nodes);
  const node = byId.get(id);
  const parent = parentId === null ? undefined : byId.get(parentId);
  if (!node || (parentId !== null && (!parent || parent.type !== "group"))) return document;
  if ((node.parentId ?? null) === parentId) return document;
  // No cycles: a group can't go inside itself or its descendants.
  if (parentId !== null && withDescendants(document.nodes, [id]).has(parentId)) return document;
  if (parent && depthOf(parent, byId) + 1 > limits.nesting) return document;

  const moved = toParent(node, parent, byId);
  return { ...document, nodes: sortParentsFirst(document.nodes.map((current) => (current.id === id ? moved : current))) };
}

/**
 * After a drag: every moved node whose center is now over a different group
 * goes into it (or out of any group).
 */
export function reparentDropped(document: EditorDocument, ids: string[]): EditorDocument {
  const moving = new Set(ids);
  const byId = indexNodes(document.nodes);
  // Only the outermost dragged nodes: their children travel with them.
  const roots = ids.filter((id) => {
    let parentId = byId.get(id)?.parentId;
    while (parentId !== undefined) {
      if (moving.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return byId.has(id);
  });

  let next = document;
  for (const id of roots) {
    const nodes = next.nodes;
    const index = indexNodes(nodes);
    const node = index.get(id)!;
    const origin = absolutePosition(node, index);
    const { width, height } = nodeSize(node);
    const center = { x: origin.x + width / 2, y: origin.y + height / 2 };
    const target = groupAt(nodes, center, withDescendants(nodes, [id]));
    next = setParent(next, id, target?.id ?? null);
  }
  return next;
}

// ------------------------------------------------------------------- removal

export function removeElements(document: EditorDocument, nodeIds: Iterable<string>, edgeIds: Iterable<string> = []): EditorDocument {
  const nodes = withDescendants(document.nodes, nodeIds);
  const edges = new Set(edgeIds);
  if (nodes.size === 0 && edges.size === 0) return document;
  return {
    nodes: document.nodes.filter((node) => !nodes.has(node.id)),
    edges: document.edges.filter((edge) => !edges.has(edge.id) && !nodes.has(edge.source) && !nodes.has(edge.target)),
  };
}

export function removeSelection(document: EditorDocument): EditorDocument {
  return removeElements(document, selectedNodeIds(document), selectedEdgeIds(document));
}

// ---------------------------------------------------------- copy, paste, duplicate

export type Fragment = { nodes: StudioNode[]; edges: StudioEdge[] };

/** The nodes (with their contents) and the connections among them. */
export function copyFragment(document: EditorDocument, nodeIds: Iterable<string>): Fragment | null {
  const ids = withDescendants(document.nodes, nodeIds);
  if (ids.size === 0) return null;
  const byId = indexNodes(document.nodes);
  const nodes = document.nodes
    .filter((node) => ids.has(node.id))
    .map((node) => {
      // Outermost copied nodes remember their absolute position too.
      const outer = node.parentId === undefined || !ids.has(node.parentId);
      return outer ? { ...node, data: { ...node.data }, position: { ...node.position }, absolute: absolutePosition(node, byId) } : node;
    });
  return {
    nodes: nodes.map(({ measured: _measured, selected: _selected, dragging: _dragging, ...node }) => node as StudioNode),
    edges: document.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map(({ selected: _selected, ...edge }) => edge),
  };
}

/**
 * Inserts a copy with new ids, `offset` away from the original, and selects
 * it. Copies stay in the original group when it still exists.
 */
export function pasteFragment(document: EditorDocument, fragment: Fragment, offset = 32): { document: EditorDocument; ids: string[] } | LimitError {
  if (document.nodes.length + fragment.nodes.length > limits.nodes || document.edges.length + fragment.edges.length > limits.edges) {
    return { error: "limit" };
  }
  const taken = takenIds(document);
  const fresh = new Map<string, string>();
  for (const node of fragment.nodes) {
    const id = createId("n", taken);
    taken.add(id);
    fresh.set(node.id, id);
  }
  const existing = new Set(document.nodes.map((node) => node.id));

  const nodes = fragment.nodes.map((node): StudioNode => {
    const { absolute, ...rest } = node as StudioNode & { absolute?: Point };
    const id = fresh.get(node.id)!;
    const base = { ...rest, id, selected: true, data: { ...node.data } };
    if (node.parentId !== undefined && fresh.has(node.parentId)) {
      return { ...base, parentId: fresh.get(node.parentId) };
    }
    if (node.parentId !== undefined && existing.has(node.parentId)) {
      return { ...base, position: { x: node.position.x + offset, y: node.position.y + offset } };
    }
    const { parentId: _dropped, ...topLevel } = base;
    const origin = absolute ?? node.position;
    return { ...topLevel, position: { x: origin.x + offset, y: origin.y + offset } };
  });

  const edges = fragment.edges.map((edge): StudioEdge => {
    const id = createId("e", taken);
    taken.add(id);
    return { ...edge, id, source: fresh.get(edge.source)!, target: fresh.get(edge.target)!, data: edge.data && { ...edge.data } };
  });

  return {
    ids: nodes.map((node) => node.id),
    document: {
      nodes: sortParentsFirst([...deselectNodes(document.nodes), ...nodes]),
      edges: [...deselectEdges(document.edges), ...edges],
    },
  };
}

export function duplicateNodes(document: EditorDocument, nodeIds: Iterable<string>) {
  const fragment = copyFragment(document, nodeIds);
  return fragment ? pasteFragment(document, fragment) : null;
}

// ---------------------------------------------------------------- connections

export type ConnectionInput = {
  source: string;
  target: string;
  sourceHandle?: HandleSide | null;
  targetHandle?: HandleSide | null;
  mode?: ConnectionMode;
  label?: string;
};

/**
 * Connects two nodes, whatever their kind (the editor does not decide which
 * services may talk to each other). Refuses loops and exact duplicates.
 */
export function connect(document: EditorDocument, input: ConnectionInput): { document: EditorDocument; id: string } | LimitError | null {
  const ids = new Set(document.nodes.map((node) => node.id));
  if (input.source === input.target || !ids.has(input.source) || !ids.has(input.target)) return null;
  const sourceHandle = input.sourceHandle ?? null;
  const targetHandle = input.targetHandle ?? null;
  const duplicate = document.edges.some(
    (edge) =>
      edge.source === input.source &&
      edge.target === input.target &&
      (edge.sourceHandle ?? null) === sourceHandle &&
      (edge.targetHandle ?? null) === targetHandle,
  );
  if (duplicate) return null;
  if (document.edges.length >= limits.edges) return { error: "limit" };

  const id = createId("e", takenIds(document));
  const edge: StudioEdge = {
    id,
    type: "architecture",
    source: input.source,
    target: input.target,
    sourceHandle,
    targetHandle,
    selected: true,
    data: { mode: input.mode ?? "synchronous", label: input.label ?? "", arrow: "forward" },
  };
  return { id, document: { nodes: deselectNodes(document.nodes), edges: [...deselectEdges(document.edges), edge] } };
}

export function updateEdgeData(document: EditorDocument, id: string, patch: Partial<StudioEdgeData>): EditorDocument {
  return {
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === id ? { ...edge, data: { mode: "synchronous", label: "", arrow: "forward", ...edge.data, ...patch } } : edge,
    ),
  };
}

/** Swaps the ends of a connection (and the sides they are attached to). */
export function reverseEdge(document: EditorDocument, id: string): EditorDocument {
  return {
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === id
        ? { ...edge, source: edge.target, target: edge.source, sourceHandle: edge.targetHandle ?? null, targetHandle: edge.sourceHandle ?? null }
        : edge,
    ),
  };
}
