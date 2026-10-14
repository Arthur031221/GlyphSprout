export function createScanWorker(): Worker {
  return new Worker(new URL("./scan.worker.ts", import.meta.url), {
    type: "module",
  });
}

export function createPreviewWorker(): Worker {
  return new Worker(new URL("./preview.worker.ts", import.meta.url), {
    type: "module",
  });
}
