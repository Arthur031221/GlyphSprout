import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

const paper = "tests/e2e/fixtures/paper.png";
const synthetic = "tests/e2e/fixtures/sample.png";
const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

async function delayNextDatabaseOpen(page: Page) {
  await page.evaluate(() => {
    const open = indexedDB.open.bind(indexedDB);
    let delayNext = true;
    indexedDB.open = (...args: Parameters<IDBFactory["open"]>) => {
      const req = open(...args);
      if (delayNext) {
        delayNext = false;
        Object.defineProperty(req, "onsuccess", {
          set(handler: (event: Event) => void) {
            req.addEventListener("success", (event) => {
              window.setTimeout(() => handler.call(req, event), 1000);
            });
          },
        });
      }
      return req;
    };
  });
}

async function backupProject(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("project backup did not produce a file");
  return JSON.parse(await readFile(path, "utf8"));
}

async function corruptLatest(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("GlyphSprout-workshop-v1", 1);
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction(["head", "revisions"], "readwrite");
        const head = tx.objectStore("head").get("active");
        head.onsuccess = () => {
          const store = tx.objectStore("revisions");
          const get = store.get(head.result.sequence);
          get.onsuccess = () => {
            const revision = get.result;
            revision.project.glyphs.H.source = "asset:missing-corrupt-asset";
            store.put(revision);
          };
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
}

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

async function makeProject(page: Page, text: string, name = "Test Hand") {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill(name);
  await page.getByLabel("Text to include").fill(text);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
}

async function stageImage(page: Page, image: string) {
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles(image);
  await expect(page.getByRole("button", { name: /Page 1:/ })).toBeVisible();
  await page.getByLabel(confirmation).check();
}

async function storageSnapshot(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        head: { sequence: number; previous: number | null };
        revisions: {
          sequence: number;
          project: {
            glyphs: Record<string, { source: string }>;
            pages: { image: string }[];
          };
        }[];
        assets: string[];
      }>((resolve, reject) => {
        const opening = indexedDB.open("GlyphSprout-workshop-v1", 1);
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
          const db = opening.result;
          const tx = db.transaction(
            ["head", "revisions", "assets"],
            "readonly",
          );
          const head = tx.objectStore("head").get("active");
          const revisions = tx.objectStore("revisions").getAll();
          const assets = tx.objectStore("assets").getAllKeys();
          tx.oncomplete = () => {
            db.close();
            resolve({
              head: head.result,
              revisions: revisions.result,
              assets: assets.result.map(String),
            });
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

async function drawCharacter(page: Page, character: string, offset: number) {
  const before = await storageSnapshot(page);
  await page
    .getByRole("button", { name: new RegExp(`^${character} `) })
    .click();
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph" })
    .click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("drawing canvas is missing");
  await page.mouse.move(box.x + 35 + offset * 10, box.y + 190);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 55 + offset * 8, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Use drawing" }).click();
  await expect
    .poll(async () => (await storageSnapshot(page)).head.sequence)
    .toBe(before.head.sequence + 1);
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

test("first visit restores the real paper sample with its stated provenance", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator(".sample-disclosure")).toContainText(
    "Six letters cropped from a public domain NIST scan",
  );
  for (const character of ["H", "E", "L", "O", "J", "B"]) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${character} `) }),
    ).toBeVisible();
  }
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Try Han and kana strokes" }).click();
  await expect(page.locator(".project-label strong")).toContainText(
    "Sprout Script",
  );
  await expect(page.locator(".sample-disclosure")).toContainText(
    "not a paper scan",
  );
});

test("renaming and equivalent character text retain scan registration and glyph page links", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Pages" }).click();
  await stageImage(page, paper);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  const before = await backupProject(page);
  expect(before.pages).toHaveLength(1);
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill("Renamed Handwriting");
  await page.getByRole("button", { name: "Project ready" }).click();
  const after = await backupProject(page);
  expect(after.name).toBe("Renamed Handwriting");
  expect(after.pages).toEqual(before.pages);
  expect(after.glyphs.H.pageId).toBe(before.pages[0].id);
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill(" HELLO  JOB HELLO ");
  await page.getByRole("button", { name: "Project ready" }).click();
  const equivalent = await backupProject(page);
  expect(dialogs).toEqual([]);
  expect(equivalent.id).toBe(before.id);
  expect(equivalent.pages).toEqual(before.pages);
  expect(equivalent.glyphs).toEqual(before.glyphs);
});

test("saving after fallback retains the previous valid revision", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await corruptLatest(page);
  await page.reload();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "restored the previous revision" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill("After Recovery");
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await corruptLatest(page);
  await page.reload();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "restored the previous revision" }),
  ).toBeVisible();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await expect(page.locator(".glyph-grid button")).toHaveCount(6);
});

test("an altered asset checksum restores the previous valid glyph", async ({
  page,
}) => {
  await ready(page);
  await drawCharacter(page, "H", 1);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("GlyphSprout-workshop-v1", 1);
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction(["head", "revisions", "assets"], "readwrite");
        const head = tx.objectStore("head").get("active");
        head.onsuccess = () => {
          const revision = tx
            .objectStore("revisions")
            .get(head.result.sequence);
          revision.onsuccess = () => {
            const glyphs = revision.result.project.glyphs;
            const assets = tx.objectStore("assets");
            const source = assets.get(glyphs.E.source.slice(6));
            source.onsuccess = () =>
              assets.put(source.result, glyphs.H.source.slice(6));
          };
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "restored the previous revision" }),
  ).toBeVisible();
  expect((await backupProject(page)).glyphs.H.origin).toBe("sample");
});

test("a shared page image cannot bypass the glyph image size limit", async ({
  page,
}) => {
  await ready(page);
  const project = await backupProject(page);
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    return canvas.toDataURL("image/png");
  });
  project.glyphs.H.source = image;
  project.pages = [
    {
      id: "shared-image",
      pageIndex: 0,
      image,
      width: 2048,
      height: 2048,
      corners: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 2000 },
        { x: 0, y: 2000 },
      ],
    },
  ];
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Open project" }).first().click(),
  ]);
  await chooser.setFiles({
    name: "invalid.glyphsprout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(
    page.getByText(
      "This project is invalid. Your current project is unchanged.",
    ),
  ).toBeVisible();
  expect((await backupProject(page)).glyphs.H.source).not.toBe(image);
});

test("canceling a pending real worker leaves the saved glyphs intact", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(
        message: unknown,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        setTimeout(() => {
          if (Array.isArray(options)) super.postMessage(message, options);
          else super.postMessage(message, options);
        }, 800);
      }
    };
  });
  await ready(page);
  const before = await backupProject(page);
  await page.getByRole("button", { name: "Pages" }).click();
  await stageImage(page, paper);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Convert scans" }).click();
  await page
    .locator(".scan-job")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Scan conversion was canceled" }),
  ).toBeVisible();
  expect((await backupProject(page)).glyphs).toEqual(before.glyphs);
  await page.waitForTimeout(1000);
  expect((await backupProject(page)).glyphs).toEqual(before.glyphs);
});

test("a corrupt latest revision recovers the previous saved project", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.getByRole("button", { name: /^E Reviewed/ }).click();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const head = (await storageSnapshot(page)).head;
  await page.evaluate(async (sequence) => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("GlyphSprout-workshop-v1", 1);
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("revisions", "readwrite");
        const store = tx.objectStore("revisions");
        const get = store.get(sequence);
        get.onsuccess = () => {
          const revision = get.result;
          revision.project.glyphs.H.source = "asset:missing-corrupt-asset";
          store.put(revision);
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, head.sequence);
  expect(head.sequence).toBeGreaterThanOrEqual(3);
  await page.reload();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "restored the previous revision" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^H Needs review/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^E Reviewed/ })).toBeVisible();
});

test("concurrent tabs detect a save conflict without overwriting the newer revision", async ({
  page,
}) => {
  await ready(page);
  const other = await page.context().newPage();
  await other.goto("/");
  await expect(other.locator(".project-label strong")).toHaveText(
    "Paper Bloom",
  );
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await other.getByRole("button", { name: "Workshop" }).click();
  const scale = other.getByLabel("Size", { exact: true });
  await scale.fill("1.25");
  await other.locator(".editor-heading h2").click();
  await expect(other.locator(".project-label [role=status]")).toContainText(
    "Another tab saved a newer project",
  );
  await other.reload();
  await expect(
    other.getByRole("button", { name: /^H Needs review/ }),
  ).toBeVisible();
  await expect(other.getByLabel("Size", { exact: true })).toHaveValue("1");
});

test("asset garbage collection retains exactly the latest and previous revisions", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await drawCharacter(page, "H", 0);
  await drawCharacter(page, "E", 1);
  await drawCharacter(page, "L", 2);
  const snapshot = await storageSnapshot(page);
  expect(
    snapshot.revisions.map((revision) => revision.sequence).sort(),
  ).toEqual([snapshot.head.previous, snapshot.head.sequence].sort());
  const retained = new Set<string>();
  for (const revision of snapshot.revisions) {
    for (const glyph of Object.values(revision.project.glyphs)) {
      if (glyph.source.startsWith("asset:"))
        retained.add(glyph.source.slice(6));
    }
    for (const item of revision.project.pages) {
      if (item.image.startsWith("asset:")) retained.add(item.image.slice(6));
    }
  }
  expect(snapshot.assets.sort()).toEqual([...retained].sort());
});

test("real paper and synthetic multilingual sheets convert and preserve scan provenance", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Pages" }).click();
  await stageImage(page, paper);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.getByRole("button", { name: /^H / }).click();
  await expect(page.locator(".glyph-source small")).toHaveText("Scan");

  await makeProject(page, "Hello, 世界 こんにちは 一日Aog8!");
  await stageImage(page, synthetic);
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Workshop" }).click();
  await expect(page.locator(".glyph-grid button")).toHaveCount(18);
  await page.getByRole("button", { name: /^世 / }).click();
  await expect(page.locator(".glyph-source small")).toHaveText("Scan");
});

test("35+ character two-page batches reject duplicate assignments and invalidate corner confirmation", async ({
  page,
}) => {
  await ready(page);
  await makeProject(
    page,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123",
  );
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: await readFile(paper) },
    {
      name: "second.png",
      mimeType: "image/png",
      buffer: await readFile(paper),
    },
  ]);
  await expect(
    page.getByRole("button", { name: /Page 2: second.png/ }),
  ).toBeVisible();
  await page.getByLabel(confirmation).check();
  const second = page.getByRole("button", { name: /Page 2: second.png/ });
  const corner = page.getByRole("slider", { name: "Top left" });
  const xBefore = await corner.getAttribute("aria-valuenow");
  await corner.focus();
  await page.keyboard.press("ArrowRight");
  await expect(corner).not.toHaveAttribute("aria-valuenow", xBefore ?? "");
  await expect(page.getByLabel(confirmation)).not.toBeChecked();
  await page.getByLabel(confirmation).check();
  await second.click();
  await page.getByLabel("Assigned template page").selectOption("0");
  await page.getByLabel(confirmation).check();
  await expect(
    page.getByRole("button", { name: "Convert scans" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Assign each image to a different page",
  );
  await expect(page.locator(".project-label strong")).toHaveText("Test Hand");

  await page.getByLabel("Assigned template page").selectOption("1");
  await page.getByLabel(confirmation).check();
  const topLeftX = page.getByLabel("Top left X");
  await topLeftX.fill("0");
  await topLeftX.press("Tab");
  await expect(page.getByLabel(confirmation)).not.toBeChecked();
  await page.getByLabel(confirmation).check();
  const topRightX = page.getByLabel("Top right X");
  await topRightX.fill("0");
  await topRightX.press("Tab");
  await page.getByLabel(confirmation).check();
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Move the corners into a valid",
  );
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: /Page 1: first.png/ }),
  ).toHaveCount(0);
  await expect(page.locator(".project-label strong")).toHaveText("Test Hand");
});

test("a confirmed two-page scan batch commits assignments for 35+ custom characters", async ({
  page,
}) => {
  await ready(page);
  await makeProject(
    page,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123",
  );
  await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles([
    {
      name: "page-one.png",
      mimeType: "image/png",
      buffer: await readFile(paper),
    },
    {
      name: "page-two.png",
      mimeType: "image/png",
      buffer: await readFile(synthetic),
    },
  ]);
  await expect(
    page.getByRole("button", { name: /Page 2: page-two.png/ }),
  ).toBeVisible();
  await page.getByLabel("Assigned template page").selectOption("0");
  await page.getByLabel(confirmation).check();
  await page.getByRole("button", { name: /Page 2: page-two.png/ }).click();
  await page.getByLabel("Assigned template page").selectOption("1");
  await page.getByLabel(confirmation).check();
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Page 1 / 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Page 2 / 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Workshop" }).click();
  await expect(page.locator(".glyph-grid button")).toHaveCount(56);
  await expect(page.locator(".glyph-source small")).toHaveText("Scan");
});

test("settings apply on blur, undo and redo; drawing undo is local to the canvas", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  const scale = page.getByLabel("Size", { exact: true });
  const before = await scale.inputValue();
  await scale.fill("1.2");
  await page.locator(".editor-heading h2").click();
  await expect(scale).toHaveValue("1.2");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(scale).toHaveValue(before);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(scale).toHaveValue("1.2");

  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph" })
    .click();
  const canvas = page.locator("canvas[aria-label^=" + '"Draw a glyph"' + "]");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("drawing canvas is missing");
  await page.mouse.move(box.x + 40, box.y + 150);
  await page.mouse.down();
  await page.mouse.move(box.x + 190, box.y + 60, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Undo" }).last().click();
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => {
      const ctx = element.getContext("2d");
      if (!ctx) throw new Error("missing canvas context");
      return ctx
        .getImageData(0, 0, element.width, element.height)
        .data.some((value, index) => index % 4 === 0 && value < 128);
    }),
  ).toBe(false);
  await page.mouse.move(box.x + 50, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 190, box.y + 60, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Use drawing" }).click();
  await expect(page.locator(".glyph-source small")).toHaveText("Drawing");
});

test("completed subset gate, TTF and WOFF2 downloads, and project roundtrip", async ({
  page,
}) => {
  await ready(page);
  await makeProject(page, "AB");
  await page.getByRole("button", { name: "Workshop" }).click();
  await expect(
    page.getByRole("button", { name: "Download TTF" }),
  ).toBeDisabled();
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Draw a glyph" })
    .click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("drawing canvas is missing");
  await page.mouse.move(box.x + 45, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 185, box.y + 60, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Use drawing" }).click();
  await expect(
    page.getByRole("button", { name: "Download TTF" }),
  ).toBeDisabled();
  await page.getByLabel("Export completed subset").check();
  const ttfEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF" }).click();
  expect((await ttfEvent).suggestedFilename()).toMatch(/\.ttf$/);
  const woffEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download WOFF2" }).click();
  expect((await woffEvent).suggestedFilename()).toMatch(/\.woff2$/);

  const projectEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const backup = await projectEvent;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error("project backup did not produce a file");
  const json = await readFile(backupPath, "utf8");
  expect(JSON.parse(json).name).toBe("Test Hand");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Open project" }).first().click(),
  ]);
  page.once("dialog", (dialog) => dialog.accept());
  await chooser.setFiles({
    name: "backup.glyphsprout.json",
    mimeType: "application/json",
    buffer: Buffer.from(json),
  });
  await expect(page.locator(".project-label strong")).toHaveText("Test Hand");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
});

test("all locales and theme preferences persist, including narrow layout", async ({
  page,
}) => {
  await ready(page);
  const locales = [
    "en",
    "zh-TW",
    "zh-CN",
    "ja",
    "ko",
    "es",
    "fr",
    "de",
    "pt-BR",
  ];
  for (const locale of locales) {
    await page.locator("#locale").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("navigation")).toBeVisible();
  }
  await page.locator("#theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator("#theme").selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.reload();
  await expect(page.locator("#locale")).toHaveValue("pt-BR");
  await expect(page.locator("#theme")).toHaveValue("system");
});

test("print opens a real popup containing every page and invokes print", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => {
      const target = window as Window & { __printCalls?: number };
      target.__printCalls = (target.__printCalls ?? 0) + 1;
    };
  });
  await ready(page);
  await makeProject(
    page,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123",
  );
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Print all pages" }).click(),
  ]);
  await expect(popup.locator("body img")).toHaveCount(2);
  await expect
    .poll(() =>
      popup.evaluate(
        () => (window as Window & { __printCalls?: number }).__printCalls,
      ),
    )
    .toBe(1);
});

test("no network requests leave the local app origin", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      (request.url().startsWith("http://") ||
        request.url().startsWith("https://")) &&
      !request.url().startsWith("http://127.0.0.1:4187/")
    )
      external.push(request.url());
  });
  await ready(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Try Han and kana strokes" }).click();
  await expect(page.locator(".project-label strong")).toContainText(
    "Sprout Script",
  );
  expect(external).toEqual([]);
});

test("fresh offline cache can scan before the scan worker has ever been created and export WOFF2", async ({
  page,
  context,
}) => {
  await ready(page);
  await expect(page.locator(".app-footer")).toContainText(
    "Ready for offline use",
    { timeout: 20000 },
  );
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await page.getByRole("button", { name: "Pages" }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await stageImage(page, synthetic);
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scans converted" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.getByLabel("Export completed subset").check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download WOFF2" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.woff2$/);
});

test("unreadable revisions remain intact until an explicit reset", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const counts = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("GlyphSprout-workshop-v1", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise<{ revisions: number; assets: number }>(
      (resolve, reject) => {
        const tx = db.transaction(["assets", "revisions"], "readwrite");
        let revisions = 0,
          assets = 0;
        const count = tx.objectStore("assets").count();
        count.onsuccess = () => {
          assets = count.result;
        };
        const store = tx.objectStore("revisions");
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          revisions++;
          entry.update({
            ...entry.value,
            project: { ...entry.value.project, schema: 999 },
          });
          entry.continue();
        };
        tx.oncomplete = () => {
          db.close();
          resolve({ revisions, assets });
        };
        tx.onerror = () => reject(tx.error);
      },
    );
  });
  expect(counts.revisions).toBe(2);
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "Stored data is preserved" }),
  ).toBeVisible();
  await expect(page.locator(".glyph-tile")).toHaveCount(0);
  await expect(
    page.getByText("I restored the previous revision.", { exact: false }),
  ).toHaveCount(0);
  // Even an explicitly opened sample must not overwrite unreadable revisions.
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  await expect(page.locator(".glyph-tile")).toHaveCount(6);
  await expect(page.locator(".project-label [role=status]")).toContainText(
    "Stored data is preserved",
  );
  await delayNextDatabaseOpen(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download stored data" }).click();
  await expect(
    page.getByRole("button", { name: "Reset local storage" }),
  ).toBeDisabled();
  const path = await (await event).path();
  if (!path) throw new Error("recovery archive did not produce a file");
  const archive = JSON.parse(await readFile(path, "utf8"));
  expect(archive.format).toBe("glyphsprout-storage-recovery");
  expect(archive.revisions).toHaveLength(counts.revisions);
  expect(
    archive.revisions.every(
      (r: { project: { schema: number } }) => r.project.schema === 999,
    ),
  ).toBe(true);
  expect(archive.assets).toHaveLength(counts.assets);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset local storage" }).click();
  await expect(
    page.getByRole("button", { name: "Download stored data" }),
  ).toBeVisible();
  await delayNextDatabaseOpen(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset local storage" }).click();
  await expect(
    page.getByRole("button", { name: "Retry saving" }),
  ).toBeDisabled();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.reload();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await expect(
    page.getByRole("button", { name: "Download stored data" }),
  ).toHaveCount(0);
});

test("changing characters changes the visible template ID", async ({
  page,
}) => {
  await ready(page);
  await makeProject(page, "AB");
  const before = await backupProject(page);
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill("BA");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  const after = await backupProject(page);
  expect(after.id).not.toBe(before.id);
  expect(after.characters).toEqual(["B", "A"]);
});

test("plain HTTP network origins show translated secure context guidance", async ({
  page,
}) => {
  const origin = "http://glyphsprout.test";
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await page.request.get(
      `http://127.0.0.1:4187${url.pathname}${url.search}`,
    );
    await route.fulfill({ response });
  });
  await page.goto(`${origin}/`);
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  await expect(page.getByRole("alert")).toContainText("HTTPS");
  await expect(
    page.getByRole("link", { name: "Open live workshop" }),
  ).toHaveAttribute("href", "https://arthur031221.github.io/GlyphSprout/");
  await page.getByRole("combobox").selectOption("zh-TW");
  await expect(page.getByRole("alert")).toContainText("本機位址");
  await expect(page.locator(".glyph-tile")).toHaveCount(0);
});

test("stale tabs cannot save or reset after the database is recreated", async ({
  page,
  context,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("GlyphSprout-workshop-v1", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("revisions", "readwrite");
      const cursor = tx.objectStore("revisions").openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        entry.update({
          ...entry.value,
          project: { ...entry.value.project, schema: 999 },
        });
        entry.continue();
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  });
  const stale = await context.newPage();
  await stale.goto("/");
  await expect(
    stale.getByRole("button", { name: "Reset local storage" }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase("GlyphSprout-workshop-v1");
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error("database deletion blocked"));
      }),
  );
  await page.reload();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const preserved = await backupProject(page);
  await stale.getByRole("button", { name: "Load sample", exact: true }).click();
  await expect(stale.locator(".project-label [role=status]")).toContainText(
    "Another tab saved a newer project",
  );
  stale.once("dialog", (dialog) => dialog.accept());
  await stale.getByRole("button", { name: "Reset local storage" }).click();
  await expect(
    stale
      .getByRole("alert")
      .filter({ hasText: "Another tab saved a newer project" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  expect((await backupProject(page)).glyphs).toEqual(preserved.glyphs);
  await stale.close();
});
