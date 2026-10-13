import { validateProject } from "./project";
import type { Project } from "./types";

const DATABASE = "GlyphSprout-workshop-v1";
interface Head {
  key: "active";
  sequence: number;
  previous: number | null;
  token: string;
  empty?: boolean;
}
interface Revision {
  sequence: number;
  project: Project;
}
export interface StorageVersion {
  sequence: number;
  token: string | null;
}
export interface Recovery extends StorageVersion {
  project: Project | null;
  recoveredPrevious: boolean;
  failed: boolean;
}

function versionOf(head: Head | undefined): StorageVersion {
  return { sequence: head?.sequence ?? 0, token: head?.token ?? null };
}
function matches(head: Head | undefined, expected: StorageVersion): boolean {
  const actual = versionOf(head);
  return (
    actual.sequence === expected.sequence && actual.token === expected.token
  );
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("storageUnavailable"));
  });
}

function complete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("storageUnavailable"));
    tx.onerror = () => reject(tx.error ?? new Error("storageUnavailable"));
  });
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("assets");
      req.result.createObjectStore("revisions", { keyPath: "sequence" });
      req.result.createObjectStore("head", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("storageUnavailable"));
    req.onblocked = () => reject(new Error("storageUnavailable"));
  });
}

async function assetId(data: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return [...new Uint8Array(hash)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

async function freeze(project: Project) {
  const copy = validateProject(project);
  const assets = new Map<string, string>();
  async function reference(data: string): Promise<string> {
    const id = await assetId(data);
    assets.set(id, data);
    return `asset:${id}`;
  }
  for (const glyph of Object.values(copy.glyphs))
    glyph.source = await reference(glyph.source);
  for (const page of copy.pages) page.image = await reference(page.image);
  return { project: copy, assets };
}

async function hydrate(db: IDBDatabase, revision: Revision): Promise<Project> {
  const copy = structuredClone(revision.project);
  const tx = db.transaction("assets", "readonly");
  const done = complete(tx);
  void done.catch(() => {});
  const store = tx.objectStore("assets");
  const sources = [
    ...Object.values(copy.glyphs).map((g) => g.source),
    ...copy.pages.map((p) => p.image),
  ];
  const unique = [...new Set(sources)];
  const pending = unique.map((source) => {
    if (!source.startsWith("asset:")) throw new Error("invalidProject");
    return request(
      store.get(source.slice(6)) as IDBRequest<string | undefined>,
    ).then((data) => [source, data] as const);
  });
  const data = new Map(await Promise.all(pending));
  await done;
  for (const [reference, source] of data) {
    if (
      typeof source !== "string" ||
      reference !== `asset:${await assetId(source)}`
    )
      throw new Error("invalidProject");
  }
  for (const g of Object.values(copy.glyphs)) {
    const source = data.get(g.source);
    if (!source) throw new Error("invalidProject");
    g.source = source;
  }
  for (const p of copy.pages) {
    const source = data.get(p.image);
    if (!source) throw new Error("invalidProject");
    p.image = source;
  }
  return validateProject(copy);
}

async function savedState(db: IDBDatabase) {
  const tx = db.transaction(["head", "revisions"], "readonly");
  const done = complete(tx);
  void done.catch(() => {});
  const head = await request(
    tx.objectStore("head").get("active") as IDBRequest<Head | undefined>,
  );
  const revisions = await request(
    tx.objectStore("revisions").getAll() as IDBRequest<Revision[]>,
  );
  await done;
  for (const sequence of [head?.sequence, head?.previous]) {
    const revision = revisions.find((r) => r.sequence === sequence);
    if (!revision) continue;
    try {
      return {
        head,
        revision,
        project: await hydrate(db, revision),
        stored: true,
      };
    } catch {}
  }
  return {
    head,
    revision: undefined,
    project: null,
    stored: (!!head && !head.empty) || revisions.length > 0,
  };
}

export async function recoverProject(): Promise<Recovery> {
  const db = await database();
  try {
    const state = await savedState(db);
    return {
      project: state.project,
      ...versionOf(state.head),
      recoveredPrevious:
        !!state.head &&
        !!state.revision &&
        state.revision.sequence !== state.head.sequence,
      failed: state.stored && !state.revision,
    };
  } finally {
    db.close();
  }
}

export async function saveProject(
  project: Project,
  expected: StorageVersion,
): Promise<StorageVersion> {
  const snapshot = await freeze(project);
  const db = await database();
  try {
    const state = await savedState(db);
    if (!matches(state.head, expected)) throw new Error("saveConflict");
    if (state.stored && !state.revision) throw new Error("recoveryFailed");
    const previous = state.revision;
    const tx = db.transaction(["assets", "revisions", "head"], "readwrite");
    const done = complete(tx);
    // Transaction errors can precede a request error. Keep this rejection observed.
    void done.catch(() => {});
    const headStore = tx.objectStore("head");
    const head = await request(
      headStore.get("active") as IDBRequest<Head | undefined>,
    );
    if (!matches(head, expected)) {
      tx.abort();
      await done.catch(() => {});
      throw new Error("saveConflict");
    }
    const sequence = expected.sequence + 1;
    const token = crypto.randomUUID();
    const keep = new Set(snapshot.assets.keys());
    if (previous) {
      for (const glyph of Object.values(previous.project.glyphs))
        keep.add(glyph.source.slice(6));
      for (const page of previous.project.pages) keep.add(page.image.slice(6));
    }
    for (const [id, data] of snapshot.assets)
      tx.objectStore("assets").put(data, id);
    const cursor = tx.objectStore("assets").openKeyCursor();
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) return;
      if (!keep.has(String(entry.key)))
        tx.objectStore("assets").delete(entry.key);
      entry.continue();
    };
    tx.objectStore("revisions").put({
      sequence,
      project: snapshot.project,
    } satisfies Revision);
    const revisionCursor = tx.objectStore("revisions").openKeyCursor();
    revisionCursor.onsuccess = () => {
      const entry = revisionCursor.result;
      if (!entry) return;
      if (entry.key !== sequence && entry.key !== previous?.sequence)
        tx.objectStore("revisions").delete(entry.key);
      entry.continue();
    };
    headStore.put({
      key: "active",
      sequence,
      previous: previous?.sequence ?? null,
      token,
    } satisfies Head);
    await done;
    return { sequence, token };
  } finally {
    db.close();
  }
}

export async function exportStoredData(
  expected: StorageVersion,
): Promise<string> {
  const db = await database();
  try {
    const tx = db.transaction(["assets", "revisions", "head"], "readonly");
    const done = complete(tx);
    void done.catch(() => {});
    const assets = tx.objectStore("assets");
    const [keys, values, revisions, head] = await Promise.all([
      request(assets.getAllKeys()),
      request(assets.getAll()),
      request(tx.objectStore("revisions").getAll()),
      request(tx.objectStore("head").getAll()),
    ]);
    await done;
    if (
      !matches(
        head.find((entry: Head) => entry.key === "active"),
        expected,
      )
    )
      throw new Error("saveConflict");
    return JSON.stringify({
      format: "glyphsprout-storage-recovery",
      version: 1,
      assets: keys.map((key, index) => [key, values[index]]),
      revisions,
      head,
    });
  } finally {
    db.close();
  }
}

export async function clearStoredData(
  expected: StorageVersion,
): Promise<StorageVersion> {
  const db = await database();
  try {
    const tx = db.transaction(["assets", "revisions", "head"], "readwrite");
    const done = complete(tx);
    void done.catch(() => {});
    const head = await request(
      tx.objectStore("head").get("active") as IDBRequest<Head | undefined>,
    );
    if (!matches(head, expected)) {
      tx.abort();
      await done.catch(() => {});
      throw new Error("saveConflict");
    }
    for (const name of ["assets", "revisions"]) tx.objectStore(name).clear();
    const next = {
      sequence: expected.sequence + 1,
      token: crypto.randomUUID(),
    };
    tx.objectStore("head").put({
      key: "active",
      ...next,
      previous: null,
      empty: true,
    } satisfies Head);
    await done;
    return next;
  } finally {
    db.close();
  }
}
