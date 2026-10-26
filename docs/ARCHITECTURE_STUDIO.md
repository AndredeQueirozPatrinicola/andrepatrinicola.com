# Cloud Architecture Studio

An AWS architecture diagram editor at `/{pt,en,es}/labs/architecture-studio`
(`apps/site/src/features/architecture-studio/`). Visitors draw with AWS
services and generic system design elements, explore ready-made
architectures (this portfolio's real one first) with guided flows, save in
their browser and export JSON or PNG.

It is 100% client-side: no backend, no account, no AWS call. Nothing a
visitor does in the editor costs anything.

## 1. Pieces

| Concern | Where | Notes |
| --- | --- | --- |
| Start page (pre-rendered) | `routes/lab-architecture-studio.tsx`, `StartPanel.tsx`, `architecture-studio.css` | Intro, start options, template list. No React Flow, no Zod. |
| Lazy entry | `StudioLoader.tsx` → `components/Workspace.tsx` | `React.lazy`; chunk errors show a retry. |
| Editor | `components/Editor.tsx` | State, persistence, shortcuts, layout. |
| Canvas | `components/Canvas.tsx`, `nodes.tsx`, `ArchitectureEdge.tsx` | React Flow wrapper and custom nodes/edges. |
| Side panels | `Palette.tsx`, `Outline.tsx`, `PropertiesPanel.tsx`, `Inspector.tsx`, `Flows.tsx` | Edit mode: catalog + properties. Explore mode: flows + details. |
| File format | `model/types.ts`, `model/schema.ts`, `model/convert.ts` | Versioned JSON, Zod validation, explicit conversion. |
| Editing rules | `state/document.ts`, `state/history.ts` | Pure functions, tested without a browser. |
| Persistence | `persistence/library.ts`, `persistence/last.ts` | localStorage. |
| Exports | `export/files.ts` | JSON and PNG. |
| Catalog | `catalog/services.ts`, `catalog/aws-icons/`, `catalog/generic-icons.tsx` | Typed entries; icons. |
| Templates | `templates/*.ts` | Diagrams + guided flows. |
| Texts | `messages.ts` | PT/EN/ES, sent only by this page's loader. |

## 2. Graph library

[React Flow](https://reactflow.dev/) (`@xyflow/react` 12) renders the canvas
and handles nodes, connections, drag, zoom, pan, selection, handles,
resizing (`NodeResizer`), the minimap and keyboard moves. The editor does not
reimplement any of that; it only decides what the nodes and connections
mean and how edits are recorded.

The React Flow attribution stays visible, as its license asks of
non-subscribers.

## 3. Nodes and connections

Three node kinds, chosen by the catalog entry (`kind`), never by the label:

- **service**: an AWS service or a generic element (user, browser, server,
  database, external service…). Sizes itself to its content (184 px wide).
- **group**: Region, Availability Zone, VPC, subnets, AWS Cloud or a free
  group. Resizable; other nodes can live inside it (`parentId`, positions
  relative to the group, nesting up to 8 levels). Dropping a node over a
  group puts it inside; dragging it out takes it out (`reparentDropped`).
  Groups are always drawn behind services (`zIndex` −1000).
- **note**: free text, resizable.

Every node has a random id (`n-…`), a `serviceId`, a label, an optional
description and an accent `tone` from a fixed palette (never a free CSS
value).

Connections (`e-…`) have a `mode` (`synchronous` solid, `asynchronous`
dashed, `data-flow` dotted), a label (suggestions: HTTPS, REST, Invoke,
Event, Publish, Consume, Read, Write…) and arrowheads (`forward`, `both`,
`none`); "Swap source and target" reverses them. Any node can connect to any
other: the editor does not judge architectures. Loops and exact duplicates
are refused.

A connection dragged onto a connection point keeps that side
(`sourceHandle`/`targetHandle`). Dropped anywhere else on a component, or
created from the properties panel, it is **floating**: its sides are
recomputed as nodes move (`floatingAnchors`: side by side → left/right,
otherwise top/bottom), so routes run in the gaps between columns instead of
through stacked nodes.

## 4. State

`EditorDocument` (`model/editor.ts`) is the editor's working state: React
Flow nodes and edges carrying our typed `data`. There is one copy of it, in
the history reducer; React Flow is fully controlled. Selection lives in the
same objects (React Flow needs it) but is never saved.

What is not document state stays out of it: title/description (`meta`),
mode, panels, the active flow and highlight (`StudioContext`, read by the
custom nodes), the viewport (a ref, saved with the diagram) and the
in-memory clipboard.

## 5. Undo/redo

`state/history.ts` keeps up to 100 snapshots of the document. Three kinds of
change:

- `commit`: one editorial step (add, delete, connect, duplicate, reparent,
  property edit). Consecutive commits with the same `key` merge, so typing a
  name (`node:<id>:label`) or pressing arrow keys on a node is a single step.
- `transient`: a drag or a resize in progress. The state before the gesture
  is kept as `base`; the commit at drag stop (which also reparents) or the
  `checkpoint` at resize end records the whole gesture as one step. Nothing
  is stored per pixel.
- `silent`: selection and React Flow measurements. Never recorded.

Panning and zooming never touch the history.

## 6. Local persistence

Diagrams are saved in `localStorage`, one key per diagram
(`architecture-studio:v1:diagram:<id>`), plus `…:last` for "Continue" on the
start page. A large diagram is ~100 KB, so the usual 5 MB quota is enough
and IndexedDB would add complexity without a concrete benefit. At most 50
diagrams are kept.

- **Autosave**: 800 ms after the last change; also on `pagehide` and when the
  editor unmounts. The toolbar shows *Saving… / Saved in this browser / Not
  saved*.
- **Failures** (private mode, full quota, blocked site data, the 50 limit)
  are reported, never thrown: a banner explains what happened, editing goes
  on in memory, leaving the page asks for confirmation (`beforeunload` and a
  router blocker) until the JSON is exported.
- **Reads are untrusted**: every stored diagram goes through the same
  validation as an imported file. Corrupt records are listed as unreadable
  and can be deleted.
- *My diagrams* opens, duplicates, renames and deletes (with confirmation).
  Templates are never saved: *Edit a copy* creates a new diagram.

Diagrams opened from history state (a copy, an import, a new diagram) are
validated too, so they still open when storage is unavailable.

## 7. File format and import

```ts
type ArchitectureDiagram = {
  schemaVersion: 1;
  id: string; title: string; description?: string;
  createdAt: string; updatedAt: string;          // ISO 8601
  nodes: { id; serviceId; label; description?; position: { x; y };
           parentId?; size?: { width; height }; tone? }[];
  edges: { id; source; target; sourceHandle?; targetHandle?;
           label?; mode; arrow? }[];
  viewport: { x; y; zoom };
};
```

`model/schema.ts` validates with Zod (`zod/mini`, smaller bundle), then
checks what a schema cannot: unique ids across nodes and edges, known
`serviceId`s, connections and parents that exist, parents that are groups, no
cycles, nesting depth. Limits: 1 MB file, 300 nodes, 600 connections, 80
characters per label, 2,000 per description, coordinates within ±1,000,000,
zoom 0.05–4. Control and bidi-override characters are stripped. Unknown
fields are dropped. Element counts are checked before parsing each element.

Errors have codes (`invalid-json`, `unsupported-version`, `missing-node`…)
translated in `messages.ts`; a file from a newer `schemaVersion` says so.
Labels and descriptions are rendered as React text, never HTML; links only
come from the catalog and templates (`https:` or site paths, `isSafeHref`).

Import always creates a **new** diagram (new id), so it never overwrites one
saved in the browser. `toEditor`/`toDiagram` (`model/convert.ts`) are the
only bridge between the format and React Flow; positions are rounded to
0.01 px.

## 8. Exports

- **JSON**: the current diagram (`<title>.architecture.json`), importable
  again with everything preserved (nodes, groups, connections, positions,
  texts, viewport).
- **PNG**: `html-to-image` (loaded on demand) renders React Flow's viewport
  element with a transform that frames the bounds of **all** nodes, at 1:1
  (scaled down only past 4,096 px) with a 48 px margin and 2× pixel ratio,
  on the theme's background color. Handles and resize controls are filtered
  out; flow highlighting is disabled during the capture. Icons are local
  files and fonts are same-origin, so nothing external is fetched.
- **SVG: not offered.** `html-to-image` would wrap the HTML nodes in
  `<foreignObject>`, which design tools (Illustrator, Inkscape, Figma import)
  do not render; it would not be a usable SVG.

## 9. Catalog

`catalog/services.ts` is the single list of components: semantic id, official
name (AWS names are never translated; generic ones have `localName`), short
name (default label), category, kind, icon, description (PT/EN/ES),
official documentation link, default size and frame style for groups.
Components refer to entries only by id; nothing in the UI branches on names.

To add a service: put its SVG in `catalog/aws-icons/` (see below) and add an
entry. A diagram using a `serviceId` that is not in the catalog is rejected
on import, so never remove or rename an id.

**Icons**: the AWS files are the official AWS Architecture Icons (release
04302026), unmodified, under CC-BY-ND 2.0, as documented in
`catalog/aws-icons/NOTICE.md` (attribution also on the start page). Only the
~30 icons the catalog uses are included. Bedrock Knowledge Bases and S3
Vectors have no icon of their own and use Bedrock's and S3's. Generic
components use 9×9 pixel icons in the site's style.

## 10. Templates

A template (`templates/<id>.ts`) has nodes with **absolute** positions
(`at`) and an optional group (`in`), connections, guided flows and links.
`instantiateTemplate` turns it into a diagram in the visitor's language
(relative positions inside groups). Title, description and category live in
`messages.ts` (the start page shows them without loading the template).

To add one: create the file, add it to `templates/index.ts`, add its summary
to the three dictionaries in `messages.ts` and its id to `TemplateId` and to
`TEMPLATE_ORDER` in `StartPanel.tsx`. `templates.test.ts` checks that it is a
valid diagram in every language, that children fit inside their groups and
that flows refer to existing nodes and connections, with both ends of every
lit connection lit.

A flow step lists the node and connection ids to highlight and a short text
in three languages. Flows only highlight and frame the step; they never
change the diagram.

## 11. Updating the portfolio template

`templates/portfolio.ts` must match the code, not intentions. Sources: this
repository (`infra/`, `.github/workflows/deploy.yml`) and the API repository
(`infra/*.tf`, `docs/PORTFOLIO_STUDIO_ARCHITECTURE.md`, `docs/AI_ASSISTANT.md`).
When the infrastructure changes:

1. Add, remove or rename nodes and connections, and fix the descriptions.
2. Keep it conceptual: no account ids, ARNs, bucket or table names,
   endpoints or security settings (a test rejects ARNs, 12-digit numbers and
   AWS hostnames).
3. Keep connections out of nodes: open the template, check that no line
   crosses a component (move nodes into the gaps or set `from`/`to` sides).
4. Update the flows that go through what changed, then run
   `npm test --workspace @andrepatrinicola/site`.

Not represented on purpose: the queue lab (off by default and admin-only; it
has its own template), Budgets, CloudWatch connections (one log group per
Lambda, noted in the node), Route 53 (DNS is not managed in either
repository).

## 12. Performance

- The pre-rendered start page adds ~2.6 KB gzip of JS and 1 KB of CSS.
- The editor is one lazy chunk (~90 KB gzip with React Flow) plus the
  catalog, icons and Zod (~33 KB gzip), downloaded only when a diagram opens.
  `html-to-image` (~5 KB gzip) loads on the first PNG export.
- Custom nodes and edges are memoized; edge accessible names are cached per
  edge object; the zoom readout subscribes to React Flow's store alone.
- No network request while editing; saving is debounced.

## 13. Known limitations

- The canvas is spatial: placing and dragging need a pointer. Keyboard
  alternatives cover the rest: catalog buttons add components, the
  properties panel connects them (target + type), arrow keys move a focused
  node, X/Y fields position it, *In this diagram* lists and selects every
  component, flows are buttons, and shortcuts exist for undo (Ctrl/⌘+Z),
  redo (Ctrl/⌘+Shift+Z, Ctrl+Y), save (Ctrl/⌘+S), duplicate (Ctrl/⌘+D),
  copy/paste (Ctrl/⌘+C/V) and delete (Delete).
- Diagrams live in one browser; clearing site data deletes them.
- Copy/paste works inside the editor (not between tabs or apps).
- Connections are orthogonal routes without obstacle avoidance; large
  diagrams need some manual layout.
- The PNG uses the current theme (light or dark).
- On phones the editor is usable for exploring, small edits and exports;
  drawing a large diagram is a desktop task.

## 14. Possible next steps (not implemented)

Sharing by link, cloud storage and version history (would need the API),
collaboration, SVG/Mermaid export, Terraform import, cost estimates, best
practice checks, AI-assisted review. The versioned format and the catalog ids
are what these would build on.

## Using it

1. Open `/en/labs/architecture-studio` and pick a start option.
2. **Edit**: click or drag components from the left panel; drag between the
   points on a component's border (or onto another component) to connect;
   select anything to edit it on the right.
3. **Explore**: pick a guided flow on the left, step through it at the
   bottom; select a component to read about it and jump to its connections.
4. **File**: new, templates, my diagrams, import/export JSON, export PNG.

Run locally with `npm run dev` (then open the URL above), or `npm run build`
and `npm run preview`. Tests: `npm test --workspace @andrepatrinicola/site`
(model, history, persistence, templates) and `npm run test:e2e`
(`e2e/architecture-studio*.spec.ts`: page, explore, edit, files,
accessibility, mobile).
