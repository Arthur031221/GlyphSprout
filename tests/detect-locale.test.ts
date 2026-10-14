import { describe, expect, it } from "vitest";
import { detectLocale } from "../src/ui/i18n";

describe("detectLocale", () => {
  it("maps browser languages to the interface languages", () => {
    expect(detectLocale(["ja-JP"])).toBe("ja");
    expect(detectLocale(["ko"])).toBe("ko");
    expect(detectLocale(["es-MX"])).toBe("es");
    expect(detectLocale(["fr-CA"])).toBe("fr");
    expect(detectLocale(["de-AT"])).toBe("de");
    expect(detectLocale(["pt-PT"])).toBe("pt-BR");
    expect(detectLocale(["pt"])).toBe("pt-BR");
  });

  it("separates Traditional and Simplified Chinese", () => {
    for (const tag of ["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-CN"]) {
      expect(detectLocale([tag])).toBe("zh-TW");
    }
    for (const tag of ["zh", "zh-CN", "zh-SG", "zh-Hans", "zh-Hans-TW"]) {
      expect(detectLocale([tag])).toBe("zh-CN");
    }
  });

  it("takes the first language the app has, in the browser's order", () => {
    expect(detectLocale(["it-IT", "fr-FR", "en-US"])).toBe("fr");
    expect(detectLocale(["en-GB", "de"])).toBe("en");
  });

  it("falls back to English", () => {
    expect(detectLocale([])).toBe("en");
    expect(detectLocale(["it", "ru-RU", ""])).toBe("en");
  });
});
