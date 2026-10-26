import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import { memo } from "react";

import type { StudioEdge, StudioNode } from "../model/editor";
import { highlightState, useStudio } from "./StudioContext";

type Anchor = { x: number; y: number; position: Position };

type Box = { x: number; y: number; width: number; height: number };

function box(node: InternalNode<StudioNode>): Box {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured.width ?? 0,
    height: node.measured.height ?? 0,
  };
}

function side(from: Box, position: Position): Anchor {
  switch (position) {
    case Position.Left:
      return { x: from.x, y: from.y + from.height / 2, position };
    case Position.Right:
      return { x: from.x + from.width, y: from.y + from.height / 2, position };
    case Position.Top:
      return { x: from.x + from.width / 2, y: from.y, position };
    default:
      return { x: from.x + from.width / 2, y: from.y + from.height, position };
  }
}

/**
 * Sides for a connection without fixed handles ("floating"), recomputed as
 * nodes move: side by side → left/right, otherwise (one above the other)
 * → top/bottom. Orthogonal routes then run in the gaps between columns and
 * rows instead of through the nodes stacked in them.
 */
export function floatingAnchors(source: Box, target: Box): [Anchor, Anchor] {
  const GAP = 8;
  const besideEachOther = source.x + source.width + GAP <= target.x || target.x + target.width + GAP <= source.x;
  if (besideEachOther) {
    const toRight = target.x > source.x;
    return [side(source, toRight ? Position.Right : Position.Left), side(target, toRight ? Position.Left : Position.Right)];
  }
  const below = target.y + target.height / 2 > source.y + source.height / 2;
  return [side(source, below ? Position.Bottom : Position.Top), side(target, below ? Position.Top : Position.Bottom)];
}

function ArrowMarker({ id, reverse = false }: { id: string; reverse?: boolean }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient={reverse ? "auto-start-reverse" : "auto"}>
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
    </marker>
  );
}

export const ArchitectureEdge = memo(function ArchitectureEdge(props: EdgeProps<StudioEdge>) {
  const { id, source, target, data, selected, sourceHandleId, targetHandleId } = props;
  const { view, actions } = useStudio();
  const sourceNode = useInternalNode<StudioNode>(source);
  const targetNode = useInternalNode<StudioNode>(target);

  let start: Anchor = { x: props.sourceX, y: props.sourceY, position: props.sourcePosition };
  let end: Anchor = { x: props.targetX, y: props.targetY, position: props.targetPosition };
  if (sourceNode && targetNode && (!sourceHandleId || !targetHandleId)) {
    const [floatingStart, floatingEnd] = floatingAnchors(box(sourceNode), box(targetNode));
    if (!sourceHandleId) start = floatingStart;
    if (!targetHandleId) end = floatingEnd;
  }

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: start.x,
    sourceY: start.y,
    sourcePosition: start.position,
    targetX: end.x,
    targetY: end.y,
    targetPosition: end.position,
    borderRadius: 10,
    offset: 18,
  });

  const mode = data?.mode ?? "synchronous";
  const arrow = data?.arrow ?? "forward";
  const label = data?.label ?? "";
  const highlight = highlightState(view, "edges", id);
  const endMarker = `studio-arrow-${id}`;
  const startMarker = `studio-arrow-start-${id}`;

  return (
    <g className="studio-edge" data-mode={mode} data-highlight={highlight} data-selected={selected || undefined}>
      <defs>
        {arrow !== "none" && <ArrowMarker id={endMarker} />}
        {arrow === "both" && <ArrowMarker id={startMarker} reverse />}
      </defs>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        markerEnd={arrow !== "none" ? `url(#${endMarker})` : undefined}
        markerStart={arrow === "both" ? `url(#${startMarker})` : undefined}
      />
      {label && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="studio-edge-label nodrag nopan"
            data-mode={mode}
            data-highlight={highlight}
            data-selected={selected || undefined}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            tabIndex={-1}
            onClick={() => actions.selectEdge(id)}
          >
            {label}
          </button>
        </EdgeLabelRenderer>
      )}
    </g>
  );
});

export const edgeTypes = { architecture: ArchitectureEdge };
