import { common, createLowlight } from "lowlight";

import type { BlockNode, CodeToken, ContentDoc } from "../../domain/blog";

/**
 * Code highlighting runs in loaders, at build time: pages ship the tokens,
 * never the highlighter. Languages outside lowlight's common set (HCL,
 * Dockerfile) are shown as plain text.
 */
const lowlight = createLowlight(common);

const aliases: Record<string, string> = { tsx: "typescript", jsx: "javascript", html: "xml" };

type HastNode = { type: string; value?: string; tagName?: string; properties?: { className?: unknown }; children?: HastNode[] };

function toTokens(nodes: HastNode[]): CodeToken[] {
  return nodes.flatMap((node): CodeToken[] => {
    if (node.type === "text") return [node.value ?? ""];
    if (node.type === "element") {
      const classes = Array.isArray(node.properties?.className) ? node.properties.className.map(String) : [];
      // Only highlight.js classes reach the page.
      const className = classes.filter((name) => /^hljs-[\w-]+$/.test(name)).join(" ");
      const children = toTokens(node.children ?? []);
      return className ? [{ className, children }] : children;
    }
    return [];
  });
}

export function highlight(code: string, language: string | null): CodeToken[] | undefined {
  const name = language ? (aliases[language] ?? language) : null;
  if (!name || name === "plaintext" || !lowlight.registered(name)) return undefined;
  return toTokens(lowlight.highlight(name, code).children as HastNode[]);
}

function highlightBlocks(blocks: BlockNode[]): BlockNode[] {
  return blocks.map((block): BlockNode => {
    switch (block.type) {
      case "codeBlock": {
        const tokens = highlight((block.content ?? []).map((node) => node.text).join(""), block.attrs.language);
        return tokens ? { ...block, tokens } : block;
      }
      case "blockquote":
        return { ...block, content: highlightBlocks(block.content) };
      case "bulletList":
      case "orderedList":
        return { ...block, content: block.content.map((item) => ({ ...item, content: highlightBlocks(item.content) })) } as BlockNode;
      default:
        return block;
    }
  });
}

/** Returns a copy of the document with tokens on every code block. */
export function highlightDocument(doc: ContentDoc): ContentDoc {
  return { type: "doc", content: highlightBlocks(doc.content) };
}
