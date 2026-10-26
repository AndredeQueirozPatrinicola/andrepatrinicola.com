import { describe, expect, it } from "vitest";

import { templates, instantiateTemplate } from "../templates";
import { toDiagram, toEditor } from "./convert";
import { parseDiagramText } from "./schema";
import type { ArchitectureDiagram } from "./types";

const diagram: ArchitectureDiagram = {
  schemaVersion: 1,
  id: "d-1",
  title: "Round trip",
  description: "Everything survives",
  createdAt: "2026-10-26T12:00:00.000Z",
  updatedAt: "2026-10-26T12:30:00.000Z",
  nodes: [
    // Child listed before its parent on purpose.
    { id: "fn", serviceId: "aws-lambda", label: "Handler", description: "Does things", position: { x: 40, y: 60 }, parentId: "vpc", tone: "orange" },
    { id: "vpc", serviceId: "aws-vpc", label: "VPC", position: { x: -100.5, y: 20 }, size: { width: 500, height: 320 } },
    { id: "note", serviceId: "generic-note", label: "Note", description: "Line 1\nLine 2", position: { x: 700, y: 0 }, size: { width: 240, height: 140 } },
    { id: "db", serviceId: "aws-dynamodb", label: "Table", position: { x: 700, y: 300 } },
  ],
  edges: [
    { id: "e1", source: "fn", target: "db", label: "Write", mode: "data-flow", sourceHandle: "right", targetHandle: "left" },
    { id: "e2", source: "db", target: "fn", mode: "asynchronous", arrow: "both" },
  ],
  viewport: { x: 120.25, y: -40, zoom: 0.75 },
};

const meta = (value: ArchitectureDiagram) => ({
  id: value.id,
  title: value.title,
  description: value.description,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

describe("conversion between the file format and the editor", () => {
  it("puts parents before children for React Flow", () => {
    expect(toEditor(diagram).nodes.map((node) => node.id)).toEqual(["vpc", "note", "db", "fn"]);
  });

  it("maps catalog kinds to node types and sizes", () => {
    const nodes = toEditor(diagram).nodes;
    expect(nodes.find((node) => node.id === "vpc")).toMatchObject({ type: "group", width: 500, height: 320 });
    expect(nodes.find((node) => node.id === "note")).toMatchObject({ type: "note", width: 240 });
    expect(nodes.find((node) => node.id === "db")).toMatchObject({ type: "service", data: { tone: "default", description: "" } });
  });

  it("round-trips nodes, connections, positions and the viewport", () => {
    const back = toDiagram(toEditor(diagram), meta(diagram), diagram.viewport);
    const byId = (value: ArchitectureDiagram) => ({ ...value, nodes: [...value.nodes].sort((a, b) => a.id.localeCompare(b.id)) });
    expect(byId(back)).toEqual(byId(diagram));
  });

  it("never saves React Flow internals", () => {
    const editor = toEditor(diagram);
    editor.nodes[0] = { ...editor.nodes[0], selected: true, dragging: true, measured: { width: 1, height: 1 } };
    const back = toDiagram(editor, meta(diagram), diagram.viewport);
    expect(JSON.stringify(back)).not.toMatch(/selected|dragging|measured|zIndex/);
  });

  it("produces files the importer accepts (JSON round trip)", () => {
    const text = JSON.stringify(toDiagram(toEditor(diagram), meta(diagram), { x: 1, y: 2, zoom: 1.5 }));
    const parsed = parseDiagramText(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.diagram.viewport).toEqual({ x: 1, y: 2, zoom: 1.5 });
  });

  it("round-trips every template", () => {
    for (const template of templates) {
      const source = instantiateTemplate(template, "en", template.id);
      const text = JSON.stringify(toDiagram(toEditor(source), meta(source), source.viewport));
      expect(parseDiagramText(text).ok, template.id).toBe(true);
    }
  });
});
