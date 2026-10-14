import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

const paper = "tests/e2e/fixtures/paper.png";
const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

async function useThreePageCharacterSet(page: Page) {
  await page.getByRole("button", { name: "Characters" }).click();
  const text = Array.from({ length: 94 }, (_, index) =>
    String.fromCharCode(index + 33),
  ).join("");
  await page.getByLabel("Text to include").fill(text);
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("button", { name: "Project ready", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
}

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download project", exact: true })
    .click();
  const path = await (await event).path();
  if (!path) throw new Error("project backup did not produce a file");
  return JSON.parse(await readFile(path, "utf8"));
}

async function revisionSequence(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const opening = indexedDB.open("GlyphSprout-workshop-v1", 1);
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
          const db = opening.result;
          const request = db
            .transaction("head", "readonly")
            .objectStore("head")
            .get("active");
          request.onsuccess = () => resolve(request.result.sequence);
          request.onerror = () => reject(request.error);
          request.transaction?.addEventListener("complete", () => db.close());
        };
      }),
  );
}

async function stroke(
  page: Page,
  x: number,
  y: number,
  x2: number,
  y2: number,
) {
  const canvas = page.locator(".draw-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("drawing canvas is missing");
  await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * x2, box.y + box.height * y2, {
    steps: 12,
  });
  await page.mouse.up();
}

async function pixels(page: Page) {
  await expect(
    page.getByRole("button", { name: "Pen", exact: true }),
  ).toBeEnabled();
  return page
    .locator(".draw-canvas canvas")
    .evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("missing canvas context");
      return Array.from(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
      );
    });
}

test("source pixels and drawing history survive Workshop, Pages, Characters and Workshop", async ({
  page,
}) => {
  await ready(page);
  const saved = await backup(page);
  const savedSequence = await revisionSequence(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  const originalPixels = await pixels(page);
  await stroke(page, 0.26, 0.21, 0.77, 0.68);
  const editedPixels = await pixels(page);
  expect(editedPixels).not.toEqual(originalPixels);
  await expect(page.locator(".draft-notice")).toContainText(
    "Drawing edits are not saved",
  );
  await expect(
    page.getByRole("button", { name: "Download TTF" }),
  ).toBeDisabled();
  expect((await backup(page)).glyphs.H).toEqual(saved.glyphs.H);
  expect(await revisionSequence(page)).toBe(savedSequence);

  await page.getByRole("button", { name: "Pages" }).click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  expect(await pixels(page)).toEqual(editedPixels);
  await expect(
    page.locator(".draw-tools").getByRole("button", { name: "Undo" }),
  ).toBeEnabled();
  expect((await backup(page)).glyphs.H).toEqual(saved.glyphs.H);
  expect(await revisionSequence(page)).toBe(savedSequence);

  await page
    .locator(".draw-tools")
    .getByRole("button", { name: "Undo" })
    .click();
  expect(await pixels(page)).toEqual(originalPixels);
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  await stroke(page, 0.74, 0.24, 0.34, 0.72);
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  expect((await backup(page)).glyphs.H.source).not.toBe(saved.glyphs.H.source);
  await expect.poll(() => revisionSequence(page)).toBe(savedSequence + 1);
});

test("character switching and replacement drawings require a decision and preserve canceled pixels", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph", exact: true })
    .click();
  await stroke(page, 0.18, 0.76, 0.81, 0.24);
  const edited = await pixels(page);
  await page.getByRole("button", { name: /^E / }).click();
  await expect(page.locator(".draw-canvas canvas")).toBeVisible();
  expect(await pixels(page)).toEqual(edited);
  await expect(page.locator(".editor-heading h2")).toHaveText("H");
  expect((await backup(page)).glyphs).toEqual(before.glyphs);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: /^E / }).click();
  await expect(page.locator(".editor-heading h2")).toHaveText("E");
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph", exact: true })
    .click();
  await stroke(page, 0.25, 0.2, 0.73, 0.8);
  const current = await pixels(page);
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph", exact: true })
    .click();
  expect(await pixels(page)).toEqual(current);
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph", exact: true })
    .click();
  expect(await pixels(page)).not.toEqual(current);
  await expect(page.locator(".draft-notice")).toHaveCount(0);
});

for (const action of ["review", "clear", "undo", "redo"] as const) {
  test(`dirty drawing guards ${action} and the accepted action discards it`, async ({
    page,
  }) => {
    await ready(page);
    if (action === "undo" || action === "redo") {
      await page
        .getByRole("button", { name: "Mark reviewed", exact: true })
        .click();
      const undo = page
        .locator(".toolbar-actions")
        .getByRole("button", { name: "Undo", exact: true });
      await expect(undo).toBeEnabled();
      if (action === "redo") {
        await undo.click();
        await expect(
          page
            .locator(".toolbar-actions")
            .getByRole("button", { name: "Redo", exact: true }),
        ).toBeEnabled();
      }
    }
    await page
      .getByRole("button", { name: "Edit source", exact: true })
      .click();
    await stroke(page, 0.22, 0.32, 0.8, 0.79);
    const edited = await pixels(page);
    const button =
      action === "review"
        ? page.getByRole("button", { name: "Mark reviewed", exact: true })
        : action === "clear"
          ? page.getByRole("button", { name: "Clear glyph", exact: true })
          : action === "undo"
            ? page
                .locator(".toolbar-actions")
                .getByRole("button", { name: "Undo", exact: true })
            : page
                .locator(".toolbar-actions")
                .getByRole("button", { name: "Redo", exact: true });
    await button.click();
    expect(await pixels(page)).toEqual(edited);
    await expect(page.locator(".draft-notice")).toBeVisible();
    page.once("dialog", (dialog) => void dialog.accept());
    await button.click();
    await expect(page.locator(".draft-notice")).toHaveCount(0);
    await expect(page.locator(".draw-canvas canvas")).toHaveCount(0);
  });
}

test("unmodified and fully undone drawings do not trigger beforeunload; dirty drawings do", async ({
  page,
}) => {
  await ready(page);
  const seen: string[] = [];
  page.on("dialog", (dialog) => {
    seen.push(dialog.type());
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await page.reload();
  expect(seen).toEqual([]);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await stroke(page, 0.24, 0.36, 0.72, 0.74);
  await page
    .locator(".draw-tools")
    .getByRole("button", { name: "Undo" })
    .click();
  await page.reload();
  expect(seen).toEqual([]);

  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await stroke(page, 0.24, 0.36, 0.72, 0.74);
  await page
    .getByRole("button", { name: "Cancel source edit", exact: true })
    .click();
  await page.reload();
  expect(seen).toEqual([]);

  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await stroke(page, 0.24, 0.36, 0.72, 0.74);
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  await page.reload();
  expect(seen).toEqual([]);

  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph", exact: true })
    .click();
  await stroke(page, 0.2, 0.25, 0.76, 0.74);
  await page
    .getByRole("button", { name: "Cancel drawing", exact: true })
    .click();
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  await page.reload();
  expect(seen).toEqual([]);

  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await stroke(page, 0.24, 0.36, 0.72, 0.74);
  page.removeAllListeners("dialog");
  page.once("dialog", (dialog) => {
    seen.push(dialog.type());
    void dialog.accept();
  });
  await page.reload();
  expect(seen).toEqual(["beforeunload"]);
});

test("staged scan beforeunload warning is removed when the last scan is removed", async ({
  page,
}) => {
  await ready(page);
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.accept();
  });
  const upload = page.locator('input[accept="image/png,image/jpeg"]');
  await page.getByRole("button", { name: "Pages" }).click();
  await upload.setInputFiles(paper);
  await expect(page.locator(".draft-notice")).toContainText(
    "Scan alignment is not saved",
  );
  await page.reload();
  expect(dialogs).toEqual(["beforeunload"]);

  await page.getByRole("button", { name: "Pages" }).click();
  await upload.setInputFiles(paper);
  await page.getByRole("button", { name: /Page 1: paper.png/ }).waitFor();
  await page.getByRole("button", { name: "Remove scan: paper.png" }).click();
  await expect(upload).toBeFocused();
  await page.reload();
  expect(dialogs).toEqual(["beforeunload"]);
});

for (const removal of ["first", "middle", "last"] as const) {
  test(`removing the ${removal} staged scan preserves the selected scan registration`, async ({
    page,
  }) => {
    await ready(page);
    await useThreePageCharacterSet(page);
    const image = await readFile(paper);
    await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles(
      ["one.png", "two.png", "three.png"].map((name) => ({
        name,
        mimeType: "image/png",
        buffer: image,
      })),
    );
    await expect(page.locator(".draft-item")).toHaveCount(3);
    const registered = new Map<string, string>();
    for (const [index, name] of ["one.png", "two.png", "three.png"].entries()) {
      await page
        .locator(".draft-item")
        .filter({ hasText: name })
        .getByRole("button", { name: new RegExp(`^Page \\d+: ${name}$`) })
        .click();
      const corner = page
        .locator(".corner-input")
        .first()
        .locator("input")
        .first();
      const value = String(40 + index * 15);
      await corner.fill(value);
      await corner.press("Tab");
      await page.getByLabel(confirmation).check();
      registered.set(name, value);
    }
    const selectedName = removal === "first" ? "three.png" : "one.png";
    await page
      .locator(".draft-item")
      .filter({ hasText: selectedName })
      .getByRole("button", { name: new RegExp(`^Page \\d+: ${selectedName}$`) })
      .click();
    const removeName =
      removal === "first"
        ? "one.png"
        : removal === "middle"
          ? "two.png"
          : "three.png";
    await page
      .getByRole("button", { name: `Remove scan: ${removeName}` })
      .click();
    await expect(page.locator(".draft-item")).toHaveCount(2);
    const selected = page
      .locator(".draft-item")
      .filter({ has: page.locator("button.selected") });
    await expect(selected).toContainText(selectedName);
    for (const name of ["one.png", "two.png", "three.png"].filter(
      (item) => item !== removeName,
    )) {
      await page
        .locator(".draft-item")
        .filter({ hasText: name })
        .getByRole("button", { name: new RegExp(`^Page \\d+: ${name}$`) })
        .click();
      await expect(
        page.locator(".corner-input").first().locator("input").first(),
      ).toHaveValue(registered.get(name) ?? "");
      await expect(page.getByLabel(confirmation)).toBeChecked();
    }
    await expect(page.locator(".draft-notice")).toContainText(
      "Scan alignment is not saved",
    );
  });
}

for (const removed of [0, 1, 2]) {
  test(`removing selected scan ${removed + 1} restores selection, registration and keyboard focus`, async ({
    page,
  }) => {
    await ready(page);
    await useThreePageCharacterSet(page);
    const image = await readFile(paper);
    const names = ["one.png", "two.png", "three.png"];
    await page
      .locator('input[accept="image/png,image/jpeg"]')
      .setInputFiles(
        names.map((name) => ({ name, mimeType: "image/png", buffer: image })),
      );
    const replacement = names[removed === 2 ? 1 : removed + 1];
    const next = page.getByRole("button", {
      name: new RegExp(`^Page \\d+: ${replacement}$`),
    });
    await next.click();
    const corner = page
      .locator(".corner-input")
      .first()
      .locator("input")
      .first();
    await corner.fill("47");
    await corner.press("Tab");
    await page.getByLabel(confirmation).check();
    await page
      .getByRole("button", {
        name: new RegExp(`^Page \\d+: ${names[removed]}$`),
      })
      .click();
    await page
      .getByRole("button", {
        name: `Remove scan: ${names[removed]}`,
        exact: true,
      })
      .click();
    await expect(next).toBeFocused();
    await expect(next).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".draft-item")).toHaveCount(2);
    await expect(corner).toHaveValue("47");
    await expect(page.getByLabel(confirmation)).toBeChecked();
  });
}

test("a removed scan can be replaced, converted and backed up with page provenance", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Pages" }).click();
  const image = await readFile(paper);
  const upload = page.locator('input[accept="image/png,image/jpeg"]');
  await upload.setInputFiles({
    name: "retired.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page.getByRole("button", { name: "Remove scan: retired.png" }).click();
  await upload.setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(
    page.getByRole("button", { name: /Page 1: replacement.png/ }),
  ).toBeVisible();
  await page.getByLabel(confirmation).check();
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("button", { name: "Convert scans", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  const project = await backup(page);
  expect(project.pages).toHaveLength(1);
  const imported = project.pages[0];
  expect(imported.image).toMatch(/^data:image\/png;base64,/);
  const linked = Object.values(project.glyphs).filter(
    (glyph) => glyph.pageId === imported.id,
  );
  expect(linked.length).toBeGreaterThan(0);
  expect(linked.every((glyph) => glyph.origin === "scan")).toBe(true);
  let beforeUnload = false;
  page.on("dialog", (dialog) => {
    if (dialog.type() === "beforeunload") beforeUnload = true;
    void dialog.accept();
  });
  await page.reload();
  expect(beforeUnload).toBe(false);
});

test("decomposed accented specimen text renders as one supported normalized character", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill("é");
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("button", { name: "Project ready", exact: true })
    .click();
  await page.getByRole("button", { name: "Workshop" }).click();
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph", exact: true })
    .click();
  await stroke(page, 0.2, 0.78, 0.78, 0.25);
  await page.getByRole("button", { name: "Use drawing", exact: true }).click();
  await page.getByLabel("Type a specimen").fill("e\u0301");
  await expect(page.locator(".hero-copy span")).toHaveCount(1);
  await expect(page.locator(".hero-copy span")).toHaveText("é");
  await expect(page.locator(".hero-copy .missing-preview")).toHaveCount(0);
});
