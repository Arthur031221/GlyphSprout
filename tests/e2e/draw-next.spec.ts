import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function stroke(page: Page, slant: number) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("missing drawing canvas");
  await page.mouse.move(box.x + 70, box.y + 220);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 70 + slant, { steps: 30 });
  await page.mouse.up();
}

test("a drawing can be used while the next missing glyph opens for drawing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill("XYZ");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  const heading = page.locator(".editor-heading h2");
  await expect(heading).toHaveText("X");
  await page.locator(".draw-launch").click();
  const next = page.getByRole("button", {
    name: "Use and draw next",
    exact: true,
  });

  await stroke(page, 0);
  await next.click();
  await expect(heading).toHaveText("Y");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".count-pill")).toHaveText("1 / 3");

  await stroke(page, 40);
  await next.click();
  await expect(heading).toHaveText("Z");

  // Nothing is missing after Z, so only the plain button remains.
  await expect(next).toHaveCount(0);
  await stroke(page, 80);
  await page.getByRole("button", { name: "Use drawing", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator(".count-pill")).toHaveText("3 / 3");

  // One undo takes back one drawing, not the whole run.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".count-pill")).toHaveText("2 / 3");
});

test("the draw next button is translated", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("zh-TW");
  await page.getByRole("button", { name: "字元" }).click();
  await page.getByLabel("包含文字").fill("XY");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "專案已就緒" }).click();
  await page.getByRole("button", { name: "工坊" }).click();
  await page.locator(".draw-launch").click();
  await expect(
    page.getByRole("button", { name: "使用並繪製下一個", exact: true }),
  ).toBeVisible();
});

test("characters that already have a glyph are skipped", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters" }).click();
  // B keeps its glyph from the sample project, so Z follows X.
  await page.getByLabel("Text to include").fill("XBZ");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.locator(".draw-launch").click();
  await stroke(page, 0);
  await page
    .getByRole("button", { name: "Use and draw next", exact: true })
    .click();
  await expect(page.locator(".editor-heading h2")).toHaveText("Z");
});
