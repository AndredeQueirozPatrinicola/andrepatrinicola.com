import type { ReactNode } from "react";

/**
 * Renders the model's answer with a tiny, safe subset of Markdown:
 * paragraphs, bulleted and numbered lists, **bold**, *italic* and `code`.
 * Everything becomes React text nodes: no HTML is ever interpreted, and
 * links or URLs stay plain text (sources are shown separately, from the API's
 * vetted list).
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("**")) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[]; start: number };

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const last = blocks.at(-1);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (!line) {
      blocks.push({ kind: "p", lines: [] });
    } else if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]!);
      else blocks.push({ kind: "ul", items: [bullet[1]!], start: 1 });
    } else if (numbered) {
      if (last?.kind === "ol") last.items.push(numbered[2]!);
      else blocks.push({ kind: "ol", items: [numbered[2]!], start: Number(numbered[1]) });
    } else if (last?.kind === "p") {
      last.lines.push(line.replace(/^#{1,6}\s+/, ""));
    } else {
      blocks.push({ kind: "p", lines: [line.replace(/^#{1,6}\s+/, "")] });
    }
  }
  return blocks.filter((block) => (block.kind === "p" ? block.lines.length > 0 : block.items.length > 0));
}

export function AnswerText({ text }: { text: string }) {
  return (
    <>
      {parseBlocks(text).map((block, index) => {
        if (block.kind === "p") return <p key={index}>{inline(block.lines.join(" "), `p${index}`)}</p>;
        const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `l${index}-${itemIndex}`)}</li>);
        return block.kind === "ul" ? (
          <ul key={index}>{items}</ul>
        ) : (
          <ol key={index} start={block.start}>
            {items}
          </ol>
        );
      })}
    </>
  );
}
