import { defaultLocale, localeInfo, locales } from "../i18n/config";
import { pickLocale } from "../i18n/detect";
import { getMessages } from "../i18n/messages";
import { LOCALE_STORAGE_KEY, localePath } from "../i18n/paths";
import { absoluteUrl } from "../seo/site";
import type { Route } from "./+types/language-select";

/**
 * `/` has no language of its own. This inline script runs before the page is
 * painted and sends the visitor to the stored or browser language; the links
 * below serve crawlers and visitors without JavaScript.
 */
const redirectScript = `(function () {
  var pickLocale = ${pickLocale.toString()};
  var stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)}); } catch (e) {}
  var preferred = navigator.languages || [navigator.language || ""];
  var locale = pickLocale(${JSON.stringify(locales)}, ${JSON.stringify(defaultLocale)}, preferred, stored);
  location.replace("/" + locale + location.search + location.hash);
})();`;

export function loader() {
  const site = getMessages("pt").site;
  const options = locales.map((locale) => ({
    locale,
    tag: localeInfo[locale].tag,
    label: `${getMessages(locale).languagePicker.title}: ${localeInfo[locale].nativeName}`,
  }));
  return { title: site.name, description: site.description, options };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData.title },
    { name: "description", content: loaderData.description },
    { tagName: "link", rel: "canonical", href: absoluteUrl("/") },
    ...loaderData.options.map((option) => ({
      tagName: "link",
      rel: "alternate",
      hrefLang: option.tag,
      href: absoluteUrl(localePath(option.locale)),
    })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/") },
  ];
}

export default function LanguageSelect({ loaderData }: Route.ComponentProps) {
  return (
    <main className="language-select">
      <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      <ul>
        {loaderData.options.map((option) => (
          <li key={option.locale} lang={option.tag}>
            <a href={localePath(option.locale)}>{option.label}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
