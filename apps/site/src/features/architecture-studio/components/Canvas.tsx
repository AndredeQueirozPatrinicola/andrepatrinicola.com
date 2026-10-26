import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import { useMemo, type DragEvent } from "react";

import { isServiceId } from "../catalog/services";
import { fill } from "../messages";
import type { StudioEdge, StudioNode } from "../model/editor";
import { limits } from "../model/types";
import { edgeTypes } from "./ArchitectureEdge";
import { nodeTypes } from "./nodes";
import { useStudio } from "./StudioContext";

export const SERVICE_DRAG_TYPE = "application/x-architecture-service";
export const GRID = 16;

type CanvasProps = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  editable: boolean;
  snap: boolean;
  minimap: boolean;
  defaultViewport: Viewport;
  fitOnInit: boolean;
  onNodesChange: (changes: NodeChange<StudioNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StudioEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent, state: FinalConnectionState) => void;
  onDragStart: () => void;
  onDragStop: (nodes: StudioNode[]) => void;
  onMoveEnd: (viewport: Viewport) => void;
  onDropService: (serviceId: string, position: { x: number; y: number }) => void;
  onPaneClick: () => void;
};

export function Canvas(props: CanvasProps) {
  const { text } = useStudio();
  const flow = useReactFlow<StudioNode, StudioEdge>();
  const a11y = text.canvas.a11y;

  const ariaLabelConfig = useMemo(
    () => ({
      "node.a11yDescription.default": a11y.node,
      "node.a11yDescription.keyboardDisabled": a11y.nodeKeyboardDisabled,
      "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }: { direction: string; x: number; y: number }) =>
        fill(a11y.moved, { direction, x, y }),
      "edge.a11yDescription.default": a11y.edge,
      "controls.ariaLabel": a11y.controls,
      "controls.zoomIn.ariaLabel": a11y.zoomIn,
      "controls.zoomOut.ariaLabel": a11y.zoomOut,
      "controls.fitView.ariaLabel": a11y.fitView,
      "controls.interactive.ariaLabel": a11y.interactive,
      "minimap.ariaLabel": a11y.minimap,
      "handle.ariaLabel": a11y.handle,
    }),
    [a11y],
  );

  function onDragOver(event: DragEvent) {
    if (!props.editable || !event.dataTransfer.types.includes(SERVICE_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: DragEvent) {
    const serviceId = event.dataTransfer.getData(SERVICE_DRAG_TYPE);
    if (!props.editable || !isServiceId(serviceId)) return;
    event.preventDefault();
    props.onDropService(serviceId, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }

  return (
    <div className="studio-canvas" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<StudioNode, StudioEdge>
        nodes={props.nodes}
        edges={props.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={props.onNodesChange}
        onEdgesChange={props.onEdgesChange}
        onConnect={props.onConnect}
        onConnectEnd={props.onConnectEnd}
        onNodeDragStart={props.onDragStart}
        onNodeDragStop={(_event, _node, nodes) => props.onDragStop(nodes)}
        onSelectionDragStart={props.onDragStart}
        onSelectionDragStop={(_event, nodes) => props.onDragStop(nodes)}
        onMoveEnd={(_event, viewport) => props.onMoveEnd(viewport)}
        onPaneClick={props.onPaneClick}
        defaultViewport={props.defaultViewport}
        fitView={props.fitOnInit}
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.1}
        maxZoom={limits.maxZoom}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesDraggable={props.editable}
        nodesConnectable={props.editable}
        edgesReconnectable={false}
        elementsSelectable
        // Deleting goes through the editor (one undo step, children included).
        deleteKeyCode={null}
        elevateNodesOnSelect={false}
        snapToGrid={props.snap}
        snapGrid={[GRID, GRID]}
        zIndexMode="auto"
        ariaLabelConfig={ariaLabelConfig}
        aria-label={text.canvas.label}
      >
        <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} className="studio-grid" />
        <Controls showInteractive={false} position="bottom-left" />
        {props.minimap && <MiniMap pannable zoomable position="bottom-right" className="studio-minimap" ariaLabel={a11y.minimap} nodeClassName={(node) => `studio-minimap-${node.type}`} />}
      </ReactFlow>
      {props.nodes.length === 0 && (
        <div className="studio-empty" role="note">
          <strong>{text.canvas.emptyTitle}</strong>
          <p>{text.canvas.emptyBody}</p>
        </div>
      )}
    </div>
  );
}
