import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router";

import { track } from "../../analytics/umami";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { useI18n } from "../../i18n/context";
import { readThemePreference } from "../../theme/theme";
import { loadTurnstile } from "../contact/turnstile";
import { AnswerText } from "./AnswerText";
import { askAssistant, MAX_QUESTION_CHARS, TURNSTILE_SITE_KEY, type ChatErrorKind, type Source } from "./api";
import { emptyConversation, type ChatMessage, type Conversation } from "./conversation";

type Props = {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onChange: (next: Conversation) => void;
};

let nextId = 1;

function SourceLink({ source }: { source: Source }) {
  const url = new URL(source.url);
  const onClick = () => track("assistant-source", { type: source.type });
  // Pages of this origin open inside the app, so the conversation stays on screen.
  if (typeof window !== "undefined" && url.origin === window.location.origin) {
    return (
      <Link to={`${url.pathname}${url.hash}`} onClick={onClick}>
        {source.title}
      </Link>
    );
  }
  return (
    <a href={url.toString()} onClick={onClick}>
      {source.title}
    </a>
  );
}

export default function AssistantPanel({ open, onClose, conversation, onChange }: Props) {
  const { locale, messages } = useI18n();
  const text = messages.assistant;
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatErrorKind | "tooLong" | null>(null);
  const [token, setToken] = useState("");
  const [widgetFailed, setWidgetFailed] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Always the latest conversation (requests finish after re-renders).
  const latest = useRef(conversation);
  useEffect(() => {
    latest.current = conversation;
  }, [conversation]);

  // Turnstile, rendered once the panel exists; it only shows itself if the visitor must interact.
  useEffect(() => {
    let active = true;
    loadTurnstile()
      .then((turnstile) => {
        if (!active || !widgetRef.current || !TURNSTILE_SITE_KEY) return;
        const theme = readThemePreference();
        widgetId.current = turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: "chat",
          language: locale === "pt" ? "pt-br" : locale,
          theme: theme === "system" ? "auto" : theme,
          size: "flexible",
          appearance: "interaction-only",
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

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [conversation.messages.length, pending]);

  /** Tokens are single use: get a fresh one for the next conversation. */
  function resetWidget() {
    setToken("");
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }

  const needsToken = !conversation.sessionToken;
  const waitingForToken = needsToken && !token;
  const canSend = !pending && !waitingForToken && !widgetFailed;

  async function send(question: string, fromSuggestion: boolean) {
    const message = question.trim();
    if (!message || !canSend) return;
    if (message.length > MAX_QUESTION_CHARS) {
      setError("tooLong");
      return;
    }

    const usedToken = needsToken ? token : undefined;
    const user: ChatMessage = { id: nextId++, role: "user", text: message };
    const before = latest.current;
    const withQuestion = { ...before, messages: [...before.messages, user] };
    latest.current = withQuestion;
    onChange(withQuestion);
    setDraft("");
    setError(null);
    setPending(true);

    const result = await askAssistant({
      message,
      locale,
      ...(before.sessionToken ? { sessionToken: before.sessionToken } : {}),
      ...(usedToken ? { turnstileToken: usedToken } : {}),
    });
    if (usedToken) resetWidget();
    setPending(false);

    const current = latest.current;
    if (result.ok) {
      const { answer, sources, sessionToken, remaining, fallback } = result.value;
      const reply: ChatMessage = { id: nextId++, role: "assistant", text: answer, sources, fallback };
      onChange({ messages: [...current.messages, reply], sessionToken, remaining });
    } else {
      setError(result.error);
      // A conversation that ended needs a new one (and a new verification).
      if (["session_expired", "conversation_limit"].includes(result.error)) onChange({ ...current, sessionToken: undefined, remaining: 0 });
      if (["invalid", "failed", "busy", "rate_limited", "unavailable", "verification"].includes(result.error)) setDraft(message);
    }
    track("assistant-question", {
      suggestion: fromSuggestion ? "yes" : "no",
      result: result.ok ? (result.value.fallback ? "fallback" : "answer") : result.error,
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft, false);
  }

  function onInputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft, false);
    }
  }

  function onPanelKey(event: KeyboardEvent<HTMLElement>) {
    // Keys typed here never reach the page's own shortcuts (the home playfield, for example).
    event.stopPropagation();
    if (event.key === "Escape") onClose();
  }

  function newConversation() {
    onChange(emptyConversation());
    setError(null);
    setDraft("");
    if (!token) resetWidget();
    inputRef.current?.focus();
  }

  const status = widgetFailed
    ? text.errors.widget
    : error === "tooLong"
      ? text.tooLong.replace("{max}", String(MAX_QUESTION_CHARS))
      : error
        ? text.errors[error]
        : waitingForToken && draft.trim()
          ? text.verifying
          : "";

  const started = conversation.messages.length > 0;

  return (
    <section
      id="assistant-panel"
      className="assistant-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      hidden={!open}
      onKeyDown={onPanelKey}
    >
      <header className="assistant-header">
        <h2 id="assistant-title" className="assistant-title">
          {text.title}
        </h2>
        <button type="button" className="assistant-icon-button" aria-label={text.close} title={text.close} onClick={onClose}>
          <PixelIcon name="close" size={12} />
        </button>
      </header>

      <div className="assistant-body">
        {!started && (
          <div className="assistant-intro">
            <p>{text.intro}</p>
            <p className="assistant-privacy">{text.privacy}</p>
            <h3 id="assistant-suggestions" className="assistant-label">
              {text.suggestionsLabel}
            </h3>
            <ul className="assistant-suggestions" aria-labelledby="assistant-suggestions">
              {text.suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button type="button" className="assistant-suggestion" disabled={!canSend} onClick={() => void send(suggestion, true)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="assistant-messages" aria-live="polite" aria-relevant="additions">
          {conversation.messages.map((message) => (
            <li key={message.id} className={`assistant-message assistant-message-${message.role}`}>
              <span className="visually-hidden">{message.role === "user" ? text.you : text.bot}: </span>
              {message.role === "user" ? <p>{message.text}</p> : <AnswerText text={message.text} />}
              {message.sources?.length ? (
                <div className="assistant-sources">
                  <p className="assistant-label">{text.sources}</p>
                  <ul>
                    {message.sources.map((source) => (
                      <li key={source.url}>
                        <SourceLink source={source} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
          {pending && (
            <li className="assistant-message assistant-message-assistant assistant-thinking" aria-busy="true">
              {text.thinking}
            </li>
          )}
        </ol>
        <div ref={endRef} />
      </div>

      <div ref={widgetRef} className="assistant-widget" />

      <form className="assistant-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="assistant-input">
          {text.inputLabel}
        </label>
        <textarea
          ref={inputRef}
          id="assistant-input"
          rows={2}
          maxLength={MAX_QUESTION_CHARS}
          placeholder={text.placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onInputKey}
          aria-describedby="assistant-status"
        />
        <button type="submit" className="assistant-send" aria-label={text.send} title={text.send} disabled={!canSend || !draft.trim()}>
          <PixelIcon name="arrow" size={14} />
        </button>
      </form>

      <div className="assistant-footer">
        <p id="assistant-status" className="assistant-status" role="status" data-error={error ? "true" : undefined}>
          {status}
        </p>
        {started && (
          <div className="assistant-meta">
            {conversation.sessionToken && conversation.remaining !== undefined && (
              <span>{text.remaining.replace("{count}", String(conversation.remaining))}</span>
            )}
            <button type="button" className="assistant-new" onClick={newConversation}>
              {text.newConversation}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
