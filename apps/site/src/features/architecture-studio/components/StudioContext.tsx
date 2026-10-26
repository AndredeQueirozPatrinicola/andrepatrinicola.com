import { createContext, useContext } from "react";

import type { Locale } from "../../../i18n/config";
import type { StudioMessages } from "../messages";

/** What the canvas shows besides the document itself (never saved, never in the undo history). */
export type StudioView = {
  editable: boolean;
  /** Ids lit up by a guided flow step; everything else is dimmed. */
  highlight: { nodes: ReadonlySet<string>; edges: ReadonlySet<string> } | null;
};

export type StudioActions = {
  /** A group or note resize started/ended (one undo step per resize). */
  resizeStart: () => void;
  resizeEnd: () => void;
  selectEdge: (id: string) => void;
};

type StudioContextValue = {
  locale: Locale;
  text: StudioMessages;
  view: StudioView;
  actions: StudioActions;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export const StudioProvider = StudioContext.Provider;

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used inside the Architecture Studio.");
  return value;
}

/** "on" when lit by the current flow step, "off" when another part is lit, undefined otherwise. */
export function highlightState(view: StudioView, kind: "nodes" | "edges", id: string): "on" | "off" | undefined {
  if (!view.highlight) return undefined;
  return view.highlight[kind].has(id) ? "on" : "off";
}
