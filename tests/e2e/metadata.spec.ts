import { expect, test } from "@playwright/test";

test("the page ships a description, an icon and an installable manifest", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /handwriting/,
  );
  const icon = await request.get("/favicon.svg");
  expect(icon.ok()).toBe(true);
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const manifest = await request.get(`/${manifestHref}`);
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.display).toBe("standalone");
  expect(data.icons[0].src).toBe("favicon.svg");
});
