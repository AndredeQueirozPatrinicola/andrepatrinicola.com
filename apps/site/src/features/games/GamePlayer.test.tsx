import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createLocalGamesRepository } from "../../data/local/games";
import { renderLocalized } from "../../test/render";
import { GamePlayer } from "./GamePlayer";

const repository = createLocalGamesRepository();

beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

describe("GamePlayer", () => {
  it("loads the embedded game only after the visitor asks", async () => {
    const pong = (await repository.findBySlug("pong", "en"))!;
    const { container } = renderLocalized(<GamePlayer game={pong} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Fullscreen" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Play: Classic Pong" }));

    const iframe = container.querySelector("iframe");
    expect(iframe).toHaveAttribute("src", "/play/pong/index.html");
    expect(iframe).toHaveAttribute("title", "Classic Pong");
    expect(screen.getByRole("button", { name: "Fullscreen" })).toBeEnabled();
  });

  it("links out to external games instead of embedding them", async () => {
    const letritas = (await repository.findBySlug("letritas", "en"))!;
    const { container } = renderLocalized(<GamePlayer game={letritas} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("link", { name: /Open the game/ })).toHaveAttribute(
      "href",
      "https://andredequeirozpatrinicola.github.io/letreco/",
    );
  });
});
