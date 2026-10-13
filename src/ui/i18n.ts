import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pt from "./locales/pt-BR.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";

export const dictionaries = {
  en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  es,
  fr,
  de,
  "pt-BR": pt,
};
export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof en;
export type MessageKey = keyof Dictionary;
export const languages: [Locale, string][] = [
  ["en", "English"],
  ["zh-TW", "繁體中文"],
  ["zh-CN", "简体中文"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["es", "Español"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["pt-BR", "Português (Brasil)"],
];

export function errorKey(
  error: unknown,
  fallback: MessageKey = "invalidProject",
): MessageKey {
  const key = error instanceof Error ? error.message : fallback;
  const aliases: Record<string, MessageKey> = {
    unsupportedCharacters: "unsupported",
    tooManyCharacters: "tooMany",
    emptyText: "blankCharacters",
    collapsedContour: "increaseSize",
    tooComplex: "increaseSize",
  };
  return key in en ? (key as MessageKey) : (aliases[key] ?? fallback);
}

export function preference(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences are optional in private browsing. */
  }
}
