import { useState } from "react";

import { track } from "../../analytics/umami";
import { useI18n } from "../../i18n/context";

type ShareState = "idle" | "copied" | "failed";

type ShareButtonProps = {
  title: string;
  className?: string;
  /** Replaces the default "share" event, e.g. to report it as an article share. */
  onShare?: (method: "native" | "copy") => void;
};

/**
 * Uses the native share sheet when the browser has one (mostly mobile) and
 * falls back to copying the current URL.
 */
export function ShareButton({ title, className, onShare }: ShareButtonProps) {
  const { messages } = useI18n();
  const [state, setState] = useState<ShareState>("idle");

  async function share() {
    const url = window.location.href;
    const method = "share" in navigator ? "native" : "copy";
    if (onShare) onShare(method);
    else track("share", { page: window.location.pathname, method });

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <>
      <button type="button" className={className} onClick={share}>
        {messages.share.label}
      </button>
      <span role="status" className="share-status">
        {state === "copied" && messages.share.copied}
        {state === "failed" && messages.share.failed}
      </span>
    </>
  );
}
