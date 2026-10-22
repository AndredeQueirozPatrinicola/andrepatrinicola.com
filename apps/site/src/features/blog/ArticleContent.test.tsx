import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BlockNode, ContentDoc, PublicImage } from "../../domain/blog";
import { ArticleContent } from "./ArticleContent";
import { highlight, highlightDocument } from "./highlight.server";

const text = (value: string, marks?: unknown[]) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const doc = (...content: unknown[]) => ({ type: "doc", content }) as ContentDoc;
const image: PublicImage = { id: "img", width: 960, height: 540, alt: "Library alt", src: "/media/img-960.webp", srcSet: "" };

describe("ArticleContent", () => {
  it("renders headings with unique anchors and inline marks", () => {
    render(
      <ArticleContent
        content={doc(
          { type: "heading", attrs: { level: 2 }, content: [text("Por que DynamoDB?")] },
          { type: "heading", attrs: { level: 2 }, content: [text("Por que DynamoDB?")] },
          { type: "paragraph", content: [text("forte", [{ type: "bold" }]), text("código", [{ type: "code" }])] },
        )}
        images={{}}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.id)).toEqual(["por-que-dynamodb", "por-que-dynamodb-2"]);
    expect(screen.getByText("forte").tagName).toBe("STRONG");
    expect(screen.getByText("código").tagName).toBe("CODE");
  });

  it("never renders unsafe links, unknown nodes or HTML", () => {
    const { container } = render(
      <ArticleContent
        content={doc(
          { type: "paragraph", content: [text("click", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])] },
          { type: "html", content: "<img src=x onerror=alert(1)>" },
          { type: "paragraph", content: [text("<script>alert(1)</script>")] },
        )}
        images={{}}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("click")).toBeInTheDocument();
    expect(container.querySelector("script, img")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  });

  it("marks external links and reports clicks on them", async () => {
    const onExternalLink = vi.fn();
    render(
      <ArticleContent
        content={doc({
          type: "paragraph",
          content: [
            text("AWS", [{ type: "link", attrs: { href: "https://aws.amazon.com" } }]),
            text("blog", [{ type: "link", attrs: { href: "/pt/blog" } }]),
          ],
        })}
        images={{}}
        onExternalLink={onExternalLink}
      />,
    );
    const external = screen.getByRole("link", { name: "AWS" });
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "blog" })).not.toHaveAttribute("rel");
    external.click();
    expect(onExternalLink).toHaveBeenCalledWith("https://aws.amazon.com");
  });

  it("renders known images with captions and skips missing ones", () => {
    render(
      <ArticleContent
        content={doc(
          { type: "image", attrs: { mediaId: "img", alt: "", caption: "Fluxo" } },
          { type: "image", attrs: { mediaId: "missing", alt: "x", caption: "" } },
        )}
        images={{ img: image }}
      />,
    );
    const rendered = screen.getAllByRole("img");
    expect(rendered).toHaveLength(1);
    expect(rendered[0]).toHaveAttribute("alt", "Library alt");
    // Admin previews pass a single URL without variants.
    expect(rendered[0]).not.toHaveAttribute("srcset");
    expect(screen.getByText("Fluxo").tagName).toBe("FIGCAPTION");
  });

  it("renders highlighted code from build-time tokens", () => {
    const content = highlightDocument(
      doc({ type: "codeBlock", attrs: { language: "typescript" }, content: [text("const x = 1;")] }),
    );
    const { container } = render(<ArticleContent content={content} images={{}} />);
    expect(container.querySelector("pre code .hljs-keyword")?.textContent).toBe("const");
    expect(container.querySelector("pre")?.textContent).toBe("const x = 1;");
  });
});

describe("highlight", () => {
  it("keeps only highlight.js classes and leaves unknown languages as plain text", () => {
    expect(highlight("SELECT 1", "sql")?.some((token) => typeof token !== "string" && token.className.startsWith("hljs-"))).toBe(true);
    expect(highlight("resource x {}", "hcl")).toBeUndefined();
    expect(highlight("text", null)).toBeUndefined();
  });

  it("highlights code inside lists and quotes", () => {
    const code = { type: "codeBlock", attrs: { language: "json" }, content: [text('{"a":1}')] };
    const result = highlightDocument(doc({ type: "blockquote", content: [code] }));
    const quote = result.content[0] as Extract<BlockNode, { type: "blockquote" }>;
    expect((quote.content[0] as Extract<BlockNode, { type: "codeBlock" }>).tokens).toBeDefined();
  });
});
