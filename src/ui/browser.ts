import { validateCorners } from "../core/geometry";
import { DETECT_MAX_SIDE, detectCorners } from "../core/markers";
import { pdfFromJpegs } from "../core/pdf";
import {
  MAX_IMAGE_BYTES,
  MAX_PROJECT_BYTES,
  serializeProject,
} from "../core/project";
import { PAPERS, type Paper } from "../core/template";
import type { Project } from "../core/types";

export function download(
  data: BlobPart,
  name: string,
  type = "application/octet-stream",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.replace(/[\\/:*?"<>|\p{Cc}]/gu, "_");
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadProject(project: Project) {
  download(
    serializeProject(project),
    `${project.name || "GlyphSprout"}.glyphsprout.json`,
    "application/json",
  );
}

export function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function chooseProject(onFile: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".glyphsprout.json,application/json";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  };
  input.click();
}

export async function projectText(file: File) {
  if (file.size > MAX_PROJECT_BYTES) throw new Error("projectFileTooLarge");
  return file.text();
}

export async function validateImages(project: Project) {
  const limits = new Map<
    string,
    { dimensions: { width: number; height: number }[]; cell: boolean }
  >();
  for (const glyph of Object.values(project.glyphs))
    limits.set(glyph.source, { dimensions: [], cell: true });
  for (const page of project.pages) {
    const limit = limits.get(page.image) ?? { dimensions: [], cell: false };
    limit.dimensions.push({ width: page.width, height: page.height });
    limits.set(page.image, limit);
  }
  for (const [source, limit] of limits) {
    const bitmap = await createImageBitmap(
      await (await fetch(source)).blob(),
    ).catch(() => {
      throw new Error("invalidProject");
    });
    try {
      if (
        bitmap.width * bitmap.height > 32_000_000 ||
        (limit.cell && (bitmap.width > 1024 || bitmap.height > 1024)) ||
        limit.dimensions.some(
          ({ width, height }) =>
            bitmap.width !== width || bitmap.height !== height,
        )
      )
        throw new Error("invalidProject");
    } finally {
      bitmap.close();
    }
  }
}

const MAX_PAGE_SIDE = 4096;

/** Looks for the printed crosses on a small grayscale copy; null when unsure. */
function findCorners(bitmap: ImageBitmap, width: number, height: number) {
  try {
    const factor = Math.min(1, DETECT_MAX_SIDE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * factor));
    const h = Math.max(1, Math.round(height * factor));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.fillStyle = "white";
    context.fillRect(0, 0, w, h);
    context.drawImage(bitmap, 0, 0, w, h);
    const { data } = context.getImageData(0, 0, w, h);
    const gray = new Uint8Array(w * h);
    for (let i = 0; i < gray.length; i++)
      gray[i] =
        (data[i * 4] * 77 + data[i * 4 + 1] * 151 + data[i * 4 + 2] * 28) >> 8;
    const found = detectCorners(gray, w, h);
    if (!found) return null;
    validateCorners(found, w, h);
    return found.map((p) => ({ x: (p.x / w) * width, y: (p.y / h) * height }));
  } catch {
    return null;
  }
}

export async function imageData(file: File) {
  if (!["image/png", "image/jpeg"].includes(file.type))
    throw new Error("wrongType");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("tooLarge");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("decodeFailed");
  }
  try {
    if (bitmap.width * bitmap.height > 32_000_000) throw new Error("tooLarge");
    const longSide = Math.max(bitmap.width, bitmap.height);
    if (longSide > MAX_PAGE_SIDE) {
      // Phone photos can exceed what some mobile browsers allow in one canvas.
      const ratio = MAX_PAGE_SIDE / longSide;
      const resized = await createImageBitmap(file, {
        resizeWidth: Math.round(bitmap.width * ratio),
        resizeHeight: Math.round(bitmap.height * ratio),
        resizeQuality: "high",
      });
      bitmap.close();
      bitmap = resized;
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("decodeFailed");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const image = canvas.toDataURL(file.type, 0.94);
    if (image.length * 0.75 > MAX_IMAGE_BYTES) throw new Error("tooLarge");
    return {
      image,
      width: canvas.width,
      height: canvas.height,
      detected: findCorners(bitmap, canvas.width, canvas.height),
    };
  } finally {
    bitmap.close();
  }
}

export async function decodeCell(source: string) {
  const image = new Image();
  image.src = source;
  try {
    await image.decode();
  } catch {
    throw new Error("decodeFailed");
  }
  if (image.naturalWidth > 1024 || image.naturalHeight > 1024)
    throw new Error("tooLarge");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("decodeFailed");
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function printSheets(
  sheets: string[],
  title: string,
  paper: Paper = "a4",
) {
  // Requesting noopener here makes window.open return null, even when it opens.
  const popup = window.open("about:blank", "_blank", "width=900,height=1000");
  if (!popup) throw new Error("popupBlocked");
  popup.opener = null;
  popup.document.title = title;
  const style = popup.document.createElement("style");
  style.textContent = `@page{size:${PAPERS[paper].width}mm ${PAPERS[paper].height}mm;margin:0}body{margin:0}img{width:${PAPERS[paper].width}mm;height:${PAPERS[paper].height}mm;display:block;break-after:page}img:last-child{break-after:auto}`;
  popup.document.head.append(style);
  let loaded = 0;
  for (const svg of sheets) {
    const image = popup.document.createElement("img");
    image.onload = () => {
      if (++loaded === sheets.length) popup.print();
    };
    image.src = svgUrl(svg);
    popup.document.body.append(image);
  }
}

const PDF_DPI = 300;

/** Draws each template sheet at print resolution and bundles them into one PDF. */
export async function templatePdf(
  sheets: string[],
  paper: Paper,
): Promise<Uint8Array<ArrayBuffer>> {
  const { width, height } = PAPERS[paper];
  const pixelWidth = Math.round((width / 25.4) * PDF_DPI);
  const pixelHeight = Math.round((height / 25.4) * PDF_DPI);
  const pages = [];
  for (const svg of sheets) {
    const image = new Image();
    image.src = svgUrl(svg);
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("invalidPdf");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, pixelWidth, pixelHeight);
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/jpeg", 0.92),
    );
    if (!blob) throw new Error("invalidPdf");
    pages.push({
      jpeg: new Uint8Array(await blob.arrayBuffer()),
      width: pixelWidth,
      height: pixelHeight,
    });
  }
  return pdfFromJpegs(pages, { width, height });
}
