import { useSyncExternalStore } from "react";

import { readConsent, saveConsent, subscribeToConsent, type AnalyticsConsent } from "./consent";

const serverSnapshot = (): AnalyticsConsent | null | undefined => undefined;

export function useAnalyticsConsent() {
  const consent = useSyncExternalStore<AnalyticsConsent | null | undefined>(
    subscribeToConsent,
    readConsent,
    serverSnapshot,
  );
  return [consent, saveConsent] as const;
}
