/// <reference lib="webworker" />
import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import { modelSource } from "./model-source";

// El modelo se baja la primera vez y el navegador lo guarda en caché. En producción viene del propio bucket
// (`NEXT_PUBLIC_MODEL_BASE_URL`, ver docs/deploy.md); sin la variable (desarrollo), del Hub de Hugging Face.
env.allowLocalModels = false;
const source = modelSource(process.env.NEXT_PUBLIC_MODEL_BASE_URL);
if (source) {
  env.remoteHost = source.remoteHost;
  env.remotePathTemplate = source.remotePathTemplate;
}

const MODEL_ID = "Xenova/modnet";
// Lado mayor del PNG resultante. A tamaño completo, una foto de celular de 12 MP pasa de 15 MB en PNG con
// transparencia y la subida se rechaza; 2400 px sobra para la variante más grande (1200×1800).
const MAX_OUTPUT_SIDE = 2400;

type Request = { id: number; blob: Blob };

let loading: Promise<{ model: Awaited<ReturnType<typeof AutoModel.from_pretrained>>; processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> }> | null = null;

function loadModel(onProgress: (value: number) => void) {
  loading ??= (async () => {
    const options = {
      progress_callback: (event: { status: string; progress?: number }) => {
        if (event.status === "progress" && typeof event.progress === "number") onProgress(event.progress / 100);
      },
    };
    const [model, processor] = await Promise.all([
      AutoModel.from_pretrained(MODEL_ID, { dtype: "fp32", ...options }),
      AutoProcessor.from_pretrained(MODEL_ID, options),
    ]);
    return { model, processor };
  })();
  // Si la descarga falla, el próximo intento vuelve a empezar.
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

async function removeBackground(blob: Blob, onProgress: (value: number) => void): Promise<Blob> {
  const { model, processor } = await loadModel(onProgress);
  const image = await RawImage.fromBlob(blob);
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(width, height);

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas no disponible");

  const bitmap = await createImageBitmap(blob);
  context.drawImage(bitmap, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  for (let i = 0; i < mask.data.length; i++) {
    pixels.data[4 * i + 3] = mask.data[i];
  }
  context.putImageData(pixels, 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

self.addEventListener("message", async (event: MessageEvent<Request>) => {
  const { id, blob } = event.data;
  try {
    const result = await removeBackground(blob, (value) => self.postMessage({ id, type: "progress", value }));
    self.postMessage({ id, type: "done", blob: result });
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : "Error desconocido" });
  }
});
