import { useI18n } from "../../i18n/context";

export function SkipLink() {
  const { messages } = useI18n();
  return (
    <a className="skip-link" href="#content">
      {messages.a11y.skipToContent}
    </a>
  );
}
