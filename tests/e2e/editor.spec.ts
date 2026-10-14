import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { expect, type Page, test } from "@playwright/test";
import { createFont } from "fonteditor-core";
import { fontGlyph } from "../../src/core/font";
import {
  MAX_PROJECT_BYTES,
  updateText,
  validateProject,
} from "../../src/core/project";
import type { Project } from "../../src/core/types";

test.use({ serviceWorkers: "block" });

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

// The bundled sample keeps pixel outlines; Reset settings returns to the default smoothing.
async function useDefaultSmoothing(page: Page) {
  const smoothing = page.getByLabel("Outline smoothing (0 to 3)");
  await smoothing.fill("2");
  await smoothing.press("Tab");
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

async function backup(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project" }).click();
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  return JSON.parse(await readFile(path, "utf8"));
}

async function holdDecode(page: Page) {
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      await new Promise<void>((resolve) => {
        (
          window as Window & { releaseGlyphDecode?: () => void }
        ).releaseGlyphDecode = resolve;
      });
    };
  });
}

async function releaseDecode(page: Page) {
  await page.evaluate(() => {
    const release = (window as Window & { releaseGlyphDecode?: () => void })
      .releaseGlyphDecode;
    if (!release) throw new Error("crop edit did not decode its source");
    release();
  });
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
}

for (const order of [
  [0, 1],
  [1, 0],
]) {
  test(`edits to separate glyphs survive decode completion order ${order.join(", ")}`, async ({
    page,
  }) => {
    await ready(page);
    const before = await backup(page);
    await page.evaluate(() => {
      const decode = HTMLImageElement.prototype.decode;
      const releases: (() => void)[] = [];
      (window as Window & { glyphDecodes?: (() => void)[] }).glyphDecodes =
        releases;
      HTMLImageElement.prototype.decode = async function () {
        await Promise.all([
          decode.call(this),
          new Promise<void>((resolve) => releases.push(resolve)),
        ]);
      };
    });
    for (const [index, threshold] of [150, 155].entries()) {
      await page.locator(".glyph-tile").nth(index).click();
      await page
        .getByLabel("Ink threshold", { exact: true })
        .fill(String(threshold));
      await page.locator(".glyph-tile").nth(index).focus();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { glyphDecodes?: (() => void)[] })
                .glyphDecodes?.length,
          ),
        )
        .toBe(index + 1);
    }
    const characters = ["H", "E"];
    for (const [position, index] of order.entries()) {
      await page.evaluate((which) => {
        const release = (window as Window & { glyphDecodes?: (() => void)[] })
          .glyphDecodes?.[which];
        if (!release) throw new Error("missing glyph decode");
        release();
      }, index);
      await page
        .locator(".glyph-tile")
        .nth(1 - index)
        .click();
      await page.locator(".glyph-tile").nth(index).click();
      await expect(
        page.getByLabel("Ink threshold", { exact: true }),
      ).toHaveValue(index === 0 ? "150" : "155");
      if (position === 0) {
        const waiting = characters[order[1]];
        await page.locator(".glyph-tile").nth(order[1]).click();
        await expect(
          page.getByLabel("Ink threshold", { exact: true }),
        ).toHaveValue(String(before.glyphs[waiting].settings.threshold));
      }
    }
    const after = await backup(page);
    expect(after.glyphs.H.settings.threshold).toBe(150);
    expect(after.glyphs.E.settings.threshold).toBe(155);
    await expect(
      page.getByText("Applying glyph changes...", { exact: true }),
    ).toBeHidden();
  });
}

for (const action of ["drawing", "clearing", "empty drawing"] as const) {
  test(`${action} cancels pending crops even after project undo`, async ({
    page,
  }) => {
    await ready(page);
    const before = await backup(page);
    await holdDecode(page);
    await page.getByLabel("Crop edges Right").fill("0.5");
    if (action === "clearing") {
      await page
        .getByRole("button", { name: "Clear glyph", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Draw a glyph", exact: true })
        .click();
      if (action === "drawing") {
        await expect(
          page.getByRole("button", { name: "Use drawing", exact: true }),
        ).toBeEnabled();
        await page.locator("canvas").scrollIntoViewIfNeeded();
        const box = await page.locator("canvas").boundingBox();
        if (!box) throw new Error("missing drawing canvas");
        await page.mouse.move(box.x + 70, box.y + 220);
        await page.mouse.down();
        await page.mouse.move(box.x + 220, box.y + 70, { steps: 50 });
        await page.mouse.up();
      }
      await page
        .getByRole("button", { name: "Use drawing", exact: true })
        .click();
      if (action === "empty drawing") {
        await expect(page.getByRole("alert")).toContainText(
          "This glyph has no ink.",
        );
        await page
          .getByRole("button", { name: "Cancel drawing", exact: true })
          .click();
      }
    }
    if (action !== "empty drawing")
      await page.getByRole("button", { name: "Undo", exact: true }).click();
    await releaseDecode(page);
    expect((await backup(page)).glyphs).toEqual(before.glyphs);
    await expect(page.getByLabel("Crop edges Right")).toHaveValue("1");
  });
}

for (const action of ["Undo", "Redo"] as const) {
  test(`${action} cancels crop work on a glyph untouched by history`, async ({
    page,
  }) => {
    await ready(page);
    await page.locator(".glyph-tile").nth(2).click();
    await page.getByLabel("Size", { exact: true }).fill("1.1");
    await page.getByLabel("Size", { exact: true }).press("Tab");
    if (action === "Redo")
      await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.locator(".glyph-tile").first().click();
    const before = await backup(page);
    await holdDecode(page);
    await page.getByLabel("Crop edges Right").fill("0.5");
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByLabel("Crop edges Right")).toHaveValue("1");
    await releaseDecode(page);
    const after = await backup(page);
    expect(after.glyphs.H).toEqual(before.glyphs.H);
    expect(after.glyphs.L.settings.scale).toBe(action === "Undo" ? 1 : 1.1);
    await page.getByLabel("Size", { exact: true }).fill("1.2");
    await page.getByLabel("Size", { exact: true }).press("Tab");
    const resized = await backup(page);
    expect(resized.glyphs.H.settings.scale).toBe(1.2);
    expect(resized.glyphs.H.settings.crop.right).toBe(1);
  });
}

test("changing review state preserves a pending crop in the settings form", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await holdDecode(page);
  await page.getByLabel("Crop edges Right").fill("0.5");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByLabel("Crop edges Right")).toHaveValue("0.5");
  await releaseDecode(page);
  const reviewed = await backup(page);
  expect(reviewed.glyphs.H.settings.crop.right).toBe(0.5);
  expect(reviewed.glyphs.H.contours).not.toEqual(before.glyphs.H.contours);
  expect(reviewed.glyphs.H.reviewed).toBe(true);
  await page.getByLabel("Size", { exact: true }).fill("1.2");
  await page.getByLabel("Size", { exact: true }).press("Tab");
  const after = await backup(page);
  expect(after.glyphs.H.contours).toEqual(reviewed.glyphs.H.contours);
  expect(after.glyphs.H.settings.crop.right).toBe(0.5);
  expect(after.glyphs.H.settings.scale).toBe(1.2);
  expect(after.glyphs.H.reviewed).toBe(false);
});

test("project backup waits for the crop started by its own click", async ({
  page,
}) => {
  await ready(page);
  await holdDecode(page);
  await page.getByLabel("Crop edges Right", { exact: true }).fill("0.8");
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download project", exact: true })
    .click();
  try {
    await expect(
      page.getByRole("button", { name: "New project", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Download project", exact: true }),
    ).toBeDisabled();
  } finally {
    await releaseDecode(page);
  }
  const path = await (await event).path();
  if (!path) throw new Error("missing project download");
  const downloaded: Project = JSON.parse(await readFile(path, "utf8"));
  expect(downloaded.glyphs.H.settings.crop.right).toBe(0.8);
  expect(downloaded.glyphs.H.reviewed).toBe(false);
  await expect(
    page.getByRole("button", { name: "New project", exact: true }),
  ).toBeEnabled();
});

test("restoring a multilingual project previews its included text", async ({
  page,
}) => {
  await ready(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Try Han and kana strokes", exact: true })
    .click();
  await expect(page.locator(".project-label strong")).toHaveText(
    "Sprout Script",
  );
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const before = await page.locator(".hero-tools textarea").inputValue();
  await page.reload();
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hero-tools textarea")).toHaveValue(before);
  await expect(page.locator(".missing-preview")).toHaveCount(0);
});

test("applying a new character list updates the specimen and retains matching glyphs", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill("BE HELLO");
  await page
    .getByRole("button", { name: "Project ready", exact: true })
    .click();
  await expect(page.locator(".hero-tools textarea")).toHaveValue("BE HELLO");
  const after = await backup(page);
  expect(after.characters).toEqual(["B", "E", "H", "L", "O"]);
  for (const character of after.characters)
    expect(after.glyphs[character]).toEqual(before.glyphs[character]);
});

for (const fails of [false, true]) {
  test(`a ${fails ? "failed" : "completed"} crop request preserves settings typed after it started`, async ({
    page,
  }) => {
    await ready(page);
    await page.evaluate((fails) => {
      const decode = HTMLImageElement.prototype.decode;
      let first = true;
      HTMLImageElement.prototype.decode = async function () {
        if (!first) return decode.call(this);
        first = false;
        await decode.call(this);
        await new Promise<void>((resolve) => {
          (
            window as Window & { releaseGlyphDecode?: () => void }
          ).releaseGlyphDecode = resolve;
        });
        if (fails) throw new Error("imageDecode");
      };
    }, fails);
    await page.getByLabel("Crop edges Right").fill("0.5");
    await page.locator(".glyph-tile").first().focus();
    await page.getByLabel("Size", { exact: true }).fill("1.2");
    await releaseDecode(page);
    if (fails) await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Size", { exact: true })).toHaveValue("1.2");
    await page.locator(".glyph-tile").first().focus();
    await expect(
      page.getByText("Applying glyph changes...", { exact: true }),
    ).toBeHidden();
    const after = await backup(page);
    expect(after.glyphs.H.settings.scale).toBe(1.2);
    expect(after.glyphs.H.settings.crop.right).toBe(0.5);
  });
}

test("unchanged settings preserve reviewed glyphs and project history", async ({
  page,
}) => {
  await ready(page);
  await useDefaultSmoothing(page);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  await page.reload();
  await ready(page);
  const before = await backup(page);
  const inputs = page.locator(".settings-grid input");
  for (const input of await inputs.all()) {
    await input.focus();
    await input.press("Tab");
  }
  await page.getByRole("button", { name: "Reset settings" }).click();
  expect(await backup(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Mark reviewed" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("successful scan replacement releases export before an older crop finishes decoding", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    let first = true;
    HTMLImageElement.prototype.decode = async function () {
      if (!first) return decode.call(this);
      first = false;
      await decode.call(this);
      await new Promise<void>((resolve) => {
        (
          window as Window & { releaseGlyphDecode?: () => void }
        ).releaseGlyphDecode = resolve;
      });
    };
  });
  await page.getByLabel("Crop edges Right").fill("0.5");
  await page.locator(".glyph-tile").first().focus();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { releaseGlyphDecode?: () => void })
            .releaseGlyphDecode,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Pages" }).click();
  await page
    .locator('input[accept="image/png,image/jpeg"]')
    .setInputFiles("tests/e2e/fixtures/paper.png");
  await page.getByRole("button", { name: /Page 1: paper.png/ }).waitFor();
  await page
    .getByLabel(
      "I confirmed the visible page ID, page assignment and interior alignment",
    )
    .check();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Convert scans" }).click();
  await expect(
    page.getByText("Scans converted. Check each glyph before exporting.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.getByLabel("Export completed subset").check();
  const before = await backup(page);
  const event = page.waitForEvent("download", { timeout: 5000 });
  try {
    await page
      .getByRole("button", { name: "Download TTF", exact: true })
      .click();
    const path = await (await event).path();
    if (!path) throw new Error("missing font download");
    const bytes = await readFile(path);
    const font = createFont(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      { type: "ttf" },
    ).get();
    const exported = font.glyf.find((glyph) => glyph.unicode?.includes(72));
    expect(exported?.contours).toEqual(fontGlyph(before.glyphs.H).contours);
  } finally {
    await releaseDecode(page);
  }
  expect((await backup(page)).glyphs).toEqual(before.glyphs);
});

test("a scan rejected by the project size limit preserves a pending crop", async ({
  page,
}) => {
  test.setTimeout(90000);
  const sample: Project = JSON.parse(
    await readFile("public/samples/paper-sample.glyphsprout.json", "utf8"),
  );
  const project = updateText(
    sample,
    "HELLOJOBabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  );
  const retained = project.characters.slice(35, 40);
  for (const character of retained)
    project.glyphs[character] = { ...sample.glyphs.H, character };
  // Retained PNG sources leave room for the crop but not a converted page.
  const baseline = Buffer.byteLength(JSON.stringify(project));
  const padding = Math.floor((MAX_PROJECT_BYTES - 16384 - baseline) / 20) * 3;
  const sampleSource = sample.glyphs.H.source;
  if (!sampleSource) throw new Error("sample glyph has no source");
  const png = Buffer.from(sampleSource.split(",")[1], "base64");
  const source = `data:image/png;base64,${Buffer.concat([
    png,
    Buffer.alloc(padding),
  ]).toString("base64")}`;
  for (const character of retained) project.glyphs[character].source = source;
  validateProject(project);
  const body = JSON.stringify(project);
  expect(Buffer.byteLength(body)).toBeLessThan(MAX_PROJECT_BYTES);
  expect(Buffer.byteLength(body)).toBeGreaterThan(MAX_PROJECT_BYTES - 20000);
  const server = createServer((_request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Content-Type", "application/json");
    response.end(body);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("fixture server has no port");
  await page.route("**/samples/paper-sample.glyphsprout.json", (route) =>
    route.continue({ url: `http://127.0.0.1:${address.port}/sample.json` }),
  );
  try {
    await ready(page);
    await page.evaluate(() => {
      const decode = HTMLImageElement.prototype.decode;
      let first = true;
      HTMLImageElement.prototype.decode = async function () {
        if (!first) return decode.call(this);
        first = false;
        await decode.call(this);
        await new Promise<void>((resolve) => {
          (
            window as Window & { releaseGlyphDecode?: () => void }
          ).releaseGlyphDecode = resolve;
        });
      };
    });
    await page.getByLabel("Crop edges Right").fill("0.5");
    await page.locator(".glyph-tile").first().focus();
    await expect(
      page.getByText("Applying glyph changes...", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pages" }).click();
    await page
      .locator('input[accept="image/png,image/jpeg"]')
      .setInputFiles("tests/e2e/fixtures/paper.png");
    await page.getByRole("button", { name: /Page 1: paper.png/ }).waitFor();
    await page
      .getByLabel(
        "I confirmed the visible page ID, page assignment and interior alignment",
      )
      .check();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Convert scans" }).click();
    await expect(
      page.getByText(
        "Scan conversion failed. Your current glyphs are unchanged.",
        {
          exact: true,
        },
      ),
    ).toBeVisible({ timeout: 30000 });
    try {
      await expect(
        page.getByText("Applying glyph changes...", { exact: true }),
      ).toBeVisible();
    } finally {
      await releaseDecode(page);
    }
    await page.getByRole("button", { name: "Workshop" }).click();
    await expect(page.getByLabel("Crop edges Right")).toHaveValue("0.5");
    await expect(
      page.getByRole("button", { name: "Mark reviewed" }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.getByLabel("Export completed subset").check();
    const event = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download TTF", exact: true })
      .click();
    const path = await (await event).path();
    if (!path) throw new Error("missing font download");
    const bytes = await readFile(path);
    const font = createFont(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      { type: "ttf" },
    ).get();
    const exported = font.glyf.find((glyph) => glyph.unicode?.includes(72));
    expect(exported?.contours.length).toBeGreaterThan(0);
    expect(exported?.contours).not.toEqual(fontGlyph(sample.glyphs.H).contours);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("changing characters releases export before a removed glyph finishes decoding", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await holdDecode(page);
  await page.getByLabel("Crop edges Right").fill("0.5");
  await page.locator(".glyph-tile").first().focus();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { releaseGlyphDecode?: () => void })
            .releaseGlyphDecode,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Text to include").fill("E");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Project ready", exact: true })
    .click();
  await page.getByRole("button", { name: "Workshop" }).click();
  const event = page.waitForEvent("download", { timeout: 5000 });
  try {
    await page
      .getByRole("button", { name: "Download TTF", exact: true })
      .click();
    const path = await (await event).path();
    if (!path) throw new Error("missing font download");
    const bytes = await readFile(path);
    const font = createFont(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      { type: "ttf" },
    ).get();
    const exported = font.glyf.find((glyph) => glyph.unicode?.includes(69));
    expect(exported?.contours).toEqual(fontGlyph(before.glyphs.E).contours);
    expect(font.glyf.some((glyph) => glyph.unicode?.includes(72))).toBe(false);
  } finally {
    await releaseDecode(page);
  }
  const after = await backup(page);
  expect(after.characters).toEqual(["E"]);
  expect(after.glyphs.H).toBeUndefined();
  expect(after.glyphs.E.contours).toEqual(before.glyphs.E.contours);
});

test("export after Reset does not wait for canceled image decoding", async ({
  page,
}) => {
  await ready(page);
  await useDefaultSmoothing(page);
  const before = await backup(page);
  await holdDecode(page);
  await page.getByLabel("Crop edges Right").fill("0.5");
  await page.locator(".glyph-tile").first().focus();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { releaseGlyphDecode?: () => void })
            .releaseGlyphDecode,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Reset settings" }).click();
  const event = page.waitForEvent("download", { timeout: 5000 });
  try {
    await page
      .getByRole("button", { name: "Download TTF", exact: true })
      .click();
    const path = await (await event).path();
    if (!path) throw new Error("missing font download");
    const bytes = await readFile(path);
    const font = createFont(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      { type: "ttf" },
    ).get();
    const exported = font.glyf.find((glyph) => glyph.unicode?.includes(72));
    expect(exported?.contours).toEqual(fontGlyph(before.glyphs.H).contours);
  } finally {
    await releaseDecode(page);
  }
  expect((await backup(page)).glyphs).toEqual(before.glyphs);
});

test("export waits for the last crop edit and uses its completed outlines", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    let first = true;
    HTMLImageElement.prototype.decode = async function () {
      if (!first) return decode.call(this);
      first = false;
      await Promise.all([
        decode.call(this),
        new Promise<void>((resolve) => {
          (
            window as Window & { releaseGlyphDecode?: () => void }
          ).releaseGlyphDecode = resolve;
        }),
      ]);
    };
  });
  await page.getByLabel("Crop edges Right").fill("0.5");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF", exact: true }).click();
  await expect(page.getByLabel("Size", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "New project" }),
  ).toBeDisabled();
  await page.evaluate(() => {
    const release = (window as Window & { releaseGlyphDecode?: () => void })
      .releaseGlyphDecode;
    if (!release) throw new Error("crop edit did not decode its source");
    release();
  });
  const path = await (await event).path();
  if (!path) throw new Error("missing font download");
  await expect(
    page.getByText("Font preview ready", { exact: true }),
  ).toBeVisible();
  const after = await backup(page);
  await expect(page.getByLabel("Size", { exact: true })).toBeEnabled();
  expect(after.glyphs.H.contours).not.toEqual(before.glyphs.H.contours);
  const bytes = await readFile(path);
  const font = createFont(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    { type: "ttf" },
  ).get();
  const exported = font.glyf.find((glyph) => glyph.unicode?.includes(72));
  expect(exported?.contours).toEqual(fontGlyph(after.glyphs.H).contours);
});

test("WOFF2 export keeps the project stable while its encoder loads", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("Size", { exact: true }).fill("1.1");
  await page.getByLabel("Size", { exact: true }).press("Tab");
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
  let release: () => void = () => {};
  let requested: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/woff2.wasm", async (route) => {
    requested();
    await held;
    await route.continue();
  });
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download WOFF2", exact: true })
    .click();
  await started;
  try {
    await expect(page.getByLabel("Size", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "New project" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  expect((await event).suggestedFilename()).toMatch(/\.woff2$/);
  await expect(page.getByLabel("Size", { exact: true })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
});

test("a size that collapses a drawn outline retains its valid settings and export", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Draw a glyph", exact: true }).click();
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("missing drawing canvas");
  await page.mouse.move(box.x + 50, box.y + 230);
  await page.mouse.down();
  await page.mouse.move(box.x + 230, box.y + 50, { steps: 100 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Use drawing" }).click();
  const smoothing = page.getByLabel("Outline smoothing (0 to 3)");
  await smoothing.fill("0");
  await smoothing.press("Tab");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  const before = await backup(page);
  const size = page.getByLabel("Size", { exact: true });
  await size.fill("0.38");
  await size.press("Tab");
  await expect(page.getByRole("alert")).toContainText(
    "This outline collapses at this size",
  );
  await expect(size).toHaveValue("1");
  expect((await backup(page)).glyphs).toEqual(before.glyphs);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TTF", exact: true }).click();
  expect((await event).suggestedFilename()).toMatch(/\.ttf$/);
});

test("reset cancels a pending crop without changing the saved glyph", async ({
  page,
}) => {
  await ready(page);
  await useDefaultSmoothing(page);
  const before = await backup(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      await new Promise<void>((resolve) => {
        (
          window as Window & { releaseGlyphDecode?: () => void }
        ).releaseGlyphDecode = resolve;
      });
    };
  });
  await page.getByLabel("Crop edges Right").fill("0.5");
  await page.getByRole("button", { name: "Reset settings" }).click();
  await expect(page.getByLabel("Crop edges Right")).toHaveValue("1");
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
  await page.evaluate(() => {
    const release = (window as Window & { releaseGlyphDecode?: () => void })
      .releaseGlyphDecode;
    if (!release) throw new Error("crop edit did not decode its source");
    release();
  });
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
  expect(await backup(page)).toEqual(before);
});

test("invalid settings cancel a pending crop without overwriting the glyph", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      await new Promise<void>((resolve) => {
        (
          window as Window & { releaseGlyphDecode?: () => void }
        ).releaseGlyphDecode = resolve;
      });
    };
  });
  await page.getByLabel("Crop edges Right").fill("0.5");
  await page.getByLabel("Size", { exact: true }).fill("0");
  await page.getByLabel("Size", { exact: true }).press("Tab");
  await expect(page.getByRole("alert")).toContainText(
    /Keep settings within their shown ranges|This project is invalid/,
  );
  await expect(page.getByLabel("Size", { exact: true })).toHaveValue("1");
  await page.evaluate(() => {
    const release = (window as Window & { releaseGlyphDecode?: () => void })
      .releaseGlyphDecode;
    if (!release) throw new Error("crop edit did not decode its source");
    release();
  });
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeHidden();
  expect(await backup(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
});

test("an untouched drawing cannot erase an existing glyph", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  await page.getByRole("button", { name: "Draw a glyph", exact: true }).click();
  await page.getByRole("button", { name: "Use drawing" }).click();
  await expect(page.getByRole("alert")).toContainText("This glyph has no ink");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Cancel drawing" }).click();
  expect(await backup(page)).toEqual(before);
});

test("a failed pending crop edit stops export and preserves the glyph", async ({
  page,
}) => {
  await ready(page);
  const before = await backup(page);
  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await page.evaluate(() => {
    HTMLImageElement.prototype.decode = () =>
      new Promise<void>((_resolve, reject) => {
        (window as Window & { failGlyphDecode?: () => void }).failGlyphDecode =
          () => reject(new Error("decodeFailed"));
      });
  });
  await page.getByLabel("Crop edges Right").fill("0.5");
  const button = page.getByRole("button", {
    name: "Download TTF",
    exact: true,
  });
  await button.click();
  await page.evaluate(() => {
    const fail = (window as Window & { failGlyphDecode?: () => void })
      .failGlyphDecode;
    if (!fail) throw new Error("crop edit did not decode its source");
    fail();
  });
  await expect(page.getByRole("alert")).toContainText("could not be decoded");
  await expect(button).toBeEnabled();
  expect(downloads).toEqual([]);
  expect((await backup(page)).glyphs).toEqual(before.glyphs);
});
