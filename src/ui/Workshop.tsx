import {
  CheckCircle,
  Copy,
  DownloadSimple,
  Pen,
  Trash,
} from "@phosphor-icons/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { fontGlyph, missingCharacters } from "../core/font";
import { isCjk } from "../core/text";
import {
  DEFAULT_SPACE_WIDTH,
  defaultSettings,
  FONT_INFO_LIMITS,
  type FontInfo,
  type Glyph,
  type GlyphSettings,
  MAX_KERN,
  MAX_KERN_PAIRS,
  MAX_SPACE_WIDTH,
  MIN_SPACE_WIDTH,
  OFL_LICENSE,
  OFL_URL,
  type Project,
} from "../core/types";
import { download } from "./browser";
import { Drawing } from "./Drawing";
import { GlyphTile } from "./GlyphTile";
import { type Dictionary, errorKey } from "./i18n";
import type { useGlyphEditor } from "./useGlyphEditor";

type Editor = ReturnType<typeof useGlyphEditor>;
export type DrawingDraft =
  | { kind: "blank" }
  | { kind: "edit"; original: Glyph };

function Outline({ glyph, t }: { glyph: Glyph; t: Dictionary }) {
  try {
    const shape = fontGlyph(glyph);
    const path = shape.contours
      .map(
        (contour) =>
          `${contour
            .map((p, i) => `${i ? "L" : "M"}${p.x} ${900 - p.y}`)
            .join(" ")}Z`,
      )
      .join(" ");
    const left = Math.min(0, shape.xMin) - 30,
      top = Math.min(0, 900 - shape.yMax) - 30;
    const width = Math.max(1000, shape.advanceWidth, shape.xMax) - left + 30;
    const height = Math.max(1150, 900 - shape.yMin) - top + 30;
    return (
      <svg
        viewBox={`${left} ${top} ${width} ${height}`}
        role="img"
        aria-label={`${t.outline} ${glyph.character}`}
      >
        <line
          x1={left}
          y1={900}
          x2={left + width}
          y2={900}
          vectorEffect="non-scaling-stroke"
        />
        {(
          [
            ["origin", 0],
            ["advance", shape.advanceWidth],
          ] as const
        ).map(([name, x]) => (
          <line
            key={name}
            className="guide"
            x1={x}
            y1={top}
            x2={x}
            y2={top + height}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={path} />
      </svg>
    );
  } catch (error) {
    return <p className="bad">{t[errorKey(error, "invalidFont")]}</p>;
  }
}

function Settings({
  glyph,
  editor,
  t,
  children,
}: {
  glyph: Glyph;
  editor: Editor;
  t: Dictionary;
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState(glyph.settings);
  const latest = useRef(glyph.settings);
  const dirty = useRef(false);
  latest.current = glyph.settings;
  function update(next: GlyphSettings) {
    dirty.current = true;
    setDraft(next);
  }
  function submit(values: GlyphSettings) {
    dirty.current = false;
    void editor.settings(glyph.character, values).then((applied) => {
      if (applied === false)
        setDraft((current) => (current === values ? latest.current : current));
    });
  }
  function apply() {
    submit(draft);
  }
  useEffect(() => {
    if (!dirty.current) setDraft(glyph.settings);
  }, [glyph.settings]);
  const fields: [
    Exclude<keyof GlyphSettings, "crop">,
    string,
    number,
    number,
    number,
  ][] = [
    ["threshold", t.threshold, 1, 235, 1],
    ["minArea", t.minArea, 1, 64, 1],
    ["smoothing", t.smoothing, 0, 3, 1],
    ["weight", t.weight, -3, 3, 1],
    ["scale", t.scale, 0.25, 2, 0.01],
    ["offsetX", t.offsetX, -500, 500, 1],
    ["offsetY", t.offsetY, -500, 500, 1],
    ...(!isCjk(glyph.character)
      ? [["sideBearing", t.sideBearing, 0, 300, 1] as (typeof fields)[number]]
      : []),
    ["advanceWidth", t.advance, 0, 3000, 1],
  ];
  return (
    <>
      <p className="instructions">{t.settingsHelp}</p>
      <div className="settings-grid">
        {fields.map(([key, label, min, max, step]) => (
          <div className="setting" key={key}>
            <label>
              {label}
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                onChange={(e) =>
                  update({ ...draft, [key]: Number(e.target.value) })
                }
                onBlur={apply}
                onKeyDown={(e) => {
                  if (e.key === "Enter") apply();
                }}
              />
            </label>
            {key !== "advanceWidth" && (
              <input
                type="range"
                aria-label={`${label}, ${t.slider}`}
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                onChange={(e) =>
                  update({ ...draft, [key]: Number(e.target.value) })
                }
                onPointerUp={apply}
                onKeyUp={apply}
                onBlur={apply}
              />
            )}
          </div>
        ))}
        <div className="crop-settings">
          {(["left", "top", "right", "bottom"] as const).map((key) => (
            <label key={key}>
              {t.crop} {t[key]}
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={draft.crop[key]}
                onChange={(e) =>
                  update({
                    ...draft,
                    crop: { ...draft.crop, [key]: Number(e.target.value) },
                  })
                }
                onBlur={apply}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="editor-actions settings-actions">
        <button
          type="button"
          onClick={() => {
            const defaults = defaultSettings();
            setDraft(defaults);
            submit(defaults);
          }}
        >
          {t.reset}
        </button>
        <button
          className="match-tracing"
          type="button"
          onClick={() => {
            void editor.matchTracing(glyph.character);
          }}
        >
          {t.matchTracing}
        </button>
        {children}
      </div>
    </>
  );
}

export function Workshop({
  project,
  t,
  selected,
  onSelect,
  editor,
  onClear,
  onExport,
  onCopyCss,
  exportBusy,
  drawing,
  drawingVersion,
  onDrawingChange,
  onDrawNext,
  onDrawingDirtyChange,
}: {
  project: Project;
  t: Dictionary;
  selected: string;
  onSelect: (character: string) => void;
  editor: Editor;
  onClear: (character: string) => void;
  onExport: (format: "ttf" | "woff2", partial: boolean) => void;
  onCopyCss: () => void;
  exportBusy: boolean;
  drawing: DrawingDraft | null;
  drawingVersion: number;
  onDrawingChange: (draft: DrawingDraft | null, applied?: boolean) => boolean;
  onDrawNext: (character: string) => void;
  onDrawingDirtyChange: (dirty: boolean) => void;
}) {
  const editorLaunch = useRef<HTMLButtonElement>(null);
  const drawingOpener = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const [partial, setPartial] = useState(false);
  const current = project.glyphs[selected];
  const missing = missingCharacters(project);
  const pendingReview = project.characters.filter((ch) => {
    const glyph = project.glyphs[ch];
    return !!glyph?.contours.length && !glyph.reviewed;
  });
  const readyCount = project.characters.length - missing.length;
  const selectedIndex = project.characters.indexOf(selected);
  const nextBlank = [
    ...project.characters.slice(selectedIndex + 1),
    ...project.characters.slice(0, Math.max(selectedIndex, 0)),
  ].find((ch) => !project.glyphs[ch]);
  const nextReview =
    pendingReview.find(
      (ch) =>
        project.characters.indexOf(ch) > project.characters.indexOf(selected),
    ) ?? pendingReview.find((ch) => ch !== selected);
  function moveSelection(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const columns = getComputedStyle(
      event.currentTarget,
    ).gridTemplateColumns.split(" ").length;
    const step = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    }[event.key];
    if (!step) return;
    const tiles = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(".glyph-tile"),
    ];
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement);
    const target = tiles[index + step];
    if (index < 0 || !target) return;
    event.preventDefault();
    target.focus();
    target.click();
  }
  useEffect(() => {
    if (drawing || !restoreFocus.current) return;
    restoreFocus.current = false;
    const opener = drawingOpener.current?.isConnected
      ? drawingOpener.current
      : editorLaunch.current;
    opener?.focus();
  }, [drawing]);
  function closeDrawing(applied = false) {
    if (!onDrawingChange(null, applied)) return;
    restoreFocus.current = true;
  }
  return (
    <section className="workshop-layout">
      <aside className="glyph-browser panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t.characterSet}</span>
            <h2>{t.glyphList}</h2>
          </div>
          <span className="count-pill">
            {readyCount} / {project.characters.length}
          </span>
        </div>
        {readyCount > 0 && (
          <div className="review-progress">
            <p>
              {readyCount - pendingReview.length} / {readyCount}{" "}
              {t.reviewedCount}
            </p>
            {pendingReview.length ? (
              <button
                type="button"
                disabled={!nextReview}
                onClick={() => nextReview && onSelect(nextReview)}
              >
                {t.nextReview}
              </button>
            ) : (
              <p className="review-done">{t.allReviewed}</p>
            )}
          </div>
        )}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Arrow keys move between the glyph buttons it contains. */}
        <div className="glyph-grid" onKeyDown={moveSelection}>
          {project.characters.map((ch) => {
            const glyph = project.glyphs[ch];
            const ready = !!glyph?.contours.length;
            return (
              <GlyphTile
                key={ch}
                character={ch}
                glyph={glyph}
                active={ch === selected}
                label={`${ch} ${glyph?.reviewed ? t.reviewedLabel : ready ? t.needsReview : t.missing}`}
                onSelect={onSelect}
              />
            );
          })}
        </div>
        <button
          className="draw-launch"
          type="button"
          onClick={(event) => {
            drawingOpener.current = event.currentTarget;
            onDrawingChange({ kind: "blank" });
          }}
        >
          <Pen />
          {t.draw}
        </button>
      </aside>
      <div className="editor-column">
        <section className="editor panel">
          <div className="editor-heading">
            <div>
              <span className="eyebrow">{t.tracedOutline}</span>
              <h2>{selected || t.noGlyph}</h2>
            </div>
            <div className="editor-actions">
              {current && (
                <>
                  <button
                    type="button"
                    aria-pressed={current.reviewed}
                    onClick={() => {
                      if (!onDrawingChange(null)) return;
                      void editor.mutate(selected, (glyph) => ({
                        ...glyph,
                        reviewed: !glyph.reviewed,
                      }));
                    }}
                  >
                    <CheckCircle />
                    {t.reviewed}
                  </button>
                  <button type="button" onClick={() => onClear(selected)}>
                    <Trash />
                    {t.clearGlyph}
                  </button>
                </>
              )}
            </div>
          </div>
          {drawing ? (
            <Drawing
              key={`${selected}-${drawingVersion}`}
              character={selected}
              source={
                drawing.kind === "edit" ? drawing.original.source : undefined
              }
              canAdvance={drawing.kind === "blank" && !!nextBlank}
              t={t}
              onCancel={() => closeDrawing(true)}
              onDirtyChange={onDrawingDirtyChange}
              onUse={(source, pixels, changed, advance) => {
                if (
                  editor.drawing(
                    selected,
                    source,
                    pixels,
                    drawing.kind === "edit" ? drawing.original : undefined,
                    changed,
                  )
                ) {
                  if (advance && nextBlank) onDrawNext(nextBlank);
                  else closeDrawing(true);
                }
              }}
            />
          ) : current ? (
            <>
              <div className="source-outline">
                <div className="glyph-source">
                  <div>
                    {t.sourceLabel}{" "}
                    <small>
                      {
                        t[
                          current.origin === "scan"
                            ? "sourceScan"
                            : current.origin === "sample"
                              ? "sourceSample"
                              : "sourceDraw"
                        ]
                      }
                    </small>
                  </div>
                  <img
                    src={current.source}
                    alt={`${t.sourceLabel} ${selected}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      download(
                        current.source.startsWith("data:")
                          ? Uint8Array.from(
                              atob(current.source.split(",")[1]),
                              (ch) => ch.charCodeAt(0),
                            )
                          : "",
                        `${selected.codePointAt(0)?.toString(16)}-source.${current.source.startsWith("data:image/jpeg;") ? "jpg" : "png"}`,
                        current.source.startsWith("data:image/jpeg;")
                          ? "image/jpeg"
                          : "image/png",
                      )
                    }
                  >
                    <DownloadSimple />
                    {t.downloadSource}
                  </button>
                </div>
                <div className="outline-wrap">
                  <div>
                    {t.outline}
                    <small>
                      {t.contours}: {current.contours.length}
                    </small>
                  </div>
                  {current.contours.length ? (
                    <>
                      <Outline glyph={current} t={t} />
                      <p className="guide-note">{t.spacingGuides}</p>
                    </>
                  ) : (
                    <p className="bad">{t.missing}</p>
                  )}
                </div>
              </div>
              <Settings
                key={`${selected}-${editor.cancellation}`}
                glyph={current}
                editor={editor}
                t={t}
              >
                <button
                  ref={editorLaunch}
                  type="button"
                  onClick={(event) => {
                    drawingOpener.current = event.currentTarget;
                    onDrawingChange({ kind: "edit", original: current });
                  }}
                >
                  <Pen />
                  {t.editSource}
                </button>
              </Settings>
            </>
          ) : (
            <div className="empty-editor">
              <p>{t.missing}</p>
              <button
                ref={editorLaunch}
                type="button"
                onClick={(event) => {
                  drawingOpener.current = event.currentTarget;
                  onDrawingChange({ kind: "blank" });
                }}
              >
                <Pen />
                {t.draw}
              </button>
            </div>
          )}
        </section>
        <section className="spacing-panel panel">
          <div>
            <span className="eyebrow">{t.spacingTitle}</span>
            <label>
              {t.wordSpace}
              <input
                key={project.spaceWidth ?? DEFAULT_SPACE_WIDTH}
                type="number"
                min={MIN_SPACE_WIDTH}
                max={MAX_SPACE_WIDTH}
                step={10}
                defaultValue={project.spaceWidth ?? DEFAULT_SPACE_WIDTH}
                onBlur={(event) => {
                  const input = event.currentTarget;
                  void editor.wordSpace(Number(input.value)).then((applied) => {
                    if (!applied && input.isConnected)
                      input.value = String(
                        project.spaceWidth ?? DEFAULT_SPACE_WIDTH,
                      );
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
            <small>{t.wordSpaceHelp}</small>
            <label className="case-fallback">
              <input
                type="checkbox"
                checked={!!project.upperForLower}
                onChange={(event) => {
                  void editor.upperForLower(event.target.checked);
                }}
              />
              {t.upperForLower}
            </label>
            <small>{t.upperForLowerHelp}</small>
          </div>
          <button
            type="button"
            disabled={!current || isCjk(selected)}
            onClick={() => {
              void editor.matchSideBearing(selected);
            }}
          >
            {t.matchBearing}
          </button>
        </section>
        <KerningPanel
          project={project}
          selected={selected}
          t={t}
          editor={editor}
        />
        <FontInfoPanel project={project} t={t} editor={editor} />
        <section className="export-panel panel">
          <div>
            <span className="eyebrow">{t.fontFile}</span>
            <h2>{project.name}</h2>
            <p>{missing.length ? t.missingGate : t.completeFont}</p>
          </div>
          <div className="export-actions">
            <label className="partial">
              <input
                type="checkbox"
                checked={partial}
                onChange={(e) => setPartial(e.target.checked)}
              />
              {t.partial}
            </label>
            {partial && <small>{t.partialHelp}</small>}
            {!!missing.length && (
              <p className="bad">
                {t.subsetWarning}: {missing.join(" ")}
              </p>
            )}
            <button
              className="primary"
              type="button"
              disabled={
                exportBusy ||
                (missing.length > 0 && !partial) ||
                missing.length === project.characters.length
              }
              onClick={() => onExport("ttf", partial)}
            >
              <DownloadSimple />
              {t.downloadTtf}
            </button>
            <button
              type="button"
              disabled={
                exportBusy ||
                (missing.length > 0 && !partial) ||
                missing.length === project.characters.length
              }
              onClick={() => onExport("woff2", partial)}
            >
              <DownloadSimple />
              {t.downloadWoff}
            </button>
            <button type="button" disabled={exportBusy} onClick={onCopyCss}>
              <Copy />
              {t.copyWebCss}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function FontInfoPanel({
  project,
  t,
  editor,
}: {
  project: Project;
  t: Dictionary;
  editor: ReturnType<typeof useGlyphEditor>;
}) {
  const stored: Required<FontInfo> = {
    designer: project.info?.designer ?? "",
    copyright: project.info?.copyright ?? "",
    license: project.info?.license ?? "",
    licenseUrl: project.info?.licenseUrl ?? "",
  };
  const [draft, setDraft] = useState(stored);
  const key = JSON.stringify(stored);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the saved info changes
  useEffect(() => setDraft(stored), [key]);
  function apply(value: FontInfo) {
    void editor.fontInfo(value).then((applied) => {
      if (!applied) setDraft(stored);
    });
  }
  const fields = [
    ["designer", t.infoDesigner],
    ["copyright", t.infoCopyright],
    ["license", t.infoLicense],
    ["licenseUrl", t.infoLicenseUrl],
  ] as const;
  return (
    <section className="info-panel panel">
      <div>
        <span className="eyebrow">{t.infoTitle}</span>
        <p>{t.infoHelp}</p>
      </div>
      <div className="info-fields">
        {fields.map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              value={draft[name]}
              maxLength={FONT_INFO_LIMITS[name]}
              inputMode={name === "licenseUrl" ? "url" : undefined}
              onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
              onBlur={() => apply(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const next = { ...draft, license: OFL_LICENSE, licenseUrl: OFL_URL };
          setDraft(next);
          apply(next);
        }}
      >
        {t.infoUseOfl}
      </button>
    </section>
  );
}

function KerningPanel({
  project,
  selected,
  t,
  editor,
}: {
  project: Project;
  selected: string;
  t: Dictionary;
  editor: Editor;
}) {
  const characters = project.characters;
  const pairs = project.kerning ?? [];
  const [left, setLeft] = useState(selected || characters[0]);
  const [right, setRight] = useState(characters[1] ?? characters[0]);
  const stored =
    pairs.find((pair) => pair.left === left && pair.right === right)?.value ??
    0;
  const [amount, setAmount] = useState(String(stored));
  useEffect(() => {
    if (selected) setLeft(selected);
  }, [selected]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: refill the field when the pair changes
  useEffect(() => setAmount(String(stored)), [stored, left, right]);
  if (!characters.length) return null;
  const full = pairs.length >= MAX_KERN_PAIRS && !stored;
  return (
    <section className="kern-panel panel">
      <div>
        <span className="eyebrow">{t.kernTitle}</span>
        <p>{t.kernHelp}</p>
      </div>
      <form
        className="kern-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void editor.kern(left, right, Number(amount)).then((applied) => {
            if (!applied) setAmount(String(stored));
          });
        }}
      >
        <label>
          {t.kernLeft}
          <select value={left} onChange={(e) => setLeft(e.target.value)}>
            {characters.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.kernRight}
          <select value={right} onChange={(e) => setRight(e.target.value)}>
            {characters.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.kernAmount}
          <input
            type="number"
            min={-MAX_KERN}
            max={MAX_KERN}
            step={10}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <button type="submit" disabled={full}>
          {t.kernSet}
        </button>
      </form>
      {full && <small className="bad">{t.kernFull}</small>}
      {pairs.length ? (
        <ul className="kern-list" aria-label={t.kernList}>
          {pairs.map((pair) => (
            <li key={pair.left + pair.right}>
              <button
                type="button"
                className="kern-pair"
                onClick={() => {
                  setLeft(pair.left);
                  setRight(pair.right);
                }}
              >
                <span className="kern-chars">
                  {pair.left}
                  {pair.right}
                </span>
                <span>{pair.value > 0 ? `+${pair.value}` : pair.value}</span>
              </button>
              <button
                type="button"
                aria-label={`${t.kernRemove} ${pair.left}${pair.right}`}
                onClick={() => {
                  void editor.kern(pair.left, pair.right, 0);
                }}
              >
                <Trash />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <small>{t.kernNone}</small>
      )}
    </section>
  );
}
