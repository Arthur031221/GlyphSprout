import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(
    page.getByRole("button", { name: "Mark reviewed" }),
  ).toHaveAttribute("aria-pressed", "false");
}

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

async function holdDecode(page: Page, fail = false) {
  await page.evaluate((reject) => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      await new Promise<void>((resolve) => {
        (
          window as Window & { releaseReviewDecode?: () => void }
        ).releaseReviewDecode = resolve;
      });
      if (reject) throw new Error("decodeFailed");
    };
  }, fail);
}

async function releaseDecode(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!(window as Window & { releaseReviewDecode?: () => void })
            .releaseReviewDecode,
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    (
      window as Window & { releaseReviewDecode?: () => void }
    ).releaseReviewDecode?.();
  });
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
}

test("review waits for the selected glyph adjustment and preserves undo history", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await holdDecode(page);
  await page.getByLabel("Ink threshold", { exact: true }).fill("140");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mark reviewed" }),
  ).toHaveAttribute("aria-pressed", "false");
  await releaseDecode(page);
  const after = await backup(page);
  expect(after.glyphs.H.settings).toEqual({
    ...before.glyphs.H.settings,
    threshold: 140,
  });
  expect(after.glyphs.H.source).toBe(before.glyphs.H.source);
  expect(after.glyphs.H.reviewed).toBe(true);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const unreviewed = await backup(page);
  expect(unreviewed.glyphs.H.settings.threshold).toBe(140);
  expect(unreviewed.glyphs.H.reviewed).toBe(false);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);
});

test("a failed adjustment does not mark its unchanged glyph reviewed", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await holdDecode(page, true);
  await page.getByLabel("Ink threshold", { exact: true }).fill("140");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await releaseDecode(page);
  await expect(page.getByRole("alert")).toContainText("could not be decoded");
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);
});

for (const action of ["Undo", "Clear glyph", "Load sample"]) {
  test(`${action} cancels a waiting review without changing the replacement`, async ({
    page,
  }) => {
    await ready(page);
    const before = await backup(page);
    await holdDecode(page);
    await page.getByLabel("Ink threshold", { exact: true }).fill("140");
    await page.getByRole("button", { name: "Mark reviewed" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: action, exact: true }).click();
    await releaseDecode(page);
    const after = await backup(page);
    if (action === "Clear glyph") expect(after.glyphs.H).toBeUndefined();
    else {
      expect(after.glyphs.H.settings).toEqual(before.glyphs.H.settings);
      expect(after.glyphs.H.reviewed).toBe(true);
    }
  });
}

test("reviewing a different glyph does not wait for an unrelated adjustment", async ({
  page,
}) => {
  await ready(page);
  await holdDecode(page);
  await page.getByLabel("Ink threshold", { exact: true }).fill("140");
  await page.getByRole("button", { name: /^E / }).click();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(
    page.getByRole("button", { name: "Mark reviewed" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeVisible();
  await releaseDecode(page);
  const after = await backup(page);
  expect(after.glyphs.H.settings.threshold).toBe(140);
  expect(after.glyphs.H.reviewed).toBe(false);
  expect(after.glyphs.E.reviewed).toBe(false);
});
