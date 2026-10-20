import type { AnalyticsConsent } from "../../analytics/consent";
import { useI18n } from "../../i18n/context";
import "./consent-banner.css";

export function ConsentBanner({ onChoose }: { onChoose: (consent: AnalyticsConsent) => void }) {
  const { messages } = useI18n();
  const text = messages.consent;

  return (
    <section className="consent-banner" aria-labelledby="consent-title">
      <h2 id="consent-title" className="consent-title">
        {text.title}
      </h2>
      <p>{text.body}</p>
      <div className="consent-actions">
        <button type="button" className="consent-button consent-accept" onClick={() => onChoose("granted")}>
          {text.accept}
        </button>
        <button type="button" className="consent-button" onClick={() => onChoose("denied")}>
          {text.decline}
        </button>
      </div>
    </section>
  );
}
