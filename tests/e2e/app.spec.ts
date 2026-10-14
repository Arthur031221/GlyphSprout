import { expect, test } from "@playwright/test";

const projectStatus = (page: import("@playwright/test").Page) =>
  page.locator(".project-label [role=status]");

test("first visit loads the paper sample, previews it, exports TTF and applies controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await expect(projectStatus(page)).toHaveText("Saved");
  await expect(page.locator(".sample-disclosure")).toContainText("NIST scan");
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.fonts].some((face) =>
          face.family.startsWith("GlyphSprout-preview-"),
        ),
      ),
    )
    .toBe(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.ttf$/);
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByRole("button", { name: "文字" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "工房の手順" }),
  ).toBeVisible();
});

test("drawing a glyph can be undone and redone in project history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Draw a glyph" }).click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("drawing canvas is missing");
  await page.mouse.move(box.x + 55, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 190, box.y + 45, { steps: 12 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Use drawing" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(projectStatus(page)).toHaveText("Saved", { timeout: 10000 });
});

test("saved project recovers and failed imports keep it intact", async ({
  page,
}) => {
  await page.goto("/");
  await expect(projectStatus(page)).toHaveText("Saved");
  await page.reload();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Open project" }).first().click(),
  ]);
  await chooser.setFiles({
    name: "broken.glyphsprout.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your current project is unchanged" }),
  ).toBeVisible();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
});

test("scan images stay staged until page assignment is confirmed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles("tests/e2e/fixtures/sample.png");
  await expect(
    page.getByRole("button", { name: /Page 1: sample.png/ }),
  ).toBeVisible();
  await expect(
    page.getByLabel(
      "I confirmed the visible page ID, page assignment and interior alignment",
    ),
  ).toBeVisible();
  await page
    .getByLabel(
      "I confirmed the visible page ID, page assignment and interior alignment",
    )
    .check();
  await page.getByRole("button", { name: "Discard staged scans" }).click();
  await expect(page.getByText("sample.png · Page 1")).toHaveCount(0);
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
});

test("production app shell reopens offline after its cache is ready", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Load sample" })).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
});
