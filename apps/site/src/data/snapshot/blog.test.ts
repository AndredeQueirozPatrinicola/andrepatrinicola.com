import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { ContentSnapshot } from "../../domain/blog";
import { createSnapshotBlogRepository, toPublicImage } from "./blog";
import { parseSnapshot } from "./content";

const fixture = parseSnapshot(
  JSON.parse(readFileSync(resolve("e2e/fixtures/blog-snapshot.json"), "utf8")),
) as ContentSnapshot;
const blog = createSnapshotBlogRepository(() => fixture);

describe("snapshot blog repository", () => {
  it("lists only the posts published in a language, newest first", async () => {
    expect((await blog.list("pt")).map((post) => post.slug)).toEqual([
      "diario-de-bordo-cms",
      "arquitetura-serverless-do-portfolio",
    ]);
    expect((await blog.list("en")).map((post) => post.slug)).toEqual(["portfolio-serverless-architecture"]);
    expect(await blog.list("es")).toEqual([]);
  });

  it("never falls back to another language", async () => {
    expect(await blog.findBySlug("arquitetura-serverless-do-portfolio", "es")).toBeUndefined();
    expect(await blog.findBySlug("arquitetura-serverless-do-portfolio", "en")).toBeUndefined();
  });

  it("maps a post with dates, images, SEO fields and its translations", async () => {
    const post = await blog.findBySlug("arquitetura-serverless-do-portfolio", "pt");
    expect(post).toMatchObject({
      type: "article",
      publishedLabel: "10 de outubro de 2026",
      updatedLabel: "18 de outubro de 2026",
      seoDescription: "Cognito, Lambda, DynamoDB e GitHub Actions publicando um site estático.",
      alternates: { pt: "arquitetura-serverless-do-portfolio", en: "portfolio-serverless-architecture" },
      cover: { alt: "Diagrama da arquitetura", width: 480, height: 270 },
    });
    expect(post?.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(Object.keys(post?.images ?? {})).toEqual(["8f1c2b4e-6a0d-4c1e-9b7a-2d3e4f5a6b7c"]);

    const english = await blog.findBySlug("portfolio-serverless-architecture", "en");
    // Without its own SEO fields, a language uses its title and excerpt.
    expect(english?.seoTitle).toBe("The portfolio's serverless architecture");
    expect(english?.cover?.alt).toBe("Architecture diagram");
  });

  it("previews links with the JPEG made for sharing", async () => {
    const post = await blog.findBySlug("arquitetura-serverless-do-portfolio", "pt");
    expect(post?.ogImage).toEqual({
      src: `/media/${post?.cover?.id}-share.jpg`,
      // The fixture is 640 px wide: never upscaled to 1200.
      width: 640,
      height: 360,
      alt: "Diagrama da arquitetura",
    });
  });

  it("finds the current slug of an earlier one", async () => {
    expect(await blog.findMovedSlug("arquitetura-do-portfolio", "pt")).toBe("arquitetura-serverless-do-portfolio");
    expect(await blog.findMovedSlug("arquitetura-do-portfolio", "en")).toBeUndefined();
  });

  it("lists entries for the sitemap and pre-rendering", async () => {
    const entries = await blog.entries();
    expect(entries).toHaveLength(3);
    expect(entries.find((entry) => entry.locale === "en")?.translations).toEqual({
      pt: "arquitetura-serverless-do-portfolio",
      en: "portfolio-serverless-architecture",
    });
  });
});

describe("toPublicImage", () => {
  it("offers every generated width without upscaling", () => {
    const image = toPublicImage({ id: "a", contentType: "image/jpeg", width: 2000, height: 1000, alt: {}, sha256: "" }, "Alt");
    expect(image).toMatchObject({ width: 1600, height: 800, src: "/media/a-1600.webp", alt: "Alt" });
    expect(image.srcSet).toBe("/media/a-480.webp 480w, /media/a-960.webp 960w, /media/a-1200.webp 1200w, /media/a-1600.webp 1600w");
  });
});
