import { expect, type Locator, type Page, test } from "@playwright/test";

const paper = "tests/e2e/fixtures/paper.png";
const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

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
