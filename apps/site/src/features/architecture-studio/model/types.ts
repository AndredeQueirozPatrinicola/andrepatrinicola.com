/**
 * The Architecture Studio file format: what is saved in the browser and
 * exported as JSON. Independent of React Flow (see ./convert.ts); a change
 * that old files cannot satisfy needs a new `schemaVersion`.
 */

export const SCHEMA_VERSION = 1;

export const connectionModes = ["synchronous", "asynchronous", "data-flow"] as const;
export type ConnectionMode = (typeof connectionModes)[number];

/** Which ends of a connection carry an arrowhead. */
export const arrowStyles = ["forward", "both", "none"] as const;
export type ArrowStyle = (typeof arrowStyles)[number];

/** Side of a node a connection is attached to. */
export const handleSides = ["top", "right", "bottom", "left"] as const;
export type HandleSide = (typeof handleSides)[number];

/** Accent color of a node, from the site palette (never a free CSS value). */
export const tones = ["default", "blue", "green", "orange", "red", "purple"] as const;
export type Tone = (typeof tones)[number];

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Viewport = { x: number; y: number; zoom: number };

export type ArchitectureNode = {
  id: string;
  /** Catalog entry (see catalog/services.ts). Never inferred from the label. */
  serviceId: string;
  label: string;
  description?: string;
  /** Relative to the parent group when `parentId` is set (React Flow semantics). */
  position: Point;
  /** Container this node is drawn inside of. Must be a group node. */
  parentId?: string;
  /** Groups and notes only: services size themselves to their content. */
  size?: Size;
  tone?: Tone;
};

export type ArchitectureEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: HandleSide;
  targetHandle?: HandleSide;
  label?: string;
  mode: ConnectionMode;
  arrow?: ArrowStyle;
};

export type ArchitectureDiagram = {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  viewport: Viewport;
};

/**
 * Hard limits for anything loaded from a file or from browser storage, and
 * for what the editor lets a visitor create. They keep a hostile or broken
 * file from freezing the page.
 */
export const limits = {
  fileBytes: 1_000_000,
  nodes: 300,
  edges: 600,
  title: 120,
  label: 80,
  edgeLabel: 60,
  description: 2_000,
  diagramDescription: 1_000,
  coordinate: 1_000_000,
  minSize: 40,
  maxSize: 20_000,
  minZoom: 0.05,
  maxZoom: 4,
  nesting: 8,
} as const;
