import type { Messages } from "../i18n/messages";

export type NavItem = {
  /** Key in the `nav` messages. */
  key: Exclude<keyof Messages["nav"], "home">;
  /** Path below the locale prefix. */
  path: string;
};

/** Primary navigation, in display order. Each page adds itself here. */
export const primaryNavigation: NavItem[] = [
  { key: "games", path: "/games" },
  { key: "labs", path: "/labs" },
  { key: "about", path: "/about" },
  { key: "resume", path: "/resume" },
];
