import {
  MAX_IMAGE_BYTES,
  MAX_PROJECT_BYTES,
  serializeProject,
} from "../core/project";
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
    return { image, width: canvas.width, height: canvas.height };
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

export function printSheets(sheets: string[], title: string) {
  // Requesting noopener here makes window.open return null, even when it opens.
  const popup = window.open("about:blank", "_blank", "width=900,height=1000");
  if (!popup) throw new Error("popupBlocked");
  popup.opener = null;
  popup.document.title = title;
  const style = popup.document.createElement("style");
  style.textContent =
    "@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block;break-after:page}img:last-child{break-after:auto}";
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
