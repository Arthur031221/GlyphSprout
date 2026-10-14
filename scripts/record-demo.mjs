import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { workshopServer } from "../bin/server.mjs";

const recordingDir = resolve("artifacts/demo");
const outputDir = recordingDir;
await mkdir(recordingDir, { recursive: true });
await mkdir("assets", { recursive: true });
const server = await workshopServer(resolve("dist"));
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 1,
    recordVideo: { dir: recordingDir, size: { width: 1440, height: 810 } },
  });
  const started = Date.now();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText("Font preview ready", { exact: true }).waitFor();
  const trim = (Date.now() - started) / 1000 + 0.3;
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(
    page.getByRole("heading", { name: "Set up your font" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Font name" }).fill("Weekend");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.locator(".glyph-tile").nth(5).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await page.waitForTimeout(1200);
  const canvas = page.locator(".draw-canvas canvas");
  await expect(
    page.getByRole("button", { name: "Apply source edits", exact: true }),
  ).toBeEnabled();
  await canvas.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Pan", exact: true }).click();
  const view = await page.locator(".drawing-viewport").boundingBox();
  if (!view) throw new Error("Source viewport is not visible.");
  await page.mouse.move(view.x + view.width / 2, view.y + view.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    view.x + view.width / 2 - 30,
    view.y + view.height / 2 - 18,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Eraser", exact: true }).click();
  await page.waitForTimeout(800);
  await page
    .getByLabel("Eraser size, source pixels", { exact: true })
    .fill("12");
  const zoomed = await canvas.boundingBox();
  if (!zoomed) throw new Error("Magnified canvas is not visible.");
  await page.mouse.move(view.x + view.width / 2, view.y + view.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    view.x + view.width / 2 + 22,
    view.y + view.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Fit image", exact: true }).click();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Source editing canvas is not visible.");
  await page.getByRole("button", { name: "Eraser", exact: true }).click();
  await page.mouse.move(
    bounds.x + bounds.width * 0.32,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.67,
    bounds.y + bounds.height * 0.5,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Pen", exact: true }).click();
  await page.mouse.move(
    bounds.x + bounds.width * 0.45,
    bounds.y + bounds.height * 0.38,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.52,
    bounds.y + bounds.height * 0.62,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1400);
  await expect(page.locator(".draft-notice")).toContainText(
    "Drawing edits are not saved",
  );
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  await page.getByText("Font preview ready", { exact: true }).waitFor();
  await page.getByLabel("Ink threshold", { exact: true }).fill("140");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(
    page.getByRole("button", { name: "Mark reviewed" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[type="file"][accept="image/png,image/jpeg"]')
    .setInputFiles("tests/e2e/fixtures/paper.png");
  const corrected = page.locator(".rectified-preview");
  await expect(corrected).toHaveAttribute("aria-busy", "false");
  await page.locator(".scan-preview").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const corner = page.locator(".corner-handle").first();
  const target = await corner.boundingBox();
  if (!target) throw new Error("Missing corner handle");
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2 + 14,
    target.y + target.height / 2 + 10,
    { steps: 18 },
  );
  await page.mouse.up();
  await expect(corrected).toHaveAttribute("aria-busy", "false");
  await corrected.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Remove scan: paper.png" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.waitForTimeout(1800);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF", exact: true }).click();
  await (await event).saveAs(resolve(outputDir, "Weekend-source-edited.ttf"));
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(3500);
  const video = page.video();
  await context.close();
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-ss",
    String(trim),
    "-i",
    await video.path(),
    "-filter_complex",
    "[0:v]fps=9,scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
    "-loop",
    "0",
    "-y",
    "assets/demo.gif",
  ]);
  console.log(
    "Recorded font setup, source editing, scan alignment with corrected preview, and a TTF download.",
  );
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
