import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("downloads the live specimen as a PNG and skips characters without glyphs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  const button = page.getByRole("button", { name: "Download specimen image" });
  await expect(button).toBeEnabled();
  const event = page.waitForEvent("download");
  await button.click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("Paper Bloom-specimen.png");
  const path = await download.path();
  if (!path) throw new Error("missing specimen download");
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.readUInt32BE(16)).toBe(1600);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(300);

  await page.getByLabel("Type a specimen").fill("xyz");
  await button.click();
  await expect(page.getByRole("alert")).toContainText(
    "None of the specimen characters has a glyph yet.",
  );
});
