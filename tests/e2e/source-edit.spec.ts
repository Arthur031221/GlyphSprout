import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download project", exact: true })
    .click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
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
  const canvas = page.locator("canvas");
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

async function canvasPixels(page: Page) {
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("missing canvas context");
    return Array.from(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
    );
  });
}

test("source touchup keeps native pixels and settings through project undo and redo", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  const original = before.glyphs.H;
  await page.getByLabel("Ink threshold", { exact: true }).fill("150");
  await page.getByLabel("Ink threshold", { exact: true }).press("Tab");
  await page.getByLabel("Crop edges Right", { exact: true }).fill("0.9");
  await page.getByLabel("Crop edges Right", { exact: true }).press("Tab");
  await page.getByLabel("Size", { exact: true }).fill("1.2");
  await page.getByLabel("Size", { exact: true }).press("Tab");
  await page.getByLabel("Horizontal offset", { exact: true }).fill("20");
  await page.getByLabel("Horizontal offset", { exact: true }).press("Tab");
  await page.getByLabel("Latin side bearing", { exact: true }).fill("60");
  await page.getByLabel("Latin side bearing", { exact: true }).press("Tab");
  await page
    .getByLabel("Advance width, 0 automatic", { exact: true })
    .fill("700");
  await page
    .getByLabel("Advance width, 0 automatic", { exact: true })
    .press("Tab");
  const configured = await backup(page);
  const configuredGlyph = configured.glyphs.H;
  const expectedPixels = await page
    .locator(".source-outline img")
    .evaluate((image: HTMLImageElement) => [
      image.naturalWidth,
      image.naturalHeight,
    ]);

  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(page.locator("canvas")).toHaveJSProperty(
    "width",
    expectedPixels[0],
  );
  await expect(page.locator("canvas")).toHaveJSProperty(
    "height",
    expectedPixels[1],
  );
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();

  const initialPixels = await canvasPixels(page);
  await page.getByRole("button", { name: "Pen", exact: true }).click();
  await stroke(page, 0.35, 0.8, 0.75, 0.8);
  const penned = await canvasPixels(page);
  expect(penned).not.toEqual(initialPixels);
  await page.getByRole("button", { name: "Eraser", exact: true }).click();
  await stroke(page, 0.55, 0.8, 0.65, 0.8);
  const erased = await canvasPixels(page);
  expect(erased).not.toEqual(penned);
  await page.getByRole("button", { name: "Pen", exact: true }).click();
  await stroke(page, 0.8, 0.65, 0.9, 0.72);
  await page
    .locator(".draw-tools")
    .getByRole("button", { name: "Undo" })
    .click();
  expect(await canvasPixels(page)).toEqual(erased);

  await stroke(page, 0.4, 0.88, 0.72, 0.88);
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  const edited = await backup(page);
  const glyph = edited.glyphs.H;
  expect(glyph.source).not.toBe(configuredGlyph.source);
  expect(glyph.settings).toEqual(configuredGlyph.settings);
  expect(glyph.origin).toBe("draw");
  expect(glyph.reviewed).toBe(false);
  expect(glyph.pageId).toBe(configuredGlyph.pageId);
  expect(edited.pages).toEqual(configured.pages);
  expect(glyph.contours.length).toBeGreaterThan(0);
  expect(original.source).not.toBe(glyph.source);

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const undone = await backup(page);
  expect(undone.glyphs.H).toEqual(configuredGlyph);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect((await backup(page)).glyphs.H).toEqual(glyph);
});

test("cancel and empty source edits leave the scanned glyph unchanged", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  await stroke(page, 0.4, 0.82, 0.72, 0.82);
  await page
    .getByRole("button", { name: "Cancel source edit", exact: true })
    .click();
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);

  const sequence = await revisionSequence(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  expect(await revisionSequence(page)).toBe(sequence);
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);

  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Clear drawing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("This glyph has no ink.");
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);
});

test("reviewing a glyph asks before discarding source edits", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  await stroke(page, 0.4, 0.82, 0.72, 0.82);
  const editedPixels = await canvasPixels(page);
  let discard = false;
  const decisions: string[] = [];
  page.on("dialog", async (dialog) => {
    decisions.push(dialog.message());
    if (discard) await dialog.accept();
    else await dialog.dismiss();
  });
  await page
    .getByRole("button", { name: "Mark reviewed", exact: true })
    .click();
  expect(decisions).toHaveLength(1);
  expect(decisions[0]).toContain("Discard the unfinished drawing");
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);
  expect(await canvasPixels(page)).toEqual(editedPixels);
  discard = true;
  await page
    .getByRole("button", { name: "Mark reviewed", exact: true })
    .click();
  expect(decisions).toHaveLength(2);
  await expect(page.locator(".draw-canvas canvas")).toHaveCount(0);
  const newer = await backup(page);
  expect(newer.glyphs.H.source).toBe(before.glyphs.H.source);
  expect(newer.glyphs.H).not.toEqual(before.glyphs.H);
});

test("cancel during source decoding prevents late initialization", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      await new Promise<void>((resolve) => {
        (
          window as Window & { releaseSourceDecode?: () => void }
        ).releaseSourceDecode = resolve;
      });
    };
  });
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByText("Loading source image...", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel source edit", exact: true })
    .click();
  await page.evaluate(() => {
    (
      window as Window & { releaseSourceDecode?: () => void }
    ).releaseSourceDecode?.();
  });
  await expect(page.locator("canvas")).toHaveCount(0);
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);
});

for (const mode of ["pen", "unchanged", "blank"] as const) {
  test(`applying ${mode} source edits preserves a crop that is still decoding`, async ({
    page,
  }) => {
    await ready(page);
    const before = await backup(page);
    await page.evaluate(() => {
      const decode = HTMLImageElement.prototype.decode;
      let calls = 0;
      HTMLImageElement.prototype.decode = async function () {
        await decode.call(this);
        if (++calls === 1) {
          await new Promise<void>((resolve) => {
            (window as Window & { releaseCrop?: () => void }).releaseCrop =
              resolve;
          });
        }
      };
    });
    try {
      await page.getByLabel("Crop edges Right", { exact: true }).fill("0.6");
      await page
        .getByLabel("Crop edges Right", { exact: true })
        .evaluate((input: HTMLInputElement) => input.blur());
      await page.waitForFunction(
        () => !!(window as Window & { releaseCrop?: () => void }).releaseCrop,
      );
      await page
        .getByRole("button", { name: "Edit source", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Apply source edits" }),
      ).toBeEnabled();
      if (mode === "pen") await stroke(page, 0.4, 0.82, 0.72, 0.82);
      if (mode === "blank")
        await page
          .getByRole("button", { name: "Clear drawing", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Apply source edits", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "This glyph changed while the source editor was open.",
      );
    } finally {
      await page.evaluate(() => {
        (window as Window & { releaseCrop?: () => void }).releaseCrop?.();
      });
    }
    const after = await backup(page);
    expect(after.glyphs.H.settings.crop.right).toBe(0.6);
    expect(after.glyphs.H.source).toBe(before.glyphs.H.source);
    expect(after.glyphs.H.contours).not.toEqual(before.glyphs.H.contours);
  });
}

test("failed source decoding leaves the existing glyph intact", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.evaluate(() => {
    HTMLImageElement.prototype.decode = async () => {
      throw new Error("decode failed");
    };
  });
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(page.locator(".drawing-area [role=status]")).toContainText(
    "The image could not be decoded by this browser.",
  );
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cancel source edit", exact: true })
    .click();
  expect((await backup(page)).glyphs.H).toEqual(before.glyphs.H);
});

test("rectangular source images keep their proportions in the drawing canvas", async ({
  page,
}) => {
  const sample = JSON.parse(
    await readFile("public/samples/paper-sample.glyphsprout.json", "utf8"),
  ) as Project;
  sample.glyphs.H.source = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 216;
    canvas.height = 144;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("missing fixture canvas");
    context.drawImage(image, 0, 0, 216, 144);
    return canvas.toDataURL("image/png");
  }, sample.glyphs.H.source);
  sample.glyphs.H.origin = "scan";
  sample.glyphs.H.pageId = "rectangular-page";
  sample.pages = [
    {
      id: "rectangular-page",
      pageIndex: 0,
      image: sample.glyphs.H.source,
      width: 216,
      height: 144,
      corners: [
        { x: 0, y: 0 },
        { x: 216, y: 0 },
        { x: 216, y: 144 },
        { x: 0, y: 144 },
      ],
    },
  ];
  await page.route("**/samples/paper-sample.glyphsprout.json", (route) =>
    route.fulfill({ json: sample }),
  );
  await ready(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  const canvas = page.locator(".draw-canvas canvas");
  await expect(canvas).toHaveJSProperty("width", 216);
  await expect(canvas).toHaveJSProperty("height", 144);
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("source canvas is missing");
  expect(bounds.width / bounds.height).toBeCloseTo(1.5, 1);
  await page
    .getByRole("button", { name: "Apply source edits", exact: true })
    .click();
  expect((await backup(page)).glyphs.H).toEqual(sample.glyphs.H);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  await stroke(page, 0.2, 0.85, 0.7, 0.85);
  await page.getByRole("button", { name: "Apply source edits" }).click();
  const edited = (await backup(page)).glyphs.H;
  expect(edited.source).not.toBe(sample.glyphs.H.source);
  expect(edited.contours).not.toEqual(sample.glyphs.H.contours);
  expect(edited.settings).toEqual(sample.glyphs.H.settings);
  expect(edited.pageId).toBe(sample.glyphs.H.pageId);
  expect((await backup(page)).pages).toEqual(sample.pages);
  const dimensions = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, edited.source);
  expect(dimensions).toEqual({ width: 216, height: 144 });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await backup(page)).glyphs.H).toEqual(sample.glyphs.H);
});

test("source editing hands keyboard focus into the loading editor and back", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const decode = Image.prototype.decode;
    Image.prototype.decode = function () {
      Image.prototype.decode = decode;
      return new Promise<void>((resolve, reject) => {
        Object.defineProperty(window, "finishSourceDecode", {
          value: () => decode.call(this).then(resolve, reject),
        });
      });
    };
  });
  const edit = page.getByRole("button", { name: "Edit source", exact: true });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".drawing-area")).toBeFocused();
  await expect(
    page.getByText("Loading source image...", { exact: true }),
  ).toBeVisible();
  const cancel = page.getByRole("button", {
    name: "Cancel source edit",
    exact: true,
  });
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.evaluate(() => {
    Reflect.get(window, "finishSourceDecode")();
  });
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(edit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".drawing-area")).toBeFocused();
  const apply = page.getByRole("button", { name: "Apply source edits" });
  await expect(apply).toBeEnabled();
  await apply.focus();
  await page.keyboard.press("Enter");
  await expect(edit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".drawing-area")).toBeFocused();
  const nextGlyph = page.locator('.glyph-tile[aria-label^="E "]');
  await nextGlyph.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".drawing-area")).toHaveCount(0);
  await expect(nextGlyph).toBeFocused();
});

test("losing pointer capture stops a source stroke until the next press", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  const canvas = page.locator(".draw-canvas canvas");
  await canvas.evaluate((element: HTMLCanvasElement) => {
    element.addEventListener("pointerdown", (event) => {
      element.dataset.pointerId = String(event.pointerId);
    });
  });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("source canvas is missing");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.85);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.85);
  const before = await canvasPixels(page);
  await canvas.evaluate((element: HTMLCanvasElement) => {
    element.releasePointerCapture(Number(element.dataset.pointerId));
  });
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.85);
  expect(await canvasPixels(page)).toEqual(before);
  await page.mouse.up();
  await stroke(page, 0.2, 0.7, 0.7, 0.7);
  expect(await canvasPixels(page)).not.toEqual(before);
});

test("a second touch cannot change or interrupt the active source stroke", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-specific");
  await ready(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  const session = await context.newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    const canvas = page.locator(".draw-canvas canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("source canvas is missing");
    const first = {
      x: box.x + box.width * 0.2,
      y: box.y + box.height * 0.85,
      id: 1,
    };
    const second = {
      x: box.x + box.width * 0.8,
      y: box.y + box.height * 0.2,
      id: 2,
    };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first],
    });
    first.x += box.width * 0.1;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [first],
    });
    const before = await canvasPixels(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first, second],
    });
    expect(await canvasPixels(page)).toEqual(before);
    second.x += box.width * 0.1;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [first, second],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [first],
    });
    const lifted = await canvasPixels(page);
    first.x += box.width * 0.2;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [first],
    });
    expect(await canvasPixels(page)).not.toEqual(lifted);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
});

test("source editing tools fit narrow screens in every locale", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply source edits" }),
  ).toBeEnabled();
  const locales = await page
    .locator("#locale option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
  for (const locale of locales) {
    await page.locator("#locale").selectOption(locale);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        controls: [...document.querySelectorAll(".drawing-area button")].map(
          (button) => {
            const bounds = button.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= innerWidth;
          },
        ),
      }));
      expect(layout.width, `${locale} at ${width}px`).toBeLessThanOrEqual(
        width,
      );
      expect(layout.controls.every(Boolean), `${locale} at ${width}px`).toBe(
        true,
      );
    }
  }
});
