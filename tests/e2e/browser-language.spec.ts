import { expect, test } from "@playwright/test";

test.describe("browser language", () => {
  test.use({ locale: "zh-HK" });
  test("a first visit opens in the browser language and a chosen language wins on the next visit", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#locale")).toHaveValue("zh-TW");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-TW");
    await expect(page.getByRole("button", { name: /字元/ })).toBeVisible();

    await page.locator("#locale").selectOption("en");
    await page.reload();
    await expect(page.locator("#locale")).toHaveValue("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("button", { name: /Characters/ }),
    ).toBeVisible();
  });
});

test.describe("unsupported browser language", () => {
  test.use({ locale: "it-IT" });
  test("falls back to English", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#locale")).toHaveValue("en");
  });
});
