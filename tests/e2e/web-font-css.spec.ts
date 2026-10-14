import { expect, test } from "@playwright/test";

test("web font CSS is copied and the preview size slider resizes the specimen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const copied: string[] = [];
    Object.defineProperty(window, "__copied", { value: copied });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await page.getByRole("button", { name: "Copy web font CSS" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "CSS copied" }),
  ).toBeVisible();
  const css = await page.evaluate(
    () => (window as unknown as { __copied: string[] }).__copied[0],
  );
  expect(css).toContain('font-family: "Paper Bloom";');
  expect(css).toContain('url("Paper%20Bloom.woff2") format("woff2")');

  const copy = page.locator(".hero-copy");
  const before = await copy.evaluate((el) => getComputedStyle(el).fontSize);
  await page.getByLabel("Preview size").fill("40");
  await expect(copy).toHaveCSS("font-size", "40px");
  expect(before).not.toBe("40px");
});

test("a blocked clipboard reports the failure", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
  });
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await page.getByRole("button", { name: "Copy web font CSS" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "blocked copying" }),
  ).toBeVisible();
});
