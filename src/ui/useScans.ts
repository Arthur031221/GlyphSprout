import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { validateCorners } from "../core/geometry";
import { listCells } from "../core/scan";
import { pageCount, TEMPLATE } from "../core/template";
import type { Glyph, Point, Project, ScanPage } from "../core/types";
import { createScanWorker } from "../worker/client";
import { imageData } from "./browser";
import { errorKey } from "./i18n";
import type { Notice } from "./useGlyphEditor";

export interface DraftPage extends ScanPage {
  templateId: string;
  filename: string;
  confirmed: boolean;
  autoCorners: boolean;
}
interface ScanResult {
  pageId: string;
  pageGlyphs: (Omit<Glyph, "reviewed" | "origin"> & {
    needsRepair?: boolean;
  })[];
}
type Response = { jobId: string; projectId: string } & (
  | { type: "progress"; done: number; total: number }
  | { type: "done"; results: ScanResult[] }
  | { type: "error"; message: string }
);

export function useScans(
  projectRef: MutableRefObject<Project | null>,
  commit: (project: Project) => void,
  notify: (notice: Notice) => void,
  replaceWarning: string,
  beforeRun: (pages: DraftPage[]) => boolean,
) {
  const [drafts, setDrafts] = useState<DraftPage[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const worker = useRef<Worker | null>(null);
  const readVersion = useRef(0);
  const compatible = drafts.every(
    (page) => page.templateId === projectRef.current?.id,
  );
  useEffect(
    () => () => {
      worker.current?.terminate();
      readVersion.current++;
    },
    [],
  );

  function stop() {
    worker.current?.terminate();
    worker.current = null;
    readVersion.current++;
    setBusy(false);
    setReading(false);
    setProgress({ done: 0, total: 0 });
  }

  function cancel() {
    stop();
    notify({ key: "scanCanceled" });
  }

  function discard() {
    stop();
    setDrafts([]);
    setIndex(0);
  }

  function change(next: Partial<DraftPage>) {
    if (busy || reading || !compatible) return;
    setDrafts((current) =>
      current.map((page, i) =>
        i === index
          ? { ...page, ...next, confirmed: next.confirmed ?? false }
          : page,
      ),
    );
  }

  function remove(id: string) {
    if (busy || reading) return;
    const removed = drafts.findIndex((page) => page.id === id);
    if (removed < 0) return;
    setDrafts((current) => current.filter((page) => page.id !== id));
    setIndex((current) =>
      Math.max(
        0,
        current > removed ? current - 1 : Math.min(current, drafts.length - 2),
      ),
    );
  }

  function corner(cornerIndex: number, point: Point) {
    if (busy || reading) return;
    const page = drafts[index];
    if (!page) return;
    const corners = page.corners.map((p, i) =>
      i === cornerIndex ? point : p,
    ) as DraftPage["corners"];
    change({ corners, autoCorners: false });
  }

  async function add(files: File[]) {
    const snapshot = projectRef.current;
    if (!snapshot || busy || reading) return;
    if (!compatible) {
      notify({ key: "scanTemplateChanged", tone: "error" });
      return;
    }
    if (files.length + drafts.length > pageCount(snapshot.characters)) {
      notify({ key: "pageLimit", tone: "error" });
      return;
    }
    const version = ++readVersion.current;
    setReading(true);
    try {
      const next: DraftPage[] = [];
      const used = new Set(drafts.map((p) => p.pageIndex));
      for (const file of files) {
        const { detected, ...decoded } = await imageData(file);
        let pageIndex = 0;
        while (used.has(pageIndex)) pageIndex++;
        used.add(pageIndex);
        // Without detected crosses, guess where a page-filling scan would show them.
        next.push({
          id: crypto.randomUUID(),
          templateId: snapshot.id,
          pageIndex,
          filename: file.name,
          confirmed: false,
          autoCorners: Boolean(detected),
          ...decoded,
          corners: (detected ??
            TEMPLATE.markers.map((p) => ({
              x: (p.x / TEMPLATE.width) * decoded.width,
              y: (p.y / TEMPLATE.height) * decoded.height,
            }))) as DraftPage["corners"],
        });
      }
      if (readVersion.current !== version || projectRef.current !== snapshot)
        return;
      setDrafts((current) => [...current, ...next]);
      setIndex(drafts.length);
    } catch (error) {
      notify({ key: errorKey(error, "decodeFailed"), tone: "error" });
    } finally {
      if (readVersion.current === version) setReading(false);
    }
  }

  function run(size: number) {
    const snapshot = projectRef.current;
    if (!snapshot || busy || !drafts.length) return;
    try {
      if (drafts.some((page) => page.templateId !== snapshot.id))
        throw new Error("scanTemplateChanged");
      if (new Set(drafts.map((p) => p.pageIndex)).size !== drafts.length)
        throw new Error("duplicatePage");
      for (const page of drafts) {
        validateCorners(page.corners, page.width, page.height);
        if (!page.confirmed) throw new Error("confirmPage");
      }
      if (
        drafts.some((p) =>
          snapshot.characters
            .slice(p.pageIndex * 35, (p.pageIndex + 1) * 35)
            .some((ch) => snapshot.glyphs[ch]),
        ) &&
        !window.confirm(replaceWarning)
      )
        return;
      if (!beforeRun(drafts)) return;
      const scanWorker = createScanWorker();
      worker.current = scanWorker;
      const jobId = crypto.randomUUID();
      setBusy(true);
      setProgress({
        done: 0,
        total: drafts.reduce(
          (n, page) =>
            n +
            snapshot.characters.slice(
              page.pageIndex * 35,
              (page.pageIndex + 1) * 35,
            ).length,
          0,
        ),
      });
      const finish = () => {
        scanWorker.terminate();
        if (worker.current === scanWorker) worker.current = null;
        setBusy(false);
      };
      scanWorker.onerror = () => {
        if (worker.current !== scanWorker) return;
        finish();
        notify({ key: "scanFailed", tone: "error" });
      };
      scanWorker.onmessage = (event: MessageEvent<Response>) => {
        const message = event.data;
        if (
          worker.current !== scanWorker ||
          message.jobId !== jobId ||
          message.projectId !== snapshot.id
        )
          return;
        if (projectRef.current !== snapshot) {
          finish();
          notify({ key: "scanStale", tone: "error" });
          return;
        }
        if (message.type === "progress") {
          setProgress(message);
          return;
        }
        finish();
        if (message.type === "error") {
          notify({
            key: errorKey(new Error(message.message), "scanFailed"),
            tone: "error",
          });
          return;
        }
        try {
          const glyphs = { ...snapshot.glyphs };
          const repairs: string[] = [];
          const blanks: string[] = [];
          const pages = snapshot.pages.filter(
            (page) =>
              !drafts.some((draft) => draft.pageIndex === page.pageIndex),
          );
          for (const result of message.results) {
            for (const { needsRepair, ...glyph } of result.pageGlyphs) {
              if (needsRepair) repairs.push(glyph.character);
              else if (!glyph.contours.length) blanks.push(glyph.character);
              glyphs[glyph.character] = {
                ...glyph,
                reviewed: false,
                origin: "scan",
              };
            }
          }
          // Replacing a page also retires old associations, including empty glyph cells.
          const retired = new Set(
            snapshot.pages
              .filter((page) => !pages.includes(page))
              .map((page) => page.id),
          );
          for (const [ch, glyph] of Object.entries(glyphs)) {
            if (glyph.pageId && retired.has(glyph.pageId)) {
              const { pageId: _, ...detached } = glyph;
              glyphs[ch] = detached;
            }
          }
          commit({
            ...snapshot,
            glyphs,
            pages: [
              ...pages,
              ...drafts.map(
                ({
                  filename: _,
                  confirmed: __,
                  templateId: ___,
                  autoCorners: ____,
                  ...page
                }) => page,
              ),
            ],
          });
          setDrafts([]);
          setIndex(0);
          if (repairs.length)
            notify({ key: "scanRepair", detail: listCells(repairs) });
          else if (blanks.length)
            notify({ key: "scanBlank", detail: listCells(blanks) });
          else notify({ key: "scanComplete" });
        } catch (error) {
          notify({ key: errorKey(error, "scanFailed"), tone: "error" });
        }
      };
      scanWorker.postMessage({
        jobId,
        projectId: snapshot.id,
        pages: drafts,
        characters: snapshot.characters,
        size,
      });
    } catch (error) {
      notify({ key: errorKey(error, "scanFailed"), tone: "error" });
    }
  }
  return {
    drafts,
    compatible,
    index,
    setIndex,
    busy,
    reading,
    progress,
    add,
    change,
    remove,
    corner,
    run,
    cancel,
    discard,
  };
}
