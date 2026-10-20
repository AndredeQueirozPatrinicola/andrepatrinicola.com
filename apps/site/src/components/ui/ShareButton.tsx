import { useState } from "react";

import { track } from "../../analytics/umami";
import { useI18n } from "../../i18n/context";

type ShareState = "idle" | "copied" | "failed";

type ShareButtonProps = {
  title: string;
  className?: string;
};

/**
 * Uses the native share sheet when the browser has one (mostly mobile) and
 * falls back to copying the current URL.
 */
export function ShareButton({ title, className }: ShareButtonProps) {
  const { messages } = useI18n();
  const [state, setState] = useState<ShareState>("idle");

  async function share() {
    const url = window.location.href;
    track("share", { page: window.location.pathname, method: "share" in navigator ? "native" : "copy" });

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
