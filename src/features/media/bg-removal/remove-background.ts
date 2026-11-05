const FAILURE_MESSAGE = "No se pudo quitar el fondo";

export type WorkerReply =
  | { id: number; type: "progress"; value: number }
  | { id: number; type: "done"; blob: Blob }
  | { id: number; type: "error"; message: string };

/** Lo mínimo que se usa de un `Worker`, para poder probarlo con uno de mentira. */
export type BackgroundWorker = {
  postMessage(message: { id: number; blob: Blob }): void;
  addEventListener(type: "message" | "error", listener: (event: MessageEvent<WorkerReply>) => void): void;
  removeEventListener(type: "message" | "error", listener: (event: MessageEvent<WorkerReply>) => void): void;
};

let sharedWorker: Worker | null = null;
let nextRequestId = 1;

/** El modelo pesa ~25 MB: se descarga una sola vez y el worker queda vivo para las siguientes fotos. */
function getSharedWorker(): Worker {
  sharedWorker ??= new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  return sharedWorker;
}

/** Quita el fondo en el navegador (nada sale a ningún servidor). Devuelve un PNG con transparencia. */
export function removeBackground(
  file: Blob,
  onProgress?: (progress: number) => void,
  worker: BackgroundWorker = getSharedWorker(),
): Promise<Blob> {
  const id = nextRequestId++;
  let highestProgress = 0;

  return new Promise<Blob>((resolve, reject) => {
    function cleanup() {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleCrash);
    }

    function handleMessage(event: MessageEvent<WorkerReply>) {
      const reply = event.data;
      if (reply.id !== id) return;

      if (reply.type === "progress") {
        highestProgress = Math.max(highestProgress, reply.value);
        onProgress?.(highestProgress);
        return;
      }

      cleanup();
      if (reply.type === "done") resolve(reply.blob);
      else reject(new Error(FAILURE_MESSAGE));
    }

    function handleCrash() {
      cleanup();
      reject(new Error(FAILURE_MESSAGE));
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleCrash);
    worker.postMessage({ id, blob: file });
  });
}
