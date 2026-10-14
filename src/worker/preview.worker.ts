import { homography, sampleCell, validateCorners } from "../core/geometry";
import { TEMPLATE } from "../core/template";
import type { Point } from "../core/types";

export type PreviewResponse =
  | { type: "ready" }
  | { type: "preview"; pixels: Uint8ClampedArray<ArrayBuffer> }
  | { type: "error"; message: string };

type PreviewRequest =
  | { type: "source"; image: string; width: number; height: number }
  | { type: "preview"; corners: Point[] };

let source: ImageData | null = null;

self.onmessage = async (event: MessageEvent<PreviewRequest>) => {
  try {
    const request = event.data;
    if (request.type === "source") {
      source = null;
      const blob = await (await fetch(request.image)).blob();
      const bitmap = await createImageBitmap(blob);
      try {
        if (bitmap.width !== request.width || bitmap.height !== request.height)
          throw new Error("decodeFailed");
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("decodeFailed");
        context.drawImage(bitmap, 0, 0);
        source = context.getImageData(0, 0, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
      self.postMessage({ type: "ready" } satisfies PreviewResponse);
      return;
    }
    if (!source) throw new Error("decodeFailed");
    validateCorners(request.corners, source.width, source.height);
    const map = homography(TEMPLATE.markers, request.corners);
    const pixels = new Uint8ClampedArray(
      sampleCell(
        source.data,
        source.width,
        source.height,
        map,
        { x: 0, y: 0, width: TEMPLATE.width, height: TEMPLATE.height },
        384,
      ),
    );
    self.postMessage({ type: "preview", pixels } satisfies PreviewResponse, {
      transfer: [pixels.buffer],
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "decodeFailed",
    } satisfies PreviewResponse);
  }
};
