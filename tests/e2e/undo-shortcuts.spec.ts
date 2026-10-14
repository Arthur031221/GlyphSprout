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

test("Ctrl+Z and Ctrl+Shift+Z undo and redo a glyph change", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const weight = page.getByLabel("Stroke weight (-3 thinner to 3 bolder)");
  await weight.fill("2");
  await weight.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(2);

  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(0);
  await expect(page.getByRole("button", { name: "Redo" })).toBeEnabled();

  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(2);
});

test("the shortcut leaves text fields to the browser", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const weight = page.getByLabel("Stroke weight (-3 thinner to 3 bolder)");
  await weight.fill("2");
  await weight.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(2);

  const specimen = page.getByLabel("Type a specimen");
  await specimen.click();
  await page.keyboard.type("X");
  await expect(specimen).toHaveValue("HELLO JOBX");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(specimen).toHaveValue("HELLO JOB");
  expect((await backup(page)).glyphs.H.settings.weight).toBe(2);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
});
