// Contextual alternates for second versions of letters. The font gets one
// `calt` feature: a letter that has a second version switches to it when the
// glyph before it is a first version (not a space, not another second version).
// So a repeated letter, or a letter after one without a second version, comes
// out written differently. Browsers, word processors and design tools apply
// `calt` by default.

export interface Alternate {
  base: number;
  alt: number;
}

const u16 = (value: number) => [(value >> 8) & 255, value & 255];
const tag = (name: string) => [...name].map((c) => c.charCodeAt(0));

function coverage(glyphs: readonly number[]): number[] {
  const sorted = [...glyphs].sort((a, b) => a - b);
  return [...u16(1), ...u16(sorted.length), ...sorted.flatMap(u16)];
}

/**
 * `firstVersions` are the glyphs that count as a first version before a letter.
 * Glyph ids are those of the finished font.
 */
export function gsubTable(
  alternates: readonly Alternate[],
  firstVersions: readonly number[],
): Uint8Array {
  const sorted = [...alternates].sort((a, b) => a.base - b.base);
  const baseCoverage = coverage(sorted.map((a) => a.base));
  const backtrackCoverage = coverage(firstVersions);
  // Single substitution, format 2: the glyph array follows the sorted coverage.
  const single = [
    ...u16(2),
    ...u16(6 + 2 * sorted.length),
    ...u16(sorted.length),
    ...sorted.flatMap((a) => u16(a.alt)),
    ...baseCoverage,
  ];
  // Chaining context, format 3: one backtrack glyph, one input glyph.
  const chainHeader = 18;
  const chain = [
    ...u16(3),
    ...u16(1),
    ...u16(chainHeader),
    ...u16(1),
    ...u16(chainHeader + backtrackCoverage.length),
    ...u16(0),
    ...u16(1),
    ...u16(0),
    ...u16(1),
    ...backtrackCoverage,
    ...baseCoverage,
  ];
  const lookup = (type: number, subtable: number[]) => [
    ...u16(type),
    ...u16(0),
    ...u16(1),
    ...u16(8),
    ...subtable,
  ];
  const chainLookup = lookup(6, chain);
  const singleLookup = lookup(1, single);
  const lookupList = [
    ...u16(2),
    ...u16(6),
    ...u16(6 + chainLookup.length),
    ...chainLookup,
    ...singleLookup,
  ];
  const langSys = [...u16(0), ...u16(0xffff), ...u16(1), ...u16(0)];
  const script = [...u16(4), ...u16(0), ...langSys];
  const scripts = ["DFLT", "cyrl", "grek", "latn"];
  const scriptList = [
    ...u16(scripts.length),
    ...scripts.flatMap((name) => [
      ...tag(name),
      ...u16(2 + scripts.length * 6),
    ]),
    ...script,
  ];
  const feature = [...u16(0), ...u16(1), ...u16(0)];
  const featureList = [...u16(1), ...tag("calt"), ...u16(8), ...feature];
  const headerSize = 10;
  return Uint8Array.from([
    ...u16(1),
    ...u16(0),
    ...u16(headerSize),
    ...u16(headerSize + scriptList.length),
    ...u16(headerSize + scriptList.length + featureList.length),
    ...scriptList,
    ...featureList,
    ...lookupList,
  ]);
}

function checksum(bytes: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    sum +=
      ((bytes[i] << 24) |
        ((bytes[i + 1] ?? 0) << 16) |
        ((bytes[i + 2] ?? 0) << 8) |
        (bytes[i + 3] ?? 0)) >>>
      0;
  }
  return sum >>> 0;
}

/** Returns the font with one more table, rebuilding the directory and the checksums. */
export function withTable(
  font: ArrayBuffer,
  name: string,
  data: Uint8Array,
): ArrayBuffer {
  const view = new DataView(font);
  const count = view.getUint16(4);
  const tables = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const key = String.fromCharCode(...new Uint8Array(font, at, 4));
    tables.set(
      key,
      new Uint8Array(font, view.getUint32(at + 8), view.getUint32(at + 12)),
    );
  }
  tables.set(name, data);
  const keys = [...tables.keys()].sort();
  const entrySelector = Math.floor(Math.log2(keys.length));
  const searchRange = 16 * 2 ** entrySelector;
  const padded = (length: number) => (length + 3) & ~3;
  let offset = 12 + keys.length * 16;
  const total = keys.reduce(
    (sum, key) => sum + padded(tables.get(key)?.length ?? 0),
    offset,
  );
  const out = new Uint8Array(total);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, view.getUint32(0));
  outView.setUint16(4, keys.length);
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, keys.length * 16 - searchRange);
  let headAt = -1;
  keys.forEach((key, i) => {
    const bytes = new Uint8Array(tables.get(key) ?? []);
    const record = 12 + i * 16;
    if (key === "head") {
      bytes.fill(0, 8, 12);
      headAt = offset;
    }
    out.set(bytes, offset);
    out.set(tag(key), record);
    outView.setUint32(record + 4, checksum(bytes));
    outView.setUint32(record + 8, offset);
    outView.setUint32(record + 12, bytes.length);
    offset += padded(bytes.length);
  });
  if (headAt >= 0)
    outView.setUint32(headAt + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out.buffer;
}
