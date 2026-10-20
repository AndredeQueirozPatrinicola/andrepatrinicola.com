import type { ReactNode } from "react";

import "./kbd.css";

/** A key cap, as drawn in the controls legends. */
export function Kbd({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <kbd className={wide ? "kbd kbd-wide" : "kbd"}>{children}</kbd>;
}
