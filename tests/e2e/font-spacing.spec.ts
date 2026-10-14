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

test("word space and side bearing apply to the whole font and undo together", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();

  const space = page.getByLabel("Word space");
  await expect(space).toHaveValue("350");
  await space.fill("620");
  await space.press("Enter");
  await expect.poll(async () => (await backup(page)).spaceWidth).toBe(620);

  await space.fill("50");
  await space.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Word space must be");
  await expect(space).toHaveValue("620");

  const bearing = page.getByLabel("Latin side bearing");
  await bearing.fill("90");
  const match = page.getByRole("button", {
    name: "Use this side bearing for all Latin letters",
  });
  await match.focus();
  await match.press("Enter");
  await expect(page.getByText("Letters changed: 5")).toBeVisible();
  const project = await backup(page);
  expect(
    Object.values(project.glyphs).map((glyph) => glyph.settings.sideBearing),
  ).toEqual(Array(6).fill(90));

  await page.getByRole("button", { name: "Undo" }).click();
  const undone = await backup(page);
  expect(
    Object.values(undone.glyphs).filter(
      (glyph) => glyph.settings.sideBearing === 90,
    ),
  ).toHaveLength(1);
  expect(undone.spaceWidth).toBe(620);
});
