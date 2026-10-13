import {
  ArrowCounterClockwise,
  Eraser,
  Pen,
  Trash,
} from "@phosphor-icons/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { BASELINE } from "../core/types";
import type { Dictionary } from "./i18n";

export function Drawing({
  t,
  character,
  onUse,
  onCancel,
}: {
  t: Dictionary;
  character: string;
  onUse: (source: string, pixels: ImageData) => void;
  onCancel: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const point = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const [eraser, setEraser] = useState(false);
  const [strokes, setStrokes] = useState(0);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 384, 384);
    }
  }, []);
  function draw(event: PointerEvent<HTMLCanvasElement>, start = false) {
    const element = event.currentTarget;
    const ctx = element.getContext("2d");
    if (!ctx || (!start && !point.current)) return;
    const bounds = element.getBoundingClientRect();
    const next = {
      x: ((event.clientX - bounds.left) * 384) / bounds.width,
      y: ((event.clientY - bounds.top) * 384) / bounds.height,
    };
    if (start) {
      history.current = [
        ...history.current.slice(-19),
        ctx.getImageData(0, 0, 384, 384),
      ];
      element.setPointerCapture(event.pointerId);
    }
    const previous = point.current ?? next;
    const pressure =
      event.pointerType === "pen" ? Math.max(0.15, event.pressure) : 0.55;
    const width = eraser ? 28 : 3 + pressure * 10;
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
    setStrokes(history.current.length);
  }
  function finish(event: PointerEvent<HTMLCanvasElement>) {
    point.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function clear() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    history.current = [
      ...history.current.slice(-19),
      ctx.getImageData(0, 0, 384, 384),
    ];
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 384, 384);
    setStrokes(history.current.length);
  }
  return (
    <div className="drawing-area">
      <p>{t.drawHelp}</p>
      <div className="draw-tools">
        <button
          type="button"
          aria-pressed={!eraser}
          onClick={() => setEraser(false)}
        >
          <Pen />
          {t.pen}
        </button>
        <button
          type="button"
          aria-pressed={eraser}
          onClick={() => setEraser(true)}
        >
          <Eraser />
          {t.eraser}
        </button>
        <button
          type="button"
          disabled={!strokes}
          onClick={() => {
            const previous = history.current.pop();
            const ctx = canvas.current?.getContext("2d");
            if (previous && ctx) ctx.putImageData(previous, 0, 0);
            setStrokes(history.current.length);
          }}
        >
          <ArrowCounterClockwise />
          {t.undo}
        </button>
        <button type="button" onClick={clear}>
          <Trash />
          {t.clearDrawing}
        </button>
      </div>
      <div className="draw-canvas">
        <canvas
          ref={canvas}
          width={384}
          height={384}
          aria-label={`${t.draw} ${character}`}
          onPointerDown={(e) => {
            e.preventDefault();
            draw(e, true);
          }}
          onPointerMove={draw}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
        <div className="draw-baseline" style={{ top: `${BASELINE * 100}%` }} />
      </div>
      <div className="actions">
        <button
          className="primary"
          type="button"
          onClick={() => {
            const element = canvas.current;
            const ctx = element?.getContext("2d");
            if (element && ctx)
              onUse(
                element.toDataURL("image/png"),
                ctx.getImageData(0, 0, 384, 384),
              );
          }}
        >
          {t.useDrawing}
        </button>
        <button type="button" onClick={onCancel}>
          {t.cancelDrawing}
        </button>
      </div>
    </div>
  );
}
