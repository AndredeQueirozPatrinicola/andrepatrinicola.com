import { data, type ShouldRevalidateFunctionArgs } from "react-router";

import { isLocale, type Locale } from "./config";

/** Validates the `:lang` URL segment, answering 404 for unknown locales. */
export function requireLocale(params: { lang?: string }): Locale {
  if (!isLocale(params.lang)) {
    throw data(null, { status: 404 });
  }
  return params.lang;
}

/**
 * With `ssr: false`, React Router only reloads a route when its own path
 * params change; `:lang` belongs to the parent layout. Every localized page
 * re-exports this so switching language reloads its (translated) data.
 */
export function shouldRevalidate({
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  return currentParams.lang !== nextParams.lang || defaultShouldRevalidate;
}
