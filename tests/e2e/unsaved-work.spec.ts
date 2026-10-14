import { expect, type Page, test } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
}

async function setSize(page: Page, size: string) {
  const input = page.getByLabel("Size", { exact: true });
  await input.fill(size);
  await input.blur();
}

async function reloadShowsBeforeUnload(page: Page, acceptWarning = true) {
  const dialogEvent = page.waitForEvent("dialog").catch(() => null);
  const reload = page.reload().catch(() => {});
  const dialog = await Promise.race([dialogEvent, reload.then(() => null)]);
  if (!dialog) {
    await reload;
    return false;
  }
  const warned = dialog.type() === "beforeunload";
  if (acceptWarning) {
    await dialog.accept();
    await reload;
  } else {
    await dialog.dismiss();
  }
  return warned;
}

test("failed saves keep the edited project protected across reload", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const store = IDBObjectStore.prototype;
    store.put = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });

  await setSize(page, "1.2");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Local storage is unavailable. Download your project to keep a copy.",
  );
  expect(await reloadShowsBeforeUnload(page)).toBe(true);
  await expect(page.getByLabel("Size", { exact: true })).toHaveValue("1");
});

test("pending digest saves warn until the save completes", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const originalDigest = crypto.subtle.digest.bind(crypto.subtle);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    Object.assign(window, { releaseHeldDigest: release });
    crypto.subtle.digest = async (
      ...args: Parameters<SubtleCrypto["digest"]>
    ) => {
      await held;
      return originalDigest(...args);
    };
  });

  await setSize(page, "1.2");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saving...",
  );
  expect(await reloadShowsBeforeUnload(page, false)).toBe(true);
  await page.evaluate(() => {
    const release = (window as Window & { releaseHeldDigest?: () => void })
      .releaseHeldDigest;
    if (!release) throw new Error("Held save was not installed");
    release();
  });
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  expect(await reloadShowsBeforeUnload(page)).toBe(false);
  await expect(page.getByLabel("Size", { exact: true })).toHaveValue("1.2");
});

test("successful retry clears the failed-save unload warning", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const store = IDBObjectStore.prototype;
    const originalPut = store.put;
    store.put = function (...args: Parameters<IDBObjectStore["put"]>) {
      if ((window as Window & { failPuts?: boolean }).failPuts)
        throw new DOMException("Full", "QuotaExceededError");
      return originalPut.apply(this, args);
    };
    Object.assign(window, { originalPut, failPuts: true });
  });

  await setSize(page, "1.2");
  await expect(page.locator(".project-label [role=status]")).toContainText(
    "Local storage is unavailable",
  );
  expect(await reloadShowsBeforeUnload(page, false)).toBe(true);
  await page.evaluate(() => {
    (window as Window & { failPuts?: boolean }).failPuts = false;
  });
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  expect(await reloadShowsBeforeUnload(page)).toBe(false);
  await expect(page.getByLabel("Size", { exact: true })).toHaveValue("1.2");
});

test("completed saves do not warn on reload", async ({ page }) => {
  await ready(page);
  await setSize(page, "1.2");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  expect(await reloadShowsBeforeUnload(page)).toBe(false);
  await expect(page.getByLabel("Size", { exact: true })).toHaveValue("1.2");
});

test("existing setup drafts continue to warn on reload", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Font name").fill("Unsaved Face");
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Unapplied setup changes",
  );
  expect(await reloadShowsBeforeUnload(page)).toBe(true);
});

test("a pending glyph edit warns before it reaches project storage", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      await new Promise<void>(() => {});
    };
  });
  await page.getByLabel("Ink threshold", { exact: true }).fill("150");
  await page.getByLabel("Ink threshold", { exact: true }).blur();
  await expect(
    page.getByText("Applying glyph changes...", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-label [role=status]")).toHaveText(
    "Saved",
  );
  expect(await reloadShowsBeforeUnload(page)).toBe(true);
  await expect(page.getByLabel("Ink threshold", { exact: true })).toHaveValue(
    "165",
  );
});
