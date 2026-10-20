import type { Locale } from "../config";
import { en } from "./en";
import { es } from "./es";
import { pt, type Messages } from "./pt";

const dictionaries: Record<Locale, Messages> = { pt, en, es };

/**
 * Only called from route loaders, which run at build time: the dictionaries
 * reach the browser through loader data, one locale at a time.
 */
export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export type { Messages };
