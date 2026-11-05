import { describe, expect, it, vi } from "vitest";
import { removeBackground, type BackgroundWorker } from "./remove-background";

type Listener = (event: MessageEvent) => void;

/** Worker de mentira: guarda lo que recibe y deja al test decidir qué responde. */
function fakeWorker(respond: (message: { id: number; blob: Blob }, reply: (data: unknown) => void) => void) {
  const listeners = { message: new Set<Listener>(), error: new Set<Listener>() };
  const worker: BackgroundWorker & { received: unknown[]; crash(): void } = {
    received: [],
    postMessage(message) {
      worker.received.push(message);
      queueMicrotask(() =>
        respond(message, (data) => listeners.message.forEach((listener) => listener({ data } as MessageEvent))),
      );
    },
    addEventListener: (type, listener) => listeners[type].add(listener as Listener),
    removeEventListener: (type, listener) => listeners[type].delete(listener as Listener),
    crash: () => listeners.error.forEach((listener) => listener({ data: null } as MessageEvent)),
  };
  return worker;
}

describe("removeBackground", () => {
  it("sends the blob to the worker and resolves with the PNG it returns", async () => {
    const input = new Blob(["foto"], { type: "image/jpeg" });
    const output = new Blob(["sin fondo"], { type: "image/png" });
    const worker = fakeWorker(({ id }, reply) => reply({ id, type: "done", blob: output }));

    const result = await removeBackground(input, undefined, worker);

    expect(result).toBe(output);
    expect(worker.received).toEqual([{ id: expect.any(Number), blob: input }]);
  });

  it("reports model download progress", async () => {
    const onProgress = vi.fn();
    const worker = fakeWorker(({ id }, reply) => {
      reply({ id, type: "progress", value: 0.25 });
      reply({ id, type: "progress", value: 0.1 });
      reply({ id, type: "progress", value: 1 });
      reply({ id, type: "done", blob: new Blob(["x"], { type: "image/png" }) });
    });

    await removeBackground(new Blob(["x"]), onProgress, worker);

    // El progreso nunca retrocede aunque lleguen archivos distintos del modelo.
    expect(onProgress.mock.calls.map(([value]) => value)).toEqual([0.25, 0.25, 1]);
  });

  it("rejects with a friendly message when the worker reports an error", async () => {
    const worker = fakeWorker(({ id }, reply) => reply({ id, type: "error", message: "onnx exploded" }));

    await expect(removeBackground(new Blob(["x"]), undefined, worker)).rejects.toThrow("No se pudo quitar el fondo");
  });

  it("rejects when the worker itself crashes", async () => {
    const worker = fakeWorker(() => worker.crash());

    await expect(removeBackground(new Blob(["x"]), undefined, worker)).rejects.toThrow("No se pudo quitar el fondo");
  });

  it("ignores replies meant for another request", async () => {
    const output = new Blob(["mio"], { type: "image/png" });
    const worker = fakeWorker(({ id }, reply) => {
      reply({ id: id + 999, type: "done", blob: new Blob(["ajeno"], { type: "image/png" }) });
      reply({ id, type: "done", blob: output });
    });

    await expect(removeBackground(new Blob(["x"]), undefined, worker)).resolves.toBe(output);
  });
});
