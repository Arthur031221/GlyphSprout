import { base64 } from "../core/bytes";
import { flattenLighting } from "../core/flatten";
import { homography, sampleCell } from "../core/geometry";
import { traceScannedCell } from "../core/scan";
import { cellRect, TEMPLATE } from "../core/template";
import { grayscale } from "../core/trace";

self.onmessage = async (event: MessageEvent) => {
  const { jobId, projectId, pages, characters, size } = event.data;
  try {
    const results = [];
    let done = 0;
    const total = pages.reduce(
      (count: number, page: { pageIndex: number }) =>
        count +
        characters.slice(page.pageIndex * 35, (page.pageIndex + 1) * 35).length,
      0,
    );
    for (const page of pages) {
      const blob = await (await fetch(page.image)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("decodeFailed");
      ctx.drawImage(bitmap, 0, 0);
      const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      bitmap.close();
      const map = homography(TEMPLATE.markers, page.corners);
      const pageGlyphs = [];
      for (let slot = 0; slot < 35; slot++) {
        const character = characters[page.pageIndex * 35 + slot];
        if (!character) break;
        const pixels = flattenLighting(
          sampleCell(
            rgba,
            canvas.width,
            canvas.height,
            map,
            cellRect(slot),
            size,
          ),
          size,
        );
        const cell = new OffscreenCanvas(size, size);
        const cctx = cell.getContext("2d", { willReadFrequently: true });
        if (!cctx) throw new Error("decodeFailed");
        cctx.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), size, size),
          0,
          0,
        );
        const result = traceScannedCell(
          character,
          grayscale(pixels),
          size,
          size,
        );
        const png = await cell.convertToBlob({ type: "image/png" });
        const source = `data:image/png;base64,${base64(new Uint8Array(await png.arrayBuffer()))}`;
        pageGlyphs.push({
          character,
          contours: result.contours,
          source,
          settings: result.settings,
          removedPixels: result.removedPixels,
          needsRepair: result.needsRepair,
          pageId: page.id,
        });
        self.postMessage({
          type: "progress",
          jobId,
          projectId,
          done: ++done,
          total,
        });
      }
      results.push({ pageId: page.id, pageGlyphs });
    }
    self.postMessage({ type: "done", jobId, projectId, results });
  } catch (error) {
    self.postMessage({
      type: "error",
      jobId,
      projectId,
      message: error instanceof Error ? error.message : "scanFailed",
    });
  }
};
