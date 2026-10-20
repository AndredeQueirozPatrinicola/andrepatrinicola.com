import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";

import type { Locale } from "../i18n/config";
import { I18nProvider } from "../i18n/context";
import { getMessages } from "../i18n/messages";

/** Renders inside a router and the i18n context, as a localized route would. */
type Options = { locale?: Locale; path?: string };

export function renderLocalized(ui: ReactNode, { locale = "en", path = `/${locale}` }: Options = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider value={{ locale, messages: getMessages(locale) }}>{ui}</I18nProvider>
    </MemoryRouter>,
  );
}
