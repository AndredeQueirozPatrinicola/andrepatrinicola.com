import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ContentDoc } from "../../../domain/blog";
import { RichTextEditor } from "./RichTextEditor";

const value: ContentDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Corpo." }] }] };

function setup(onChange = vi.fn()) {
  render(<RichTextEditor label="Corpo do artigo" value={value} onChange={onChange} previews={{}} pickImage={async () => null} />);
  return onChange;
}

describe("RichTextEditor", () => {
  it("mounts with an accessible toolbar and does not report a change on load", async () => {
    const onChange = setup();
    expect(await screen.findByRole("textbox", { name: "Corpo do artigo" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Formatação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Negrito" })).toHaveAttribute("aria-pressed", "false");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("only accepts safe links", async () => {
    setup();
    await screen.findByRole("textbox", { name: "Corpo do artigo" });
    await userEvent.click(screen.getByRole("button", { name: "Link" }));
    const input = screen.getByLabelText("Endereço do link");
    await userEvent.type(input, "javascript:alert(1)");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.getByText(/Use um endereço https/)).toBeInTheDocument();
  });
});
