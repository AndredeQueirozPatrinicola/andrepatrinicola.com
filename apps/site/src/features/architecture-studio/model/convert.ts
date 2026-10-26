/**
 * Explicit conversion between the file format (ArchitectureDiagram) and the
 * editor state (React Flow nodes and edges). Only fields listed here cross
 * the boundary: selection, measurements and other React Flow internals are
 * never saved.
 */
import { getService } from "../catalog/services";
import { GROUP_Z_INDEX, type EditorDocument, type StudioEdge, type StudioNode } from "./editor";
import { handleSides, SCHEMA_VERSION, type ArchitectureDiagram, type ArchitectureNode, type HandleSide, type Viewport } from "./types";

export type DiagramMeta = Pick<ArchitectureDiagram, "id" | "title" | "description" | "createdAt" | "updatedAt">;

/** React Flow needs a parent before its children. */
function parentsFirst(nodes: ArchitectureNode[]): ArchitectureNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = (node: ArchitectureNode): number => {
    let level = 0;
    let current = node;
    while (current.parentId !== undefined && byId.has(current.parentId) && level < nodes.length) {
      level += 1;
      current = byId.get(current.parentId)!;
    }
    return level;
  };
  return nodes
    .map((node, index) => ({ node, index, depth: depth(node) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map(({ node }) => node);
}

const isHandle = (value: string | null | undefined): value is HandleSide =>
  value !== null && value !== undefined && (handleSides as readonly string[]).includes(value);

export function toEditor(diagram: ArchitectureDiagram): EditorDocument {
  const nodes = parentsFirst(diagram.nodes).map((node): StudioNode => {
    const service = getService(node.serviceId);
    const size = node.size ?? (service.kind === "service" ? undefined : service.defaultSize);
    return {
      id: node.id,
      type: service.kind,
      position: { ...node.position },
      ...(node.parentId !== undefined ? { parentId: node.parentId } : {}),
      ...(size ? { width: size.width, height: size.height } : {}),
      ...(service.kind === "group" ? { zIndex: GROUP_Z_INDEX } : {}),
      data: {
        serviceId: node.serviceId,
        label: node.label,
        description: node.description ?? "",
        tone: node.tone ?? "default",
      },
    };
  });

  const edges = diagram.edges.map(
    (edge): StudioEdge => ({
      id: edge.id,
      type: "architecture",
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      data: { mode: edge.mode, label: edge.label ?? "", arrow: edge.arrow ?? "forward" },
    }),
  );

  return { nodes, edges };
}

const round = (value: number) => Math.round(value * 100) / 100;

export function toDiagram(document: EditorDocument, meta: DiagramMeta, viewport: Viewport): ArchitectureDiagram {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: meta.id,
    title: meta.title,
    ...(meta.description ? { description: meta.description } : {}),
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    nodes: document.nodes.map((node): ArchitectureNode => {
      const sized = node.type !== "service" && node.width !== undefined && node.height !== undefined;
      return {
        id: node.id,
        serviceId: node.data.serviceId,
        label: node.data.label,
        ...(node.data.description ? { description: node.data.description } : {}),
        position: { x: round(node.position.x), y: round(node.position.y) },
        ...(node.parentId !== undefined ? { parentId: node.parentId } : {}),
        ...(sized ? { size: { width: round(node.width!), height: round(node.height!) } } : {}),
        ...(node.data.tone !== "default" ? { tone: node.data.tone } : {}),
      };
    }),
    edges: document.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(isHandle(edge.sourceHandle) ? { sourceHandle: edge.sourceHandle } : {}),
      ...(isHandle(edge.targetHandle) ? { targetHandle: edge.targetHandle } : {}),
      ...(edge.data?.label ? { label: edge.data.label } : {}),
      mode: edge.data?.mode ?? "synchronous",
      ...(edge.data && edge.data.arrow !== "forward" ? { arrow: edge.data.arrow } : {}),
    })),
    viewport: { x: round(viewport.x), y: round(viewport.y), zoom: Math.round(viewport.zoom * 1000) / 1000 },
  };
}
