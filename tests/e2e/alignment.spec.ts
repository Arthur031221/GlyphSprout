import { expect, type Locator, type Page, test } from "@playwright/test";

const paper = "tests/e2e/fixtures/paper.png";
const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

test("mobile corner targets accept touches away from the visible marker", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-specific");
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    if (width === 320) await stagePaper(page);
    for (let index = 0; index < 4; index++) {
      const handle = page.locator(".corner-handle").nth(index);
      await handle.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => (await handle.boundingBox())?.width ?? 0)
        .toBeGreaterThanOrEqual(47.5);
      const box = await handle.boundingBox();
      if (!box) throw new Error("Missing mobile corner target");
      const before = await coordinates(page, index);
      const scale = await handle.evaluate((element) => {
        const matrix = (element as SVGCircleElement).getScreenCTM();
        if (!matrix) throw new Error("Missing registration scale");
        return { x: matrix.a, y: matrix.d };
      });
      const direction = index === 1 || index === 2 ? -1 : 1;
      const start = {
        x: box.x + box.width / 2 + 18 * direction,
        y: box.y + box.height / 2,
      };
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...start, id: 1 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: start.x + 8 * direction, y: start.y + 6, id: 1 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      const after = await coordinates(page, index);
      expect(
        Math.abs(
          Number(after[0]) - Number(before[0]) - (8 * direction) / scale.x,
        ),
      ).toBeLessThan(2);
      expect(
        Math.abs(Number(after[1]) - Number(before[1]) - 6 / scale.y),
      ).toBeLessThan(2);
    }
  }
});

async function stagePaper(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles(paper);
  await expect(
    page.getByRole("button", { name: /Page 1: paper.png/ }),
  ).toBeVisible();
  await page.getByLabel(confirmation).check();
}

async function coordinates(page: Page, index: number) {
  const inputs = page.locator(".corner-input").nth(index).locator("input");
  return [await inputs.nth(0).inputValue(), await inputs.nth(1).inputValue()];
}

async function expectDragChangesCoordinates(
  page: Page,
  handle: Locator,
  index: number,
  drag: (start: { x: number; y: number }) => Promise<void>,
) {
  const confirmationControl = page.getByLabel(confirmation);
  await confirmationControl.check();
  const before = await coordinates(page, index);
  await handle.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "center" }),
  );
  const bounds = await handle.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await drag({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  });
  await expect
    .poll(async () => {
      const after = await coordinates(page, index);
      return after[0] !== before[0] && after[1] !== before[1];
    })
    .toBe(true);
  await expect(confirmationControl).not.toBeChecked();
}

test("all four SVG handles drag with the mouse in both desktop browsers", async ({
  page,
}) => {
  await stagePaper(page);
  const handles = page.locator(".scan-preview svg circle.corner-handle");
  await expect(handles).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    const handle = handles.nth(index);
    await expectDragChangesCoordinates(page, handle, index, async (start) => {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(
        start.x + (index === 1 || index === 2 ? -24 : 24),
        start.y + (index < 2 ? 24 : -24),
        { steps: 8 },
      );
      await page.mouse.up();
    });
  }
});

test("all four SVG handles accept real touch drags on mobile Chromium", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-specific");
  await stagePaper(page);
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const handles = page.locator(".scan-preview svg circle.corner-handle");
  await expect(handles).toHaveCount(4);

  for (let index = 0; index < 4; index += 1) {
    const handle = handles.nth(index);
    await expectDragChangesCoordinates(page, handle, index, async (start) => {
      const end = {
        x: start.x + (index === 1 || index === 2 ? -24 : 24),
        y: start.y + (index < 2 ? 24 : -24),
      };
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: start.x, y: start.y, id: 1 }],
      });
      for (let step = 1; step <= 8; step += 1) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: start.x + ((end.x - start.x) * step) / 8,
              y: start.y + ((end.y - start.y) * step) / 8,
              id: 1,
            },
          ],
        });
      }
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    });
  }
  await session.detach();
});
