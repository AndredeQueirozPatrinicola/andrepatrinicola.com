/**
 * Validation of diagrams read from files and from browser storage. Both are
 * untrusted: anything that does not match the schema, exceeds the limits or
 * breaks the graph's integrity is rejected as a whole, with a reason the UI
 * can translate. Unknown fields are dropped; nothing is ever rendered as HTML.
 */
import * as z from "zod/mini";

import { findService } from "../catalog/services";
import {
  arrowStyles,
  connectionModes,
  handleSides,
  limits,
  SCHEMA_VERSION,
  tones,
  type ArchitectureDiagram,
} from "./types";

export type DiagramError =
  | { code: "too-large" }
  | { code: "invalid-json" }
  | { code: "not-a-diagram" }
  | { code: "unsupported-version"; version: number }
  | { code: "too-many-elements" }
  | { code: "invalid-content"; path: string }
  | { code: "duplicate-id"; id: string }
  | { code: "unknown-component"; id: string }
  | { code: "missing-node"; id: string }
  | { code: "invalid-group"; id: string };

/** Placeholder values for an error's message ({id}, {path}, {version}). */
export function errorValues(error: DiagramError): Record<string, string | number> {
  if ("id" in error) return { id: error.id };
  if ("path" in error) return { path: error.path || "-" };
  if ("version" in error) return { version: error.version };
  return {};
}

export type ParseResult = { ok: true; diagram: ArchitectureDiagram } | { ok: false; error: DiagramError };

// Control characters (except tab and newline in long texts) and bidi
// overrides never belong in a label.
// eslint-disable-next-line no-control-regex -- removing control characters is the point
const singleLineJunk = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g;
// eslint-disable-next-line no-control-regex -- removing control characters is the point
const multiLineJunk = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g;

export const cleanLine = (value: string) => value.replace(singleLineJunk, " ");
export const cleanText = (value: string) => value.replace(/\r\n?/g, "\n").replace(multiLineJunk, "");

const line = (max: number) => z.pipe(z.string().check(z.maxLength(max)), z.transform(cleanLine));
const text = (max: number) => z.pipe(z.string().check(z.maxLength(max)), z.transform(cleanText));
const identifier = z.string().check(z.regex(/^[A-Za-z0-9_-]{1,64}$/));
const coordinate = z.number().check(z.gte(-limits.coordinate), z.lte(limits.coordinate));
const dimension = z.number().check(z.gte(limits.minSize), z.lte(limits.maxSize));
const timestamp = z.iso.datetime({ offset: true });

const nodeSchema = z.object({
  id: identifier,
  serviceId: identifier,
  label: line(limits.label),
  description: z.optional(text(limits.description)),
  position: z.object({ x: coordinate, y: coordinate }),
  parentId: z.optional(identifier),
  size: z.optional(z.object({ width: dimension, height: dimension })),
  tone: z.optional(z.enum(tones)),
});

const edgeSchema = z.object({
  id: identifier,
  source: identifier,
  target: identifier,
  sourceHandle: z.optional(z.enum(handleSides)),
  targetHandle: z.optional(z.enum(handleSides)),
  label: z.optional(line(limits.edgeLabel)),
  mode: z.enum(connectionModes),
  arrow: z.optional(z.enum(arrowStyles)),
});

export const diagramSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: identifier,
  title: line(limits.title).check(z.refine((value) => value.trim().length > 0)),
  description: z.optional(text(limits.diagramDescription)),
  createdAt: timestamp,
  updatedAt: timestamp,
  nodes: z.array(nodeSchema).check(z.maxLength(limits.nodes)),
  edges: z.array(edgeSchema).check(z.maxLength(limits.edges)),
  viewport: z.object({
    x: coordinate,
    y: coordinate,
    zoom: z.number().check(z.gte(limits.minZoom), z.lte(limits.maxZoom)),
  }),
});

/** Ids, references and nesting: what the schema alone cannot check. */
function checkIntegrity(diagram: ArchitectureDiagram): DiagramError | null {
  const nodes = new Map<string, ArchitectureDiagram["nodes"][number]>();
  const ids = new Set<string>();

  for (const node of diagram.nodes) {
    if (ids.has(node.id)) return { code: "duplicate-id", id: node.id };
    ids.add(node.id);
    nodes.set(node.id, node);
    if (!findService(node.serviceId)) return { code: "unknown-component", id: node.serviceId };
  }

  for (const node of diagram.nodes) {
    if (node.parentId === undefined) continue;
    const parent = nodes.get(node.parentId);
    if (!parent) return { code: "missing-node", id: node.parentId };
    if (findService(parent.serviceId)?.kind !== "group") return { code: "invalid-group", id: node.id };

    // Walk up: a cycle or a nesting deeper than the limit is rejected.
    let depth = 0;
    let current: typeof node | undefined = node;
    while (current?.parentId !== undefined) {
      depth += 1;
      if (depth > limits.nesting) return { code: "invalid-group", id: node.id };
      current = nodes.get(current.parentId);
    }
  }

  for (const edge of diagram.edges) {
    if (ids.has(edge.id)) return { code: "duplicate-id", id: edge.id };
    ids.add(edge.id);
    if (!nodes.has(edge.source)) return { code: "missing-node", id: edge.source };
    if (!nodes.has(edge.target)) return { code: "missing-node", id: edge.target };
    if (edge.source === edge.target) return { code: "invalid-content", path: `edges.${edge.id}` };
  }

  return null;
}

/** Validates an already parsed JSON value. */
export function parseDiagram(value: unknown): ParseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("schemaVersion" in value)) {
    return { ok: false, error: { code: "not-a-diagram" } };
  }

  const version = (value as { schemaVersion: unknown }).schemaVersion;
  if (version !== SCHEMA_VERSION) {
    return typeof version === "number" && Number.isInteger(version) && version > SCHEMA_VERSION
      ? { ok: false, error: { code: "unsupported-version", version } }
      : { ok: false, error: { code: "not-a-diagram" } };
  }

  // Counted before the full parse so a huge array is refused cheaply.
  const { nodes, edges } = value as { nodes?: unknown; edges?: unknown };
  if (
    (Array.isArray(nodes) && nodes.length > limits.nodes) ||
    (Array.isArray(edges) && edges.length > limits.edges)
  ) {
    return { ok: false, error: { code: "too-many-elements" } };
  }

  const parsed = diagramSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: { code: "invalid-content", path: issue?.path.join(".") ?? "" } };
  }

  const diagram = parsed.data as ArchitectureDiagram;
  const integrity = checkIntegrity(diagram);
  return integrity ? { ok: false, error: integrity } : { ok: true, diagram };
}

/** Validates the text of a file (size first, then JSON, then the schema). */
export function parseDiagramText(text: string): ParseResult {
  if (new TextEncoder().encode(text).length > limits.fileBytes) {
    return { ok: false, error: { code: "too-large" } };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: "invalid-json" } };
  }
  return parseDiagram(value);
}
