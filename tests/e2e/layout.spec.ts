import { expect, test } from "@playwright/test";

test("primary actions have readable contrast in light, dark and system themes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const theme of ["system", "light", "dark"]) {
      await page.locator("#theme").selectOption(theme);
      const contrast = await page
        .locator(".export-panel .primary")
        .evaluate(async (el) => {
          await Promise.all(
            el.getAnimations().map((animation) => animation.finished),
          );
          function luminance(color: string) {
            const channels = (color.match(/\d+/g) ?? [])
              .slice(0, 3)
              .map(Number);
            return channels.reduce((sum, channel, index) => {
              const value = channel / 255;
              const linear =
                value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4;
              return sum + linear * [0.2126, 0.7152, 0.0722][index];
            }, 0);
          }
          const style = getComputedStyle(el);
          const foreground = luminance(style.color);
          const background = luminance(style.backgroundColor);
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        });
      expect(
        contrast,
        `${scheme} system with ${theme} theme`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("template cards and their actions fit narrow screens in every locale", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Characters" }).click();
  await page
    .getByLabel("Text to include")
    .fill("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk");
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(page.locator(".page-card")).toHaveCount(2);
  const locales = await page
    .locator("#locale option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
  for (const locale of locales) {
    await page.locator("#locale").selectOption(locale);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        actions: [...document.querySelectorAll(".page-card button")].map(
          (button) => {
            const action = button.getBoundingClientRect();
            const card = button.closest(".page-card")?.getBoundingClientRect();
            if (!card) throw new Error("template action has no card");
            return action.left >= card.left && action.right <= card.right;
          },
        ),
      }));
      expect(layout.width, `${locale} at ${width}px`).toBeLessThanOrEqual(
        width,
      );
      expect(layout.actions, `${locale} at ${width}px`).toEqual([
        true,
        true,
        true,
        true,
      ]);
    }
  }
});
