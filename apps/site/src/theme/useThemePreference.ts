import { useSyncExternalStore } from "react";

import {
  readThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from "./theme";

const serverSnapshot = (): ThemePreference => "system";

export function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    () => readThemePreference(),
    serverSnapshot,
  );
  return [preference, setThemePreference] as const;
}
