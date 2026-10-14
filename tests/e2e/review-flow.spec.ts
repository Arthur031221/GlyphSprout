import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("review progress jumps to the next unreviewed glyph and arrow keys move between glyphs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  const progress = page.locator(".review-progress");
  const next = page.getByRole("button", { name: "Next to review" });
  const active = page.locator(".glyph-tile.active");
  await expect(progress).toContainText("All glyphs reviewed");
  await expect(next).toHaveCount(0);

  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(progress).toContainText("5 / 6 reviewed");
  await expect(next).toBeDisabled();

  await page.getByRole("button", { name: /^L / }).click();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(progress).toContainText("4 / 6 reviewed");
  await expect(next).toBeEnabled();
  await next.click();
  await expect(active).toContainText("H");

  await active.focus();
  await page.keyboard.press("ArrowRight");
  await expect(active).toContainText("E");
  await page.keyboard.press("ArrowRight");
  await expect(active).toContainText("L");
  await page.keyboard.press("ArrowLeft");
  await expect(active).toContainText("E");
  await expect(active).toBeFocused();
});
