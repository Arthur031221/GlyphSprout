import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { workshopServer } from "../bin/server.mjs";

await mkdir("artifacts/demo", { recursive: true });
await mkdir("assets", { recursive: true });
const server = await workshopServer(resolve("dist"));
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 1,
    recordVideo: { dir: "artifacts/demo", size: { width: 1440, height: 810 } },
  });
  const started = Date.now();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText("Font preview ready", { exact: true }).waitFor();
  const trim = (Date.now() - started) / 1000 + 0.3;
  await page.waitForTimeout(2000);
  await page.locator(".glyph-tile").nth(5).click();
  await page.waitForTimeout(500);
  const scale = page.getByLabel("Size", { exact: true });
  await scale.fill("1.12");
  await scale.press("Tab");
  await page.getByText("Font preview ready", { exact: true }).waitFor();
  await page.waitForTimeout(2200);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF", exact: true }).click();
  await (await event).saveAs("artifacts/demo/PaperBloom-edited.ttf");
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(4500);
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
    "[0:v]fps=12,scale=1200:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5",
    "-loop",
    "0",
    "-y",
    "assets/demo.gif",
  ]);
  console.log("Recorded the real workshop, a size edit and TTF download.");
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
