import { useState } from "react";
import {
  dictionaries,
  type Locale,
  languages,
  preference,
  remember,
} from "./i18n";

export function SecureContextRequired() {
  const [locale, setLocale] = useState<Locale>(() => {
    const value = preference("glyphsprout.locale", "en");
    return value in dictionaries ? (value as Locale) : "en";
  });
  const t = dictionaries[locale];
  return (
    <main className="loading">
      <h1>GlyphSprout</h1>
      <p role="alert">{t.secureContextRequired}</p>
      <label>
        {t.language}
        <select
          value={locale}
          onChange={(event) => {
            const value = event.target.value as Locale;
            setLocale(value);
            remember("glyphsprout.locale", value);
            document.documentElement.lang = value;
          }}
        >
          {languages.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <p>
        <a href="https://arthur031221.github.io/GlyphSprout/">
          {t.openLiveWorkshop}
        </a>
      </p>
    </main>
  );
}
