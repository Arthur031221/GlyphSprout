export function createScanWorker(): Worker {
  return new Worker(new URL("./scan.worker.ts", import.meta.url), {
    type: "module",
  });
}
