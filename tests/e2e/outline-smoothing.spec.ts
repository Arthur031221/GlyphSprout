import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

test("smoothing rounds a glyph outline and zero restores the pixel outline", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const original = await backup(page);
  expect(original.glyphs.H.settings.smoothing).toBe(0);
  const smoothing = page.getByLabel("Outline smoothing (0 to 3)", {
    exact: true,
  });
  await expect(smoothing).toHaveValue("0");
  await smoothing.fill("3");
  await smoothing.press("Tab");
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
  const smooth = await backup(page);
  expect(smooth.glyphs.H.settings.smoothing).toBe(3);
  expect(smooth.glyphs.H.contours).not.toEqual(original.glyphs.H.contours);
  expect(smooth.glyphs.H.reviewed).toBe(false);
  await smoothing.fill("0");
  await smoothing.press("Tab");
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
  const restored = await backup(page);
  expect(restored.glyphs.H.contours).toEqual(original.glyphs.H.contours);
});

test("an out of range smoothing value is rejected and keeps the glyph", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const smoothing = page.getByLabel("Outline smoothing (0 to 3)", {
    exact: true,
  });
  await smoothing.fill("4");
  await smoothing.press("Tab");
  await expect(page.getByRole("alert")).toBeVisible();
  const kept = await backup(page);
  expect(kept.glyphs.H.settings.smoothing).toBe(0);
});
