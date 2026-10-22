import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { createContext, useContext } from "react";

/** Temporary preview URLs of library images (media id → presigned URL). */
export const MediaPreviewContext = createContext<Record<string, string>>({});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mediaImage: {
      insertMediaImage: (attrs: { mediaId: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

function ImageView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const previews = useContext(MediaPreviewContext);
  const { mediaId, alt, caption } = node.attrs as { mediaId: string; alt: string; caption: string };
  const src = previews[mediaId];
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper as="figure" className="editor-figure" data-selected={selected || undefined} data-drag-handle>
      {src ? <img src={src} alt={alt} draggable={false} /> : <div className="editor-figure-missing">Imagem {mediaId.slice(0, 8)} não está na biblioteca</div>}
      <div className="editor-figure-fields" contentEditable={false}>
        <label>
          <span className="label">Texto alternativo</span>
          <input
            value={alt}
            maxLength={300}
            disabled={!editable}
            placeholder="Descreva a imagem para quem não a vê"
            onChange={(event) => updateAttributes({ alt: event.target.value })}
          />
        </label>
        <label>
          <span className="label">Legenda (opcional)</span>
          <input value={caption} maxLength={300} disabled={!editable} onChange={(event) => updateAttributes({ caption: event.target.value })} />
        </label>
        {editable && (
          <button type="button" className="admin-button" data-size="small" onClick={() => deleteNode()}>
            Remover imagem
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * Block image that points at the media library by id. The saved document
 * never holds a URL: the public site serves re-encoded copies, and the
 * editor shows temporary previews.
 */
export const MediaImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      mediaId: { default: null },
      alt: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-media-id]",
        getAttrs: (element) => ({
          mediaId: element.getAttribute("data-media-id"),
          alt: element.getAttribute("data-alt") ?? "",
          caption: element.getAttribute("data-caption") ?? "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes({
        "data-media-id": HTMLAttributes.mediaId,
        "data-alt": HTMLAttributes.alt,
        "data-caption": HTMLAttributes.caption,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  addCommands() {
    return {
      insertMediaImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { alt: "", caption: "", ...attrs } }),
    };
  },
});
