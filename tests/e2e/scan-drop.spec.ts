import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function pages(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Pages" }).click();
}

async function drop(page: Page, name: string, type: string, path?: string) {
  const data = await page.evaluateHandle(
    async ([fileName, mime, source]) => {
      const transfer = new DataTransfer();
      const bytes = source
        ? new Uint8Array(await (await fetch(source)).arrayBuffer())
        : new Uint8Array([1, 2, 3]);
      transfer.items.add(new File([bytes], fileName, { type: mime }));
      return transfer;
    },
    [name, type, path ?? ""] as const,
  );
  await page.locator(".scan-panel").dispatchEvent("dragover", {
    dataTransfer: data,
  });
  const highlighted = await page.locator(".scan-panel.dropping").count();
  await page.locator(".scan-panel").dispatchEvent("drop", {
    dataTransfer: data,
  });
  return highlighted;
}

test("dropping a scan image on the Pages stage adds it to the queue", async ({
  page,
}) => {
  await pages(page);
  await page.route("**/fixture-paper.png", async (route) => {
    const { readFile } = await import("node:fs/promises");
    await route.fulfill({
      contentType: "image/png",
      body: await readFile("tests/e2e/fixtures/paper.png"),
    });
  });
  await expect(page.locator(".draft-item")).toHaveCount(0);
  expect(
    await drop(page, "dropped.png", "image/png", "/fixture-paper.png"),
  ).toBe(1);
  await expect(page.locator(".scan-panel.dropping")).toHaveCount(0);
  await expect(page.locator(".draft-item")).toHaveCount(1);
  await expect(page.locator(".draft-item")).toContainText("dropped.png");
});

test("dropping something that is not a JPEG or PNG is refused with a message", async ({
  page,
}) => {
  await pages(page);
  await drop(page, "notes.txt", "text/plain");
  await expect(
    page.getByText("Only JPEG and PNG images can be added."),
  ).toBeVisible();
  await expect(page.locator(".draft-item")).toHaveCount(0);
});

test("the camera button is offered on touch screens only", async ({
  browser,
}) => {
  const touch = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    serviceWorkers: "block",
    baseURL: "http://127.0.0.1:4187",
  });
  const mobile = await touch.newPage();
  await pages(mobile);
  const camera = mobile.getByText("Take a photo");
  await expect(camera).toBeVisible();
  await expect(camera.locator("input")).toHaveAttribute(
    "capture",
    "environment",
  );
  await expect(mobile.locator(".drop-hint")).toBeHidden();
  await touch.close();
});

test("the camera button and drop hint swap on a mouse screen", async ({
  page,
}) => {
  await pages(page);
  await expect(page.getByText("Take a photo")).toBeHidden();
  await expect(page.locator(".drop-hint")).toBeVisible();
});
