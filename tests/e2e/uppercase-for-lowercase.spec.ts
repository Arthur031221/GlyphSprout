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

test("lowercase letters can use the uppercase glyphs, save and undo", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  const letters = page.locator(".hero-copy span.missing-preview");
  await page.getByLabel("Type a specimen").fill("hello");
  await expect(letters).toHaveCount(5);
  await expect(page.locator(".specimen-missing")).toContainText("h e l o");

  const option = page.getByLabel(
    "Type lowercase letters with my uppercase glyphs",
  );
  await expect(option).not.toBeChecked();
  await option.check();
  await expect(letters).toHaveCount(0);
  await expect(page.locator(".specimen-missing")).toHaveCount(0);
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();

  // The lowercase text now takes exactly the room of the uppercase glyphs.
  const widthOf = async (text: string) => {
    await page.getByLabel("Type a specimen").fill(text);
    const spans = page.locator(".hero-copy span");
    const first = await spans.first().boundingBox();
    const last = await spans.last().boundingBox();
    return Math.round((last?.x ?? 0) - (first?.x ?? 0));
  };
  const lower = await widthOf("hello");
  expect(lower).toBeGreaterThan(0);
  expect(lower).toBe(await widthOf("HELLO"));

  expect((await backup(page)).upperForLower).toBe(true);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(option).not.toBeChecked();
  expect((await backup(page)).upperForLower).toBeUndefined();
});

test("the option label is translated", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("zh-TW");
  await expect(page.getByLabel("小寫字母使用大寫字形")).toBeVisible();
});
