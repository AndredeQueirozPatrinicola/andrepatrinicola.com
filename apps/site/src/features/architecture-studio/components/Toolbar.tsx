import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";

import { PixelIcon } from "../../../components/ui/PixelIcon";
import { limits } from "../model/types";
import { useStudio } from "./StudioContext";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "template";

type ToolbarProps = {
  title: string;
  onTitleChange: (title: string) => void;
  readOnlyTemplate: boolean;
  status: SaveStatus;
  mode: "explore" | "edit";
  onModeChange: (mode: "explore" | "edit") => void;
  onEditCopy: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onNew: () => void;
  onTemplates: () => void;
  onLibrary: () => void;
  onImportFile: (file: File) => void;
  onExportJson: () => void;
  onExportPng: () => void;
  leftLabel: string;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  exitTo: string;
};

function FileMenu(props: ToolbarProps) {
  const { text } = useStudio();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) props.onImportFile(file);
  }

  const items: [string, "new" | "templates" | "library" | "import" | "json" | "png"][] = [
    [text.toolbar.new, "new"],
    [text.toolbar.templates, "templates"],
    [text.toolbar.library, "library"],
    [text.toolbar.import, "import"],
    [text.toolbar.exportJson, "json"],
    [text.toolbar.exportPng, "png"],
  ];

  function choose(item: (typeof items)[number][1]) {
    setOpen(false);
    if (item === "import") inputRef.current?.click();
    else ({ new: props.onNew, templates: props.onTemplates, library: props.onLibrary, json: props.onExportJson, png: props.onExportPng })[item]();
  }

  return (
    <div className="studio-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="studio-button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        {text.toolbar.file}
      </button>
      <ul id={menuId} className="studio-menu-list" hidden={!open}>
        {items.map(([label, item]) => (
          <li key={item}>
            <button type="button" onClick={() => choose(item)}>
              {label}
            </button>
          </li>
        ))}
      </ul>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={onFile} data-testid="studio-import-input" />
    </div>
  );
}

export function Toolbar(props: ToolbarProps) {
  const { text } = useStudio();
  const titleId = useId();
  const statusText: Record<SaveStatus, string> = {
    saved: text.status.saved,
    saving: text.status.saving,
    unsaved: text.status.unsaved,
    error: text.status.notSaved,
    template: text.status.template,
  };

  return (
    <div className="studio-toolbar" role="toolbar" aria-label={text.toolbar.label}>
      <div className="studio-toolbar-group">
        <Link className="studio-icon-button studio-exit" to={props.exitTo} aria-label={text.toolbar.back} title={text.toolbar.back}>
          <PixelIcon name="arrow" size={14} className="studio-exit-icon" />
        </Link>
        <label className="visually-hidden" htmlFor={titleId}>
          {text.toolbar.titleLabel}
        </label>
        <input
          id={titleId}
          className="studio-title"
          type="text"
          value={props.title}
          maxLength={limits.title}
          readOnly={props.readOnlyTemplate}
          onChange={(event) => props.onTitleChange(event.target.value)}
        />
        <span className="studio-status" data-status={props.status} role="status">
          {statusText[props.status]}
        </span>
      </div>

      <div className="studio-toolbar-group">
        <button type="button" className="studio-button studio-panel-toggle" aria-pressed={props.leftOpen} onClick={props.onToggleLeft}>
          {props.leftLabel}
        </button>
        <FileMenu {...props} />
        {!props.readOnlyTemplate && (
          <>
            <button type="button" className="studio-button" onClick={props.onSave} aria-keyshortcuts="Control+S Meta+S">
              {text.toolbar.save}
            </button>
            <button
              type="button"
              className="studio-button"
              onClick={props.onUndo}
              disabled={!props.canUndo || props.mode !== "edit"}
              aria-keyshortcuts="Control+Z Meta+Z"
            >
              {text.toolbar.undo}
            </button>
            <button
              type="button"
              className="studio-button"
              onClick={props.onRedo}
              disabled={!props.canRedo || props.mode !== "edit"}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            >
              {text.toolbar.redo}
            </button>
          </>
        )}
        {props.readOnlyTemplate ? (
          <button type="button" className="studio-button" data-variant="primary" onClick={props.onEditCopy}>
            {text.toolbar.editCopy}
          </button>
        ) : (
          <div className="studio-segmented" role="group" aria-label={text.toolbar.mode}>
            {(["explore", "edit"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={props.mode === mode} onClick={() => props.onModeChange(mode)}>
                {mode === "edit" ? text.toolbar.edit : text.toolbar.explore}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="studio-button studio-panel-toggle" aria-pressed={props.rightOpen} onClick={props.onToggleRight}>
          {props.mode === "edit" ? text.toolbar.properties : text.inspector.title}
        </button>
      </div>
    </div>
  );
}
