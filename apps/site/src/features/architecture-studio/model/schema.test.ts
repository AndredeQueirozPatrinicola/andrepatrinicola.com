import { describe, expect, it } from "vitest";

import { parseDiagram, parseDiagramText } from "./schema";
import { limits, type ArchitectureDiagram } from "./types";

function diagram(overrides: Partial<ArchitectureDiagram> = {}): ArchitectureDiagram {
  return {
    schemaVersion: 1,
    id: "d-test",
    title: "Test",
    createdAt: "2026-10-26T12:00:00.000Z",
    updatedAt: "2026-10-26T12:00:00.000Z",
    nodes: [
      { id: "vpc", serviceId: "aws-vpc", label: "VPC", position: { x: 0, y: 0 }, size: { width: 400, height: 300 } },
      { id: "fn", serviceId: "aws-lambda", label: "Lambda", position: { x: 40, y: 60 }, parentId: "vpc" },
      { id: "db", serviceId: "aws-dynamodb", label: "Table", description: "Line 1\nLine 2", position: { x: 600, y: 60 } },
    ],
    edges: [{ id: "e1", source: "fn", target: "db", label: "Write", mode: "data-flow" }],
    viewport: { x: 10, y: -20, zoom: 0.8 },
    ...overrides,
  };
}

const errorOf = (value: unknown) => {
  const result = parseDiagram(value);
  return result.ok ? null : result.error;
};

describe("parseDiagram", () => {
  it("accepts a valid diagram and keeps every field", () => {
    const result = parseDiagram(diagram());
    expect(result).toEqual({ ok: true, diagram: diagram() });
  });

  it("drops unknown fields instead of keeping them", () => {
    const value = { ...diagram(), script: "alert(1)", nodes: [{ ...diagram().nodes[2], onclick: "x" }], edges: [] };
    const result = parseDiagram(value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram).not.toHaveProperty("script");
    expect(result.diagram.nodes[0]).not.toHaveProperty("onclick");
  });

  it("keeps HTML as inert text and strips control characters", () => {
    const value = diagram({ nodes: [{ id: "a", serviceId: "aws-s3", label: "<img src=x onerror=alert(1)>\u0007\u202e", position: { x: 0, y: 0 } }], edges: [] });
    const result = parseDiagram(value);
    expect(result.ok && result.diagram.nodes[0].label).toBe("<img src=x onerror=alert(1)>  ");
  });

  it("rejects something that is not a diagram", () => {
    expect(errorOf(null)).toEqual({ code: "not-a-diagram" });
    expect(errorOf([])).toEqual({ code: "not-a-diagram" });
    expect(errorOf({ nodes: [] })).toEqual({ code: "not-a-diagram" });
    expect(errorOf({ ...diagram(), schemaVersion: "1" })).toEqual({ code: "not-a-diagram" });
  });

  it("explains a file from a newer version", () => {
    expect(errorOf({ ...diagram(), schemaVersion: 2 })).toEqual({ code: "unsupported-version", version: 2 });
  });

  it("rejects invalid numbers", () => {
    const at = (x: unknown) => ({ ...diagram(), nodes: [{ ...diagram().nodes[2], position: { x, y: 0 } }], edges: [] });
    expect(errorOf(at(Number.NaN))?.code).toBe("invalid-content");
    expect(errorOf(at(Number.POSITIVE_INFINITY))?.code).toBe("invalid-content");
    expect(errorOf(at(limits.coordinate + 1))?.code).toBe("invalid-content");
    expect(errorOf(at("12"))?.code).toBe("invalid-content");
    expect(errorOf({ ...diagram(), viewport: { x: 0, y: 0, zoom: 0 } })?.code).toBe("invalid-content");
  });

  it("enforces text limits", () => {
    const long = diagram({ nodes: [{ id: "a", serviceId: "aws-s3", label: "x".repeat(limits.label + 1), position: { x: 0, y: 0 } }], edges: [] });
    expect(errorOf(long)).toEqual({ code: "invalid-content", path: "nodes.0.label" });
    expect(errorOf(diagram({ title: "   " }))?.code).toBe("invalid-content");
  });

  it("enforces element limits before parsing every element", () => {
    const nodes = Array.from({ length: limits.nodes + 1 }, (_, index) => ({ id: `n${index}` }));
    expect(errorOf({ ...diagram(), nodes })).toEqual({ code: "too-many-elements" });
  });

  it("checks ids, references and groups", () => {
    const base = diagram();
    expect(errorOf({ ...base, nodes: [...base.nodes, { ...base.nodes[2] }] })).toEqual({ code: "duplicate-id", id: "db" });
    expect(errorOf({ ...base, edges: [{ ...base.edges[0], id: "db" }] })).toEqual({ code: "duplicate-id", id: "db" });
    expect(errorOf({ ...base, edges: [{ ...base.edges[0], target: "ghost" }] })).toEqual({ code: "missing-node", id: "ghost" });
    expect(errorOf({ ...base, edges: [{ ...base.edges[0], target: "fn" }] })?.code).toBe("invalid-content");
    expect(errorOf({ ...base, nodes: [{ ...base.nodes[2], serviceId: "aws-quantum" }], edges: [] })).toEqual({ code: "unknown-component", id: "aws-quantum" });
    // A service is not a container.
    expect(errorOf({ ...base, nodes: [base.nodes[2], { ...base.nodes[1], parentId: "db" }], edges: [] })).toEqual({ code: "invalid-group", id: "fn" });
    // Two groups inside each other.
    const cycle = [
      { id: "g1", serviceId: "group-generic", label: "A", position: { x: 0, y: 0 }, parentId: "g2" },
      { id: "g2", serviceId: "group-generic", label: "B", position: { x: 0, y: 0 }, parentId: "g1" },
    ];
    expect(errorOf({ ...base, nodes: cycle, edges: [] })?.code).toBe("invalid-group");
  });

  it("rejects ids that could be anything", () => {
    expect(errorOf(diagram({ id: "../../etc" }))?.code).toBe("invalid-content");
  });
});

describe("parseDiagramText", () => {
  it("rejects large files before parsing them", () => {
    expect(parseDiagramText(" ".repeat(limits.fileBytes + 1))).toEqual({ ok: false, error: { code: "too-large" } });
  });

  it("rejects malformed JSON", () => {
    expect(parseDiagramText("{ nodes: [")).toEqual({ ok: false, error: { code: "invalid-json" } });
  });

  it("parses a serialized diagram", () => {
    expect(parseDiagramText(JSON.stringify(diagram()))).toEqual({ ok: true, diagram: diagram() });
  });
});
