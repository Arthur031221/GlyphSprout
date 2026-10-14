export type PdfPage = { jpeg: Uint8Array; width: number; height: number };

const POINTS_PER_MM = 72 / 25.4;

/**
 * One PDF with one full-bleed JPEG per page. `pageMm` is the paper size and the
 * images are stretched to it, so printing at 100% gives the actual size.
 */
export function pdfFromJpegs(
  pages: PdfPage[],
  pageMm: { width: number; height: number },
): Uint8Array<ArrayBuffer> {
  if (pages.length === 0) throw new Error("invalidPdf");
  const w = +(pageMm.width * POINTS_PER_MM).toFixed(2);
  const h = +(pageMm.height * POINTS_PER_MM).toFixed(2);
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}`);
    if (stream) {
      push("\nstream\n");
      push(stream);
      push("\nendstream");
    }
    push("\nendobj\n");
  };
  // Objects 1 and 2 are the catalog and page tree, then three per page.
  const pageId = (i: number) => 3 + i * 3;
  push("%PDF-1.4\n%âãÏÓ\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, i) => `${pageId(i)} 0 R`)
      .join(" ")}] >>`,
  );
  pages.forEach((page, i) => {
    const id = pageId(i);
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`,
    );
    object(id + 1, `<< /Length ${content.length} >>`, encoder.encode(content));
    object(
      id + 2,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`,
      page.jpeg,
    );
  });
  const count = 3 + pages.length * 3;
  const tableAt = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++)
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(
    `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${tableAt}\n%%EOF\n`,
  );
  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
