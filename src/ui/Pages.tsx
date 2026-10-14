import {
  DownloadSimple,
  Printer,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  homography,
  projectPoint,
  sampleCell,
  validateCorners,
} from "../core/geometry";
import {
  cellRect,
  pageCharacters,
  pageCount,
  TEMPLATE,
  templateSvg,
} from "../core/template";
import type { Point, Project } from "../core/types";
import { download, printSheets, svgUrl } from "./browser";
import { type Dictionary, errorKey } from "./i18n";
import type { Notice } from "./useGlyphEditor";
import type { DraftPage, useScans } from "./useScans";

type Scans = ReturnType<typeof useScans>;

function RectifiedPreview({ page, t }: { page: DraftPage; t: Dictionary }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let canceled = false;
    setError(false);
    const image = new Image();
    image.src = page.image;
    void image
      .decode()
      .then(() => {
        if (canceled || !canvas.current) return;
        validateCorners(page.corners, page.width, page.height);
        const source = document.createElement("canvas");
        source.width = image.naturalWidth;
        source.height = image.naturalHeight;
        const ctx = source.getContext("2d", { willReadFrequently: true });
        const dest = canvas.current.getContext("2d");
        if (!ctx || !dest) return;
        ctx.drawImage(image, 0, 0);
        const rgba = ctx.getImageData(0, 0, source.width, source.height).data;
        const map = homography(TEMPLATE.markers, page.corners);
        const pixels = sampleCell(
          rgba,
          source.width,
          source.height,
          map,
          { x: 0, y: 0, width: TEMPLATE.width, height: TEMPLATE.height },
          384,
        );
        dest.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), 384, 384),
          0,
          0,
        );
      })
      .catch(() => {
        if (!canceled) setError(true);
      });
    return () => {
      canceled = true;
    };
  }, [page.image, page.corners, page.width, page.height]);
  return (
    <figure className="rectified-preview">
      <figcaption>{t.correctedPreview}</figcaption>
      {error ? (
        <p className="bad">{t.invalidCorners}</p>
      ) : (
        <canvas
          ref={canvas}
          width={384}
          height={384}
          role="img"
          aria-label={t.correctedPreview}
        />
      )}
    </figure>
  );
}

function Registration({
  page,
  count,
  scans,
  t,
}: {
  page: DraftPage;
  count: number;
  scans: Scans;
  t: Dictionary;
}) {
  const active = useRef<{ pointerId: number; corner: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const disabled = scans.busy || scans.reading || !scans.compatible;
  const names = [t.topLeft, t.topRight, t.bottomRight, t.bottomLeft];
  const polygons = useMemo(() => {
    try {
      validateCorners(page.corners, page.width, page.height);
      const map = homography(TEMPLATE.markers, page.corners);
      return Array.from({ length: count }, (_, slot) => {
        const r = cellRect(slot);
        return [
          { x: r.x, y: r.y },
          { x: r.x + r.width, y: r.y },
          { x: r.x + r.width, y: r.y + r.height },
          { x: r.x, y: r.y + r.height },
        ]
          .map((p) => projectPoint(map, p))
          .map((p) => `${p.x},${p.y}`)
          .join(" ");
      });
    } catch {
      return [];
    }
  }, [page.corners, page.width, page.height, count]);
  function move(event: PointerEvent<SVGSVGElement>) {
    const element = svg.current;
    const matrix = element?.getScreenCTM();
    if (active.current?.pointerId !== event.pointerId || !element || !matrix)
      return;
    const point = element.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    scans.corner(active.current.corner, {
      x: Math.max(0, Math.min(page.width, local.x)),
      y: Math.max(0, Math.min(page.height, local.y)),
    });
  }
  function finish(event: PointerEvent<SVGSVGElement>) {
    if (active.current?.pointerId === event.pointerId) active.current = null;
  }
  return (
    <div className="scan-preview">
      <img src={page.image} alt={page.filename} />
      <svg
        ref={svg}
        viewBox={`0 0 ${page.width} ${page.height}`}
        aria-label={t.registrationPreview}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      >
        {polygons.map((points) => (
          <polygon key={points} points={points} fill="none" />
        ))}
        {page.corners.map((p, i) => (
          <circle
            key={names[i]}
            cx={p.x}
            cy={p.y}
            r={Math.max(page.width / 55, 10)}
            className="corner-handle"
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label={names[i]}
            aria-valuemin={0}
            aria-valuemax={page.width}
            aria-valuenow={Math.round(p.x)}
            aria-valuetext={`${Math.round(p.x)}, ${Math.round(p.y)}`}
            onPointerDown={(e) => {
              if (disabled || active.current !== null || e.button !== 0) return;
              e.preventDefault();
              active.current = { pointerId: e.pointerId, corner: i };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              const delta = e.shiftKey ? 10 : 1;
              const directions: Record<string, Point> = {
                ArrowLeft: { x: -delta, y: 0 },
                ArrowRight: { x: delta, y: 0 },
                ArrowUp: { x: 0, y: -delta },
                ArrowDown: { x: 0, y: delta },
              };
              const d = directions[e.key];
              if (d) {
                e.preventDefault();
                scans.corner(i, {
                  x: Math.max(0, Math.min(page.width, p.x + d.x)),
                  y: Math.max(0, Math.min(page.height, p.y + d.y)),
                });
              }
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function Pages({
  project,
  t,
  scans,
  notify,
}: {
  project: Project;
  t: Dictionary;
  scans: Scans;
  notify: (notice: Notice) => void;
}) {
  const [size, setSize] = useState(384);
  const queue = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const draft = scans.drafts[scans.index];
  const total = pageCount(project.characters);
  const sheets = useMemo(
    () =>
      Array.from({ length: total }, (_, page) =>
        templateSvg(project.characters, project.name, project.id, page, {
          page: t.page,
          of: t.templateOf,
          write: t.templateWrite,
          registration: t.templateRegistration,
          footer: t.templateFooter,
        }),
      ),
    [total, project.characters, project.name, project.id, t],
  );
  function print(svgs: string[]) {
    try {
      printSheets(svgs, project.name);
    } catch (error) {
      notify({ key: errorKey(error, "popupBlocked"), tone: "error" });
    }
  }
  const cornerNames = [t.topLeft, t.topRight, t.bottomRight, t.bottomLeft];
  return (
    <section className="panel page-stage">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t.paperScans}</span>
          <h2>{t.pages}</h2>
        </div>
        <button type="button" onClick={() => print(sheets)}>
          <Printer />
          {t.printAll}
        </button>
      </div>
      <div className="page-cards">
        {sheets.map((svg, index) => (
          <article
            className="page-card"
            key={pageCharacters(project.characters, index)[0]}
          >
            <img src={svgUrl(svg)} alt={`${t.page} ${index + 1}`} />
            <div>
              <strong>
                {t.page} {index + 1} / {total}
              </strong>
              <small>
                {pageCharacters(project.characters, index).join(" ")}
              </small>
            </div>
            <button type="button" onClick={() => print([svg])}>
              <Printer />
              {t.printPage}
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  svg,
                  `${project.name}-page-${index + 1}.svg`,
                  "image/svg+xml",
                )
              }
            >
              <DownloadSimple />
              {t.downloadTemplate}
            </button>
          </article>
        ))}
      </div>
      <p className="instructions">{t.templateHelp}</p>
      <section className="scan-panel">
        <h3>{t.scan}</h3>
        <p>{t.scanHelp}</p>
        <label className="file-picker">
          <UploadSimple />
          {scans.reading ? t.loading : t.chooseImages}
          <input
            ref={upload}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            disabled={scans.busy || scans.reading}
            onChange={(e) => {
              void scans.add(Array.from(e.currentTarget.files ?? []));
              e.currentTarget.value = "";
            }}
          />
        </label>
        {!!scans.drafts.length && (
          <>
            {!scans.compatible && (
              <p className="notice bad scan-template-notice" role="alert">
                {t.scanTemplateChanged}
              </p>
            )}
            <div ref={queue} className="draft-queue">
              {scans.drafts.map((page, i) => (
                <div key={page.id} className="draft-item">
                  <button
                    type="button"
                    className={i === scans.index ? "selected" : ""}
                    aria-pressed={i === scans.index}
                    disabled={scans.busy || scans.reading}
                    onClick={() => scans.setIndex(i)}
                  >
                    {t.page} {i + 1}: {page.filename}
                  </button>
                  <button
                    type="button"
                    aria-label={`${t.removeScan}: ${page.filename}`}
                    disabled={scans.busy || scans.reading}
                    onClick={() => {
                      const buttons =
                        queue.current?.querySelectorAll<HTMLButtonElement>(
                          ".draft-item > button:first-child",
                        );
                      const target =
                        i === scans.index
                          ? (buttons?.[i + 1] ?? buttons?.[i - 1])
                          : buttons?.[scans.index];
                      scans.remove(page.id);
                      (target ?? upload.current)?.focus();
                    }}
                  >
                    <Trash />
                  </button>
                </div>
              ))}
            </div>
            {draft && (
              <fieldset disabled={scans.busy || !scans.compatible}>
                <div className="scan-workspace">
                  <div>
                    <Registration
                      page={draft}
                      count={
                        scans.compatible
                          ? pageCharacters(project.characters, draft.pageIndex)
                              .length
                          : 0
                      }
                      scans={scans}
                      t={t}
                    />
                    <RectifiedPreview page={draft} t={t} />
                  </div>
                  <div className="scan-controls">
                    <label>
                      {t.assignPage}
                      <select
                        value={draft.pageIndex}
                        onChange={(e) =>
                          scans.change({ pageIndex: Number(e.target.value) })
                        }
                      >
                        {Array.from(
                          {
                            length: scans.compatible
                              ? total
                              : draft.pageIndex + 1,
                          },
                          (_, i) => i,
                        ).map((i) => (
                          <option key={i} value={i}>
                            {t.page} {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.pageId}
                      <input readOnly value={draft.templateId.slice(0, 8)} />
                      <small>{t.scanHelp}</small>
                    </label>
                    {draft.corners.map((p, i) => (
                      <div className="corner-input" key={cornerNames[i]}>
                        <span>{cornerNames[i]}</span>
                        {(["x", "y"] as const).map((axis) => (
                          <label key={axis}>
                            <span className="sr-only">
                              {cornerNames[i]} {axis.toUpperCase()}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={axis === "x" ? draft.width : draft.height}
                              step={1}
                              value={Math.round(p[axis])}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (Number.isFinite(value))
                                  scans.corner(i, { ...p, [axis]: value });
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                    <label className="confirm">
                      <input
                        type="checkbox"
                        checked={draft.confirmed}
                        onChange={(e) =>
                          scans.change({ confirmed: e.target.checked })
                        }
                      />
                      {t.confirmPage}
                    </label>
                    <label>
                      {t.resolution}
                      <select
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                      >
                        {[256, 384, 512, 768].map((n) => (
                          <option key={n} value={n}>
                            {n} {t.resolutionPixels}
                          </option>
                        ))}
                      </select>
                      <small>{t.resolutionWarning}</small>
                    </label>
                  </div>
                </div>
              </fieldset>
            )}
            {scans.busy && (
              <div role="status">
                <p>
                  {t.scanProgress}: {scans.progress.done} /{" "}
                  {scans.progress.total}
                </p>
                <progress
                  max={Math.max(1, scans.progress.total)}
                  value={scans.progress.done}
                />
              </div>
            )}
            <div className="actions">
              <button
                className="primary"
                type="button"
                disabled={
                  scans.busy ||
                  !scans.compatible ||
                  !scans.drafts.every((p) => p.confirmed)
                }
                onClick={() => scans.run(size)}
              >
                {t.processScans}
              </button>
              <button type="button" onClick={scans.cancel}>
                {t.cancel}
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
