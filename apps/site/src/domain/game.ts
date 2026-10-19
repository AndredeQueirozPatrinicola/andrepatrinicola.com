/** Physical inputs a game accepts. Used to warn visitors on touch devices. */
export type InputMethod = "keyboard" | "mouse";

/** Keys and gestures shown in the controls legend. Labels live in the i18n messages. */
export type InputKey =
  | "W"
  | "A"
  | "S"
  | "D"
  | "enter"
  | "space"
  | "click"
  | "drag"
  | "release"
  | "letters";

export type GameStatus = "playable" | "prototype";

export type GameHosting =
  | { kind: "embedded"; path: string }
  | { kind: "external"; url: string };

export type GameControl = {
  keys: InputKey[];
  action: string;
};

export type Game = {
  slug: string;
  title: string;
  tagline: string;
  goal: string;
  rules: string[];
  controls: GameControl[];
  inputs: InputMethod[];
  status: GameStatus;
  hosting: GameHosting;
  cover?: string;
  year: number;
  tech: string[];
  /** Engineering details worth reading, taken from the source code. */
  internals: string[];
  /** Caveats a player should know before starting. */
  notes: string[];
  sourceUrl?: string;
};
