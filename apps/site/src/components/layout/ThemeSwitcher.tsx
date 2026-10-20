import { useI18n } from "../../i18n/context";
import { themePreferences, type ThemePreference } from "../../theme/theme";
import { useThemePreference } from "../../theme/useThemePreference";
import { PixelIcon, type PixelIconName } from "../ui/PixelIcon";

const iconFor: Record<ThemePreference, PixelIconName> = {
  system: "system",
  light: "sun",
  dark: "moon",
};

export function ThemeSwitcher() {
  const { messages } = useI18n();
  const [preference, setPreference] = useThemePreference();

  return (
    <fieldset className="theme-switcher">
      <legend className="visually-hidden">{messages.a11y.themeSwitcher}</legend>
      {themePreferences.map((option) => (
        <label key={option} className="theme-switcher-option" title={messages.theme[option]}>
          <input
            type="radio"
            name="theme"
            value={option}
            checked={preference === option}
            onChange={() => setPreference(option)}
            className="visually-hidden"
          />
          <PixelIcon name={iconFor[option]} />
          <span className="visually-hidden">{messages.theme[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}
