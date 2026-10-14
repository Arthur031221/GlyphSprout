import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("the outline shows the left edge and advance width guides", async ({
  page,
}) => {
  await page.goto("/");
  const guides = page.locator(".outline-wrap svg line.guide");
  await expect(guides).toHaveCount(2);
  await expect(guides.first()).toHaveAttribute("x1", "0");
  await expect(page.locator(".guide-note")).toContainText("advance width");

  const advance = page.getByLabel("Advance width, 0 automatic", {
    exact: true,
  });
  await advance.fill("900");
  await advance.press("Enter");
  await expect(guides.nth(1)).toHaveAttribute("x1", "900");
});

test("the guide note is translated", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("de");
  await expect(page.locator(".guide-note")).toContainText("Dickte");
});
