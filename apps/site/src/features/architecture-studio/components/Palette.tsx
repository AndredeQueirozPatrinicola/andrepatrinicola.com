import { useId, useMemo, useState, type DragEvent } from "react";

import { categories, serviceName, services, type ServiceDefinition } from "../catalog/services";
import { fill } from "../messages";
import { SERVICE_DRAG_TYPE } from "./Canvas";
import { ServiceIconView } from "./nodes";
import { useStudio } from "./StudioContext";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * The component catalog. Every entry is a button: click (or Enter) adds it
 * to the middle of the canvas, dragging drops it where the pointer is.
 */
export function Palette({ onAdd }: { onAdd: (service: ServiceDefinition) => void }) {
  const { locale, text } = useStudio();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const hintId = useId();

  const groups = useMemo(() => {
    const needle = normalize(query.trim());
    return categories
      .map((category) => ({
        category,
        items: services.filter(
          (service) =>
            service.category === category &&
            (!needle ||
              normalize(`${serviceName(service, locale)} ${service.shortName} ${service.name} ${service.description[locale]}`).includes(needle)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, locale]);

  function onDragStart(event: DragEvent, service: ServiceDefinition) {
    event.dataTransfer.setData(SERVICE_DRAG_TYPE, service.id);
    event.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className="studio-palette">
      <label className="visually-hidden" htmlFor={searchId}>
        {text.palette.search}
      </label>
      <input
        id={searchId}
        className="studio-search"
        type="search"
        placeholder={text.palette.search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-describedby={hintId}
      />
      <p id={hintId} className="studio-hint">
        {text.palette.hint}
      </p>
      {groups.length === 0 && <p className="studio-hint">{text.palette.empty}</p>}
      {groups.map(({ category, items }) => (
        <section key={category} className="studio-palette-group" aria-labelledby={`${searchId}-${category}`}>
          <h3 id={`${searchId}-${category}`} className="label">
            {text.categories[category]}
          </h3>
          <ul>
            {items.map((service) => {
              const name = serviceName(service, locale);
              return (
                <li key={service.id}>
                  <button
                    type="button"
                    className="studio-palette-item"
                    draggable
                    onDragStart={(event) => onDragStart(event, service)}
                    onClick={() => onAdd(service)}
                    aria-label={fill(text.palette.add, { name })}
                    title={service.description[locale]}
                    data-service={service.id}
                  >
                    <ServiceIconView icon={service.icon} size={28} />
                    <span>{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
