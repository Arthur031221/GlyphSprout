import { useEffect, useRef, useState } from "react";
import type { Point } from "../core/types";
import { createPreviewWorker } from "../worker/client";
import type { PreviewResponse } from "../worker/preview.worker";
import { type Dictionary, errorKey, type MessageKey } from "./i18n";
import type { DraftPage } from "./useScans";

export function RectifiedPreview({
  page,
  t,
}: {
  page: DraftPage;
  t: Dictionary;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latestCorners = useRef<Point[]>(page.corners);
  latestCorners.current = page.corners;
  const request = useRef<((corners: Point[]) => void) | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let canceled = false;
    let loaded = false;
    let failed = false;
    let inFlight: Point[] | null = null;
    let worker: Worker;
    setError(null);
    setBusy(true);
    function fail(message: string) {
      setError(errorKey(new Error(message), "decodeFailed"));
      setBusy(false);
    }
    try {
      worker = createPreviewWorker();
    } catch {
      fail("decodeFailed");
      return;
    }
    function sendLatest() {
      if (canceled || failed || !loaded || inFlight) return;
      inFlight = latestCorners.current;
      worker.postMessage({ type: "preview", corners: inFlight });
    }
    const update = (corners: Point[]) => {
      latestCorners.current = corners;
      if (failed) return;
      setError(null);
      setBusy(true);
      sendLatest();
    };
    request.current = update;
    worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
      if (canceled) return;
      if (event.data.type === "ready") {
        loaded = true;
        sendLatest();
        return;
      }
      if (!loaded) {
        failed = true;
        fail("decodeFailed");
        return;
      }
      const current = inFlight === latestCorners.current;
      inFlight = null;
      if (!current) {
        sendLatest();
        return;
      }
      if (event.data.type === "error") {
        fail(event.data.message);
        return;
      }
      const context = canvas.current?.getContext("2d");
      if (!context) {
        fail("decodeFailed");
        return;
      }
      context.putImageData(new ImageData(event.data.pixels, 384, 384), 0, 0);
      setError(null);
      setBusy(false);
    };
    worker.onerror = () => {
      if (canceled) return;
      failed = true;
      worker.terminate();
      fail("decodeFailed");
    };
    worker.postMessage({
      type: "source",
      image: page.image,
      width: page.width,
      height: page.height,
    });
    return () => {
      canceled = true;
      worker.terminate();
      if (request.current === update) request.current = null;
    };
  }, [page.image, page.width, page.height]);

  useEffect(() => request.current?.(page.corners), [page.corners]);

  return (
    <figure className="rectified-preview" aria-busy={busy}>
      <figcaption>{t.correctedPreview}</figcaption>
      <canvas
        ref={canvas}
        width={384}
        height={384}
        role="img"
        aria-label={t.correctedPreview}
        hidden={error !== null}
      />
      <p className={error ? "bad" : "preview-state"} role="status">
        {error ? t[error] : busy ? t.previewUpdating : ""}
      </p>
    </figure>
  );
}
