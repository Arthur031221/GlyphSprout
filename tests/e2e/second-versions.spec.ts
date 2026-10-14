import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function stroke(page: Page, slant: number, reach = 150) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("missing drawing canvas");
  await page.mouse.move(box.x + 70, box.y + 220);
  await page.mouse.down();
  await page.mouse.move(box.x + 70 + reach, box.y + 70 + slant, { steps: 30 });
  await page.mouse.up();
}

async function download(page: Page, name: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name }).first().click();
  const path = await (await event).path();
  if (!path) throw new Error("missing download");
  return readFile(path);
}

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill("ab");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Project ready" }).click();
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.locator(".draw-launch").click();
  await stroke(page, 0);
  await page
    .getByRole("button", { name: "Use and draw next", exact: true })
    .click();
  await stroke(page, 30);
  await page.getByRole("button", { name: "Use drawing", exact: true }).click();
}

test("a second version is added, drawn, saved and typed in turn", async ({
  page,
}) => {
  await start(page);
  const heading = page.locator(".editor-heading h2");
  await page.getByRole("button", { name: /^a / }).click();
  await page
    .getByRole("button", { name: "Add a second version of this letter" })
    .click();
  await expect(heading).toHaveText("a₂");
  await expect(page.locator(".count-pill")).toHaveText("2 / 3");
  await expect(page.locator(".glyph-tile")).toHaveCount(3);

  // An empty second version doesn't hold back the font.
  await expect(
    page.getByRole("button", { name: "Download font (TTF)" }).last(),
  ).toBeEnabled();

  await page.locator(".draw-launch").click();
  await stroke(page, 80, 60);
  await page.getByRole("button", { name: "Use drawing", exact: true }).click();
  await expect(page.locator(".count-pill")).toHaveText("3 / 3");

  // The saved backup keeps the cell and its glyph.
  const saved = JSON.parse(
    (await download(page, "Download project")).toString("utf8"),
  ) as Project;
  expect(saved.characters).toEqual(["a", "b", "a₂"]);
  expect(Object.keys(saved.glyphs)).toContain("a₂");

  // The font alternates: a second "a" is wider than the first.
  const font = await download(page, "Download font (TTF)");
  const widths = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const face = new FontFace("Second", bytes.buffer);
    await face.load();
    document.fonts.add(face);
    const width = (text: string) => {
      const span = document.createElement("span");
      span.style.cssText =
        "font:1000px Second;white-space:pre;position:absolute;visibility:hidden";
      span.textContent = text;
      document.body.append(span);
      const measured = span.getBoundingClientRect().width;
      span.remove();
      return measured;
    };
    return { a: width("a"), aa: width("aa"), spaced: width("a a") };
  }, font.toString("base64"));
  expect(widths.aa).toBeLessThan(widths.a * 2 - 20);
  expect(widths.spaced).toBeCloseTo(widths.a * 2 + 350, 0);

  // Removing the last cell leaves the rest as it was.
  await page
    .getByRole("button", { name: "Remove this second version" })
    .click();
  await expect(page.locator(".glyph-tile")).toHaveCount(2);
  await expect(heading).toHaveText("a");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".glyph-tile")).toHaveCount(3);
});

test("one button adds a second version of every letter and the pages grow", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Add a second version of every letter (2)" })
    .click();
  await expect(page.locator(".glyph-tile")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: /Add a second version of every letter/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Pages" }).click();
  await expect(page.getByText("a₂ b₂").first()).toBeVisible();
});

test("the second version controls are translated", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("zh-TW");
  await page.getByRole("button", { name: "工坊" }).click();
  await expect(
    page.getByRole("button", { name: "為這個字母新增第二版本" }),
  ).toBeVisible();
});
