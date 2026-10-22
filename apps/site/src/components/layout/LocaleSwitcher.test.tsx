import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../../i18n/context";
import { getMessages } from "../../i18n/messages";
import { LOCALE_STORAGE_KEY } from "../../i18n/paths";
import { LocaleSwitcher } from "./LocaleSwitcher";

function Shell({ children }: { children?: ReactNode }) {
  return (
    <I18nProvider value={{ locale: "pt", messages: getMessages("pt") }}>
      <LocaleSwitcher />
      {children}
    </I18nProvider>
  );
}

async function renderAt(path: string, pageData?: unknown) {
  const router = createMemoryRouter(
    [{ path: "*", element: <Shell />, ...(pageData ? { loader: () => pageData } : {}) }],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
}

describe("LocaleSwitcher", () => {
  beforeEach(() => localStorage.clear());

  it("links to the same page in every language", async () => {
    await renderAt("/pt/games/pong");

    expect(screen.getByRole("link", { name: /English/ })).toHaveAttribute("href", "/en/games/pong");
    expect(screen.getByRole("link", { name: /Español/ })).toHaveAttribute("href", "/es/games/pong");
    expect(screen.getByRole("link", { name: /Português/ })).toHaveAttribute("aria-current", "true");
  });

  it("uses the page's own links when slugs are translated", async () => {
    await renderAt("/pt/blog/arquitetura", {
      localeLinks: { pt: "/pt/blog/arquitetura", en: "/en/blog/architecture", es: "/es/blog" },
    });

    expect(screen.getByRole("link", { name: /English/ })).toHaveAttribute("href", "/en/blog/architecture");
    // No Spanish translation: the Spanish blog index instead of a missing page.
    expect(screen.getByRole("link", { name: /Español/ })).toHaveAttribute("href", "/es/blog");
  });

  it("remembers an explicit choice", async () => {
    await renderAt("/pt");

    await userEvent.click(screen.getByRole("link", { name: /English/ }));

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });
});
