import { expect, type Page, test } from "@playwright/test";

async function openPages(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Font name").fill("Letter Hand");
  await page.getByLabel("Text to include").fill("Hello");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await expect(
    page.getByRole("heading", { name: "Print pages" }),
  ).toBeVisible();
}

test.describe("paper size", () => {
  test.use({ locale: "en-GB" });
  test("paper size defaults to A4 and switches the template and print size to US Letter", async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => {
      window.print = () => {};
    });
    await openPages(page);
    const paper = page.getByLabel("Paper size");
    await expect(paper).toHaveValue("a4");

    const download = async () => {
      const [file] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Download blank template" }).click(),
      ]);
      const path = await file.path();
      const { readFile } = await import("node:fs/promises");
      return readFile(path, "utf8");
    };
    const a4 = await download();
    expect(a4).toContain('width="210mm" height="297mm"');
    expect(a4).toContain("/ A4 /");

    await paper.selectOption("letter");
    const letter = await download();
    expect(letter).toContain('width="215.9mm" height="279.4mm"');
    expect(letter).toContain("/ US Letter /");
    // The four registration crosses still sit inside the drawn area.
    const box = letter
      .match(/viewBox="([-\d. ]+)"/)?.[1]
      .split(" ")
      .map(Number);
    expect(box?.[0]).toBeLessThan(0);
    expect(box?.[3]).toBe(1414);

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: "Print all pages" }).click(),
    ]);
    await expect(popup.locator("body img")).toHaveCount(1);
    const css = await popup.locator("style").textContent();
    expect(css).toContain("@page{size:215.9mm 279.4mm;margin:0}");
    expect(css).toContain("width:215.9mm;height:279.4mm");

    await page.reload();
    await page.getByRole("button", { name: "Pages" }).click();
    await expect(page.getByLabel("Paper size")).toHaveValue("letter");
  });
});

test("a United States browser language starts on US Letter", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  await openPages(page);
  await expect(page.getByLabel("Paper size")).toHaveValue("letter");
  await context.close();
});
