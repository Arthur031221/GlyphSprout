import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

type Probe = {
  sources: number;
  requests: { x: number; y: number }[][];
  reads: number;
  decodes: number;
  hold: boolean;
  held: (() => void)[];
  hashes: number[];
  terminated: number;
};

declare global {
  interface Window {
    previewProbe: Probe;
  }
}

async function stage(page: Page, large = false) {
  await page.goto("/");
  await page.getByRole("button", { name: "Pages" }).click();
  const upload = page.locator('input[accept="image/png,image/jpeg"]');
  if (large) {
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 2400;
      canvas.height = 3394;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Missing scan fixture context");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "black";
      for (let y = 100; y < canvas.height; y += 173)
        for (let x = 100; x < canvas.width; x += 151)
          context.fillRect(x, y, 32, 45);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await upload.setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  } else {
    await upload.setInputFiles("tests/e2e/fixtures/paper.png");
  }
  await expect
    .poll(() =>
      page.locator(".rectified-preview").evaluate((element) => {
        if (element.querySelector(".bad")) return true;
        const canvas = element.querySelector("canvas");
        return (
          (canvas?.getContext("2d")?.getImageData(0, 0, 1, 1).data[3] ?? 0) > 0
        );
      }),
    )
    .toBe(true);
}

test("corner updates reuse decoded pixels, coalesce pending work and render the latest reply", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const probe: Probe = {
      sources: 0,
      requests: [],
      reads: 0,
      decodes: 0,
      hold: false,
      held: [],
      hashes: [],
      terminated: 0,
    };
    window.previewProbe = probe;
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      if (this.naturalWidth > 512) probe.decodes++;
    };
    const read = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      if (this.canvas.width > 512) probe.reads++;
      return read.apply(this, args);
    };
    const OriginalWorker = Worker;
    window.Worker = class extends OriginalWorker {
      preview: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.preview = String(url).includes("preview.worker");
        if (!this.preview) return;
        this.addEventListener("message", (event) => {
          if (event.data.type !== "preview") return;
          if (probe.hold) {
            event.stopImmediatePropagation();
            probe.held.push(() =>
              this.dispatchEvent(
                new MessageEvent("message", { data: event.data }),
              ),
            );
          } else {
            let hash = 0;
            for (const value of event.data.pixels)
              hash = (hash * 31 + value) | 0;
            probe.hashes.push(hash);
          }
        });
      }
      postMessage(message: {
        type: string;
        corners: { x: number; y: number }[];
      }) {
        if (this.preview) {
          if (message.type === "source") probe.sources++;
          if (message.type === "preview") probe.requests.push(message.corners);
        }
        super.postMessage(message);
      }
      terminate() {
        if (this.preview) probe.terminated++;
        super.terminate();
      }
    };
  });
  await stage(page, true);
  const initial = await page.evaluate(() => {
    const probe = window.previewProbe;
    probe.reads = 0;
    probe.decodes = 0;
    probe.requests = [];
    probe.hold = true;
    return probe.hashes.at(-1);
  });
  const inputs = page.locator(".corner-input").first().locator("input");
  await inputs.nth(0).fill("70");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = window.previewProbe;
        return probe.requests.length + probe.reads;
      }),
    )
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.previewProbe.reads)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.previewProbe.held.length))
    .toBe(1);
  for (const [input, value] of [
    [0, "80"],
    [1, "130"],
    [0, "90"],
    [1, "150"],
  ] as const)
    await inputs.nth(input).fill(value);
  await expect(page.locator(".rectified-preview")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(
    await page.evaluate(() => {
      const probe = window.previewProbe;
      return {
        requests: probe.requests.length,
        sources: probe.sources,
        reads: probe.reads,
        decodes: probe.decodes,
      };
    }),
  ).toEqual({ requests: 1, sources: 1, reads: 0, decodes: 0 });
  await page.evaluate(() => {
    const probe = window.previewProbe;
    probe.hold = false;
    for (const release of probe.held.splice(0)) release();
  });
  await expect(page.locator(".rectified-preview")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const final = await page.evaluate(() => {
    const probe = window.previewProbe;
    const canvas = document.querySelector<HTMLCanvasElement>(
      ".rectified-preview canvas",
    );
    const pixels = canvas?.getContext("2d")?.getImageData(0, 0, 384, 384).data;
    if (!pixels) throw new Error("Missing corrected preview pixels");
    let hash = 0;
    for (const value of pixels) hash = (hash * 31 + value) | 0;
    return {
      hash,
      reply: probe.hashes.at(-1),
      requests: probe.requests.length,
      corner: probe.requests.at(-1)?.[0],
    };
  });
  expect(final.hash).toBe(final.reply);
  expect(final.hash).not.toBe(initial);
  expect(final.requests).toBe(2);
  expect(final.corner).toEqual({ x: 90, y: 150 });

  await inputs.nth(0).fill("5000");
  await expect(page.locator(".rectified-preview .bad")).toBeVisible();
  await inputs.nth(0).fill("90");
  await expect(page.locator(".rectified-preview")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".rectified-preview .bad")).toHaveCount(0);
  await page.getByRole("button", { name: "Remove scan: large.png" }).click();
  expect(await page.evaluate(() => window.previewProbe.terminated)).toBe(1);
});

test("a preview worker startup failure leaves corner controls usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = Worker;
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes("preview.worker"))
          throw new Error("Worker startup blocked");
        super(url, options);
      }
    };
  });
  await stage(page);
  await expect(page.locator(".rectified-preview .bad")).toBeVisible();
  const x = page.locator(".corner-input").first().locator("input").first();
  await x.fill("75");
  await expect(x).toHaveValue("75");
  await expect(page.locator(".rectified-preview")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".rectified-preview .bad")).toBeVisible();
});
