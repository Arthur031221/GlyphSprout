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

test("a noisy cell keeps its source for repair without rejecting the other glyphs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill("Scan recovery");
  await page.getByLabel("Text to include").fill("AB");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 4242;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing fixture context");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "black";
    // Two template cells at three times the printed page resolution.
    for (let y = 9; y < 423; y += 6)
      for (let x = 9; x < 423; x += 6) context.fillRect(324 + x, 570 + y, 2, 2);
    context.fillRect(324 + 150, 570 + 160, 100, 140);
    context.fillRect(804 + 120, 570 + 100, 180, 240);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles({
    name: "noisy-sheet.png",
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
    page
      .getByRole("status")
      .filter({ hasText: "These cells need simpler outlines" }),
  ).toContainText("A", { timeout: 30000 });
  const converted = await backup(page);
  expect(converted.glyphs.A.contours).toEqual([]);
  expect(converted.glyphs.A.source).toMatch(/^data:image\/png;base64,/);
  expect(converted.glyphs.A.pageId).toBe(converted.pages[0].id);
  expect(converted.glyphs.B.contours.length).toBeGreaterThan(0);
  expect(converted.glyphs.B.settings.smoothing).toBe(2);
  expect(converted.glyphs.A).not.toHaveProperty("needsRepair");
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.getByRole("button", { name: /^A / }).click();
  await page.getByLabel("Minimum speck area", { exact: true }).fill("16");
  await page.getByLabel("Minimum speck area", { exact: true }).blur();
  const repaired = await backup(page);
  expect(repaired.glyphs.A.contours).toHaveLength(1);
  expect(repaired.glyphs.A.source).toBe(converted.glyphs.A.source);
  expect(repaired.glyphs.B).toEqual(converted.glyphs.B);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Scan recovery.ttf");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await backup(page)).glyphs.A.contours).toEqual([]);
});
