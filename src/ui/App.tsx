import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowSquareOut,
  DownloadSimple,
  FileArrowUp,
  Leaf,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  exportFont,
  fontFilename,
  missingCharacters,
  webFontCss,
} from "../core/font";
import { newProject, parseProject, updateText } from "../core/project";
import { createSyntheticProject } from "../core/synthetic";
import type { Project } from "../core/types";
import {
  chooseProject,
  download,
  downloadProject,
  projectText,
  validateImages,
} from "./browser";
import {
  dictionaries,
  errorKey,
  type Locale,
  languages,
  preference,
  remember,
} from "./i18n";
import { Pages } from "./Pages";
import { Setup } from "./Setup";
import { renderSpecimen } from "./specimen";
import { useFontPreview } from "./useFontPreview";
import { type Notice, useGlyphEditor } from "./useGlyphEditor";
import { useProject } from "./useProject";
import { useScans } from "./useScans";
import { type DrawingDraft, Workshop } from "./Workshop";

type Stage = "Characters" | "Pages" | "Workshop";

export function App() {
  const local = useProject();
  const { project, projectRef, commit } = local;
  const [locale, setLocale] = useState<Locale>(() => {
    const value = preference("glyphsprout.locale", "en");
    return value in dictionaries ? (value as Locale) : "en";
  });
  const [theme, setTheme] = useState(() =>
    preference("glyphsprout.theme", "system"),
  );
  const [stage, setStage] = useState<Stage>("Workshop");
  const [selected, setSelected] = useState("");
  const [drawing, setDrawing] = useState<DrawingDraft | null>(null);
  const [drawingVersion, setDrawingVersion] = useState(0);
  const [drawingDirty, setDrawingDirty] = useState(false);
  const [setupDirty, setSetupDirty] = useState(false);
  const [setupVersion, setSetupVersion] = useState(0);
  const [specimen, setSpecimen] = useState("HELLO JOB");
  const [specimenSize, setSpecimenSize] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const recoveryAction = useRef(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const started = useRef(false);
  const t = dictionaries[locale];
  const preview = useFontPreview(project);
  const editor = useGlyphEditor(projectRef, commit, setNotice);
  const scans = useScans(
    projectRef,
    (next) => {
      const replacesDrawing =
        drawing &&
        projectRef.current?.glyphs[selected] !== next.glyphs[selected];
      commit(next);
      if (replacesDrawing) changeDrawing(null, true);
      editor.cancel();
    },
    setNotice,
    t.replaceWarning,
    (pages) => {
      const current = projectRef.current;
      const affectsDrawing =
        drawing &&
        current &&
        pages.some((page) =>
          current.characters
            .slice(page.pageIndex * 35, (page.pageIndex + 1) * 35)
            .includes(selected),
        );
      return (
        !affectsDrawing || !drawingDirty || window.confirm(t.discardDrawing)
      );
    },
  );
  const locked =
    scans.busy || scans.reading || sampleBusy || recoveryBusy || exportBusy;
  const missing = project ? missingCharacters(project) : [];

  const hasDrafts = setupDirty || drawingDirty || scans.drafts.length > 0;
  const hasUnsavedWork =
    hasDrafts ||
    editor.busy ||
    (project !== null && local.saveState !== "saved");
  useEffect(() => {
    if (!hasUnsavedWork) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedWork]);

  function changeDrawing(next: DrawingDraft | null, applied = false) {
    if (!applied && drawingDirty && !window.confirm(t.discardDrawing))
      return false;
    setDrawingDirty(false);
    setDrawing(next);
    if (next) setDrawingVersion((value) => value + 1);
    return true;
  }

  function undoProject() {
    if (!changeDrawing(null)) return;
    editor.cancel();
    local.undo();
  }

  function redoProject() {
    if (!changeDrawing(null)) return;
    editor.cancel();
    local.redo();
  }

  const shortcut = useRef<(event: KeyboardEvent) => void>(() => {});
  shortcut.current = (event) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      !(event.ctrlKey || event.metaKey)
    )
      return;
    const key = event.key.toLowerCase();
    const redo = key === "y" || (key === "z" && event.shiftKey);
    if (key !== "z" && !redo) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, textarea, select"))
    )
      return;
    if (drawing || locked || !project) return;
    if (redo ? !local.canRedo : !local.canUndo) return;
    event.preventDefault();
    if (redo) redoProject();
    else undoProject();
  };
  useEffect(() => {
    const listener = (event: KeyboardEvent) => shortcut.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    remember("glyphsprout.locale", locale);
  }, [locale]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    remember("glyphsprout.theme", theme);
  }, [theme]);
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      let canceled = false;
      void navigator.serviceWorker.ready.then(() => {
        if (!canceled) setOfflineReady(true);
      });
      return () => {
        canceled = true;
      };
    }
  }, []);
  useEffect(() => {
    if (project && !project.characters.includes(selected))
      setSelected(project.characters[0]);
  }, [project, selected]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The initial sample runs once after recovery, independently of later edits.
  useEffect(() => {
    if (local.loading || started.current) return;
    started.current = true;
    if (projectRef.current) setSpecimen(projectRef.current.text);
    else if (!local.recoveryFailed) void sample("paper", false);
  }, [local.loading]);

  function replace(next: Project) {
    changeDrawing(null, true);
    editor.cancel();
    scans.discard();
    commit(next, "replace");
    setSetupVersion((value) => value + 1);
    setSetupDirty(false);
    setSelected(next.characters[0]);
    setSpecimen(next.text);
    setStage("Workshop");
  }

  async function sample(kind: "paper" | "synthetic", confirm = true) {
    if (confirm && projectRef.current && !window.confirm(t.sampleReplace))
      return;
    setSampleBusy(true);
    try {
      const next =
        kind === "synthetic"
          ? await createSyntheticProject()
          : parseProject(
              await (
                await fetch(
                  `${import.meta.env.BASE_URL}samples/paper-sample.glyphsprout.json`,
                )
              ).text(),
            );
      replace(next);
      if (confirm)
        setNotice({
          key: kind === "paper" ? "paperSampleNote" : "syntheticSampleNote",
        });
    } catch (error) {
      setNotice({ key: errorKey(error, "loadFailed"), tone: "error" });
    } finally {
      setSampleBusy(false);
    }
  }

  async function open(file: File) {
    try {
      const next = parseProject(await projectText(file));
      await validateImages(next);
      if (projectRef.current && !window.confirm(t.importReplace)) return;
      replace(next);
      setNotice({ key: "projectReady" });
    } catch (error) {
      setNotice({ key: errorKey(error, "importFailed"), tone: "error" });
    }
  }

  async function backup() {
    if (!project) return;
    setExportBusy(true);
    try {
      if (!(await editor.flush())) return;
      const current = projectRef.current;
      if (!current || current.id !== project.id) return;
      downloadProject(current);
    } catch (error) {
      setNotice({ key: errorKey(error), tone: "error" });
    } finally {
      setExportBusy(false);
    }
  }

  async function recoveryBackup() {
    if (recoveryAction.current) return;
    recoveryAction.current = true;
    setRecoveryBusy(true);
    try {
      const data = await local.recoveryArchive();
      download(
        new TextEncoder().encode(data),
        "GlyphSprout-storage-recovery.json",
        "application/json",
      );
    } catch (error) {
      setNotice({ key: errorKey(error, "storageUnavailable"), tone: "error" });
    } finally {
      recoveryAction.current = false;
      setRecoveryBusy(false);
    }
  }

  async function resetSavedData() {
    if (recoveryAction.current || !window.confirm(t.resetStorageConfirm))
      return;
    recoveryAction.current = true;
    setRecoveryBusy(true);
    try {
      editor.cancel();
      await local.resetSavedData();
      if (!projectRef.current) await sample("paper", false);
    } catch (error) {
      setNotice({ key: errorKey(error, "storageUnavailable"), tone: "error" });
    } finally {
      recoveryAction.current = false;
      setRecoveryBusy(false);
    }
  }

  function setup(name: string, text: string) {
    try {
      const next = project
        ? {
            ...updateText(project, text),
            name: name.trim(),
          }
        : newProject(name, text);
      const charactersChanged = project && next.id !== project.id;
      if (charactersChanged && !window.confirm(t.charactersChanged))
        return false;
      if (charactersChanged && !changeDrawing(null)) return false;
      commit(next);
      if (charactersChanged) {
        editor.cancel();
        scans.discard();
      }
      if (next.text !== project?.text) setSpecimen(next.text);
      setStage("Pages");
      setNotice({ key: "projectReady" });
      return true;
    } catch (error) {
      setNotice({ key: errorKey(error), tone: "error" });
      return false;
    }
  }

  function clear(character: string) {
    const current = projectRef.current;
    if (!current) return;
    if (!changeDrawing(null)) return;
    editor.cancel(character);
    const glyphs = { ...current.glyphs };
    delete glyphs[character];
    commit({ ...current, glyphs });
  }

  async function exportFile(format: "ttf" | "woff2", partial: boolean) {
    if (!project) return;
    setExportBusy(true);
    try {
      if (!(await editor.flush())) return;
      const current = projectRef.current;
      if (!current || current.id !== project.id) return;
      const data = await exportFont(current, format, partial);
      if (projectRef.current !== current) return;
      download(data, fontFilename(current.name, format), `font/${format}`);
      setNotice({ key: "fontReady" });
    } catch (error) {
      setNotice({
        key: errorKey(error, format === "woff2" ? "woffError" : "invalidFont"),
        tone: "error",
      });
    } finally {
      setExportBusy(false);
    }
  }

  async function copyCss() {
    if (!project) return;
    try {
      await navigator.clipboard.writeText(webFontCss(project.name));
      setNotice({ key: "cssCopied" });
    } catch {
      setNotice({ key: "cssCopyFailed", tone: "error" });
    }
  }

  async function exportSpecimen() {
    if (!project || !preview.family) return;
    const text = Array.from(specimen.normalize("NFC"))
      .filter((ch) => /\s/u.test(ch) || project.glyphs[ch]?.contours.length)
      .join("");
    if (!text.trim()) {
      setNotice({ key: "specimenEmpty", tone: "error" });
      return;
    }
    try {
      download(
        await renderSpecimen(preview.family, text, project.name),
        fontFilename(`${project.name}-specimen`, "png"),
        "image/png",
      );
    } catch (error) {
      setNotice({ key: errorKey(error, "invalidFont"), tone: "error" });
    }
  }

  if (local.loading) return <main className="loading">{t.loading}</main>;
  const occurrences = new Map<string, number>();
  const specimenLetters = Array.from(specimen.normalize("NFC")).map(
    (character) => {
      const occurrence = (occurrences.get(character) ?? 0) + 1;
      occurrences.set(character, occurrence);
      return { character, key: `${character}-${occurrence}` };
    },
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label={t.app}>
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <path d="M7 31V9l13 15L33 9v22M7 9h9M24 31h9" />
            <circle cx="20" cy="24" r="2" />
          </svg>
          <span>GlyphSprout</span>
        </a>
        <p className="tagline">{t.tagline}</p>
        <div className="top-controls">
          <label className="sr-only" htmlFor="locale">
            {t.language}
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {languages.map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="theme">
            {t.theme}
          </label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="system">{t.system}</option>
            <option value="light">{t.light}</option>
            <option value="dark">{t.dark}</option>
          </select>
          <a
            className="icon-button"
            href="https://github.com/Arthur031221/GlyphSprout"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <ArrowSquareOut />
          </a>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <span className="eyebrow">{t.localWorkshop}</span>
            <h1>{t.tagline}</h1>
            <p>
              <ShieldCheck size={17} />
              {t.privacyHelp}
            </p>
          </div>
          <div className="sample-actions">
            <button
              className="sample-button"
              type="button"
              disabled={locked}
              onClick={() => {
                void sample("paper");
              }}
            >
              <Leaf />
              {t.loadSample}
            </button>
            <button
              className="quiet-button"
              type="button"
              disabled={locked}
              onClick={() => {
                void sample("synthetic");
              }}
            >
              {t.loadSynthetic}
            </button>
          </div>
        </section>
        <section className="specimen-hero" aria-label={t.fontPreview}>
          <div className="specimen-side">
            <div className="hero-label">
              <span>{t.fontPreview}</span>
              <span
                className={`live-dot ${preview.family ? "ready" : "pending"}`}
              />
            </div>
            <p
              className="hero-copy"
              style={{
                fontFamily: preview.family ? `"${preview.family}"` : "inherit",
                ...(specimenSize ? { fontSize: `${specimenSize}px` } : {}),
              }}
            >
              {preview.family ? (
                specimenLetters.map(({ character: ch, key }) => {
                  const absent =
                    !/\s/u.test(ch) && !project?.glyphs[ch]?.contours.length;
                  return (
                    <span
                      key={key}
                      className={absent ? "missing-preview" : undefined}
                      title={
                        absent
                          ? project?.characters.includes(ch)
                            ? t.missingPreview
                            : t.unsupportedPreview
                          : undefined
                      }
                    >
                      {ch}
                    </span>
                  );
                })
              ) : (
                <span className="specimen-placeholder">{t.readyHint}</span>
              )}
            </p>
            <div className="hero-foot">
              <strong>{project?.name ?? "GlyphSprout"}</strong>
              <span>
                {project
                  ? `${project.characters.length - missing.length} / ${project.characters.length} ${t.charactersLabel}`
                  : ""}
              </span>
            </div>
          </div>
          <div className="hero-tools">
            <label>
              {t.previewText}
              <textarea
                rows={3}
                value={specimen}
                maxLength={1000}
                onChange={(e) => setSpecimen(e.target.value)}
              />
            </label>
            <label className="zoom-control">
              {t.previewZoom}
              <input
                type="range"
                min={24}
                max={160}
                step={4}
                value={specimenSize ?? 80}
                onChange={(e) => setSpecimenSize(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="specimen-download"
              disabled={!preview.family || preview.busy || editor.busy}
              onClick={() => void exportSpecimen()}
            >
              <DownloadSimple />
              {t.downloadSpecimen}
            </button>
            {project && (
              <button
                type="button"
                className="primary specimen-download"
                disabled={
                  missing.length > 0 ||
                  exportBusy ||
                  drawingDirty ||
                  editor.busy
                }
                aria-describedby={missing.length ? "hero-font-gate" : undefined}
                onClick={() => void exportFile("ttf", false)}
              >
                <DownloadSimple />
                {t.downloadFontQuick}
              </button>
            )}
            {project && missing.length > 0 && (
              <small id="hero-font-gate" className="hero-font-gate">
                {t.missingGate}
              </small>
            )}
            <div className="preview-diagnostics" role="status">
              {editor.busy ? (
                t.applyingEdits
              ) : preview.busy ? (
                t.fontPreparing
              ) : preview.error ? (
                <span className="bad">{t[preview.error]}</span>
              ) : preview.family ? (
                t.fontReady
              ) : (
                t.noGlyph
              )}
            </div>
            {project?.id === "nist-sd19" && (
              <p className="sample-disclosure">{t.paperSampleNote}</p>
            )}
            {project?.id === "synthetic" && (
              <p className="sample-disclosure">{t.syntheticSampleNote}</p>
            )}
          </div>
        </section>
        <nav className="stage-nav" aria-label={t.workshopStages}>
          {(["Characters", "Pages", "Workshop"] as const).map((id, i) => (
            <button
              type="button"
              key={id}
              className={stage === id ? "selected" : ""}
              aria-current={stage === id ? "step" : undefined}
              disabled={!project && id !== "Characters"}
              onClick={() => setStage(id)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {t[`stage${id}`]}
            </button>
          ))}
        </nav>
        {notice && (
          <div
            className={`notice ${notice.tone === "error" ? "bad" : ""}`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            <span>
              {t[notice.key]} {notice.detail}
            </span>
            <button
              type="button"
              aria-label={t.dismiss}
              onClick={() => setNotice(null)}
            >
              {t.dismiss}
            </button>
          </div>
        )}
        {local.recovered && (
          <p className="notice" role="status">
            {t.recoveredPrevious}
          </p>
        )}
        {local.recoveryFailed && (
          <div className="notice bad recovery-notice" role="alert">
            <span>{t.recoveryFailed}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => void recoveryBackup()}
            >
              {t.downloadRecovery}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void resetSavedData()}
            >
              {t.resetStorage}
            </button>
          </div>
        )}
        <div className="toolbar">
          <div className="project-label">
            <strong>{project?.name ?? t.newProject}</strong>
            <small className={local.saveError ? "bad" : ""} role="status">
              {local.saveError
                ? t[local.saveError]
                : setupDirty
                  ? t.setupDraftStatus
                  : local.saveState === "saving"
                    ? t.saving
                    : local.saveState === "saved"
                      ? t.saved
                      : t.savePending}
            </small>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              disabled={!local.canUndo || locked}
              onClick={undoProject}
              aria-keyshortcuts="Control+Z Meta+Z"
              aria-label={t.undo}
            >
              <ArrowCounterClockwise />
              {t.undo}
            </button>
            <button
              type="button"
              disabled={!local.canRedo || locked}
              onClick={redoProject}
              aria-keyshortcuts="Control+Shift+Z Control+Y Meta+Shift+Z"
              aria-label={t.redo}
            >
              <ArrowClockwise />
              {t.redo}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                chooseProject((file) => {
                  void open(file);
                })
              }
            >
              <FileArrowUp />
              {t.import}
            </button>
            <button
              type="button"
              disabled={!project || exportBusy}
              onClick={() => void backup()}
            >
              <DownloadSimple />
              {t.export}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                if (project && !window.confirm(t.newProjectConfirm)) return;
                replace(newProject("My Handwriting", "Hello world!"));
                setStage("Characters");
                setNotice(null);
              }}
            >
              <Plus />
              {t.newProject}
            </button>
            {local.saveError && local.saveError !== "saveConflict" && (
              <button type="button" disabled={locked} onClick={local.retrySave}>
                {t.saveRetry}
              </button>
            )}
          </div>
        </div>
        <fieldset className="stage-content" disabled={locked}>
          <div hidden={!!project && stage !== "Characters"}>
            <Setup
              key={setupVersion}
              project={project}
              t={t}
              onApply={setup}
              onDirtyChange={setSetupDirty}
            />
          </div>
          {project && stage === "Pages" ? (
            <Pages project={project} t={t} scans={scans} notify={setNotice} />
          ) : null}
          {project && (
            <div hidden={stage !== "Workshop"}>
              <Workshop
                key={project.id}
                project={project}
                t={t}
                selected={selected}
                onSelect={(character) => {
                  if (character === selected || !changeDrawing(null)) return;
                  setSelected(character);
                }}
                editor={editor}
                onClear={clear}
                onExport={(format, partial) => {
                  void exportFile(format, partial);
                }}
                onCopyCss={() => {
                  void copyCss();
                }}
                exportBusy={exportBusy || drawingDirty}
                drawing={drawing}
                drawingVersion={drawingVersion}
                onDrawingChange={changeDrawing}
                onDrawingDirtyChange={setDrawingDirty}
              />
            </div>
          )}
        </fieldset>
        {setupDirty && (
          <p className="notice draft-notice setup-draft-notice" role="status">
            {t.setupUnsaved}
          </p>
        )}
        {(drawingDirty || scans.drafts.length > 0) && (
          <p className="notice draft-notice" role="status">
            {drawingDirty ? t.drawingUnsaved : t.scansUnsaved}
          </p>
        )}
        {scans.busy && (
          <div className="scan-job" role="status">
            <span>
              {t.scanProgress}: {scans.progress.done} / {scans.progress.total}
            </span>
            <progress
              max={Math.max(1, scans.progress.total)}
              value={scans.progress.done}
            />
            <button type="button" onClick={scans.cancel}>
              {t.stopConversion}
            </button>
          </div>
        )}
        <footer className="app-footer">
          <span>
            <ShieldCheck />
            {t.localWorkshop}
          </span>
          <span>{offlineReady ? t.offlineReady : t.offlineFirstLoad}</span>
          <a
            href="https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowSquareOut />
          </a>
        </footer>
      </main>
    </div>
  );
}
