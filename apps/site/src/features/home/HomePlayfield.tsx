import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router";

import { PixelIcon } from "../../components/ui/PixelIcon";
import type { Profile } from "../../domain/profile";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useI18n } from "../../i18n/context";
import { hudNumber } from "../../i18n/format";
import type { Mode } from "./playfield/engine";
import type { PlayfieldController, PlayfieldEvent } from "./playfield/playfield";

import "./home-playfield.css";

export type Shortcut = {
  id: string;
  label: string;
  href: string;
  /** Short value shown on the tile, e.g. a count. */
  detail?: string;
  external?: boolean;
};

type HomePlayfieldProps = {
  profile: Profile;
  intro: string;
  shortcuts: Shortcut[];
};

const BEST_KEY = "playfield-best";
const bestListeners = new Set<() => void>();

/** Best rally, kept in localStorage and readable without hydration mismatches. */
const bestScore = {
  get(): number {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  },
  set(value: number) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // The record simply won't survive a reload.
    }
    bestListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    bestListeners.add(listener);
    return () => bestListeners.delete(listener);
  },
};

/**
 * The hero of the home page. Its text and links are ordinary, accessible
 * HTML; a canvas on top treats them as solid blocks for a Pong-like ball.
 * An AI plays on its own ("attract mode", as arcade cabinets did) until the
 * visitor takes the paddle. The game code loads after the page is idle and
 * never runs on its own when the visitor prefers reduced motion.
 */
export function HomePlayfield({ profile, intro, shortcuts }: HomePlayfieldProps) {
  const { messages } = useI18n();
  const text = messages.home.playfield;
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PlayfieldController | null>(null);
  const hitTiles = useRef(new Set<string>());
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const [mode, setMode] = useState<Mode>("demo");
  const [usingKeys, setUsingKeys] = useState(false);
  const [rally, setRally] = useState(0);
  const best = useSyncExternalStore(bestScore.subscribe, bestScore.get, () => 0);
  const [cleared, setCleared] = useState(false);

  function flashTile(id: string) {
    if (!id.startsWith("tile-")) return;
    const tile = rootRef.current?.querySelector<HTMLElement>(`[data-playfield-block="${id}"]`);
    if (tile) {
      tile.removeAttribute("data-hit");
      void tile.offsetWidth; // restart the CSS animation
      tile.setAttribute("data-hit", "");
    }
    if (mode === "player") {
      hitTiles.current.add(id);
      if (hitTiles.current.size === shortcuts.length) setCleared(true);
    }
  }

  const onPlayfieldEvent = useEffectEvent((event: PlayfieldEvent) => {
    switch (event.type) {
      case "mode":
        setMode(event.mode);
        if (event.mode === "demo") {
          setRally(0);
          setUsingKeys(false);
          hitTiles.current.clear();
        }
        break;
      case "paddle":
        if (mode !== "player") break;
        setRally(event.rally);
        if (event.rally > best) bestScore.set(event.rally);
        break;
      case "miss":
        setRally(0);
        break;
      case "block":
        flashTile(event.id);
        break;
    }
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let disposed = false;
    const start = () =>
      import("./playfield/playfield").then(({ createPlayfield }) => {
        if (disposed) return;
        controllerRef.current = createPlayfield({
          root,
          canvas,
          autoplay: !reducedMotion,
          onEvent: (event) => onPlayfieldEvent(event),
        });
      });

    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
    idle(() => void start());

    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [reducedMotion]);

  function togglePlay() {
    if (mode === "player") {
      controllerRef.current?.stopPlaying();
    } else {
      setUsingKeys(true);
      controllerRef.current?.play();
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && mode === "player") controllerRef.current?.stopPlaying();
  }

  const hint = usingKeys ? text.hintKeys : coarsePointer ? text.hintTouch : text.hintPointer;

  return (
    <section ref={rootRef} className="playfield" aria-labelledby="home-title" onKeyDown={onKeyDown}>
      <canvas ref={canvasRef} className="playfield-canvas" aria-hidden="true" />

      <div className="playfield-content page">
        <p className="label playfield-role">{profile.role}</p>
        <h1 id="home-title" className="playfield-title" data-playfield-block="title" data-playfield-shape="text">
          {profile.name}
        </h1>
        <p className="playfield-intro">{intro}</p>

        <nav aria-label={text.shortcuts}>
          <ul className="playfield-shortcuts">
            {shortcuts.map((shortcut) => {
              const content = (
                <>
                  <span className="playfield-tile-label">{shortcut.label}</span>
                  {shortcut.detail && <span className="playfield-tile-detail">{shortcut.detail}</span>}
                  {shortcut.external ? (
                    <>
                      <PixelIcon name="external" size={12} />
                      <span className="visually-hidden"> ({messages.a11y.externalLink})</span>
                    </>
                  ) : (
                    <PixelIcon name="arrow" size={12} />
                  )}
                </>
              );
              const props = { className: "playfield-tile", "data-playfield-block": `tile-${shortcut.id}` };
              return (
                <li key={shortcut.id}>
                  {shortcut.external ? (
                    <a {...props} href={shortcut.href} rel="me noreferrer">
                      {content}
                    </a>
                  ) : (
                    <Link {...props} to={shortcut.href}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="playfield-hud" data-playfield-block="hud">
          <div className="playfield-score" aria-hidden="true">
            {mode === "demo" ? (
              <span className="playfield-demo">{text.demo}</span>
            ) : (
              <span>
                {text.rally} {hudNumber(rally)}
              </span>
            )}
            <span>
              {text.best} {hudNumber(best)}
            </span>
            {cleared && <span className="playfield-cleared">{text.cleared}</span>}
          </div>
          <button type="button" className="playfield-play" aria-pressed={mode === "player"} onClick={togglePlay}>
            {mode === "player" ? text.stop : text.play}
          </button>
          <p className="playfield-hint">{hint}</p>
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {mode === "player" && usingKeys ? text.playing : ""}
      </p>
    </section>
  );
}
