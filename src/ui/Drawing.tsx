import {
  ArrowCounterClockwise,
  Eraser,
  Pen,
  Trash,
} from "@phosphor-icons/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { BASELINE } from "../core/types";
import { decodeCell } from "./browser";
import type { Dictionary } from "./i18n";

export function Drawing({
  t,
  character,
  source,
  onUse,
  onCancel,
  onDirtyChange,
}: {
  t: Dictionary;
  character: string;
  source?: string;
  onUse: (source: string, pixels: ImageData, changed: boolean) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const area = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const point = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const originalPixels = useRef<ImageData | null>(null);
  const [eraser, setEraser] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [pixels, setPixels] = useState<ImageData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    area.current?.focus();
  }, []);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    let active = true;
    if (source) {
      void decodeCell(source).then(
        (imageData) => {
          if (!active) return;
          originalPixels.current = imageData;
          setPixels(imageData);
        },
        () => {
          if (active) setError(true);
        },
      );
    } else {
      const blank = new ImageData(384, 384);
      for (let i = 0; i < blank.data.length; i += 4) {
        blank.data[i] = 255;
        blank.data[i + 1] = 255;
        blank.data[i + 2] = 255;
        blank.data[i + 3] = 255;
      }
      originalPixels.current = blank;
      setPixels(blank);
    }
    return () => {
      active = false;
    };
  }, [source]);

  useEffect(() => {
    if (!pixels || !canvas.current) return;
    const ctx = canvas.current.getContext("2d");
    if (ctx) ctx.putImageData(pixels, 0, 0);
  }, [pixels]);

  const ready = pixels !== null && !error;
  function reportChange() {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    const original = originalPixels.current;
    if (!element || !ctx || !original) return;
    const current = ctx.getImageData(0, 0, element.width, element.height);
    onDirtyChange(
      original.data.some((value, index) => value !== current.data[index]),
    );
  }
  function draw(event: PointerEvent<HTMLCanvasElement>, start = false) {
    const element = event.currentTarget;
    if (element.closest("fieldset:disabled")) return;
    const ctx = element.getContext("2d");
    if (!ready || !ctx) return;
    if (start ? pointer.current !== null : pointer.current !== event.pointerId)
      return;
    const bounds = element.getBoundingClientRect();
    const next = {
      x: ((event.clientX - bounds.left) * element.width) / bounds.width,
      y: ((event.clientY - bounds.top) * element.height) / bounds.height,
    };
    if (start) {
      pointer.current = event.pointerId;
      history.current = [
        ...history.current.slice(-19),
        ctx.getImageData(0, 0, element.width, element.height),
      ];
      element.setPointerCapture(event.pointerId);
    }
    const previous = point.current ?? next;
    const pressure =
      event.pointerType === "pen" ? Math.max(0.15, event.pressure) : 0.55;
    const pixelScale = element.width / bounds.width;
    const width = (eraser ? 28 : 3 + pressure * 10) * pixelScale;
    ctx.strokeStyle = eraser ? "white" : "black";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    if (start) {
      ctx.beginPath();
      ctx.arc(next.x, next.y, width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    point.current = next;
    onDirtyChange(true);
    setStrokes(history.current.length);
  }
  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    point.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    reportChange();
  }
  function clear() {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!ready || !element || !ctx) return;
    history.current = [
      ...history.current.slice(-19),
      ctx.getImageData(0, 0, element.width, element.height),
    ];
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, element.width, element.height);
    setStrokes(history.current.length);
    reportChange();
  }
  return (
    <section
      ref={area}
      className="drawing-area"
      aria-label={`${source ? t.editSource : t.draw} ${character}`}
      tabIndex={-1}
    >
      <p>{source ? t.sourceEditHelp : t.drawHelp}</p>
      {!ready && (
        <p role="status">{error ? t.decodeFailed : t.sourceLoading}</p>
      )}
      <div className="draw-tools">
        <button
          type="button"
          disabled={!ready}
          aria-pressed={!eraser}
          onClick={() => setEraser(false)}
        >
          <Pen />
          {t.pen}
        </button>
        <button
          type="button"
          disabled={!ready}
          aria-pressed={eraser}
          onClick={() => setEraser(true)}
        >
          <Eraser />
          {t.eraser}
        </button>
        <button
          type="button"
          disabled={!ready || !strokes}
          onClick={() => {
            const previous = history.current.pop();
            const ctx = canvas.current?.getContext("2d");
            if (previous && ctx) ctx.putImageData(previous, 0, 0);
            setStrokes(history.current.length);
            reportChange();
          }}
        >
          <ArrowCounterClockwise />
          {t.undo}
        </button>
        <button type="button" disabled={!ready} onClick={clear}>
          <Trash />
          {t.clearDrawing}
        </button>
      </div>
      <div className="draw-canvas">
        <canvas
          ref={canvas}
          width={pixels?.width ?? 384}
          height={pixels?.height ?? 384}
          aria-label={`${source ? t.editSource : t.draw} ${character}`}
          onPointerDown={(e) => {
            if (!ready) return;
            e.preventDefault();
            draw(e, true);
          }}
          onPointerMove={draw}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
        />
        <div className="draw-baseline" style={{ top: `${BASELINE * 100}%` }} />
      </div>
      <div className="actions">
        <button
          className="primary"
          type="button"
          disabled={!ready}
          onClick={() => {
            const element = canvas.current;
            const ctx = element?.getContext("2d");
            if (!ready || !element || !ctx) return;
            const result = ctx.getImageData(
              0,
              0,
              element.width,
              element.height,
            );
            const original = originalPixels.current;
            const changed =
              !original ||
              original.width !== result.width ||
              original.height !== result.height ||
              original.data.some(
                (value, index) => value !== result.data[index],
              );
            onUse(element.toDataURL("image/png"), result, changed);
          }}
        >
          {source ? t.applySourceEdits : t.useDrawing}
        </button>
        <button type="button" onClick={onCancel}>
          {source ? t.cancelSourceEdit : t.cancelDrawing}
        </button>
      </div>
    </section>
  );
}
