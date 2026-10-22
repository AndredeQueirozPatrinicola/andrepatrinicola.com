import { UMAMI_DOMAINS, UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from "./umami";

export type AnalyticsConsent = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "analytics-consent";

const UMAMI_DISABLED_KEY = "umami.disabled";
const CHANGE_EVENT = "analyticsconsentchange";

let pageConsent: AnalyticsConsent | null = null;

function isConsent(value: unknown): value is AnalyticsConsent {
  return value === "granted" || value === "denied";
}

export function readConsent(): AnalyticsConsent | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return isConsent(value) ? value : pageConsent;
  } catch {
    return pageConsent;
  }
}

/** Portfolio Studio is private: no page views or events from /admin. */
export const isPrivatePath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

export function loadUmami(): void {
  if (isPrivatePath(window.location.pathname)) return;
  if (document.querySelector(`script[src="${UMAMI_SCRIPT_URL}"]`)) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = UMAMI_SCRIPT_URL;
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  script.dataset.domains = UMAMI_DOMAINS.join(",");
  document.head.appendChild(script);
}

function storeConsent(consent: AnalyticsConsent): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent);
    if (consent === "granted") {
      localStorage.removeItem(UMAMI_DISABLED_KEY);
    } else {
      localStorage.setItem(UMAMI_DISABLED_KEY, "1");
    }
  } catch {
    return;
  }
}

export function saveConsent(consent: AnalyticsConsent): void {
  pageConsent = consent;
  storeConsent(consent);
  if (consent === "granted") loadUmami();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToConsent(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const umamiInitScript = `(function () {
  if (location.pathname === "/admin" || location.pathname.indexOf("/admin/") === 0) return;
  try { if (localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}) !== "granted") return; } catch (e) { return; }
  var script = document.createElement("script");
  script.defer = true;
  script.src = ${JSON.stringify(UMAMI_SCRIPT_URL)};
  script.setAttribute("data-website-id", ${JSON.stringify(UMAMI_WEBSITE_ID)});
  script.setAttribute("data-domains", ${JSON.stringify(UMAMI_DOMAINS.join(","))});
  document.head.appendChild(script);
})();`;
