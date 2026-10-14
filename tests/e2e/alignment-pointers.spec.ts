import { expect, type Page, test } from "@playwright/test";

const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

async function ready(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles("tests/e2e/fixtures/paper.png");
  await page.getByLabel(confirmation).check();
  const handle = page.locator(".corner-handle").first();
  await handle.scrollIntoViewIfNeeded();
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error("missing scan corner");
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

async function coordinates(page: Page, index = 0) {
  return page
    .locator(".corner-input")
    .nth(index)
    .locator("input")
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );
}

test("unrelated pointer movement and endings leave the active corner drag intact", async ({
  page,
}) => {
  const start = await ready(page);
  const before = await coordinates(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const svg = page.locator(".scan-preview svg");
  await svg.dispatchEvent("pointermove", {
    pointerId: 999,
    pointerType: "touch",
    clientX: start.x + 40,
    clientY: start.y + 30,
  });
  expect(await coordinates(page)).toEqual(before);
  await expect(page.getByLabel(confirmation)).toBeChecked();
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    await svg.dispatchEvent(type, { pointerId: 999, pointerType: "touch" });
  }
  await page.mouse.move(start.x + 20, start.y + 15, { steps: 3 });
  await page.mouse.up();
  expect(await coordinates(page)).not.toEqual(before);
  await expect(page.getByLabel(confirmation)).not.toBeChecked();
});

test("losing pointer capture stops the drag and allows the next drag", async ({
  page,
}) => {
  const start = await ready(page);
  const handle = page.locator(".corner-handle").first();
  await handle.evaluate((element) => {
    element.addEventListener(
      "pointerdown",
      (event) =>
        element.setAttribute(
          "data-test-pointer",
          String((event as PointerEvent).pointerId),
        ),
      { once: true },
    );
    element.addEventListener("lostpointercapture", () =>
      element.setAttribute("data-test-lost", "true"),
    );
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 2, start.y + 2);
  const beforeLoss = await coordinates(page);
  await handle.evaluate((element) => {
    element.releasePointerCapture(
      Number(element.getAttribute("data-test-pointer")),
    );
  });
  await page.mouse.move(start.x + 15, start.y + 15);
  await expect(handle).toHaveAttribute("data-test-lost", "true");
  expect(await coordinates(page)).toEqual(beforeLoss);
  await page.mouse.up();
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error("missing scan corner");
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 20,
    bounds.y + bounds.height / 2 + 10,
  );
  await page.mouse.up();
  expect(await coordinates(page)).not.toEqual(beforeLoss);
});

test("right mouse button does not move scan corners", async ({ page }) => {
  const start = await ready(page);
  const before = await coordinates(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(start.x + 25, start.y + 15);
  await page.mouse.up({ button: "right" });
  expect(await coordinates(page)).toEqual(before);
  await expect(page.getByLabel(confirmation)).toBeChecked();
});

test("a second finger cannot take over or end a real touch drag", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-specific");
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const session = await context.newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    const handles = page.locator(".corner-handle");
    await handles.evaluateAll((elements) => {
      for (const element of elements) {
        element.addEventListener("pointerdown", (event) => {
          const pointer = event as PointerEvent;
          element.setAttribute("data-test-pointer", String(pointer.pointerId));
          element.setAttribute(
            "data-test-starts",
            String(Number(element.getAttribute("data-test-starts") ?? 0) + 1),
          );
        });
        element.addEventListener("pointerup", (event) => {
          element.setAttribute(
            "data-test-ended",
            String((event as PointerEvent).pointerId),
          );
        });
      }
    });
    await handles.first().scrollIntoViewIfNeeded();
    const first = await handles.first().boundingBox();
    const second = await handles.nth(1).boundingBox();
    if (!first || !second) throw new Error("missing touch corners");
    const a = {
      x: first.x + first.width / 2,
      y: first.y + first.height / 2,
      id: 1,
    };
    const b = {
      x: second.x + second.width / 2,
      y: second.y + second.height / 2,
      id: 2,
    };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [a],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...a, x: a.x + 3 }],
    });
    const primary = { ...a, x: a.x + 3 };
    const beforePrimary = await coordinates(page);
    const beforeSecondary = await coordinates(page, 1);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [primary, b],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [primary, { ...b, x: b.x - 25, y: b.y + 20 }],
    });
    expect(await coordinates(page)).toEqual(beforePrimary);
    expect(await coordinates(page, 1)).toEqual(beforeSecondary);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ ...b, x: b.x - 25, y: b.y + 20 }],
    });
    const secondaryId = await handles.nth(1).getAttribute("data-test-pointer");
    if (secondaryId === null) throw new Error("missing secondary pointer");
    await expect(handles.nth(1)).toHaveAttribute(
      "data-test-ended",
      secondaryId,
    );
    expect(await handles.first().getAttribute("data-test-ended")).toBeNull();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...primary, x: primary.x + 15, y: primary.y + 10 }],
    });
    await expect.poll(() => coordinates(page)).not.toEqual(beforePrimary);
    await expect(handles.first()).toHaveAttribute("data-test-starts", "1");
    expect(await coordinates(page, 1)).toEqual(beforeSecondary);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
});
