import { data } from "react-router";

import { isLocale, type Locale } from "./config";

/** Validates the `:lang` URL segment, answering 404 for unknown locales. */
export function requireLocale(params: { lang?: string }): Locale {
  if (!isLocale(params.lang)) {
    throw data(null, { status: 404 });
  }
  return params.lang;
}
