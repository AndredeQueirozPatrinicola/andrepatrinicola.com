import { useEffect, useRef, useState, type FormEvent } from "react";

import { track } from "../../analytics/umami";
import { useI18n } from "../../i18n/context";
import { readThemePreference } from "../../theme/theme";
import { loadTurnstile } from "./turnstile";

import "./contact-form.css";

const API_URL = import.meta.env.VITE_CONTACT_API_URL;
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const contactFormEnabled = Boolean(API_URL && SITE_KEY);

type Status = "idle" | "sending" | "sent" | "invalid" | "verification" | "busy" | "failed";

const fields = ["name", "email", "subject", "message"] as const;
const limits = { name: 100, email: 254, subject: 150, message: 5000 } as const;

function statusFor(response: Response, invalid: string[]): Status {
  if (response.ok) return "sent";
  if (response.status === 400) return invalid.includes("turnstileToken") ? "verification" : "invalid";
  if (response.status === 429 || response.status === 503) return "busy";
  return "failed";
}

export function ContactForm() {
  const { locale, messages } = useI18n();
  const text = messages.contactForm;
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [widgetFailed, setWidgetFailed] = useState(false);

  useEffect(() => {
    let active = true;

    loadTurnstile()
      .then((turnstile) => {
        if (!active || !widgetRef.current || !SITE_KEY) return;
        const theme = readThemePreference();
        widgetId.current = turnstile.render(widgetRef.current, {
          sitekey: SITE_KEY,
          action: "contact",
          language: locale === "pt" ? "pt-br" : locale,
          theme: theme === "system" ? "auto" : theme,
          size: "flexible",
          callback: setToken,
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {
        if (active) setWidgetFailed(true);
      });

    return () => {
      active = false;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [locale]);

  function resetWidget() {
    setToken("");
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || !API_URL) return;
    if (!token) {
      setStatus("verification");
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      ...Object.fromEntries(fields.map((field) => [field, String(data.get(field) ?? "")])),
      website: String(data.get("website") ?? ""),
      turnstileToken: token,
    };

    setStatus("sending");
    setInvalid([]);

    let next: Status;
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const fieldsInError: string[] =
        response.status === 400 ? ((await response.json().catch(() => ({}))) as { fields?: string[] }).fields ?? [] : [];
      next = statusFor(response, fieldsInError);
      setInvalid(fieldsInError);
      if (next === "sent") form.reset();
    } catch {
      next = "failed";
    }

    setStatus(next);
    resetWidget();
    track("contact-form", { result: next });
  }

  const sending = status === "sending";
  const message = status === "idle" || status === "sending" ? "" : text[status];

  return (
    <form className="contact-form" onSubmit={submit} aria-describedby="contact-form-status">
      <div className="contact-form-row">
        <label className="contact-field">
          <span className="label">{text.name}</span>
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={limits.name}
            aria-invalid={invalid.includes("name") || undefined}
          />
        </label>
        <label className="contact-field">
          <span className="label">{text.email}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={limits.email}
            aria-invalid={invalid.includes("email") || undefined}
          />
        </label>
      </div>

      <label className="contact-field">
        <span className="label">{text.subject}</span>
        <input
          name="subject"
          required
          maxLength={limits.subject}
          aria-invalid={invalid.includes("subject") || undefined}
        />
      </label>

      <label className="contact-field">
        <span className="label">{text.message}</span>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={limits.message}
          aria-invalid={invalid.includes("message") || undefined}
        />
      </label>

      <div className="contact-honeypot" aria-hidden="true">
        <label>
          {text.honeypot}
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={widgetRef} className="contact-widget" />

      <div className="contact-actions">
        <button type="submit" className="contact-submit" disabled={sending} aria-busy={sending}>
          {sending ? text.sending : text.submit}
        </button>
        <p id="contact-form-status" role="status" className="contact-status" data-status={status}>
          {widgetFailed && status === "idle" ? text.widgetFailed : message}
        </p>
      </div>
    </form>
  );
}
