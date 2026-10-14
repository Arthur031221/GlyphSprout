import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function openDrawing(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.getByRole("button", { name: "Draw a glyph", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Use drawing", exact: true }),
  ).toBeEnabled();
}

async function pixels(page: Page) {
  return page
    .locator(".draw-canvas canvas")
    .evaluate(async (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("missing canvas context");
      const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hash));
    });
}

async function point(page: Page, x: number, y: number) {
  const canvas = page.locator(".draw-canvas canvas");
  await page.locator(".drawing-viewport").scrollIntoViewIfNeeded();
  await canvas.evaluate(
    (element: HTMLCanvasElement, position) => {
      const viewport = element.closest(".drawing-viewport");
      if (!viewport) throw new Error("missing viewport");
      viewport.scrollLeft =
        (position.x * element.clientWidth) / element.width -
        viewport.clientWidth / 2;
      viewport.scrollTop =
        (position.y * element.clientHeight) / element.height -
        viewport.clientHeight / 2;
    },
    { x, y },
  );
  const position = await canvas.evaluate(
    (element: HTMLCanvasElement, native) => {
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x + (native.x * bounds.width) / element.width,
        y: bounds.y + (native.y * bounds.height) / element.height,
      };
    },
    { x, y },
  );
  await page.mouse.click(position.x, position.y);
}

async function inkBounds(page: Page, x: number, y: number) {
  return page.locator(".draw-canvas canvas").evaluate(
    (canvas: HTMLCanvasElement, center) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("missing canvas context");
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const ink: { x: number; y: number }[] = [];
      for (let py = center.y - 20; py < center.y + 20; py++) {
        for (let px = center.x - 20; px < center.x + 20; px++) {
          if (data[(py * canvas.width + px) * 4] < 220)
            ink.push({ x: px, y: py });
        }
      }
      return {
        width:
          Math.max(...ink.map((p) => p.x)) -
          Math.min(...ink.map((p) => p.x)) +
          1,
        height:
          Math.max(...ink.map((p) => p.y)) -
          Math.min(...ink.map((p) => p.y)) +
          1,
      };
    },
    { x, y },
  );
}

for (const width of [320, 390, 1440]) {
  test(`brush width stays in source pixels at fit and 400 percent zoom at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openDrawing(page);
    await page
      .getByLabel("Pen size, source pixels", { exact: true })
      .fill("12");
    await point(page, 96, 96);
    const fitted = await inkBounds(page, 96, 96);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await point(page, 288, 288);
    const zoomed = await inkBounds(page, 288, 288);
    for (const axis of ["width", "height"] as const) {
      // Pointer coordinates and circle antialiasing can cover one extra edge pixel.
      expect(Math.abs(fitted[axis] - 12)).toBeLessThanOrEqual(1);
      expect(Math.abs(zoomed[axis] - 12)).toBeLessThanOrEqual(1);
      expect(Math.abs(zoomed[axis] - fitted[axis])).toBeLessThanOrEqual(1);
    }
    await expect(page.locator(".draw-canvas canvas")).toHaveJSProperty(
      "width",
      384,
    );
    await expect(page.locator(".draw-canvas canvas")).toHaveJSProperty(
      "height",
      384,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole("button", { name: "Eraser", exact: true }).click();
    await page
      .getByLabel("Eraser size, source pixels", { exact: true })
      .fill("4");
    await point(page, 288, 288);
    const erased = await page
      .locator(".draw-canvas canvas")
      .evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("missing canvas context");
        return Array.from(ctx.getImageData(284, 288, 5, 1).data);
      });
    expect(erased[4 * 4]).toBe(255);
    expect(erased[0]).toBeLessThan(40);
    await page
      .locator(".draw-tools")
      .first()
      .getByRole("button", { name: "Undo", exact: true })
      .click();
    expect(await inkBounds(page, 288, 288)).toEqual(zoomed);
    await page.getByRole("button", { name: "Pen", exact: true }).click();
    await expect(
      page.getByLabel("Pen size, source pixels", { exact: true }),
    ).toHaveValue("12");
    await page.getByRole("button", { name: "Eraser", exact: true }).click();
    await expect(
      page.getByLabel("Eraser size, source pixels", { exact: true }),
    ).toHaveValue("4");
  });
}

test("zooming, mouse panning, keyboard scrolling and fitting preserve pixels and history", async ({
  page,
}) => {
  await openDrawing(page);
  const blank = await pixels(page);
  await point(page, 192, 192);
  const original = await pixels(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Pan", exact: true }).click();
  const viewport = page.getByRole("region", {
    name: "Drawing viewport",
    exact: true,
  });
  await viewport.scrollIntoViewIfNeeded();
  const before = await viewport.evaluate((element) => ({
    x: element.scrollLeft,
    y: element.scrollTop,
  }));
  const bounds = await viewport.boundingBox();
  if (!bounds) throw new Error("missing viewport bounds");
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 - 40,
    bounds.y + bounds.height / 2 - 25,
    { steps: 5 },
  );
  await page.mouse.up();
  const moved = await viewport.evaluate((element) => ({
    x: element.scrollLeft,
    y: element.scrollTop,
  }));
  expect(moved.x - before.x).toBeCloseTo(40, 0);
  expect(moved.y - before.y).toBeCloseTo(25, 0);
  await page.getByRole("button", { name: "Fit image", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(viewport).toBeFocused();
  await viewport.press("ArrowRight");
  expect(
    await viewport.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(moved.x);
  expect(await pixels(page)).toEqual(original);
  await expect(
    page
      .locator(".draw-tools")
      .first()
      .getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Fit image", exact: true }).click();
  await expect(page.locator(".drawing-controls output")).toHaveText("100%");
  expect(
    await viewport.evaluate((element) => [
      element.scrollLeft,
      element.scrollTop,
    ]),
  ).toEqual([0, 0]);
  expect(await pixels(page)).toEqual(original);
  await page
    .locator(".draw-tools")
    .first()
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  expect(await pixels(page)).toEqual(blank);
  await expect(page.locator(".draft-notice")).toHaveCount(0);
});

test("secondary mouse buttons leave pixels and history unchanged", async ({
  page,
}) => {
  await openDrawing(page);
  const original = await pixels(page);
  const canvas = page.locator(".draw-canvas canvas");
  await canvas.click({ button: "right", position: { x: 90, y: 90 } });
  await page.keyboard.press("Escape");
  await canvas.click({ button: "middle", position: { x: 180, y: 180 } });
  expect(await pixels(page)).toEqual(original);
  await expect(
    page
      .locator(".draw-tools")
      .first()
      .getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".draft-notice")).toHaveCount(0);
});

test("zoom keeps the same source point centered when scrollbar width changes", async ({
  page,
}) => {
  await openDrawing(page);
  const viewport = page.locator(".drawing-viewport");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await viewport.evaluate((element) => {
    element.scrollLeft = 120;
    element.scrollTop = 100;
  });
  const center = () =>
    viewport.evaluate((element) => {
      const canvas = element.querySelector("canvas");
      if (!canvas) throw new Error("missing canvas");
      const frame = element.getBoundingClientRect();
      const image = canvas.getBoundingClientRect();
      return [
        (frame.left +
          element.clientLeft +
          element.clientWidth / 2 -
          image.left) /
          image.width,
        (frame.top + element.clientTop + element.clientHeight / 2 - image.top) /
          image.height,
      ];
    });
  const original = await center();
  // Simulate the available width changing as non-overlay scrollbars appear.
  await page.addStyleTag({
    content:
      '.drawing-viewport:has(.draw-canvas[style*="400%"]) { width: 360px; }',
  });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const after = await center();
  expect(after[0]).toBeCloseTo(original[0], 2);
  expect(after[1]).toBeCloseTo(original[1], 2);
});

test("touch panning moves the viewport without adding an undo entry", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-specific");
  await page.setViewportSize({ width: 390, height: 844 });
  await openDrawing(page);
  const original = await pixels(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Pan", exact: true }).click();
  const viewport = page.locator(".drawing-viewport");
  await viewport.scrollIntoViewIfNeeded();
  const box = await viewport.boundingBox();
  if (!box) throw new Error("missing viewport");
  const before = await viewport.evaluate((element) => [
    element.scrollLeft,
    element.scrollTop,
  ]);
  const session = await context.newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    const finger = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      id: 1,
    };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [finger],
    });
    finger.x -= 40;
    finger.y -= 25;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [finger],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
  const after = await viewport.evaluate((element) => [
    element.scrollLeft,
    element.scrollTop,
  ]);
  expect(after[0] - before[0]).toBeCloseTo(40, 0);
  expect(after[1] - before[1]).toBeCloseTo(25, 0);
  expect(await pixels(page)).toEqual(original);
  await expect(
    page
      .locator(".draw-tools")
      .first()
      .getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".draft-notice")).toHaveCount(0);
});

test("a second touch cannot use the toolbar during an active stroke", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-specific");
  await page.setViewportSize({ width: 1280, height: 1200 });
  await openDrawing(page);
  const original = await pixels(page);
  const undo = page
    .locator(".draw-tools")
    .first()
    .getByRole("button", { name: "Undo", exact: true });
  const canvas = page.locator(".draw-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const undoBox = await undo.boundingBox();
  if (!box || !undoBox) throw new Error("missing drawing controls");
  const session = await context.newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    const first = {
      x: box.x + box.width * 0.25,
      y: box.y + box.height * 0.5,
      id: 1,
    };
    const second = {
      x: undoBox.x + undoBox.width / 2,
      y: undoBox.y + undoBox.height / 2,
      id: 2,
    };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first],
    });
    await expect(undo).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Zoom in", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Clear drawing", exact: true }),
    ).toBeDisabled();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first, second],
    });
    first.x += 30;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [first, second],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
  expect(await pixels(page)).not.toEqual(original);
  await expect(undo).toBeEnabled();
  await undo.click();
  expect(await pixels(page)).toEqual(original);
});

for (const dimensions of [
  [216, 144],
  [144, 216],
]) {
  test(`zoomed source edits retain ${dimensions[0]} by ${dimensions[1]} pixels and glyph settings`, async ({
    page,
  }) => {
    const sample: Project = JSON.parse(
      await readFile("public/samples/paper-sample.glyphsprout.json", "utf8"),
    );
    sample.glyphs.H.source = await page.evaluate(
      ({ width, height }) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("missing fixture context");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "black";
        ctx.fillRect(20, 20, width - 40, height - 40);
        return canvas.toDataURL("image/png");
      },
      { width: dimensions[0], height: dimensions[1] },
    );
    sample.glyphs.H.settings.sideBearing = 73;
    await page.route("**/samples/paper-sample.glyphsprout.json", (route) =>
      route.fulfill({ json: sample }),
    );
    await page.goto("/");
    await expect(page.locator(".project-label [role=status]")).toHaveText(
      "Saved",
    );
    await page
      .getByRole("button", { name: "Edit source", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Apply source edits", exact: true }),
    ).toBeEnabled();
    const original = await pixels(page);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Eraser", exact: true }).click();
    await page
      .getByLabel("Eraser size, source pixels", { exact: true })
      .fill("3");
    await point(page, dimensions[0] / 2, dimensions[1] / 2);
    expect(await pixels(page)).not.toEqual(original);
    await page
      .getByRole("button", { name: "Apply source edits", exact: true })
      .click();
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download project" }).click();
    const path = await (await event).path();
    if (!path) throw new Error("missing backup");
    const result: Project = JSON.parse(await readFile(path, "utf8"));
    expect(result.glyphs.H.settings).toEqual(sample.glyphs.H.settings);
    expect(result.glyphs.H.reviewed).toBe(false);
    expect(result.glyphs.H.source).not.toBe(sample.glyphs.H.source);
    await expect(page.locator(".source-outline img")).toHaveJSProperty(
      "naturalWidth",
      dimensions[0],
    );
    await expect(page.locator(".source-outline img")).toHaveJSProperty(
      "naturalHeight",
      dimensions[1],
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".source-outline img")).toHaveAttribute(
      "src",
      sample.glyphs.H.source,
    );
  });
}
