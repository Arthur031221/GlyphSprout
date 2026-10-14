import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

test("font information is saved, validated and undone", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();

  const designer = page.getByLabel("Designer");
  await designer.fill("  Ada   Writer ");
  await designer.press("Enter");
  await expect
    .poll(async () => (await backup(page)).info?.designer)
    .toBe("Ada Writer");
  await expect(designer).toHaveValue("Ada Writer");

  await page
    .getByRole("button", { name: "Use the SIL Open Font License" })
    .click();
  await expect
    .poll(async () => (await backup(page)).info?.licenseUrl)
    .toBe("https://openfontlicense.org");

  const url = page.getByLabel("License URL");
  await url.fill("example.com");
  await url.press("Enter");
  await expect(page.getByRole("alert")).toContainText("start the license URL");
  await expect(url).toHaveValue("https://openfontlicense.org");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => (await backup(page)).info?.licenseUrl)
    .toBeUndefined();
  expect((await backup(page)).info?.designer).toBe("Ada Writer");
});
