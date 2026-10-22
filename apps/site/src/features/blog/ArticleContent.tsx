import type { ReactNode } from "react";

import type { BlockNode, CodeToken, ContentDoc, InlineNode, Mark, PublicImage } from "../../domain/blog";
import { headingId, inlineText } from "./document";
import { isExternal, isSafeHref } from "./links";

import "./article-content.css";

type ArticleContentProps = {
  content: ContentDoc;
  /** Images referenced by the body, by media id; missing ones are left out. */
  images: Record<string, PublicImage>;
  /** Called with the href of an external link the reader follows. */
  onExternalLink?: (href: string) => void;
};

type Context = Omit<ArticleContentProps, "content"> & { headingIds: Map<string, number> };

/**
 * Renders an article body from its structured document with plain React
 * elements: no HTML string is ever injected. Anything outside the known
 * nodes and marks is ignored, and links are checked again.
 */
export function ArticleContent({ content, images, onExternalLink }: ArticleContentProps) {
  const context: Context = { images, headingIds: new Map(), ...(onExternalLink ? { onExternalLink } : {}) };
  return <div className="article-content">{renderBlocks(content.content, context)}</div>;
}

function uniqueId(text: string, ids: Map<string, number>): string {
  const base = headingId(text);
  const count = ids.get(base) ?? 0;
  ids.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function renderBlocks(blocks: BlockNode[] | undefined, context: Context): ReactNode[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block, index) => renderBlock(block, index, context));
}

function renderBlock(block: BlockNode, key: number, context: Context): ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p key={key}>{renderInline(block.content, context)}</p>;
    case "heading": {
      const id = uniqueId(inlineText(block.content), context.headingIds);
      const children = renderInline(block.content, context);
      if (block.attrs?.level === 3) return <h3 key={key} id={id}>{children}</h3>;
      if (block.attrs?.level === 4) return <h4 key={key} id={id}>{children}</h4>;
      return <h2 key={key} id={id}>{children}</h2>;
    }
    case "bulletList":
      return <ul key={key}>{renderItems(block.content, context)}</ul>;
    case "orderedList": {
      const start = Number.isInteger(block.attrs?.start) && block.attrs.start !== 1 ? block.attrs.start : undefined;
      return (
        <ol key={key} start={start}>
          {renderItems(block.content, context)}
        </ol>
      );
    }
    case "blockquote":
      return <blockquote key={key}>{renderBlocks(block.content, context)}</blockquote>;
    case "codeBlock": {
      const language = typeof block.attrs?.language === "string" ? block.attrs.language : undefined;
      const text = (block.content ?? []).map((node) => (node.type === "text" ? node.text : "")).join("");
      return (
        // Focusable so keyboard users can scroll long lines.
        <pre key={key} className="article-code" data-language={language} tabIndex={0}>
          <code>{block.tokens ? renderTokens(block.tokens) : text}</code>
        </pre>
      );
    }
    case "horizontalRule":
      return <hr key={key} />;
    case "image": {
      const image = context.images[block.attrs?.mediaId];
      if (!image) return null;
      const caption = block.attrs.caption?.trim();
      return (
        <figure key={key} className="article-figure">
          <img
            src={image.src}
            srcSet={image.srcSet || undefined}
            sizes={image.srcSet ? "(min-width: 48rem) 44rem, 100vw" : undefined}
            width={image.width}
            height={image.height}
            alt={block.attrs.alt || image.alt}
            loading="lazy"
            decoding="async"
          />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    }
    default:
      return null;
  }
}

function renderItems(items: { type: string; content: BlockNode[] }[] | undefined, context: Context): ReactNode[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => (item.type === "listItem" ? <li key={index}>{renderBlocks(item.content, context)}</li> : null));
}

function renderInline(nodes: InlineNode[] | undefined, context: Context): ReactNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((node, index) => {
    if (node.type === "hardBreak") return <br key={index} />;
    if (node.type !== "text" || typeof node.text !== "string") return null;
    return <span key={index}>{applyMarks(node.text, node.marks ?? [], context)}</span>;
  });
}

const markOrder: Mark["type"][] = ["code", "strike", "italic", "bold", "link"];

function applyMarks(text: string, marks: Mark[], context: Context): ReactNode {
  const sorted = [...marks].filter((mark) => markOrder.includes(mark.type)).sort((a, b) => markOrder.indexOf(a.type) - markOrder.indexOf(b.type));
  return sorted.reduce<ReactNode>((children, mark) => {
    switch (mark.type) {
      case "code":
        return <code>{children}</code>;
      case "strike":
        return <s>{children}</s>;
      case "italic":
        return <em>{children}</em>;
      case "bold":
        return <strong>{children}</strong>;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        if (!isSafeHref(href)) return children;
        const external = isExternal(href);
        return (
          <a
            href={href}
            rel={external ? "noopener noreferrer" : undefined}
            onClick={external && context.onExternalLink ? () => context.onExternalLink?.(href) : undefined}
          >
            {children}
          </a>
        );
      }
      default:
        return children;
    }
  }, text);
}

function renderTokens(tokens: CodeToken[]): ReactNode[] {
  return tokens.map((token, index) =>
    typeof token === "string" ? (
      token
    ) : (
      <span key={index} className={token.className}>
        {renderTokens(token.children)}
      </span>
    ),
  );
}
