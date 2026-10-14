import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function transfer(page: Page, name: string, body: string) {
  return page.evaluateHandle(
    ([fileName, text]) => {
      const data = new DataTransfer();
      data.items.add(new File([text], fileName, { type: "application/json" }));
      return data;
    },
    [name, body] as const,
  );
}

test("dropping a project backup anywhere opens it after confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const sample = await page.evaluate(async () =>
    (await fetch("/samples/paper-sample.glyphsprout.json")).text(),
  );
  const renamed = sample.replace(/"name":\s*"Paper Bloom"/, '"name":"Dropped"');
  expect(renamed).not.toEqual(sample);
  const data = await transfer(page, "other.glyphsprout.json", renamed);
  await page.locator("main").dispatchEvent("dragover", { dataTransfer: data });
  await expect(page.locator(".project-drop")).toHaveText(
    "Drop to open this project backup",
  );
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.locator("main").dispatchEvent("drop", { dataTransfer: data });
  await expect(page.locator(".project-drop")).toHaveCount(0);
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");

  await page.locator("main").dispatchEvent("dragover", { dataTransfer: data });
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("main").dispatchEvent("drop", { dataTransfer: data });
  await expect(page.locator(".project-label strong")).toHaveText("Dropped");
});

test("dropping a broken backup keeps the current project and says so", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
  const data = await transfer(page, "broken.glyphsprout.json", "{");
  await page.locator("main").dispatchEvent("dragover", { dataTransfer: data });
  await page.locator("main").dispatchEvent("drop", { dataTransfer: data });
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your current project is unchanged" }),
  ).toBeVisible();
  await expect(page.locator(".project-label strong")).toHaveText("Paper Bloom");
});

test("the project drop message and the contour count are translated", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/^contours: \d+$/i).first()).toBeVisible();
  await page.getByLabel("Language").selectOption("zh-TW");
  const data = await transfer(page, "a.glyphsprout.json", "{}");
  await page.locator("main").dispatchEvent("dragover", { dataTransfer: data });
  await expect(page.locator(".project-drop")).toHaveText(
    "放開以開啟這個專案備份",
  );
});
