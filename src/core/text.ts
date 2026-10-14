import { MAX_GLYPHS } from "./types";

export function isSupported(character: string): boolean {
  const cp = character.codePointAt(0) ?? 0;
  return (
    ((cp >= 0x21 && cp <= 0x7e) ||
      (cp >= 0xa1 && cp <= 0x24f && cp !== 0xad) ||
      (cp >= 0x370 && cp <= 0x3ff) ||
      (cp >= 0x400 && cp <= 0x52f) ||
      (cp >= 0x3000 && cp <= 0x303f) ||
      (cp >= 0x3041 && cp <= 0x3096) ||
      (cp >= 0x3131 && cp <= 0x318e) ||
      (cp >= 0x309b && cp <= 0x30ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0x2000 && cp <= 0x206f && !/\p{Cf}/u.test(character)) ||
      (cp >= 0x20a0 && cp <= 0x20cf) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)) &&
    !/\p{M}|\p{Cn}|\p{Cc}/u.test(character)
  );
}

export function isCjk(character: string): boolean {
  const cp = character.codePointAt(0) ?? 0;
  return (
    (cp >= 0x3000 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    cp >= 0xff01
  );
}

export interface TextAnalysis {
  text: string;
  characters: string[];
  unsupported: string[];
  overflow: boolean;
}

export function analyzeText(input: string): TextAnalysis {
  const text = input.normalize("NFC").replace(/\s/gu, " ");
  const distinct = [...new Set([...text].filter((ch) => ch !== " "))];
  return {
    text,
    characters: distinct.filter(isSupported),
    unsupported: distinct.filter((ch) => !isSupported(ch)),
    overflow: distinct.length > MAX_GLYPHS,
  };
}

export function codepoint(character: string): string {
  return `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) =>
    String.fromCodePoint(from + i),
  );

export const CHARACTER_SETS = {
  uppercase: range(0x41, 0x5a),
  lowercase: range(0x61, 0x7a),
  digits: range(0x30, 0x39),
  punctuation: [..."!?.,:;'\"()-&@/%"],
  accentedLower: [..."àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿß"],
  accentedUpper: [..."ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ"],
  greek: [
    ...range(0x391, 0x3a9).filter((ch) => ch !== "\u03a2"),
    ...range(0x3b1, 0x3c9),
  ],
  cyrillic: [...range(0x410, 0x44f), "\u0401", "\u0451"],
  hiragana: range(0x3041, 0x3093),
  katakana: range(0x30a1, 0x30f6),
  hangulLetters: range(0x3131, 0x3163),
} as const;
export type CharacterSetId = keyof typeof CHARACTER_SETS;

export function missingFromSet(text: string, set: CharacterSetId): string[] {
  const present = new Set(text.normalize("NFC"));
  return CHARACTER_SETS[set].filter((ch) => !present.has(ch));
}

export function addCharacterSet(text: string, set: CharacterSetId): string {
  const missing = missingFromSet(text, set);
  if (!missing.length) return text;
  const base = text.trimEnd();
  return `${base}${base ? " " : ""}${missing.join("")}`;
}

/** Supported characters in typed text that the project doesn't have yet, in order of first use. */
export function charactersToAdd(
  typed: string,
  existing: readonly string[],
): string[] {
  const have = new Set(existing);
  return analyzeText(typed).characters.filter((ch) => !have.has(ch));
}

export function appendCharacters(text: string, add: readonly string[]): string {
  if (!add.length) return text;
  const base = text.trimEnd();
  return `${base}${base ? " " : ""}${add.join("")}`;
}
