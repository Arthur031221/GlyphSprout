import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";
const sheet = "tests/e2e/fixtures/paper.png";

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

async function applyCharacters(page: Page, text: string) {
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill(text);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
}

const twoPages = Array.from({ length: 36 }, (_, index) =>
  String.fromCharCode(index + 33),
).join("");

for (const [description, original, current, count] of [
  ["character reorder", "AB", "BA", 1],
  ["page count shrink on Undo", "AB", twoPages, 2],
  ["page count increase on Undo", twoPages, "AB", 1],
] as const) {
  test(`staged scans keep their template binding through ${description}`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".project-label [role=status]")).toHaveText(
      "Saved",
    );
    await applyCharacters(page, original);
    const previous = await backup(page);
    await applyCharacters(page, current);
    const bound = await backup(page);
    expect(bound.id).not.toBe(previous.id);
    const image = await readFile(sheet);
    await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles(
      Array.from({ length: count }, (_, index) => ({
        name: `sheet-${index + 1}.png`,
        mimeType: "image/png",
        buffer: image,
      })),
    );
    await expect(page.locator(".draft-item")).toHaveCount(count);
    for (let index = 0; index < count; index++) {
      await page
        .getByRole("button", {
          name: `Page ${index + 1}: sheet-${index + 1}.png`,
          exact: true,
        })
        .click();
      await page.getByLabel(confirmation).check();
    }
    const coordinates = await page
      .locator(".corner-input input")
      .evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      );
    await expect(
      page.getByRole("button", { name: "Convert scans" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".scan-template-notice")).toContainText(
      "different character template",
    );
    await expect(
      page.getByRole("button", { name: "Convert scans" }),
    ).toBeDisabled();
    await expect(page.getByLabel(confirmation)).toBeChecked();
    await expect(page.getByLabel(confirmation)).toBeDisabled();
    await expect(page.getByLabel("Assigned template page")).toHaveValue(
      String(count - 1),
    );
    await expect(page.locator(".scan-preview polygon")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Visible page ID" }),
    ).toHaveValue(bound.id.slice(0, 8));
    await expect(page.locator(".draft-item")).toHaveCount(count);
    expect((await backup(page)).characters).toEqual(previous.characters);

    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".scan-template-notice")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Convert scans" }),
    ).toBeEnabled();
    await expect(page.getByLabel(confirmation)).toBeChecked();
    expect(
      await page
        .locator(".corner-input input")
        .evaluateAll((inputs) =>
          inputs.map((input) => (input as HTMLInputElement).value),
        ),
    ).toEqual(coordinates);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Convert scans" }).click();
    await expect(page.locator(".draft-item")).toHaveCount(0, {
      timeout: 30000,
    });
    const converted = await backup(page);
    expect(converted.id).toBe(bound.id);
    expect(converted.characters).toEqual(bound.characters);
    expect(converted.pages).toHaveLength(count);
    expect(Object.keys(converted.glyphs).sort()).toEqual(
      [...bound.characters].sort(),
    );
    expect(converted.pages.every((scan) => !("templateId" in scan))).toBe(true);
  });
}

test("renaming and undoing the name preserve compatible staged scans", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await applyCharacters(page, "AB");
  const before = await backup(page);
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles(sheet);
  await page.getByLabel(confirmation).check();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill("Renamed");
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await backup(page)).id).toBe(before.id);
  await expect(page.locator(".scan-template-notice")).toHaveCount(0);
  await expect(page.getByLabel(confirmation)).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Convert scans" }),
  ).toBeEnabled();
});

test("removing incompatible scans allows sheets for the current template", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await applyCharacters(page, "AB");
  const original = await backup(page);
  await applyCharacters(page, "BA");
  const upload = page.locator('input[accept="image/png,image/jpeg"]');
  await upload.setInputFiles(sheet);
  await page.getByLabel(confirmation).check();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".scan-template-notice")).toBeVisible();
  await upload.setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: await readFile(sheet),
  });
  await expect(page.locator(".draft-item")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Page 1: paper.png", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove scan: paper.png" }).click();
  await expect(page.locator(".scan-template-notice")).toHaveCount(0);
  await upload.setInputFiles(sheet);
  await expect(
    page.getByRole("textbox", { name: "Visible page ID" }),
  ).toHaveValue(original.id.slice(0, 8));
  await expect(page.getByLabel(confirmation)).not.toBeChecked();
  await page.getByLabel(confirmation).check();
  await expect(
    page.getByRole("button", { name: "Convert scans" }),
  ).toBeEnabled();
});
