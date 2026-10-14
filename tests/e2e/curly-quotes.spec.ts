import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function openWithApostrophe(page: Page, extra = ["'"]) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const sample = await page.evaluate(async (added) => {
    const project = await (
      await fetch("/samples/paper-sample.glyphsprout.json")
    ).json();
    for (const ch of added) {
      project.characters.push(ch);
      project.text += ch;
      project.glyphs[ch] = { ...project.glyphs.L, character: ch };
    }
    return JSON.stringify(project);
  }, extra);
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
  await expect(
    page.getByText(`${6 + extra.length} / ${6 + extra.length} characters`),
  ).toBeVisible();
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

test("dashes, an ellipsis and non-breaking spaces type with plain glyphs", async ({
  page,
}) => {
  await openWithApostrophe(page, ["-", "."]);
  const letters = page.locator(".hero-copy span.missing-preview");
  const specimen = page.getByLabel("Type a specimen");
  await specimen.fill("H\u2013H\u2014\u2212\u2026 H\u00a0H");
  await expect(letters).toHaveCount(0);
  await expect(page.locator(".specimen-missing")).toHaveCount(0);
  await specimen.fill("H\u2019");
  await expect(letters).toHaveCount(1);
});
