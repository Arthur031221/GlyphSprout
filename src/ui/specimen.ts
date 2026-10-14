import {
  SPECIMEN_FONT_SIZE,
  SPECIMEN_PADDING,
  SPECIMEN_WIDTH,
  wrapSpecimen,
} from "../core/specimen";

export async function renderSpecimen(
  family: string,
  text: string,
  title: string,
): Promise<Blob> {
  const font = `${SPECIMEN_FONT_SIZE}px "${family}"`;
  await document.fonts.load(font, text);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("invalidFont");
  context.font = font;
  const lines = wrapSpecimen(
    text,
    SPECIMEN_WIDTH - SPECIMEN_PADDING * 2,
    (value) => context.measureText(value).width,
  );
  const lineHeight = Math.round(SPECIMEN_FONT_SIZE * 1.4);
  canvas.width = SPECIMEN_WIDTH;
  canvas.height = SPECIMEN_PADDING * 2 + lines.length * lineHeight + 72;
  context.fillStyle = "#fbfaf6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1f2d2a";
  context.font = font;
  context.textBaseline = "alphabetic";
  lines.forEach((line, index) => {
    context.fillText(
      line,
      SPECIMEN_PADDING,
      SPECIMEN_PADDING + SPECIMEN_FONT_SIZE + index * lineHeight,
    );
  });
  context.fillStyle = "#5f6f6a";
  context.font = '28px system-ui, "Segoe UI", sans-serif';
  const footer = canvas.height - SPECIMEN_PADDING / 2;
  context.textAlign = "left";
  context.fillText(title, SPECIMEN_PADDING, footer);
  context.textAlign = "right";
  context.fillText("GlyphSprout", SPECIMEN_WIDTH - SPECIMEN_PADDING, footer);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("invalidFont"))),
      "image/png",
    ),
  );
}
