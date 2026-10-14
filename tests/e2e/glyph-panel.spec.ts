import { expect, test } from "@playwright/test";

test("the glyph list has a heading of its own and the settings buttons share one row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const heading = page.locator(".glyph-browser h2");
  await expect(heading).toHaveText("Glyphs");

  const row = page.locator(".settings-actions");
  const labels = [
    "Reset settings",
    "Use this threshold, speck filter, weight and smoothing for all glyphs",
    "Edit source",
  ];
  const tops: number[] = [];
  for (const name of labels) {
    const button = row.getByRole("button", { name, exact: true });
    await expect(button).toBeVisible();
    tops.push((await button.boundingBox())?.y ?? -1);
  }
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);

  await page.getByLabel("Language").selectOption("zh-TW");
  await expect(heading).toHaveText("字形");
  await expect(heading).not.toHaveText("個字元");
});

test("the settings buttons wrap inside the panel on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const panel = await page.locator(".settings-actions").boundingBox();
  const parent = await page.locator(".workshop-layout").boundingBox();
  expect(panel).not.toBeNull();
  expect(parent).not.toBeNull();
  const buttons = page.locator(".settings-actions button");
  for (let i = 0; i < (await buttons.count()); i += 1) {
    const box = await buttons.nth(i).boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual((parent?.x ?? 0) - 1);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (parent?.x ?? 0) + (parent?.width ?? 0) + 1,
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
});
