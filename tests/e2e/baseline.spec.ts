import { expect, test } from "@playwright/test";

test("the outline baseline renders visible pixels at desktop and mobile sizes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".outline-wrap svg")).toBeVisible();
  for (const width of [1365, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const offset of [0, -500, 500]) {
      const field = page.getByRole("spinbutton", { name: "Vertical offset" });
      await field.fill(String(offset));
      await field.blur();
      await expect(page.locator(".preview-diagnostics")).toHaveText(
        "Font preview ready",
      );
      const visiblePixels = await page
        .locator(".outline-wrap svg")
        .evaluate(async (element) => {
          const original = element as SVGSVGElement;
          const svg = original.cloneNode(true) as SVGSVGElement;
          for (const tag of ["line", "path"]) {
            const node = original.querySelector(tag);
            const clone = svg.querySelector(tag);
            if (!node || !clone) throw new Error("Missing outline geometry");
            const css = getComputedStyle(node);
            for (const property of [
              "stroke",
              "stroke-width",
              "stroke-dasharray",
              "fill",
              "fill-rule",
              "vector-effect",
            ])
              (clone as SVGElement).style.setProperty(
                property,
                css.getPropertyValue(property),
              );
          }
          // Isolate the guide so the glyph cannot obscure the baseline.
          (svg.querySelector("path") as SVGElement).style.display = "none";
          const bounds = original.getBoundingClientRect();
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.setAttribute("width", String(bounds.width));
          svg.setAttribute("height", String(bounds.height));
          const url = URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(svg)], {
              type: "image/svg+xml",
            }),
          );
          try {
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(bounds.width);
            canvas.height = Math.ceil(bounds.height);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Missing raster context");
            context.fillStyle = "white";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            ).data;
            let count = 0;
            for (let i = 0; i < pixels.length; i += 4)
              if (pixels[i] < 245 && pixels[i + 2] - pixels[i] > 5) count++;
            return count;
          } finally {
            URL.revokeObjectURL(url);
          }
        });
      expect(visiblePixels).toBeGreaterThan(10);
    }
  }
});
