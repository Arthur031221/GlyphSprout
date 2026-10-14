export const SPECIMEN_WIDTH = 1600;
export const SPECIMEN_PADDING = 96;
export const SPECIMEN_FONT_SIZE = 150;
const MAX_LINES = 24;

type Measure = (value: string) => number;

function splitByCharacter(run: string, maxWidth: number, measure: Measure) {
  const pieces: string[] = [];
  let piece = "";
  for (const character of run) {
    if (piece && measure(piece + character) > maxWidth) {
      pieces.push(piece);
      piece = "";
    }
    piece += character;
  }
  pieces.push(piece);
  return pieces;
}

/** Breaks text at spaces, between Han and kana characters, and inside runs that cannot fit. */
export function wrapSpecimen(
  text: string,
  maxWidth: number,
  measure: Measure,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/u)) {
    let line = "";
    const tokens =
      paragraph.match(
        /\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\s\S]/gu,
      ) ?? [];
    for (const raw of tokens) {
      const blank = /^\s+$/u.test(raw);
      if (blank && !line) continue;
      const token = blank ? " " : raw;
      if (measure((line + token).trimEnd()) <= maxWidth) {
        line += token;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = "";
      if (blank) continue;
      const pieces = splitByCharacter(token, maxWidth, measure);
      lines.push(...pieces.slice(0, -1));
      line = pieces.at(-1) ?? "";
    }
    lines.push(line.trimEnd());
  }
  return lines.slice(0, MAX_LINES);
}
