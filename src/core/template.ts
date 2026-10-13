import type { Point } from "./types";
import { BASELINE } from "./types";

export const TEMPLATE = {
  width: 1000,
  height: 1414,
  columns: 5,
  rows: 7,
  perPage: 35,
  originX: 108,
  originY: 190,
  stepX: 160,
  stepY: 162,
  cellSize: 144,
  markers: [
    { x: 52, y: 108 },
    { x: 948, y: 108 },
    { x: 948, y: 1362 },
    { x: 52, y: 1362 },
  ] as [Point, Point, Point, Point],
};

export function cellRect(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TEMPLATE.perPage)
    throw new Error("invalidPage");
  return {
    x: TEMPLATE.originX + (slot % TEMPLATE.columns) * TEMPLATE.stepX,
    y: TEMPLATE.originY + Math.floor(slot / TEMPLATE.columns) * TEMPLATE.stepY,
    width: TEMPLATE.cellSize,
    height: TEMPLATE.cellSize,
  };
}

export function pageCharacters(
  characters: string[],
  pageIndex: number,
): string[] {
  return characters.slice(
    pageIndex * TEMPLATE.perPage,
    (pageIndex + 1) * TEMPLATE.perPage,
  );
}

export function pageCount(characters: string[]): number {
  return Math.ceil(characters.length / TEMPLATE.perPage);
}

function escapeXml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch] ?? ch,
  );
}

export function templateSvg(
  characters: string[],
  name: string,
  projectId: string,
  pageIndex: number,
  labels = {
    page: "Page",
    of: "of",
    write: "Write inside each square. The lower faint line is the baseline.",
    registration:
      "Keep the four registration crosses visible. Flat paper, dark ink, even light.",
    footer: "Template v1 / 5 x 7 / A4 / Print at actual size",
  },
): string {
  const chars = pageCharacters(characters, pageIndex);
  const cells = chars
    .map((ch, i) => {
      const r = cellRect(i),
        baseline = r.y + BASELINE * r.height;
      return `<text x="${r.x}" y="${r.y - 10}" font-size="15" fill="#203247">${escapeXml(ch)} <tspan font-size="10" fill="#607185">${i + 1 + pageIndex * TEMPLATE.perPage}</tspan></text><rect x="${r.x - 2}" y="${r.y - 2}" width="${r.width + 4}" height="${r.height + 4}" fill="none" stroke="#9aa9b5" stroke-width="0.8"/><path d="M${r.x} ${baseline}h${r.width} M${r.x} ${r.y + r.height * 0.2}h${r.width} M${r.x + r.width / 2} ${r.y}v${r.height}" stroke="#edf0f3" stroke-width="1"/>`;
    })
    .join("");
  const marks = TEMPLATE.markers
    .map(
      (p) =>
        `<path d="M${p.x - 12} ${p.y}h24 M${p.x} ${p.y - 12}v24" stroke="#203247" stroke-width="3"/><circle cx="${p.x}" cy="${p.y}" r="5" fill="white" stroke="#203247" stroke-width="2"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="210mm" height="297mm"><rect width="1000" height="1414" fill="white"/><g font-family="sans-serif"><text x="108" y="68" font-size="28" fill="#203247">${escapeXml(name)}</text><text x="108" y="93" font-size="13" fill="#607185">GlyphSprout / ${escapeXml(projectId.slice(0, 8))} / ${escapeXml(labels.page)} ${pageIndex + 1} ${escapeXml(labels.of)} ${pageCount(characters)}</text><text x="108" y="143" font-size="13" fill="#203247">${escapeXml(labels.write)}</text><text x="108" y="165" font-size="11" fill="#607185">${escapeXml(labels.registration)}</text>${cells}<text x="108" y="1375" font-size="11" fill="#607185">${escapeXml(labels.footer)}</text></g>${marks}</svg>`;
}
