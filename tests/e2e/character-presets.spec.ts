import { expect, test } from "@playwright/test";

test("character presets add missing characters as a setup draft", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await page.getByRole("button", { name: "Characters" }).click();
  const text = page.getByLabel("Text to include");
  await text.fill("Hi");
  await page.getByRole("button", { name: "Digits" }).click();
  await expect(text).toHaveValue("Hi 0123456789");
  await expect(page.getByRole("button", { name: "Digits" })).toBeDisabled();
  await expect(page.locator(".analysis")).toContainText("Distinct glyphs: 12");
  await page.getByRole("button", { name: "Hiragana" }).click();
  await expect(page.locator(".analysis")).toContainText("Distinct glyphs: 95");
  await expect(page.locator(".analysis")).toContainText("Print pages: 3");
  await expect(page.locator(".analysis .bad")).toHaveCount(0);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  await expect(
    page.locator(".glyph-tile, .glyph-list button").first(),
  ).toBeVisible();
  await expect(page.locator(".hero-foot")).toContainText("1 / 95 characters");
});
