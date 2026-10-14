import { expect, type Page, test } from "@playwright/test";

const crosses = [
  [52, 108],
  [948, 108],
  [948, 1362],
  [52, 1362],
];

async function stage(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles(file);
  await expect(page.locator(".corner-input").first()).toBeVisible();
}

async function coordinates(page: Page) {
  const values: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const inputs = page.locator(".corner-input").nth(i).locator("input");
    values.push([
      Number(await inputs.nth(0).inputValue()),
      Number(await inputs.nth(1).inputValue()),
    ]);
  }
  return values;
}

async function renderPage(
  page: Page,
  width: number,
  height: number,
  draw: boolean,
) {
  const data = await page.evaluate(
    async ({ width, height, draw, crosses }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no canvas");
      context.fillStyle = "#f0f0f0";
      context.fillRect(0, 0, width, height);
      if (draw) {
        const k = width / 1000;
        context.strokeStyle = context.fillStyle = "#1b2a3a";
        context.lineWidth = 3 * k;
        for (const [x, y] of crosses) {
          context.beginPath();
          context.moveTo((x - 12) * k, y * k);
          context.lineTo((x + 12) * k, y * k);
          context.moveTo(x * k, (y - 12) * k);
          context.lineTo(x * k, (y + 12) * k);
          context.stroke();
          context.fillStyle = "#f0f0f0";
          context.beginPath();
          context.arc(x * k, y * k, 5 * k, 0, Math.PI * 2);
          context.fill();
          context.lineWidth = 2 * k;
          context.stroke();
          context.lineWidth = 3 * k;
        }
      }
      const blob = await new Promise<Blob | null>((done) =>
        canvas.toBlob(done, "image/png"),
      );
      if (!blob) throw new Error("no blob");
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    },
    { width, height, draw, crosses },
  );
  return {
    name: "sheet.png",
    mimeType: "image/png",
    buffer: Buffer.from(data),
  };
}

test("a printed template scan gets its four corners placed on the crosses", async ({
  page,
}) => {
  await stage(page, "tests/e2e/fixtures/paper.png");
  const found = await coordinates(page);
  const expected = [
    [41, 86],
    [753, 86],
    [753, 1082],
    [41, 1082],
  ];
  found.forEach(([x, y], i) => {
    expect(Math.abs(x - expected[i][0])).toBeLessThan(4);
    expect(Math.abs(y - expected[i][1])).toBeLessThan(4);
  });
  const note = page.locator(".corners-found");
  await expect(note).toContainText("found automatically");
  await page
    .locator(".corner-input")
    .first()
    .locator("input")
    .first()
    .fill("60");
  await expect(note).toHaveCount(0);
});

test("a photo larger than the page limit is shrunk and still detected", async ({
  page,
}) => {
  await page.goto("/");
  const file = await renderPage(page, 3300, 4666, true);
  await stage(page, file);
  const max = await page
    .locator(".corner-input")
    .first()
    .locator("input")
    .nth(1)
    .getAttribute("max");
  expect(Number(max)).toBeLessThanOrEqual(4096);
  const width = Number(
    await page
      .locator(".corner-input")
      .first()
      .locator("input")
      .first()
      .getAttribute("max"),
  );
  const k = width / 1000;
  const found = await coordinates(page);
  found.forEach(([x, y], i) => {
    expect(Math.abs(x - crosses[i][0] * k)).toBeLessThan(4);
    expect(Math.abs(y - crosses[i][1] * k)).toBeLessThan(4);
  });
  await expect(page.locator(".corners-found")).toBeVisible();
});

test("an image without crosses keeps the page-filling guess and no note", async ({
  page,
}) => {
  await page.goto("/");
  const file = await renderPage(page, 1000, 1414, false);
  await stage(page, file);
  expect(await coordinates(page)).toEqual(crosses);
  await expect(page.locator(".corners-found")).toHaveCount(0);
});
