import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("Missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

test("a dim photo with a shadow still converts to the drawn strokes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill("Shaded scan");
  await page.getByLabel("Text to include").fill("AB");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 4242;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing fixture context");
    // Paper is 140 on the left and 160 on the right, both under the ink
    // threshold of 165, so unflattened it reads as solid ink.
    const paper = context.createLinearGradient(0, 0, 3000, 0);
    paper.addColorStop(0, "rgb(140,140,140)");
    paper.addColorStop(1, "rgb(160,160,160)");
    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgb(20,20,20)";
    context.fillRect(324 + 150, 570 + 160, 100, 140);
    context.fillRect(804 + 120, 570 + 100, 180, 240);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles({
    name: "shaded-sheet.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page
    .getByLabel(
      "I confirmed the visible page ID, page assignment and interior alignment",
    )
    .check();
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  const converted = await backup(page);
  for (const [character, width] of [
    ["A", 100 / 420],
    ["B", 180 / 420],
  ] as const) {
    const contours = converted.glyphs[character].contours;
    expect(contours).toHaveLength(1);
    const xs = contours[0].map((point) => point.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(width, 1);
  }
});
