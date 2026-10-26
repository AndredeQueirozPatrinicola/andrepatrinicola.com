/**
 * Custom React Flow nodes. Labels and descriptions are rendered as React
 * text (never as HTML); icons come only from the catalog.
 */
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { findService, serviceName, type ServiceIcon } from "../catalog/services";
import { GenericIcon } from "../catalog/generic-icons";
import type { StudioNode } from "../model/editor";
import { limits } from "../model/types";
import { highlightState, useStudio } from "./StudioContext";

export function ServiceIconView({ icon, size = 40 }: { icon: ServiceIcon; size?: number }) {
  if (icon.type === "aws") {
    return <img className="studio-icon" src={icon.src} alt="" width={size} height={size} draggable={false} />;
  }
  return (
    <span className="studio-icon studio-icon-generic" style={{ width: size, height: size }}>
      <GenericIcon name={icon.name} size={Math.round(size * 0.6)} />
    </span>
  );
}

const sides = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

/** Four connection points; in loose mode each one can start or end a connection. */
function Handles({ editable }: { editable: boolean }) {
  return (
    <>
      {sides.map((side) => (
        <Handle key={side.id} id={side.id} type="source" position={side.position} isConnectable={editable} className="studio-handle" />
      ))}
    </>
  );
}

export const ServiceNode = memo(function ServiceNode({ id, data, selected }: NodeProps<StudioNode>) {
  const { locale, view } = useStudio();
  const service = findService(data.serviceId);
  if (!service) return null;
  const name = serviceName(service, locale);
  const showName = data.label.trim().toLowerCase() !== name.toLowerCase();

  return (
    <div className="studio-node" data-tone={data.tone} data-highlight={highlightState(view, "nodes", id)} data-selected={selected || undefined}>
      <Handles editable={view.editable} />
      <ServiceIconView icon={service.icon} />
      <div className="studio-node-text">
        <span className="studio-node-label">{data.label || name}</span>
        {showName && <span className="studio-node-service">{name}</span>}
      </div>
      {data.description && <span className="studio-node-more" aria-hidden="true" />}
    </div>
  );
});

function Resizer({ visible, minWidth, minHeight }: { visible: boolean; minWidth: number; minHeight: number }) {
  const { actions } = useStudio();
  return (
    <NodeResizer
      isVisible={visible}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={limits.maxSize}
      maxHeight={limits.maxSize}
      lineClassName="studio-resize-line"
      handleClassName="studio-resize-handle"
      onResizeStart={actions.resizeStart}
      onResizeEnd={actions.resizeEnd}
    />
  );
}

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps<StudioNode>) {
  const { locale, view } = useStudio();
  const service = findService(data.serviceId);
  if (!service) return null;

  return (
    <div
      className="studio-group"
      data-frame={service.frame ?? "dashed"}
      data-service={service.id}
      data-tone={data.tone}
      data-highlight={highlightState(view, "nodes", id)}
    >
      <Resizer visible={Boolean(selected) && view.editable} minWidth={160} minHeight={120} />
      <Handles editable={view.editable} />
      <div className="studio-group-head">
        <ServiceIconView icon={service.icon} size={24} />
        <span>{data.label || serviceName(service, locale)}</span>
      </div>
    </div>
  );
});

export const NoteNode = memo(function NoteNode({ id, data, selected }: NodeProps<StudioNode>) {
  const { view } = useStudio();
  return (
    <div className="studio-note" data-tone={data.tone} data-highlight={highlightState(view, "nodes", id)}>
      <Resizer visible={Boolean(selected) && view.editable} minWidth={120} minHeight={60} />
      <Handles editable={view.editable} />
      {data.label && <strong className="studio-note-title">{data.label}</strong>}
      {data.description && <p className="studio-note-body">{data.description}</p>}
    </div>
  );
});

export const nodeTypes = { service: ServiceNode, group: GroupNode, note: NoteNode };
