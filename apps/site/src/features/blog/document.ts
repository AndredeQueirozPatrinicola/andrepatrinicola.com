import type { BlockNode, ContentDoc, InlineNode } from "../../domain/blog";

function inlineText(nodes: InlineNode[] | undefined): string {
  return (nodes ?? []).map((node) => (node.type === "text" ? node.text : " ")).join("");
}

/** Visits every block, depth first. */
export function walkBlocks(blocks: BlockNode[], visit: (block: BlockNode) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.type === "bulletList" || block.type === "orderedList") {
      for (const item of block.content) walkBlocks(item.content, visit);
    } else if (block.type === "blockquote") {
      walkBlocks(block.content, visit);
    }
  }
}

/** Text of the whole body (for word counts). */
export function plainText(doc: ContentDoc): string {
  const parts: string[] = [];
  walkBlocks(doc.content, (block) => {
    if (block.type === "paragraph" || block.type === "heading") parts.push(inlineText(block.content));
    if (block.type === "codeBlock") parts.push((block.content ?? []).map((node) => node.text).join(""));
  });
  return parts.join(" ");
}

export function readingMinutes(doc: ContentDoc, wordsPerMinute = 220): number {
  const words = plainText(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function mediaIdsOf(doc: ContentDoc): string[] {
  const ids = new Set<string>();
  walkBlocks(doc.content, (block) => {
    if (block.type === "image") ids.add(block.attrs.mediaId);
  });
  return [...ids];
}

/** Anchor id for a heading: "Por que DynamoDB?" → "por-que-dynamodb". */
export function headingId(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "section"
  );
}

export { inlineText };
