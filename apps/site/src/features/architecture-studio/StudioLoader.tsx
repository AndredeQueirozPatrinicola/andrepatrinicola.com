import { Component, lazy, Suspense, type ReactNode } from "react";

import type { Locale } from "../../i18n/config";
import type { StudioRequest } from "./components/Workspace";
import type { StudioMessages } from "./messages";

// The editor (React Flow, Zod, templates, icons) is downloaded only when a
// diagram is opened; the pre-rendered start page never loads it.
const Workspace = lazy(() => import("./components/Workspace"));

type BoundaryProps = { text: StudioMessages; children: ReactNode };

/** A failed chunk download (offline, new deploy) shows a retry instead of a blank page. */
class LoadBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="studio-loading" role="alert">
        <p>{this.props.text.start.loadError}</p>
        <button type="button" className="as-button" onClick={() => window.location.reload()}>
          {this.props.text.start.retry}
        </button>
      </div>
    );
  }
}

type StudioLoaderProps = {
  request: StudioRequest;
  locale: Locale;
  text: StudioMessages;
  basePath: string;
};

export function StudioLoader({ request, locale, text, basePath }: StudioLoaderProps) {
  return (
    <LoadBoundary text={text}>
      <Suspense
        fallback={
          <div className="studio-loading" role="status">
            {text.start.loading}
          </div>
        }
      >
        <Workspace request={request} locale={locale} text={text} basePath={basePath} />
      </Suspense>
    </LoadBoundary>
  );
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** What the URL asks the studio to open, if anything. Unknown or malformed values are ignored. */
export function studioRequest(params: URLSearchParams): StudioRequest | null {
  const template = params.get("template");
  if (template && ID.test(template)) return { kind: "template", id: template };
  const diagram = params.get("diagram");
  if (diagram && ID.test(diagram)) return { kind: "diagram", id: diagram };
  if (params.get("new") === "1") return { kind: "new" };
  return null;
}
