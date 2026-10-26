import type { Localized } from "../../../domain/localized";
import type { TemplateId } from "../messages";
import type { ArrowStyle, ConnectionMode, HandleSide, Size, Tone } from "../model/types";

export type TemplateNode = {
  id: string;
  serviceId: string;
  /** Plain string for names that are not translated (service and product names). */
  label: string | Localized;
  description?: Localized;
  /** Absolute position on the canvas; converted to parent-relative when instantiated. */
  at: [x: number, y: number];
  /** Group this node is drawn inside of. */
  in?: string;
  size?: Size;
  tone?: Tone;
};

export type TemplateEdge = {
  id: string;
  source: string;
  target: string;
  label?: string | Localized;
  mode: ConnectionMode;
  arrow?: ArrowStyle;
  from?: HandleSide;
  to?: HandleSide;
};

/** One step of a guided flow: what lights up and what it means. */
export type FlowStep = {
  nodes: string[];
  edges: string[];
  text: Localized;
};

export type TemplateFlow = {
  id: string;
  title: Localized;
  steps: FlowStep[];
};

/** Internal path (below the locale prefix) or an https URL. */
export type TemplateLink = { label: Localized; href: string };

/** Title, description and category live in messages.ts (the start screen shows them without this data). */
export type TemplateDefinition = {
  id: TemplateId;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  flows: TemplateFlow[];
  links?: TemplateLink[];
};
