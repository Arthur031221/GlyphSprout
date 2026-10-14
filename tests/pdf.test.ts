import { expect, it } from "vitest";
import { pdfFromJpegs } from "../src/core/pdf";

const jpeg = (size: number) =>
  Uint8Array.from({ length: size }, (_, i) => (i === 0 ? 0xff : i % 256));
const text = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

it("writes one page per image at the paper size in points", () => {
  const pdf = text(
    pdfFromJpegs(
      [
        { jpeg: jpeg(40), width: 10, height: 14 },
        { jpeg: jpeg(60), width: 10, height: 14 },
      ],
      { width: 210, height: 297 },
    ),
  );
  expect(pdf.startsWith("%PDF-1.4")).toBe(true);
  expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(pdf).toContain("/Count 2");
  expect(pdf).toContain("/MediaBox [0 0 595.28 841.89]");
  expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2);
  expect(pdf).toContain("/Filter /DCTDecode /Length 60");
});

it("points every cross reference entry at its object", () => {
  const bytes = pdfFromJpegs([{ jpeg: jpeg(500), width: 5, height: 5 }], {
    width: 215.9,
    height: 279.4,
  });
  const pdf = text(bytes);
  const table = Number(pdf.match(/startxref\n(\d+)\n/)?.[1]);
  expect(pdf.slice(table, table + 4)).toBe("xref");
  const entries = pdf.slice(table).match(/\d{10} 00000 n /g) ?? [];
  expect(entries).toHaveLength(5);
  entries.forEach((entry, index) => {
    const at = Number.parseInt(entry, 10);
    expect(pdf.slice(at, at + 8)).toBe(`${index + 1} 0 obj\n`);
  });
  const image = pdf.indexOf("stream\n", pdf.indexOf("/Subtype /Image")) + 7;
  expect(Array.from(bytes.slice(image, image + 500))).toEqual(
    Array.from(jpeg(500)),
  );
});

it("refuses a document without pages", () => {
  expect(() => pdfFromJpegs([], { width: 210, height: 297 })).toThrow(
    "invalidPdf",
  );
});
