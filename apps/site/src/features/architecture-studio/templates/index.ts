import type { Locale } from "../../../i18n/config";
import type { TemplateId } from "../messages";
import { SCHEMA_VERSION, type ArchitectureDiagram, type ArchitectureNode } from "../model/types";
import { asyncProcessingTemplate } from "./async-processing";
import { portfolioTemplate } from "./portfolio";
import { serverlessApiTemplate } from "./serverless-api";
import type { TemplateDefinition, TemplateNode } from "./types";
import { webApplicationTemplate } from "./web-application";

/** Gallery order. The portfolio comes first: it is the real architecture. */
export const templates: TemplateDefinition[] = [portfolioTemplate, serverlessApiTemplate, asyncProcessingTemplate, webApplicationTemplate];

export const templateIds = templates.map((template) => template.id);

export function findTemplate(id: string): TemplateDefinition | undefined {
  return templates.find((template) => template.id === id);
}

export function isTemplateId(id: string): id is TemplateId {
  return templates.some((template) => template.id === id);
}

const text = (value: TemplateNode["label"], locale: Locale) => (typeof value === "string" ? value : value[locale]);

/** Fixed timestamp: a template is the same document every time it is opened. */
const TEMPLATE_DATE = "2026-10-26T00:00:00.000Z";

/**
 * A template as a diagram in the visitor's language. Positions are authored
 * as absolute coordinates and become parent-relative here.
 */
export function instantiateTemplate(template: TemplateDefinition, locale: Locale, title: string, description?: string): ArchitectureDiagram {
  const byId = new Map(template.nodes.map((node) => [node.id, node]));
  const absolute = (node: TemplateNode) => ({ x: node.at[0], y: node.at[1] });

  const nodes = template.nodes.map((node): ArchitectureNode => {
    const parent = node.in !== undefined ? byId.get(node.in) : undefined;
    const position = parent
      ? { x: node.at[0] - absolute(parent).x, y: node.at[1] - absolute(parent).y }
      : absolute(node);
    return {
      id: node.id,
      serviceId: node.serviceId,
      label: text(node.label, locale),
      ...(node.description ? { description: node.description[locale] } : {}),
      position,
      ...(node.in !== undefined ? { parentId: node.in } : {}),
      ...(node.size ? { size: node.size } : {}),
      ...(node.tone ? { tone: node.tone } : {}),
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    id: `template-${template.id}`,
    title,
    ...(description ? { description } : {}),
    createdAt: TEMPLATE_DATE,
    updatedAt: TEMPLATE_DATE,
    nodes,
    edges: template.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.from ? { sourceHandle: edge.from } : {}),
      ...(edge.to ? { targetHandle: edge.to } : {}),
      ...(edge.label !== undefined ? { label: text(edge.label, locale) } : {}),
      mode: edge.mode,
      ...(edge.arrow ? { arrow: edge.arrow } : {}),
    })),
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
