const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type RenderOptions = {
  sitekey: string;
  action: string;
  language: string;
  theme: "auto" | "light" | "dark";
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: RenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let script: Promise<TurnstileApi> | undefined;

export function loadTurnstile(): Promise<TurnstileApi> {
  script ??= new Promise<TurnstileApi>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = SCRIPT_URL;
    element.async = true;
    element.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    element.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(element);
  }).catch((error: unknown) => {
    script = undefined;
    throw error;
  });
  return script;
}
