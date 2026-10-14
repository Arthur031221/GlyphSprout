import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

async function backup(page: Page): Promise<Project> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await download).path();
  if (!path) throw new Error("project backup did not produce a file");
  return JSON.parse(await readFile(path, "utf8"));
}

async function editSetup(page: Page) {
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill("Weekend");
  await page.getByLabel("Text to include").fill("HELLO!");
}

test("setup draft survives stage navigation and applies only on submit", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  const originalFontDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF" }).click();
  const originalFont = await originalFontDownload;
  const originalFilename = originalFont.suggestedFilename();
  const originalPath = await originalFont.path();
  if (!originalPath) throw new Error("missing original font download");

  await editSetup(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Weekend");
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO!");
  await expect(page.locator(".setup-draft-notice")).toContainText(
    "not saved or included in downloads",
  );
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Unapplied setup changes",
  );
  expect(await backup(page)).toEqual(before);
  await page.getByRole("button", { name: "Workshop" }).click();
  const unchangedFontDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF" }).click();
  const unchangedFont = await unchangedFontDownload;
  expect(unchangedFont.suggestedFilename()).toBe(originalFilename);
  const unchangedPath = await unchangedFont.path();
  if (!unchangedPath) throw new Error("missing unchanged font download");
  expect(await readFile(unchangedPath)).toEqual(await readFile(originalPath));
  await page.getByRole("button", { name: "Characters" }).click();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Weekend");
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO!");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await expect(page.locator(".setup-draft-notice")).toHaveCount(0);

  const dialogs: string[] = [];
  page.once("dialog", async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.reload();
  expect(dialogs).toEqual([]);
});

test("canceling a character change keeps the setup draft", async ({ page }) => {
  await ready(page);
  await editSetup(page);
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Weekend");
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO!");
});

test("new project replacement clears the previous setup draft", async ({
  page,
}) => {
  await ready(page);
  await editSetup(page);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("My Handwriting");
  await expect(page.getByLabel("Text to include")).toHaveValue("Hello world!");
});

test("setup fields follow history when clean and retain drafts when dirty", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill(" Weekend ");
  await page.getByLabel("Text to include").fill("BE\u00a0HELLO");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Weekend");
  await expect(page.getByLabel("Text to include")).toHaveValue("BE HELLO");
  await expect(page.locator(".setup-draft-notice")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Paper Bloom");
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO JOB");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Weekend");
  await expect(page.getByLabel("Text to include")).toHaveValue("BE HELLO");

  await page.getByLabel("Font name").fill("Draft face");
  await page.getByLabel("Text to include").fill("Draft text!");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Draft face");
  await expect(page.getByLabel("Text to include")).toHaveValue("Draft text!");
  expect((await backup(page)).characters).toEqual([
    "H",
    "E",
    "L",
    "O",
    "J",
    "B",
  ]);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Draft face");
  await expect(page.getByLabel("Text to include")).toHaveValue("Draft text!");
  await expect(page.locator(".setup-draft-notice")).toBeVisible();
});

for (const replacement of ["sample", "backup"] as const) {
  test(`reopening the same ${replacement} identity resets setup drafts`, async ({
    page,
  }) => {
    await ready(page);
    const original = await backup(page);
    await editSetup(page);
    page.once("dialog", (dialog) => void dialog.accept());
    if (replacement === "sample") {
      await page
        .getByRole("button", { name: "Load sample", exact: true })
        .click();
    } else {
      const chooser = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: "Open project", exact: true })
        .click();
      await (await chooser).setFiles({
        name: "same.glyphsprout.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(original)),
      });
    }
    await expect(page.locator(".setup-draft-notice")).toHaveCount(0);
    await page.getByRole("button", { name: "Characters" }).click();
    await expect(page.getByLabel("Font name")).toHaveValue(original.name);
    await expect(page.getByLabel("Text to include")).toHaveValue(original.text);
    expect((await backup(page)).id).toBe(original.id);
  });
}

test("reload warns about setup drafts even when Characters is hidden", async ({
  page,
}) => {
  await ready(page);
  await editSetup(page);
  await page.getByRole("button", { name: "Pages" }).click();
  const dialog = page.waitForEvent("dialog");
  const reload = page.reload().catch(() => {});
  const warning = await dialog;
  expect(warning.type()).toBe("beforeunload");
  await warning.accept();
  await reload;
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByLabel("Font name")).toHaveValue("Paper Bloom");
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO JOB");
});

test("a draft matching an older project remains a draft through Undo and Redo", async ({
  page,
}) => {
  await ready(page);
  const original = await backup(page);
  await editSetup(page);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill(original.name);
  await page.getByLabel("Text to include").fill(original.text);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".setup-draft-notice")).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Font name")).toHaveValue(original.name);
  await expect(page.getByLabel("Text to include")).toHaveValue(original.text);
  await expect(page.locator(".setup-draft-notice")).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(page.locator(".setup-draft-notice")).toHaveCount(0);
  expect((await backup(page)).text).toBe(original.text);
});

test("submitting imported multiline text applies normalized values", async ({
  page,
}) => {
  await ready(page);
  const original = await backup(page);
  const chooser = page.waitForEvent("filechooser");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await (await chooser).setFiles({
    name: "multiline.glyphsprout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...original, text: "HELLO\nJOB" })),
  });
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO\nJOB");
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(page.locator(".setup-draft-notice")).toHaveCount(0);
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByLabel("Text to include")).toHaveValue("HELLO JOB");
  const applied = await backup(page);
  expect(applied.id).toBe(original.id);
  expect(applied.text).toBe("HELLO JOB");
});
