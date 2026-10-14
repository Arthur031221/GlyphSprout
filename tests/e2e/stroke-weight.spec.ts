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

function area(contours: { x: number; y: number }[][]) {
  return contours.reduce((sum, loop) => {
    let twice = 0;
    loop.forEach((a, i) => {
      const b = loop[(i + 1) % loop.length];
      twice += a.x * b.y - b.x * a.y;
    });
    return sum + twice / 2;
  }, 0);
}

test("stroke weight makes a glyph bolder or thinner and zero restores it", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const original = await backup(page);
  expect(original.glyphs.H.settings.weight).toBe(0);
  const weight = page.getByLabel("Stroke weight (-3 thinner to 3 bolder)");
  await expect(weight).toHaveValue("0");

  await weight.fill("2");
  await weight.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(2);
  const bold = await backup(page);
  expect(Math.abs(area(bold.glyphs.H.contours))).toBeGreaterThan(
    Math.abs(area(original.glyphs.H.contours)),
  );
  expect(bold.glyphs.H.reviewed).toBe(false);

  await weight.fill("-1");
  await weight.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(-1);
  const thin = await backup(page);
  expect(Math.abs(area(thin.glyphs.H.contours))).toBeLessThan(
    Math.abs(area(original.glyphs.H.contours)),
  );

  await weight.fill("0");
  await weight.press("Tab");
  await expect
    .poll(async () => (await backup(page)).glyphs.H.settings.weight)
    .toBe(0);
  expect((await backup(page)).glyphs.H.contours).toEqual(
    original.glyphs.H.contours,
  );
});

test("an out of range stroke weight is rejected and keeps the glyph", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const weight = page.getByLabel("Stroke weight (-3 thinner to 3 bolder)");
  await weight.fill("4");
  await weight.press("Tab");
  await expect(page.getByRole("alert")).toBeVisible();
  expect((await backup(page)).glyphs.H.settings.weight).toBe(0);
});
