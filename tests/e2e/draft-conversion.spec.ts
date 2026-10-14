import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download project", exact: true })
    .click();
  const file = await (await event).path();
  if (!file) throw new Error("missing project backup");
  return JSON.parse(await readFile(file, "utf8"));
}

async function prepare(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const sample = await backup(page);
  const characters = [
    "H",
    ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789").filter(
      (ch) => ch !== "H",
    ),
  ];
  const { pageId: _, ...glyph } = sample.glyphs.H;
  const project = {
    ...sample,
    id: "draft-conversion",
    text: characters.join(""),
    characters,
    pages: [],
    glyphs: { H: glyph },
  };
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await (await chooser).setFiles({
    name: "draft-conversion.glyphsprout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.locator(".editor h2")).toHaveText("H");
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  const canvas = page.locator(".draw-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("missing drawing canvas");
  await page.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.7,
    bounds.y + bounds.height * 0.7,
  );
  await page.mouse.up();
  const edited = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.toDataURL(),
  );
  await expect(page.locator(".draft-notice")).toContainText("Drawing edits");
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles("tests/e2e/fixtures/paper.png");
  return { original: glyph.source, edited };
}

test("canceling an affected scan conversion preserves an applicable source draft", async ({
  page,
}) => {
  const { original, edited } = await prepare(page);
  await page.getByLabel(confirmation).check();
  const decisions: string[] = [];
  page.on("dialog", async (dialog) => {
    decisions.push(dialog.message());
    if (dialog.message().startsWith("Discard the unfinished"))
      await dialog.dismiss();
    else await dialog.accept();
  });
  await page
    .getByRole("button", { name: "Convert scans", exact: true })
    .click();
  expect(
    decisions.some((message) => message.startsWith("Discard the unfinished")),
  ).toBe(true);
  await expect(page.locator(".draft-item")).toHaveCount(1);
  expect((await backup(page)).glyphs.H.source).toBe(original);
  await page.getByRole("button", { name: "Workshop" }).click();
  expect(
    await page
      .locator(".draw-canvas canvas")
      .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
  ).toBe(edited);
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  expect((await backup(page)).glyphs.H.source).toBe(edited);
});

test("conversion of another page retains the drawing and can still apply it", async ({
  page,
}) => {
  const { edited } = await prepare(page);
  await page
    .getByRole("combobox", { name: "Assigned template page", exact: true })
    .selectOption("1");
  await page.getByLabel(confirmation).check();
  const decisions: string[] = [];
  page.on("dialog", async (dialog) => {
    decisions.push(dialog.message());
    await dialog.dismiss();
  });
  await page
    .getByRole("button", { name: "Convert scans", exact: true })
    .click();
  await expect(page.locator(".draft-item")).toHaveCount(0);
  expect(decisions).toEqual([]);
  const converted = await backup(page);
  expect(converted.glyphs["9"].contours.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Workshop" }).click();
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  expect((await backup(page)).glyphs.H.source).toBe(edited);
});

test("accepting discard lets an affected scan conversion replace the glyph", async ({
  page,
}) => {
  await prepare(page);
  await page.getByLabel(confirmation).check();
  const decisions: string[] = [];
  page.on("dialog", async (dialog) => {
    decisions.push(dialog.message());
    await dialog.accept();
  });
  await page
    .getByRole("button", { name: "Convert scans", exact: true })
    .click();
  await expect(page.locator(".draft-item")).toHaveCount(0);
  expect(
    decisions.some((message) => message.startsWith("Discard the unfinished")),
  ).toBe(true);
  expect((await backup(page)).glyphs.H.origin).toBe("scan");
  await page.getByRole("button", { name: "Workshop" }).click();
  await expect(page.locator(".draw-canvas canvas")).toHaveCount(0);
  await expect(page.locator(".draft-notice")).toHaveCount(0);
});
