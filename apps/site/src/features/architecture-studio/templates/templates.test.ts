import { describe, expect, it } from "vitest";

import { locales } from "../../../i18n/config";
import { findService } from "../catalog/services";
import { studioMessages } from "../messages";
import { parseDiagram } from "../model/schema";
import { instantiateTemplate, templates } from ".";

describe("templates", () => {
  it("each has a title and description in every language", () => {
    for (const locale of locales) {
      for (const template of templates) {
        const summary = studioMessages(locale).templates[template.id];
        expect(summary.title, `${template.id} ${locale}`).not.toBe("");
        expect(summary.description).not.toBe("");
      }
    }
  });

  it("are valid diagrams in every language", () => {
    for (const template of templates) {
      for (const locale of locales) {
        const result = parseDiagram(instantiateTemplate(template, locale, "Title"));
        expect(result.ok ? null : result.error, `${template.id} ${locale}`).toBeNull();
      }
    }
  });

  it("place children inside their groups", () => {
    for (const template of templates) {
      const byId = new Map(template.nodes.map((node) => [node.id, node]));
      for (const node of template.nodes) {
        if (!node.in) continue;
        const parent = byId.get(node.in)!;
        expect(findService(parent.serviceId)?.kind, `${template.id}/${node.id}`).toBe("group");
        expect(parent.size, node.in).toBeDefined();
        const [x, y] = node.at;
        const [px, py] = parent.at;
        const inside = x >= px && y >= py && x + 184 <= px + parent.size!.width && y + 64 <= py + parent.size!.height;
        expect(inside, `${template.id}/${node.id} inside ${node.in}`).toBe(true);
      }
    }
  });

  it("have flows that point to existing nodes and connections", () => {
    for (const template of templates) {
      const nodes = new Set(template.nodes.map((node) => node.id));
      const edges = new Map(template.edges.map((edge) => [edge.id, edge]));
      expect(template.flows.length, template.id).toBeGreaterThan(0);
      for (const flow of template.flows) {
        expect(flow.steps.length).toBeGreaterThan(0);
        for (const step of flow.steps) {
          for (const id of step.nodes) expect(nodes.has(id), `${template.id}/${flow.id}: ${id}`).toBe(true);
          for (const id of step.edges) {
            const edge = edges.get(id);
            expect(edge, `${template.id}/${flow.id}: ${id}`).toBeDefined();
            // A highlighted connection always has both ends highlighted.
            expect(step.nodes, `${flow.id}: ${id}`).toEqual(expect.arrayContaining([edge!.source, edge!.target]));
          }
          for (const locale of locales) expect(step.text[locale]).not.toBe("");
        }
      }
    }
  });

  it("link only to site paths or https", () => {
    for (const template of templates) {
      for (const link of template.links ?? []) {
        expect(link.href).toMatch(/^(\/[a-z0-9/-]*|https:\/\/[^\s]+)$/);
      }
    }
  });

  it("keep account details out of the portfolio template", () => {
    const text = JSON.stringify(templates.find((template) => template.id === "portfolio"));
    expect(text).not.toMatch(/arn:aws|\d{12}|execute-api|amazonaws\.com|cloudfront\.net/);
  });
});
