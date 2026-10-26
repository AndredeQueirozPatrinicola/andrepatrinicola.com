/**
 * The editor's working state: React Flow nodes and edges carrying our typed
 * data. Converted to and from the file format in ./convert.ts.
 */
import type { Edge, Node } from "@xyflow/react";

import type { NodeKind } from "../catalog/services";
import type { ArrowStyle, ConnectionMode, Tone } from "./types";

export type StudioNodeData = {
  serviceId: string;
  label: string;
  description: string;
  tone: Tone;
};

export type StudioEdgeData = {
  mode: ConnectionMode;
  label: string;
  arrow: ArrowStyle;
};

export type StudioNode = Node<StudioNodeData, NodeKind>;
export type StudioEdge = Edge<StudioEdgeData, "architecture">;

export type EditorDocument = {
  nodes: StudioNode[];
  edges: StudioEdge[];
};

/** Groups stay behind everything else; nested groups above their parents (React Flow adds 1 per level). */
export const GROUP_Z_INDEX = -1000;

export const emptyDocument: EditorDocument = { nodes: [], edges: [] };
