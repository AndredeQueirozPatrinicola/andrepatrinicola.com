import { useId, useState } from "react";

import { findService, serviceName } from "../catalog/services";
import { fill } from "../messages";
import type { EditorDocument, StudioEdgeData, StudioNode, StudioNodeData } from "../model/editor";
import { arrowStyles, connectionModes, limits, tones, type ConnectionMode, type Point } from "../model/types";
import { withDescendants } from "../state/document";
import { ServiceIconView } from "./nodes";
import { useStudio } from "./StudioContext";

export type DiagramFields = { title: string; description: string };

type PropertiesProps = {
  document: EditorDocument;
  meta: DiagramFields;
  onMetaChange: (patch: Partial<DiagramFields>) => void;
  onNodeChange: (id: string, patch: Partial<StudioNodeData>, field: string) => void;
  onNodePosition: (id: string, position: Point) => void;
  onNodeParent: (id: string, parentId: string | null) => void;
  onEdgeChange: (id: string, patch: Partial<StudioEdgeData>, field: string) => void;
  onEdgeReverse: (id: string) => void;
  onConnect: (source: string, target: string, mode: ConnectionMode) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const EDGE_LABELS = ["HTTPS", "REST", "gRPC", "Invoke", "Event", "Publish", "Consume", "Read", "Write", "SQL"];

function nodeName(node: StudioNode, locale: Parameters<typeof serviceName>[1]): string {
  const service = findService(node.data.serviceId);
  return node.data.label || (service ? serviceName(service, locale) : node.id);
}

export function PropertiesPanel(props: PropertiesProps) {
  const { text } = useStudio();
  const nodes = props.document.nodes.filter((node) => node.selected);
  const edges = props.document.edges.filter((edge) => edge.selected);
  const count = nodes.length + edges.length;

  if (count === 0) return <DiagramForm {...props} />;
  if (count > 1) {
    return (
      <div className="studio-props">
        <p>{fill(text.properties.multiple, { count })}</p>
        <div className="studio-props-actions">
          {nodes.length > 0 && (
            <button type="button" className="studio-button" onClick={props.onDuplicate}>
              {text.properties.duplicateSelection}
            </button>
          )}
          <button type="button" className="studio-button" data-variant="danger" onClick={props.onDelete}>
            {text.properties.deleteSelection}
          </button>
        </div>
      </div>
    );
  }
  return nodes.length === 1 ? <NodeForm key={nodes[0].id} node={nodes[0]} {...props} /> : <EdgeForm key={edges[0].id} edgeId={edges[0].id} {...props} />;
}

function DiagramForm({ meta, onMetaChange }: PropertiesProps) {
  const { text } = useStudio();
  const id = useId();
  return (
    <div className="studio-props">
      <p className="studio-hint">{text.properties.nothing}</p>
      <h3 className="label">{text.properties.diagram}</h3>
      <div className="studio-field">
        <label htmlFor={`${id}-description`}>{text.properties.diagramDescription}</label>
        <textarea
          id={`${id}-description`}
          rows={5}
          maxLength={limits.diagramDescription}
          value={meta.description}
          onChange={(event) => onMetaChange({ description: event.target.value })}
        />
      </div>
      <Legend />
    </div>
  );
}

export function Legend() {
  const { text } = useStudio();
  return (
    <div className="studio-legend">
      <h3 className="label">{text.canvas.legend}</h3>
      <ul>
        {connectionModes.map((mode) => (
          <li key={mode} data-mode={mode}>
            <svg width="40" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="40" y2="5" />
            </svg>
            <span>
              <strong>{text.modes[mode]}</strong> {text.modeHints[mode]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NodeForm({ node, document, onNodeChange, onNodePosition, onNodeParent, onConnect, onDuplicate, onDelete }: PropertiesProps & { node: StudioNode }) {
  const { locale, text } = useStudio();
  const id = useId();
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<ConnectionMode>("synchronous");
  const service = findService(node.data.serviceId);
  if (!service) return null;

  const isNote = node.type === "note";
  const blocked = withDescendants(document.nodes, [node.id]);
  const groups = document.nodes.filter((candidate) => candidate.type === "group" && !blocked.has(candidate.id));
  const others = document.nodes.filter((candidate) => candidate.id !== node.id);

  const number = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(-limits.coordinate, Math.min(limits.coordinate, parsed)) : fallback;
  };

  return (
    <div className="studio-props">
      <div className="studio-props-service">
        <ServiceIconView icon={service.icon} size={32} />
        <div>
          <span className="label">{text.properties.service}</span>
          <p>{serviceName(service, locale)}</p>
        </div>
      </div>
      <p className="studio-hint">{service.description[locale]}</p>
      {service.docsUrl && (
        <a className="studio-link" href={service.docsUrl} target="_blank" rel="noreferrer">
          {text.properties.docs}
        </a>
      )}

      <div className="studio-field">
        <label htmlFor={`${id}-label`}>{isNote ? text.properties.noteTitle : text.properties.label}</label>
        <input
          id={`${id}-label`}
          type="text"
          maxLength={limits.label}
          value={node.data.label}
          onChange={(event) => onNodeChange(node.id, { label: event.target.value }, "label")}
        />
      </div>
      <div className="studio-field">
        <label htmlFor={`${id}-description`}>{isNote ? text.properties.noteText : text.properties.description}</label>
        <textarea
          id={`${id}-description`}
          rows={isNote ? 6 : 4}
          maxLength={limits.description}
          value={node.data.description}
          onChange={(event) => onNodeChange(node.id, { description: event.target.value }, "description")}
        />
      </div>
      <div className="studio-field">
        <label htmlFor={`${id}-tone`}>{text.properties.tone}</label>
        <select id={`${id}-tone`} value={node.data.tone} onChange={(event) => onNodeChange(node.id, { tone: event.target.value as StudioNodeData["tone"] }, "tone")}>
          {tones.map((tone) => (
            <option key={tone} value={tone}>
              {text.tones[tone]}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="studio-field studio-position">
        <legend>{text.properties.position}</legend>
        <label>
          X
          <input
            type="number"
            step={16}
            value={Math.round(node.position.x)}
            onChange={(event) => onNodePosition(node.id, { x: number(event.target.value, node.position.x), y: node.position.y })}
          />
        </label>
        <label>
          Y
          <input
            type="number"
            step={16}
            value={Math.round(node.position.y)}
            onChange={(event) => onNodePosition(node.id, { x: node.position.x, y: number(event.target.value, node.position.y) })}
          />
        </label>
      </fieldset>
      <div className="studio-field">
        <label htmlFor={`${id}-group`}>{text.properties.group}</label>
        <select id={`${id}-group`} value={node.parentId ?? ""} onChange={(event) => onNodeParent(node.id, event.target.value || null)}>
          <option value="">{text.properties.noGroup}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {nodeName(group, locale)}
            </option>
          ))}
        </select>
      </div>

      {others.length > 0 && (
        <fieldset className="studio-field studio-connect">
          <legend>{text.properties.connectTitle}</legend>
          <label htmlFor={`${id}-target`}>{text.properties.connectTarget}</label>
          <select id={`${id}-target`} value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">{text.properties.connectChoose}</option>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {nodeName(other, locale)}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-mode`}>{text.properties.connectMode}</label>
          <select id={`${id}-mode`} value={mode} onChange={(event) => setMode(event.target.value as ConnectionMode)}>
            {connectionModes.map((option) => (
              <option key={option} value={option}>
                {text.modes[option]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="studio-button"
            disabled={!target}
            onClick={() => {
              onConnect(node.id, target, mode);
              setTarget("");
            }}
          >
            {text.properties.connect}
          </button>
        </fieldset>
      )}

      <div className="studio-props-actions">
        <button type="button" className="studio-button" onClick={onDuplicate}>
          {text.properties.duplicate}
        </button>
        <button type="button" className="studio-button" data-variant="danger" onClick={onDelete}>
          {text.properties.delete}
        </button>
      </div>
    </div>
  );
}

function EdgeForm({ edgeId, document, onEdgeChange, onEdgeReverse, onDelete }: PropertiesProps & { edgeId: string }) {
  const { locale, text } = useStudio();
  const id = useId();
  const edge = document.edges.find((current) => current.id === edgeId);
  if (!edge) return null;
  const data = edge.data ?? { mode: "synchronous", label: "", arrow: "forward" };
  const source = document.nodes.find((node) => node.id === edge.source);
  const target = document.nodes.find((node) => node.id === edge.target);

  return (
    <div className="studio-props">
      <h3 className="label">{text.properties.edge}</h3>
      <dl className="studio-edge-ends">
        <dt>{text.properties.from}</dt>
        <dd>{source ? nodeName(source, locale) : edge.source}</dd>
        <dt>{text.properties.to}</dt>
        <dd>{target ? nodeName(target, locale) : edge.target}</dd>
      </dl>
      <div className="studio-field">
        <label htmlFor={`${id}-label`}>{text.properties.edgeLabel}</label>
        <input
          id={`${id}-label`}
          type="text"
          list={`${id}-suggestions`}
          maxLength={limits.edgeLabel}
          placeholder={text.properties.edgeLabelHint}
          value={data.label}
          onChange={(event) => onEdgeChange(edge.id, { label: event.target.value }, "label")}
        />
        <datalist id={`${id}-suggestions`}>
          {EDGE_LABELS.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
      </div>
      <fieldset className="studio-field studio-modes">
        <legend>{text.properties.edgeMode}</legend>
        {connectionModes.map((mode) => (
          <label key={mode} data-mode={mode}>
            <input type="radio" name={`${id}-mode`} value={mode} checked={data.mode === mode} onChange={() => onEdgeChange(edge.id, { mode }, "mode")} />
            <span>
              <strong>{text.modes[mode]}</strong>
              <small>{text.modeHints[mode]}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="studio-field">
        <label htmlFor={`${id}-arrow`}>{text.properties.arrow}</label>
        <select id={`${id}-arrow`} value={data.arrow} onChange={(event) => onEdgeChange(edge.id, { arrow: event.target.value as StudioEdgeData["arrow"] }, "arrow")}>
          {arrowStyles.map((arrow) => (
            <option key={arrow} value={arrow}>
              {text.arrows[arrow]}
            </option>
          ))}
        </select>
      </div>
      <div className="studio-props-actions">
        <button type="button" className="studio-button" onClick={() => onEdgeReverse(edge.id)}>
          {text.properties.reverse}
        </button>
        <button type="button" className="studio-button" data-variant="danger" onClick={onDelete}>
          {text.properties.delete}
        </button>
      </div>
    </div>
  );
}
