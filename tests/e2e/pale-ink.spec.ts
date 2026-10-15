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

test("pencil strokes lighter than the default threshold still convert", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill("Pencil scan");
  await page.getByLabel("Text to include").fill("AB");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 4242;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing fixture context");
    // Pencil is 175 on paper that reads 245, so it sits above the default
    // ink threshold of 165 and used to convert to an empty cell.
    context.fillStyle = "rgb(245,245,245)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgb(175,175,175)";
    context.fillRect(324 + 150, 570 + 160, 100, 140);
    context.fillRect(804 + 120, 570 + 100, 180, 240);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles({
    name: "pencil-sheet.png",
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
    expect(converted.glyphs[character].settings.threshold).toBeGreaterThan(165);
  }
});
