import { describe, expect, it } from "vitest";
import de from "../src/ui/locales/de.json";
import en from "../src/ui/locales/en.json";
import es from "../src/ui/locales/es.json";
import fr from "../src/ui/locales/fr.json";
import ja from "../src/ui/locales/ja.json";
import ko from "../src/ui/locales/ko.json";
import pt from "../src/ui/locales/pt-BR.json";
import zhCN from "../src/ui/locales/zh-CN.json";
import zhTW from "../src/ui/locales/zh-TW.json";

describe("locale resources", () => {
  const locales = [
    ["zh-TW", zhTW],
    ["zh-CN", zhCN],
    ["ja", ja],
    ["ko", ko],
    ["es", es],
    ["fr", fr],
    ["de", de],
    ["pt-BR", pt],
  ] as const;

  it("keep exact key parity across all supported locales", () => {
    const base = Object.keys(en).sort();
    for (const [, locale] of locales) {
      expect(Object.keys(locale).sort()).toEqual(base);
    }
  });

  it("translate visible strings instead of copying English", () => {
    // These standalone technical names have no localized spelling in the UI.
    const technicalOnly = new Set([
      "TTF",
      "WOFF2",
      "JPEG",
      "PNG",
      "SVG",
      "NIST",
      "MiB",
      "Hiragana",
      "Katakana",
    ]);
    for (const [name, locale] of locales) {
      for (const [key, english] of Object.entries(en)) {
        if (technicalOnly.has(english)) continue;
        expect(locale[key as keyof typeof locale], `${name}.${key}`).not.toBe(
          english,
        );
      }
    }
  });

  it("do not copy Japanese text into other language interfaces", () => {
    for (const [name, locale] of locales) {
      if (name === "ja") continue;
      for (const [key, value] of Object.entries(locale)) {
        expect(value, `${name}.${key}`).not.toMatch(/[\u3040-\u30ff]/u);
      }
    }
  });
});
