import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../../i18n/context";
import { getMessages } from "../../i18n/messages";
import { LOCALE_STORAGE_KEY } from "../../i18n/paths";
import { LocaleSwitcher } from "./LocaleSwitcher";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider value={{ locale: "pt", messages: getMessages("pt") }}>
        <LocaleSwitcher />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("LocaleSwitcher", () => {
  beforeEach(() => localStorage.clear());

  it("links to the same page in every language", () => {
    renderAt("/pt/games/pong");

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/games/pong");
    expect(screen.getByRole("link", { name: "Español" })).toHaveAttribute("href", "/es/games/pong");
    expect(screen.getByRole("link", { name: "Português" })).toHaveAttribute("aria-current", "true");
  });

  it("remembers an explicit choice", async () => {
    renderAt("/pt");

    await userEvent.click(screen.getByRole("link", { name: "English" }));

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });
});
