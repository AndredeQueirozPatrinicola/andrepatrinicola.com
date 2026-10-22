import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { ContentDoc } from "../../../domain/blog";
import { isSafeHref } from "../../blog/links";
import { MediaImage, MediaPreviewContext } from "./MediaImage";

import "../../blog/article-content.css";
import "./editor.css";

/** Same list the API accepts. */
export const codeLanguages = [
  "plaintext",
  "bash",
  "shell",
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "python",
  "go",
  "rust",
  "java",
  "kotlin",
  "csharp",
  "cpp",
  "c",
  "sql",
  "yaml",
  "hcl",
  "html",
  "css",
  "xml",
  "dockerfile",
  "markdown",
  "diff",
  "ini",
] as const;

function toolbarState(current: Editor) {
  return {
    bold: current.isActive("bold"),
    italic: current.isActive("italic"),
    strike: current.isActive("strike"),
    code: current.isActive("code"),
    link: current.isActive("link"),
    h2: current.isActive("heading", { level: 2 }),
    h3: current.isActive("heading", { level: 3 }),
    h4: current.isActive("heading", { level: 4 }),
    bullet: current.isActive("bulletList"),
    ordered: current.isActive("orderedList"),
    quote: current.isActive("blockquote"),
    codeBlock: current.isActive("codeBlock"),
    language: (current.getAttributes("codeBlock").language as string | null) ?? "",
    canUndo: current.can().undo(),
    canRedo: current.can().redo(),
  };
}

type Props = {
  value: ContentDoc;
  onChange: (doc: ContentDoc) => void;
  previews: Record<string, string>;
  /** Opens the media picker; resolves with the chosen image or null. */
  pickImage: () => Promise<{ id: string; alt: string } | null>;
  label: string;
  readOnly?: boolean;
};

function ToolbarButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="editor-tool"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [href, setHref] = useState(current);
  const [invalid, setInvalid] = useState(false);
  const id = useId();

  function apply() {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onDone();
      return;
    }
    if (!isSafeHref(value)) {
      setInvalid(true);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    onDone();
  }

  return (
    <div className="editor-link-form">
      <label htmlFor={id} className="label">
        Endereço do link
      </label>
      <input
        id={id}
        type="text"
        inputMode="url"
        value={href}
        autoFocus
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        placeholder="https://… ou /pt/blog/…"
        onChange={(event) => {
          setHref(event.target.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
          if (event.key === "Escape") onDone();
        }}
      />
      <button type="button" className="admin-button" data-size="small" data-variant="primary" onClick={apply}>
        Aplicar
      </button>
      {current && (
        <button
          type="button"
          className="admin-button"
          data-size="small"
          onClick={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            onDone();
          }}
        >
          Remover link
        </button>
      )}
      {invalid && (
        <p id={`${id}-error`} className="admin-field-error">
          Use um endereço https://, http://, mailto: ou um caminho do site (/…).
        </p>
      )}
    </div>
  );
}

export function RichTextEditor({ value, onChange, previews, pickImage, label, readOnly = false }: Props) {
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [linkOpen, setLinkOpen] = useState(false);
  const lastEmitted = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        underline: false,
        // It would add an empty paragraph to every loaded document (a change nobody made).
        trailingNode: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url) => isSafeHref(url),
          HTMLAttributes: { rel: "noopener noreferrer", target: null },
        },
      }),
      Placeholder.configure({ placeholder: "Escreva o artigo…" }),
      MediaImage,
    ],
    content: value,
    onCreate: ({ editor: created }) => {
      lastEmitted.current = JSON.stringify(created.getJSON());
    },
    editorProps: {
      attributes: { class: "article-content editor-content", "aria-label": label, "aria-multiline": "true", role: "textbox" },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
    },
    // Only real edits reach the draft: schema normalization of the loaded
    // document must not mark the article as changed.
    onUpdate: ({ editor: current, transaction }) => {
      if (!transaction.docChanged) return;
      const json = current.getJSON();
      const serialized = JSON.stringify(json);
      if (serialized === lastEmitted.current) return;
      lastEmitted.current = serialized;
      onChangeRef.current(json as ContentDoc);
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [editor, readOnly]);

  // useEditorState only recomputes on transactions; until the first one the
  // toolbar state is read directly from the new editor.
  const selected = useEditorState({ editor, selector: ({ editor: current }) => (current ? toolbarState(current) : null) });
  const state = selected ?? (editor ? toolbarState(editor) : null);

  if (!editor || !state) return <div className="editor editor-loading">Carregando editor…</div>;

  const chain = () => editor.chain().focus();
  const disabled = readOnly;

  return (
    <MediaPreviewContext.Provider value={previews}>
      <div className="editor">
        <div className="editor-toolbar" role="toolbar" aria-label="Formatação">
          <div className="editor-group">
            <ToolbarButton label="Título H2" active={state.h2} disabled={disabled} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
              H2
            </ToolbarButton>
            <ToolbarButton label="Título H3" active={state.h3} disabled={disabled} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
              H3
            </ToolbarButton>
            <ToolbarButton label="Título H4" active={state.h4} disabled={disabled} onClick={() => chain().toggleHeading({ level: 4 }).run()}>
              H4
            </ToolbarButton>
          </div>
          <div className="editor-group">
            <ToolbarButton label="Negrito" shortcut="Ctrl+B" active={state.bold} disabled={disabled} onClick={() => chain().toggleBold().run()}>
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton label="Itálico" shortcut="Ctrl+I" active={state.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()}>
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton label="Tachado" shortcut="Ctrl+Shift+S" active={state.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()}>
              <s>S</s>
            </ToolbarButton>
            <ToolbarButton label="Código" shortcut="Ctrl+E" active={state.code} disabled={disabled} onClick={() => chain().toggleCode().run()}>
              {"</>"}
            </ToolbarButton>
            <ToolbarButton label="Link" shortcut="Ctrl+K" active={state.link} disabled={disabled} onClick={() => setLinkOpen((open) => !open)}>
              Link
            </ToolbarButton>
          </div>
          <div className="editor-group">
            <ToolbarButton label="Lista" active={state.bullet} disabled={disabled} onClick={() => chain().toggleBulletList().run()}>
              • Lista
            </ToolbarButton>
            <ToolbarButton label="1. Lista numerada" active={state.ordered} disabled={disabled} onClick={() => chain().toggleOrderedList().run()}>
              1. Lista
            </ToolbarButton>
            <ToolbarButton label="Citação" active={state.quote} disabled={disabled} onClick={() => chain().toggleBlockquote().run()}>
              “ ”
            </ToolbarButton>
            <ToolbarButton label="Bloco de código" active={state.codeBlock} disabled={disabled} onClick={() => chain().toggleCodeBlock().run()}>
              {"{ }"}
            </ToolbarButton>
            {state.codeBlock && (
              <select
                className="editor-language"
                aria-label="Linguagem do bloco de código"
                value={state.language}
                disabled={disabled}
                onChange={(event) => chain().updateAttributes("codeBlock", { language: event.target.value || null }).run()}
              >
                <option value="">Sem destaque</option>
                {codeLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            )}
            <ToolbarButton label="Separador" disabled={disabled} onClick={() => chain().setHorizontalRule().run()}>
              —
            </ToolbarButton>
            <ToolbarButton
              label="Imagem"
              disabled={disabled}
              onClick={async () => {
                const picked = await pickImage();
                if (picked) editor.chain().focus().insertMediaImage({ mediaId: picked.id, alt: picked.alt }).run();
              }}
            >
              Imagem
            </ToolbarButton>
          </div>
          <div className="editor-group">
            <ToolbarButton label="Desfazer" shortcut="Ctrl+Z" disabled={disabled || !state.canUndo} onClick={() => chain().undo().run()}>
              ↶
            </ToolbarButton>
            <ToolbarButton label="Refazer" shortcut="Ctrl+Shift+Z" disabled={disabled || !state.canRedo} onClick={() => chain().redo().run()}>
              ↷
            </ToolbarButton>
          </div>
        </div>
        {linkOpen && <LinkForm editor={editor} onDone={() => setLinkOpen(false)} />}
        <EditorContent editor={editor} />
      </div>
    </MediaPreviewContext.Provider>
  );
}
