import {
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Connection,
  type FinalConnectionState,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Reducer } from "react";
import { useBlocker } from "react-router";

import { track } from "../../../analytics/umami";
import type { Locale } from "../../../i18n/config";
import { defaultLabel, findService, serviceName, type ServiceDefinition } from "../catalog/services";
import { exportJson, exportPng } from "../export/files";
import { fill, type StudioMessages, type TemplateId } from "../messages";
import { toDiagram, toEditor } from "../model/convert";
import type { EditorDocument, StudioEdge, StudioEdgeData, StudioNode, StudioNodeData } from "../model/editor";
import { createId } from "../model/ids";
import { errorValues, parseDiagramText } from "../model/schema";
import { limits, type ArchitectureDiagram, type ConnectionMode, type HandleSide, type Point } from "../model/types";
import type { Library, StorageFailure } from "../persistence/library";
import {
  addNode,
  connect,
  copyFragment,
  findFreePosition,
  pasteFragment,
  removeSelection,
  reparentDropped,
  reverseEdge,
  select,
  selectedNodeIds,
  setNodePosition,
  setParent,
  updateEdgeData,
  updateNodeData,
  type Fragment,
} from "../state/document";
import { createHistory, historyReducer, type History, type HistoryAction } from "../state/history";
import type { TemplateDefinition } from "../templates/types";
import { Canvas } from "./Canvas";
import { ConfirmDialog } from "./Dialog";
import { FlowList, FlowPlayer, type FlowState } from "./Flows";
import { Inspector } from "./Inspector";
import { ErrorDialog, LibraryDialog, TemplateDialog } from "./LibraryDialogs";
import { Outline } from "./Outline";
import { Palette } from "./Palette";
import { PropertiesPanel, type DiagramFields } from "./PropertiesPanel";
import { StudioProvider, type StudioView } from "./StudioContext";
import { Toolbar, type SaveStatus } from "./Toolbar";

export type Session = {
  diagram: ArchitectureDiagram;
  /** Set when an official template is open: read-only, never saved. */
  template?: TemplateDefinition;
  mode?: "explore" | "edit";
  /** Why the diagram could not be saved when it was opened, if it could not. */
  storageError?: StorageFailure;
  notice?: keyof StudioMessages["toasts"];
};

/** Diagram passed to the next page through history state (see Workspace). */
export type OpenState = { diagram: ArchitectureDiagram; mode?: "explore" | "edit"; storageError?: StorageFailure; notice?: keyof StudioMessages["toasts"] };

type EditorProps = {
  session: Session;
  library: Library;
  locale: Locale;
  text: StudioMessages;
  /** Opens something else in the studio (`?template=…`, `?diagram=…`, `?new=1`). */
  navigateTo: (search: string, state?: OpenState) => void;
  exitTo: string;
};

const SAVE_DELAY = 800;
const narrowScreen = () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 63.99rem)").matches === true;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const documentReducer = historyReducer as Reducer<History<EditorDocument>, HistoryAction<EditorDocument>>;

const isHandle = (value: string | null | undefined): value is HandleSide =>
  value === "top" || value === "right" || value === "bottom" || value === "left";

// Connections get an accessible name from their ends; cached per edge object.
const edgeNames = new WeakMap<StudioEdge, { key: string; edge: StudioEdge }>();

function ZoomReadout({ template }: { template: string }) {
  const zoom = useStore((state) => state.transform[2]);
  return <span>{fill(template, { zoom: Math.round(zoom * 100) })}</span>;
}

export function Editor(props: EditorProps) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}

function EditorInner({ session, library, locale, text, navigateTo, exitTo }: EditorProps) {
  const flow = useReactFlow<StudioNode, StudioEdge>();
  const template = session.template;
  const owned = !template;
  const [history, dispatch] = useReducer(documentReducer, session.diagram, (diagram) => createHistory(toEditor(diagram)));
  const doc = history.present;

  const [meta, setMeta] = useState(() => ({
    id: session.diagram.id,
    title: session.diagram.title,
    description: session.diagram.description ?? "",
    createdAt: session.diagram.createdAt,
  }));
  const [metaVersion, setMetaVersion] = useState(0);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [saved, setSaved] = useState<{ revision: number; meta: number; viewport: number; error: StorageFailure | null }>({
    revision: 0,
    meta: 0,
    viewport: 0,
    error: session.storageError ?? null,
  });
  const [exportedRevision, setExportedRevision] = useState(-1);

  const [mode, setMode] = useState<"explore" | "edit">(template ? "explore" : (session.mode ?? "edit"));
  const editable = owned && mode === "edit";
  const [leftOpen, setLeftOpen] = useState(() => !narrowScreen());
  const [rightOpen, setRightOpen] = useState(() => !narrowScreen());
  const [snap, setSnap] = useState(false);
  const [minimap, setMinimap] = useState(() => !narrowScreen());
  const [leftTab, setLeftTab] = useState<"primary" | "outline">("primary");
  const [flowState, setFlowState] = useState<FlowState>(null);
  const [dialog, setDialog] = useState<"templates" | "library" | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(() =>
    session.notice ? { id: 0, message: text.toasts[session.notice] } : null,
  );

  const viewportRef = useRef<Viewport>(session.diagram.viewport);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const clipboardRef = useRef<Fragment | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const deletedRef = useRef(false);
  const latest = useRef({ doc, meta, revision: history.revision, metaVersion, viewportVersion });
  useEffect(() => {
    latest.current = { doc, meta, revision: history.revision, metaVersion, viewportVersion };
  });

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ------------------------------------------------------------ persistence

  const buildDiagram = useCallback((): ArchitectureDiagram => {
    const current = latest.current;
    return toDiagram(
      current.doc,
      {
        id: current.meta.id,
        title: current.meta.title.trim() || text.newDiagramTitle,
        description: current.meta.description.trim() || undefined,
        createdAt: current.meta.createdAt,
        updatedAt: new Date().toISOString(),
      },
      viewportRef.current,
    );
  }, [text.newDiagramTitle]);

  const flush = useCallback(() => {
    if (!owned || deletedRef.current) return null;
    const result = library.save(buildDiagram());
    const current = latest.current;
    setSaved({ revision: current.revision, meta: current.metaVersion, viewport: current.viewportVersion, error: result.ok ? null : result.reason });
    return result;
  }, [owned, library, buildDiagram]);

  const pending =
    owned && (history.revision !== saved.revision || metaVersion !== saved.meta || viewportVersion !== saved.viewport);
  const contentPending = owned && (history.revision !== saved.revision || metaVersion !== saved.meta);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(flush, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [pending, history.revision, metaVersion, viewportVersion, flush]);

  // Leaving the page: write what is pending; warn only if it cannot be saved.
  const unsafe = owned && saved.error !== null && history.revision !== exportedRevision;
  useEffect(() => {
    if (!owned) return;
    const onPageHide = () => flush();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const result = flush();
      if (result && !result.ok && latest.current.revision !== exportedRevision) event.preventDefault();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [owned, flush, exportedRevision]);

  // Navigating inside the site: save on the way out (the editor unmounts).
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  });
  useEffect(() => () => void (pendingRef.current && flush()), [flush]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsafe && currentLocation.key !== nextLocation.key);

  const status: SaveStatus = template ? "template" : saved.error ? "error" : contentPending ? "saving" : "saved";

  // ------------------------------------------------------------ editing

  const commit = useCallback(
    (update: (current: EditorDocument) => EditorDocument, key?: string) => dispatch({ type: "commit", update, key }),
    [],
  );
  const silent = useCallback((update: (current: EditorDocument) => EditorDocument) => dispatch({ type: "silent", update }), []);

  const onNodesChange = useCallback(
    (changes: NodeChange<StudioNode>[]) => {
      const update = (current: EditorDocument) => ({ ...current, nodes: applyNodeChanges(changes, current.nodes) });
      // Removals always go through removeSelection (one undo step, children included).
      if (changes.some((change) => change.type === "remove")) return;
      const moves = changes.some((change) => change.type === "position" && change.position);
      const resizes = changes.some((change) => change.type === "dimensions" && change.resizing !== undefined);
      if (draggingRef.current || resizingRef.current || resizes) {
        dispatch({ type: "transient", update });
      } else if (moves) {
        // Arrow keys on a focused node: consecutive moves are one step.
        dispatch({ type: "commit", update, key: "keyboard-move" });
      } else {
        dispatch({ type: "silent", update });
      }
    },
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<StudioEdge>[]) => {
      const selection = changes.filter((change) => change.type === "select");
      if (selection.length) silent((current) => ({ ...current, edges: applyEdgeChanges(selection, current.edges) }));
    },
    [silent],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!editable) return;
      const result = connect(doc, {
        source: connection.source,
        target: connection.target,
        sourceHandle: isHandle(connection.sourceHandle) ? connection.sourceHandle : null,
        targetHandle: isHandle(connection.targetHandle) ? connection.targetHandle : null,
      });
      if (!result) return;
      if ("error" in result) return notify(fill(text.properties.edgeLimit, { max: limits.edges }));
      commit(() => result.document);
      setRightOpen((open) => open || !narrowScreen());
    },
    [editable, doc, commit, notify, text.properties.edgeLimit],
  );

  // Dropping a new connection anywhere on a component (not only on one of
  // its connection points) connects to it, attached to the nearest side.
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromNode) return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;
      const element = document.elementFromPoint(point.clientX, point.clientY)?.closest<HTMLElement>(".react-flow__node");
      const target = element?.dataset.id;
      if (!target || target === state.fromNode.id) return;
      onConnect({ source: state.fromNode.id, target, sourceHandle: state.fromHandle?.id ?? null, targetHandle: null });
    },
    [onConnect],
  );

  const onDragStart = useCallback(() => {
    draggingRef.current = true;
  }, []);

  const onDragStop = useCallback(
    (nodes: StudioNode[]) => {
      draggingRef.current = false;
      commit((current) => reparentDropped(current, nodes.map((node) => node.id)));
    },
    [commit],
  );

  const actions = useMemo(
    () => ({
      resizeStart: () => {
        resizingRef.current = true;
      },
      resizeEnd: () => {
        resizingRef.current = false;
        dispatch({ type: "checkpoint" });
      },
      selectEdge: (id: string) => silent((current) => select(current, [], [id])),
    }),
    [silent],
  );

  const addService = useCallback(
    (service: ServiceDefinition, at?: Point) => {
      if (!editable) return;
      const size = service.defaultSize ?? { width: 184, height: 64 };
      let topLeft: Point;
      if (at) {
        topLeft = { x: Math.round(at.x - size.width / 2), y: Math.round(at.y - size.height / 2) };
      } else {
        // Added from the catalog with a click or the keyboard: the free spot nearest the middle of the view.
        const rect = canvasRef.current?.getBoundingClientRect();
        const center = rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 0, y: 0 };
        const desired = { x: Math.round(center.x - size.width / 2), y: Math.round(center.y - size.height / 2) };
        topLeft = service.kind === "group" ? desired : findFreePosition(doc.nodes, desired, size);
      }
      const result = addNode(doc, { serviceId: service.id, label: defaultLabel(service, locale), position: topLeft });
      if ("error" in result) return notify(fill(text.properties.limit, { max: limits.nodes }));
      commit(() => result.document);
    },
    [editable, flow, doc, locale, commit, notify, text.properties.limit],
  );

  const deleteSelection = useCallback(() => editable && commit(removeSelection), [editable, commit]);

  const duplicateSelection = useCallback(() => {
    if (!editable) return;
    const fragment = copyFragment(doc, selectedNodeIds(doc));
    if (!fragment) return;
    const result = pasteFragment(doc, fragment);
    if ("error" in result) return notify(fill(text.properties.limit, { max: limits.nodes }));
    commit(() => result.document);
  }, [editable, doc, commit, notify, text.properties.limit]);

  const copySelection = useCallback(() => {
    const fragment = copyFragment(doc, selectedNodeIds(doc));
    if (fragment) {
      clipboardRef.current = fragment;
      notify(text.toasts.copied);
    }
  }, [doc, notify, text.toasts.copied]);

  const paste = useCallback(() => {
    if (!editable || !clipboardRef.current) return;
    const result = pasteFragment(doc, clipboardRef.current);
    if ("error" in result) return notify(fill(text.properties.limit, { max: limits.nodes }));
    commit(() => result.document);
  }, [editable, doc, commit, notify, text.properties.limit]);

  const focusNode = useCallback(
    (id: string) => {
      silent((current) => select(current, [id]));
      void flow.fitView({ nodes: [{ id }], padding: 0.6, maxZoom: 1.2, duration: reducedMotion() ? 0 : 300 });
    },
    [silent, flow],
  );

  const undo = useCallback(() => editable && dispatch({ type: "undo" }), [editable]);
  const redo = useCallback(() => editable && dispatch({ type: "redo" }), [editable]);

  const changeMeta = useCallback((patch: Partial<DiagramFields>) => {
    setMeta((current) => ({ ...current, ...patch }));
    setMetaVersion((version) => version + 1);
  }, []);

  // ------------------------------------------------------------ files

  const saveNow = useCallback(() => {
    const result = flush();
    if (result?.ok) notify(text.toasts.saved);
  }, [flush, notify, text.toasts.saved]);

  const onExportJson = useCallback(() => {
    exportJson(buildDiagram());
    setExportedRevision(latest.current.revision);
    track("architecture-studio", { action: "export-json" });
    notify(text.toasts.exportedJson);
  }, [buildDiagram, notify, text.toasts.exportedJson]);

  const onExportPng = useCallback(async () => {
    const root = canvasRef.current?.querySelector<HTMLElement>(".react-flow");
    if (!root || latest.current.doc.nodes.length === 0) return notify(text.toasts.exportFailed);
    root.dataset.exporting = "true";
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await exportPng(root, flow.getNodesBounds(flow.getNodes()), latest.current.meta.title || text.newDiagramTitle);
      track("architecture-studio", { action: "export-png" });
      notify(text.toasts.exportedPng);
    } catch {
      notify(text.toasts.exportFailed);
    } finally {
      delete root.dataset.exporting;
    }
  }, [flow, notify, text]);

  const onImportFile = useCallback(
    async (file: File) => {
      if (file.size > limits.fileBytes) return setImportError(text.importErrors["too-large"]);
      const parsed = parseDiagramText(await file.text());
      if (!parsed.ok) {
        return setImportError(fill(text.importErrors[parsed.error.code], errorValues(parsed.error)));
      }
      // Always a new diagram: an import never overwrites one saved here.
      const now = new Date().toISOString();
      const diagram = { ...parsed.diagram, id: createId("d"), updatedAt: now };
      const result = library.save(diagram);
      track("architecture-studio", { action: "import" });
      navigateTo(`?diagram=${diagram.id}`, { diagram, notice: "imported", storageError: result.ok ? undefined : result.reason });
    },
    [library, navigateTo, text.importErrors],
  );

  const editCopy = useCallback(() => {
    if (!template) return;
    const now = new Date().toISOString();
    const diagram = toDiagram(
      doc,
      { id: createId("d"), title: fill(text.copyOf, { title: meta.title }).slice(0, limits.title), description: meta.description || undefined, createdAt: now, updatedAt: now },
      viewportRef.current,
    );
    const result = library.save(diagram);
    track("architecture-studio", { action: "copy", template: template.id });
    navigateTo(`?diagram=${diagram.id}`, { diagram, mode: "edit", notice: "copyCreated", storageError: result.ok ? undefined : result.reason });
  }, [template, doc, meta, library, navigateTo, text.copyOf]);

  // ------------------------------------------------------------ flows

  const flows = useMemo(() => template?.flows ?? [], [template]);
  const activeFlow = flowState ? flows.find((current) => current.id === flowState.flowId) : undefined;
  const activeStep = activeFlow && flowState ? activeFlow.steps[flowState.step] : undefined;

  const startFlow = useCallback(
    (flowId: string) => {
      setFlowState({ flowId, step: 0 });
      silent((current) => select(current, []));
      track("architecture-studio", { action: "flow", template: template?.id ?? "", flow: flowId });
      if (narrowScreen()) setLeftOpen(false);
    },
    [silent, template],
  );

  useEffect(() => {
    if (!activeStep) return;
    // The bottom padding keeps the step's nodes clear of the flow panel.
    void flow.fitView({
      nodes: activeStep.nodes.map((id) => ({ id })),
      padding: { top: "48px", left: "48px", right: "48px", bottom: "220px" },
      maxZoom: 1.1,
      duration: reducedMotion() ? 0 : 400,
    });
  }, [activeStep, flow]);

  const view: StudioView = useMemo(
    () => ({
      editable,
      highlight: activeStep ? { nodes: new Set(activeStep.nodes), edges: new Set(activeStep.edges) } : null,
    }),
    [editable, activeStep],
  );

  // ------------------------------------------------------------ shortcuts

  const shortcuts = useRef<(event: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    shortcuts.current = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (document.querySelector("dialog[open]")) return;
      const inField = target?.closest("input, textarea, select, [contenteditable='true']");
      const inWorkspace = !target || target === document.body || workspaceRef.current?.contains(target);
      if (inField || !inWorkspace) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const run = (action: () => void) => {
        event.preventDefault();
        action();
      };
      if (mod && key === "s" && owned) return run(saveNow);
      if (key === "escape") {
        if (flowState) return run(() => setFlowState(null));
        return silent((current) => select(current, []));
      }
      if (!editable) return;
      if (mod && key === "z" && !event.shiftKey) return run(undo);
      if (mod && ((key === "z" && event.shiftKey) || key === "y")) return run(redo);
      if (mod && key === "d") return run(duplicateSelection);
      if (mod && key === "c") return run(copySelection);
      if (mod && key === "v") return run(paste);
      if (key === "delete" || key === "backspace") return run(deleteSelection);
    };
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => shortcuts.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // ------------------------------------------------------------ render data

  const nodeNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const node of doc.nodes) {
      const service = findService(node.data.serviceId);
      names.set(node.id, node.data.label || (service ? serviceName(service, locale) : node.id));
    }
    return names;
  }, [doc.nodes, locale]);

  const edges = useMemo(
    () =>
      doc.edges.map((edge) => {
        const mode = edge.data?.mode ?? "synchronous";
        const key = `${nodeNames.get(edge.source)}|${nodeNames.get(edge.target)}|${edge.data?.label}|${mode}|${locale}`;
        const cached = edgeNames.get(edge);
        if (cached?.key === key) return cached.edge;
        const label = [edge.data?.label, text.modes[mode]].filter(Boolean).join(", ");
        const named = { ...edge, ariaLabel: `${nodeNames.get(edge.source)} → ${nodeNames.get(edge.target)} (${label})` };
        edgeNames.set(edge, { key, edge: named });
        return named;
      }),
    [doc.edges, nodeNames, locale, text.modes],
  );

  const defaultViewport = session.diagram.viewport;
  // Decided once: React Flow fits again whenever this prop is true and nodes change.
  const [fitOnInit] = useState(() => {
    const { viewport, nodes } = session.diagram;
    return Boolean(template) || (nodes.length > 0 && viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1);
  });

  const leftLabel = editable ? text.toolbar.components : flows.length ? text.flows.title : text.outline.title;
  const studioValue = useMemo(() => ({ locale, text, view, actions }), [locale, text, view, actions]);

  return (
    <StudioProvider value={studioValue}>
      <div ref={workspaceRef} className="studio-workspace" data-mode={mode} data-left={leftOpen || undefined} data-right={rightOpen || undefined}>
        <Toolbar
          title={meta.title}
          onTitleChange={(title) => changeMeta({ title })}
          readOnlyTemplate={!owned}
          status={status}
          mode={mode}
          onModeChange={(next) => {
            setMode(next);
            if (next === "edit") setFlowState(null);
          }}
          onEditCopy={editCopy}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          onSave={saveNow}
          onNew={() => navigateTo("?new=1")}
          onTemplates={() => setDialog("templates")}
          onLibrary={() => setDialog("library")}
          onImportFile={(file) => void onImportFile(file)}
          onExportJson={onExportJson}
          onExportPng={() => void onExportPng()}
          leftLabel={leftLabel}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleLeft={() => setLeftOpen(!leftOpen)}
          onToggleRight={() => setRightOpen(!rightOpen)}
          exitTo={exitTo}
        />

        {saved.error && owned && (
          <p className="studio-banner" role="alert">
            {fill(text.storageErrors[saved.error], { max: 50 })}
          </p>
        )}

        <div className="studio-body">
          <aside className="studio-panel studio-panel-left" aria-label={leftLabel} hidden={!leftOpen}>
            <div className="studio-panel-head">
              <div className="studio-tabs" role="tablist" aria-label={leftLabel}>
                <button type="button" role="tab" id="studio-tab-primary" aria-controls="studio-tabpanel" aria-selected={leftTab === "primary"} onClick={() => setLeftTab("primary")}>
                  {editable ? text.palette.title : flows.length ? text.flows.title : text.inspector.title}
                </button>
                <button type="button" role="tab" id="studio-tab-outline" aria-controls="studio-tabpanel" aria-selected={leftTab === "outline"} onClick={() => setLeftTab("outline")}>
                  {text.outline.title}
                </button>
              </div>
              <button type="button" className="studio-icon-button studio-panel-close" aria-label={text.toolbar.closePanel} onClick={() => setLeftOpen(false)}>
                ×
              </button>
            </div>
            <div className="studio-panel-scroll" role="tabpanel" id="studio-tabpanel" aria-labelledby={leftTab === "outline" ? "studio-tab-outline" : "studio-tab-primary"}>
              {leftTab === "outline" ? (
                <Outline nodes={doc.nodes} onFocus={focusNode} />
              ) : editable ? (
                <Palette onAdd={(service) => addService(service)} />
              ) : flows.length ? (
                <FlowList flows={flows} active={flowState} onStart={startFlow} />
              ) : (
                <p className="studio-hint">{text.inspector.readOnly}</p>
              )}
            </div>
          </aside>

          <div className="studio-stage" ref={canvasRef} role="region" aria-label={text.canvas.label}>
            <Canvas
              nodes={doc.nodes}
              edges={edges}
              editable={editable}
              snap={snap}
              minimap={minimap}
              defaultViewport={defaultViewport}
              fitOnInit={fitOnInit}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              onDragStart={onDragStart}
              onDragStop={onDragStop}
              onMoveEnd={(viewport) => {
                viewportRef.current = viewport;
                if (owned) setViewportVersion((version) => version + 1);
              }}
              onDropService={(serviceId, position) => {
                const service = findService(serviceId);
                if (service) addService(service, position);
              }}
              onPaneClick={() => undefined}
            />
            {activeFlow && flowState && (
              <FlowPlayer
                flow={activeFlow}
                step={flowState.step}
                onStep={(step) => setFlowState({ flowId: activeFlow.id, step })}
                onClose={() => setFlowState(null)}
              />
            )}
          </div>

          <aside className="studio-panel studio-panel-right" aria-label={editable ? text.properties.title : text.inspector.title} hidden={!rightOpen}>
            <div className="studio-panel-head">
              <h2 className="label">{editable ? text.properties.title : text.inspector.title}</h2>
              <button type="button" className="studio-icon-button studio-panel-close" aria-label={text.toolbar.closePanel} onClick={() => setRightOpen(false)}>
                ×
              </button>
            </div>
            <div className="studio-panel-scroll">
              {editable ? (
                <PropertiesPanel
                  document={doc}
                  meta={meta}
                  onMetaChange={changeMeta}
                  onNodeChange={(id, patch: Partial<StudioNodeData>, field) => commit((current) => updateNodeData(current, id, patch), `node:${id}:${field}`)}
                  onNodePosition={(id, position) => commit((current) => setNodePosition(current, id, position), `node:${id}:position`)}
                  onNodeParent={(id, parentId) => commit((current) => setParent(current, id, parentId))}
                  onEdgeChange={(id, patch: Partial<StudioEdgeData>, field) => commit((current) => updateEdgeData(current, id, patch), `edge:${id}:${field}`)}
                  onEdgeReverse={(id) => commit((current) => reverseEdge(current, id))}
                  onConnect={(source: string, target: string, connectionMode: ConnectionMode) => {
                    const result = connect(doc, { source, target, mode: connectionMode });
                    if (result && "error" in result) return notify(fill(text.properties.edgeLimit, { max: limits.edges }));
                    if (result) commit(() => result.document);
                  }}
                  onDuplicate={duplicateSelection}
                  onDelete={deleteSelection}
                />
              ) : (
                <Inspector document={doc} description={meta.description} links={template?.links ?? []} onFocus={focusNode} />
              )}
            </div>
          </aside>
        </div>

        <footer className="studio-footer">
          <span>{fill(text.footer.nodes, { count: doc.nodes.length })}</span>
          <span>{fill(text.footer.edges, { count: doc.edges.length })}</span>
          <ZoomReadout template={text.footer.zoom} />
          {editable && (
            <label>
              <input type="checkbox" checked={snap} onChange={(event) => setSnap(event.target.checked)} />
              {text.footer.snap}
            </label>
          )}
          <label className="studio-footer-minimap">
            <input type="checkbox" checked={minimap} onChange={(event) => setMinimap(event.target.checked)} />
            {text.footer.minimap}
          </label>
        </footer>

        <div className="studio-toast" role="status" aria-live="polite">
          {toast && <p key={toast.id}>{toast.message}</p>}
        </div>

        <TemplateDialog
          open={dialog === "templates"}
          onClose={() => setDialog(null)}
          onOpen={(id: TemplateId) => {
            setDialog(null);
            track("architecture-studio", { action: "template", template: id });
            navigateTo(`?template=${id}`);
          }}
        />
        <LibraryDialog
          open={dialog === "library"}
          library={library}
          currentId={owned ? meta.id : null}
          onClose={() => setDialog(null)}
          onOpen={(id) => {
            setDialog(null);
            if (id !== meta.id) navigateTo(`?diagram=${id}`);
          }}
          onDuplicate={(id, title) => {
            const result = library.duplicate(id, { id: createId("d"), title: title.slice(0, limits.title) });
            notify(result.ok ? text.toasts.duplicated : text.storageErrors.unavailable);
          }}
          onRename={(id, title) => {
            if (id === meta.id) changeMeta({ title });
            else library.rename(id, title);
            notify(text.toasts.renamed);
          }}
          onDelete={(id) => {
            library.remove(id);
            notify(text.toasts.deleted);
            if (id === meta.id) {
              deletedRef.current = true;
              navigateTo("");
            }
          }}
        />
        <ErrorDialog open={importError !== null} title={text.importTitle} message={importError ?? ""} onClose={() => setImportError(null)} />
        <ConfirmDialog
          open={blocker.state === "blocked"}
          title={text.dialogs.leave.title}
          message={text.dialogs.leave.body}
          confirmLabel={text.dialogs.leave.confirm}
          onCancel={() => blocker.reset?.()}
          onConfirm={() => blocker.proceed?.()}
        />
      </div>
    </StudioProvider>
  );
}
