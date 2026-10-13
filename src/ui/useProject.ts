import { useEffect, useRef, useState } from "react";
import { validateProject } from "../core/project";
import {
  clearStoredData,
  exportStoredData,
  recoverProject,
  type StorageVersion,
  saveProject,
} from "../core/storage";
import type { Project } from "../core/types";
import type { MessageKey } from "./i18n";

type SaveState = "ready" | "saving" | "saved" | "error";

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const projectRef = useRef<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("ready");
  const [saveError, setSaveError] = useState<MessageKey | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const [history, setHistory] = useState<{
    past: Project[];
    future: Project[];
  }>({ past: [], future: [] });
  const historyRef = useRef(history);
  const storedVersion = useRef<StorageVersion>({ sequence: 0, token: null });
  const version = useRef(0);
  const conflict = useRef(false);
  const alive = useRef(true);
  const saving = useRef(false);
  const resetting = useRef(false);
  const pending = useRef<{ project: Project; version: number } | null>(null);

  useEffect(() => {
    alive.current = true;
    let canceled = false;
    recoverProject()
      .then((result) => {
        if (canceled) return;
        storedVersion.current = {
          sequence: result.sequence,
          token: result.token,
        };
        projectRef.current = result.project;
        setProject(result.project);
        setRecovered(result.recoveredPrevious);
        setRecoveryFailed(result.failed);
        setSaveState(
          result.failed ? "error" : result.project ? "saved" : "ready",
        );
        if (result.failed) setSaveError("recoveryFailed");
      })
      .catch(() => {
        if (canceled) return;
        setSaveError("storageUnavailable");
        setRecoveryFailed(true);
        setSaveState("error");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
      alive.current = false;
    };
  }, []);

  async function flush() {
    if (saving.current || resetting.current || conflict.current) return;
    saving.current = true;
    try {
      while (pending.current && !conflict.current && alive.current) {
        const snapshot = pending.current;
        pending.current = null;
        try {
          storedVersion.current = await saveProject(
            snapshot.project,
            storedVersion.current,
          );
          if (!alive.current) return;
          if (version.current === snapshot.version) {
            setSaveState("saved");
            setSaveError(null);
          }
        } catch (error) {
          if (!alive.current) return;
          const key =
            error instanceof Error ? error.message : "storageUnavailable";
          conflict.current = key === "saveConflict";
          if (key === "recoveryFailed") setRecoveryFailed(true);
          setSaveError(
            conflict.current
              ? "saveConflict"
              : key.toLowerCase().includes("quota")
                ? "storageQuota"
                : key === "recoveryFailed"
                  ? "recoveryFailed"
                  : "storageUnavailable",
          );
          setSaveState("error");
          pending.current = null;
          return;
        }
      }
    } finally {
      saving.current = false;
    }
  }

  function keepHistory(next: typeof history) {
    historyRef.current = next;
    setHistory(next);
  }

  function commit(
    next: Project,
    mode: "edit" | "replace" | "history" = "edit",
  ) {
    validateProject(next);
    const previous = projectRef.current;
    if (mode === "replace") keepHistory({ past: [], future: [] });
    else if (mode === "edit" && previous)
      keepHistory({
        past: [...historyRef.current.past.slice(-19), previous],
        future: [],
      });
    const updated = { ...next, updatedAt: new Date().toISOString() };
    projectRef.current = updated;
    setProject(updated);
    version.current++;
    if (conflict.current) {
      setSaveState("error");
      return;
    }
    pending.current = { project: updated, version: version.current };
    setSaveState("saving");
    setSaveError(null);
    void flush();
  }

  function undo() {
    const current = projectRef.current;
    const previous = historyRef.current.past.at(-1);
    if (!current || !previous) return;
    keepHistory({
      past: historyRef.current.past.slice(0, -1),
      future: [...historyRef.current.future.slice(-19), current],
    });
    commit(previous, "history");
  }

  function redo() {
    const current = projectRef.current;
    const next = historyRef.current.future.at(-1);
    if (!current || !next) return;
    keepHistory({
      past: [...historyRef.current.past.slice(-19), current],
      future: historyRef.current.future.slice(0, -1),
    });
    commit(next, "history");
  }

  function retrySave() {
    if (!projectRef.current || conflict.current) return;
    pending.current = { project: projectRef.current, version: version.current };
    setSaveState("saving");
    setSaveError(null);
    void flush();
  }

  async function resetSavedData() {
    if (saving.current || resetting.current) throw new Error("savePending");
    resetting.current = true;
    try {
      storedVersion.current = await clearStoredData(storedVersion.current);
      conflict.current = false;
      setRecoveryFailed(false);
      setRecovered(false);
      setSaveError(null);
      setSaveState("ready");
    } catch (error) {
      conflict.current =
        error instanceof Error && error.message === "saveConflict";
      setSaveError(conflict.current ? "saveConflict" : "storageUnavailable");
      setSaveState("error");
      pending.current = null;
      throw error;
    } finally {
      resetting.current = false;
    }
    retrySave();
  }

  return {
    project,
    projectRef,
    commit,
    loading,
    saveState,
    saveError,
    recovered,
    recoveryFailed,
    resetSavedData,
    recoveryArchive: () => exportStoredData(storedVersion.current),
    undo,
    redo,
    retrySave,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
