import { findService, serviceName } from "../catalog/services";
import type { StudioNode } from "../model/editor";
import { fill } from "../messages";
import { ServiceIconView } from "./nodes";
import { useStudio } from "./StudioContext";

type OutlineProps = {
  nodes: StudioNode[];
  onFocus: (id: string) => void;
};

type Tree = { node: StudioNode; children: Tree[] };

function buildTree(nodes: StudioNode[]): Tree[] {
  const byParent = new Map<string | undefined, StudioNode[]>();
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    const parent = node.parentId !== undefined && ids.has(node.parentId) ? node.parentId : undefined;
    byParent.set(parent, [...(byParent.get(parent) ?? []), node]);
  }
  const visit = (parent: string | undefined, depth: number): Tree[] =>
    depth > 10 ? [] : (byParent.get(parent) ?? []).map((node) => ({ node, children: visit(node.id, depth + 1) }));
  return visit(undefined, 0);
}

/**
 * The diagram as a nested list: a keyboard and screen reader friendly way
 * to find and select anything on the canvas.
 */
export function Outline({ nodes, onFocus }: OutlineProps) {
  const { locale, text } = useStudio();
  if (nodes.length === 0) return <p className="studio-hint">{text.outline.empty}</p>;

  const render = (items: Tree[]) => (
    <ul>
      {items.map(({ node, children }) => {
        const service = findService(node.data.serviceId);
        const label = node.data.label || (service ? serviceName(service, locale) : node.id);
        return (
          <li key={node.id}>
            <button
              type="button"
              className="studio-outline-item"
              aria-current={node.selected || undefined}
              aria-label={fill(text.outline.focus, { label })}
              onClick={() => onFocus(node.id)}
            >
              {service && <ServiceIconView icon={service.icon} size={20} />}
              <span>{label}</span>
            </button>
            {children.length > 0 && render(children)}
          </li>
        );
      })}
    </ul>
  );

  return <nav className="studio-outline" aria-label={text.outline.title}>{render(buildTree(nodes))}</nav>;
}
