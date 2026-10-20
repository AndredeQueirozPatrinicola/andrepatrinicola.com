import { describe, expect, it } from "vitest";

import { buildMeta } from "./meta";
import { SITE_URL } from "./site";

describe("buildMeta", () => {
  const meta = buildMeta({
    locale: "es",
    path: "/games/pong",
    title: "Classic Pong",
    siteName: "André Patrinicola",
    description: "Pong clásico.",
    jsonLd: [{ "@type": "VideoGame" }],
  });

  it("titles the page and links the canonical URL", () => {
    expect(meta).toContainEqual({ title: "Classic Pong · André Patrinicola" });
    expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: `${SITE_URL}/es/games/pong` });
  });

  it("lists every language plus x-default", () => {
    const alternates = meta.filter((item) => "rel" in item && item.rel === "alternate");
    expect(alternates.map((item) => ("hrefLang" in item ? item.hrefLang : ""))).toEqual([
      "pt-BR",
      "en",
      "es",
      "x-default",
    ]);
  });

  it("falls back to the default share image and renders JSON-LD", () => {
    expect(meta).toContainEqual({ property: "og:image", content: `${SITE_URL}/images/og/default.png` });
    expect(meta).toContainEqual({ property: "og:locale", content: "es_ES" });
    expect(meta).toContainEqual({ "script:ld+json": { "@type": "VideoGame" } });
  });
});
