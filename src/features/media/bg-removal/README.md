# Quitar fondo en el navegador

- **Modelo:** [`Xenova/modnet`](https://huggingface.co/Xenova/modnet) (MODNet exportado a ONNX). Licencia **Apache-2.0** (verificada en la ficha del modelo el 2026-09-28).
- **Librería:** [`@huggingface/transformers`](https://github.com/huggingface/transformers.js), licencia **Apache-2.0**.
- Ambas son permisivas y permiten uso comercial. **No usar** `briaai/RMBG-*` (licencia no comercial).
- El modelo (~25 MB) se descarga la primera vez que alguien usa "Quitar fondo" y el navegador lo guarda en caché. La foto **nunca sale del navegador**. En desarrollo viene del Hub de Hugging Face; **en producción, del propio bucket** (ver abajo).
- Corre en un Web Worker (`worker.ts`) para no congelar la pantalla; `remove-background.ts` es la API que usa el editor.
- **Producción (no depender del Hub):** sube `config.json`, `preprocessor_config.json` y `onnx/model.onnx` de `Xenova/modnet` a `<bucket>/models/Xenova/modnet/` y define `NEXT_PUBLIC_MODEL_BASE_URL=<S3_PUBLIC_URL>/models`. `worker.ts` usa `modelSource()` (`model-source.ts`): con la variable, `env.remoteHost = <base>/` y `env.remotePathTemplate = "{model}/"`; sin ella (o si no es una URL http(s)) sigue el Hub. Es una variable `NEXT_PUBLIC`: se incluye al construir, así que cambiarla pide un nuevo deploy. El CORS del bucket debe permitir `GET` desde el origen del panel (ver `docs/deploy.md`).
- **Verificación en producción:** en el panel, «Quitar fondo» sobre una foto; en la pestaña *Red* el modelo viene del dominio de medios, no de `huggingface.co`.
