/**
 * The editor's entry point, loaded on demand (React.lazy) when the start
 * page's URL asks for a diagram: `?template=<id>`, `?diagram=<id>`, `?new=1`.
 * Everything below this module (React Flow, Zod, templates, icons) stays out
 * of the pre-rendered page's bundle.
 */
import "@xyflow/react/dist/style.css";
import "../studio-editor.css";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { track } from "../../../analytics/umami";
import type { Locale } from "../../../i18n/config";
import type { StudioMessages } from "../messages";
import { createId } from "../model/ids";
import { parseDiagram } from "../model/schema";
import { SCHEMA_VERSION, type ArchitectureDiagram } from "../model/types";
import { createLibrary, type LoadResult } from "../persistence/library";
import { findTemplate, instantiateTemplate } from "../templates";
import { Editor, type OpenState, type Session } from "./Editor";
import { StudioProvider } from "./StudioContext";

export type StudioRequest = { kind: "template"; id: string } | { kind: "diagram"; id: string } | { kind: "new" };

type WorkspaceProps = {
  request: StudioRequest;
  locale: Locale;
  text: StudioMessages;
  /** Path of the studio's start page. */
  basePath: string;
};

type Resolved =
  | { kind: "ready"; session: Session }
  | { kind: "error"; message: string };

/** A diagram handed over in history state is untrusted too. */
function fromState(state: unknown, id: string): OpenState | null {
  if (typeof state !== "object" || state === null || !("diagram" in state)) return null;
  const parsed = parseDiagram((state as { diagram: unknown }).diagram);
  if (!parsed.ok || parsed.diagram.id !== id) return null;
  const { mode, storageError, notice } = state as Partial<OpenState>;
  return {
    diagram: parsed.diagram,
    mode: mode === "explore" || mode === "edit" ? mode : undefined,
    storageError: storageError === "unavailable" || storageError === "quota" || storageError === "limit" ? storageError : undefined,
    notice: notice === "copyCreated" || notice === "imported" ? notice : undefined,
  };
}

function loadErrorMessage(text: StudioMessages, result: Exclude<LoadResult, { ok: true }>): string {
  return text.loadErrors[result.reason];
}

export default function Workspace({ request, locale, text, basePath }: WorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const library = useMemo(() => createLibrary(), []);

  const [resolved] = useState<Resolved>(() => {
    if (request.kind === "template") {
      const template = findTemplate(request.id);
      if (!template) return { kind: "error", message: text.loadErrors.template };
      const summary = text.templates[template.id];
      return { kind: "ready", session: { diagram: instantiateTemplate(template, locale, summary.title, summary.description), template } };
    }

    if (request.kind === "new") {
      const now = new Date().toISOString();
      const diagram: ArchitectureDiagram = {
        schemaVersion: SCHEMA_VERSION,
        id: createId("d"),
        title: text.newDiagramTitle,
        createdAt: now,
        updatedAt: now,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      return { kind: "ready", session: { diagram, mode: "edit" } };
    }

    const handedOver = fromState(location.state, request.id);
    const loaded = library.load(request.id);
    if (loaded.ok) {
      return { kind: "ready", session: { diagram: loaded.diagram, mode: handedOver?.mode, notice: handedOver?.notice } };
    }
    // Not in storage (private mode, full quota) but just created or imported: keep working in memory.
    if (handedOver) {
      return { kind: "ready", session: { ...handedOver, storageError: handedOver.storageError ?? (loaded.reason === "missing" ? "unavailable" : undefined) } };
    }
    return { kind: "error", message: loadErrorMessage(text, loaded) };
  });

  // A new diagram gets its own URL, so reloading opens it again.
  useEffect(() => {
    if (request.kind !== "new" || resolved.kind !== "ready") return;
    const { diagram } = resolved.session;
    const saved = library.save(diagram);
    track("architecture-studio", { action: "create" });
    navigate(`?diagram=${diagram.id}`, {
      replace: true,
      state: { diagram, mode: "edit", storageError: saved.ok ? undefined : saved.reason } satisfies OpenState,
    });
  }, [request, resolved, navigate, library]);

  useEffect(() => {
    track("architecture-studio", { action: "open", source: request.kind, ...(request.kind === "template" ? { template: request.id } : {}) });
  }, [request]);

  if (resolved.kind === "error") {
    return (
      <StudioProvider value={{ locale, text, view: { editable: false, highlight: null }, actions: { resizeStart() {}, resizeEnd() {}, selectEdge() {} } }}>
        <div className="studio-workspace studio-load-error">
          <div role="alert">
            <p>{resolved.message}</p>
            <Link className="studio-button" to={basePath}>
              {text.loadErrors.back}
            </Link>
          </div>
        </div>
      </StudioProvider>
    );
  }

  return (
    <Editor
      session={resolved.session}
      library={library}
      locale={locale}
      text={text}
      exitTo={basePath}
      navigateTo={(search, state) => navigate(search ? `${basePath}${search}` : basePath, state ? { state } : undefined)}
    />
  );
}
