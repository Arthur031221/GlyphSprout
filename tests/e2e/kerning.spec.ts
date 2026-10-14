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

test("kerning pairs change the preview, save with the project and undo", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  const letters = page.locator(".hero-copy span");
  // Distance between the two letters' left edges: the advance of H plus any kerning.
  const gap = async () =>
    ((await letters.nth(1).boundingBox())?.x ?? 0) -
    ((await letters.nth(0).boundingBox())?.x ?? 0);
  await page.getByLabel("Type a specimen").fill("HE");
  const before = await gap();
  expect(before).toBeGreaterThan(0);

  const panel = page.locator(".kern-panel");
  await expect(panel.getByText("No pairs yet.")).toBeVisible();
  await panel.getByLabel("First letter").selectOption("H");
  await panel.getByLabel("Second letter").selectOption("E");
  await panel.getByLabel("Adjustment").fill("-120");
  await panel.getByRole("button", { name: "Set pair" }).click();

  await expect(
    panel.getByRole("list", { name: "Kerning pairs" }),
  ).toContainText("HE-120");
  await expect.poll(gap).toBeLessThan(before - 4);
  expect((await backup(page)).kerning).toEqual([
    { left: "H", right: "E", value: -120 },
  ]);

  await panel.getByLabel("Adjustment").fill("900");
  await panel.getByRole("button", { name: "Set pair" }).click();
  await expect(page.getByRole("alert")).toContainText("whole number from -300");
  await expect(panel.getByLabel("Adjustment")).toHaveValue("-120");

  await panel.getByRole("button", { name: "Remove pair HE" }).click();
  await expect(panel.getByText("No pairs yet.")).toBeVisible();
  await expect.poll(gap).toBeCloseTo(before, 0);
  expect((await backup(page)).kerning).toBeUndefined();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    panel.getByRole("list", { name: "Kerning pairs" }),
  ).toContainText("HE-120");
});
