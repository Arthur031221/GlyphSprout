import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

async function openPages(page: Page, text: string) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill("Letter Hand");
  await page.getByLabel("Text to include").fill(text);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
}

async function pdfText(page: Page) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download all pages (PDF)" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("Letter Hand-template.pdf");
  return (await readFile(await file.path())).toString("latin1");
}

test.describe("template PDF", () => {
  test.use({ locale: "en-GB" });
  test("one PDF holds every page at the chosen paper size", async ({
    page,
  }) => {
    // 36 letters need two pages of 35 cells.
    await openPages(page, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ");
    const a4 = await pdfText(page);
    expect(a4.startsWith("%PDF-1.4")).toBe(true);
    expect(a4).toContain("/Count 2");
    expect(a4).toContain("/MediaBox [0 0 595.28 841.89]");
    expect(a4.match(/\/Filter \/DCTDecode/g)).toHaveLength(2);
    // Each page is a 300 dpi picture of the sheet.
    expect(a4).toContain("/Width 2480 /Height 3508");

    await page.getByLabel("Paper size").selectOption("letter");
    const letter = await pdfText(page);
    expect(letter).toContain("/MediaBox [0 0 612 792]");
  });

  test("the button is translated", async ({ page }) => {
    await openPages(page, "Hello");
    await page.getByLabel("Language").selectOption("de");
    await expect(
      page.getByRole("button", { name: "Alle Seiten herunterladen (PDF)" }),
    ).toBeVisible();
  });
});
