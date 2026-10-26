/**
 * The start screen, part of the pre-rendered page. Light on purpose: no
 * React Flow, no schema; importing a file loads the validator on demand.
 */
import { useId, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";

import { PixelIcon } from "../../components/ui/PixelIcon";
import { fill, type StudioMessages, type TemplateId } from "./messages";
import { defaultStorage, LAST_KEY, lastDiagram } from "./persistence/last";

const TEMPLATE_ORDER: TemplateId[] = ["portfolio", "serverless-api", "async-processing", "web-application"];
const MAX_FILE_BYTES = 1_000_000;

const noSubscription = () => () => undefined;

/** The "last diagram" record as a string: stable between renders, null on the server. */
function useLastDiagramRecord(): string | null {
  return useSyncExternalStore(
    noSubscription,
    () => {
      try {
        return defaultStorage()?.getItem(LAST_KEY) ?? null;
      } catch {
        return null;
      }
    },
    () => null,
  );
}

export function StartPanel({ text }: { text: StudioMessages }) {
  const navigate = useNavigate();
  const record = useLastDiagramRecord();
  const last = record ? lastDiagram() : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) return setError(text.importErrors["too-large"]);
    setBusy(true);
    try {
      const [{ parseDiagramText, errorValues }, { createLibrary }, { createId }, { track }] = await Promise.all([
        import("./model/schema"),
        import("./persistence/library"),
        import("./model/ids"),
        import("../../analytics/umami"),
      ]);
      const parsed = parseDiagramText(await file.text());
      if (!parsed.ok) {
        setError(fill(text.importErrors[parsed.error.code], errorValues(parsed.error)));
        return;
      }
      const diagram = { ...parsed.diagram, id: createId("d"), updatedAt: new Date().toISOString() };
      const saved = createLibrary().save(diagram);
      track("architecture-studio", { action: "import" });
      navigate(`?diagram=${diagram.id}`, { state: { diagram, notice: "imported", storageError: saved.ok ? undefined : saved.reason } });
    } catch {
      setError(text.start.loadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="as-start" aria-labelledby="as-start-title">
      <h2 id="as-start-title" className="label">
        {text.start.title}
      </h2>
      <ul className="as-start-options">
        <li className="as-start-primary">
          <Link to="?template=portfolio">
            <strong>{text.start.portfolio}</strong>
            <span>{text.start.portfolioHint}</span>
            <PixelIcon name="arrow" size={14} />
          </Link>
        </li>
        <li>
          <Link to="?new=1">
            <strong>{text.start.blank}</strong>
            <span>{text.start.blankHint}</span>
          </Link>
        </li>
        <li>
          <button type="button" onClick={() => inputRef.current?.click()} aria-describedby={error ? errorId : undefined} aria-busy={busy || undefined}>
            <strong>{text.start.open}</strong>
            <span>{text.start.openHint}</span>
          </button>
          <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={onFile} data-testid="start-import-input" />
        </li>
        {last && (
          <li>
            <Link to={`?diagram=${last.id}`}>
              <strong>{fill(text.start.continue, { title: last.title })}</strong>
              <span>{text.start.continueHint}</span>
            </Link>
          </li>
        )}
      </ul>
      {error && (
        <p id={errorId} className="as-start-error" role="alert">
          <strong>{text.importTitle}.</strong> {error}
        </p>
      )}

      <h3 className="label as-start-templates">{text.start.template}</h3>
      <p className="as-start-hint">{text.start.templateHint}</p>
      <ul className="as-templates">
        {TEMPLATE_ORDER.map((id) => (
          <li key={id}>
            <Link to={`?template=${id}`}>
              <span className="as-template-category">{text.templates[id].category}</span>
              <strong>{text.templates[id].title}</strong>
              <span>{text.templates[id].description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
