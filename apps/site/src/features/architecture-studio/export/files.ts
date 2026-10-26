/**
 * Exports, all generated in the browser on demand. Nothing is uploaded.
 */
import type { Rect } from "@xyflow/react";

import type { ArchitectureDiagram } from "../model/types";

/** "Minha API · v2" → "minha-api-v2". */
export function fileSlug(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "diagram";
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function diagramJson(diagram: ArchitectureDiagram): string {
  return `${JSON.stringify(diagram, null, 2)}\n`;
}

export function exportJson(diagram: ArchitectureDiagram): void {
  downloadBlob(new Blob([diagramJson(diagram)], { type: "application/json" }), `${fileSlug(diagram.title)}.architecture.json`);
}

const PADDING = 48;
/** Largest side of the exported image, in CSS pixels (doubled by the pixel ratio). */
const MAX_SIDE = 4096;

/** Size and transform that frame the whole diagram at 1:1 (scaled down only when huge). */
export function pngFrame(bounds: Rect) {
  const naturalWidth = bounds.width + PADDING * 2;
  const naturalHeight = bounds.height + PADDING * 2;
  const scale = Math.min(1, MAX_SIDE / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.ceil(naturalWidth * scale));
  const height = Math.max(1, Math.ceil(naturalHeight * scale));
  const viewport = { x: (PADDING - bounds.x) * scale, y: (PADDING - bounds.y) * scale, zoom: scale };
  return { width, height, viewport };
}

const SVG_PROPERTIES = ["stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "fill", "opacity"] as const;

/**
 * html-to-image copies computed styles onto HTML elements but not onto SVG
 * shapes, so lines styled by the stylesheet (stroke, dashes) would come out
 * invisible. Their computed values are written inline for the capture and
 * removed afterwards.
 */
function inlineSvgStyles(root: HTMLElement): () => void {
  const shapes = [...root.querySelectorAll<SVGElement>(".react-flow__edges path, .react-flow__edges marker path")];
  const previous = shapes.map((shape) => shape.getAttribute("style"));
  for (const shape of shapes) {
    const computed = getComputedStyle(shape);
    for (const property of SVG_PROPERTIES) shape.style.setProperty(property, computed.getPropertyValue(property));
  }
  return () =>
    shapes.forEach((shape, index) => {
      const style = previous[index];
      if (style === null) shape.removeAttribute("style");
      else shape.setAttribute("style", style);
    });
}

/**
 * Renders the diagram (nodes, connections and labels, without the editor's
 * controls) to a PNG. The canvas element's background color is used so the
 * image matches the current theme.
 */
export async function exportPng(root: HTMLElement, bounds: Rect, title: string): Promise<void> {
  const viewportElement = root.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewportElement || bounds.width <= 0 || bounds.height <= 0) throw new Error("Nothing to export.");
  const { toBlob } = await import("html-to-image");
  const { width, height, viewport } = pngFrame(bounds);
  const background = getComputedStyle(root).backgroundColor || "#ffffff";

  const restore = inlineSvgStyles(viewportElement);
  const blob = await toBlob(viewportElement, {
    backgroundColor: background,
    width,
    height,
    pixelRatio: 2,
    cacheBust: false,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
    // Connection points and resize handles are editor chrome, not diagram.
    filter: (node) =>
      !(node instanceof HTMLElement && (node.classList.contains("react-flow__handle") || node.classList.contains("react-flow__resize-control"))),
  }).finally(restore);
  if (!blob) throw new Error("The image could not be generated.");
  downloadBlob(blob, `${fileSlug(title)}.png`);
}
