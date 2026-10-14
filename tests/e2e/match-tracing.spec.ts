import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

test("one glyph's tracing values apply to every glyph and undo together", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();

  const before = await backup(page);
  const glyphs = Object.values(before.glyphs);
  expect(glyphs).toHaveLength(6);
  const original = glyphs.map((glyph) => glyph.settings.threshold);

  const threshold = page.getByLabel("Ink threshold", { exact: true });
  await threshold.fill("120");
  await threshold.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.threshold)
    .toBe(120);
  const smoothing = page.getByLabel("Outline smoothing (0 to 3)", {
    exact: true,
  });
  await smoothing.fill("0");
  await smoothing.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.smoothing)
    .toBe(0);
  const traced = await backup(page);
  expect(traced.glyphs.E.settings.threshold).toBe(original[1]);

  await page
    .getByRole("button", {
      name: "Use this threshold, speck filter and smoothing for all glyphs",
    })
    .click();
  await expect(page.getByText("Glyphs changed: 5")).toBeVisible();

  const matched = await backup(page);
  for (const glyph of Object.values(matched.glyphs)) {
    expect(glyph.settings.threshold).toBe(120);
    expect(glyph.settings.smoothing).toBe(0);
    expect(glyph.contours.length).toBeGreaterThan(0);
    expect(glyph.reviewed).toBe(false);
  }

  await page.getByRole("button", { name: "Undo" }).click();
  const undone = await backup(page);
  expect(undone.glyphs.E.settings.threshold).toBe(original[1]);
  expect(undone.glyphs.H.settings.threshold).toBe(120);
});
