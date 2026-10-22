import type { ContentDoc } from "../../../domain/blog";

/** Media referenced by image nodes of an editor document. */
export function mediaIdsOfDoc(doc: ContentDoc | undefined): string[] {
  const ids = new Set<string>();
  const walk = (nodes: unknown[] | undefined) => {
    for (const node of nodes ?? []) {
      const item = node as { type?: string; attrs?: { mediaId?: unknown }; content?: unknown[] };
      if (item.type === "image" && typeof item.attrs?.mediaId === "string") ids.add(item.attrs.mediaId);
      walk(item.content);
    }
  };
  walk(doc?.content);
  return [...ids];
}
