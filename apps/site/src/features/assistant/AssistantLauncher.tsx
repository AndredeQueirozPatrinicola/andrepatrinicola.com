import { lazy, Suspense, useCallback, useRef, useState } from "react";

import { track } from "../../analytics/umami";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { useI18n } from "../../i18n/context";
import { assistantEnabled } from "./api";
import { emptyConversation, type Conversation } from "./conversation";

import "./assistant.css";

// The panel (and the Turnstile script it loads) is only downloaded after the
// first click: a closed chat costs one small button and nothing else.
const AssistantPanel = lazy(() => import("./AssistantPanel"));

function Launcher({ concealed }: { concealed: boolean }) {
  const { messages } = useI18n();
  const text = messages.assistant;
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [conversation, setConversation] = useState<Conversation>(emptyConversation);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  function toggle() {
    if (!open) track("assistant-open");
    setLoaded(true);
    setOpen(!open);
  }

  return (
    <div className="assistant" data-open={open || undefined} hidden={concealed}>
      {loaded && (
        <Suspense fallback={null}>
          <AssistantPanel open={open} onClose={close} conversation={conversation} onChange={setConversation} />
        </Suspense>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="assistant-launcher"
        aria-expanded={open}
        aria-controls={loaded ? "assistant-panel" : undefined}
        aria-label={open ? text.close : text.open}
        title={open ? text.close : text.open}
        onClick={toggle}
      >
        <PixelIcon name={open ? "close" : "chat"} size={open ? 14 : 18} />
      </button>
    </div>
  );
}

/** Floating chat button of the public pages; renders nothing unless the build configured the assistant. */
export function AssistantLauncher({ concealed = false }: { concealed?: boolean }) {
  return assistantEnabled ? <Launcher concealed={concealed} /> : null;
}
