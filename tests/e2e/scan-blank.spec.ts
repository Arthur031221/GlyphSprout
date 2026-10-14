import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("cells with no ink are named after conversion", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill("Blank cells");
  await page.getByLabel("Text to include").fill("ABC");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 4242;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing fixture context");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "black";
    // Only the first of three template cells is written, at three times print size.
    context.fillRect(324 + 150, 570 + 160, 100, 140);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles({
    name: "one-letter.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page
    .getByLabel(
      "I confirmed the visible page ID, page assignment and interior alignment",
    )
    .check();
  await page.getByRole("button", { name: "Convert scans" }).click();
  const notice = page
    .getByRole("status")
    .filter({ hasText: "These cells had no ink" });
  await expect(notice).toBeVisible({ timeout: 30000 });
  await expect(notice).toContainText("Scans converted");
  await expect(notice).toContainText("right page: B C");
});
