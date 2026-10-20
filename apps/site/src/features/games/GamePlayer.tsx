import { useRef, useState } from "react";

import { track } from "../../analytics/umami";
import { ShareButton } from "../../components/ui/ShareButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import type { Game } from "../../domain/game";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useI18n } from "../../i18n/context";

import "./game-player.css";

/**
 * The game only loads (and takes keyboard focus) after the visitor asks for
 * it, so opening a page never downloads a game or steals the keyboard.
 */
export function GamePlayer({ game }: { game: Game }) {
  const { messages } = useI18n();
  const text = messages.games;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(0);
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const needsKeyboard = !game.inputs.includes("mouse");
  const showKeyboardWarning = coarsePointer && needsKeyboard;

  if (game.hosting.kind === "external") {
    return (
      <div className="player">
        <div className="player-screen">
          <a
            className="player-start"
            href={game.hosting.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("game-play", { game: game.slug, hosting: "external" })}
          >
            <img src={game.cover} alt="" width={960} height={540} />
            <span className="player-start-label">
              {text.playExternal}
              <PixelIcon name="external" size={14} />
              <span className="visually-hidden">({messages.a11y.externalLink})</span>
            </span>
          </a>
        </div>
        <div className="player-toolbar">
          <ShareButton title={game.title} className="player-button" />
        </div>
      </div>
    );
  }

  const { path } = game.hosting;

  return (
    <div className="player">
      <div className="player-screen">
        {started ? (
          <iframe
            key={session}
            ref={iframeRef}
            src={path}
            title={game.title}
            allow="fullscreen"
            onLoad={(event) => {
              event.currentTarget.focus();
              event.currentTarget.contentWindow?.focus();
            }}
          />
        ) : (
          <button
            type="button"
            className="player-start"
            onClick={() => {
              track("game-play", { game: game.slug, hosting: "embedded" });
              setStarted(true);
            }}
            aria-label={`${text.play}: ${game.title}`}
          >
            <img src={game.cover} alt="" width={960} height={540} />
            <span className="player-start-label">{text.play}</span>
            {showKeyboardWarning && <span className="player-warning">{text.keyboardRequired}</span>}
          </button>
        )}
      </div>

      <div className="player-toolbar">
        <button
          type="button"
          className="player-button"
          disabled={!started}
          onClick={() => {
            track("game-fullscreen", { game: game.slug });
            iframeRef.current?.requestFullscreen?.();
          }}
        >
          {text.fullscreen}
        </button>
        <button
          type="button"
          className="player-button"
          disabled={!started}
          onClick={() => {
            track("game-restart", { game: game.slug });
            setSession((value) => value + 1);
          }}
        >
          {text.restart}
        </button>
        <a
          className="player-button"
          href={path}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("game-open-tab", { game: game.slug })}
        >
          {text.openStandalone}
          <span className="visually-hidden"> ({messages.a11y.externalLink})</span>
        </a>
        <ShareButton title={game.title} className="player-button" />
      </div>

      <p className="player-hint">{started ? text.focusHint : text.startHint}</p>
    </div>
  );
}
