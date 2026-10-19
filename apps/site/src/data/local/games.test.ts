import { describe, expect, it } from "vitest";

import { games } from "../../content/games";
import { locales } from "../../i18n/config";
import { createLocalGamesRepository } from "./games";

const repository = createLocalGamesRepository();

describe("local games repository", () => {
  it("resolves every localized field to plain strings", async () => {
    const [pong] = await repository.list("en");

    expect(pong.tagline).toBe("Classic Pong against a computer-controlled paddle.");
    expect(pong.controls[0]).toEqual({ keys: ["W"], action: "Move up" });
  });

  it("keeps catalog order and finds games by slug", async () => {
    const list = await repository.list("pt");

    expect(list.map((game) => game.slug)).toEqual(games.map((game) => game.slug));
    expect((await repository.findBySlug("meteor", "es"))?.title).toBe("Spaceship Meteor");
    expect(await repository.findBySlug("missing", "pt")).toBeUndefined();
  });

  it("has unique slugs and complete translations", () => {
    const slugs = games.map((game) => game.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const game of games) {
      for (const locale of locales) {
        expect(game.tagline[locale], `${game.slug} tagline ${locale}`).toBeTruthy();
        expect(game.rules[locale].length, `${game.slug} rules ${locale}`).toBe(game.rules.pt.length);
        expect(game.internals[locale].length).toBe(game.internals.pt.length);
        expect(game.notes[locale].length).toBe(game.notes.pt.length);
      }
    }
  });
});
