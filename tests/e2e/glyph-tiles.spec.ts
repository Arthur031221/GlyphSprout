import { expect, test } from "@playwright/test";

test("glyph tiles show the traced outline and keep an accessible name", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page.locator(".glyph-tile");
  await expect(tiles).toHaveCount(6);
  for (const index of [0, 5]) {
    const tile = tiles.nth(index);
    await expect(tile.locator(".glyph-thumb path")).toHaveCount(1);
    const size = await tile.locator(".glyph-thumb").boundingBox();
    expect(size?.height).toBeGreaterThan(20);
  }
  await expect(page.locator('.glyph-tile[aria-label^="H "]')).toBeVisible();
  await tiles.nth(2).click();
  await expect(tiles.nth(2)).toHaveAttribute("aria-pressed", "true");
});

test("a cleared glyph falls back to its typed character", async ({ page }) => {
  await page.goto("/");
  await page.locator(".glyph-tile").first().click();
  await page.getByRole("button", { name: "Clear glyph" }).click();
  const tile = page.locator(".glyph-tile").first();
  await expect(tile.locator(".glyph-thumb")).toHaveCount(0);
  await expect(tile).toContainText("H");
});
