import { Link } from "react-router";

import { localePath } from "../../../i18n/paths";
import { findService, serviceName } from "../catalog/services";
import type { EditorDocument, StudioNode } from "../model/editor";
import type { TemplateLink } from "../templates/types";
import { Legend } from "./PropertiesPanel";
import { ServiceIconView } from "./nodes";
import { useStudio } from "./StudioContext";

/** Only site paths and https URLs are ever rendered as links. */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//") && !href.includes("\\");
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

type InspectorProps = {
  document: EditorDocument;
  description: string;
  links: TemplateLink[];
  onFocus: (id: string) => void;
};

/** Explore mode's side panel: what the selected component is and how it connects. */
export function Inspector({ document, description, links, onFocus }: InspectorProps) {
  const { locale, text } = useStudio();
  const node = document.nodes.find((current) => current.selected);
  const edge = node ? undefined : document.edges.find((current) => current.selected);
  const byId = new Map(document.nodes.map((current) => [current.id, current]));
  const name = (current: StudioNode | undefined) => {
    if (!current) return "";
    const service = findService(current.data.serviceId);
    return current.data.label || (service ? serviceName(service, locale) : current.id);
  };

  if (node) {
    const service = findService(node.data.serviceId);
    const outgoing = document.edges.filter((current) => current.source === node.id);
    const incoming = document.edges.filter((current) => current.target === node.id);
    const connection = (otherId: string, label: string | undefined, key: string) => (
      <li key={key}>
        <button type="button" className="studio-link-button" onClick={() => onFocus(otherId)}>
          {name(byId.get(otherId))}
        </button>
        {label && <span className="studio-hint"> · {label}</span>}
      </li>
    );
    return (
      <div className="studio-props" aria-live="polite">
        {service && (
          <div className="studio-props-service">
            <ServiceIconView icon={service.icon} size={32} />
            <div>
              <h3 className="studio-inspector-title">{name(node)}</h3>
              <p className="studio-hint">{serviceName(service, locale)}</p>
            </div>
          </div>
        )}
        {node.data.description && <p className="studio-description">{node.data.description}</p>}
        {service && <p className="studio-hint">{service.description[locale]}</p>}
        {service?.docsUrl && (
          <a className="studio-link" href={service.docsUrl} target="_blank" rel="noreferrer">
            {text.properties.docs}
          </a>
        )}
        <h3 className="label">{text.inspector.connections}</h3>
        {outgoing.length === 0 && incoming.length === 0 && <p className="studio-hint">{text.inspector.none}</p>}
        {outgoing.length > 0 && (
          <>
            <h4 className="studio-subhead">{text.inspector.outgoing}</h4>
            <ul className="studio-connections">{outgoing.map((current) => connection(current.target, current.data?.label, current.id))}</ul>
          </>
        )}
        {incoming.length > 0 && (
          <>
            <h4 className="studio-subhead">{text.inspector.incoming}</h4>
            <ul className="studio-connections">{incoming.map((current) => connection(current.source, current.data?.label, current.id))}</ul>
          </>
        )}
      </div>
    );
  }

  if (edge) {
    const mode = edge.data?.mode ?? "synchronous";
    return (
      <div className="studio-props" aria-live="polite">
        <h3 className="label">{text.properties.edge}</h3>
        <p className="studio-inspector-title">{edge.data?.label || text.modes[mode]}</p>
        <dl className="studio-edge-ends">
          <dt>{text.properties.from}</dt>
          <dd>
            <button type="button" className="studio-link-button" onClick={() => onFocus(edge.source)}>
              {name(byId.get(edge.source))}
            </button>
          </dd>
          <dt>{text.properties.to}</dt>
          <dd>
            <button type="button" className="studio-link-button" onClick={() => onFocus(edge.target)}>
              {name(byId.get(edge.target))}
            </button>
          </dd>
        </dl>
        <p className="studio-hint">
          <strong>{text.modes[mode]}</strong>: {text.modeHints[mode]}
        </p>
      </div>
    );
  }

  return (
    <div className="studio-props">
      <p className="studio-hint">{text.inspector.nothing}</p>
      {description && <p className="studio-description">{description}</p>}
      {links.filter((link) => isSafeHref(link.href)).length > 0 && (
        <ul className="studio-links">
          {links
            .filter((link) => isSafeHref(link.href))
            .map((link) => (
              <li key={link.href}>
                {link.href.startsWith("/") ? (
                  <Link className="studio-link" to={localePath(locale, link.href)}>
                    {link.label[locale]}
                  </Link>
                ) : (
                  <a className="studio-link" href={link.href} target="_blank" rel="noreferrer">
                    {link.label[locale]}
                  </a>
                )}
              </li>
            ))}
        </ul>
      )}
      <Legend />
    </div>
  );
}
