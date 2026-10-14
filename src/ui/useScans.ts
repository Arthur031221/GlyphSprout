import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { validateCorners } from "../core/geometry";
import { pageCount, TEMPLATE } from "../core/template";
import type { Glyph, Point, Project, ScanPage } from "../core/types";
import { createScanWorker } from "../worker/client";
import { imageData } from "./browser";
import { errorKey } from "./i18n";
import type { Notice } from "./useGlyphEditor";

export interface DraftPage extends ScanPage {
  filename: string;
  confirmed: boolean;
}
interface ScanResult {
  pageId: string;
  pageGlyphs: Omit<Glyph, "reviewed" | "origin">[];
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
  useEffect(
    () => () => {
      worker.current?.terminate();
      readVersion.current++;
    },
    [],
  );

  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    readVersion.current++;
    setBusy(false);
    setReading(false);
    setDrafts([]);
    setIndex(0);
  }

  function change(next: Partial<DraftPage>) {
    if (busy || reading) return;
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
    change({ corners });
  }

  async function add(files: File[]) {
    const snapshot = projectRef.current;
    if (!snapshot || busy || reading) return;
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
        const decoded = await imageData(file);
        let pageIndex = 0;
        while (used.has(pageIndex)) pageIndex++;
        used.add(pageIndex);
        next.push({
          id: crypto.randomUUID(),
          pageIndex,
          filename: file.name,
          confirmed: false,
          ...decoded,
          corners: TEMPLATE.markers.map((p) => ({
            x: p.x,
            y: p.y,
          })) as DraftPage["corners"],
        });
        // Default crosses are proportional to the whole image, then adjusted by the user.
        const page = next.at(-1);
        if (page)
          page.corners = TEMPLATE.markers.map((p) => ({
            x: (p.x / TEMPLATE.width) * page.width,
            y: (p.y / TEMPLATE.height) * page.height,
          })) as DraftPage["corners"];
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
          const pages = snapshot.pages.filter(
            (page) =>
              !drafts.some((draft) => draft.pageIndex === page.pageIndex),
          );
          for (const result of message.results) {
            for (const glyph of result.pageGlyphs)
              glyphs[glyph.character] = {
                ...glyph,
                reviewed: false,
                origin: "scan",
              };
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
              ...drafts.map(({ filename: _, confirmed: __, ...page }) => page),
            ],
          });
          setDrafts([]);
          setIndex(0);
          notify({ key: "scanComplete" });
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
  };
}
