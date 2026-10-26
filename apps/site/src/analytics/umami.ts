export const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
export const UMAMI_WEBSITE_ID = "29383e2e-4db5-4448-a8b3-1d1155985516";
export const UMAMI_DOMAINS = [
  "andrepatrinicola.com.br",
  "www.andrepatrinicola.com.br",
  "d1eq0mvu3moyxu.cloudfront.net",
];

export type AnalyticsEvent =
  | "game-play"
  | "game-fullscreen"
  | "game-restart"
  | "game-open-tab"
  | "game-source"
  | "share"
  | "article-view"
  | "article-share"
  | "article-link"
  | "contact"
  | "contact-form"
  | "assistant-open"
  | "assistant-question"
  | "assistant-source"
  | "resume-download"
  | "resume-project"
  | "project-source"
  | "skill-highlight"
  | "home-playfield"
  | "queue-lab"
  | "architecture-studio"
  | "language-change"
  | "theme-change";

export type AnalyticsData = Record<string, string | number>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: AnalyticsData) => void };
  }
}

export function track(event: AnalyticsEvent, data?: AnalyticsData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    return;
  }
}
