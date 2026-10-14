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
  const viewport = useRef<HTMLElement>(null);
  const pointer = useRef<number | null>(null);
  const panGesture = useRef(false);
  const point = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const originalPixels = useRef<ImageData | null>(null);
  const [eraser, setEraser] = useState(false);
  const [panning, setPanning] = useState(false);
  const [penSize, setPenSize] = useState(9);
  const [eraserSize, setEraserSize] = useState(28);
  const [zoom, setZoom] = useState(1);
  const [gestureActive, setGestureActive] = useState(false);
  const viewAnchor = useRef<{ x: number; y: number } | null>(null);
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
  function changeZoom(next: number) {
    const element = viewport.current;
    const image = canvas.current;
    if (!element || !image || pointer.current !== null) return;
    if (next === zoom) {
      if (next === 1) element.scrollLeft = element.scrollTop = 0;
      return;
    }
    const frame = element.getBoundingClientRect();
    const bounds = image.getBoundingClientRect();
    viewAnchor.current =
      next === 1
        ? { x: 0, y: 0 }
        : {
            x:
              (frame.left +
                element.clientLeft +
                element.clientWidth / 2 -
                bounds.left) /
              bounds.width,
            y:
              (frame.top +
                element.clientTop +
                element.clientHeight / 2 -
                bounds.top) /
              bounds.height,
          };
    setZoom(next);
  }
  useEffect(() => {
    const element = viewport.current;
    const anchor = viewAnchor.current;
    const image = canvas.current;
    if (!element || !anchor || !image) return;
    const frame = element.getBoundingClientRect();
    const bounds = image.getBoundingClientRect();
    element.scrollLeft =
      zoom === 1
        ? 0
        : element.scrollLeft +
          bounds.left +
          anchor.x * bounds.width -
          frame.left -
          element.clientLeft -
          element.clientWidth / 2;
    element.scrollTop =
      zoom === 1
        ? 0
        : element.scrollTop +
          bounds.top +
          anchor.y * bounds.height -
          frame.top -
          element.clientTop -
          element.clientHeight / 2;
    viewAnchor.current = null;
  }, [zoom]);
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
    if (start) {
      if (event.button !== 0) return;
      pointer.current = event.pointerId;
      setGestureActive(true);
      panGesture.current = panning;
      element.setPointerCapture(event.pointerId);
    }
    if (panGesture.current) {
      const next = { x: event.clientX, y: event.clientY };
      const previous = point.current ?? next;
      if (viewport.current) {
        viewport.current.scrollLeft += previous.x - next.x;
        viewport.current.scrollTop += previous.y - next.y;
      }
      point.current = next;
      return;
    }
    const bounds = element.getBoundingClientRect();
    const next = {
      x: ((event.clientX - bounds.left) * element.width) / bounds.width,
      y: ((event.clientY - bounds.top) * element.height) / bounds.height,
    };
    if (start) {
      history.current = [
        ...history.current.slice(-19),
        ctx.getImageData(0, 0, element.width, element.height),
      ];
    }
    const previous = point.current ?? next;
    const pressure =
      !eraser && event.pointerType === "pen"
        ? Math.max(0.15, event.pressure) / 0.55
        : 1;
    const width = (eraser ? eraserSize : penSize) * pressure;
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
    setGestureActive(false);
    point.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!panGesture.current) reportChange();
    panGesture.current = false;
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
          disabled={!ready || gestureActive}
          aria-pressed={!eraser && !panning}
          onClick={() => {
            setPanning(false);
            setEraser(false);
          }}
        >
          <Pen />
          {t.pen}
        </button>
        <button
          type="button"
          disabled={!ready || gestureActive}
          aria-pressed={eraser && !panning}
          onClick={() => {
            setPanning(false);
            setEraser(true);
          }}
        >
          <Eraser />
          {t.eraser}
        </button>
        <button
          type="button"
          disabled={!ready || gestureActive}
          aria-pressed={panning}
          onClick={() => setPanning(true)}
        >
          {t.panCanvas}
        </button>
        <button
          type="button"
          disabled={!ready || gestureActive || !strokes}
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
        <button
          type="button"
          disabled={!ready || gestureActive}
          onClick={clear}
        >
          <Trash />
          {t.clearDrawing}
        </button>
      </div>
      <div className="drawing-controls">
        <label>
          {eraser ? t.eraserSize : t.penSize}
          <input
            type="number"
            min={1}
            max={64}
            step={1}
            disabled={!ready || gestureActive || panning}
            value={eraser ? eraserSize : penSize}
            onChange={(event) => {
              const size = Math.max(
                1,
                Math.min(64, Math.round(Number(event.target.value))),
              );
              if (eraser) setEraserSize(size);
              else setPenSize(size);
            }}
          />
        </label>
        <div className="draw-tools">
          <button
            type="button"
            disabled={!ready || gestureActive || zoom === 1}
            onClick={() => changeZoom(zoom / 2)}
          >
            {t.zoomOut}
          </button>
          <output aria-live="polite">{zoom * 100}%</output>
          <button
            type="button"
            disabled={!ready || gestureActive || zoom === 8}
            onClick={() => changeZoom(zoom * 2)}
          >
            {t.zoomIn}
          </button>
          <button
            type="button"
            disabled={!ready || gestureActive}
            onClick={() => changeZoom(1)}
          >
            {t.fitCanvas}
          </button>
        </div>
      </div>
      <p id={`drawing-help-${character}`}>{t.precisionHelp}</p>
      <section
        ref={viewport}
        className={`drawing-viewport ${panning ? "panning" : ""}`}
        aria-label={t.drawingViewport}
        aria-describedby={`drawing-help-${character}`}
        tabIndex={ready ? 0 : -1}
        onKeyDown={(event) => {
          if (
            !ready ||
            pointer.current !== null ||
            event.target !== event.currentTarget ||
            event.currentTarget.closest("fieldset:disabled")
          )
            return;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-40, 0],
            ArrowRight: [40, 0],
            ArrowUp: [0, -40],
            ArrowDown: [0, 40],
          };
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          event.currentTarget.scrollLeft += move[0];
          event.currentTarget.scrollTop += move[1];
        }}
      >
        <div
          className="draw-canvas"
          style={{
            width: `${zoom * Math.min(1, (pixels?.width ?? 1) / (pixels?.height ?? 1)) * 100}%`,
          }}
        >
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
          <div
            className="draw-baseline"
            style={{ top: `${BASELINE * 100}%` }}
          />
        </div>
      </section>
      <div className="actions">
        <button
          className="primary"
          type="button"
          disabled={!ready || gestureActive}
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
