import { fill } from "../messages";
import type { TemplateFlow } from "../templates/types";
import { useStudio } from "./StudioContext";

export type FlowState = { flowId: string; step: number } | null;

export function FlowList({ flows, active, onStart }: { flows: TemplateFlow[]; active: FlowState; onStart: (flowId: string) => void }) {
  const { locale, text } = useStudio();
  return (
    <div className="studio-flows">
      <p className="studio-hint">{text.flows.intro}</p>
      <ol>
        {flows.map((flow) => (
          <li key={flow.id}>
            <button
              type="button"
              className="studio-flow-item"
              aria-current={active?.flowId === flow.id || undefined}
              onClick={() => onStart(flow.id)}
            >
              <span>{flow.title[locale]}</span>
              <span className="studio-hint">{fill(text.flows.steps, { count: flow.steps.length })}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

type PlayerProps = {
  flow: TemplateFlow;
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
};

/** One step of a guided flow over the canvas. It only highlights: the diagram never changes. */
export function FlowPlayer({ flow, step, onStep, onClose }: PlayerProps) {
  const { locale, text } = useStudio();
  const current = flow.steps[step];
  const last = flow.steps.length - 1;
  return (
    <section className="studio-player" aria-label={text.flows.label}>
      <header>
        <h2>{flow.title[locale]}</h2>
        <span className="label">{fill(text.flows.step, { step: step + 1, total: flow.steps.length })}</span>
      </header>
      <p aria-live="polite">{current.text[locale]}</p>
      <div className="studio-player-controls">
        <button type="button" className="studio-button" disabled={step === 0} onClick={() => onStep(step - 1)}>
          {text.flows.previous}
        </button>
        <button type="button" className="studio-button" data-variant="primary" disabled={step === last} onClick={() => onStep(step + 1)}>
          {text.flows.next}
        </button>
        <button type="button" className="studio-button" onClick={onClose}>
          {text.flows.close}
        </button>
      </div>
    </section>
  );
}
