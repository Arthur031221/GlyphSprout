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
import { exportFont, fontFilename, missingCharacters } from "../core/font";
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
import { useFontPreview } from "./useFontPreview";
import { type Notice, useGlyphEditor } from "./useGlyphEditor";
import { useProject } from "./useProject";
import { useScans } from "./useScans";
import { Workshop } from "./Workshop";

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
  const [specimen, setSpecimen] = useState("HELLO JOB");
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
  const scans = useScans(projectRef, commit, setNotice, t.replaceWarning);
  const locked = scans.busy || scans.reading || sampleBusy || recoveryBusy;
  const missing = project ? missingCharacters(project) : [];

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
    if (!projectRef.current && !local.recoveryFailed)
      void sample("paper", false);
  }, [local.loading]);

  function replace(next: Project) {
    scans.cancel();
    commit(next, "replace");
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

  function backup() {
    try {
      if (project) downloadProject(project);
    } catch (error) {
      setNotice({ key: errorKey(error), tone: "error" });
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
      if (
        project &&
        text !== project.text &&
        !window.confirm(t.charactersChanged)
      )
        return;
      commit(
        project
          ? {
              ...(text === project.text ? project : updateText(project, text)),
              name: name.trim(),
            }
          : newProject(name, text),
      );
      scans.cancel();
      setStage("Pages");
      setNotice({ key: "projectReady" });
    } catch (error) {
      setNotice({ key: errorKey(error), tone: "error" });
    }
  }

  function clear(character: string) {
    if (!project) return;
    const glyphs = { ...project.glyphs };
    delete glyphs[character];
    commit({ ...project, glyphs });
  }

  async function exportFile(format: "ttf" | "woff2", partial: boolean) {
    if (!project) return;
    setExportBusy(true);
    try {
      const data = await exportFont(project, format, partial);
      download(data, fontFilename(project.name, format), `font/${format}`);
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

  if (local.loading) return <main className="loading">{t.loading}</main>;
  const occurrences = new Map<string, number>();
  const specimenLetters = Array.from(specimen).map((character) => {
    const occurrence = (occurrences.get(character) ?? 0) + 1;
    occurrences.set(character, occurrence);
    return { character, key: `${character}-${occurrence}` };
  });

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
              }}
              aria-live="polite"
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
            <div className="preview-diagnostics" role="status">
              {preview.busy ? (
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
              onClick={local.undo}
              aria-label={t.undo}
            >
              <ArrowCounterClockwise />
              {t.undo}
            </button>
            <button
              type="button"
              disabled={!local.canRedo || locked}
              onClick={local.redo}
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
            <button type="button" disabled={!project} onClick={backup}>
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
          {!project || stage === "Characters" ? (
            <Setup
              key={project?.id ?? "new"}
              project={project}
              t={t}
              onApply={setup}
            />
          ) : stage === "Pages" ? (
            <Pages project={project} t={t} scans={scans} notify={setNotice} />
          ) : (
            <Workshop
              key={project.id}
              project={project}
              t={t}
              selected={selected}
              onSelect={setSelected}
              editor={editor}
              onClear={clear}
              onExport={(format, partial) => {
                void exportFile(format, partial);
              }}
              exportBusy={exportBusy}
            />
          )}
        </fieldset>
        {scans.busy && (
          <div className="scan-job" role="status">
            <span>
              {t.scanProgress}: {scans.progress.done} / {scans.progress.total}
            </span>
            <progress
              max={Math.max(1, scans.progress.total)}
              value={scans.progress.done}
            />
            <button
              type="button"
              onClick={() => {
                scans.cancel();
                setNotice({ key: "scanCanceled" });
              }}
            >
              {t.cancel}
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
