import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../model/editor";
import { limits } from "../model/types";
import {
  addNode,
  connect,
  copyFragment,
  createNode,
  duplicateNodes,
  findFreePosition,
  pasteFragment,
  removeElements,
  removeSelection,
  reparentDropped,
  reverseEdge,
  select,
  selectedNodeIds,
  setNodePosition,
  setParent,
  updateEdgeData,
  updateNodeData,
} from "./document";

function sample(): EditorDocument {
  const group = { ...createNode("aws-vpc", "VPC", "vpc", { x: 0, y: 0 }), width: 400, height: 300 };
  return {
    nodes: [
      group,
      { ...createNode("aws-lambda", "Lambda", "fn", { x: 40, y: 60 }), parentId: "vpc" },
      createNode("aws-dynamodb", "Table", "db", { x: 600, y: 60 }),
    ],
    edges: [
      { id: "e1", type: "architecture", source: "fn", target: "db", data: { mode: "data-flow", label: "Write", arrow: "forward" } },
    ],
  };
}

const ok = <T extends object>(result: T | { error: "limit" } | null): T => {
  if (!result || "error" in result) throw new Error("expected a document");
  return result;
};

describe("addNode", () => {
  it("adds a node with a unique id and selects only it", () => {
    const start = select(sample(), ["db"]);
    const { document, id } = ok(addNode(start, { serviceId: "aws-sqs", label: "Queue", position: { x: 900, y: 0 } }));
    expect(document.nodes).toHaveLength(4);
    expect(new Set(document.nodes.map((node) => node.id)).size).toBe(4);
    expect(selectedNodeIds(document)).toEqual([id]);
    expect(document.nodes.at(-1)).toMatchObject({ type: "service", data: { serviceId: "aws-sqs", label: "Queue" } });
  });

  it("puts a node dropped over a group inside it, with a relative position", () => {
    const { document, id } = ok(addNode(sample(), { serviceId: "aws-sqs", label: "Queue", position: { x: 100, y: 120 } }));
    expect(document.nodes.find((node) => node.id === id)).toMatchObject({ parentId: "vpc", position: { x: 100, y: 120 } });
  });

  it("gives groups and notes a size", () => {
    const { document, id } = ok(addNode(sample(), { serviceId: "group-region", label: "Region", position: { x: 2000, y: 0 } }));
    const node = document.nodes.find((current) => current.id === id)!;
    expect(node.type).toBe("group");
    expect(node.width).toBeGreaterThan(0);
  });

  it("stops at the node limit", () => {
    const nodes = Array.from({ length: limits.nodes }, (_, index) => createNode("aws-s3", "S3", `n${index}`, { x: index, y: 0 }));
    expect(addNode({ nodes, edges: [] }, { serviceId: "aws-s3", label: "S3", position: { x: 0, y: 0 } })).toEqual({ error: "limit" });
  });
});

describe("connect", () => {
  it("connects any two nodes and selects the new connection", () => {
    const { document, id } = ok(connect(sample(), { source: "db", target: "fn", mode: "asynchronous", label: "Event" }));
    const edge = document.edges.find((current) => current.id === id)!;
    expect(edge).toMatchObject({ source: "db", target: "fn", selected: true, data: { mode: "asynchronous", label: "Event", arrow: "forward" } });
    expect(new Set(document.edges.map((current) => current.id)).size).toBe(document.edges.length);
  });

  it("refuses loops, unknown nodes and exact duplicates", () => {
    expect(connect(sample(), { source: "db", target: "db" })).toBeNull();
    expect(connect(sample(), { source: "db", target: "ghost" })).toBeNull();
    expect(connect(sample(), { source: "fn", target: "db" })).toBeNull();
    // The same pair on other sides is a different line.
    expect(connect(sample(), { source: "fn", target: "db", sourceHandle: "right", targetHandle: "left" })).not.toBeNull();
  });
});

describe("editing", () => {
  it("updates node data and position", () => {
    let document = updateNodeData(sample(), "db", { label: "Orders", description: "Main table", tone: "green" });
    document = setNodePosition(document, "db", { x: 10, y: 20 });
    expect(document.nodes.find((node) => node.id === "db")).toMatchObject({
      position: { x: 10, y: 20 },
      data: { label: "Orders", description: "Main table", tone: "green", serviceId: "aws-dynamodb" },
    });
  });

  it("updates and reverses connections", () => {
    let document = updateEdgeData(sample(), "e1", { label: "Stream", mode: "asynchronous", arrow: "both" });
    document = reverseEdge(document, "e1");
    expect(document.edges[0]).toMatchObject({ source: "db", target: "fn", data: { label: "Stream", mode: "asynchronous", arrow: "both" } });
  });
});

describe("removal", () => {
  it("removes a node with its connections", () => {
    const document = removeElements(sample(), ["db"]);
    expect(document.nodes.map((node) => node.id)).toEqual(["vpc", "fn"]);
    expect(document.edges).toEqual([]);
  });

  it("removes a group with everything inside it", () => {
    const document = removeElements(sample(), ["vpc"]);
    expect(document.nodes.map((node) => node.id)).toEqual(["db"]);
    expect(document.edges).toEqual([]);
  });

  it("removes the selection", () => {
    const document = removeSelection(select(sample(), [], ["e1"]));
    expect(document.nodes).toHaveLength(3);
    expect(document.edges).toEqual([]);
  });
});

describe("groups", () => {
  it("moves a node into and out of a group keeping it in place on the canvas", () => {
    const inside = setParent(sample(), "db", "vpc");
    expect(inside.nodes.find((node) => node.id === "db")).toMatchObject({ parentId: "vpc", position: { x: 600, y: 60 } });
    const out = setParent(inside, "fn", null);
    const fn = out.nodes.find((node) => node.id === "fn")!;
    expect(fn.parentId).toBeUndefined();
    expect(fn.position).toEqual({ x: 40, y: 60 });
  });

  it("refuses to put a group inside itself or a service", () => {
    const document = sample();
    expect(setParent(document, "vpc", "vpc")).toBe(document);
    expect(setParent(document, "fn", "db")).toBe(document);
  });

  it("keeps parents before children", () => {
    const withGroup = ok(addNode(sample(), { serviceId: "group-generic", label: "Group", position: { x: 1000, y: 0 } }));
    const document = setParent(withGroup.document, "db", withGroup.id);
    const order = document.nodes.map((node) => node.id);
    expect(order.indexOf(withGroup.id)).toBeLessThan(order.indexOf("db"));
  });

  it("reparents nodes dropped over a group after a drag", () => {
    const moved = setNodePosition(sample(), "db", { x: 100, y: 100 });
    const document = reparentDropped(moved, ["db"]);
    expect(document.nodes.find((node) => node.id === "db")?.parentId).toBe("vpc");
    const outside = reparentDropped(setNodePosition(document, "fn", { x: 900, y: 900 }), ["fn"]);
    expect(outside.nodes.find((node) => node.id === "fn")?.parentId).toBeUndefined();
  });
});

describe("duplicate, copy and paste", () => {
  it("duplicates a node next to the original, in the same group", () => {
    const { document, ids } = ok(duplicateNodes(sample(), ["fn"]));
    const copy = document.nodes.find((node) => node.id === ids[0])!;
    expect(copy).toMatchObject({ parentId: "vpc", position: { x: 72, y: 92 }, selected: true, data: { label: "Lambda" } });
    expect(copy.id).not.toBe("fn");
  });

  it("copies a group with its contents and their internal connections", () => {
    const withEdge = ok(connect(sample(), { source: "vpc", target: "fn" })).document;
    const fragment = copyFragment(withEdge, ["vpc"])!;
    expect(fragment.nodes.map((node) => node.id).sort()).toEqual(["fn", "vpc"]);
    expect(fragment.edges).toHaveLength(1);

    const { document, ids } = ok(pasteFragment(withEdge, fragment));
    expect(document.nodes).toHaveLength(5);
    const pastedGroup = document.nodes.find((node) => ids.includes(node.id) && node.type === "group")!;
    const pastedChild = document.nodes.find((node) => ids.includes(node.id) && node.type === "service")!;
    expect(pastedChild.parentId).toBe(pastedGroup.id);
    expect(document.edges.some((edge) => edge.source === pastedGroup.id && edge.target === pastedChild.id)).toBe(true);
    const unique = new Set([...document.nodes.map((node) => node.id), ...document.edges.map((edge) => edge.id)]);
    expect(unique.size).toBe(document.nodes.length + document.edges.length);
  });

  it("pastes at the top level when the original group is gone", () => {
    const fragment = copyFragment(sample(), ["fn"])!;
    const withoutGroup = removeElements(sample(), ["vpc"]);
    const { document, ids } = ok(pasteFragment(withoutGroup, fragment));
    expect(document.nodes.find((node) => node.id === ids[0])).toMatchObject({ position: { x: 72, y: 92 } });
    expect(document.nodes.find((node) => node.id === ids[0])?.parentId).toBeUndefined();
  });
});

describe("findFreePosition", () => {
  it("keeps the desired spot when it is free and moves away from occupied ones", () => {
    const nodes = [createNode("aws-s3", "S3", "a", { x: 0, y: 0 })];
    expect(findFreePosition(nodes, { x: 500, y: 500 }, { width: 184, height: 64 })).toEqual({ x: 500, y: 500 });
    const moved = findFreePosition(nodes, { x: 10, y: 10 }, { width: 184, height: 64 });
    expect(moved).not.toEqual({ x: 10, y: 10 });
    const clear = moved.x >= 184 + 16 || moved.x + 184 + 16 <= 0 || moved.y >= 64 + 16 || moved.y + 64 + 16 <= 0;
    expect(clear).toBe(true);
  });
});
