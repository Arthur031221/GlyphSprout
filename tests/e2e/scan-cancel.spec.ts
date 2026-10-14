import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

const confirmation =
  "I confirmed the visible page ID, page assignment and interior alignment";

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing backup");
  return JSON.parse(await readFile(path, "utf8"));
}

for (const surface of ["Pages", "Workshop"] as const) {
  test(`stopping conversion from ${surface} preserves both aligned scans for retry`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      let delayed = false;
      window.Worker = class extends NativeWorker {
        postMessage(
          message: unknown,
          options?: StructuredSerializeOptions | Transferable[],
        ) {
          const send = () => {
            if (Array.isArray(options)) super.postMessage(message, options);
            else super.postMessage(message, options);
          };
          if (
            message &&
            typeof message === "object" &&
            "pages" in message &&
            !delayed
          ) {
            delayed = true;
            setTimeout(send, 1200);
          } else send();
        }
      };
    });
    await page.goto("/");
    await expect(page.locator(".project-label [role=status]")).toHaveText(
      "Saved",
    );
    await page.getByRole("button", { name: "Characters" }).click();
    await page
      .getByLabel("Text to include")
      .fill(
        Array.from({ length: 36 }, (_, i) => String.fromCharCode(i + 33)).join(
          "",
        ),
      );
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Project ready" }).click();
    const original = await backup(page);
    const image = await readFile("tests/e2e/fixtures/paper.png");
    await page.locator('input[accept="image/png,image/jpeg"]').setInputFiles(
      [1, 2].map((n) => ({
        name: `sheet-${n}.png`,
        mimeType: "image/png",
        buffer: image,
      })),
    );
    const positions: string[][] = [];
    for (const n of [1, 2]) {
      await page
        .getByRole("button", { name: `Page ${n}: sheet-${n}.png`, exact: true })
        .click();
      const corner = page.getByLabel("Top left X", { exact: true });
      await corner.fill(String(Number(await corner.inputValue()) + n));
      await corner.press("Tab");
      await page.getByLabel(confirmation).check();
      positions.push(
        await page
          .locator(".corner-input input")
          .evaluateAll((inputs) =>
            inputs.map((input) => (input as HTMLInputElement).value),
          ),
      );
    }
    await page
      .getByRole("button", { name: "Convert scans", exact: true })
      .click();
    if (surface === "Workshop")
      await page.getByRole("button", { name: "Workshop" }).click();
    await page
      .locator(".scan-job")
      .getByRole("button", { name: /^(Stop conversion|Cancel)$/ })
      .click();
    await expect(
      page.getByText(
        "Scan conversion was canceled. Your scans and alignment are ready to retry.",
        { exact: true },
      ),
    ).toBeVisible();
    expect((await backup(page)).glyphs).toEqual(original.glyphs);
    if (surface === "Workshop")
      await page.getByRole("button", { name: "Pages" }).click();
    await expect(
      page.getByRole("button", { name: "Page 2: sheet-2.png", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const n of [2, 1]) {
      await page
        .getByRole("button", { name: `Page ${n}: sheet-${n}.png`, exact: true })
        .click();
      await expect(page.getByLabel(confirmation)).toBeChecked();
      expect(
        await page
          .locator(".corner-input input")
          .evaluateAll((inputs) =>
            inputs.map((input) => (input as HTMLInputElement).value),
          ),
      ).toEqual(positions[n - 1]);
    }
    await expect(
      page.getByRole("button", { name: "Convert scans", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Convert scans", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Page 1: sheet-1.png", exact: true }),
    ).toHaveCount(0, { timeout: 20000 });
    const converted = await backup(page);
    expect(converted.pages.map((p) => p.pageIndex)).toEqual([0, 1]);
    expect(
      Object.values(converted.glyphs).some(
        (g) => g.origin === "scan" && g.contours.length,
      ),
    ).toBe(true);
  });
}

test("discarding staged scans removes them without changing the saved project", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const original = await backup(page);
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles("tests/e2e/fixtures/paper.png");
  await expect(
    page.getByRole("button", { name: "Page 1: paper.png", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Discard staged scans", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Page 1: paper.png", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".draft-notice")).toHaveCount(0);
  expect(await backup(page)).toEqual(original);
});
