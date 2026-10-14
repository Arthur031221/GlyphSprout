import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function openWithApostrophe(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const sample = await page.evaluate(async () => {
    const project = await (
      await fetch("/samples/paper-sample.glyphsprout.json")
    ).json();
    project.characters.push("'");
    project.text += "'";
    project.glyphs["'"] = { ...project.glyphs.L, character: "'" };
    return JSON.stringify(project);
  });
  const data = await page.evaluateHandle((text) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([text], "quotes.glyphsprout.json", { type: "application/json" }),
    );
    return transfer;
  }, sample);
  await page.locator("main").dispatchEvent("dragover", { dataTransfer: data });
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("main").dispatchEvent("drop", { dataTransfer: data });
  await expect(page.getByText("7 / 7 characters")).toBeVisible();
}

test("curly quotes type with the straight apostrophe glyph", async ({
  page,
}) => {
  await openWithApostrophe(page);
  const letters = page.locator(".hero-copy span.missing-preview");
  const specimen = page.getByLabel("Type a specimen");
  await specimen.fill("\u2019 \u201c");
  // The apostrophe glyph covers the curly apostrophe but not the double quote.
  await expect(letters).toHaveCount(1);
  await expect(page.locator(".specimen-missing")).toContainText("\u201c");
  await specimen.fill("\u2018H\u2019");
  await expect(letters).toHaveCount(0);
  await expect(page.locator(".specimen-missing")).toHaveCount(0);
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
});
