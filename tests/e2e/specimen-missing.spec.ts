import { expect, test } from "@playwright/test";

test("typing text the font lacks offers to add those characters", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const missing = page.locator(".specimen-missing");
  await expect(missing).toHaveCount(0);
  const specimen = page.getByLabel("Type a specimen");
  await specimen.fill("HELLO job!");
  await expect(missing).toContainText("Not in the project yet");
  await expect(missing.locator("strong")).toHaveText("j o b !");
  page.once("dialog", (dialog) => void dialog.accept());
  await missing.getByRole("button", { name: "Add these characters" }).click();
  await expect(page.locator(".hero-foot")).toContainText("/ 10 characters");
  await expect(specimen).toHaveValue("HELLO job!");
  await expect(missing).toHaveCount(0);
  await expect(page.getByRole("button", { name: "02 Pages" })).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("declining the confirmation leaves the project unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Type a specimen").fill("Zed");
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page
    .locator(".specimen-missing")
    .getByRole("button", { name: "Add these characters" })
    .click();
  await expect(page.locator(".hero-foot")).toContainText("6 / 6 characters");
  await expect(page.locator(".specimen-missing strong")).toHaveText("Z e d");
});

test("the add button is translated", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("zh-TW");
  await page.locator("textarea").first().fill("zzz");
  await expect(page.locator(".specimen-missing")).toContainText(
    "專案中還沒有的字",
  );
  await expect(
    page.locator(".specimen-missing").getByRole("button"),
  ).toHaveText("加入這些字");
});
