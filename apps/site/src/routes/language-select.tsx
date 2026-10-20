import { localeInfo, locales } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import { LOCALE_STORAGE_KEY, localePath } from "../i18n/paths";
import type { Route } from "./+types/language-select";

/**
 * `/` has no language of its own. This inline script runs before the page is
 * painted and sends the visitor to the stored or browser language; the links
 * below serve crawlers and visitors without JavaScript.
 */
const redirectScript = `(function () {
  var supported = ${JSON.stringify(locales)};
  var stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)}); } catch (e) {}
  var target = supported.indexOf(stored) >= 0 ? stored : null;
  var preferred = navigator.languages || [navigator.language || ""];
  for (var i = 0; !target && i < preferred.length; i++) {
    var language = String(preferred[i]).toLowerCase().split("-")[0];
    if (supported.indexOf(language) >= 0) target = language;
  }
  location.replace("/" + (target || ${JSON.stringify(locales[0])}) + location.search + location.hash);
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
