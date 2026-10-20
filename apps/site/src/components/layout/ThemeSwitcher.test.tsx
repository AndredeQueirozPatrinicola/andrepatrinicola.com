import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../../i18n/context";
import { getMessages } from "../../i18n/messages";
import { ThemeSwitcher } from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themePreference;
  });

  it("starts on the system preference and applies a manual choice", async () => {
    render(
      <I18nProvider value={{ locale: "en", messages: getMessages("en") }}>
        <ThemeSwitcher />
      </I18nProvider>,
    );

    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
