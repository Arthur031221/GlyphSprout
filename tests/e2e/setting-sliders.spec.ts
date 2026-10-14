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

test("setting sliders mirror the number fields and apply when released", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();

  const start = (await backup(page)).glyphs.H.settings;
  const slider = page.getByRole("slider", {
    name: "Ink threshold, slider",
    exact: true,
  });
  const number = page.getByLabel("Ink threshold", { exact: true });
  await expect(slider).toHaveValue(String(start.threshold));

  await slider.focus();
  await slider.press("ArrowLeft");
  await slider.press("ArrowLeft");
  await expect(number).toHaveValue(String(start.threshold - 2));
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.threshold)
    .toBe(start.threshold - 2);

  await number.fill("100");
  await number.press("Enter");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.threshold)
    .toBe(100);
  await expect(slider).toHaveValue("100");

  const weight = page.getByRole("slider", {
    name: "Stroke weight (-3 thinner to 3 bolder), slider",
    exact: true,
  });
  await weight.focus();
  await weight.press("ArrowRight");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(start.weight + 1);

  await expect(
    page.getByRole("slider", { name: /^Advance width/ }),
  ).toHaveCount(0);
});
